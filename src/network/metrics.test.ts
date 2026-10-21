import { describe, expect, it } from "vitest";
import { blockSeries, nakamoto, nanoToHlx, slices } from "./metrics";
import type { BlockSummary } from "../types";

describe("nakamoto", () => {
  it("counts the strongest first, so it reports the smallest group that can do it", () => {
    // Total 10000, quorum 6667. Withholding the 6000 alone leaves 4000 < 6667: one halts.
    // Reaching 6667 takes the 6000 and the 2000.
    expect(nakamoto([1000, 1000, 2000, 6000], 10000, 6667)).toEqual({ halt: 1, control: 2 });
  });

  it("with power equalised by the cap, follows from the set size alone", () => {
    // Forty-two validators of equal weight, the chain's quorum rule: total * 2/3 + 1.
    const powers = Array.from({ length: 42 }, () => 100);
    const total = 4200;
    const quorum = Math.floor((total * 2) / 3) + 1; // 2801
    // Halting needs more than 1399 withheld: 14 × 100 = 1400. Controlling needs 2801: 29.
    expect(nakamoto(powers, total, quorum)).toEqual({ halt: 14, control: 29 });
  });

  it("does not count a group whose absence still leaves exactly the quorum", () => {
    // Withholding 1000 of 3000 leaves 2000, and 2000 is the quorum: the rest still finalize.
    expect(nakamoto([1000, 1000, 1000], 3000, 2000)).toEqual({ halt: 2, control: 2 });
  });

  it("ignores validators that carry no weight — a probationer cannot halt anything", () => {
    expect(nakamoto([0, 0, 500, 500, 500, 500], 2000, 1334)).toEqual({ halt: 2, control: 3 });
  });

  it("says it cannot when the set cannot reach the quorum at all", () => {
    expect(nakamoto([], 0, 1)).toEqual({ halt: null, control: null });
    expect(nakamoto([100], 100, 200)).toEqual({ halt: 1, control: null });
  });
});

describe("slices", () => {
  const item = (key: string, value: number) => ({ key, label: key, value });

  it("keeps the largest and folds the rest into one labelled slice", () => {
    const out = slices([item("a", 1), item("b", 5), item("c", 3), item("d", 2)], 2);
    expect(out.map((s) => s.key)).toEqual(["b", "c", "rest"]);
    expect(out[2]).toMatchObject({ value: 3, rest: 2, label: "2 others" });
  });

  it("does not fold a single leftover into a slice of its own", () => {
    // "1 others" would be a worse label than the entry it hides.
    expect(slices([item("a", 3), item("b", 2), item("c", 1)], 2).map((s) => s.key)).toEqual(["a", "b", "c"]);
  });

  it("drops empty entries, which would draw as nothing and still take a legend row", () => {
    expect(slices([item("a", 0), item("b", 1)], 5).map((s) => s.key)).toEqual(["b"]);
  });
});

describe("nanoToHlx", () => {
  it("keeps amounts above what a double holds exactly in nano", () => {
    // 20 million HLX in nano is 2e16 — past 2^53, so Number("20000000123456789") would round.
    expect(nanoToHlx("20000000123456789")).toBeCloseTo(20000000.123456789, 6);
  });

  it("reads an absent or malformed field as unknown, never as zero", () => {
    expect(nanoToHlx(undefined)).toBeNull();
    expect(nanoToHlx(null)).toBeNull();
    expect(nanoToHlx("1.5")).toBeNull();
    expect(nanoToHlx("0")).toBe(0);
  });
});

describe("blockSeries", () => {
  const block = (height: number, timestamp: number, tx_count = 0): BlockSummary =>
    ({ height, timestamp, tx_count, base_fee_per_byte: 1 }) as BlockSummary;

  it("orders oldest first and measures each interval from the block before", () => {
    const out = blockSeries([block(3, 6000), block(1, 1000), block(2, 3500, 4)]);
    expect(out.map((p) => p.height)).toEqual([1, 2, 3]);
    expect(out.map((p) => p.interval)).toEqual([undefined, 2.5, 2.5]);
    expect(out[1].txs).toBe(4);
  });

  it("does not invent an interval across a gap in the heights", () => {
    expect(blockSeries([block(1, 1000), block(3, 9000)])[1].interval).toBeUndefined();
  });

  it("clamps a proposer clock running behind its parent's to zero", () => {
    expect(blockSeries([block(1, 5000), block(2, 4000)])[1].interval).toBe(0);
  });
});
