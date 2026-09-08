/**
 * What did someone paste into the search field?
 *
 * Pure, and separate from the component, so the classification can be tested without a DOM —
 * it is the one piece of this app where a wrong answer sends the reader to a page about
 * something else entirely.
 *
 * `hash` is deliberately ambiguous: 64 hex characters is either a transaction or a block, and
 * nothing in the string distinguishes them. The caller resolves that by asking the node, in
 * that order. Everything else is decided here.
 */
export type Query =
  | { kind: "height"; height: number }
  | { kind: "address"; address: string }
  | { kind: "hash"; hash: string }
  | { kind: "name"; name: string }
  | { kind: "empty" };

/**
 * Helix addresses are `hlx` + Base58.
 *
 * Base58 excludes `0`, `O`, `I` and `l` precisely so they cannot be confused when read aloud
 * or retyped, and the pattern here excludes them too — otherwise `hlx0000…` would be routed to
 * an account page that can only ever answer "never seen", instead of being reported as the
 * malformed address it is.
 */
const ADDRESS = /^hlx[1-9A-HJ-NP-Za-km-z]{20,}$/;
const HEX64 = /^[0-9a-fA-F]{64}$/;
const DIGITS = /^\d+$/;

export function classifyQuery(raw: string): Query {
  const term = raw.trim();
  if (!term) return { kind: "empty" };

  if (DIGITS.test(term)) {
    const height = Number(term);
    // Beyond this a JS number stops being able to name an exact height, so treat it as a name
    // rather than silently navigating to a rounded one.
    if (Number.isSafeInteger(height)) return { kind: "height", height };
    return { kind: "name", name: term };
  }

  if (ADDRESS.test(term)) return { kind: "address", address: term };

  // Hashes are case-insensitive on the way in and lowercase on the way out: operators copy
  // them from logs and explorers that disagree on casing, and the node's own routes normalise
  // the same way.
  if (HEX64.test(term)) return { kind: "hash", hash: term.toLowerCase() };

  return { kind: "name", name: term };
}
