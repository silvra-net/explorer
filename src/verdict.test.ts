import { describe, expect, it } from "vitest";
import { verdict, type VerdictInput } from "./verdict";
import { absentCount, attendance, proposerVersions, versionSpread } from "./attendance";
import type { BlockHeader, BlockSummary } from "./types";

const healthy: VerdictInput = {
  unreachable: false,
  syncing: false,
  sinceTip: 2,
  expected: 2,
  absent: 0,
  jailed: 0,
  spare: 0,
};

describe("verdict", () => {
  it("says producing when blocks land and everybody signs", () => {
    expect(verdict(healthy).state).toBe("producing");
  });

  it("puts unreachable above every other signal", () => {
    // The chain could be perfect; if this page cannot read it, saying so would be reporting a
    // memory as a measurement. Every other input here is the healthy one.
    const v = verdict({ ...healthy, unreachable: true, syncing: true, sinceTip: 900, jailed: 2 });
    expect(v.state).toBe("unreachable");
  });

  it("prefers syncing over a stall, because a catching-up node keeps its own schedule", () => {
    // 900s since the tip *this node* holds, while it replays history. Timing that against the
    // live chain's 2s rhythm would report a stall that is really a catch-up.
    const v = verdict({ ...healthy, syncing: true, sinceTip: 900 });
    expect(v.state).toBe("syncing");
  });

  it("tolerates a long round without calling it a stall", () => {
    // The heartbeat turns red at three intervals. The verdict waits for ten, so an ordinary
    // slow round does not put the board into an alarm state.
    expect(verdict({ ...healthy, sinceTip: 8, expected: 2 }).state).toBe("producing");
    expect(verdict({ ...healthy, sinceTip: 21, expected: 2 }).state).toBe("stalled");
  });

  it("scales the stall threshold with the chain rather than fixing it", () => {
    // A chain configured for 10s blocks is fine at 60s and must not read as stalled.
    expect(verdict({ ...healthy, sinceTip: 60, expected: 10 }).state).toBe("producing");
    expect(verdict({ ...healthy, sinceTip: 101, expected: 10 }).state).toBe("stalled");
  });

  it("reports a jailed validator as degraded", () => {
    expect(verdict({ ...healthy, jailed: 1 }).state).toBe("degraded");
  });

  it("reports a missed block as degraded on a set with no room", () => {
    expect(verdict({ ...healthy, absent: 1, spare: 0 }).state).toBe("degraded");
  });

  it("leaves a set that can absorb the absence alone", () => {
    // Twenty validators with room for six: one missing a round is that operator's problem, not
    // the network's. Shouting DEGRADED here is how a board teaches people to ignore its most
    // important word.
    expect(verdict({ ...healthy, absent: 1, spare: 6 }).state).toBe("producing");
    expect(verdict({ ...healthy, absent: 5, spare: 6 }).state).toBe("producing");
  });

  it("calls it degraded once the margin is gone, not only once it is exceeded", () => {
    // At exactly the limit the next absence stops the chain, which is worth saying out loud.
    expect(verdict({ ...healthy, absent: 6, spare: 6 }).state).toBe("degraded");
    expect(verdict({ ...healthy, absent: 7, spare: 6 }).state).toBe("degraded");
  });

  it("treats an unknown tolerance as none, erring towards reporting risk", () => {
    // A node too old to publish voting power cannot tell us the margin. Assuming there is one
    // would be the unsafe direction to guess in.
    expect(verdict({ ...healthy, absent: 1, spare: null }).state).toBe("degraded");
  });

  it("says plainly which case the reader is in", () => {
    expect(verdict({ ...healthy, absent: 1, spare: 0 }).why).toMatch(/no room/);
    expect(verdict({ ...healthy, absent: 6, spare: 6 }).why).toMatch(/absorb 6 and no more/);
  });

  it("ranks a stall above a degraded set, because it is the worse fact", () => {
    const v = verdict({ ...healthy, sinceTip: 100, expected: 2, absent: 3, jailed: 1 });
    expect(v.state).toBe("stalled");
  });
});

/** A header carrying only what attendance reads. */
function header(height: number, signers: string[]): BlockHeader {
  return {
    height,
    hash: "",
    prev_hash: "",
    merkle_root: "",
    timestamp: 0,
    validator: signers[0] ?? "",
    node_version: "",
    base_fee_per_byte: 1,
    last_commit: signers,
  };
}

describe("attendance", () => {
  const vals = ["a", "b", "c"];

  it("counts each validator's precommits across the window", () => {
    const headers = new Map([
      [1, header(1, ["a", "b", "c"])],
      [2, header(2, ["a", "c"])],
      [3, header(3, ["a", "b", "c"])],
    ]);
    const rows = attendance(vals, [3, 2, 1], headers);
    expect(rows.map((r) => `${r.address}:${r.signed}/${r.measured}`)).toEqual([
      "a:3/3",
      "b:2/3",
      "c:3/3",
    ]);
  });

  it("returns history oldest first, whatever order the heights arrive in", () => {
    const headers = new Map([
      [1, header(1, ["a"])],
      [2, header(2, [])],
      [3, header(3, ["a"])],
    ]);
    // Heights passed newest-first, as the rest of the app carries them.
    const [a] = attendance(["a"], [3, 2, 1], headers);
    expect(a.history).toEqual([true, false, true]);
  });

  it("skips heights whose header never arrived rather than counting them as misses", () => {
    // A failed header request is a fact about this browser's connection. Counting it against a
    // validator would accuse somebody of an outage that happened on the reader's own network.
    const headers = new Map([
      [1, header(1, ["a"])],
      [3, header(3, ["a"])],
    ]);
    const [a] = attendance(["a"], [3, 2, 1], headers);
    expect(a.measured).toBe(2);
    expect(a.signed).toBe(2);
  });

  it("reports nothing measured before any header has arrived", () => {
    const [a] = attendance(["a"], [3, 2, 1], new Map());
    expect(a).toEqual({ address: "a", signed: 0, measured: 0, history: [] });
  });
});

/** A block carrying only what the version read looks at. */
function block(height: number, validator: string, node_version: string): BlockSummary {
  return {
    height,
    hash: `h${height}`,
    prev_hash: "",
    merkle_root: "",
    timestamp: height * 1000,
    validator,
    node_version,
    base_fee_per_byte: 1,
    tx_count: 0,
    transactions: [],
  };
}

describe("proposerVersions", () => {
  it("reports the version of each validator's most recent block", () => {
    // "a" proposed twice; the newer block is the one that describes what they run now.
    const out = proposerVersions([
      block(3, "a", "0.11.1"),
      block(2, "b", "0.11.0"),
      block(1, "a", "0.11.0"),
    ]);
    expect(out.get("a")).toBe("0.11.1");
    expect(out.get("b")).toBe("0.11.0");
  });

  it("does not depend on the order it is handed the blocks", () => {
    const ascending = proposerVersions([block(1, "a", "0.11.0"), block(3, "a", "0.11.1")]);
    expect(ascending.get("a")).toBe("0.11.1");
  });

  it("leaves out a validator that did not propose inside the window", () => {
    // Guessing from an older observation would quietly report a stale version as current, and
    // "has not had a turn yet" is a real state worth showing as one.
    const out = proposerVersions([block(1, "a", "0.11.1")]);
    expect(out.has("b")).toBe(false);
  });
});

describe("versionSpread", () => {
  it("counts each version, most common first", () => {
    const versions = new Map([
      ["a", "0.11.1"],
      ["b", "0.11.0"],
      ["c", "0.11.1"],
    ]);
    expect(versionSpread(versions)).toEqual([
      { version: "0.11.1", count: 2 },
      { version: "0.11.0", count: 1 },
    ]);
  });

  it("returns a single entry for a set that agrees, which is how the alert stays quiet", () => {
    const versions = new Map([
      ["a", "0.11.1"],
      ["b", "0.11.1"],
    ]);
    expect(versionSpread(versions)).toHaveLength(1);
  });

  it("breaks ties by version so the majority does not flip between renders", () => {
    // One validator each. Without the tiebreak the "majority" would depend on Map order and the
    // odd-one-out highlight would flicker.
    const versions = new Map([
      ["a", "0.11.1"],
      ["b", "0.11.0"],
    ]);
    expect(versionSpread(versions).map((s) => s.version)).toEqual(["0.11.0", "0.11.1"]);
  });

  it("has nothing to say about an empty window", () => {
    expect(versionSpread(new Map())).toEqual([]);
  });
});

describe("absentCount", () => {
  it("counts validators that missed anything at all", () => {
    const headers = new Map([
      [1, header(1, ["a", "b"])],
      [2, header(2, ["a"])],
    ]);
    expect(absentCount(attendance(["a", "b"], [2, 1], headers))).toBe(1);
  });

  it("counts nobody as absent while nothing has been measured", () => {
    // An empty window must not make a healthy set look broken on first paint.
    expect(absentCount(attendance(["a", "b"], [2, 1], new Map()))).toBe(0);
  });
});
