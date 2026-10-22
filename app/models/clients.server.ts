import { and, asc, eq, sql } from "drizzle-orm";
import { starterRules, starterTests } from "~/engine";
import { db, newId, schema } from "~/lib/db.server";

export async function getClientBySlug(slug: string) {
  const [org] = await db().select().from(schema.organization).where(eq(schema.organization.slug, slug)).limit(1);
  return org ?? null;
}

/** Every client with its counts for the Clients page, in one query rather than one per figure */
export async function listClientsWithStats() {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const o = schema.organization;
  return db()
    .select({
      id: o.id,
      name: o.name,
      slug: o.slug,
      users: sql<number>`(select count(*) from ${schema.member} m where m.organization_id = ${o}.id)`.mapWith(Number),
      checks30d: sql<number>`(
        select count(*) from ${schema.saleCheck} sc
        where sc.organization_id = ${o}.id and sc.created_at >= ${since.toISOString()}
      )`.mapWith(Number),
      publishedVersion: sql<number | null>`(
        select max(rs.version) from ${schema.ruleSet} rs where rs.organization_id = ${o}.id
      )`.mapWith((v) => (v === null ? null : Number(v))),
      draftUpdatedAt: sql<Date | null>`(
        select rs.updated_at from ${schema.ruleSet} rs where rs.organization_id = ${o}.id and rs.status = 'draft'
      )`.mapWith(schema.ruleSet.updatedAt),
    })
    .from(o)
    .orderBy(asc(o.name));
}

export function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** New client with a draft rule set copied from another client, or from the starter set */
export async function createClient(input: { name: string; copyFrom: string | null; userId: string }) {
  const base = slugify(input.name) || "client";
  let slug = base;
  for (let i = 2; await getClientBySlug(slug); i++) slug = `${base}-${i}`;
  const id = newId("org");
  await db().insert(schema.organization).values({ id, name: input.name.trim(), slug });

  let rules = starterRules(), tests = starterTests();
  if (input.copyFrom) {
    const [src] = await db()
      .select({ rules: schema.ruleSet.rules, tests: schema.ruleSet.tests })
      .from(schema.ruleSet)
      .where(and(eq(schema.ruleSet.organizationId, input.copyFrom), eq(schema.ruleSet.status, "draft")))
      .limit(1);
    if (src) ({ rules, tests } = src);
  }
  await db().insert(schema.ruleSet).values({ id: newId("rs"), organizationId: id, status: "draft", rules, tests, updatedBy: input.userId });
  return { id, slug };
}

export async function listMembers(organizationId: string) {
  return db()
    .select({ memberId: schema.member.id, role: schema.member.role, userId: schema.user.id, name: schema.user.name, email: schema.user.email, since: schema.member.createdAt })
    .from(schema.member)
    .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
    .where(eq(schema.member.organizationId, organizationId))
    .orderBy(asc(schema.user.name));
}

export type MemberRole = "owner" | "admin" | "member";

/** Adds someone to a client, creating their account if it doesn't exist yet */
export async function addMember(organizationId: string, input: { name: string; email: string; role: MemberRole }) {
  const email = input.email.trim().toLowerCase();
  let [u] = await db().select().from(schema.user).where(eq(schema.user.email, email)).limit(1);
  if (!u) {
    [u] = await db().insert(schema.user).values({ id: newId("usr"), name: input.name.trim() || email, email, role: "user" }).returning();
  }
  if (u.role === "admin") return { ok: false as const, error: "That's a PVM admin account, which can already see every client." };
  const inserted = await db()
    .insert(schema.member)
    .values({ id: newId("mem"), organizationId, userId: u.id, role: input.role })
    .onConflictDoNothing()
    .returning({ id: schema.member.id });
  if (!inserted.length) return { ok: false as const, error: `${email} already has access to this client.` };
  return { ok: true as const };
}

export async function removeMember(organizationId: string, memberId: string) {
  await db().delete(schema.member).where(and(eq(schema.member.organizationId, organizationId), eq(schema.member.id, memberId)));
}
