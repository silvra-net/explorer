import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { num } from "../format";

export interface SeriesPoint {
  height: number;
  value: number;
}

const H = 170;
const PAD = { top: 14, right: 12, bottom: 24, left: 46 };

/** Round the top of the scale up to 1, 2 or 5 times a power of ten, so the ticks read cleanly. */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const m = v / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
}

/**
 * One reading per block, drawn across the last few hundred blocks.
 *
 * Bars for counts and intervals — each block is its own event, and a missed round is one tall bar
 * — and a stepped line for a price that holds until the next block changes it. The scale starts
 * at zero, always: a chart that starts higher makes a 3 % change look like a cliff.
 *
 * The reading under the pointer (or the arrow keys) is written out above the chart rather than in
 * a floating box, so it stays where the eye already is and works on a phone.
 */
export function SeriesChart({
  points,
  mode,
  label,
  unit,
  format = (v) => num(v),
  floor = 0,
}: {
  points: SeriesPoint[];
  mode: "bars" | "step";
  label: string;
  unit: string;
  format?: (v: number) => string;
  /** The scale never tops out below this, so a quiet stretch does not fill the chart. */
  floor?: number;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  // Measured again once there is something to draw: while the series is still loading the
  // component renders only its empty line, the box does not exist, and a measurement taken then
  // would leave the chart drawn at the starting width for good — stretched on a wide screen,
  // shrunk to unreadable on a phone.
  const drawable = points.length > 0;
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => {
      if (el.clientWidth) setW(el.clientWidth);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, [drawable]);

  if (points.length === 0) {
    return <p className="empty">Not enough blocks to draw.</p>;
  }

  const top = niceCeil(Math.max(floor, ...points.map((p) => p.value)));
  const iw = Math.max(1, w - PAD.left - PAD.right);
  const ih = H - PAD.top - PAD.bottom;
  const step = iw / points.length;
  const x = (i: number) => PAD.left + i * step;
  const y = (v: number) => PAD.top + ih - (Math.min(v, top) / top) * ih;
  const ticks = [0, top / 2, top];
  const shown = active === null ? null : points[active];

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * w;
    setActive(Math.min(points.length - 1, Math.max(0, Math.floor((px - PAD.left) / step))));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const last = points.length - 1;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const d = e.key === "ArrowRight" ? 1 : -1;
      setActive((a) => Math.min(last, Math.max(0, (a ?? last) + d)));
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      setActive(e.key === "Home" ? 0 : last);
    } else if (e.key === "Escape") {
      setActive(null);
    }
  };

  let line = "";
  if (mode === "step") {
    points.forEach((p, i) => {
      line += `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}L${(x(i) + step).toFixed(1)},${y(p.value).toFixed(1)}`;
    });
  }

  return (
    <figure className="series">
      <figcaption className="series-head">
        <span className="series-label">{label}</span>
        <span className="series-read num" aria-live="polite">
          {shown
            ? `#${num(shown.height)} · ${format(shown.value)} ${unit}`
            : `last ${num(points.length)} blocks · up to ${format(top)} ${unit}`}
        </span>
      </figcaption>
      <div className="series-box" ref={box}>
        <svg
          viewBox={`0 0 ${w} ${H}`}
          width={w}
          height={H}
          role="img"
          aria-label={`${label}, last ${points.length} blocks`}
          tabIndex={0}
          onPointerDown={onMove}
          onPointerMove={onMove}
          onPointerLeave={(e) => e.pointerType !== "touch" && setActive(null)}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className="series-grid" x1={PAD.left} x2={PAD.left + iw} y1={y(t)} y2={y(t)} />
              <text className="series-tick" x={PAD.left - 8} y={y(t) + 4} textAnchor="end">
                {format(t)}
              </text>
            </g>
          ))}
          <text className="series-tick" x={PAD.left} y={H - 6}>
            #{num(points[0].height)}
          </text>
          <text className="series-tick" x={PAD.left + iw} y={H - 6} textAnchor="end">
            #{num(points[points.length - 1].height)}
          </text>
          {mode === "bars"
            ? points.map((p, i) => (
                <rect
                  key={p.height}
                  className={active === i ? "series-bar on" : "series-bar"}
                  x={x(i) + (step > 3 ? 0.5 : 0)}
                  y={y(p.value)}
                  width={Math.max(0.6, step - (step > 3 ? 1 : 0))}
                  height={Math.max(0, PAD.top + ih - y(p.value))}
                />
              ))
            : <path className="series-line" d={line} />}
          {shown && active !== null && (
            <line className="series-cross" x1={x(active) + step / 2} x2={x(active) + step / 2} y1={PAD.top} y2={PAD.top + ih} />
          )}
        </svg>
      </div>
    </figure>
  );
}
