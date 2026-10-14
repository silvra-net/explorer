import { describe, expect, it } from "vitest";
import { LAG_NOTICE_BLOCKS, blocksBehind, isBehind, jailState } from "./lag";

describe("blocksBehind", () => {
  it("is the gap between the node and the tip its peers report", () => {
    expect(blocksBehind(352414, 352421)).toBe(7);
  });

  it("is zero, not negative, when the node is ahead of what its peers last said", () => {
    // Peer tips arrive with the peer exchange, so a node can briefly hold a block its peers have
    // not announced yet. That is not "minus one behind".
    expect(blocksBehind(100, 98)).toBe(0);
  });

  it("is unknown when the node does not report a peer tip", () => {
    // A node with no peers, or one too old for the field, reports null. Unknown must not read as
    // "caught up" — and it must not read as behind either.
    expect(blocksBehind(100, null)).toBeNull();
    expect(blocksBehind(100, undefined)).toBeNull();
    expect(blocksBehind(null, 100)).toBeNull();
  });
});

describe("isBehind", () => {
  it("stays quiet for the block or two a node at the tip trails by", () => {
    expect(isBehind(0)).toBe(false);
    expect(isBehind(LAG_NOTICE_BLOCKS - 1)).toBe(false);
  });

  it("speaks from the threshold on", () => {
    expect(isBehind(LAG_NOTICE_BLOCKS)).toBe(true);
    expect(isBehind(23000)).toBe(true);
  });

  it("never calls an unknown lag behind", () => {
    expect(isBehind(null)).toBe(false);
  });
});

describe("jailState", () => {
  it("is free without a jail", () => {
    expect(jailState(null, 500)).toBe("free");
  });

  it("is jailed while the jail runs", () => {
    expect(jailState(600, 500)).toBe("jailed");
  });

  it("is waiting for an unjail once the jail height has passed", () => {
    // The case on mainnet on 2026-10-14: jailed until 232200, chain at 352414, and the validator
    // still out — because it has not sent its unjail transaction, not because it is still jailed.
    expect(jailState(232200, 352414)).toBe("unjail-pending");
    expect(jailState(500, 500)).toBe("unjail-pending");
  });

  it("does not guess the end of a jail before the height is known", () => {
    expect(jailState(600, null)).toBe("jailed");
  });
});
