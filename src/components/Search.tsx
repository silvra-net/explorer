import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { rpc, RpcError } from "../rpc";
import { classifyQuery } from "../search";

/**
 * One field for everything the chain can be asked about.
 *
 * The shapes are unambiguous except in one case, and that case is handled by asking rather
 * than guessing: 64 hex characters is either a transaction hash or a block hash, and nothing
 * in the string says which. The field tries the transaction first (far more common as a thing
 * someone pastes) and falls back to the block. A 404 on the first attempt is an answer, not a
 * failure — anything else is reported instead of quietly retried, so a broken endpoint never
 * looks like "no results".
 */
export function Search({
  autoFocus = false,
  compact = false,
  inputRef,
}: {
  autoFocus?: boolean;
  /** Sits in the board's top bar rather than owning a block of the page. */
  compact?: boolean;
  /** Lets the board's `/` shortcut put the caret here. */
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const navigate = useNavigate();

  async function resolve(raw: string) {
    const query = classifyQuery(raw);
    if (query.kind === "empty") return;
    setNote(null);
    setBusy(true);
    try {
      switch (query.kind) {
        case "height":
          navigate(`/block/${query.height}`);
          return;

        case "address":
          navigate(`/address/${query.address}`);
          return;

        case "hash": {
          try {
            await rpc.tx(query.hash);
            navigate(`/tx/${query.hash}`);
            return;
          } catch (e) {
            if (!(e instanceof RpcError && e.notFound)) throw e;
          }
          try {
            const block = await rpc.blockByHash(query.hash);
            navigate(`/block/${block.height}`);
            return;
          } catch (e) {
            if (!(e instanceof RpcError && e.notFound)) throw e;
          }
          setNote("No transaction or block with that hash.");
          return;
        }

        case "name": {
          // An unregistered name is a 404 here, which is an answer, not a failure — it must
          // read as "no such name", never as a broken endpoint.
          try {
            const res = await rpc.resolveName(query.name);
            if (res.address) {
              navigate(`/address/${res.address}`);
              return;
            }
          } catch (e) {
            if (!(e instanceof RpcError && e.notFound)) throw e;
          }
          setNote("Not a height, address, hash, or registered name.");
        }
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "search-wrap compact" : "search-wrap"}>
      <form
        className="search"
        onSubmit={(e) => {
          e.preventDefault();
          void resolve(q);
        }}
        role="search"
      >
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={
            compact
              ? "Height, address, hash, or a name"
              : "Block height, address, transaction or block hash, or a name"
          }
          aria-label="Search the chain"
          autoFocus={autoFocus}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <button type="submit" disabled={busy}>
          {busy ? "Looking…" : "Look up"}
        </button>
      </form>
      {note && <p className="search-note">{note}</p>}
    </div>
  );
}
