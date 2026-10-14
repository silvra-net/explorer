/**
 * How far behind the chain the node this page reads is.
 *
 * Everything on the board is measured against that node's own tip. A node that is a few blocks
 * behind therefore looks like a chain that is slow: "last block" is old, the heartbeat goes
 * amber, and nothing says the chain is fine and only this copy of it is late. The node knows the
 * difference — `/diagnostics` reports the highest tip its peers announce next to its own height —
 * and this is where the board learns it.
 *
 * Both numbers come from the same response, so they describe one moment. Pairing the peer tip
 * with the height from another poll would read the time between two requests as lag.
 *
 * `peer_tip_height` is what peers *claim*, unauthenticated. A peer that lies can make a node look
 * behind; it cannot make it look current. That is the safe direction for a board to be wrong in,
 * and the wording everywhere says "its peers report", not "the chain is at".
 */

/**
 * Blocks behind before the board says so.
 *
 * A node at the tip reads each block a moment after its peers, so one or two blocks behind is
 * ordinary and saying anything about it would be noise on every refresh. Five is past that and
 * still short of the ten intervals at which the board calls a chain stalled — the point being to
 * explain an old "last block" before it is misread as a stall.
 */
export const LAG_NOTICE_BLOCKS = 5;

/** Blocks between this node's height and the highest tip its peers report, or null if unknown. */
export function blocksBehind(
  height: number | null | undefined,
  peerTip: number | null | undefined,
): number | null {
  if (height == null || peerTip == null) return null;
  return Math.max(0, peerTip - height);
}

/** Whether the lag is worth a line on the board. Unknown is not behind. */
export function isBehind(behind: number | null): behind is number {
  return behind !== null && behind >= LAG_NOTICE_BLOCKS;
}

/**
 * Where a validator's jail stands.
 *
 * A jail ends at a height, but the validator is not back when that height passes — it returns
 * only with an unjail transaction of its own, and until then the node keeps reporting the old
 * `jailed_until`. Calling that "jailed" sends a reader looking for a punishment still running;
 * the thing actually missing is one transaction from the operator.
 */
export type JailState = "free" | "jailed" | "unjail-pending";

export function jailState(jailedUntil: number | null, height: number | null): JailState {
  if (jailedUntil === null) return "free";
  if (height !== null && jailedUntil <= height) return "unjail-pending";
  return "jailed";
}
