import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";
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

const line = { stroke: "currentColor", strokeWidth: 1.7, fill: "none", strokeLinecap: "round", strokeLinejoin: "round" } as const;
export const IconCheckSale = ({ className, size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className={className}>
    <rect x="4" y="3.5" width="12" height="14" rx="2" {...line} />
    <path d="M7.5 3.5V2.6h5v.9M7.3 10.6l1.9 1.9 3.6-3.8" {...line} />
  </svg>
);
export const IconHistory = ({ className, size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className={className}>
    <path d="M3.3 10a6.7 6.7 0 1 0 2-4.8M3.2 3.6v3h3" {...line} />
    <path d="M10 6.6V10l2.4 1.6" {...line} />
  </svg>
);
export const IconClients = ({ className, size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className={className}>
    <rect x="3" y="6.5" width="14" height="10" rx="1.8" {...line} />
    <path d="M7.3 6.5V4.8a1.3 1.3 0 0 1 1.3-1.3h2.8a1.3 1.3 0 0 1 1.3 1.3v1.7M3 11h14" {...line} />
  </svg>
);
export const IconPercent = ({ className, size = 18 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className={className}>
    <path d="M15 5 5 15" {...line} />
    <circle cx="6.2" cy="6.2" r="2" {...line} />
    <circle cx="13.8" cy="13.8" r="2" {...line} />
  </svg>
);
export const IconMenu = ({ className, size = 20 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className={className}><path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" {...line} /></svg>
);
export const IconChevronDown = ({ className, size = 14 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true" className={className}><path d="M3.5 5.3 7 8.8l3.5-3.5" {...line} /></svg>
);
export const IconChevronRight = ({ className, size = 12 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true" className={className}><path d="M5.3 3.5 8.8 7l-3.5 3.5" {...line} strokeWidth={2} /></svg>
);
export const IconLogout = ({ className, size = 16 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" className={className}>
    <path d="M8 16.5H5.2a1.7 1.7 0 0 1-1.7-1.7V5.2a1.7 1.7 0 0 1 1.7-1.7H8M12.5 13.5 16 10l-3.5-3.5M16 10H8" {...line} />
  </svg>
);
/** The app's own mark: a percent sign on the primary colour */
export const LogoMark = ({ className, size = 28 }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className={className}>
    <rect width="28" height="28" rx="7" fill="var(--color-primary)" />
    <path d="M18.5 9.5l-9 9" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="10.2" cy="10.2" r="2.1" fill="none" stroke="#fff" strokeWidth="2" />
    <circle cx="17.8" cy="17.8" r="2.1" fill="none" stroke="#fff" strokeWidth="2" />
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
  default: "border-line bg-btn text-ink hover:enabled:bg-btn-hover [&:is(a)]:hover:bg-btn-hover",
  primary: "border-primary bg-primary text-on-primary hover:enabled:bg-primary-hover hover:enabled:border-primary-hover [&:is(a)]:hover:bg-primary-hover",
  danger: "border-transparent bg-block-soft text-block hover:enabled:brightness-95",
  ghost: "border-transparent bg-transparent text-ink hover:enabled:bg-btn",
};
const SIZE: Record<Size, string> = {
  md: "min-h-[38px] px-3.5 py-[7px] text-[14px]",
  sm: "min-h-[31px] px-2.5 py-1 text-[12.5px]",
};

export function buttonClass(variant: Variant = "default", size: Size = "md", extra?: string) {
  return cx(
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-btn border font-medium transition-[background-color,border-color,filter] disabled:cursor-default disabled:opacity-55",
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
        "inline-grid size-8 place-items-center rounded-btn border border-line bg-btn text-nav hover:enabled:bg-btn-hover hover:enabled:text-accent disabled:cursor-default disabled:opacity-35",
        className,
      )}
      {...rest}
    />
  );
}

// ---------- Small pieces ----------

export function Chip({ tone = "muted", children, className }: { tone?: "muted" | "accent" | "ok" | "warn" | "block" | "outline-warn" | "outline-accent"; children: ReactNode; className?: string }) {
  const tones = {
    muted: "bg-btn text-muted",
    accent: "bg-accent-soft text-accent",
    ok: "bg-ok-soft text-ok",
    warn: "bg-warn-soft text-warn",
    block: "bg-block-soft text-block",
    "outline-warn": "bg-warn-soft text-warn",
    "outline-accent": "bg-accent-soft text-accent",
  } as const;
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-field px-1.5 py-px text-[12px] font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-card border border-line bg-surface", className)}>{children}</div>;
}

/** Card title row with a line under it, as in Minia's card headers */
export function CardHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-medium">{title}</h2>
        {sub ? <p className="mt-0.5 text-[13px] text-muted">{sub}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export type Crumb = { label: ReactNode; to?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-[13.5px]">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {c.to && !last ? <Link to={c.to} className="text-ink hover:text-accent">{c.label}</Link> : <span className={last ? "text-muted" : "text-ink"} aria-current={last ? "page" : undefined}>{c.label}</span>}
              {!last ? <IconChevronRight className="text-ink" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, intro, actions, eyebrow, crumbs }: { title: ReactNode; intro?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode; crumbs?: Crumb[] }) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
          <h1 className="text-[18px] font-medium leading-tight">{title}</h1>
        </div>
        {crumbs?.length ? <Breadcrumbs items={crumbs} /> : null}
      </div>
      {intro || actions ? (
        <div className="mt-1.5 flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
          {intro ? <p className="max-w-[75ch] text-muted">{intro}</p> : <span />}
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

export function BoxNo({ n, dim }: { n: number | string; dim?: boolean }) {
  return (
    <span
      className={cx(
        "inline-grid size-[22px] shrink-0 place-items-center rounded-full text-[11.5px] font-semibold tracking-normal",
        dim ? "bg-btn text-muted" : "bg-accent-soft text-accent",
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
    <div className={cx("flex items-center gap-2.5 px-5 py-3 text-[14px] font-semibold", tone)}>
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
        <b className="tabular block text-[15px] font-medium text-head">{title}</b>
        <span className="text-[13px] text-muted">{sub}</span>
      </div>
    </div>
  );
}

export function Notes({ notes }: { notes: { level: NoteLevel; text: string }[] }) {
  return (
    <ul className="grid gap-2">
      {notes.map((n, i) => (
        <li key={i} className="flex items-start gap-2.5 text-[14px]">
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
    <div role="radiogroup" aria-labelledby={labelledBy} className="flex flex-wrap gap-[3px] rounded-btn border border-field bg-surface p-[3px]">
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
          <span className="block whitespace-nowrap rounded-[3px] px-3 py-1.5 text-center text-[14px] font-medium text-muted hover:text-ink peer-checked:bg-accent-soft peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

export function FieldLabel({ htmlFor, children, className }: { htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <label htmlFor={htmlFor} className={cx("text-[14px] font-medium", className)}>
      {children}
    </label>
  );
}

export function Banner({ tone, children }: { tone: NoteLevel; children: ReactNode }) {
  const bg = { ok: "bg-ok-soft", warn: "bg-warn-soft", block: "bg-block-soft", info: "bg-accent-soft" }[tone];
  return (
    <div className={cx("flex items-start gap-2.5 rounded-card px-4 py-3 text-[14px]", bg)} role={tone === "block" ? "alert" : "status"}>
      <LevelIcon level={tone} className="mt-0.5" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
