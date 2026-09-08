import { Link } from "react-router-dom";
import { hlx, num, shortAddr, shortHash, timeAgo } from "../format";
import type { BlockSummary, BlockTx } from "../types";

interface WindowTx extends BlockTx {
  height: number;
  timestamp: number;
}

/**
 * What the inspector shows when nothing is selected.
 *
 * This cell is a quarter of the board and it used to say "select something" — the largest piece
 * of empty space on the screen, in the place a first-time visitor looks after the height. Every
 * figure here is computed from blocks the board already holds, so it costs no request and cannot
 * disagree with the panels around it.
 *
 * The two things worth surfacing unprompted are the largest transfers, because that is what
 * somebody scanning a chain is looking for, and the failed ones, because a failure is the only
 * event here that somebody might need to act on and it is otherwise buried in a feed that moves
 * every two seconds.
 */
export function InspectorIdle({ blocks }: { blocks: BlockSummary[] }) {
  const txs: WindowTx[] = [];
  for (const b of blocks) {
    for (const t of b.transactions) txs.push({ ...t, height: b.height, timestamp: b.timestamp });
  }

  if (blocks.length === 0) {
    return <p className="idle">Reading the chain…</p>;
  }

  const failed = txs.filter((t) => t.status !== "applied");
  const largest = [...txs].sort((a, b) => b.amount_hlx - a.amount_hlx).slice(0, 5);
  const fees = txs.reduce((n, t) => n + t.fee_hlx, 0);

  // Distinct senders in the window: a rough measure of how many accounts are actually doing
  // something, as opposed to how many exist.
  const active = new Set(txs.map((t) => t.from)).size;

  const span =
    blocks.length > 1
      ? (blocks[0].timestamp - blocks[blocks.length - 1].timestamp) / 1000
      : null;

  return (
    <div className="idle-body">
      <p className="idle-lead">
        The last <b className="num">{num(blocks.length)}</b> blocks
        {span !== null && (
          <>
            {" "}
            — about <b className="num">{Math.round(span)}s</b> of chain
          </>
        )}
        .
      </p>

      <dl className="idle-stats">
        <div>
          <dt>Transactions</dt>
          <dd className="num">{num(txs.length)}</dd>
        </div>
        <div>
          <dt>Active senders</dt>
          <dd className="num">{num(active)}</dd>
        </div>
        {/* Full precision, not the rounded form used for supply figures. Helix fees are
            fractions of a thousandth of an HLX, and two decimal places rendered a window that
            collected fees on 155 transactions as a flat "0". */}
        <div>
          <dt>Fees</dt>
          <dd className="num" title={`${fees} HLX`}>
            {hlx(fees)}
          </dd>
        </div>
        <div>
          <dt>Failed</dt>
          <dd className={`num${failed.length > 0 ? " bad" : ""}`}>{num(failed.length)}</dd>
        </div>
      </dl>

      {failed.length > 0 && (
        <>
          <p className="idle-head bad">Did not apply</p>
          <ul className="idle-list">
            {failed.slice(0, 4).map((t) => (
              <li key={t.hash}>
                <Link className="mono" to={`/tx/${t.hash}`}>
                  {shortHash(t.hash)}
                </Link>
                <span className="dim">
                  {" "}
                  {shortAddr(t.from)} · {timeAgo(t.timestamp)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {largest.length > 0 && (
        <>
          <p className="idle-head">Largest transfers</p>
          <ul className="idle-list">
            {largest.map((t) => (
              <li key={t.hash}>
                <span className="num strong">{hlx(t.amount_hlx)}</span>{" "}
                <span className="dim">HLX</span>
                <br />
                <Link className="mono" to={`/tx/${t.hash}`}>
                  {shortHash(t.hash)}
                </Link>
                <span className="dim">
                  {" "}
                  {shortAddr(t.from)} → {shortAddr(t.to)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="idle-hint">
        Select a block or a transaction to inspect it here. <kbd>⌘K</kbd> for commands,{" "}
        <kbd>/</kbd> to search, <kbd>Esc</kbd> to clear.
      </p>
    </div>
  );
}
