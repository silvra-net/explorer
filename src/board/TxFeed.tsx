import { memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { hlxShort, shortAddr, shortHash, timeAgo, txTypeLabel } from "../format";
import { useFreezeOnHover } from "../useFreezeOnHover";
import type { BlockSummary, BlockTx } from "../types";

interface FeedTx extends BlockTx {
  height: number;
  timestamp: number;
}

/**
 * Transactions as they land, flattened out of the blocks the board already holds.
 *
 * Costs nothing: `/blocks/range` carries each block's transactions, and until now this app
 * fetched all of them and rendered a count. On a chain producing a block every two seconds the
 * feed is the part of the board that is visibly *doing* something between blocks, which is most
 * of what makes a board feel like an instrument rather than a report.
 */
/**
 * Memoised because it is the longest list on the board and the only one that cares about
 * nothing but its blocks. Hovering a row anywhere else moves shared state on the board, and
 * without this the feed would rebuild sixty rows every time the pointer crossed a block.
 */
export const TxFeed = memo(function TxFeed({
  blocks,
  limit = 60,
}: {
  blocks: BlockSummary[];
  limit?: number;
}) {
  const navigate = useNavigate();
  // Off the path, not `useParams` — this feed sits in the board's frame rather than inside the
  // inspector's routes, where the params hook has nothing to read.
  const openHash = useLocation().pathname.match(/^\/tx\/([0-9a-fA-F]{64})$/)?.[1];

  const live: FeedTx[] = [];
  for (const b of blocks) {
    for (const t of b.transactions) {
      live.push({ ...t, height: b.height, timestamp: b.timestamp });
    }
    if (live.length >= limit) break;
  }

  // Held still while the pointer is on the table, so the row that gets clicked is the row that
  // was aimed at.
  const { value: feed, frozen, handlers } = useFreezeOnHover(live);

  if (feed.length === 0) {
    return (
      <p className="dim small pad-sm">
        No transactions in the last {blocks.length} blocks. Helix produces a block on a fixed
        interval whether or not there is anything to carry.
      </p>
    );
  }

  return (
    <div className="tbl-wrap" {...handlers}>
      {frozen && <div className="frozen-tag">held while you read</div>}
      <table className="dense">
        <thead>
          <tr>
            {/* Counterparties are dropped on a narrow screen: two truncated addresses cost more
                width than everything else combined, and both are one tap away in the detail. */}
            <th>Hash</th>
            <th>Type</th>
            <th className="opt">From</th>
            <th className="opt">To</th>
            <th className="r">Amount</th>
            <th>Age</th>
          </tr>
        </thead>
        <tbody>
          {feed.slice(0, limit).map((t) => (
            <tr
              key={t.hash}
              className={t.hash === openHash ? "pick" : undefined}
              onClick={(e) => {
                // The hash cell is a real link; let it do its own navigating so the row stays
                // usable with a keyboard and a middle click.
                if ((e.target as HTMLElement).closest("a")) return;
                navigate(`/tx/${t.hash}`);
              }}
            >
              <td className="mono">
                <Link to={`/tx/${t.hash}`} title={t.hash}>
                  {shortHash(t.hash)}
                </Link>
              </td>
              <td>
                <span className={t.status === "applied" ? "" : "dim"}>
                  {txTypeLabel(t.tx_type)}
                </span>
                {t.status !== "applied" && <span className="pill bad">{t.status}</span>}
              </td>
              <td className="mono dim opt">{shortAddr(t.from)}</td>
              <td className="mono dim opt">{shortAddr(t.to)}</td>
              <td className="r num">{hlxShort(t.amount_hlx)}</td>
              <td className="dim">{timeAgo(t.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
