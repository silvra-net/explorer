import { Route, Routes, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import BlockDetail from "../views/BlockDetail";
import TxDetail from "../views/TxDetail";
import AddressDetail from "../views/AddressDetail";
import NotFound from "../views/NotFound";
import { InspectorIdle } from "./InspectorIdle";
import type { BlockSummary } from "../types";

/**
 * The detail pane.
 *
 * The board answers "is the chain healthy" at a glance; this answers "what exactly is that"
 * without leaving the board to do it. Clicking a block used to mean navigating away from the
 * validator set, the rhythm and the feed, and navigating back meant fetching all of it again.
 *
 * The URL still changes — `/block/109600` is still a link somebody can send, and opening one
 * loads the board with that block already in the pane. The routing did not go away, it stopped
 * deciding what the *page* is and started deciding what this one cell shows.
 */
export function Inspector({ blocks }: { blocks: BlockSummary[] }) {
  const navigate = useNavigate();

  // Escape clears the pane, matching the node's status board. On a screen where nothing else
  // navigates, a way out that does not involve the browser's back button is worth the listener.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      const el = document.activeElement;
      // Not while somebody is typing in the search field — there Escape means "abandon what I
      // typed", and stealing it would make the field feel broken.
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      navigate("/");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  return (
    <div className="inspector">
      <Routes>
        <Route path="/" element={<InspectorIdle blocks={blocks} />} />
        <Route path="/blocks" element={<InspectorIdle blocks={blocks} />} />
        <Route path="/validators" element={<InspectorIdle blocks={blocks} />} />
        <Route path="/block/:height" element={<BlockDetail />} />
        <Route path="/tx/:hash" element={<TxDetail />} />
        <Route path="/address/:address" element={<AddressDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
