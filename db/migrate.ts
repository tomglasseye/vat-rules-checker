// Applies the SQL migrations in db/migrations, oldest first, to a Postgres database (Supabase on
// Netlify builds). Each migration runs in its own transaction and is recorded in app_migrations,
// so running this again only applies new ones.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { pgConfig } from "./connection";

export const MIGRATIONS_DIR = "db/migrations";

export async function migrate(url: string, dir = MIGRATIONS_DIR, log: (msg: string) => void = console.log): Promise<string[]> {
  const client = new pg.Client(pgConfig(url));
  await client.connect();
  const applied: string[] = [];
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS "app_migrations" ("name" text PRIMARY KEY, "applied_at" timestamptz NOT NULL DEFAULT now())`);
    const { rows } = await client.query<{ name: string }>(`SELECT "name" FROM "app_migrations"`);
    const done = new Set(rows.map((r) => r.name));
    const names = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    for (const name of names) {
      if (done.has(name)) continue;
      const sql = readFileSync(join(dir, name, "migration.sql"), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(`INSERT INTO "app_migrations" ("name") VALUES ($1)`, [name]);
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${name} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      applied.push(name);
      log(`Applied ${name}`);
    }
    if (!applied.length) log("Database is up to date.");
  } finally {
    await client.end();
  }
  return applied;
}
