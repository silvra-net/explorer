// Manual light/dark override, identical in behaviour to the wallet and the node's status page:
// a `data-theme` attribute on <html> wins over the OS `prefers-color-scheme` in both directions
// (see styles.css). "system" removes the attribute and lets the OS preference through.
//
// The same localStorage key as the wallet on purpose — someone running both on one machine
// picked a side once, not twice.
export type ThemePref = "system" | "light" | "dark";

const KEY = "helix-theme";

export function getThemePref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

export function applyStoredTheme(): void {
  const pref = getThemePref();
  const root = document.documentElement;
  if (pref === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", pref);
}

export function setThemePref(pref: ThemePref): void {
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* private mode — the choice lasts for this page view */
  }
  applyStoredTheme();
}
