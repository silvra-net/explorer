/**
 * Run `task` for every item, at most `limit` at a time, starting them in the order given.
 *
 * The board fetches one header per block row. One after another, forty of them took three to four
 * seconds through the public node's tunnel — each a full round trip that did nothing but wait.
 * All at once would spend a visitor's rate-limit burst on a single page load. A small pool is
 * both: the round trips overlap, and the burst is not touched (six in flight against a burst of
 * 500 and 100 a second per address, the node's default since 2026-09).
 *
 * `stop` is asked before each new start, so an unmounted view stops fetching without waiting for
 * the rest of the list.
 */
export async function forEachLimited<T>(
  items: readonly T[],
  limit: number,
  task: (item: T) => Promise<void>,
  stop: () => boolean = () => false,
): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length && !stop()) {
      const item = items[next++];
      await task(item);
    }
  };
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker);
  await Promise.all(workers);
}
