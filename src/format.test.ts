import { afterEach, describe, expect, it, vi } from "vitest";
import { gapSeconds, timeAgo, txTypeLabel } from "./format";

afterEach(() => {
  vi.useRealTimers();
});

describe("timeAgo", () => {
  /**
   * The node sends milliseconds. The wallet's version of this helper takes seconds, and copying
   * it unchanged would have placed every block tens of thousands of years in the past — a bug
   * that looks like a broken clock rather than a unit mistake. This test fails if the unit is
   * ever changed back.
   */
  it("treats its argument as milliseconds", () => {
    vi.useFakeTimers();
    const now = 1786547270679;
    vi.setSystemTime(now);

    expect(timeAgo(now - 5_000)).toBe("5s ago");
    expect(timeAgo(now - 120_000)).toBe("2 min ago");
    expect(timeAgo(now - 7_200_000)).toBe("2 h ago");
  });

  it("never shows a negative age when the node's clock runs ahead", () => {
    vi.useFakeTimers();
    const now = 1786547270679;
    vi.setSystemTime(now);
    expect(timeAgo(now + 4_000)).toBe("just now");
  });

  it("renders a missing timestamp as an em dash, not as 1970", () => {
    expect(timeAgo(0)).toBe("—");
  });
});

describe("gapSeconds", () => {
  it("reports the distance between two block timestamps in seconds", () => {
    expect(gapSeconds(1786547270679, 1786547268679)).toBe("2.0s");
  });

  it("does not invent a gap when the blocks arrive out of order", () => {
    expect(gapSeconds(1786547268679, 1786547270679)).toBe("—");
  });
});

describe("txTypeLabel", () => {
  it("splits the node's Rust variant names into words", () => {
    expect(txTypeLabel("SubmitDoubleSignEvidence")).toBe("Submit Double Sign Evidence");
    expect(txTypeLabel("Transfer")).toBe("Transfer");
  });

  it("passes through a variant it has never seen", () => {
    // The point of splitting on capitals rather than keeping a lookup table: a type added on
    // the node side shows up as readable words instead of a blank cell.
    expect(txTypeLabel("SomeFutureThing")).toBe("Some Future Thing");
  });
});
