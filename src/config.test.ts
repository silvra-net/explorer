import { describe, expect, it } from "vitest";
import { MAINNET_GENESIS, chainOf } from "./config";

describe("chainOf", () => {
  /**
   * The strip calls a chain mainnet only by its genesis. The picker can point this board at a
   * private chain, and that chain must never borrow the label — nor the "no resets" promise that
   * comes with it.
   */
  it("recognises the mainnet by its genesis hash, in either case", () => {
    expect(chainOf(MAINNET_GENESIS)).toBe("mainnet");
    expect(chainOf(MAINNET_GENESIS.toUpperCase())).toBe("mainnet");
  });

  it("calls any other genesis another chain", () => {
    expect(chainOf("00".repeat(32))).toBe("other");
  });

  it("says nothing until block 0 has arrived", () => {
    expect(chainOf(undefined)).toBeNull();
    expect(chainOf(null)).toBeNull();
  });
});
