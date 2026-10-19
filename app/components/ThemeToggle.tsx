import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "./ui";

export type ThemeChoice = "system" | "light" | "dark";

/** Saved in a cookie so the server renders the right theme and there's no flash on load */
export function applyTheme(t: ThemeChoice) {
  const root = document.documentElement;
  if (t === "system") delete root.dataset.theme;
  else root.dataset.theme = t;
  document.cookie = `theme=${t}; path=/; max-age=31536000; samesite=lax`;
}

/** One button in the top bar, as in Minia: shows a moon in light mode and a sun in dark mode.
 *  Until it's pressed the app follows the system setting. */
export function ThemeToggle({ initial }: { initial: ThemeChoice }) {
  const [theme, setTheme] = useState<ThemeChoice>(initial);
  const [systemDark, setSystemDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const dark = theme === "dark" || (theme === "system" && systemDark);
  const label = dark ? "Switch to light mode" : "Switch to dark mode";
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        const next: ThemeChoice = dark ? "light" : "dark";
        setTheme(next);
        applyTheme(next);
      }}
      className="inline-grid size-10 place-items-center rounded-btn text-nav hover:bg-btn hover:text-head"
    >
      {dark ? <IconSun className="size-[18px]" /> : <IconMoon className="size-[18px]" />}
    </button>
  );
}

export function parseTheme(cookieHeader: string | null): ThemeChoice {
  const m = cookieHeader?.match(/(?:^|;\s*)theme=(light|dark|system)/);
  return (m?.[1] as ThemeChoice) ?? "system";
}
