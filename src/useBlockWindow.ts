import { useEffect, useRef, useState } from "react";
import { rpc } from "./rpc";
import type { BlockSummary } from "./types";

/**
 * The newest `size` blocks, kept up to date by fetching only what is missing.
 *
 * The rhythm chart wants a window wide enough to show a stall in context — around forty
 * intervals — while the table below it wants a length somebody will actually read. Re-fetching
 * forty blocks every time the tip moves would be the obvious way to serve both, and it costs
 * 49 kB a time against 1.2 kB for the one block that is genuinely new. On a chain producing a
 * block every two seconds that is 24 kB/s per visitor, forever, for data the page already has.
 *
 * So the window is accumulated instead: the full range once, then a request for the gap between
 * what is known and the new tip. Blocks below the tip are immutable, which is what makes this
 * safe — a cached block cannot go stale, it can only stop being interesting.
 *
 * Steady-state cost is one block per new block, which is the floor.
 */
export function useBlockWindow(tipHeight: number | null, size: number) {
  const [blocks, setBlocks] = useState<BlockSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // The highest tip a fetch has already been started for. A ref rather than state because it
  // must not trigger a render, and because StrictMode runs effects twice — without it the second
  // pass re-requests the whole window on every mount.
  const fetchedUpTo = useRef<number | null>(null);

  useEffect(() => {
    if (tipHeight === null) return;

    let cancelled = false;

    async function run() {
      const known = fetchedUpTo.current;

      // The tip moved backwards: a node that is behind, or a private chain that was started
      // over. Either way the blocks in hand describe a history this node does not have. Keeping
      // them and appending would splice two chains into one list, so the window starts over.
      const reset = known !== null && tipHeight! < known;
      if (reset) setBlocks([]);

      const haveNothing = known === null || reset;
      if (!haveNothing && tipHeight! <= known!) return;

      // Never ask for more than the window holds, however long this tab was in the background.
      const wanted = haveNothing ? size : Math.min(size, tipHeight! - known!);
      const from = Math.max(0, tipHeight! - wanted + 1);
      const count = Math.min(wanted, tipHeight! + 1);

      fetchedUpTo.current = tipHeight!;

      try {
        const fetched = await rpc.blockRange(from, count);
        if (cancelled) return;
        setBlocks((current) => {
          // Keyed by height so an overlapping range cannot produce the same block twice.
          const merged = new Map<number, BlockSummary>();
          for (const b of current) merged.set(b.height, b);
          for (const b of fetched) merged.set(b.height, b);
          return [...merged.values()].sort((a, b) => b.height - a.height).slice(0, size);
        });
        setError(null);
      } catch (e) {
        if (cancelled) return;
        // Let a later tip retry this stretch rather than leaving a permanent hole in the window.
        fetchedUpTo.current = known;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [tipHeight, size, tick]);

  return {
    blocks,
    loading,
    error,
    reload: () => {
      fetchedUpTo.current = null;
      setTick((t) => t + 1);
    },
  };
}
