// Database client. On Netlify the app uses the Postgres database in DATABASE_URL (Supabase's
// transaction pooler). On your computer `npm run dev` runs a local Postgres in .netlify/db and
// sets NETLIFY_DB_URL, which is used instead, so local work never touches the real data.
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import { pgConfig } from "../../db/connection";
import * as schema from "../../db/schema";
import { env } from "./env.server";

let pool: pg.Pool | undefined;
let client: NodePgDatabase | undefined;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool(
      pgConfig(env.databaseUrl(), {
        // A few connections per function instance is plenty; the pooler shares them out. Four lets
        // the busiest page (a client's draft rules) run all its queries at once.
        max: 4,
        // Opening a connection to Supabase takes several round trips (TCP, TLS, sign-in), which is
        // the slowest part of a request when the function and the database are far apart. Keep
        // them open between clicks so a person reading a page for a minute doesn't pay that again.
        idleTimeoutMillis: 120_000,
        keepAlive: true,
      }),
    );
    // A connection the server closes while it sits idle reports an error here. The pool drops it
    // and opens a new one next time; without a listener the error would crash the function.
    pool.on("error", (err) => console.warn("Idle database connection closed:", err.message));
  }
  return pool;
}

export function db(): NodePgDatabase {
  client ??= drizzle({ client: getPool() });
  return client;
}

/**
 * Call just before the sign-in query. Once that query has taken a connection, this starts opening
 * a second one alongside it, so a page whose loaders run queries side by side finds two
 * connections ready instead of waiting for a new one. It only ever adds a connection: with one
 * already idle it does nothing, so it never holds up the query it runs next to.
 */
export function warmConnections(target = 2) {
  const p = getPool();
  const later = globalThis.setImmediate ?? ((fn: () => void) => setTimeout(fn, 0));
  later(() => {
    if (p.totalCount >= target || p.idleCount > 0) return;
    p.connect().then(
      (c) => c.release(),
      () => {}, // the page's own query reports any connection problem
    );
  });
}

export { schema };

export const newId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;

/** Closes the connections. For tests and scripts; the app itself never needs to. */
export async function closeDb() {
  const p = pool;
  pool = undefined;
  client = undefined;
  await p?.end();
}
