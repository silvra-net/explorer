import type { BlockHeader, BlockSummary } from "./types";

/**
 * Who has been co-signing, and who has been quiet.
 *
 * The README calls this the reading the co-signature strip exists for — "a column read downwards
 * is one validator's attendance over time" — and until now it was only a reading you could do by
 * eye, one block row at a time. Turning it the other way round, into one row per validator across
 * the recent window, is the same evidence stated as the question people actually ask: *is my
 * node taking part?*
 *
 * It is measured rather than reported. The node publishes `missed_blocks`, but that is the
 * node's own bookkeeping; this is read out of the commit certificates in the blocks themselves,
 * so it cannot drift from what consensus actually saw.
 */
export interface Attendance {
  address: string;
  /** Blocks in the window this validator's precommit appears in. */
  signed: number;
  /** Blocks in the window whose certificate could be read at all. */
  measured: number;
  /** One entry per measured block, oldest first — true where this validator signed. */
  history: boolean[];
}

/**
 * Attendance for each validator over the given heights.
 *
 * Heights whose header has not arrived are skipped rather than counted as a miss. That
 * distinction is the whole reliability of this panel: a header request that failed is a fact
 * about the browser's connection, and rendering it as a validator having gone quiet would
 * accuse somebody of an outage that happened on the reader's own network.
 */
export function attendance(
  validators: string[],
  heights: number[],
  headers: Map<number, BlockHeader>,
): Attendance[] {
  // Oldest first, so a history array reads left to right the way the rhythm chart does.
  const measured = [...heights].sort((a, b) => a - b).filter((h) => headers.has(h));

  return validators.map((address) => {
    const history = measured.map((h) => headers.get(h)!.last_commit.includes(address));
    return {
      address,
      signed: history.filter(Boolean).length,
      measured: measured.length,
      history,
    };
  });
}

/**
 * How many validators missed at least one block in the window.
 *
 * Used for the board's verdict, where the question is not "how many did each miss" but "was the
 * set whole". A validator that missed one block out of forty still made the chain wait.
 */
export function absentCount(rows: Attendance[]): number {
  return rows.filter((r) => r.measured > 0 && r.signed < r.measured).length;
}

/**
 * What software each validator is running, read out of the blocks they produced.
 *
 * `/validators` does not carry a version — but every block does, in `node_version`, and a block's
 * proposer is a validator. So the question "who is still on the old binary" is answerable from
 * evidence already on screen, without the node having to report anything about its peers.
 *
 * Measured rather than reported, like the attendance beside it: this is the version that actually
 * produced a block, not a version a node claims to be running. The two can differ for exactly the
 * case that matters — an operator who upgraded the package but never restarted the process.
 *
 * A validator that has not proposed inside the window simply has no answer here. That is a real
 * state and it is left as one, because guessing from an older observation would quietly report a
 * stale version as current.
 */
export function proposerVersions(blocks: BlockSummary[]): Map<string, string> {
  const out = new Map<string, string>();
  // Newest first, and only the first sighting per proposer is kept — that is their latest.
  for (const b of [...blocks].sort((a, z) => z.height - a.height)) {
    if (!out.has(b.validator)) out.set(b.validator, b.node_version);
  }
  return out;
}

/**
 * Versions running in the window, most common first.
 *
 * The interesting shape is not the list but its length: more than one entry means the set is
 * mid-upgrade, and that is worth seeing on a board without opening anything.
 */
export function versionSpread(versions: Map<string, string>): { version: string; count: number }[] {
  const tally = new Map<string, number>();
  for (const v of versions.values()) tally.set(v, (tally.get(v) ?? 0) + 1);
  return [...tally.entries()]
    .map(([version, count]) => ({ version, count }))
    .sort((a, b) => b.count - a.count || a.version.localeCompare(b.version));
}
