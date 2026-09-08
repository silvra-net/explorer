import { hlxShort, num } from "../format";
import type { NodeStatus } from "../types";

/**
 * The readings that are not the headline.
 *
 * Everything here comes from `/status` and most of it was previously fetched and thrown away —
 * peer count, burned supply, the base fee. A block explorer that reads a field and does not show
 * it is making the reader take its word for something it already knows.
 *
 * Burn is the one worth watching: it only ever goes up, so a figure that stops moving on a chain
 * that is still processing transactions means fees stopped being charged.
 */
export function Telemetry({
  status,
  txInWindow,
  blocksInWindow,
}: {
  status: NodeStatus | null;
  txInWindow: number;
  blocksInWindow: number;
}) {
  const perBlock = blocksInWindow > 0 ? txInWindow / blocksInWindow : null;

  return (
    <div className="tiles">
      <Tile k="Peers" v={status ? num(status.peer_count) : "—"} />
      <Tile k="Mempool" v={status ? num(status.mempool_size) : "—"} />
      <Tile k="Accounts" v={status ? num(status.total_accounts) : "—"} />
      <Tile
        k="Tx / block"
        v={perBlock === null ? "—" : perBlock.toFixed(1)}
        sub={`${num(txInWindow)} in ${num(blocksInWindow)}`}
      />
      <Tile
        k="Circulating"
        v={status ? hlxShort(status.circulating_supply_hlx) : "—"}
        sub="HLX"
      />
      {/* Four decimals rather than the nine the node sends: in a tile this narrow the full
          precision wraps to three lines and buries the only thing being watched, which is that
          the figure moves at all. The exact value stays in the tooltip. */}
      <Tile
        k="Burned"
        v={status ? status.total_burned_hlx.toFixed(4) : "—"}
        sub="HLX"
        title={status ? `${status.total_burned_hlx} HLX destroyed by fees` : undefined}
      />
      <Tile k="Base fee" v={status ? num(status.base_fee_per_byte) : "—"} sub="per byte" />
      <Tile
        k="State"
        v={status ? num(status.state_height) : "—"}
        sub="applied"
        title="The height whose state this node has actually executed, which can trail the height it has stored"
      />
    </div>
  );
}

function Tile({ k, v, sub, title }: { k: string; v: string; sub?: string; title?: string }) {
  return (
    <div className="tile" title={title}>
      <span className="k">{k}</span>
      <span className="v">
        {v}
        {sub && <small> {sub}</small>}
      </span>
    </div>
  );
}
