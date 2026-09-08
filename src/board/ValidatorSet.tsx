import { Link } from "react-router-dom";
import { shortAddr } from "../format";
import { versionSpread, type Attendance } from "../attendance";
import type { Validator } from "../types";

/**
 * Who secures the chain, and — the part no other explorer can show — whether they are doing it
 * right now.
 *
 * The attendance strip is the co-signature strip turned ninety degrees. In the block table one
 * row is a block and reading a *column* downwards gives you one validator's history, which is a
 * reading you have to know to look for. Here one row is a validator and their history reads
 * left to right, which is the question an operator actually arrives with.
 *
 * Voting power is shown as a share rather than as the raw figure. The node reports
 * `3000000000000` out of `9000000000000`; nobody reads thirteen digits, and the fact that
 * matters — every validator weighs exactly the same because they are all above the 1 % cap — is
 * invisible until it is a percentage. The raw number stays in the tooltip for anyone checking.
 */
export function ValidatorSet({
  validators,
  attendance,
  totalPower,
  versions,
  focused,
  onFocus,
}: {
  validators: Validator[];
  attendance: Map<string, Attendance>;
  totalPower: number | undefined;
  /**
   * What each validator's most recent block was produced by.
   *
   * Read out of the blocks rather than reported by `/validators`, which carries no version at
   * all — see `proposerVersions`. It answers "who is still on the old binary", and it answers it
   * with the version that actually built a block rather than one a node claims to run.
   */
  versions: Map<string, string>;
  /** The validator whose turns are singled out across the board, or null. */
  focused: string | null;
  onFocus: (address: string | null) => void;
}) {
  if (validators.length === 0) {
    return <p className="dim small">This node reports no validators.</p>;
  }

  // More than one version in the set means an upgrade is in flight, which is worth seeing
  // without opening anything.
  const spread = versionSpread(versions);
  const mixed = spread.length > 1;
  const majority = spread[0]?.version;

  /*
    Past a dozen validators the two-line row stops paying for itself.

    At three, giving each validator a heading and a full-height attendance strip below it is
    generous and readable. At twenty it means four fit in the panel and the other sixteen are
    below the fold — the set becomes something you scroll rather than something you see, which
    is the opposite of what this cell is for. Compact mode puts the same facts on one line and
    roughly doubles how many are visible at once.
  */
  const compact = validators.length > 12;

  return (
    <div className={compact ? "vset compact" : "vset"}>
      {validators.map((v) => {
        const a = attendance.get(v.address);
        const version = versions.get(v.address);
        const share =
          totalPower && totalPower > 0 && v.voting_power != null
            ? (v.voting_power / totalPower) * 100
            : null;
        const complete = a && a.measured > 0 && a.signed === a.measured;

        const isFocused = focused === v.address;

        return (
          // A row is a toggle, not a link: pressing it singles this validator out everywhere
          // else on the board. The address inside it stays a real link to the account, which is
          // a different question and deserves a different affordance.
          <div
            className={`vrow${isFocused ? " focused" : ""}`}
            key={v.address}
            role="button"
            tabIndex={0}
            aria-pressed={isFocused}
            title={
              isFocused
                ? "Stop singling out this validator"
                : "Single out this validator's blocks across the board"
            }
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("a")) return;
              onFocus(isFocused ? null : v.address);
            }}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              onFocus(isFocused ? null : v.address);
            }}
          >
            <div className="vhead">
              <Link className="mono vaddr" to={`/address/${v.address}`} title={v.address}>
                {shortAddr(v.address)}
              </Link>
              {v.jailed_until !== null ? (
                <span className="pill bad">jailed</span>
              ) : v.active ? (
                <span className="pill ok">{v.tier}</span>
              ) : (
                <span className="pill">{v.tier}</span>
              )}
              {/* Flagged only when the set disagrees with itself. On a set that is all on one
                  version the number is noise, and colouring it would be crying wolf. */}
              <span
                className={`vver num${mixed && version && version !== majority ? " odd" : ""}`}
                title={
                  version
                    ? `Their most recent block in this window was produced by Helix ${version}`
                    : "This validator has not proposed a block inside the window"
                }
              >
                {version ?? "—"}
              </span>
              <span
                className="vpower num"
                title={
                  v.voting_power == null
                    ? "This node does not report voting power"
                    : `${v.voting_power} of ${totalPower} voting power`
                }
              >
                {share === null ? "—" : `${share.toFixed(1)}%`}
              </span>
            </div>

            <div className="vatt">
              {a && a.measured > 0 ? (
                <>
                  <span className="att" title={`Signed ${a.signed} of the last ${a.measured}`}>
                    {a.history.map((signed, i) => (
                      <i key={i} className={signed ? "" : "miss"} />
                    ))}
                  </span>
                  <span className={`vcount num${complete ? "" : " short"}`}>
                    {a.signed}/{a.measured}
                  </span>
                </>
              ) : (
                <span className="dim small">reading certificates…</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
