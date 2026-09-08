import { useEffect, useRef } from "react";

/**
 * Whether a keystroke belongs to whatever the reader is typing into.
 *
 * Every shortcut here is a bare letter, which is only safe because of this check: without it,
 * typing an address into the search field would fire `j`, `k` and `/` as commands and scroll the
 * block list out from under it.
 */
function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    el.isContentEditable
  );
}

export interface BoardKeyHandlers {
  /** Move the cursor down the block list (j / ArrowDown). */
  onDown: () => void;
  /** Move the cursor up the block list (k / ArrowUp). */
  onUp: () => void;
  /** Open whatever the cursor is on. */
  onOpen: () => void;
  /** Page the block list (n / p). */
  onOlder: () => void;
  onNewer: () => void;
  /** Put the caret in the search field. */
  onSearch: () => void;
  /** Clear the inspector, the cursor and any singled-out validator. */
  onClear: () => void;
  /** Open or close the command palette. */
  onPalette: () => void;
}

/**
 * The board's keyboard layer.
 *
 * An explorer is a tool people keep open, and a tool that can only be driven by pointing is one
 * they drive slowly. This is also the accessible path: the tables carry real links, so Tab and
 * Enter already work — these shortcuts are the faster route over the same ground, not the only
 * one.
 *
 * Deliberately flat, with no modal states beyond the palette. A shortcut layer that needs to be
 * memorised as sequences is one nobody uses; `?` lists everything in the palette.
 */
export function useBoardKeys(handlers: BoardKeyHandlers, enabled = true) {
  // Held in a ref so the listener is attached once rather than torn down and rebuilt on every
  // render — the handlers close over board state and are a new object each time.
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const h = ref.current;

      // The palette's own opener has to work from inside its input, so it is checked first and
      // outside the typing guard.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        h.onPalette();
        return;
      }

      if (e.key === "Escape") {
        // Escape while typing means "abandon what I typed"; the field handles that itself and
        // stealing it would make the search feel broken.
        if (isTyping(e.target)) return;
        h.onClear();
        return;
      }

      if (!enabled || isTyping(e.target)) return;
      // Leave the browser's own modified shortcuts alone.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          h.onDown();
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          h.onUp();
          break;
        case "Enter":
          h.onOpen();
          break;
        case "n":
          h.onOlder();
          break;
        case "p":
          h.onNewer();
          break;
        case "/":
          e.preventDefault();
          h.onSearch();
          break;
        case "?":
          e.preventDefault();
          h.onPalette();
          break;
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
