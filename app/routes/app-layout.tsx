import { useEffect, useRef, useState, type ReactNode } from "react";
import { Form, Link, Outlet, useLocation, useRouteLoaderData, useSubmit } from "react-router";
import { ThemeToggle } from "~/components/ThemeToggle";
import {
  IconCheckSale, IconChevronDown, IconClients, IconHistory, IconLogout, IconMenu, IconPercent, LogoMark, buttonClass, cx,
} from "~/components/ui";
import { authContext, requireUser } from "~/lib/auth.server";
import type { Route } from "./+types/app-layout";

export const middleware: Route.MiddlewareFunction[] = [requireUser];

export function loader({ context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  return {
    user: { name: auth.user.name, email: auth.user.email },
    isAdmin: auth.isAdmin,
    clients: auth.clients.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
    activeClient: auth.activeClient ? { id: auth.activeClient.id, name: auth.activeClient.name, slug: auth.activeClient.slug } : null,
  };
}

/** For child routes that need to know who's signed in on the client side */
export function useAppData() {
  return useRouteLoaderData<typeof loader>("routes/app-layout")!;
}

function ClientSwitcher({ clients, activeId, isAdmin }: { clients: { id: string; name: string }[]; activeId: string | null; isAdmin: boolean }) {
  const submit = useSubmit();
  const location = useLocation();
  const label = <span className="hidden text-[13px] text-muted sm:inline">{isAdmin ? "Viewing" : "Client"}</span>;
  if (!clients.length) return <span className="text-muted">No clients yet</span>;
  if (clients.length === 1) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        {label}
        <span className="truncate rounded-field bg-sunken px-3 py-2 font-medium">{clients[0].name}</span>
      </div>
    );
  }
  return (
    <Form method="post" action="/switch-client" className="flex min-w-0 items-center gap-2">
      <input type="hidden" name="redirectTo" value={location.pathname.startsWith("/history/") ? "/history" : location.pathname} />
      <label htmlFor="client-switch" className="contents">{label}<span className="sr-only">Client</span></label>
      <select
        id="client-switch"
        name="organizationId"
        defaultValue={activeId ?? undefined}
        key={activeId}
        onChange={(e) => submit(e.currentTarget.form)}
        className="field-control w-auto max-w-[min(260px,45vw)] border-transparent bg-sunken font-medium"
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <noscript><button type="submit" className={buttonClass("default", "sm")}>Switch</button></noscript>
    </Form>
  );
}

function NavItem({ to, icon, active, children }: { to: string; icon: ReactNode; active: boolean; children: ReactNode }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex items-center gap-3 px-6 py-2.5 text-[14px] font-medium transition-colors",
        active ? "text-accent" : "text-nav hover:text-accent",
      )}
    >
      <span className="inline-flex shrink-0">{icon}</span>
      {children}
    </Link>
  );
}

function NavTitle({ children }: { children: ReactNode }) {
  return <div className="px-6 pt-5 pb-2 text-[12px] font-medium text-muted">{children}</div>;
}

function Initials({ name }: { name: string }) {
  const letters = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return <span className="inline-grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent">{letters || "?"}</span>;
}

function UserMenu({ user, isAdmin }: { user: { name: string; email: string }; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  return (
    <div ref={ref} className="relative h-full">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className="flex h-full items-center gap-2.5 border-l border-line bg-sunken px-3 hover:text-head sm:px-4"
      >
        <Initials name={user.name} />
        <span className="hidden max-w-[160px] truncate font-medium sm:block">{user.name}</span>
        <IconChevronDown className="hidden text-muted sm:block" />
        <span className="sr-only">Account menu</span>
      </button>
      {open ? (
        <div role="menu" className="absolute top-full right-0 z-50 mt-px w-64 rounded-b-card border border-line bg-surface py-2 shadow-[0_8px_24px_rgb(0_0_0/0.08)]">
          <div className="border-b border-line px-4 pt-1 pb-3">
            <div className="truncate font-medium text-head">{user.name}</div>
            <div className="truncate text-[13px] text-muted">{user.email}</div>
            <div className="mt-1 text-[12px] text-muted">{isAdmin ? "PVM admin" : "Client staff"}</div>
          </div>
          <Form method="post" action="/logout">
            <button type="submit" role="menuitem" className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-sunken hover:text-head">
              <IconLogout className="text-muted" />Sign out
            </button>
          </Form>
        </div>
      ) : null}
    </div>
  );
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const root = useRouteLoaderData<{ theme: "system" | "light" | "dark" }>("root");
  const { user, isAdmin, clients, activeClient } = loaderData;
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="min-h-dvh">
      {/* Sidebar: fixed on large screens, slides in from the left on smaller ones */}
      <aside
        id="sidebar"
        className={cx(
          "fixed inset-y-0 left-0 z-50 flex w-[250px] flex-col border-r border-line bg-side transition-transform duration-200 lg:translate-x-0",
          menuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[70px] shrink-0 items-center gap-2.5 px-6">
          <Link to="/" className="flex items-center gap-2.5 text-[16px] font-semibold whitespace-nowrap text-head">
            <LogoMark size={26} />
            VAT Rules Checker
          </Link>
        </div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto pb-6">
          <NavTitle>Menu</NavTitle>
          <NavItem to="/check" icon={<IconCheckSale />} active={pathname.startsWith("/check")}>Check a sale</NavItem>
          <NavItem to="/history" icon={<IconHistory />} active={pathname.startsWith("/history")}>Saved checks</NavItem>
          {isAdmin ? (
            <>
              <NavTitle>Admin</NavTitle>
              <NavItem to="/admin" icon={<IconClients />} active={pathname === "/admin" || pathname.startsWith("/admin/clients")}>Clients</NavItem>
              <NavItem to="/admin/rates" icon={<IconPercent />} active={pathname.startsWith("/admin/rates")}>VAT rates</NavItem>
            </>
          ) : null}
        </nav>
        <div className="shrink-0 px-6 py-4 text-[12px] text-muted">PVM Consultants</div>
      </aside>
      {menuOpen ? (
        <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-40 bg-[rgb(0_0_0/0.45)] lg:hidden" />
      ) : null}

      <div className="flex min-h-dvh flex-col lg:pl-[250px]">
        <header className="sticky top-0 z-30 flex h-[70px] shrink-0 items-center border-b border-line bg-surface">
          <div className="flex min-w-0 flex-1 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              aria-label="Open menu"
              aria-controls="sidebar"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="-ml-2 inline-grid size-10 shrink-0 place-items-center rounded-btn text-nav hover:bg-btn hover:text-head lg:hidden"
            >
              <IconMenu />
            </button>
            <Link to="/" className="shrink-0 lg:hidden" aria-label="VAT Rules Checker"><LogoMark size={26} /></Link>
            <ClientSwitcher clients={clients} activeId={activeClient?.id ?? null} isAdmin={isAdmin} />
          </div>
          <div className="flex h-full shrink-0 items-center gap-1">
            <ThemeToggle initial={root?.theme ?? "system"} />
            <UserMenu user={user} isAdmin={isAdmin} />
          </div>
        </header>

        <main className="flex-1 px-4 pt-5 pb-10 sm:px-6 sm:pt-6">
          <Outlet />
        </main>

        <footer className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-line px-4 py-4 text-[13px] text-muted sm:px-6">
          <span>Results follow the rules PVM Consultants has published for {activeClient?.name ?? "your company"}. Rules marked “needs sign-off” are still being confirmed.</span>
          <span>© {new Date().getFullYear()} PVM Consultants</span>
        </footer>
      </div>
    </div>
  );
}
