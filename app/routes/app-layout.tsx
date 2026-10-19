import { Form, Link, NavLink, Outlet, useLocation, useRouteLoaderData, useSubmit } from "react-router";
import { ThemeToggle } from "~/components/ThemeToggle";
import { buttonClass, cx } from "~/components/ui";
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

const navClass = ({ isActive }: { isActive: boolean }) =>
  cx(
    "-mb-px inline-flex items-center border-b-[2.5px] px-3 pt-2.5 pb-2.25 font-semibold whitespace-nowrap",
    isActive ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink",
  );

function ClientSwitcher({ clients, activeId }: { clients: { id: string; name: string }[]; activeId: string | null }) {
  const submit = useSubmit();
  const location = useLocation();
  if (!clients.length) return <span className="text-muted">No clients yet</span>;
  if (clients.length === 1) return <span className="font-semibold">{clients[0].name}</span>;
  return (
    <Form method="post" action="/switch-client" className="inline-flex items-center gap-2">
      <input type="hidden" name="redirectTo" value={location.pathname.startsWith("/history/") ? "/history" : location.pathname} />
      <label htmlFor="client-switch" className="sr-only">Client</label>
      <select
        id="client-switch"
        name="organizationId"
        defaultValue={activeId ?? undefined}
        key={activeId}
        onChange={(e) => submit(e.currentTarget.form)}
        className="field-control min-h-8 w-auto max-w-[260px] py-1 text-[14px] font-semibold"
      >
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <noscript><button type="submit" className={buttonClass("default", "sm")}>Switch</button></noscript>
    </Form>
  );
}

export default function AppLayout({ loaderData }: Route.ComponentProps) {
  const root = useRouteLoaderData<{ theme: "system" | "light" | "dark" }>("root");
  const { user, isAdmin, clients, activeClient } = loaderData;
  return (
    <div className="mx-auto max-w-[1180px] px-4 pt-4 pb-14 sm:px-7 sm:pt-5 sm:pb-18">
      <header className="mb-1 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
          <Link to="/" className="wide text-[20px] font-bold tracking-[-0.01em] whitespace-nowrap">VAT Rules Checker</Link>
          <div className="flex min-w-0 items-center gap-2 text-[14px]">
            <span className="text-muted">{isAdmin ? "Viewing" : "for"}</span>
            <ClientSwitcher clients={clients} activeId={activeClient?.id ?? null} />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle initial={root?.theme ?? "system"} />
          <div className="hidden text-right text-[13px] leading-tight sm:block">
            <div className="font-semibold">{user.name}</div>
            <div className="text-muted">{user.email}</div>
          </div>
          <Form method="post" action="/logout">
            <button type="submit" className={buttonClass("default", "sm")}>Sign out</button>
          </Form>
        </div>
      </header>

      <nav aria-label="Main" className="mb-6 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
        <NavLink to="/check" className={navClass}>Check a sale</NavLink>
        <NavLink to="/history" className={navClass}>Saved checks</NavLink>
        {isAdmin ? <NavLink to="/admin" className={navClass}>Admin</NavLink> : null}
      </nav>

      <Outlet />

      <footer className="mt-10 grid gap-1 border-t border-line pt-4 text-[13px] text-muted">
        <span>Results follow the rules PVM Consultants has published for {activeClient?.name ?? "your company"}. Rules marked “needs sign-off” are still being confirmed.</span>
      </footer>
    </div>
  );
}
