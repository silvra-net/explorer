import { useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { gapSeconds, num, shortAddr, timeAgo } from "../format";
import { rpc } from "../rpc";
import { useAsync } from "../useAsync";
import { useHeaders } from "../useHeaders";
import { useFreezeOnHover } from "../useFreezeOnHover";
import { CoSignStrip } from "../components/CoSignStrip";
import type { BlockHeader, BlockSummary } from "../types";

const PAGE = 40;

/**
 * The chain, newest first, inside a panel that scrolls rather than a page that does.
 *
 * This replaces the separate blocks page rather than summarising it: the history is still
 * walkable, it just happens in the cell instead of by navigating away from everything else.
 * That is the whole trade a board makes — you give up the long page and get to keep the
 * validator set and the rhythm on screen while you read.
 *
 * Paging back pins a height so the list stops moving under the reader. Following the tip is the
 * default, because it is what somebody who just opened the page wants.
 */
export function BlockStream({
  live,
  liveHeaders,
  validators,
  tipHeight,
  focused,
  hoverHeight,
  onHoverHeight,
  cursor,
  onRowsChange,
  pinned,
  onLive,
  onOlder,
  onNewer,
}: {
  /**
   * Height the list is pinned to, or null while following the tip.
   *
   * Board state rather than this component's, and the paging moves with it: the keyboard's
   * `n`/`p` drive the same three functions these buttons do, so there is one definition of what
   * "older" means rather than two that can drift.
   */
  pinned: number | null;
  onLive: () => void;
  onOlder: () => void;
  onNewer: () => void;
  /** Validator whose turns are being singled out, or null. */
  focused: string | null;
  /** Block the pointer is on anywhere on the board — the rhythm chart shares it. */
  hoverHeight: number | null;
  onHoverHeight: (height: number | null) => void;
  /** Block under the keyboard cursor, moved with j/k. */
  cursor: number | null;
  /** Reports the heights currently listed, so j/k knows what it is walking. */
  onRowsChange: (heights: number[]) => void;
  /** The live window, already held by the board. Used while following the tip. */
  live: BlockSummary[];
  /**
   * Certificates for the live window, fetched once by the board.
   *
   * Passed in rather than fetched here because the validator panel needs exactly the same
   * headers: two `useHeaders` over one set of heights would race on first paint, before either
   * has populated the RPC cache, and fire every request twice into a rate limiter that allows a
   * burst of thirty.
   */
  liveHeaders: Map<number, BlockHeader>;
  validators: string[];
  tipHeight: number | null;
}) {
  const navigate = useNavigate();

  // Read off the path rather than with `useParams`, which only fills in for the component that
  // a <Route> rendered. This table lives in the board's frame, outside the inspector's routes,
  // so there it would always hand back an empty object and no row would ever look selected.
  const openHeight = useLocation().pathname.match(/^\/block\/(\d+)$/)?.[1];

  // Only fetched while paged back — following the tip costs nothing extra, because the board
  // already holds that window for the rhythm chart.
  const paged = useAsync(
    () =>
      pinned === null
        ? Promise.resolve([])
        : rpc.blockRange(Math.max(0, pinned - PAGE + 1), Math.min(PAGE, pinned + 1)),
    [pinned],
  );

  // Held still while the pointer is on the table, so the row that gets clicked is the row that
  // was aimed at. Only matters while following the tip; a pinned page does not move anyway.
  const { value: liveHeld, frozen, handlers } = useFreezeOnHover(live);

  const blocks =
    pinned === null ? liveHeld : [...(paged.data ?? [])].sort((a, b) => b.height - a.height);

  // Only the paged-back window needs its own certificates; while following the tip the board
  // has already fetched them.
  const pagedHeaders = useHeaders(pinned === null ? [] : blocks.map((b) => b.height));
  const headers = pinned === null ? liveHeaders : pagedHeaders;

  const atTip = pinned === null;
  const atGenesis = blocks.length > 0 && blocks[blocks.length - 1].height === 0;

  // The keyboard cursor lives on the board, but only this table knows what is listed and in
  // which order — including while paged back into history, where the board's live window is not
  // what is on screen.
  const listed = blocks.map((b) => b.height).join(",");
  useEffect(() => {
    onRowsChange(listed === "" ? [] : listed.split(",").map(Number));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listed]);

  // Keep the keyboard cursor on screen. "nearest" rather than "center" so walking down the list
  // scrolls a row at a time instead of jumping the panel around under every keystroke.
  const cursorRow = useRef<HTMLTableRowElement>(null);
  useEffect(() => {
    cursorRow.current?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  return (
    <>
      <div className="stream-bar">
        <button
          type="button"
          className="bbtn"
          disabled={atTip}
          onClick={onLive}
          title="Follow the chain tip"
        >
          ⇤ Live
        </button>
        <button type="button" className="bbtn" disabled={atTip} onClick={onNewer} title="p">
          ‹ Newer
        </button>
        <button
          type="button"
          className="bbtn"
          disabled={atGenesis || (pinned === null && tipHeight === null)}
          onClick={onOlder}
          title="n"
        >
          Older ›
        </button>
        <span className="stream-where num">
          {blocks.length > 0 &&
            `${num(blocks[blocks.length - 1].height)} – ${num(blocks[0].height)}`}
        </span>
      </div>

      <div
        className="tbl-wrap"
        {...handlers}
        onMouseLeave={() => {
          handlers.onMouseLeave();
          onHoverHeight(null);
        }}
      >
        {frozen && pinned === null && <div className="frozen-tag">held while you read</div>}
        <table className="dense">
          <thead>
            <tr>
              {/* `opt` columns are dropped on a narrow screen. What survives is what the panel
                  is for: which block, how old, who agreed. The gap is already drawn above as the
                  rhythm chart, and a proposer address truncated to ten characters on a phone was
                  never the reason anybody opened this. */}
              <th>Height</th>
              <th>Age</th>
              <th className="r opt">Gap</th>
              <th className="opt">Proposer</th>
              <th>Co-signed</th>
              <th className="r">Txs</th>
            </tr>
          </thead>
          <tbody>
            {blocks.map((b, i) => {
              const prev = blocks[i + 1];
              const header = headers.get(b.height);
              const classes = [];
              if (String(b.height) === openHeight) classes.push("pick");
              if (b.height === cursor) classes.push("cursor");
              if (b.height === hoverHeight) classes.push("linked");
              // Singling out one validator turns this list into "show me their turns". The
              // others stay legible rather than disappearing — the question is which blocks are
              // theirs, not what the chain would look like without everybody else.
              if (focused && b.validator !== focused) classes.push("faded");
              return (
                <tr
                  key={b.hash}
                  ref={b.height === cursor ? cursorRow : undefined}
                  className={classes.join(" ") || undefined}
                  onMouseEnter={() => onHoverHeight(b.height)}
                  onClick={(e) => {
                    // The height cell is a real link, and letting it navigate on its own keeps
                    // this row working for a keyboard and a middle click. Only bare clicks on
                    // the rest of the row need handling here.
                    if ((e.target as HTMLElement).closest("a")) return;
                    navigate(`/block/${b.height}`);
                  }}
                >
                  <td className="num strong">
                    <Link to={`/block/${b.height}`}>{num(b.height)}</Link>
                  </td>
                  <td className="dim">{timeAgo(b.timestamp)}</td>
                  <td className="r num dim opt">
                    {prev ? gapSeconds(b.timestamp, prev.timestamp) : "—"}
                  </td>
                  <td className="mono dim opt">{shortAddr(b.validator)}</td>
                  <td>
                    <CoSignStrip
                      validators={validators}
                      signers={header ? header.last_commit : null}
                      proposer={b.validator}
                      focused={focused}
                    />
                  </td>
                  <td className="r num">{b.tx_count}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {blocks.length === 0 && <p className="dim small pad-sm">No blocks in this range.</p>}
      </div>
    </>
  );
}
