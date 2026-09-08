import { Link, useParams } from "react-router-dom";
import { fullTime, hlx, num, timeAgo, txTypeLabel } from "../format";
import { rpc } from "../rpc";
import { useAsync } from "../useAsync";
import { Addr, BlockLink, ErrorBox, Loading, TxLink, TxStatus } from "../components/Bits";
import { CoSignLegend, CoSignStrip } from "../components/CoSignStrip";

export default function BlockDetail() {
  const { height: raw } = useParams();
  const height = Number(raw);
  const valid = Number.isInteger(height) && height >= 0;

  const block = useAsync(
    () => (valid ? rpc.blockByHeight(height) : Promise.reject(new Error("bad height"))),
    [height, valid],
  );
  const header = useAsync(
    () => (valid ? rpc.blockHeader(height) : Promise.reject(new Error("bad height"))),
    [height, valid],
  );
  const vals = useAsync(() => rpc.validators(), []);

  if (!valid) {
    return (
      <>
        <p className="eyebrow">Block</p>
        <div className="notice bad">“{raw}” is not a block height.</div>
      </>
    );
  }

  if (block.notFound) {
    return (
      <>
        <p className="eyebrow">Block {num(height)}</p>
        <div className="notice">
          The chain has no block at height {num(height)} yet. If you expected one, the node you
          are reading from may still be catching up.
        </div>
      </>
    );
  }

  if (block.error && !block.data) {
    return (
      <>
        <p className="eyebrow">Block {num(height)}</p>
        <ErrorBox message={block.error} onRetry={block.reload} />
      </>
    );
  }

  if (!block.data) {
    return (
      <>
        <p className="eyebrow">Block {num(height)}</p>
        <div className="panel">
          <Loading rows={5} />
        </div>
      </>
    );
  }

  const b = block.data;
  const signers = header.data?.last_commit ?? null;
  const validators = (vals.data?.validators ?? []).map((v) => v.address);

  return (
    <>
      <p className="eyebrow">Block</p>
      <div className="panel">
        <div className="panel-head">
          <h2 className="num">{num(b.height)}</h2>
          <span className="hint">
            {timeAgo(b.timestamp)} · {fullTime(b.timestamp)}
          </span>
        </div>
        <dl className="kv">
          <dt>Hash</dt>
          <dd className="mono">{b.hash}</dd>

          <dt>Previous</dt>
          <dd>
            {b.height > 0 ? (
              <BlockLink height={b.height - 1}>
                <span className="mono">{b.prev_hash}</span>
              </BlockLink>
            ) : (
              <span className="mono dim">{b.prev_hash}</span>
            )}
          </dd>

          <dt>Proposed by</dt>
          <dd>
            <Addr a={b.validator} full />
          </dd>

          <dt>Co-signed by</dt>
          <dd>
            {signers === null ? (
              <span className="dim">Loading the commit certificate…</span>
            ) : signers.length === 0 ? (
              <span className="dim">
                No commit certificate travels with this block. Genesis carries none, and the
                current tip is only certified by the block above it.
              </span>
            ) : (
              <>
                <div style={{ marginBottom: 8 }}>
                  <CoSignStrip
                    validators={validators}
                    signers={signers}
                    proposer={b.validator}
                  />{" "}
                  <span className="dim">
                    {signers.length} of {validators.length || "?"}
                  </span>
                </div>
                <div style={{ display: "grid", gap: 3 }}>
                  {signers.map((s) => (
                    <Addr key={s} a={s} full />
                  ))}
                </div>
                <div style={{ marginTop: 10 }}>
                  <CoSignLegend total={validators.length} />
                </div>
              </>
            )}
          </dd>

          <dt>Merkle root</dt>
          <dd className="mono dim">{b.merkle_root}</dd>

          <dt>Produced by</dt>
          <dd className="num">Helix {b.node_version}</dd>

          <dt>Base fee</dt>
          <dd className="num">{b.base_fee_per_byte} per byte</dd>

          <dt>Transactions</dt>
          <dd className="num">{b.tx_count}</dd>
        </dl>
      </div>

      <p className="eyebrow">Transactions in this block</p>
      <div className="panel">
        {b.transactions.length === 0 ? (
          <div className="empty">
            This block is empty. Helix produces a block on a fixed interval whether or not there
            is anything to carry.
          </div>
        ) : (
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Hash</th>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th className="r">Amount</th>
                  <th className="r">Fee</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {b.transactions.map((t) => (
                  <tr key={t.hash}>
                    <td>
                      <TxLink h={t.hash} />
                    </td>
                    <td>{txTypeLabel(t.tx_type)}</td>
                    <td>
                      <Addr a={t.from} />
                    </td>
                    <td>
                      <Addr a={t.to} />
                    </td>
                    <td className="r num">{hlx(t.amount_hlx)}</td>
                    <td className="r num dim">{hlx(t.fee_hlx)}</td>
                    <td>
                      <TxStatus status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pager">
          {b.height > 0 && (
            <Link to={`/block/${b.height - 1}`}>
              <button type="button">‹ Older block</button>
            </Link>
          )}
          <Link to={`/block/${b.height + 1}`}>
            <button type="button">Newer block ›</button>
          </Link>
        </div>
      </div>
    </>
  );
}
