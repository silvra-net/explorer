import { useEffect, useRef, useState } from "react";
import { rpc } from "./rpc";
import type { BlockHeader } from "./types";

/**
 * Fetch the commit certificate for a list of block heights.
 *
 * The block listing endpoint does not carry `last_commit`, so the co-signature strip needs one
 * extra request per row. Three things keep that honest:
 *
 * - **Requests are sequential, not parallel.** The node rate-limits to a burst of 30 with 10/s
 *   refill; firing 25 headers at once from every visitor would spend the whole burst on one
 *   page load and start returning 429s that look like chain errors.
 * - **Results are cached in the RPC layer** (`cache: true`), and a finalized block's header
 *   never changes — so paging back and forth costs nothing after the first visit, and a poll
 *   that adds one block fetches exactly one header.
 * - **A failed header is not a failed page.** Missing certificates render as "unknown" in the
 *   strip; the block list itself is already on screen and stays there.
 */
export function useHeaders(heights: number[]): Map<number, BlockHeader> {
  const [headers, setHeaders] = useState<Map<number, BlockHeader>>(new Map());

  // What has been requested already, across renders. A ref rather than state because it must
  // not trigger a render of its own, and because reading it inside the fetch loop has to see
  // the newest value — StrictMode runs effects twice, and without this the second pass would
  // re-request every header.
  const requested = useRef(new Set<number>());

  const key = heights.join(",");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      for (const h of heights) {
        if (cancelled) return;
        if (requested.current.has(h)) continue;
        requested.current.add(h);

        try {
          const header = await rpc.blockHeader(h);
          if (cancelled) return;
          setHeaders((cur) => {
            const next = new Map(cur);
            next.set(h, header);
            return next;
          });
        } catch {
          // Leave it out of the map — the strip renders "unknown" for this row. Allow a
          // later pass to retry it rather than marking it permanently missing.
          requested.current.delete(h);
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return headers;
}
