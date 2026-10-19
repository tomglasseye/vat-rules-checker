import { and, asc, desc, eq, gt, lte } from "drizzle-orm";
import type { Rates } from "~/engine";
import { db, newId, schema } from "~/lib/db.server";

/** Today's date (UTC) as YYYY-MM-DD */
export const today = () => new Date().toISOString().slice(0, 10);

/** Standard rates in force on a date: for each country, the latest row on or before it */
export async function ratesOn(day = today()): Promise<Rates> {
  const rows = await db()
    .selectDistinctOn([schema.vatRate.country], { country: schema.vatRate.country, rate: schema.vatRate.rate })
    .from(schema.vatRate)
    .where(lte(schema.vatRate.effectiveFrom, day))
    .orderBy(schema.vatRate.country, desc(schema.vatRate.effectiveFrom));
  return Object.fromEntries(rows.map((r) => [r.country, Number(r.rate)]));
}

export async function allRates() {
  return db().select().from(schema.vatRate).orderBy(asc(schema.vatRate.country), desc(schema.vatRate.effectiveFrom));
}

export async function addRate(input: { country: string; rate: number; effectiveFrom: string; source: string | null; userId: string }) {
  await db()
    .insert(schema.vatRate)
    .values({ id: newId("rate"), country: input.country, rate: input.rate, effectiveFrom: input.effectiveFrom, source: input.source, createdBy: input.userId })
    .onConflictDoUpdate({
      target: [schema.vatRate.country, schema.vatRate.effectiveFrom],
      set: { rate: input.rate, source: input.source, createdBy: input.userId },
    });
}

/** Only changes that haven't started yet can be removed; past rates are history */
export async function deleteFutureRate(id: string) {
  const res = await db()
    .delete(schema.vatRate)
    .where(and(eq(schema.vatRate.id, id), gt(schema.vatRate.effectiveFrom, today())))
    .returning({ id: schema.vatRate.id });
  return res.length > 0;
}
