import { useCallback, useState } from "react";
import { getThemePref, setThemePref, type ThemePref } from "../theme";

const NEXT: Record<ThemePref, ThemePref> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const LABEL: Record<ThemePref, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

/**
 * The theme preference, owned in one place.
 *
 * The button is not the only thing that changes it any more — the command palette does too — and
 * two components each holding their own copy of this state would let the button go on claiming
 * "System" after the palette had switched to dark.
 */
export function useThemePref() {
  const [pref, setPref] = useState<ThemePref>(getThemePref);

  const cycle = useCallback(() => {
    setPref((current) => {
      const next = NEXT[current];
      setThemePref(next);
      return next;
    });
  }, []);

  return { pref, label: LABEL[pref], cycle };
}

/**
 * The three states as the site draws its own switch: an icon in a square outlined button. The
 * word stays as the accessible name and the tooltip, so nothing that could be read before is
 * lost to someone who cannot see the icon.
 */
function ThemeIcon({ pref }: { pref: ThemePref }) {
  if (pref === "light") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
      </svg>
    );
  }
  if (pref === "dark") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 2a6 6 0 0 1 0 12Z" fill="currentColor" />
    </svg>
  );
}

export function ThemeToggle({
  pref,
  label,
  onCycle,
}: {
  pref: ThemePref;
  label: string;
  onCycle: () => void;
}) {
  return (
    <button
      className="bbtn icon"
      type="button"
      onClick={onCycle}
      aria-label={`Theme: ${label}`}
      title={`Theme: ${label} — switch between system, light and dark`}
    >
      <ThemeIcon pref={pref} />
    </button>
  );
}
