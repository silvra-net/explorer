import { useParams } from "react-router-dom";
import { fullTime, hlx, num, timeAgo, txTypeLabel } from "../format";
import { rpc } from "../rpc";
import { useAsync } from "../useAsync";
import { Addr, BlockLink, ErrorBox, Loading, TxStatus } from "../components/Bits";

export default function TxDetail() {
  const { hash = "" } = useParams();
  const wellFormed = /^[0-9a-fA-F]{64}$/.test(hash);

  const tx = useAsync(
    () => (wellFormed ? rpc.tx(hash.toLowerCase()) : Promise.reject(new Error("bad hash"))),
    [hash, wellFormed],
  );

  if (!wellFormed) {
    return (
      <>
        <p className="eyebrow">Transaction</p>
        <div className="notice bad">
          “{hash}” is not a transaction hash. A Helix transaction hash is 64 hex characters.
        </div>
      </>
    );
  }

  if (tx.notFound) {
    return (
      <>
        <p className="eyebrow">Transaction</p>
        <div className="notice">
          <strong>This node has never seen that transaction.</strong> It may not have been
          broadcast yet, or it expired in the mempool before a validator included it.
          <div className="mono dim" style={{ marginTop: 8, overflowWrap: "anywhere" }}>
            {hash}
          </div>
        </div>
      </>
    );
  }

  if (tx.error && !tx.data) {
    return (
      <>
        <p className="eyebrow">Transaction</p>
        <ErrorBox message={tx.error} onRetry={tx.reload} />
      </>
    );
  }

  if (!tx.data) {
    return (
      <>
        <p className="eyebrow">Transaction</p>
        <div className="panel">
          <Loading rows={5} />
        </div>
      </>
    );
  }

  const t = tx.data;
  const pending = t.block_height === null;

  return (
    <>
      <p className="eyebrow">Transaction</p>
      <div className="panel">
        <div className="panel-head">
          <h2>{txTypeLabel(t.tx_type)}</h2>
          <span className="hint">
            <TxStatus status={t.status} />
          </span>
        </div>
        <dl className="kv">
          <dt>Hash</dt>
          <dd className="mono">{t.hash}</dd>

          {t.error && (
            <>
              <dt>Why it failed</dt>
              <dd className="mono" style={{ color: "var(--bad)" }}>
                {t.error}
              </dd>
            </>
          )}

          <dt>From</dt>
          <dd>
            <Addr a={t.from} full />
          </dd>

          <dt>To</dt>
          <dd>
            <Addr a={t.to} full />
          </dd>

          <dt>Amount</dt>
          <dd className="num">{hlx(t.amount_hlx)} HLX</dd>

          <dt>Fee</dt>
          <dd className="num">
            {hlx(t.fee_hlx)} HLX
            {t.fee_burned_hlx !== undefined && t.fee_to_validator_hlx !== undefined && (
              <div className="dim" style={{ fontSize: 12.5, marginTop: 3 }}>
                {hlx(t.fee_burned_hlx)} burned · {hlx(t.fee_to_validator_hlx)} to the proposer
              </div>
            )}
          </dd>

          <dt>Nonce</dt>
          <dd className="num">{t.nonce}</dd>

          <dt>Block</dt>
          <dd>
            {pending ? (
              <span className="dim">Not in a block yet — waiting in the mempool.</span>
            ) : (
              <BlockLink height={t.block_height!}>{num(t.block_height!)}</BlockLink>
            )}
          </dd>

          {!pending && t.block_hash && (
            <>
              <dt>Block hash</dt>
              <dd className="mono dim">{t.block_hash}</dd>
            </>
          )}

          <dt>When</dt>
          <dd>
            {t.timestamp ? (
              <>
                {timeAgo(t.timestamp)} <span className="dim">· {fullTime(t.timestamp)}</span>
              </>
            ) : (
              <span className="dim">—</span>
            )}
          </dd>
        </dl>
      </div>
    </>
  );
}
