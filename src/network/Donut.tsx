import type { ReactNode } from "react";
import type { Slice } from "./metrics";

/**
 * The colour of slice `i` of `n`: the accent, stepping down towards the panel.
 *
 * One hue, not a rainbow — the site keeps colour for state, and a ring of ten unrelated colours
 * would make every slice look like a warning. The hairline between sectors does the separating;
 * the steps only say "larger to smaller". The remainder is drawn in the bar colour, outside the
 * ramp, because it is not one holder.
 */
export function sliceColor(i: number, n: number, rest?: boolean): string {
  if (rest) return "var(--bar)";
  const strength = n <= 1 ? 100 : Math.round(100 - (i / (n - 1)) * 62);
  return `color-mix(in srgb, var(--accent) ${strength}%, var(--panel-2))`;
}

function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const p = (a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x0, y0] = p(from);
  const [x1, y1] = p(to);
  const large = to - from > Math.PI ? 1 : 0;
  return `M${x0.toFixed(2)},${y0.toFixed(2)}A${r},${r} 0 ${large} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
}

/** One sector of the ring, from angle `a0` to `a1` clockwise from twelve o'clock. */
function sector(a0: number, a1: number, outer: number, inner: number): string {
  // A full circle is two halves: an arc from a point back to itself draws nothing.
  if (a1 - a0 >= Math.PI * 2 - 1e-6) {
    return sector(a0, a0 + Math.PI, outer, inner) + sector(a0 + Math.PI, a1 - 1e-6, outer, inner);
  }
  const outerArc = arc(100, 100, outer, a0, a1);
  const p = (r: number, a: number) => `${(100 + r * Math.sin(a)).toFixed(2)},${(100 - r * Math.cos(a)).toFixed(2)}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `${outerArc}L${p(inner, a1)}A${inner},${inner} 0 ${large} 0 ${p(inner, a0)}Z`;
}

/**
 * A ring of shares, with whatever the reader points at read out in its middle.
 *
 * The pointed-at slice is shared state, like the board's hovered block: the legend beside the
 * ring lights the same row, so the two are one reading rather than a picture and a table.
 */
export function Donut({
  data,
  label,
  center,
  active,
  onActive,
  format,
}: {
  data: Slice[];
  /** What the ring shows, for assistive technology — the legend carries the numbers. */
  label: string;
  /** Shown in the middle while nothing is pointed at. */
  center: ReactNode;
  active: string | null;
  onActive: (key: string | null) => void;
  format: (value: number) => string;
}) {
  const total = data.reduce((n, s) => n + s.value, 0);
  const shown = active === null ? null : data.find((s) => s.key === active) ?? null;
  const ramp = data.filter((s) => !s.rest).length;

  let angle = 0;
  const sectors = data.map((s, i) => {
    const sweep = total > 0 ? (s.value / total) * Math.PI * 2 : 0;
    const d = sector(angle, angle + sweep, 94, 64);
    angle += sweep;
    return { s, d, color: sliceColor(i, ramp, s.rest !== undefined) };
  });

  return (
    <div className="donut">
      <svg viewBox="0 0 200 200" role="img" aria-label={label} onPointerLeave={() => onActive(null)}>
        {sectors.map(({ s, d, color }) => (
          <path
            key={s.key}
            d={d}
            style={{ fill: color }}
            className={active === null ? "sector" : active === s.key ? "sector on" : "sector off"}
            onPointerEnter={() => onActive(s.key)}
          >
            <title>{`${s.label}: ${format(s.value)}`}</title>
          </path>
        ))}
      </svg>
      <div className="donut-center" aria-live="polite">
        {shown ? (
          <>
            <b className="num">{total > 0 ? ((shown.value / total) * 100).toFixed(1) : "0"}%</b>
            <span>{shown.label}</span>
          </>
        ) : (
          center
        )}
      </div>
    </div>
  );
}
