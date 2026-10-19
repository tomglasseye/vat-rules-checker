// Shape checks for rules and tests posted from the editor, so nothing malformed reaches the database.
import { z } from "zod";
import type { Rule, TestScenario } from "./types";

const origin = z.enum(["UK", "NL", "OTHER"]);
const zone = z.enum(["UK", "NL", "EU", "ROW"]);
const saleType = z.enum(["B2B", "B2C"]);
const vies = z.enum(["unchecked", "valid", "invalid", "unavailable"]);
const value = z.enum(["low", "high"]);
const level = z.enum(["ok", "warn", "block"]);
const entity = z.enum(["UK", "NL", ""]);
const text = (max: number) => z.string().max(max);

const rateSpec = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("none") }),
  z.object({ kind: z.literal("fixed"), value: z.number().min(0).max(100) }),
  z.object({ kind: z.literal("dest") }),
]);

export const ruleSchema = z.object({
  id: z.string().min(1).max(80),
  name: text(200).min(1, "Every rule needs a name"),
  note: text(4000),
  source: text(1000).optional(),
  signoff: z.boolean(),
  when: z.object({
    origin: z.array(origin).optional(),
    type: z.array(saleType).optional(),
    destZone: z.array(zone).optional(),
    custZone: z.array(zone).optional(),
    vies: z.array(vies).optional(),
    value: z.array(value).optional(),
    dispatchIsDest: z.boolean().optional(),
    custIsDest: z.boolean().optional(),
  }),
  then: z.object({
    code: text(120).min(1, "Every rule needs a tax code"),
    rate: rateSpec,
    level,
    invoice: text(2000),
    warning: text(2000),
    needsVat: z.boolean(),
    entity,
  }),
});

export const testSchema = z.object({
  id: z.string().min(1).max(80),
  label: text(200).min(1),
  inp: z.object({ dispatch: z.string().max(60), dest: z.string().max(60), cust: z.string().max(60), type: saleType, vies, value }),
  expect: z.object({ code: text(120).optional(), rate: z.number().optional(), level: level.optional(), entity: entity.optional() }),
});

export const ruleSetSchema = z
  .object({ rules: z.array(ruleSchema).max(500), tests: z.array(testSchema).max(2000) })
  .refine((v) => new Set(v.rules.map((r) => r.id)).size === v.rules.length, { message: "Two rules have the same id" })
  .refine((v) => new Set(v.tests.map((t) => t.id)).size === v.tests.length, { message: "Two tests have the same id" });

export function parseRuleSet(raw: unknown): { ok: true; rules: Rule[]; tests: TestScenario[] } | { ok: false; error: string } {
  const r = ruleSetSchema.safeParse(raw);
  if (!r.success) return { ok: false, error: r.error.issues[0]?.message ?? "The rules couldn't be read" };
  return { ok: true, rules: r.data.rules as Rule[], tests: r.data.tests as TestScenario[] };
}
