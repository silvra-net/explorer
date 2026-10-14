import { describe, expect, it } from "vitest";
import { forEachLimited } from "./pool";

/** A task that takes a tick and records how many ran at once. */
function probe() {
  let running = 0;
  let peak = 0;
  const started: number[] = [];
  const task = async (n: number) => {
    started.push(n);
    running += 1;
    peak = Math.max(peak, running);
    await new Promise((r) => setTimeout(r, 5));
    running -= 1;
  };
  return { task, started, peak: () => peak };
}

describe("forEachLimited", () => {
  it("runs every item, never more than the limit at once, starting them in order", async () => {
    const p = probe();
    const items = Array.from({ length: 40 }, (_, i) => i);
    await forEachLimited(items, 6, p.task);
    expect(p.started).toEqual(items);
    expect(p.peak()).toBe(6);
  });

  it("overlaps the waits — six at once is not one after another", async () => {
    const p = probe();
    await forEachLimited([1, 2, 3, 4, 5, 6], 6, p.task);
    expect(p.peak()).toBe(6);
  });

  it("stops starting new items once asked to", async () => {
    const p = probe();
    let stopped = false;
    const items = Array.from({ length: 40 }, (_, i) => i);
    const run = forEachLimited(items, 2, async (n) => {
      if (n === 3) stopped = true;
      await p.task(n);
    }, () => stopped);
    await run;
    expect(p.started.length).toBeLessThan(10);
  });

  it("copes with an empty list and a limit above the list", async () => {
    const p = probe();
    await forEachLimited([], 6, p.task);
    await forEachLimited([7], 6, p.task);
    expect(p.started).toEqual([7]);
  });
});
