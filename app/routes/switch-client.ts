import { redirect } from "react-router";
import { authContext, setActiveClient } from "~/lib/auth.server";
import type { Route } from "./+types/switch-client";

export async function action({ request, context }: Route.ActionArgs) {
  const auth = context.get(authContext);
  const form = await request.formData();
  const orgId = String(form.get("organizationId") ?? "");
  const to = String(form.get("redirectTo") ?? "/check");
  const headers = await setActiveClient(request, auth, orgId);
  if (!headers) throw new Response("You don't have access to that client.", { status: 403 });
  // Admin pages for one client don't follow the switch; send them to the checker instead
  const target = to.startsWith("/") && !to.startsWith("//") && !to.startsWith("/admin/clients/") ? to : "/check";
  return redirect(target, { headers });
}

export function loader() {
  return redirect("/check");
}
