import { useState } from "react";
import { Link } from "react-router-dom";
import { hlxShort, num, shortAddr } from "../format";
import { rpc } from "../rpc";
import { useAsync } from "../useAsync";
import { useChainStatus } from "../useChainStatus";
import { useThemePref } from "../components/ThemeToggle";
import { faultTolerance } from "../quorum";
import { TopBar } from "../board/TopBar";
import { Donut, sliceColor } from "./Donut";
import { SeriesChart } from "./SeriesChart";
import { blockSeries, nakamoto, nanoToHlx, slices } from "./metrics";
import type { Slice } from "./metrics";

/** The protocol's hard cap (`TOTAL_SUPPLY_HLX`); issuance by the halving schedule stays below it. */
const HARD_CAP_HLX = 33_000_000;

/** How many blocks the activity charts draw — what `/blocks/range` returns in one request. */
const HISTORY = 500;

/** Seconds, to one decimal, in the reader's own number format like every other figure here. */
function secs(v: number, digits = 1): string {
  return v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/**
 * An amount for a headline: two decimals, except where that would round a real amount to zero —
 * the chain has burned a few thousand nano so far, and "0 HLX burned" would be a false statement.
 */
function amount(v: number): string {
  if (v > 0 && v < 0.01) return v.toLocaleString(undefined, { maximumSignificantDigits: 4 });
  return hlxShort(v);
}

/** A share of a whole, for the legends. */
function pct(part: number, whole: number): string {
  if (whole <= 0) return "—";
  const p = (part / whole) * 100;
  return `${p < 0.1 && p > 0 ? "<0.1" : p.toFixed(1)}%`;
}

function Label({ index, children }: { index: string; children: string }) {
  return (
    <p className="label">
      <span className="label-index">{index}</span>
      {children}
    </p>
  );
}

/** A ring and the legend that reads it — one hover for both. */
function RingWithLegend({
  data,
  label,
  center,
  format,
  link,
}: {
  data: Slice[];
  label: string;
  center: React.ReactNode;
  format: (v: number) => string;
  /** Where a holder's row leads, if it is one account. */
  link?: (key: string) => string | null;
}) {
  const [active, setActive] = useState<string | null>(null);
  const total = data.reduce((n, s) => n + s.value, 0);
  const ramp = data.filter((s) => !s.rest).length;
  return (
    <div className="ring">
      <Donut data={data} label={label} center={center} active={active} onActive={setActive} format={format} />
      <ol className="legend-list" onPointerLeave={() => setActive(null)}>
        {data.map((s, i) => {
          const to = link?.(s.key) ?? null;
          return (
            <li
              key={s.key}
              className={active === s.key ? "on" : undefined}
              onPointerEnter={() => setActive(s.key)}
            >
              <i style={{ background: sliceColor(i, ramp, s.rest !== undefined) }} aria-hidden="true" />
              {to ? (
                <Link to={to} className="mono">
                  {s.label}
                </Link>
              ) : (
                <span className={s.rest ? undefined : "mono"}>{s.label}</span>
              )}
              <span className="num">{format(s.value)}</span>
              <span className="num share">{pct(s.value, total)}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Who carries this chain, who holds it, and what the last few hundred blocks looked like.
 *
 * The board answers "what is happening now"; this page answers the slower questions, and every
 * number on it is read from the node the visitor is pointed at — nothing is kept or indexed
 * anywhere else. Where a node is too old to answer (the rich list needs 1.1.1), the section says
 * so instead of drawing a guess.
 */
export function NetworkPage() {
  const theme = useThemePref();
  const { status } = useChainStatus();
  const vals = useAsync(() => rpc.validators(), [], 30000);
  const top = useAsync(() => rpc.topAccounts(100), [], 60000);
  const history = useAsync(
    async () => {
      const s = await rpc.status();
      return rpc.blockRange(Math.max(0, s.height - HISTORY + 1), HISTORY);
    },
    [],
    120000,
  );
  const [weigh, setWeigh] = useState<"stake" | "power">("stake");

  // ---- decentralization ----
  const validators = vals.data?.validators ?? [];
  const total = vals.data?.total_voting_power;
  const quorum = vals.data?.quorum_threshold;
  const powers = validators.map((v) => v.voting_power ?? 0);
  const inSet = powers.filter((p) => p > 0).length;
  const nk = total !== undefined && quorum !== undefined ? nakamoto(powers, total, quorum) : null;
  const spare = total !== undefined && quorum !== undefined ? faultTolerance(powers, total, quorum) : null;
  const ringData = slices(
    validators.map((v) => ({
      key: v.address,
      label: shortAddr(v.address),
      value: weigh === "stake" ? v.effective_stake_hlx : (v.voting_power ?? 0) / 1e9,
    })),
    9,
  );
  const ringTotal = ringData.reduce((n, s) => n + s.value, 0);

  // ---- supply ----
  const totals = top.data?.totals;
  const parts = totals
    ? [
        { key: "liquid", label: "Liquid", value: nanoToHlx(totals.liquid_nano) ?? 0 },
        { key: "staked", label: "Staked by validators", value: nanoToHlx(totals.staked_nano) ?? 0 },
        { key: "delegated", label: "Delegated", value: nanoToHlx(totals.delegated_nano) ?? 0 },
        { key: "unbonding", label: "Unbonding", value: nanoToHlx(totals.unbonding_nano) ?? 0 },
      ]
    : null;
  const held = totals ? (nanoToHlx(totals.held_nano) ?? 0) : null;
  const circulating = status?.circulating_supply_hlx ?? null;
  const burned = status?.total_burned_hlx ?? null;
  const issued = circulating !== null && burned !== null ? circulating + burned : null;

  // ---- rich list ----
  const accounts = top.data?.accounts ?? [];
  const richData = slices(
    accounts.map((a) => ({
      key: a.address,
      label: a.name ? `${a.name}.hlx` : shortAddr(a.address),
      value: nanoToHlx(a.held_nano) ?? 0,
    })),
    10,
  );
  // The remainder is everything past the top ten, not just past ten of the hundred listed.
  if (held !== null && richData.length > 0) {
    const shown = richData.filter((s) => !s.rest).reduce((n, s) => n + s.value, 0);
    const restOfChain = held - shown;
    const others = (top.data?.total_accounts ?? 0) - richData.filter((s) => !s.rest).length;
    const withoutRest = richData.filter((s) => !s.rest);
    if (restOfChain > 0 && others > 0) {
      withoutRest.push({ key: "rest", label: `${num(others)} other accounts`, value: restOfChain, rest: others });
    }
    richData.splice(0, richData.length, ...withoutRest);
  }

  // ---- activity ----
  const series = blockSeries(history.data ?? []);
  const intervals = series.filter((p) => p.interval !== undefined).map((p) => ({ height: p.height, value: p.interval! }));
  const txs = series.map((p) => ({ height: p.height, value: p.txs }));
  const fees = series.map((p) => ({ height: p.height, value: p.baseFee }));
  const sortedGaps = intervals.map((p) => p.value).sort((a, b) => a - b);
  const median = sortedGaps.length ? sortedGaps[Math.floor(sortedGaps.length / 2)] : null;
  const txTotal = txs.reduce((n, p) => n + p.value, 0);

  return (
    <div className="doc">
      <TopBar theme={theme} />
      <main className="net">
        <header className="net-hero">
          <div className="hud-deco" aria-hidden="true">
            <div className="hud-camo" />
            <div className="hud-scan" />
          </div>
          <Label index="00">Network</Label>
          <h1>Who carries Helix</h1>
          <p className="lead">
            Stake, supply and the largest holders, read live from{" "}
            <span className="mono">{status ? `block ${num(status.height)}` : "the node"}</span> — nothing here
            is indexed or kept anywhere else.
          </p>
        </header>

        <section className="net-sec">
          <Label index="01">Decentralization</Label>
          <div className="net-grid">
            <dl className="readout">
              <div>
                <dt>Validators to halt the chain</dt>
                <dd className="num">{nk?.halt ?? "—"}</dd>
                <p>The fewest that, by withholding their votes, leave the rest short of the quorum.</p>
              </div>
              <div>
                <dt>Validators to run it alone</dt>
                <dd className="num">{nk?.control ?? "—"}</dd>
                <p>The fewest whose votes alone finalize blocks — the group that could rewrite history.</p>
              </div>
              <div>
                <dt>Can drop out</dt>
                <dd className="num">{spare ?? "—"}</dd>
                <p>Validators that can go offline, weakest first, before blocks stop.</p>
              </div>
              <div>
                <dt>Validators voting</dt>
                <dd className="num">
                  {inSet}
                  <small> of {validators.length}</small>
                </dd>
                <p>With weight in the set; the rest are jailed, in probation or waiting to enter.</p>
              </div>
            </dl>
            <div className="net-card">
              <div className="card-head">
                <h2>{weigh === "stake" ? "Stake" : "Voting power"}</h2>
                <div className="seg" role="group" aria-label="Weigh validators by">
                  <button type="button" className={weigh === "stake" ? "on" : undefined} onClick={() => setWeigh("stake")}>
                    Stake
                  </button>
                  <button type="button" className={weigh === "power" ? "on" : undefined} onClick={() => setWeigh("power")}>
                    Voting power
                  </button>
                </div>
              </div>
              {vals.error ? (
                <p className="notice bad">{vals.error}</p>
              ) : (
                <RingWithLegend
                  data={ringData}
                  label={weigh === "stake" ? "Stake by validator" : "Voting power by validator"}
                  center={
                    <>
                      <b className="num">{validators.length || "—"}</b>
                      <span>validators</span>
                    </>
                  }
                  format={(v) => (weigh === "stake" ? `${hlxShort(v)} HLX` : pct(v, ringTotal))}
                  link={(k) => (k === "rest" ? null : `/address/${k}`)}
                />
              )}
              <p className="card-note">
                {weigh === "stake"
                  ? "Own stake plus delegations. Stake buys weight only up to a cap: no validator votes with more than 1 % of all stake."
                  : "What each vote weighs after the 1 % cap — the reason a validator with ten times the stake can count the same."}
              </p>
            </div>
          </div>
        </section>

        <section className="net-sec">
          <Label index="02">Supply</Label>
          <div className="net-grid">
            <dl className="readout">
              <div>
                <dt>In existence</dt>
                <dd className="num">{circulating !== null ? hlxShort(circulating) : "—"}<small> HLX</small></dd>
                <p>Issued less burned, staked included — staked HLX can be unstaked.</p>
              </div>
              <div>
                <dt>Burned</dt>
                <dd className="num">{burned !== null ? amount(burned) : "—"}<small> HLX</small></dd>
                <p>Base fees and slashed stake, gone for good.</p>
              </div>
              <div>
                <dt>Issued of the cap</dt>
                <dd className="num">{issued !== null ? pct(issued, HARD_CAP_HLX) : "—"}</dd>
                <p>Against the hard cap of {num(HARD_CAP_HLX)} HLX; the block reward halves about yearly.</p>
              </div>
              <div>
                <dt>Accounts</dt>
                <dd className="num">{status ? num(status.total_accounts) : "—"}</dd>
                <p>Every address the chain has a record for.</p>
              </div>
            </dl>
            <div className="net-card">
              <div className="card-head">
                <h2>Where it sits</h2>
              </div>
              {parts && held !== null ? (
                <>
                  <div className="stack-bar" role="img" aria-label="Supply by where it sits">
                    {parts.map((p, i) => (
                      <i
                        key={p.key}
                        style={{ width: `${(p.value / held) * 100}%`, background: sliceColor(i, parts.length) }}
                        title={`${p.label}: ${hlxShort(p.value)} HLX`}
                      />
                    ))}
                  </div>
                  <ol className="legend-list">
                    {parts.map((p, i) => (
                      <li key={p.key}>
                        <i style={{ background: sliceColor(i, parts.length) }} aria-hidden="true" />
                        <span>{p.label}</span>
                        <span className="num">{hlxShort(p.value)} HLX</span>
                        <span className="num share">{pct(p.value, held)}</span>
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <p className="notice">
                  {top.notFound
                    ? "This node does not total holdings yet — that arrives with Helix 1.1.1."
                    : top.error ?? "Reading the node…"}
                </p>
              )}
              {issued !== null && (
                <div className="cap-bar" title={`${hlxShort(issued)} of ${num(HARD_CAP_HLX)} HLX issued`}>
                  <span>Issued</span>
                  <div>
                    <i style={{ width: `${Math.max(0.4, (issued / HARD_CAP_HLX) * 100)}%` }} />
                  </div>
                  <span className="num">{hlxShort(issued)} / {num(HARD_CAP_HLX)}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="net-sec">
          <Label index="03">Rich list</Label>
          {top.notFound ? (
            <p className="notice">
              The node this explorer reads does not list accounts yet. The rich list needs Helix 1.1.1 or later
              — pick another endpoint at the foot of the board, or wait for this one to update.
            </p>
          ) : top.error ? (
            <p className="notice bad">{top.error}</p>
          ) : (
            <div className="net-grid wide-right">
              <div className="net-card">
                <div className="card-head">
                  <h2>Top ten and the rest</h2>
                </div>
                <RingWithLegend
                  data={richData}
                  label="Holdings of the ten largest accounts against all others"
                  center={
                    <>
                      <b className="num">{held !== null ? hlxShort(held) : "—"}</b>
                      <span>HLX held</span>
                    </>
                  }
                  format={(v) => `${hlxShort(v)} HLX`}
                  link={(k) => (k === "rest" ? null : `/address/${k}`)}
                />
              </div>
              <div className="net-card flush">
                <div className="tbl-scroll">
                  <table className="tbl rich">
                    <thead>
                      <tr>
                        <th className="r">#</th>
                        <th>Account</th>
                        <th className="r">Holds</th>
                        <th className="r opt">Liquid</th>
                        <th className="r opt">Staked</th>
                        <th className="r">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((a, i) => {
                        const holds = nanoToHlx(a.held_nano) ?? 0;
                        const staked = (nanoToHlx(a.staked_nano) ?? 0) + (nanoToHlx(a.delegated_nano) ?? 0);
                        return (
                          <tr key={a.address}>
                            <td className="r num dim">{i + 1}</td>
                            <td>
                              <Link to={`/address/${a.address}`} className="mono" title={a.address}>
                                {a.name ? `${a.name}.hlx` : shortAddr(a.address)}
                              </Link>
                            </td>
                            <td className="r num">{hlxShort(holds)}</td>
                            <td className="r num opt">{hlxShort(nanoToHlx(a.liquid_nano) ?? 0)}</td>
                            <td className="r num opt">{staked > 0 ? hlxShort(staked) : "—"}</td>
                            <td className="r num">{held !== null ? pct(holds, held) : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="net-sec">
          <Label index="04">Activity</Label>
          <dl className="readout row">
            <div>
              <dt>Blocks drawn</dt>
              <dd className="num">{num(series.length)}</dd>
            </div>
            <div>
              <dt>Median interval</dt>
              <dd className="num">{median !== null ? secs(median, 2) : "—"}<small> s</small></dd>
            </div>
            <div>
              <dt>Transactions</dt>
              <dd className="num">{num(txTotal)}</dd>
            </div>
            <div>
              <dt>Base fee now</dt>
              <dd className="num">{status ? num(status.base_fee_per_byte) : "—"}<small> nano/byte</small></dd>
            </div>
          </dl>
          {history.error ? (
            <p className="notice bad">{history.error}</p>
          ) : (
            <div className="net-charts">
              <SeriesChart points={intervals} mode="bars" label="Seconds between blocks" unit="s" format={(v) => secs(v)} floor={8} />
              <SeriesChart points={txs} mode="bars" label="Transactions per block" unit="tx" floor={5} />
              <SeriesChart points={fees} mode="step" label="Base fee" unit="nano/byte" floor={2} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
