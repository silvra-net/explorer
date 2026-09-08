// Which node this explorer reads from.
//
// The default is the public endpoint, but it is only a default: anyone running their own node
// can point this at it and get the same explorer over their own copy of the chain. That is the
// whole reason this app talks to the RPC directly instead of through a backend of ours — an
// explorer that can only ever show you *our* view of the chain is a second authority, and the
// point of running a node is not to need one.
//
// Deliberately NOT settable through a URL parameter. A link like `?rpc=evil.example` would let
// someone hand you a page that looks like this explorer and shows a chain of their invention.
// Nothing here signs anything, so the damage is limited to lies on screen — but a lie on screen
// is the entire product. The endpoint changes only where someone typed it.

const KEY = "helix-explorer-rpc";

export const DEFAULT_RPC = "https://node.silvra.net";

/** Endpoints offered in the picker. Anything else is typed by hand. */
export const SUGGESTED_RPC = [
  { url: DEFAULT_RPC, label: "node.silvra.net (public)" },
  { url: "http://127.0.0.1:8545", label: "Your own node (127.0.0.1:8545)" },
];

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export function getRpcBase(): string {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return normalize(stored);
  } catch {
    /* private mode — fall through to the default */
  }
  return DEFAULT_RPC;
}

export function setRpcBase(url: string): void {
  const clean = normalize(url);
  try {
    if (!clean || clean === DEFAULT_RPC) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, clean);
  } catch {
    /* private mode — the change lasts for this page view only */
  }
}

export function isCustomRpc(): boolean {
  return getRpcBase() !== DEFAULT_RPC;
}
