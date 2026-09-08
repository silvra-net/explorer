import { useState } from "react";
import { useParams } from "react-router-dom";
import { hlx, num, timeAgo, txTypeLabel } from "../format";
import { rpc } from "../rpc";
import { useAsync } from "../useAsync";
import { Addr, BlockLink, ErrorBox, Loading, TxLink, TxStatus } from "../components/Bits";

const PAGE = 25;

export default function AddressDetail() {
  const { address = "" } = useParams();
  const [page, setPage] = useState(0);

  const account = useAsync(() => rpc.account(address), [address]);
  const name = useAsync(
    () => rpc.accountName(address).catch(() => ({ name: null })),
    [address],
  );

  // One more than a page, so "is there another page?" is answered by the data rather than by a
  // count the API does not provide.
  const history = useAsync(
    () => rpc.accountTransactions(address, PAGE + 1, page * PAGE),
    [address, page],
  );

  if (account.notFound) {
    return (
      <>
        <p className="eyebrow">Account</p>
        <div className="notice">
          <strong>This address has never appeared on the chain.</strong> That is not an error —
          an address exists as soon as someone generates it, and only shows up here once it
          sends or receives something.
          <div className="mono dim" style={{ marginTop: 8, overflowWrap: "anywhere" }}>
            {address}
          </div>
        </div>
      </>
    );
  }

  if (account.error && !account.data) {
    return (
      <>
        <p className="eyebrow">Account</p>
        <ErrorBox message={account.error} onRetry={account.reload} />
      </>
    );
  }

  const rows = history.data?.transactions ?? [];
  const shown = rows.slice(0, PAGE);
  const hasMore = rows.length > PAGE;
  const a = account.data;

  return (
    <>
      <p className="eyebrow">Account</p>
      <div className="panel">
        <div className="panel-head">
          <h2 className="mono" style={{ overflowWrap: "anywhere", fontSize: 14 }}>
            {address}
          </h2>
          {name.data?.name && <span className="badge accent">{name.data.name}</span>}
        </div>
        {!a ? (
          <Loading rows={4} />
        ) : (
          <dl className="kv">
            <dt>Balance</dt>
            <dd className="num" style={{ fontSize: 17, fontWeight: 600 }}>
              {hlx(a.balance_hlx)} HLX
            </dd>

            <dt>Staked</dt>
            <dd className="num">
              {hlx(a.staked_hlx)} HLX
              {a.staked_hlx > 0 && (
                <span className="badge accent" style={{ marginLeft: 8 }}>
                  validator
                </span>
              )}
            </dd>

            {a.unbonding_stake_hlx > 0 && (
              <>
                <dt>Unbonding</dt>
                <dd className="num">
                  {hlx(a.unbonding_stake_hlx)} HLX{" "}
                  <span className="dim">
                    until height {num(a.unbonding_unlock_height)}
                  </span>
                </dd>
              </>
            )}

            <dt>Transactions sent</dt>
            <dd className="num">
              {num(a.nonce)} <span className="dim">(next nonce {num(a.nonce)})</span>
            </dd>

            {a.jailed_until !== null && (
              <>
                <dt>Jailed</dt>
                <dd>
                  <span className="badge bad">until height {num(a.jailed_until)}</span>
                </dd>
              </>
            )}

            {a.has_code && (
              <>
                <dt>Contract</dt>
                <dd>
                  <span className="badge">this account holds contract code</span>
                </dd>
              </>
            )}
          </dl>
        )}
      </div>

      <p className="eyebrow">History</p>
      <div className="panel">
        {history.loading && shown.length === 0 ? (
          <Loading rows={4} />
        ) : shown.length === 0 ? (
          <div className="empty">
            {page === 0
              ? "No transactions have touched this address."
              : "No more transactions."}
          </div>
        ) : (
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Hash</th>
                  <th>Type</th>
                  <th>Age</th>
                  <th>Block</th>
                  <th>Counterparty</th>
                  <th className="r">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((t) => {
                  const outgoing = t.from === address;
                  return (
                    <tr key={t.hash}>
                      <td>
                        <TxLink h={t.hash} />
                      </td>
                      <td>{txTypeLabel(t.tx_type)}</td>
                      <td className="dim">{timeAgo(t.timestamp)}</td>
                      <td>
                        <BlockLink height={t.block_height} />
                      </td>
                      <td>
                        <span className="dim" style={{ fontSize: 12, marginRight: 5 }}>
                          {outgoing ? "to" : "from"}
                        </span>
                        <Addr a={outgoing ? t.to : t.from} />
                      </td>
                      <td className="r num" style={{ color: outgoing ? undefined : "var(--ok)" }}>
                        {outgoing ? "−" : "+"}
                        {hlx(t.amount_hlx)}
                      </td>
                      <td>
                        <TxStatus status={t.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="pager">
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ‹ Newer
          </button>
          <button type="button" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
            Older ›
          </button>
          <span className="where">page {page + 1}</span>
        </div>
      </div>

      {history.error && (
        <div style={{ marginTop: 12 }}>
          <ErrorBox message={history.error} onRetry={history.reload} />
        </div>
      )}
    </>
  );
}
