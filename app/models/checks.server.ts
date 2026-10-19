import { and, desc, eq, ilike } from "drizzle-orm";
import { evaluate, inputNotes, type CheckInput } from "~/engine";
import { db, newId, schema } from "~/lib/db.server";
import type { StoredResult } from "../../db/schema";
import { ratesOn } from "./rates.server";
import { getRuleSet } from "./rules.server";
import { getLookup } from "./vies.server";

export type SaveCheckResult = { ok: true; id: string } | { ok: false; error: string };

/**
 * Saves a checked sale to the client's log. The result is worked out again here from the
 * published rules and the stored VIES answer, so the log never depends on what the browser sent.
 */
export async function saveCheck(input: {
  organizationId: string;
  userId: string;
  ruleSetId: string;
  orderRef: string;
  sale: CheckInput;
  viesLookupId: string | null;
}): Promise<SaveCheckResult> {
  const ruleSet = await getRuleSet(input.organizationId, input.ruleSetId);
  if (!ruleSet || ruleSet.status !== "published" || ruleSet.version === null) return { ok: false, error: "Those rules are no longer available. Reload the page and check again." };

  const sale: CheckInput = { ...input.sale, vies: "unchecked" };
  let viesLookupId: string | null = null;
  if (sale.type === "B2B" && input.viesLookupId) {
    const lookup = await getLookup(input.organizationId, input.viesLookupId);
    if (lookup && `${lookup.countryCode}${lookup.vatNumber}` === (sale.vatNumber ?? "").toUpperCase()) {
      viesLookupId = lookup.id;
      if (lookup.state !== "error") sale.vies = lookup.state;
    }
  }
  if (sale.type !== "B2B") sale.vatNumber = "";

  const res = evaluate(sale, { rules: ruleSet.rules, rates: await ratesOn() });
  const result: StoredResult = {
    code: res.code,
    rate: res.rate,
    level: res.level,
    entity: res.entity,
    invoice: res.invoice,
    notes: [...res.notes, ...inputNotes(sale)],
    ruleId: res.rule?.id ?? null,
    ruleName: res.rule?.name ?? null,
    downgraded: res.f.downgraded,
  };
  const id = newId("chk");
  await db().insert(schema.saleCheck).values({
    id,
    organizationId: input.organizationId,
    userId: input.userId,
    ruleSetId: ruleSet.id,
    ruleSetVersion: ruleSet.version,
    orderRef: input.orderRef.trim() || null,
    input: sale,
    result,
    viesLookupId,
  });
  return { ok: true, id };
}

export async function listChecks(organizationId: string, q: string | null, limit = 200) {
  const where = q
    ? and(eq(schema.saleCheck.organizationId, organizationId), ilike(schema.saleCheck.orderRef, `%${q.replace(/[%_\\]/g, (m) => "\\" + m)}%`))
    : eq(schema.saleCheck.organizationId, organizationId);
  return db()
    .select({
      id: schema.saleCheck.id,
      orderRef: schema.saleCheck.orderRef,
      input: schema.saleCheck.input,
      result: schema.saleCheck.result,
      ruleSetVersion: schema.saleCheck.ruleSetVersion,
      createdAt: schema.saleCheck.createdAt,
      userName: schema.user.name,
    })
    .from(schema.saleCheck)
    .leftJoin(schema.user, eq(schema.saleCheck.userId, schema.user.id))
    .where(where)
    .orderBy(desc(schema.saleCheck.createdAt))
    .limit(limit);
}

export async function getCheck(organizationId: string, id: string) {
  const [row] = await db()
    .select({
      check: schema.saleCheck,
      userName: schema.user.name,
      userEmail: schema.user.email,
      vies: schema.viesLookup,
    })
    .from(schema.saleCheck)
    .leftJoin(schema.user, eq(schema.saleCheck.userId, schema.user.id))
    .leftJoin(schema.viesLookup, eq(schema.saleCheck.viesLookupId, schema.viesLookup.id))
    .where(and(eq(schema.saleCheck.organizationId, organizationId), eq(schema.saleCheck.id, id)))
    .limit(1);
  return row ?? null;
}
