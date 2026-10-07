/**
 * The whole state of the chain in one word.
 *
 * A board is glanced at, not read, so the top-left of it has to carry the entire answer before
 * anything else is looked at. Everything else on the board exists to explain this word.
 *
 * Kept pure and apart from the component because it is the one piece of this app that decides
 * whether somebody gets out of bed. A rule that can only be checked by waiting for a chain to
 * misbehave is a rule nobody checks.
 */

export type ChainState = "producing" | "degraded" | "stalled" | "syncing" | "unreachable";

export interface Verdict {
  state: ChainState;
  /** The word itself, for the board. */
  label: string;
  /** One sentence saying why, in the reader's terms rather than the protocol's. */
  why: string;
}

export interface VerdictInput {
  /** The last read of the node failed outright. */
  unreachable: boolean;
  /** The node says it is still catching up. */
  syncing: boolean;
  /** Seconds since the newest block, or null before one is known. */
  sinceTip: number | null;
  /** The interval this chain has been keeping, in seconds. */
  expected: number;
  /** Active validators that missed at least one of the recently measured blocks. */
  absent: number;
  /** Validators currently jailed. */
  jailed: number;
  /** How many validators may go quiet before the chain stops. */
  spare: number | null;
}

/**
 * Order matters, and it is the order of what a reader can act on.
 *
 * "Unreachable" outranks everything because when the page cannot read the node, every other
 * signal on the board is a memory rather than a measurement — reporting "producing" from stale
 * data is the single worst thing this screen could do. Syncing outranks the block-timing checks
 * for the same reason: a node replaying history produces blocks on its own schedule, and timing
 * it against the live chain's rhythm would report a stall that is really a catch-up.
 */
export function verdict(input: VerdictInput): Verdict {
  const { unreachable, syncing, sinceTip, expected, absent, jailed, spare } = input;

  if (unreachable) {
    return {
      state: "unreachable",
      label: "NO CONTACT",
      why: "The last read of this node failed. Everything below is the last thing it said, not what is true now.",
    };
  }

  if (syncing) {
    return {
      state: "syncing",
      label: "SYNCING",
      why: "This node is replaying history and has not caught up. What it reports is behind the chain.",
    };
  }

  // Ten intervals without a block is well past a missed consensus round and into "something is
  // wrong" — three, the threshold the heartbeat turns red at, is a long round rather than a
  // stall, and a board that shouts at every long round teaches people to ignore it.
  if (sinceTip !== null && sinceTip > expected * 10) {
    return {
      state: "stalled",
      label: "STALLED",
      why: `No block for ${Math.round(sinceTip)}s on a chain that keeps ${expected.toFixed(1)}s. Consensus is not completing.`,
    };
  }

  if (jailed > 0) {
    return {
      state: "degraded",
      label: "DEGRADED",
      why: `${jailed} validator${jailed === 1 ? " is" : "s are"} jailed and not taking part in consensus.`,
    };
  }

  /*
    A missing validator matters when the set cannot absorb it, and that depends entirely on how
    big the set is.

    In a set of three with equal power every signature is load-bearing: with a two-thirds
    threshold all three must agree, so `spare` is 0 and a single miss is not a blemish on a
    healthy chain — it is the chain briefly not finalizing. On a set of twenty with room for
    six, one validator missing a round is an operator's problem and not the network's, and a
    board that shouted DEGRADED at it would be teaching people to ignore the most important word
    on the screen.

    So the comparison is against the tolerance rather than against zero, and it fires when the
    remaining margin is gone — `absent >= spare` — not only once it has been exceeded. Sitting
    at exactly the limit means the next one stops the chain, which is worth saying out loud.

    A node too old to report voting power leaves `spare` null. That is treated as no tolerance
    at all, because under-reporting risk is the safe direction to be wrong in.
  */
  const tolerance = spare ?? 0;
  if (absent > 0 && absent >= tolerance) {
    return {
      state: "degraded",
      label: "DEGRADED",
      why:
        tolerance === 0
          ? `${absent} validator${absent === 1 ? "" : "s"} missed recent blocks, and this set has no room for that.`
          : `${absent} validator${absent === 1 ? "" : "s"} missed recent blocks — the set can absorb ${tolerance} and no more.`,
    };
  }

  return {
    state: "producing",
    label: "PRODUCING",
    why: "Blocks are on schedule and the whole set is co-signing.",
  };
}
