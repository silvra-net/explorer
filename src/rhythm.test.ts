import { describe, expect, it } from "vitest";
import { barHeight, barScale, expectedGap, gaps, gapSeverity, isOverdue } from "./rhythm";

/** Blocks as this app passes them around: newest first, timestamps in milliseconds. */
function chain(...timestampsNewestFirst: number[]) {
  return timestampsNewestFirst.map((timestamp, i) => ({
    height: 1000 - i,
    timestamp,
  }));
}

describe("gaps", () => {
  it("returns intervals oldest first, so a chart reads left to right", () => {
    // Newest first: 10s, 6s, 0s → intervals of 6s then 4s, oldest first.
    const out = gaps(chain(10_000, 6_000, 0));
    expect(out.map((g) => g.seconds)).toEqual([6, 4]);
  });

  it("tags each interval with the block that ended it, not the one that started it", () => {
    // Heights are 1000, 999, 998. The 4s wait ended when 999 landed; the 6s wait ended at 1000.
    const out = gaps(chain(10_000, 6_000, 0));
    expect(out.map((g) => g.height)).toEqual([999, 1000]);
  });

  it("has no intervals for a single block, and none for none", () => {
    expect(gaps(chain(1_000))).toEqual([]);
    expect(gaps([])).toEqual([]);
  });

  it("clamps a backwards interval to zero rather than drawing a negative bar", () => {
    // Two validators whose clocks disagree by a second: the newer block carries the earlier
    // timestamp. That is a clock fault, not a chain fault, and it must not render as one.
    const out = gaps(chain(5_000, 6_000));
    expect(out[0].seconds).toBe(0);
  });
});

describe("expectedGap", () => {
  it("takes the median, so one stall does not redefine normal", () => {
    // A 2s chain that stalled once for 40s. A mean would be 8.4s and every healthy block
    // afterwards would look four times early; the median still says 2s.
    expect(expectedGap([2, 2, 40, 2, 2])).toBe(2);
  });

  it("never drops below a second", () => {
    // A chain faster than the heartbeat can usefully animate would otherwise sit permanently
    // full, which reads as a stall — the exact opposite of the truth.
    expect(expectedGap([0.2, 0.3, 0.25])).toBe(1);
  });

  it("falls back to a second when there is nothing to measure yet", () => {
    expect(expectedGap([])).toBe(1);
  });
});

describe("barScale", () => {
  it("never scales below 8s, so ordinary variation stays flat", () => {
    // The real chain: 1.7s and 2.4s alternating. Scaled to its own maximum, that ordinary
    // rhythm would render as bars varying by 40 % of the panel — noise drawn as drama.
    expect(barScale([1.7, 2.4, 1.9, 1.7])).toBe(8);
  });

  it("grows to fit a real stall", () => {
    expect(barScale([1.7, 2.4, 31])).toBe(31);
  });
});

describe("gapSeverity", () => {
  it("leaves an ordinary block unmarked", () => {
    expect(gapSeverity(2.4)).toBe("");
  });

  it("warns past ten seconds, where a consensus round was missed", () => {
    expect(gapSeverity(10)).toBe("");
    expect(gapSeverity(10.1)).toBe("warn");
  });

  it("calls it bad past twenty-five, where several were", () => {
    expect(gapSeverity(25)).toBe("warn");
    expect(gapSeverity(25.1)).toBe("bad");
  });
});

describe("barHeight", () => {
  it("keeps the smallest bar visible", () => {
    expect(barHeight(0, 8)).toBe(2);
  });

  it("fills the panel at the scale maximum", () => {
    expect(barHeight(8, 8)).toBe(100);
  });
});

describe("isOverdue", () => {
  it("waits for three times the chain's own rhythm", () => {
    // A 2s chain is not late at 5s. Marking it late there would paint the board red during
    // every ordinary round that took slightly longer.
    expect(isOverdue(5, 2)).toBe(false);
    expect(isOverdue(6.1, 2)).toBe(true);
  });

  it("scales with a slower chain rather than using a fixed number", () => {
    // A chain configured for 10s blocks is healthy at 20s and must not look sick.
    expect(isOverdue(20, 10)).toBe(false);
    expect(isOverdue(31, 10)).toBe(true);
  });
});
