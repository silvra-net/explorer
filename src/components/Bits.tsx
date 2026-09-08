import { Link } from "react-router-dom";
import { shortAddr, shortHash } from "../format";

/** An address, shortened, linking to its page. Never renders a bare truncated string. */
export function Addr({ a, full = false }: { a: string | null | undefined; full?: boolean }) {
  if (!a) return <span className="dim">—</span>;
  return (
    <Link className="mono" to={`/address/${a}`} title={a}>
      {full ? a : shortAddr(a)}
    </Link>
  );
}

export function TxLink({ h, full = false }: { h: string; full?: boolean }) {
  return (
    <Link className="mono" to={`/tx/${h}`} title={h}>
      {full ? h : shortHash(h)}
    </Link>
  );
}

export function BlockLink({ height, children }: { height: number; children?: React.ReactNode }) {
  return (
    <Link className="num" to={`/block/${height}`}>
      {children ?? height.toLocaleString()}
    </Link>
  );
}

/**
 * A transaction's outcome.
 *
 * "applied" is the node's word for success and it is kept, rather than translated to
 * "confirmed" or "success" — the CLI, the logs and the API all say applied, and an explorer
 * that invents a fourth word for the same state makes those three harder to search.
 */
export function TxStatus({ status }: { status: string }) {
  const cls = status === "applied" ? "ok" : status === "pending" ? "warn" : "bad";
  return <span className={`badge ${cls}`}>{status}</span>;
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div className="panel-body" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ marginBottom: 9, width: `${100 - i * 12}%` }}
        />
      ))}
      <span className="dim" style={{ fontSize: 12 }}>
        Loading…
      </span>
    </div>
  );
}

/**
 * A failure the reader can act on.
 *
 * Errors here name the endpoint, because the most common cause by far is that the reader
 * pointed the explorer at a node that is not running. "Failed to fetch" alone sends people
 * looking for a bug in the chain.
 */
export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="notice bad" role="alert">
      <strong>Cannot read the chain.</strong> {message}
      {onRetry && (
        <>
          {" "}
          <button
            className="icon-btn"
            style={{ marginLeft: 6 }}
            onClick={onRetry}
            type="button"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}
