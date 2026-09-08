/**
 * Display helpers.
 *
 * Adapted from the wallet's `format.ts`, with one deliberate difference: every timestamp here
 * is **milliseconds**, because that is what the node's JSON carries (`"timestamp":1786547270679`
 * on both blocks and transactions). The wallet's version takes seconds. Copying it unchanged
 * would have put every block roughly 55,000 years in the past and looked like a clock bug.
 */

/** HLX with full precision available but trailing noise trimmed. */
export function hlx(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 9 });
}

/** Rounded HLX for headline figures where nine decimals are noise. */
export function hlxShort(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function num(n: number): string {
  return n.toLocaleString();
}

export function shortAddr(a: string | null | undefined): string {
  if (!a) return "—";
  return a.length > 18 ? `${a.slice(0, 10)}…${a.slice(-6)}` : a;
}

export function shortHash(h: string | null | undefined): string {
  if (!h) return "—";
  return h.length > 14 ? `${h.slice(0, 8)}…${h.slice(-4)}` : h;
}

/** "3 min ago" while that is the useful answer, an absolute date once it stops being. */
export function timeAgo(unixMillis: number): string {
  if (!unixMillis) return "—";
  const secs = Math.floor((Date.now() - unixMillis) / 1000);
  if (secs < 0) return "just now"; // clock skew between node and browser — never show "-2 min"
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d ago`;
  return new Date(unixMillis).toLocaleDateString();
}

export function fullTime(unixMillis: number): string {
  if (!unixMillis) return "—";
  return new Date(unixMillis).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}

/** Seconds between two block timestamps, one decimal — the chain's pulse. */
export function gapSeconds(newerMillis: number, olderMillis: number): string {
  const d = (newerMillis - olderMillis) / 1000;
  if (!isFinite(d) || d < 0) return "—";
  return `${d.toFixed(1)}s`;
}

/**
 * What a transaction type is called on screen.
 *
 * The node sends Rust variant names (`SubmitDoubleSignEvidence`). Splitting on capitals keeps
 * new variants readable without this list having to know about them — a variant added on the
 * node side shows up as words, not as a blank.
 */
export function txTypeLabel(t: string): string {
  return t.replace(/([a-z])([A-Z])/g, "$1 $2");
}
