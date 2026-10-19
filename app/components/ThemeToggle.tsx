import { useState } from "react";
import { cx, IconMoon, IconSun, IconSystem } from "./ui";

export type ThemeChoice = "system" | "light" | "dark";

const ORDER: ThemeChoice[] = ["system", "light", "dark"];
const LABEL: Record<ThemeChoice, string> = { system: "Match system", light: "Light", dark: "Dark" };
const ICON = { system: IconSystem, light: IconSun, dark: IconMoon };

/** Saved in a cookie so the server renders the right theme and there's no flash on load */
export function applyTheme(t: ThemeChoice) {
  const root = document.documentElement;
  if (t === "system") delete root.dataset.theme;
  else root.dataset.theme = t;
  document.cookie = `theme=${t}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeToggle({ initial }: { initial: ThemeChoice }) {
  const [theme, setTheme] = useState<ThemeChoice>(initial);
  return (
    <div role="radiogroup" aria-label="Colour theme" className="inline-flex rounded-lg border border-line bg-sunken p-[3px]">
      {ORDER.map((t) => {
        const I = ICON[t];
        const on = theme === t;
        return (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={LABEL[t]}
            title={LABEL[t]}
            onClick={() => {
              setTheme(t);
              applyTheme(t);
            }}
            className={cx("inline-grid size-7 place-items-center rounded-md", on ? "bg-surface text-ink shadow-seg" : "text-muted hover:text-ink")}
          >
            <I />
          </button>
        );
      })}
    </div>
  );
}

export function parseTheme(cookieHeader: string | null): ThemeChoice {
  const m = cookieHeader?.match(/(?:^|;\s*)theme=(light|dark|system)/);
  return (m?.[1] as ThemeChoice) ?? "system";
}
