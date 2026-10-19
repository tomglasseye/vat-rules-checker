// Environment settings (Netlify > Project configuration > Environment variables).
//   SESSION_SECRET          long random string that signs the sign-in cookie (required on Netlify)
//   DEMO_PASSWORD           password for the placeholder demo accounts; sign-in is off without it
//   VIES_REQUESTER_COUNTRY  e.g. NL, with VIES_REQUESTER_NUMBER: makes VIES return a consultation number
//   VIES_REQUESTER_NUMBER   the requesting VAT number without the country prefix
//   DATABASE_URL            Postgres connection string (Supabase transaction pooler), required on Netlify
const isProd = process.env.NODE_ENV === "production";

function get(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

export const env = {
  isProd,
  sessionSecret(): string {
    const s = get("SESSION_SECRET");
    if (s) return s;
    if (isProd) throw new Error("SESSION_SECRET is not set. Add it in Netlify's environment variables.");
    return "local-dev-only-secret";
  },
  /** In local dev the demo accounts use "demo" unless DEMO_PASSWORD says otherwise */
  demoPassword(): string | undefined {
    return get("DEMO_PASSWORD") ?? (isProd ? undefined : "demo");
  },
  /** On Netlify: DATABASE_URL. Locally: the database `npm run dev` starts in .netlify/db (NETLIFY_DB_URL). */
  databaseUrl(): string {
    const url = isProd ? get("DATABASE_URL") : get("NETLIFY_DB_URL") ?? get("DATABASE_URL");
    if (url) return url;
    throw new Error(isProd ? "DATABASE_URL is not set. Add your Supabase connection string in Netlify's environment variables." : "No database: start the app with `npm run dev`, which runs a local one.");
  },
  viesRequester(): { country: string; number: string } | null {
    const country = get("VIES_REQUESTER_COUNTRY");
    const number = get("VIES_REQUESTER_NUMBER");
    return country && number ? { country: country.toUpperCase(), number } : null;
  },
};
