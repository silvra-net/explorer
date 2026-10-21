import type { BlockSummary } from "../types";

/**
 * How few validators it takes to stop this chain, and how few to run it alone.
 *
 * A block finalizes once its precommits carry `quorum` of `total` voting power. So:
 *
 * - **halt**: the fewest validators whose power, withheld, leaves the rest short of the quorum —
 *   withheld power above `total − quorum`.
 * - **control**: the fewest validators whose power alone reaches the quorum — they finalize
 *   whatever they like without anyone else.
 *
 * Both take the strongest first, so they are the smallest such groups: the honest worst case to
 * publish, the opposite end from `faultTolerance`, which drops the weakest first and reports the
 * most the set can lose. The halt figure is the one usually called the Nakamoto coefficient; for
 * a BFT chain the control figure belongs next to it, because it is the one that rewrites history.
 *
 * Takes power, never stake. Power is what the vote weighs after the 1 % cap, and the cap is the
 * whole reason the two differ: a validator with ten times the stake can carry the same weight.
 * `null` means the set cannot get there at all — an empty set, or a quorum above the total.
 */
export function nakamoto(
  powers: number[],
  total: number,
  quorum: number,
): { halt: number | null; control: number | null } {
  const strongest = powers.filter((p) => p > 0).sort((a, b) => b - a);
  const haltAbove = total - quorum;
  let halt: number | null = null;
  let control: number | null = null;
  let sum = 0;
  strongest.forEach((p, i) => {
    sum += p;
    if (halt === null && sum > haltAbove) halt = i + 1;
    if (control === null && sum >= quorum) control = i + 1;
  });
  return { halt, control };
}

export interface Slice {
  key: string;
  label: string;
  value: number;
  /** Set on the slice that stands for everything past the cut. */
  rest?: number;
}

/**
 * The largest `keep` entries, then one slice for everything else.
 *
 * A ring with fifty equal sectors says nothing; one with the few that matter and a labelled
 * remainder says who holds what. The remainder records how many entries it stands for, so a
 * legend can say "41 others" rather than a bare "rest".
 */
export function slices(items: Slice[], keep: number): Slice[] {
  const sorted = items.filter((s) => s.value > 0).sort((a, b) => b.value - a.value);
  if (sorted.length <= keep + 1) return sorted;
  const head = sorted.slice(0, keep);
  const tail = sorted.slice(keep);
  return [
    ...head,
    { key: "rest", label: `${tail.length} others`, value: tail.reduce((n, s) => n + s.value, 0), rest: tail.length },
  ];
}

/**
 * A nano-HLX amount as HLX, for drawing.
 *
 * The node sends exact amounts as decimal strings because a `u64` of nano does not fit a double.
 * A chart only needs the shape, so the division is done here, once, through `BigInt` so no digit
 * is lost before it is rounded — and an absent field reads as nothing rather than as zero.
 */
export function nanoToHlx(nano: string | undefined | null): number | null {
  if (nano === undefined || nano === null || !/^\d+$/.test(nano)) return null;
  const n = BigInt(nano);
  return Number(n / 1_000_000_000n) + Number(n % 1_000_000_000n) / 1e9;
}

export interface BlockPoint {
  height: number;
  /** Seconds since the block before it; absent on the first block of the series. */
  interval?: number;
  txs: number;
  baseFee: number;
}

/**
 * The per-block readings the activity charts draw, oldest first.
 *
 * The interval is measured from the proposer's own timestamps. Across proposers that carries
 * their clock skew, which is why a single negative interval is clamped to zero rather than drawn
 * below the axis: it is a clock disagreement, not a block that came before its parent.
 */
export function blockSeries(blocks: BlockSummary[]): BlockPoint[] {
  const ascending = [...blocks].sort((a, b) => a.height - b.height);
  return ascending.map((b, i) => {
    const prev = ascending[i - 1];
    const point: BlockPoint = { height: b.height, txs: b.tx_count, baseFee: b.base_fee_per_byte };
    if (prev && prev.height === b.height - 1) {
      point.interval = Math.max(0, (b.timestamp - prev.timestamp) / 1000);
    }
    return point;
  });
}
