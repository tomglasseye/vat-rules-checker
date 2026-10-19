// Applies every migration to a throwaway local Postgres and checks the seed data is usable.
import { NetlifyDB } from "@netlify/database-dev";
import { afterAll, beforeAll, expect, test } from "vitest";
import { health, type Rule, type TestScenario } from "../app/engine/index";

let db: NetlifyDB;

beforeAll(async () => {
  db = new NetlifyDB({ logger: () => {} });
  await db.start();
  await db.applyMigrations("./netlify/database/migrations");
});
afterAll(async () => {
  await db?.stop();
});

test("migrations create the tables and seed a demo client", async () => {
  const { rows: rates } = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM vat_rate`);
  expect(rates[0].n).toBe(28);
  const { rows: sets } = await db.query<{ status: string; version: number | null }>(`SELECT status, version FROM rule_set ORDER BY status`);
  expect(sets).toEqual([{ status: "draft", version: null }, { status: "published", version: 1 }]);
});

test("seeded published rules pass their own tests", async () => {
  const { rows } = await db.query<{ rules: Rule[]; tests: TestScenario[] }>(`SELECT rules, tests FROM rule_set WHERE status = 'published'`);
  const { rows: rateRows } = await db.query<{ country: string; rate: number }>(`SELECT country, rate FROM vat_rate`);
  const rates = Object.fromEntries(rateRows.map((r) => [r.country, Number(r.rate)]));
  const h = health(rows[0].rules, rows[0].tests, rates);
  expect(h.ok).toBe(true);
});

test("only one draft per client", async () => {
  await expect(db.query(`INSERT INTO rule_set (id, organization_id, status, rules, tests) VALUES ('x', 'org_demo', 'draft', '[]', '[]')`)).rejects.toThrow();
});
