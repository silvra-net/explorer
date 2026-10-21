import type { Ref } from "react";
import { Link, useLocation } from "react-router-dom";
import { LiveDot } from "../components/LiveDot";
import { Search } from "../components/Search";
import { ThemeToggle } from "../components/ThemeToggle";
import type { ThemePref } from "../theme";
import { Clock } from "./Clock";

/**
 * The bar across the top of every view: the wordmark, the two views, search, and the tools.
 *
 * Shared rather than drawn by each view, because the board and the network page are one site —
 * the bar staying put while the view under it changes is what says so.
 */
export function TopBar({
  searchInput,
  onPalette,
  theme,
}: {
  searchInput?: Ref<HTMLInputElement>;
  /** The board opens its command palette; a view without one leaves the button out. */
  onPalette?: () => void;
  theme: { pref: ThemePref; label: string; cycle: () => void };
}) {
  const onNetwork = useLocation().pathname === "/network";

  return (
    <div className="topbar">
      <Link className="brand" to="/" aria-label="Helix Explorer — overview">
        <img src="/logo.png" alt="" width={30} height={30} />
        <span className="brand-name">Helix</span>
        <span className="brand-world" aria-hidden="true">
          <span className="brand-slash">/</span>
          Explorer
        </span>
      </Link>
      {/* Two views, marked the way the site marks its current page: a bar in the accent under
          it, no fill. Every address, block and transaction opens on the board, so the board is
          current for everything except the network page. */}
      <nav className="views" aria-label="Views">
        <Link className={onNetwork ? "view" : "view on"} to="/" aria-current={onNetwork ? undefined : "page"}>
          Board
        </Link>
        <Link className={onNetwork ? "view on" : "view"} to="/network" aria-current={onNetwork ? "page" : undefined}>
          Network
        </Link>
      </nav>
      <LiveDot />
      <div className="topsearch">
        <Search compact inputRef={searchInput} />
      </div>
      <Clock />
      <div className="tools">
        {onPalette && (
          <button type="button" className="bbtn" onClick={onPalette} title="Commands and keyboard shortcuts">
            ⌘K
          </button>
        )}
        <a
          className="node-link"
          href="https://node.silvra.net"
          title="The status page this node serves about itself"
        >
          Node <span aria-hidden="true">↗</span>
        </a>
        <ThemeToggle pref={theme.pref} label={theme.label} onCycle={theme.cycle} />
      </div>
    </div>
  );
}
