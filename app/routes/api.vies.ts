// POST /api/vies { vatNumber } → checks the number with VIES for the signed-in person's active client
// and stores the answer as audit evidence. Signed-in only, so it can't be used as an open proxy.
import { checkVatFormat } from "~/engine";
import { getAuth } from "~/lib/auth.server";
import { askVies, recordLookup } from "~/models/vies.server";
import type { Route } from "./+types/api.vies";

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const auth = await getAuth(request);
  if (!auth) return Response.json({ state: "error", code: "SIGNED_OUT" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { vatNumber?: string; organizationId?: string } | null;
  // Checks are logged against the client being worked on: the one named in the request (PVM admins
  // trying a client's draft rules) or the active client
  const client = body?.organizationId ? auth.clients.find((c) => c.id === body.organizationId) : auth.activeClient;
  if (!client) return Response.json({ state: "error", code: "NO_CLIENT" }, { status: 403 });

  const fmt = checkVatFormat(body?.vatNumber ?? "");
  if (!fmt.ok) return Response.json({ state: "error", code: "BAD_INPUT", reason: fmt.reason }, { status: 400 });

  const countryCode = fmt.clean.slice(0, 2);
  const vatNumber = fmt.clean.slice(2);
  const answer = await askVies(countryCode, vatNumber);
  const id = await recordLookup({ organizationId: client.id, userId: auth.user.id, countryCode, vatNumber, answer });
  return Response.json({ id, number: fmt.clean, country: fmt.country, ...answer });
}

export function loader() {
  return Response.json({ ok: true, service: "vies" });
}
