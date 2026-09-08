import { shortAddr } from "../format";

/**
 * Who agreed to this block.
 *
 * One cell per validator in the current set, in a fixed order, filled where that validator's
 * precommit appears in the block's commit certificate (`last_commit`). Because the order is the
 * same on every row, a column read downwards is one validator's attendance over time.
 *
 * Why this is the centrepiece rather than a detail: Helix finalizes with BFT, so a block is not
 * "found" by one party — it is *agreed* by a supermajority, and the certificate proving that
 * ships inside the block. Whether the set is co-signing is the single most useful thing about
 * this chain's health, and until now it was visible only by reading a validator's own logs.
 *
 * The order comes from the caller (the current validator set), which means a validator who has
 * since left the set leaves no column. That is a deliberate limit rather than an oversight:
 * reconstructing the historical set at each height needs an index this app does not have yet,
 * and inventing a column from the signatures alone would silently reorder history as the set
 * changes. `extra` counts anyone who signed but is not in today's set, so the number never lies
 * even when the strip cannot place them.
 */
export interface CoSignStripProps {
  /** Current validator set, in a stable order — defines the columns. */
  validators: string[];
  /** Addresses from this block's `last_commit`, or null while the header is still loading. */
  signers: string[] | null;
  /** The block's proposer, outlined so it can be told apart from the other signers. */
  proposer?: string;
  /**
   * A validator singled out on the board.
   *
   * Marking their cell in every row is what turns the strip into the reading the README
   * describes: the same column down the whole list is one validator's attendance, and until now
   * you had to hold your place in it by eye.
   */
  focused?: string | null;
}

/**
 * Above this many validators the per-cell strip stops being readable and starts being wide.
 *
 * At 12px a cell, three validators cost 36px of a table column and twenty cost 240 — the column
 * blows out, the table grows a horizontal scrollbar, and the one element this explorer exists for
 * becomes unscannable at exactly the point where the network gets interesting. Past the
 * threshold the same fact is stated as a count and a meter, which does not grow with the set.
 */
const STRIP_LIMIT = 12;

export function CoSignStrip({ validators, signers, proposer, focused }: CoSignStripProps) {
  if (signers === null) {
    return <span className="cosign-unknown">·</span>;
  }

  const signed = new Set(signers);
  const extra = signers.filter((s) => !validators.includes(s)).length;

  if (validators.length > STRIP_LIMIT) {
    return (
      <CoSignCount
        validators={validators}
        signers={signers}
        signed={signed}
        proposer={proposer}
        focused={focused}
        extra={extra}
      />
    );
  }

  const label =
    signers.length === 0
      ? "No commit certificate in this block"
      : `Co-signed by ${signers.length} of ${validators.length}: ${signers
          .map(shortAddr)
          .join(", ")}`;

  return (
    <span className="cosign" title={label} role="img" aria-label={label}>
      {validators.map((v) => {
        const did = signed.has(v);
        const classes = ["cosign-cell"];
        if (!did) classes.push("absent");
        if (v === proposer) classes.push("proposer");
        if (v === focused) classes.push("focus");
        return <span key={v} className={classes.join(" ")} />;
      })}
      {extra > 0 && (
        <span className="cosign-unknown" title="Signed by a validator no longer in the set">
          +{extra}
        </span>
      )}
    </span>
  );
}

/**
 * The same block, for a set too large to draw one cell at a time.
 *
 * A meter and a count, which stay the same width whether the set is twenty or two hundred. The
 * missing validators are named in the tooltip rather than drawn, because on a large set the
 * useful question flips: not "who signed" but "who did not", and that list is short whenever the
 * chain is healthy.
 *
 * The singled-out validator keeps a cell of their own, so the linked selection still answers
 * "was this one of the blocks they missed" without the reader counting anything.
 */
function CoSignCount({
  validators,
  signers,
  signed,
  proposer,
  focused,
  extra,
}: {
  validators: string[];
  signers: string[];
  signed: Set<string>;
  proposer?: string;
  focused?: string | null;
  extra: number;
}) {
  const missing = validators.filter((v) => !signed.has(v));
  const share = validators.length > 0 ? (signers.length / validators.length) * 100 : 0;
  const label =
    missing.length === 0
      ? `All ${validators.length} co-signed`
      : `Missing: ${missing.map(shortAddr).join(", ")}`;

  return (
    <span className="cosign-count" title={label}>
      {focused && (
        <span
          className={`cosign-cell${signed.has(focused) ? "" : " absent"}${
            focused === proposer ? " proposer" : ""
          } focus`}
          title={signed.has(focused) ? "The singled-out validator signed this" : "They did not"}
        />
      )}
      <span className="meter" aria-hidden="true">
        <i className={missing.length === 0 ? "" : "short"} style={{ width: `${share}%` }} />
      </span>
      <span className={`num${missing.length === 0 ? "" : " miss"}`}>
        {signers.length}/{validators.length}
      </span>
      {extra > 0 && <span className="cosign-unknown">+{extra}</span>}
    </span>
  );
}

export function CoSignLegend({ total }: { total: number }) {
  // Above the limit there are no swatches on screen to explain, so explaining them would send
  // the reader looking for something that is not there.
  if (total > STRIP_LIMIT) {
    return (
      <div className="legend">
        <span>
          The bar is the share of the set that co-signed; hover it for the validators that did
          not.
        </span>
        <span className="dim">
          {total} validator{total === 1 ? "" : "s"} in the current set
        </span>
      </div>
    );
  }

  return (
    <div className="legend">
      <span>
        <span className="swatch" />
        co-signed
      </span>
      <span>
        <span className="swatch absent" />
        did not sign
      </span>
      <span>
        <span className="swatch proposer" />
        proposed the block
      </span>
      <span className="dim">
        {total} validator{total === 1 ? "" : "s"} in the current set
      </span>
    </div>
  );
}
