// Writes the demo seed migration from the starter data in app/engine.
// Run once with `npx tsx scripts/write-seed-migration.ts <migration folder>`; the output is committed.
// Don't re-run it against a migration that has already been applied anywhere (Netlify rejects edited migrations).
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { COUNTRY_CODE, RATE_COUNTRIES, defaultRates, starterRules, starterTests } from "../app/engine/index";

const dir = process.argv[2];
if (!dir) throw new Error("Pass the migration folder, e.g. netlify/database/migrations/20261016074013_seed_demo");

const q = (s: string | null) => (s === null ? "NULL" : `'${s.replace(/'/g, "''")}'`);
const json = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;

const rates = defaultRates();
const rules = starterRules();
const tests = starterTests();
const summary = "Starter rules: Miranda's EU VAT Calculator v3 with her answers up to 14 Oct 2026 and the formula issues fixed.";

const lines: string[] = [
  "-- Demo data so the app works on first run: VAT rates, one demo client, and placeholder accounts.",
  "-- Placeholder accounts only sign in while DEMO_PASSWORD is set (see app/lib/auth.server.ts).",
  "",
  "INSERT INTO \"vat_rate\" (\"id\", \"country\", \"rate\", \"effective_from\", \"source\") VALUES",
  RATE_COUNTRIES.map((c) => `  (${q(`rate_${COUNTRY_CODE[c].toLowerCase()}_base`)}, ${q(c)}, ${rates[c]}, '2026-01-01', 'Standard rate in force when the app was set up (Oct 2026)')`).join(",\n") + ";",
  "",
  "INSERT INTO \"organization\" (\"id\", \"name\", \"slug\") VALUES ('org_demo', 'Demo client (UK + NL)', 'demo-client');",
  "",
  "INSERT INTO \"user\" (\"id\", \"name\", \"email\", \"email_verified\", \"role\") VALUES",
  "  ('usr_demo_admin', 'PVM admin (demo)', 'admin@pvm.test', true, 'admin'),",
  "  ('usr_demo_staff', 'Client staff (demo)', 'staff@demo-client.test', true, 'user');",
  "",
  "INSERT INTO \"member\" (\"id\", \"organization_id\", \"user_id\", \"role\") VALUES ('mem_demo_staff', 'org_demo', 'usr_demo_staff', 'member');",
  "",
  "INSERT INTO \"rule_set\" (\"id\", \"organization_id\", \"status\", \"version\", \"rules\", \"tests\", \"summary\", \"published_at\", \"published_by\", \"updated_by\") VALUES",
  `  ('rs_demo_v1', 'org_demo', 'published', 1, ${json(rules)}, ${json(tests)}, ${q(summary)}, now(), 'usr_demo_admin', 'usr_demo_admin'),`,
  `  ('rs_demo_draft', 'org_demo', 'draft', NULL, ${json(rules)}, ${json(tests)}, NULL, NULL, NULL, 'usr_demo_admin');`,
  "",
];

writeFileSync(join(dir, "migration.sql"), lines.join("\n"));
console.log(`Wrote ${join(dir, "migration.sql")}`);
