import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { rpc } from "./rpc";
import { useAsync } from "./useAsync";
import type { BlockSummary, NodeStatus } from "./types";

/**
 * What the whole app knows about the chain right now, polled once.
 *
 * Three views used to run their own `/status`, at three different intervals, which meant three
 * requests where one would do and three answers that could disagree about the height. More
 * importantly it left the chrome unable to say anything: the header lives outside every view, so
 * a "this page is still being fed" indicator had nowhere to get its facts.
 *
 * Two polls, at two rates, because two different questions are being asked:
 *
 * - **`/blocks/latest` every two seconds.** The tip, and with it the one timestamp the heartbeat
 *   needs. It has to be at least as fresh as the interval it is measuring against: on a chain
 *   keeping ~1.9s, a tip fetched five seconds ago is routinely older than the three-interval
 *   threshold for "overdue", and the heartbeat sits red while nothing at all is wrong. At 1.7 kB
 *   this is the cheapest request the app makes.
 * - **`/status` every five seconds.** Supply, accounts, mempool, sync state — none of which
 *   changes in a way anybody watches second by second, and none of which carries a timestamp.
 */
export interface ChainStatus {
  status: NodeStatus | null;
  /** The newest block, refreshed fast enough to measure the chain's rhythm against. */
  tip: BlockSummary | null;
  /** Freshest height known, from whichever poll last answered. */
  height: number | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  /** Browser time when the tip last advanced, or null before the second poll. */
  advancedAt: number | null;
  /** How many blocks this page has watched land since it was opened. */
  advances: number;
}

const TIP_MS = 2000;
const STATUS_MS = 5000;

const Ctx = createContext<ChainStatus | null>(null);

export function ChainStatusProvider({ children }: { children: ReactNode }) {
  const status = useAsync(() => rpc.status(), [], STATUS_MS);
  const tip = useAsync(() => rpc.latestBlock(), [], TIP_MS);

  const [advancedAt, setAdvancedAt] = useState<number | null>(null);
  const [advances, setAdvances] = useState(0);
  const lastHeight = useRef<number | null>(null);

  const tipHeight = tip.data?.height;

  useEffect(() => {
    if (tipHeight === undefined) return;

    const prev = lastHeight.current;
    lastHeight.current = tipHeight;

    // The first poll establishes a baseline rather than counting as an advance — otherwise every
    // page load would announce a block landing that it did not witness.
    if (prev === null) return;

    // Strictly greater: pointing the explorer at a node that is behind moves the height *down*,
    // and so does switching to a private chain that was started over. Neither is the chain
    // advancing.
    if (tipHeight > prev) {
      setAdvancedAt(Date.now());
      setAdvances((n) => n + 1);
    }
  }, [tipHeight]);

  const value: ChainStatus = {
    status: status.data,
    tip: tip.data,
    height: tip.data?.height ?? status.data?.height ?? null,
    // Either poll failing means the page is no longer being fed the whole truth, and the tip is
    // the one that fails first when a tunnel goes down.
    error: tip.error ?? status.error,
    loading: status.loading && tip.loading,
    reload: () => {
      status.reload();
      tip.reload();
    },
    advancedAt,
    advances,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChainStatus(): ChainStatus {
  const v = useContext(Ctx);
  if (!v) throw new Error("useChainStatus must be used inside <ChainStatusProvider>");
  return v;
}
