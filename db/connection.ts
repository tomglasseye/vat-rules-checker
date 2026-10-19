// Connection settings shared by the app and the migration script.
import type { PoolConfig } from "pg";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/**
 * Supabase (and most hosted Postgres) needs SSL; the local database doesn't. Any sslmode in the URL
 * is dropped and SSL is set here instead, because node-postgres now treats sslmode=require as full
 * certificate verification, which fails against Supabase's pooler without its CA certificate.
 */
export function pgConfig(url: string, extra: PoolConfig = {}): PoolConfig {
  const u = new URL(url);
  const local = LOCAL_HOSTS.has(u.hostname);
  u.searchParams.delete("sslmode");
  return {
    connectionString: u.toString(),
    ssl: local ? false : { rejectUnauthorized: false },
    ...extra,
  };
}
