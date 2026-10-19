import { Outlet } from "react-router";
import { requireAdmin } from "~/lib/auth.server";
import type { Route } from "./+types/layout";

export const middleware: Route.MiddlewareFunction[] = [requireAdmin];

// Clients and VAT rates are reached from the sidebar
export default function AdminLayout() {
  return <Outlet />;
}
