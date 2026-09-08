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

export function ThemeToggle({ label, onCycle }: { label: string; onCycle: () => void }) {
  return (
    <button
      className="bbtn"
      type="button"
      onClick={onCycle}
      title="Switch between system, light and dark"
    >
      {label}
    </button>
  );
}
