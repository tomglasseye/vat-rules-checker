import { and, desc, eq, isNotNull, max } from "drizzle-orm";
import { health, starterRules, starterTests, type Rule, type TestScenario } from "~/engine";
import { db, newId, schema } from "~/lib/db.server";
import { ratesOn } from "./rates.server";

export type RuleSetRow = typeof schema.ruleSet.$inferSelect;

/** The version client staff check against: the highest published version */
export async function getPublished(organizationId: string): Promise<RuleSetRow | null> {
  const [row] = await db()
    .select()
    .from(schema.ruleSet)
    .where(and(eq(schema.ruleSet.organizationId, organizationId), eq(schema.ruleSet.status, "published")))
    .orderBy(desc(schema.ruleSet.version))
    .limit(1);
  return row ?? null;
}

export async function getRuleSet(organizationId: string, id: string): Promise<RuleSetRow | null> {
  const [row] = await db()
    .select()
    .from(schema.ruleSet)
    .where(and(eq(schema.ruleSet.organizationId, organizationId), eq(schema.ruleSet.id, id)))
    .limit(1);
  return row ?? null;
}

/** The working copy PVM edits. Created from the latest published version (or the starter set) if missing. */
export async function getDraft(organizationId: string, userId?: string): Promise<RuleSetRow> {
  const [row] = await db()
    .select()
    .from(schema.ruleSet)
    .where(and(eq(schema.ruleSet.organizationId, organizationId), eq(schema.ruleSet.status, "draft")))
    .limit(1);
  if (row) return row;
  const published = await getPublished(organizationId);
  const [created] = await db()
    .insert(schema.ruleSet)
    .values({
      id: newId("rs"),
      organizationId,
      status: "draft",
      rules: published?.rules ?? starterRules(),
      tests: published?.tests ?? starterTests(),
      updatedBy: userId ?? null,
    })
    .onConflictDoNothing()
    .returning();
  return created ?? getDraft(organizationId, userId);
}

export async function saveDraft(organizationId: string, rules: Rule[], tests: TestScenario[], userId: string) {
  const draft = await getDraft(organizationId, userId);
  await db()
    .update(schema.ruleSet)
    .set({ rules, tests, updatedAt: new Date(), updatedBy: userId })
    .where(eq(schema.ruleSet.id, draft.id));
}

export type PublishResult = { ok: true; version: number } | { ok: false; error: string };

/** Copies the draft into a new published version, but only if it passes every check */
export async function publishDraft(organizationId: string, summary: string, userId: string): Promise<PublishResult> {
  const draft = await getDraft(organizationId, userId);
  const h = health(draft.rules, draft.tests, await ratesOn());
  if (!h.ok) {
    const why = [
      h.passed < h.tests.length && `${h.tests.length - h.passed} test${h.tests.length - h.passed === 1 ? " fails" : "s fail"}`,
      h.coverage.gaps > 0 && `${h.coverage.gaps.toLocaleString("en-GB")} sales aren't covered by any rule`,
      h.deadRules > 0 && `${h.deadRules} rule${h.deadRules === 1 ? " never matches" : "s never match"}`,
    ].filter(Boolean);
    return { ok: false, error: `Can't publish yet: ${why.join(", ")}.` };
  }
  const [{ v }] = await db()
    .select({ v: max(schema.ruleSet.version) })
    .from(schema.ruleSet)
    .where(and(eq(schema.ruleSet.organizationId, organizationId), isNotNull(schema.ruleSet.version)));
  const version = (v ?? 0) + 1;
  await db().insert(schema.ruleSet).values({
    id: newId("rs"),
    organizationId,
    status: "published",
    version,
    rules: draft.rules,
    tests: draft.tests,
    summary: summary.trim() || null,
    updatedBy: userId,
    publishedAt: new Date(),
    publishedBy: userId,
  });
  return { ok: true, version };
}

/** Throws away draft edits by copying a published version back into the draft */
export async function resetDraftTo(organizationId: string, version: number, userId: string): Promise<boolean> {
  const [src] = await db()
    .select()
    .from(schema.ruleSet)
    .where(and(eq(schema.ruleSet.organizationId, organizationId), eq(schema.ruleSet.version, version)))
    .limit(1);
  if (!src) return false;
  await saveDraft(organizationId, src.rules, src.tests, userId);
  return true;
}

export async function listVersions(organizationId: string) {
  return db()
    .select({
      id: schema.ruleSet.id,
      version: schema.ruleSet.version,
      summary: schema.ruleSet.summary,
      publishedAt: schema.ruleSet.publishedAt,
      publishedBy: schema.user.name,
      rules: schema.ruleSet.rules,
      tests: schema.ruleSet.tests,
    })
    .from(schema.ruleSet)
    .leftJoin(schema.user, eq(schema.ruleSet.publishedBy, schema.user.id))
    .where(and(eq(schema.ruleSet.organizationId, organizationId), eq(schema.ruleSet.status, "published")))
    .orderBy(desc(schema.ruleSet.version));
}
