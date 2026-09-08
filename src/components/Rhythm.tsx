import { useEffect, useRef } from "react";
import { barHeight, barScale, gaps, gapSeverity } from "../rhythm";
import { num } from "../format";
import type { BlockSummary } from "../types";

/**
 * The seconds between blocks, drawn.
 *
 * Bars rather than a line, because each block is a discrete event and the question is "was this
 * one late", not "what is the trend". This chain produces a block every ~2 seconds, so a missed
 * consensus round is a single tall bar — a stall you would otherwise find by comparing
 * timestamps down the Gap column is visible from across the room.
 *
 * The hovered block is not this component's own state. It belongs to the board, so pointing at a
 * bar highlights the matching row in the block list and pointing at a row lights up its bar. Two
 * views of one block that do not know about each other are two widgets; sharing the hover is
 * what makes them one instrument.
 */
export function Rhythm({
  blocks,
  hoverHeight,
  onHoverHeight,
}: {
  blocks: BlockSummary[];
  hoverHeight: number | null;
  onHoverHeight: (height: number | null) => void;
}) {
  const series = gaps(blocks);
  const seconds = series.map((g) => g.seconds);
  const scale = barScale(seconds);

  // A bar is new if its block is above every height this component has drawn before. Bars are
  // keyed by height, so a new one mounts and its grow-in animation runs exactly once — a class
  // that stayed applied would not re-fire it anyway.
  const highest = useRef<number | null>(null);
  const knownHighest = highest.current;
  useEffect(() => {
    const top = series.length > 0 ? series[series.length - 1].height : null;
    if (top !== null && (highest.current === null || top > highest.current)) {
      highest.current = top;
    }
  });

  if (series.length === 0) {
    return <div className="rhythm-empty dim">Not enough blocks yet to measure an interval.</div>;
  }

  const shown = hoverHeight === null ? null : series.find((g) => g.height === hoverHeight);

  return (
    <div className="rhythm-box">
      <div className="rhythm-head">
        <span className="rhythm-note">
          {shown ? (
            <>
              block <span className="num">#{num(shown.height)}</span> ·{" "}
              <span className="num">{shown.seconds.toFixed(1)}s</span> after the one before
            </>
          ) : (
            <>
              {series.length} intervals · peak <span className="num">{scale.toFixed(0)}s</span>
            </>
          )}
        </span>
      </div>
      <div className="rhythm" onMouseLeave={() => onHoverHeight(null)}>
        {series.map((g) => {
          const severity = gapSeverity(g.seconds);
          const fresh = knownHighest !== null && g.height > knownHighest;
          const classes = ["b"];
          if (severity) classes.push(severity);
          if (fresh) classes.push("fresh");
          if (g.height === hoverHeight) classes.push("linked");
          return (
            <span
              key={g.height}
              className={classes.join(" ")}
              style={{ height: `${barHeight(g.seconds, scale)}%` }}
              onMouseEnter={() => onHoverHeight(g.height)}
              // The bars carry their reading in the line above, but that is a pointer
              // affordance and this is a chart of one number per block. The title keeps it
              // available to anyone arriving with a keyboard or a screen reader.
              title={`Block ${num(g.height)} — ${g.seconds.toFixed(1)}s after the one before`}
            />
          );
        })}
      </div>
    </div>
  );
}
