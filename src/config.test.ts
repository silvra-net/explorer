import { describe, expect, it } from "vitest";
import { chainOf } from "./config";

const MAINNET = "f318dcdeffe93a45e8f7233b2048bedf1d544410028dafaec46a5461d4ef8540";

describe("chainOf", () => {
  /**
   * The strip calls a chain mainnet only when its genesis is the public node's genesis. The picker
   * can point this board at a private chain, and that chain must never borrow the label — nor the
   * "no resets" promise that comes with it.
   */
  it("calls an endpoint mainnet when its genesis is the public node's, in either case", () => {
    expect(chainOf(MAINNET, MAINNET)).toBe("mainnet");
    expect(chainOf(MAINNET.toUpperCase(), MAINNET)).toBe("mainnet");
  });

  it("calls any other genesis another chain", () => {
    expect(chainOf("00".repeat(32), MAINNET)).toBe("other");
  });

  it("says nothing until both genesis blocks have arrived", () => {
    expect(chainOf(undefined, MAINNET)).toBeNull();
    expect(chainOf(MAINNET, null)).toBeNull();
  });
});
