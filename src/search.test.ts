import { describe, expect, it } from "vitest";
import { classifyQuery } from "./search";

describe("classifyQuery", () => {
  it("reads a bare number as a block height", () => {
    expect(classifyQuery("41180")).toEqual({ kind: "height", height: 41180 });
    expect(classifyQuery("0")).toEqual({ kind: "height", height: 0 });
  });

  it("reads an hlx-prefixed Base58 string as an address", () => {
    const addr = "hlxbx7oYT7n1nidYCxLrk1LUQ93CTXFrGWNt";
    expect(classifyQuery(addr)).toEqual({ kind: "address", address: addr });
  });

  it("reads 64 hex characters as a hash and lowercases it", () => {
    const upper = "B985B59D690A6DE6960DFE2648C841F668F247DD2FA3860F32B2E7887A46B89E";
    expect(classifyQuery(upper)).toEqual({ kind: "hash", hash: upper.toLowerCase() });
  });

  it("trims surrounding whitespace before deciding", () => {
    // Pasting from a terminal or a chat message routinely brings a trailing newline along.
    expect(classifyQuery("  41180\n")).toEqual({ kind: "height", height: 41180 });
  });

  it("falls back to a name for anything else", () => {
    expect(classifyQuery("alice")).toEqual({ kind: "name", name: "alice" });
  });

  it("reports an empty field rather than classifying it", () => {
    expect(classifyQuery("   ")).toEqual({ kind: "empty" });
  });

  it("rejects an address containing Base58's excluded characters", () => {
    // `0`, `O`, `I` and `l` are not in the alphabet. Routing these to an account page would
    // answer "never seen on the chain" for a string that cannot be an address at all.
    expect(classifyQuery("hlx0OIl0OIl0OIl0OIl0OIl").kind).toBe("name");
  });

  it("does not treat a 63- or 65-character hex string as a hash", () => {
    expect(classifyQuery("a".repeat(63)).kind).toBe("name");
    expect(classifyQuery("a".repeat(65)).kind).toBe("name");
  });

  it("refuses a number too large to name an exact height", () => {
    // Number("9".repeat(20)) rounds. Navigating to the rounded value would open a different
    // block than the one that was typed, with nothing on screen admitting it.
    expect(classifyQuery("9".repeat(20)).kind).toBe("name");
  });
});
