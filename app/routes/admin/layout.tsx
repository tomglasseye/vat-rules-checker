import { NavLink, Outlet } from "react-router";
import { cx } from "~/components/ui";
import { requireAdmin } from "~/lib/auth.server";
import type { Route } from "./+types/layout";

export const middleware: Route.MiddlewareFunction[] = [requireAdmin];

const sub = ({ isActive }: { isActive: boolean }) =>
  cx("rounded-full border px-3 py-1 text-[13px] font-semibold", isActive ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink hover:border-accent hover:text-accent");

export default function AdminLayout() {
  return (
    <>
      <nav aria-label="Admin" className="mb-5 flex flex-wrap gap-1.5">
        <NavLink to="/admin" end className={({ isActive }) => sub({ isActive: isActive })}>Clients</NavLink>
        <NavLink to="/admin/rates" className={sub}>VAT rates</NavLink>
      </nav>
      <Outlet />
    </>
  );
}
