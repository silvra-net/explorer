import { useEffect, useRef, useState } from "react";
import { rpc } from "./rpc";
import { forEachLimited } from "./pool";
import type { BlockHeader } from "./types";

/** Header requests in flight at once — see `useHeaders`. */
const HEADERS_AT_ONCE = 6;

/**
 * Fetch the commit certificate for a list of block heights.
 *
 * The block listing endpoint does not carry `last_commit`, so the co-signature strip needs one
 * extra request per row. Three things keep that honest:
 *
 * - **At most six requests at a time** (`forEachLimited`). One after another, forty headers took
 *   three to four seconds through the public node's tunnel, every one a round trip spent waiting;
 *   all at once would spend a visitor's rate-limit burst on one page load and start returning
 *   429s that look like chain errors. (This said "a burst of 30 with 10/s" until 2026-10-14; the
 *   node's default has been 500 and 100/s per address since 2026-09.) Newest first, as before.
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
      await forEachLimited(
        heights,
        HEADERS_AT_ONCE,
        async (h) => {
          // Marked when its request starts, as before: a pass cancelled half-way (StrictMode, a
          // new tip) leaves the rest unmarked for the next one, and one in flight is not asked
          // for twice.
          if (requested.current.has(h)) return;
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
        },
        () => cancelled,
      );
    }

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return headers;
}
