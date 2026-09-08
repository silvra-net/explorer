import { num } from "../format";
import { Heartbeat, Since } from "../components/Heartbeat";
import type { Verdict } from "../verdict";

/**
 * The verdict, the height, and the pulse — the top-left corner of the board.
 *
 * Sized so it is legible from across a room, because that is the actual use: a screen left open
 * on a second monitor, glanced at rather than read. Everything else on the board exists to
 * explain the word at the top of this cell.
 */
export function ChainState({
  verdict,
  height,
  tipTimestamp,
  expected,
  advances,
}: {
  verdict: Verdict;
  height: number | null;
  tipTimestamp: number | null;
  expected: number;
  advances: number;
}) {
  return (
    <div className="state-body">
      <p className={`state state-${verdict.state}`}>
        <span className="dot" />
        <span>{verdict.label}</span>
      </p>
      <p className="state-why">{verdict.why}</p>

      <div className="state-height">
        <small>Height</small>
        {/* Remounted per block so the landing flash re-fires; not on first paint, when nothing
            has actually landed. */}
        <span key={advances} className={`num${advances > 0 ? " landed" : ""}`}>
          {height === null ? "—" : num(height)}
        </span>
      </div>

      {tipTimestamp !== null && (
        <>
          <p className="state-since">
            last block <b><Since at={tipTimestamp} /></b>
          </p>
          <Heartbeat lastBlockAt={tipTimestamp} expected={expected} />
        </>
      )}
    </div>
  );
}
