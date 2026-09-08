import { describe, expect, it } from "vitest";
import { faultTolerance, faultToleranceLabel } from "./quorum";

/**
 * The numbers come from the chain's own rule: `power = min(stake/2, total_stake/100)` and
 * `quorum = total * 2/3 + 1`. Above the 1 % cap every validator weighs the same, which is what
 * makes these results counter-intuitive enough to be worth pinning.
 */
describe("faultTolerance", () => {
  it("gives a two-validator set no tolerance at all", () => {
    // Equal power 2000 each, total 4000, quorum 2667. Losing either leaves 2000 < 2667.
    expect(faultTolerance([2000, 2000], 4000, 2667)).toBe(0);
  });

  it("gives a three-validator set no tolerance either — the counter-intuitive one", () => {
    // 3000 each, total 9000, quorum 6001. Two of three carry 6000, one short.
    // This is why adding a single third validator to a set of two makes nothing better.
    expect(faultTolerance([3000, 3000, 3000], 9000, 6001)).toBe(0);
  });

  it("gives a four-validator set tolerance for one", () => {
    // 4000 each, total 16000, quorum 10667. Three of four carry 12000 — enough.
    expect(faultTolerance([4000, 4000, 4000, 4000], 16000, 10667)).toBe(1);
  });

  it("removes the weakest first, so the answer is the best case", () => {
    // Total 10000, quorum 6667. Dropping the 1000 leaves 9000; dropping the next 1000 leaves
    // 8000; dropping 2000 more leaves 6000, which is short. So two can go.
    expect(faultTolerance([1000, 1000, 2000, 6000], 10000, 6667)).toBe(2);
  });

  it("ignores validators with no power, which cannot fail in a way that matters", () => {
    // A probationer sits in the set at zero power. Removing it changes nothing, so it must not
    // be counted as a spare — that would advertise tolerance the set does not have.
    expect(faultTolerance([0, 0, 2000, 2000], 4000, 2667)).toBe(0);
  });

  it("handles a single validator, which is the one set that cannot lose anybody", () => {
    expect(faultTolerance([1000], 1000, 667)).toBe(0);
  });
});

describe("faultToleranceLabel", () => {
  it("says plainly when a set has no room", () => {
    expect(faultToleranceLabel(0)).toMatch(/no validator can go offline/);
  });

  it("uses the singular for one", () => {
    expect(faultToleranceLabel(1)).toBe("survives one validator going offline");
  });

  it("uses the plural beyond one", () => {
    expect(faultToleranceLabel(3)).toBe("survives 3 validators going offline");
  });
});
