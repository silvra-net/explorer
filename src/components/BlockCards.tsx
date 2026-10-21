import { Link } from "react-router-dom";
import { num } from "../format";
import { Since } from "./Heartbeat";
import type { BlockSummary } from "../types";

/**
 * As many cards as the widest rhythm cell holds. How many of them show is up to the stylesheet:
 * container queries hide the ones a narrower cell has no room for, so a card is never cut off at
 * the edge.
 */
const SLOTS = 8;

/**
 * The chain as it grows: the newest blocks as a row of cards, the newest in amber.
 *
 * The same row silvra.net opens its Helix page with, so the site and the explorer show one chain
 * the same way. Heights and counts come from the window the board already holds — nothing is
 * fetched for it — and slots the window cannot fill stay visibly empty rather than being made up.
 *
 * A card shares the board's hovered block like the rhythm bars and the block list do: pointing at
 * one lights up the same block in the other two.
 */
export function BlockCards({
  blocks,
  hoverHeight,
  onHoverHeight,
}: {
  /** Newest first, as the board holds them. */
  blocks: BlockSummary[];
  hoverHeight: number | null;
  onHoverHeight: (height: number | null) => void;
}) {
  const shown = blocks.slice(0, SLOTS);

  return (
    <div className="cards-wrap">
      <ol className="cards" aria-label="Newest blocks" onMouseLeave={() => onHoverHeight(null)}>
        {shown.map((b, i) => {
          const cls = ["card"];
          if (i === 0) cls.push("newest");
          if (b.height === hoverHeight) cls.push("linked");
          return (
            <li key={b.height} className={cls.join(" ")}>
              <Link
                to={`/block/${b.height}`}
                className="card-link"
                title={b.hash}
                onMouseEnter={() => onHoverHeight(b.height)}
              >
                <span className="card-lid" aria-hidden="true" />
                <span className="card-height num">#{num(b.height)}</span>
                <span className="card-meta num">
                  {b.tx_count} tx · <Since at={b.timestamp} />
                </span>
              </Link>
            </li>
          );
        })}
        {Array.from({ length: Math.max(0, SLOTS - shown.length) }, (_, i) => (
          <li key={`empty-${i}`} className="card empty" aria-hidden="true">
            <span className="card-lid" />
            <span className="card-height num">…</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
