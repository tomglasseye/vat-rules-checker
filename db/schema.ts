// Database schema. Edit this, then run `npm run db:generate` to write a migration into
// db/migrations (`npm run db:migrate` applies those, and Netlify runs it before every build).
//
// `user`, `organization` and `member` use Better Auth's table and field names, so its
// organization and admin plugins can take them over when real sign-in is added.
// Better Auth will add `session`, `account` and `verification` tables of its own.
import { sql } from "drizzle-orm";
import { boolean, date, doublePrecision, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { CheckInput, Note, Rule, TestScenario } from "../app/engine/types";

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ---- People and client companies (Better Auth shape) ----

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** Platform role (Better Auth admin plugin): "admin" = PVM staff, "user" = client staff */
  role: text("role").notNull().default("user"),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}).enableRLS();

/** A PVM client. Everything the client's staff see is scoped to one of these. */
export const organization = pgTable("organization", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  logo: text("logo"),
  metadata: text("metadata"),
  createdAt: createdAt(),
}).enableRLS();

export const member = pgTable(
  "member",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    /** Better Auth organization roles: owner | admin | member */
    role: text("role").notNull().default("member"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("member_org_user_uq").on(t.organizationId, t.userId), index("member_user_idx").on(t.userId)],
).enableRLS();

// ---- Rules ----

/**
 * Each client has one working draft and a history of published versions.
 * Published rows are never edited; publishing copies the draft into a new version.
 */
export const ruleSet = pgTable(
  "rule_set",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    status: text("status").$type<"draft" | "published">().notNull(),
    /** Null for the draft; 1, 2, 3… once published */
    version: integer("version"),
    rules: jsonb("rules").$type<Rule[]>().notNull(),
    tests: jsonb("tests").$type<TestScenario[]>().notNull(),
    /** What changed, written when publishing */
    summary: text("summary"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedBy: text("published_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    uniqueIndex("rule_set_org_version_uq").on(t.organizationId, t.version),
    uniqueIndex("rule_set_one_draft_uq").on(t.organizationId).where(sql`status = 'draft'`),
  ],
).enableRLS();

/** Standard VAT rates with the date each one applies from. The rate for a day is the latest row on or before it. */
export const vatRate = pgTable(
  "vat_rate",
  {
    id: text("id").primaryKey(),
    /** Country name as used by the engine ("Germany", "UK") */
    country: text("country").notNull(),
    rate: doublePrecision("rate").notNull(),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    source: text("source"),
    createdAt: createdAt(),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [uniqueIndex("vat_rate_country_from_uq").on(t.country, t.effectiveFrom)],
).enableRLS();

// ---- Checks ----

/** Every VIES lookup, kept as audit evidence */
export const viesLookup = pgTable(
  "vies_lookup",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    countryCode: text("country_code").notNull(),
    vatNumber: text("vat_number").notNull(),
    state: text("state").$type<"valid" | "invalid" | "unavailable" | "error">().notNull(),
    code: text("code"),
    name: text("name"),
    address: text("address"),
    /** VIES consultation number, returned when the client's own VAT number is set as requester */
    requestIdentifier: text("request_identifier"),
    requestDate: text("request_date"),
    createdAt: createdAt(),
  },
  (t) => [index("vies_lookup_org_idx").on(t.organizationId, t.createdAt)],
).enableRLS();

export interface StoredResult {
  code: string;
  rate: number | null;
  level: "ok" | "warn" | "block";
  entity: string;
  invoice: string;
  notes: Note[];
  ruleId: string | null;
  ruleName: string | null;
  downgraded: boolean;
}

/** A sale checked and saved to the client's log */
export const saleCheck = pgTable(
  "sale_check",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    ruleSetId: text("rule_set_id").notNull().references(() => ruleSet.id),
    ruleSetVersion: integer("rule_set_version").notNull(),
    orderRef: text("order_ref"),
    input: jsonb("input").$type<CheckInput>().notNull(),
    result: jsonb("result").$type<StoredResult>().notNull(),
    viesLookupId: text("vies_lookup_id").references(() => viesLookup.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("sale_check_org_created_idx").on(t.organizationId, t.createdAt), index("sale_check_org_ref_idx").on(t.organizationId, t.orderRef)],
).enableRLS();
