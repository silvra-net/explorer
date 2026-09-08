import { useChainStatus } from "../useChainStatus";

/**
 * Whether this page is still being fed.
 *
 * Deliberately a narrower question than the heartbeat on the overview. The heartbeat asks
 * whether the *chain* is producing blocks; this asks whether the *browser* is still hearing
 * about them. They fail independently — a tunnel outage freezes this page while the chain runs
 * on perfectly — and a single indicator that tried to mean both would be unreadable in exactly
 * the case where it matters.
 *
 * It rings once per block. That is the whole reason it earns space in the chrome: a number that
 * changes silently every two seconds gives a reader no way to tell live data from a screenshot.
 */
export function LiveDot() {
  const { status, error, loading, advances } = useChainStatus();

  const state = error
    ? "offline"
    : loading && !status
      ? "waiting"
      : status?.is_syncing
        ? "syncing"
        : "live";

  const label = {
    offline: "Offline",
    waiting: "Connecting",
    syncing: "Syncing",
    live: "Live",
  }[state];

  const title = {
    offline: `The last read failed — ${error}`,
    waiting: "Reading this node for the first time",
    syncing: "This node is still catching up, so the chain tip below is behind",
    live: "Reading this node; the ring marks each block as it arrives",
  }[state];

  return (
    <span className={`live live-${state}`} title={title}>
      {/* Remounted on every block so the ring animation fires again — a class left in place
          would not re-run it. Only once the chain has actually advanced, so a page load does
          not open with a block landing it never saw. */}
      <span className="live-dot" aria-hidden="true">
        {state === "live" && advances > 0 && <i key={advances} className="ring" />}
      </span>
      <span className="live-label" aria-live="polite">
        {label}
      </span>
    </span>
  );
}
