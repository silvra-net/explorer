import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { classifyQuery } from "../search";
import { shortAddr } from "../format";
import { rpc, RpcError } from "../rpc";
import type { Validator } from "../types";

export interface Command {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void;
}

/**
 * One field for everything the board can be asked to do.
 *
 * The search box answers "show me this thing"; this answers that *and* "do this" — single out a
 * validator, clear the pane, switch theme — from the same keystroke. On a screen with no menus
 * and no nav bar, it is also where the keyboard layer becomes discoverable: the shortcuts are
 * listed in it rather than hidden in a page nobody opens.
 *
 * What it deliberately does not do is guess. A query that looks like a height, an address or a
 * hash is routed the way the search field routes it — through the same `classifyQuery`, so the
 * two cannot disagree about what a string is.
 */
export function CommandPalette({
  open,
  onClose,
  validators,
  onFocusValidator,
  focused,
  onClear,
  onCycleTheme,
}: {
  open: boolean;
  onClose: () => void;
  validators: Validator[];
  onFocusValidator: (address: string | null) => void;
  focused: string | null;
  onClear: () => void;
  onCycleTheme: () => void;
}) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setQ("");
    setActive(0);
    setNote(null);
    // Focused on the next frame: the element is only in the document once this render commits.
    const id = requestAnimationFrame(() => input.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [];

    for (const v of validators) {
      list.push({
        id: `focus-${v.address}`,
        label: `Single out ${shortAddr(v.address)}`,
        hint: focused === v.address ? "currently singled out" : "validator",
        group: "Validators",
        run: () => onFocusValidator(focused === v.address ? null : v.address),
      });
      list.push({
        id: `open-${v.address}`,
        label: `Open account ${shortAddr(v.address)}`,
        hint: "validator",
        group: "Validators",
        run: () => navigate(`/address/${v.address}`),
      });
    }

    list.push(
      {
        id: "clear",
        label: "Clear the inspector and any selection",
        hint: "Esc",
        group: "Board",
        run: onClear,
      },
      {
        id: "theme",
        label: "Switch theme",
        hint: "system → light → dark",
        group: "Board",
        run: onCycleTheme,
      },
      {
        id: "node",
        label: "Open this node's own status page",
        hint: "node.silvra.net",
        group: "Board",
        run: () => window.open("https://node.silvra.net", "_blank", "noopener"),
      },
    );

    const keys: [string, string][] = [
      ["j / ↓", "Move down the block list"],
      ["k / ↑", "Move up the block list"],
      ["Enter", "Open what the cursor is on"],
      ["n / p", "Older / newer page of blocks"],
      ["/", "Jump to the search field"],
      ["Esc", "Clear the inspector and selection"],
      ["⌘K / Ctrl K", "Open this palette"],
    ];
    for (const [key, what] of keys) {
      list.push({
        id: `key-${key}`,
        label: what,
        hint: key,
        group: "Keyboard",
        run: onClose,
      });
    }

    return list;
  }, [validators, focused, onFocusValidator, onClear, onCycleTheme, navigate, onClose]);

  const query = classifyQuery(q);
  const term = q.trim().toLowerCase();
  const matches = term
    ? commands.filter((c) => `${c.label} ${c.hint ?? ""}`.toLowerCase().includes(term))
    : commands;

  // A height, address or hash is a destination rather than a command, and it goes first because
  // somebody who pasted one is not browsing a menu.
  const jump =
    query.kind === "height"
      ? { label: `Go to block ${query.height.toLocaleString()}`, kind: "height" as const }
      : query.kind === "address"
        ? { label: `Go to account ${shortAddr(query.address)}`, kind: "address" as const }
        : query.kind === "hash"
          ? { label: "Look up this hash", kind: "hash" as const }
          : null;

  const rows: { key: string; label: string; hint?: string; group: string; run: () => void }[] = [];
  if (jump) {
    rows.push({ key: "jump", label: jump.label, hint: "Enter", group: "Go to", run: doJump });
  }
  for (const c of matches) {
    rows.push({ key: c.id, label: c.label, hint: c.hint, group: c.group, run: c.run });
  }

  async function doJump() {
    if (query.kind === "height") {
      navigate(`/block/${query.height}`);
      onClose();
      return;
    }
    if (query.kind === "address") {
      navigate(`/address/${query.address}`);
      onClose();
      return;
    }
    if (query.kind !== "hash") return;

    // Same order the search field uses: a transaction is far more often what somebody pasted,
    // and a 404 on the first attempt is an answer rather than a failure.
    setBusy(true);
    setNote(null);
    try {
      try {
        await rpc.tx(query.hash);
        navigate(`/tx/${query.hash}`);
        onClose();
        return;
      } catch (e) {
        if (!(e instanceof RpcError && e.notFound)) throw e;
      }
      const block = await rpc.blockByHash(query.hash);
      navigate(`/block/${block.height}`);
      onClose();
    } catch (e) {
      if (e instanceof RpcError && e.notFound) setNote("No transaction or block with that hash.");
      else setNote(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const clamped = Math.min(active, Math.max(0, rows.length - 1));

  return (
    <div
      className="palette-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <input
          ref={input}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          placeholder="Search the chain, or type a command"
          aria-label="Search the chain, or type a command"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              onClose();
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, rows.length - 1));
              return;
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
              return;
            }
            if (e.key === "Enter") {
              e.preventDefault();
              rows[clamped]?.run();
            }
          }}
        />

        {note && <p className="palette-note">{note}</p>}
        {busy && <p className="palette-note dim">Asking the node…</p>}

        <div className="palette-list" role="listbox">
          {rows.length === 0 && <p className="palette-empty">Nothing matches “{q}”.</p>}
          {rows.map((r, i) => {
            const first = i === 0 || rows[i - 1].group !== r.group;
            return (
              <div key={r.key}>
                {first && <p className="palette-group">{r.group}</p>}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === clamped}
                  className={`palette-row${i === clamped ? " on" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => r.run()}
                >
                  <span>{r.label}</span>
                  {r.hint && <span className="palette-hint">{r.hint}</span>}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
