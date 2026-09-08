import { useCallback, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { num, shortHash } from "../format";
import { rpc } from "../rpc";
import { expectedGap, gaps } from "../rhythm";
import { absentCount, attendance, proposerVersions, versionSpread } from "../attendance";
import { faultTolerance, faultToleranceLabel } from "../quorum";
import { verdict } from "../verdict";
import { useAsync } from "../useAsync";
import { useBlockWindow } from "../useBlockWindow";
import { useChainStatus } from "../useChainStatus";
import { useHeaders } from "../useHeaders";
import { Rhythm } from "../components/Rhythm";
import { Search } from "../components/Search";
import { LiveDot } from "../components/LiveDot";
import { EndpointPicker } from "../components/EndpointPicker";
import { ThemeToggle, useThemePref } from "../components/ThemeToggle";
import { CommandPalette } from "./CommandPalette";
import { useBoardKeys } from "./useBoardKeys";
import { Cell } from "./Cell";
import { ChainState } from "./ChainState";
import { Telemetry } from "./Telemetry";
import { ValidatorSet } from "./ValidatorSet";
import { BlockStream } from "./BlockStream";
import { TxFeed } from "./TxFeed";
import { Inspector } from "./Inspector";
import { Clock } from "./Clock";
import { StatusRail, count, secs } from "./StatusRail";
import type { Vital } from "./StatusRail";

/**
 * How many blocks the board holds.
 *
 * Every one of them costs a `/blocks/height/:n/header` request for its commit certificate, and
 * those are what the co-signature strip and the attendance panel are made of. Forty is wide
 * enough that a validator dropping out for a few rounds is visible as a run, and small enough
 * that a cold load stays inside the node's burst allowance.
 */
const WINDOW = 40;

/** Blocks per page when walking back through history. Matches `BlockStream`'s own step. */
const PAGE = 40;

export function Board() {
  const { status, tip, height, error, advances } = useChainStatus();
  const vals = useAsync(() => rpc.validators(), [], 30000);
  const navigate = useNavigate();
  const theme = useThemePref();

  /*
    Selection, shared across the whole board.

    This is the state that turns seven panels into one instrument. `focused` singles a validator
    out — their turns in the block list, their cell in every co-signature strip. `hoverHeight` is
    one block, pointed at from either the list or the rhythm chart, and highlighted in both.
    `cursor` is the same idea for the keyboard.
  */
  const [focused, setFocused] = useState<string | null>(null);
  const [hoverHeight, setHoverHeight] = useState<number | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [rows, setRows] = useState<number[]>([]);
  const [pinned, setPinned] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);

  const window_ = useBlockWindow(height, WINDOW);
  const blocks = window_.blocks;
  const heights = blocks.map((b) => b.height);
  const headers = useHeaders(heights);

  // Immutable and therefore fetched exactly once for the life of the page, cache or no cache.
  const genesis = useAsync(() => rpc.blockByHeight(0), []);

  const intervals = gaps(blocks).map((g) => g.seconds);
  const expected = expectedGap(intervals);

  const validators = vals.data?.validators ?? [];
  const addresses = validators.map((v) => v.address);
  const attendanceRows = attendance(addresses, heights, headers);
  const attendanceByAddress = new Map(attendanceRows.map((r) => [r.address, r]));
  const versions = proposerVersions(blocks);
  const spread = versionSpread(versions);

  const totalPower = vals.data?.total_voting_power;
  const quorum = vals.data?.quorum_threshold;
  const spare =
    totalPower !== undefined && quorum !== undefined
      ? faultTolerance(
          validators.map((v) => v.voting_power ?? 0),
          totalPower,
          quorum,
        )
      : null;

  const sinceTip = tip ? Math.max(0, (Date.now() - tip.timestamp) / 1000) : null;
  const jailed = validators.filter((v) => v.jailed_until !== null).length;

  const state = verdict({
    unreachable: error !== null,
    syncing: status?.is_syncing ?? false,
    sinceTip,
    expected,
    absent: absentCount(attendanceRows),
    jailed,
    spare,
  });

  const txInWindow = blocks.reduce((n, b) => n + b.tx_count, 0);
  const absent = absentCount(attendanceRows);
  const active = validators.filter((v) => v.jailed_until === null).length;

  /*
    The vitals rail.

    Chosen by one question: which numbers change what an operator does in the next minute? Tip
    age against the expected gap says whether the chain is moving; tolerance says whether it
    survives losing one more validator; a version spread says the set is mid-upgrade. Supply and
    fees are not here — they are true, they are on the board, and nobody acts on them.
  */
  const vitals: Vital[] = [
    { label: "Height", value: count(height), title: "Tip height this node has applied" },
    {
      label: "Last block",
      value: secs(sinceTip),
      unit: "s",
      // Two expected gaps without a block is the point where a stall stops being jitter.
      tone: sinceTip !== null && expected !== null && sinceTip > expected * 2 ? "warn" : undefined,
      title: expected !== null ? `Expected about ${expected.toFixed(1)}s between blocks` : undefined,
    },
    {
      label: "Gap",
      value: expected !== null ? expected.toFixed(1) : "—",
      unit: "s",
      title: "Median interval across the window on screen",
    },
    {
      label: "Validators",
      value: vals.data ? `${active}/${validators.length}` : "—",
      tone: jailed > 0 ? "bad" : undefined,
      title: jailed > 0 ? `${jailed} jailed` : "All validators are in the set",
    },
    {
      label: "Silent",
      value: attendanceRows.length ? String(absent) : "—",
      tone: absent > 0 ? "warn" : undefined,
      title: "Validators that signed none of the blocks in the window",
    },
    {
      label: "Tolerance",
      value: spare === null ? "—" : String(spare),
      // Zero spare is the state that matters most and is the hardest to see anywhere else: the
      // set is one failure away from stopping, and it looks completely healthy until it does.
      tone: spare === 0 ? "bad" : spare !== null && spare < 2 ? "warn" : "ok",
      title: "Validator failures the set survives before it cannot reach quorum",
    },
    { label: "Peers", value: count(status?.peer_count), title: "P2P connections this node holds" },
    {
      label: "Mempool",
      value: count(status?.mempool_size),
      title: "Transactions waiting to be included",
    },
    {
      label: "Versions",
      value: spread.length ? String(spread.length) : "—",
      tone: spread.length > 1 ? "warn" : undefined,
      title: spread.map((x) => `${x.version} (${x.count})`).join(" · "),
    },
    { label: "Tx in window", value: num(txInWindow), title: `Across the last ${WINDOW} blocks` },
  ];

  // One definition of what paging means, used by the buttons and by `n`/`p` alike.
  const toLive = useCallback(() => setPinned(null), []);
  const pageOlder = useCallback(
    () => setPinned((p) => Math.max(PAGE - 1, (p ?? height ?? 0) - PAGE)),
    [height],
  );
  const pageNewer = useCallback(() => {
    setPinned((p) => {
      if (p === null || height === null) return null;
      const next = p + PAGE;
      // Walking forward past the tip means going back to following it, rather than pinning to a
      // height that does not exist yet.
      return next >= height ? null : next;
    });
  }, [height]);

  const moveCursor = useCallback(
    (step: number) => {
      setCursor((current) => {
        if (rows.length === 0) return null;
        if (current === null) return rows[0];
        const at = rows.indexOf(current);
        // A cursor whose block has scrolled out of the window restarts at the top rather than
        // silently doing nothing.
        if (at === -1) return rows[0];
        return rows[Math.min(rows.length - 1, Math.max(0, at + step))];
      });
    },
    [rows],
  );

  const clearAll = useCallback(() => {
    setFocused(null);
    setCursor(null);
    setPaletteOpen(false);
    navigate("/");
  }, [navigate]);

  useBoardKeys({
    onDown: () => moveCursor(1),
    onUp: () => moveCursor(-1),
    onOpen: () => cursor !== null && navigate(`/block/${cursor}`),
    onOlder: pageOlder,
    onNewer: pageNewer,
    onSearch: () => searchInput.current?.focus(),
    onClear: clearAll,
    onPalette: () => setPaletteOpen((v) => !v),
  });

  return (
    <div className="board-app">
      <div className="topbar">
        <Link className="brand" to="/">
          <img src="/logo.png" alt="" width={22} height={22} />
          <span className="name">Helix</span>
          <span className="sub">Explorer</span>
        </Link>
        <LiveDot />
        <div className="topsearch">
          <Search compact inputRef={searchInput} />
        </div>
        <Clock />
        <button
          type="button"
          className="bbtn"
          onClick={() => setPaletteOpen(true)}
          title="Commands and keyboard shortcuts"
        >
          ⌘K
        </button>
        <a href="https://node.silvra.net" title="The status page this node serves about itself">
          Node
        </a>
        <ThemeToggle label={theme.label} onCycle={theme.cycle} />
      </div>

      <StatusRail vitals={vitals} />

      {status?.is_syncing && (
        <div className="alert warn">
          <b>Syncing.</b> This node holds {num(status.state_height)} of{" "}
          {num(status.sync_target_height ?? status.height)} blocks — everything below is behind
          the chain tip.
        </div>
      )}
      {jailed > 0 && (
        <div className="alert bad">
          <b>
            {jailed} validator{jailed === 1 ? "" : "s"} jailed.
          </b>{" "}
          They are not taking part in consensus.
        </div>
      )}
      {/* Not a fault, but the state an operator most wants to know they are in: a set running
          more than one binary is mid-upgrade, and that is when consensus bugs surface. */}
      {spread.length > 1 && (
        <div className="alert warn">
          <b>The set is running {spread.length} versions.</b>{" "}
          {spread.map((s) => `${s.version} (${s.count})`).join(" · ")} — read from the blocks each
          validator produced, so this is what is actually building blocks rather than what is
          installed.
        </div>
      )}

      <div className="board">
        <Cell area="state" title="Chain" aside={status ? `v${status.version}` : undefined}>
          <ChainState
            verdict={state}
            height={height}
            tipTimestamp={tip?.timestamp ?? null}
            expected={expected}
            advances={advances}
          />
        </Cell>

        {/* No aside: the rhythm draws its own reading line, because hovering a bar replaces it
            with that block's interval. */}
        <Cell area="rhythm" title="Block rhythm">
          <Rhythm blocks={blocks} hoverHeight={hoverHeight} onHoverHeight={setHoverHeight} />
        </Cell>

        {/* The long sentence version of this belongs in a notice, not in a header that has to
            stay one line tall on a fixed board. The full reading is in the tooltip. */}
        <Cell
          area="validators"
          title="Validator set"
          aside={
            spare === null ? undefined : (
              <span title={faultToleranceLabel(spare)}>
                {spare === 0 ? "none can drop out" : `${spare} can drop out`}
              </span>
            )
          }
        >
          <ValidatorSet
            validators={validators}
            attendance={attendanceByAddress}
            totalPower={totalPower}
            versions={versions}
            focused={focused}
            onFocus={setFocused}
          />
        </Cell>

        <Cell area="metrics" title="Telemetry">
          <Telemetry
            status={status}
            txInWindow={txInWindow}
            blocksInWindow={blocks.length}
          />
        </Cell>

        <Cell area="blocks" title="Blocks" pad={false} ownScroll>
          <BlockStream
            live={blocks}
            liveHeaders={headers}
            validators={addresses}
            tipHeight={height}
            focused={focused}
            hoverHeight={hoverHeight}
            onHoverHeight={setHoverHeight}
            cursor={cursor}
            onRowsChange={setRows}
            pinned={pinned}
            onLive={toLive}
            onOlder={pageOlder}
            onNewer={pageNewer}
          />
        </Cell>

        <Cell
          area="txs"
          title="Transactions"
          aside={<span className="num">{num(txInWindow)} in the window</span>}
          pad={false}
          ownScroll
        >
          <TxFeed blocks={blocks} />
        </Cell>

        <Cell area="inspector" title="Inspector" pad={false}>
          <Inspector blocks={blocks} />
        </Cell>
      </div>

      <div className="strip">
        <span>
          <b>Genesis</b>
          <i title={genesis.data?.hash}>{shortHash(genesis.data?.hash)}</i>
        </span>
        <span>
          <b>State</b>
          <i title={status?.state_hash}>{shortHash(status?.state_hash)}</i>
        </span>
        <span>
          <b>P2P</b>
          <i>{status?.p2p_public_addr ?? "—"}</i>
        </span>
        <span className="devnet">
          <b>Devnet</b>
          <i>HLX here is a valueless test token; the chain is reset when it needs to be</i>
        </span>
        <span className="spacer" />
        <EndpointPicker />
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        validators={validators}
        onFocusValidator={(a) => {
          setFocused(a);
          setPaletteOpen(false);
        }}
        focused={focused}
        onClear={clearAll}
        onCycleTheme={theme.cycle}
      />
    </div>
  );
}
