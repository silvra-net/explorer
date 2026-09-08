/**
 * The seconds between consecutive blocks — the chain's pulse, as a number rather than a picture.
 *
 * This lives apart from the component for the same reason `quorum.ts` does: the thresholds below
 * decide whether the overview draws a calm chain or an alarming one, and a threshold that can
 * only be checked by staring at a running page is a threshold nobody checks.
 *
 * The rules are deliberately identical to the node's own status board (`status.html`, `rhythm()`
 * and the heartbeat interval). Two surfaces of one product that disagree about what counts as a
 * late block would be worse than either of them being wrong on its own — an operator comparing
 * the two would have to learn which one to believe.
 */

/** A single interval, tagged with the block that ended it. */
export interface Gap {
  /** The block that landed at the end of this interval. */
  height: number;
  seconds: number;
}

/**
 * Intervals between the given blocks, oldest first.
 *
 * Takes blocks newest-first — this app's convention everywhere — and returns oldest-first,
 * because that is the direction a chart is read. Doing the flip here rather than in the
 * component keeps the one confusing step in a place that has tests.
 */
export function gaps(newestFirst: { height: number; timestamp: number }[]): Gap[] {
  const out: Gap[] = [];
  for (let i = newestFirst.length - 1; i > 0; i--) {
    const older = newestFirst[i];
    const newer = newestFirst[i - 1];
    out.push({
      height: newer.height,
      // Clamped at zero: block timestamps come from whichever validator proposed them, and two
      // validators' clocks need not agree. A negative interval is a clock disagreement, not a
      // block that arrived before the one it builds on, and drawing it as a bar below the axis
      // would be reporting a chain fault that did not happen.
      seconds: Math.max(0, (newer.timestamp - older.timestamp) / 1000),
    });
  }
  return out;
}

/**
 * The interval this chain has actually been keeping.
 *
 * The **median**, not the mean, and that choice matters: one 30-second stall in a window of
 * twenty would drag a mean far enough that every healthy block afterwards renders as early
 * forever. The median shrugs off the stall and keeps describing the normal case, which is what
 * the heartbeat needs in order for a real stall to look wrong.
 *
 * Never returns less than one second, so a chain whose blocks arrive faster than the browser can
 * usefully animate does not produce a heartbeat that is always full.
 */
export function expectedGap(seconds: number[]): number {
  if (seconds.length === 0) return 1;
  const sorted = [...seconds].sort((a, b) => a - b);
  return Math.max(1, sorted[Math.floor(sorted.length / 2)]);
}

/**
 * The value the tallest bar represents.
 *
 * Floored at 8 seconds so a healthy 2-second chain does not render its ordinary 1.7s/2.4s
 * variation as dramatic peaks. A chart that makes noise look like an event trains people to
 * ignore it, and then the one real stall is ignored too.
 */
export function barScale(seconds: number[]): number {
  return Math.max(8, ...seconds);
}

/**
 * How bad an interval is.
 *
 * The thresholds are absolute rather than relative to this chain's own rhythm, matching the node
 * board. A block 10 seconds after the last one means a consensus round was missed on any Helix
 * configuration; past 25 seconds several were.
 */
export function gapSeverity(seconds: number): "" | "warn" | "bad" {
  if (seconds > 25) return "bad";
  if (seconds > 10) return "warn";
  return "";
}

/** Bar height as a percentage of the panel, never so small it disappears entirely. */
export function barHeight(seconds: number, scale: number): number {
  return Math.max(2, Math.round((seconds / scale) * 100));
}

/**
 * Is the chain overdue for a block?
 *
 * Three times the interval it has been keeping, not a number picked in advance — a chain
 * configured for slower blocks should not permanently look sick. Matches the node board's
 * `elapsed > expectedGap * 3`.
 */
export function isOverdue(elapsedSeconds: number, expected: number): boolean {
  return elapsedSeconds > expected * 3;
}
