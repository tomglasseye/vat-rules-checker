// Live VAT number checks against the European Commission's VIES service.
// Browsers can't call VIES directly (no cross-site requests), so the checker asks the server.
// Every answer is stored as audit evidence. An unavailable member-state system is never treated
// as an invalid number.
import { and, eq } from "drizzle-orm";
import { db, newId, schema } from "~/lib/db.server";
import { env } from "~/lib/env.server";

const VIES_URL = "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";
const BUSY = new Set(["MS_UNAVAILABLE", "MS_MAX_CONCURRENT_REQ", "GLOBAL_MAX_CONCURRENT_REQ", "SERVICE_UNAVAILABLE", "TIMEOUT"]);
const clean = (v: unknown) => (v && String(v).trim() !== "---" ? String(v).trim() : "");

export type ViesState = "valid" | "invalid" | "unavailable" | "error";

export interface ViesAnswer {
  state: ViesState;
  code?: string;
  name?: string;
  address?: string;
  requestIdentifier?: string;
  requestDate?: string | null;
}

export async function askVies(countryCode: string, vatNumber: string): Promise<ViesAnswer> {
  const payload: Record<string, string> = { countryCode, vatNumber };
  const requester = env.viesRequester();
  if (requester) {
    payload.requesterMemberStateCode = requester.country;
    payload.requesterNumber = requester.number;
  }
  try {
    const r = await fetch(VIES_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(12_000),
    });
    const data = (await r.json().catch(() => null)) as Record<string, any> | null;
    const code: string | undefined = data?.userError || data?.errorWrappers?.[0]?.error;
    if (code === "INVALID_INPUT") return { state: "error", code };
    if (!r.ok || !data || (code && BUSY.has(code))) return { state: "unavailable", code: code || `HTTP_${r.status}` };
    if (typeof data.valid !== "boolean") return { state: "unavailable", code: code || "NO_RESULT" };
    return {
      state: data.valid ? "valid" : "invalid",
      name: clean(data.name),
      address: clean(data.address),
      requestIdentifier: clean(data.requestIdentifier),
      requestDate: data.requestDate || null,
    };
  } catch (e) {
    return { state: "unavailable", code: e instanceof Error && e.name === "TimeoutError" ? "TIMEOUT" : "NETWORK" };
  }
}

export async function recordLookup(input: { organizationId: string; userId: string; countryCode: string; vatNumber: string; answer: ViesAnswer }) {
  const id = newId("vies");
  await db().insert(schema.viesLookup).values({
    id,
    organizationId: input.organizationId,
    userId: input.userId,
    countryCode: input.countryCode,
    vatNumber: input.vatNumber,
    state: input.answer.state,
    code: input.answer.code ?? null,
    name: input.answer.name || null,
    address: input.answer.address || null,
    requestIdentifier: input.answer.requestIdentifier || null,
    requestDate: input.answer.requestDate ?? null,
  });
  return id;
}

export async function getLookup(organizationId: string, id: string) {
  const [row] = await db()
    .select()
    .from(schema.viesLookup)
    .where(and(eq(schema.viesLookup.organizationId, organizationId), eq(schema.viesLookup.id, id)))
    .limit(1);
  return row ?? null;
}
