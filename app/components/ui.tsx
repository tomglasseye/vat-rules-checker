import type { ButtonHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";
import type { Level, NoteLevel } from "~/engine";

export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(" ");

// ---------- Icons ----------

type IconProps = { className?: string; size?: number };

export function IconOk({ className, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <path d="M4.6 8.3l2.2 2.2 4.6-4.8" stroke="var(--color-surface)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
export function IconWarn({ className, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <path d="M8 1.2l7 12.6H1z" fill="currentColor" />
      <path d="M8 6v3.6" stroke="var(--color-surface)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="11.7" r="1" fill="var(--color-surface)" />
    </svg>
  );
}
export function IconBlock({ className, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <path d="M5.3 5.3l5.4 5.4M10.7 5.3l-5.4 5.4" stroke="var(--color-surface)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
export function IconInfo({ className, size = 16 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className={className}>
      <circle cx="8" cy="8" r="7" fill="currentColor" />
      <path d="M8 7.2v4.2" stroke="var(--color-surface)" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="8" cy="4.8" r="1" fill="var(--color-surface)" />
    </svg>
  );
}
const stroke = { stroke: "currentColor", strokeWidth: 1.6, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;
export const IconUp = ({ className }: IconProps) => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className={className}><path d="M7 11.5V2.5M3 6.5l4-4 4 4" {...stroke} /></svg>
);
export const IconDown = ({ className }: IconProps) => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className={className}><path d="M7 2.5v9M3 7.5l4 4 4-4" {...stroke} /></svg>
);
export const IconEdit = ({ className }: IconProps) => (
  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className={className}><path d="M2 12l.6-2.8 7-7 2.2 2.2-7 7z" {...stroke} strokeWidth={1.4} /></svg>
);
export const IconSun = ({ className }: IconProps) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className={className}>
    <circle cx="8" cy="8" r="3" {...stroke} />
    <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" {...stroke} />
  </svg>
);
export const IconMoon = ({ className }: IconProps) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className={className}><path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1z" {...stroke} /></svg>
);
export const IconSystem = ({ className }: IconProps) => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" className={className}>
    <rect x="1.8" y="2.5" width="12.4" height="8.5" rx="1.4" {...stroke} />
    <path d="M5.5 13.8h5M8 11v2.8" {...stroke} />
  </svg>
);

const NOTE_ICON: Record<NoteLevel, (p: IconProps) => ReactNode> = { ok: IconOk, warn: IconWarn, block: IconBlock, info: IconInfo };
const NOTE_COLOR: Record<NoteLevel, string> = { ok: "text-ok", warn: "text-warn", block: "text-block", info: "text-accent" };

export function LevelIcon({ level, className }: { level: NoteLevel; className?: string }) {
  const I = NOTE_ICON[level];
  return <span className={cx(NOTE_COLOR[level], "inline-flex shrink-0", className)}><I /></span>;
}

// ---------- Buttons ----------

type Variant = "default" | "primary" | "danger" | "ghost";
type Size = "md" | "sm";

const VARIANT: Record<Variant, string> = {
  default: "border-line bg-surface text-ink hover:border-accent",
  primary: "border-accent bg-accent text-on-accent hover:brightness-110",
  danger: "border-line bg-surface text-block hover:border-block",
  ghost: "border-transparent bg-transparent text-ink hover:bg-sunken",
};
const SIZE: Record<Size, string> = {
  md: "min-h-10 px-3.5 py-2 text-[15px]",
  sm: "min-h-8 px-2.5 py-1 text-[13px]",
};

export function buttonClass(variant: Variant = "default", size: Size = "md", extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-field border font-semibold transition-[filter,border-color] disabled:cursor-default disabled:opacity-55",
    VARIANT[variant],
    SIZE[size],
    extra,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }>(
  function Button({ variant = "default", size = "md", className, type = "button", ...rest }, ref) {
    return <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...rest} />;
  },
);

export function IconButton({ label, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-grid size-8 place-items-center rounded-field border border-line bg-surface text-ink hover:enabled:border-accent hover:enabled:text-accent disabled:cursor-default disabled:opacity-35",
        className,
      )}
      {...rest}
    />
  );
}

// ---------- Small pieces ----------

export function Chip({ tone = "muted", children, className }: { tone?: "muted" | "accent" | "ok" | "warn" | "block" | "outline-warn" | "outline-accent"; children: ReactNode; className?: string }) {
  const tones = {
    muted: "bg-sunken text-muted",
    accent: "bg-accent-soft text-accent",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    block: "bg-block-soft text-block",
    "outline-warn": "border border-current text-warn",
    "outline-accent": "border border-current text-accent",
  } as const;
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-[11.5px] font-semibold uppercase tracking-[0.04em]", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-card border border-line bg-surface", className)}>{children}</div>;
}

export function PageHeader({ title, intro, actions, eyebrow }: { title: ReactNode; intro?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
      <div className="min-w-0">
        {eyebrow ? <div className="eyebrow mb-1">{eyebrow}</div> : null}
        <h1 className="wide text-[24px] font-bold leading-tight tracking-[-0.01em] sm:text-[28px]">{title}</h1>
        {intro ? <p className="mt-1.5 max-w-[70ch] text-muted">{intro}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function BoxNo({ n, dim }: { n: number | string; dim?: boolean }) {
  return (
    <span
      className={cx(
        "inline-grid h-5 min-w-5 place-items-center rounded-[3px] border-[1.5px] font-mono text-[11px] font-semibold tracking-normal",
        dim ? "border-muted text-muted" : "border-ink text-ink",
      )}
    >
      {n}
    </span>
  );
}

export function StatusBar({ level, children }: { level: Level; children: ReactNode }) {
  const tone = { ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn", block: "bg-block-soft text-block" }[level];
  const I = NOTE_ICON[level];
  return (
    <div className={cx("flex items-center gap-2.5 px-4.5 py-2.75 text-sm font-bold tracking-[0.02em]", tone)}>
      <I />
      <span>{children}</span>
    </div>
  );
}

export function Stats({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3.5 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] overflow-hidden rounded-card border border-line bg-surface">
      {children}
    </div>
  );
}

export function Stat({ level, title, sub }: { level: NoteLevel; title: ReactNode; sub: ReactNode }) {
  return (
    <div className="-mr-px -mb-px flex min-w-0 items-start gap-2.5 border-r border-b border-line px-4 py-3">
      <LevelIcon level={level} className="mt-[3px]" />
      <div className="min-w-0">
        <b className="tabular block text-[15px]">{title}</b>
        <span className="text-[13px] text-muted">{sub}</span>
      </div>
    </div>
  );
}

export function Notes({ notes }: { notes: { level: NoteLevel; text: string }[] }) {
  return (
    <ul className="grid gap-2">
      {notes.map((n, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[14.5px]">
          <LevelIcon level={n.level} className="mt-0.5" />
          <span>{n.text}</span>
        </li>
      ))}
    </ul>
  );
}

export function Seg<T extends string>({
  name,
  value,
  options,
  onChange,
  labelledBy,
}: {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  labelledBy?: string;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="flex flex-wrap rounded-lg border border-line bg-sunken p-[3px]">
      {options.map((o) => (
        <label key={o.value} className="relative flex-auto">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            onChange={() => onChange(o.value)}
            className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
          />
          <span className="block whitespace-nowrap rounded-md px-2.5 py-1.75 text-center text-sm font-semibold text-muted peer-checked:bg-surface peer-checked:text-ink peer-checked:shadow-seg peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function FieldLabel({ htmlFor, children, className }: { htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cx("text-[13px] font-semibold", className)}>
      {children}
    </label>
  );
}

export function Banner({ tone, children }: { tone: NoteLevel; children: ReactNode }) {
  const bg = { ok: "bg-ok-soft", warn: "bg-warn-soft", block: "bg-block-soft", info: "bg-accent-soft" }[tone];
  return (
    <div className={cx("flex items-start gap-2.5 rounded-card px-4 py-3 text-[14.5px]", bg)} role={tone === "block" ? "alert" : "status"}>
      <LevelIcon level={tone} className="mt-0.5" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
