// Database client. On Netlify the app uses the Postgres database in DATABASE_URL (Supabase's
// transaction pooler). On your computer `npm run dev` runs a local Postgres in .netlify/db and
// sets NETLIFY_DB_URL, which is used instead, so local work never touches the real data.
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { pgConfig } from "../../db/connection";
import * as schema from "../../db/schema";
import { env } from "./env.server";

let client: NodePgDatabase | undefined;

export function db(): NodePgDatabase {
  if (!client) {
    const url = env.databaseUrl();
    // A few connections per function instance is plenty; the pooler shares them out
    const pool = new pg.Pool(pgConfig(url, { max: 3, idleTimeoutMillis: 10_000 }));
    client = drizzle({ client: pool });
  }
  return client;
}

export { schema };

export const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
