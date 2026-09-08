import { useState } from "react";
import { DEFAULT_RPC, getRpcBase, setRpcBase, SUGGESTED_RPC } from "../config";
import { clearRpcCache } from "../rpc";

/**
 * Which node the board is reading from.
 *
 * Lives in the bottom strip rather than the top bar on purpose: for almost everyone the default
 * is right and the control is clutter, while the person who needs it — somebody running their
 * own node — knows to look for it. Changing the endpoint drops the block cache, because a
 * cached block from one chain must never be shown as another chain's.
 */
export function EndpointPicker() {
  const [value, setValue] = useState(getRpcBase());
  const [custom, setCustom] = useState(!SUGGESTED_RPC.some((s) => s.url === getRpcBase()));

  function apply(url: string) {
    setRpcBase(url);
    clearRpcCache();
    // A full reload is the honest way to swap chains: every panel holds data from the old
    // endpoint, and reconciling that in place is a lot of machinery for a rare action.
    window.location.reload();
  }

  return (
    <span className="endpoint">
      <b>Reading</b>
      {custom ? (
        <>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-label="Node RPC endpoint"
            spellCheck={false}
            placeholder="http://127.0.0.1:8545"
          />
          <button className="bbtn" type="button" onClick={() => apply(value)}>
            Use
          </button>
          <button
            className="bbtn"
            type="button"
            onClick={() => {
              setCustom(false);
              apply(DEFAULT_RPC);
            }}
          >
            Reset
          </button>
        </>
      ) : (
        <select
          value={value}
          onChange={(e) => {
            if (e.target.value === "__custom") {
              setCustom(true);
              return;
            }
            setValue(e.target.value);
            apply(e.target.value);
          }}
          aria-label="Node RPC endpoint"
        >
          {SUGGESTED_RPC.map((s) => (
            <option key={s.url} value={s.url}>
              {s.label}
            </option>
          ))}
          <option value="__custom">Another node…</option>
        </select>
      )}
    </span>
  );
}
