import { getRpcBase } from "./config";
import type {
  Account,
  BlockHeader,
  BlockSummary,
  Delegation,
  GovParams,
  HistoryTx,
  MempoolInfo,
  NodeStatus,
  Proposal,
  TxDetail,
  ValidatorList,
} from "./types";

/**
 * A request that reached the node and came back as something other than data.
 *
 * `notFound` is the distinction that matters and the one that is easy to get wrong: a 404 from
 * this API is an *answer* ("no such block", "this account has never been seen"), while a 502
 * from the tunnel in front of it is a failure. Collapsing the two makes a proxy outage look
 * like an empty chain — the node-side CLI had exactly this bug (#167) and reported a broken
 * gateway as "not found".
 */
export class RpcError extends Error {
  readonly status: number;
  readonly notFound: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RpcError";
    this.status = status;
    this.notFound = status === 404;
  }
}

/**
 * Blocks below the tip never change, so their responses are cached for the life of the page.
 *
 * This is not a micro-optimisation: the block list needs one `/header` request per row to show
 * who co-signed, and the rate limiter allows a burst of 30. Without the cache, scrolling back
 * and forth through history would spend that budget on answers we already had.
 */
const immutableCache = new Map<string, unknown>();

/** Cache key includes the endpoint so switching nodes never serves another chain's block. */
function cacheKey(path: string): string {
  return `${getRpcBase()}${path}`;
}

async function request<T>(path: string, opts?: { cache?: boolean }): Promise<T> {
  const key = cacheKey(path);
  if (opts?.cache) {
    const hit = immutableCache.get(key);
    if (hit !== undefined) return hit as T;
  }

  let res: Response;
  try {
    res = await fetch(`${getRpcBase()}${path}`, {
      headers: { Accept: "application/json" },
    });
  } catch (e) {
    // No response at all: DNS, TLS, CORS, or the node is down. Distinguish it from an HTTP
    // error, because the fix is different — one is "the chain says no", the other "nobody
    // answered".
    throw new RpcError(
      `cannot reach ${getRpcBase()} — ${e instanceof Error ? e.message : "network error"}`,
      0,
    );
  }

  if (!res.ok) {
    // The node sends `{"error": "..."}` with its non-2xx responses. A proxy in front of it
    // sends HTML. Try for the former, never render the latter as if it were the node talking.
    let detail = res.statusText;
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      const body = await res.json().catch(() => null);
      if (body && typeof body === "object" && "error" in body) {
        detail = String((body as { error: unknown }).error);
      }
    }
    throw new RpcError(detail || `HTTP ${res.status}`, res.status);
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    // A 200 that is not JSON is a captive portal, a tunnel error page, or the wrong host —
    // anything but this API. Parsing it would turn an infrastructure problem into a confusing
    // render bug three components away.
    throw new RpcError(
      `${getRpcBase()} answered with ${ct || "an unknown content type"}, not JSON — is this a Helix node?`,
      res.status,
    );
  }

  const data = (await res.json()) as T;
  if (opts?.cache) immutableCache.set(key, data);
  return data;
}

export const rpc = {
  status: () => request<NodeStatus>("/status"),
  mempool: () => request<MempoolInfo>("/mempool"),

  latestBlock: () => request<BlockSummary>("/blocks/latest"),

  /** Newest-first is this app's convention; the API serves ascending from `from`. */
  blockRange: (from: number, count: number) =>
    request<BlockSummary[]>(`/blocks/range?from=${from}&count=${count}`),

  blockByHeight: (height: number) =>
    request<BlockSummary>(`/blocks/height/${height}`, { cache: true }),

  blockByHash: (hash: string) =>
    request<BlockSummary>(`/blocks/hash/${hash}`, { cache: true }),

  blockHeader: (height: number) =>
    request<BlockHeader>(`/blocks/height/${height}/header`, { cache: true }),

  tx: (hash: string) => request<TxDetail>(`/transactions/${hash}`),

  account: (address: string) => request<Account>(`/accounts/${address}`),

  accountTransactions: (address: string, limit: number, offset: number) =>
    request<{ address: string; transactions: HistoryTx[] }>(
      `/accounts/${address}/transactions?limit=${limit}&offset=${offset}`,
    ),

  accountName: (address: string) =>
    request<{ name: string | null }>(`/accounts/${address}/name`),

  accountDelegations: (address: string) =>
    request<{ delegations: Delegation[] }>(`/accounts/${address}/delegations`),

  validators: () => request<ValidatorList>("/validators"),

  govParams: () => request<GovParams>("/governance/params"),

  proposals: () => request<{ proposals: Proposal[] } | Proposal[]>("/governance/proposals"),

  resolveName: (name: string) => request<{ address: string | null }>(`/names/${name}`),
};

/** Forget every cached block — used when the endpoint changes under us. */
export function clearRpcCache(): void {
  immutableCache.clear();
}
