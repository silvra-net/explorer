/**
 * How many validators can go quiet before this chain stops producing blocks.
 *
 * A block finalizes once the precommits behind it carry at least `quorum` of `total` voting
 * power. So the question "can we survive an outage?" is: remove validators, weakest first, and
 * count how many can go before the remainder drops below the threshold. Weakest first is the
 * optimistic reading and the honest one to publish — it is the *most* the set can survive, and
 * a specific unlucky validator failing may cost more.
 *
 * This lives apart from the component because it is the number an operator uses to decide
 * whether restarting their node is safe, and a number like that should be testable on its own.
 *
 * It deliberately takes power figures rather than stakes. Deriving power from stake needs the
 * 1 % cap and each validator's personhood flag, and getting that subtly wrong yields a
 * plausible number that is simply false — the reason the node publishes power directly since
 * 0.11.1.
 */
export function faultTolerance(powers: number[], total: number, quorum: number): number {
  const ascending = powers.filter((p) => p > 0).sort((a, b) => a - b);
  let remaining = total;
  let spare = 0;
  for (const p of ascending) {
    if (remaining - p < quorum) break;
    remaining -= p;
    spare++;
  }
  return spare;
}

/** Plain-language version of the same number, for a reader who does not think in power units. */
export function faultToleranceLabel(spare: number): string {
  if (spare === 0) return "no validator can go offline without stopping the chain";
  if (spare === 1) return "survives one validator going offline";
  return `survives ${spare} validators going offline`;
}
