import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearRpcCache, rpc, RpcError } from "./rpc";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function htmlResponse(status: number): Response {
  return new Response("<html><body>Bad gateway</body></html>", {
    status,
    headers: { "content-type": "text/html" },
  });
}

beforeEach(() => {
  clearRpcCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RPC error classification", () => {
  /**
   * The distinction the node-side CLI got wrong (#167) and the one this app must not: a 404 is
   * the chain answering "no such thing", while anything else is the request failing. Collapsing
   * them makes a gateway outage look like an empty chain.
   */
  it("marks a 404 as notFound", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "block not found" }, 404)),
    );

    const err = await rpc.blockByHeight(999999).catch((e) => e);
    expect(err).toBeInstanceOf(RpcError);
    expect(err.notFound).toBe(true);
    expect(err.message).toBe("block not found");
  });

  it("does not mark a 502 as notFound", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(htmlResponse(502)));

    const err = await rpc.status().catch((e) => e);
    expect(err).toBeInstanceOf(RpcError);
    expect(err.notFound).toBe(false);
    expect(err.status).toBe(502);
  });

  /**
   * A proxy that answers 200 with an HTML error page is the nastiest case, because every status
   * check passes. Parsing it would surface three components away as a render bug.
   */
  it("rejects a 200 that is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>captive portal</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      ),
    );

    const err = await rpc.status().catch((e) => e);
    expect(err).toBeInstanceOf(RpcError);
    expect(err.message).toMatch(/not JSON/);
  });

  it("reports a transport failure separately from an HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const err = await rpc.status().catch((e) => e);
    expect(err).toBeInstanceOf(RpcError);
    expect(err.status).toBe(0);
    expect(err.notFound).toBe(false);
    // Naming the endpoint is the difference between a reader checking their own node and a
    // reader filing a bug against the chain.
    expect(err.message).toMatch(/cannot reach/);
  });

  it("returns parsed data on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ height: 41180 })));
    await expect(rpc.status()).resolves.toMatchObject({ height: 41180 });
  });
});

describe("immutable caching", () => {
  // A Response body can only be read once, so each call must hand back a fresh one — otherwise
  // the second read fails and the test reports a caching bug that is really a test bug.
  it("fetches a finalized block once and serves the rest from memory", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ height: 7, hash: "abc" }));
    vi.stubGlobal("fetch", fetchMock);

    await rpc.blockByHeight(7);
    await rpc.blockByHeight(7);
    await rpc.blockByHeight(7);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache the chain tip, which changes every block", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ height: 41180 }));
    vi.stubGlobal("fetch", fetchMock);

    await rpc.status();
    await rpc.status();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
