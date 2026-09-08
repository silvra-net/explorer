import { num } from "../format";

/**
 * The numbers an operator watches, on one line, always visible.
 *
 * The board already computed every one of these — they were just spread across four panels, so
 * answering "is the chain healthy right now" meant reading in four places. A control room puts
 * the vital signs on one rail and the detail underneath.
 *
 * `tone` is state, not decoration: it is the only colour here, and it appears only when a value
 * has crossed into something worth acting on.
 */
export interface Vital {
  label: string;
  value: string;
  unit?: string;
  tone?: "ok" | "warn" | "bad";
  title?: string;
}

export function StatusRail({ vitals }: { vitals: Vital[] }) {
  return (
    <div className="rail" role="group" aria-label="Chain vitals">
      {vitals.map((v) => (
        <div className={v.tone ? `rail-item is-${v.tone}` : "rail-item"} key={v.label} title={v.title}>
          <span className="rail-label">{v.label}</span>
          <span className="rail-value">
            {v.value}
            {v.unit && <span className="rail-unit">{v.unit}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Seconds, at the precision the number deserves: sub-minute exact, then coarse. */
export function secs(s: number | null): string {
  if (s === null) return "—";
  if (s < 10) return s.toFixed(1);
  if (s < 600) return Math.round(s).toString();
  return `${Math.round(s / 60)}m`;
}

export function count(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : num(n);
}
