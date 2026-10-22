// Placeholder outlines shown the moment someone clicks through to another page, while its data
// loads. Each one mirrors the real page's layout and uses its real title, so the switch to the
// finished page is a fill-in rather than a jump.
import { useEffect, useState, type ReactNode } from "react";
import { Breadcrumbs, Card, cx } from "./ui";

/**
 * True once `on` has stayed true for `ms`. Skeletons wait a moment before showing, so a page whose
 * data was already fetched on hover appears directly instead of flashing its outline first.
 */
export function useAfter(on: boolean, ms: number) {
  const [late, setLate] = useState(false);
  useEffect(() => {
    if (!on) {
      setLate(false);
      return;
    }
    const t = setTimeout(() => setLate(true), ms);
    return () => clearTimeout(t);
  }, [on, ms]);
  return on && late;
}

/** One grey placeholder bar */
export function Bone({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cx("block h-3.5 animate-pulse rounded-field bg-btn", className)} />;
}

function Header({ title, crumbs, intro = true, actions }: { title?: ReactNode; crumbs?: ReactNode; intro?: boolean; actions?: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5">
        {title ? <h1 className="text-[18px] font-medium leading-tight">{title}</h1> : <Bone className="h-[22px] w-56" />}
        {crumbs ? <span className="text-[13.5px] text-ink">{crumbs}</span> : null}
      </div>
      {intro || actions ? (
        <div className="mt-2.5 flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
          {intro ? (
            <div className="grid w-full max-w-[75ch] gap-2">
              <Bone className="w-full" />
              <Bone className="w-2/3" />
            </div>
          ) : <span />}
          {actions}
        </div>
      ) : null}
    </div>
  );
}

function TableCard({ cols, rows = 6, className }: { cols: string[]; rows?: number; className?: string }) {
  return (
    <Card className={cx("overflow-hidden", className)}>
      <div className="grid gap-4 border-b border-line px-4 py-3" style={{ gridTemplateColumns: cols.map(() => "minmax(0,1fr)").join(" ") }}>
        {cols.map((c, i) => <span key={i} className="truncate font-semibold text-head">{c}</span>)}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid gap-4 border-b border-line px-4 py-[15px] last:border-b-0" style={{ gridTemplateColumns: cols.map(() => "minmax(0,1fr)").join(" ") }}>
          {cols.map((_, j) => <Bone key={j} className={j === 0 ? "w-4/5" : j % 2 ? "w-3/5" : "w-2/5"} />)}
        </div>
      ))}
    </Card>
  );
}

function FormCard({ title, fields = 2 }: { title: string; fields?: number }) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4"><h2 className="text-[15px] font-medium">{title}</h2></div>
      <div className="grid gap-3.5 p-5">
        {Array.from({ length: fields }, (_, i) => (
          <div key={i} className="grid gap-2">
            <Bone className="w-28" />
            <Bone className="h-[38px] w-full" />
          </div>
        ))}
        <Bone className="h-[38px] w-full" />
      </div>
    </Card>
  );
}

function RowsCard({ rows = 5, status }: { rows?: number; status?: boolean }) {
  return (
    <Card className="overflow-hidden">
      {status ? <div className="h-[46px] animate-pulse bg-sunken" /> : null}
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid gap-2 border-t border-line px-5 py-3.5 first:border-t-0 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4">
          <Bone className="w-24" />
          <Bone className={i % 2 ? "w-1/2" : "w-4/5"} />
        </div>
      ))}
    </Card>
  );
}

function CheckSkeleton() {
  return (
    <>
      <Header title="Check a sale" />
      <CheckerBody />
    </>
  );
}

/** The checker's two panels: the sale on the left, the result on the right */
function CheckerBody() {
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-7">
      <Card className="grid grid-cols-1 overflow-hidden sm:grid-cols-2">
        {["Ships from", "Delivered to", "Customer based in", "Customer type"].map((label, i) => (
          <div key={label} className={cx("flex flex-col gap-2.5 border-line px-5 pt-4 pb-5", i > 1 && "border-t", i === 1 && "max-sm:border-t", i % 2 === 0 && "sm:border-r")}>
            <span className="flex items-center gap-2 text-[14px] font-medium text-head">
              <span className="inline-grid size-[22px] place-items-center rounded-full bg-accent-soft text-[11.5px] font-semibold text-accent">{i + 1}</span>
              {label}
            </span>
            <Bone className="h-[38px] w-full" />
          </div>
        ))}
      </Card>
      <Card className="overflow-hidden">
        <div className="h-[46px] animate-pulse bg-sunken" />
        <div className="grid gap-3 px-5 pt-5 pb-6">
          <Bone className="h-12 w-32" />
          <Bone className="w-40" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid gap-2 border-t border-line px-5 py-4">
            <Bone className="w-24" />
            <Bone className={i === 1 ? "w-full" : "w-3/4"} />
          </div>
        ))}
      </Card>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <>
      <Header title="Saved checks" actions={<div className="flex gap-2"><Bone className="h-[38px] w-[200px]" /><Bone className="h-[38px] w-[76px]" /></div>} />
      <TableCard cols={["When", "Order ref", "Sale", "Result", "By"]} rows={8} />
    </>
  );
}

function CheckDetailSkeleton() {
  return (
    <>
      <Header crumbs="Saved checks" actions={<Bone className="h-[31px] w-40" />} />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <RowsCard rows={5} status />
        <RowsCard rows={4} />
      </div>
    </>
  );
}

function ClientsSkeleton() {
  return (
    <>
      <Header title="Clients" />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TableCard cols={["Client", "Live rules", "Draft edited", "Staff", "Checks (30 days)"]} rows={3} />
        <FormCard title="Add a client" />
      </div>
    </>
  );
}

function RatesSkeleton() {
  return (
    <>
      <Header title="Standard VAT rates" />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TableCard cols={["Country", "Rate today", "Since", "Scheduled"]} rows={10} />
        <FormCard title="Add a rate change" fields={3} />
      </div>
    </>
  );
}

export const CLIENT_TABS = [
  { path: "", label: "Draft rules" },
  { path: "/try", label: "Try the draft" },
  { path: "/versions", label: "Published versions" },
  { path: "/users", label: "Staff accounts" },
] as const;

/** The inside of one of a client's admin tabs while it loads ("" is Draft rules) */
export function ClientTabSkeleton({ tab }: { tab: string }) {
  if (tab === "/try") return <CheckerBody />;
  if (tab === "/versions") {
    return (
      <>
        <Header title="Published versions" />
        <Card className="grid gap-2.5 p-5">
          <Bone className="h-4 w-56" />
          <Bone className="w-3/4" />
          <Bone className="w-40" />
        </Card>
      </>
    );
  }
  if (tab === "/users") {
    return (
      <>
        <Header title="Staff accounts" />
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <TableCard cols={["Name", "Email", "Role", ""]} rows={2} />
          <FormCard title="Add someone" fields={3} />
        </div>
      </>
    );
  }
  return (
    <Card className="overflow-hidden">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-t border-line px-5 py-4 first:border-t-0">
          <Bone className="h-[22px] w-[22px] rounded-full" />
          <div className="grid flex-1 gap-2">
            <Bone className={i % 3 === 1 ? "w-1/2" : "w-2/3"} />
            <Bone className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </Card>
  );
}

function ClientSkeleton({ name, tab }: { name?: string; tab: string }) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          {name ? <h1 className="text-[18px] font-medium leading-tight">{name}</h1> : <Bone className="h-[22px] w-48" />}
          <Bone className="w-36" />
        </div>
        <Breadcrumbs items={[{ label: "Clients", to: "/admin" }, ...(name ? [{ label: name }] : [])]} />
      </div>
      <div className="mb-5 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
        {CLIENT_TABS.map((t) => (
          <span key={t.path} className={cx("-mb-px inline-flex items-center border-b-2 px-4 py-3 text-[14px] font-medium whitespace-nowrap", t.path === tab ? "border-primary text-accent" : "border-transparent text-nav")}>
            {t.label}
          </span>
        ))}
      </div>
      <ClientTabSkeleton tab={tab} />
    </>
  );
}

function GenericSkeleton({ title }: { title?: string }) {
  return (
    <>
      <Header title={title} />
      <Card className="grid gap-3 p-5">
        {[0, 1, 2, 3, 4].map((i) => <Bone key={i} className={i % 2 ? "w-3/4" : "w-full"} />)}
      </Card>
    </>
  );
}

/** Which page a path belongs to, so moving between a client's tabs doesn't count as a new page */
export function pageKey(pathname: string): string {
  const client = pathname.match(/^\/admin\/clients\/[^/]+/);
  if (client) return client[0];
  return pathname.replace(/\/+$/, "") || "/";
}

/** The outline of the page at `pathname` */
export function PageSkeleton({ pathname, clients }: { pathname: string; clients: { slug: string; name: string }[] }) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/check") return <CheckSkeleton />;
  if (path === "/history") return <HistorySkeleton />;
  if (path.startsWith("/history/")) return <CheckDetailSkeleton />;
  if (path === "/admin") return <ClientsSkeleton />;
  if (path === "/admin/rates") return <RatesSkeleton />;
  const client = path.match(/^\/admin\/clients\/([^/]+)(\/.*)?$/);
  if (client) {
    const name = clients.find((c) => c.slug === decodeURIComponent(client[1]))?.name;
    return <ClientSkeleton name={name} tab={client[2] ?? ""} />;
  }
  if (path === "/help") return <GenericSkeleton title="How to" />;
  return <GenericSkeleton />;
}
