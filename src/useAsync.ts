import { useCallback, useEffect, useRef, useState } from "react";
import { RpcError } from "./rpc";

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  /** True only on the first load — a refresh keeps the last good data on screen. */
  loading: boolean;
  /** True when the request failed with 404: the node answered, the thing is not there. */
  notFound: boolean;
  reload: () => void;
}

/**
 * Run an RPC call, and optionally repeat it.
 *
 * Two decisions worth keeping:
 *
 * 1. A **refresh never blanks the screen.** `loading` is true only until the first result
 *    arrives; after that a failed poll leaves the last good data visible with an error beside
 *    it. A page that empties itself every time a poll times out is unreadable on a flaky link.
 *
 * 2. **"Not found" is carried separately from "failed".** The node answering 404 for a block
 *    height is a fact about the chain; a 502 from the tunnel is a fact about the network. Only
 *    the first should render as "no such block".
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[],
  intervalMs?: number,
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  // Keeps a stale in-flight response from overwriting a newer one when deps change fast
  // (typing a height into the URL, switching endpoints).
  const runId = useRef(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const id = ++runId.current;
    let cancelled = false;

    setLoading((prev) => (data === null ? true : prev));

    const run = async () => {
      try {
        const result = await fn();
        if (cancelled || id !== runId.current) return;
        setData(result);
        setError(null);
        setNotFound(false);
      } catch (e) {
        if (cancelled || id !== runId.current) return;
        if (e instanceof RpcError && e.notFound) {
          setNotFound(true);
          setError(null);
          setData(null);
        } else {
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled && id === runId.current) setLoading(false);
      }
    };

    void run();

    if (!intervalMs) return () => void (cancelled = true);
    const timer = setInterval(() => void run(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, intervalMs]);

  return { data, error, loading, notFound, reload };
}
