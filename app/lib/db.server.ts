// Database client. Netlify sets NETLIFY_DB_URL on deploys and `npm run dev` points it at the
// local database in .netlify/db. To use a Postgres outside Netlify (Neon, Supabase…), set
// NETLIFY_DB_URL to its connection string and run the migrations against it yourself.
import { drizzle } from "drizzle-orm/netlify-db";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../db/schema";

// Both drivers Netlify can pick (TCP and serverless) share this query API
type DB = NodePgDatabase;

let client: DB | undefined;

export function db(): DB {
  client ??= drizzle() as unknown as DB;
  return client;
}

export { schema };

export const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
