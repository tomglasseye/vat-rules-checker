// Applies every migration to a throwaway local Postgres with the same runner Netlify builds use
// against Supabase (db/migrate.ts), and checks the seed data is usable.
import { NetlifyDB } from "@netlify/database-dev";
import { afterAll, beforeAll, expect, test } from "vitest";
import { health, type Rule, type TestScenario } from "../app/engine/index";
import { migrate } from "../db/migrate";

let db: NetlifyDB;
let url: string;
let firstRun: string[];

beforeAll(async () => {
  db = new NetlifyDB({ logger: () => {} });
  url = await db.start();
  firstRun = await migrate(url, "./db/migrations", () => {});
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

test("the 19 Oct migration moves the demo draft to the new starter rules and leaves version 1 alone", async () => {
  const { rows } = await db.query<{ status: string; rules: Rule[]; tests: TestScenario[] }>(`SELECT status, rules, tests FROM rule_set ORDER BY status`);
  const draft = rows.find((r) => r.status === "draft")!;
  const v1 = rows.find((r) => r.status === "published")!;
  const ids = draft.rules.map((r) => r.id);
  expect(ids).toContain("r-uk-eu-reroute-b2b");
  expect(ids).toContain("r-uk-eu-reroute-b2c");
  expect(ids).not.toContain("r-uk-eu-ioss");
  expect(draft.tests.map((t) => t.id)).toContain("t28");
  expect(v1.rules.map((r) => r.id)).toContain("r-uk-eu-ioss");
  const { rows: rateRows } = await db.query<{ country: string; rate: number }>(`SELECT country, rate FROM vat_rate`);
  const rates = Object.fromEntries(rateRows.map((r) => [r.country, Number(r.rate)]));
  expect(health(draft.rules, draft.tests, rates).ok).toBe(true);
});

test("only one draft per client", async () => {
  await expect(db.query(`INSERT INTO rule_set (id, organization_id, status, rules, tests) VALUES ('x', 'org_demo', 'draft', '[]', '[]')`)).rejects.toThrow();
});

test("the migration runner applies each migration once", async () => {
  expect(firstRun).toEqual(["20261016073952_init", "20261016074013_seed_demo", "20261019154653_uk_stock_reroute"]);
  expect(await migrate(url, "./db/migrations", () => {})).toEqual([]);
  const { rows } = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM app_migrations`);
  expect(rows[0].n).toBe(3);
});
