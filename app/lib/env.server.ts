// Environment settings (Netlify > Project configuration > Environment variables).
//   SESSION_SECRET          long random string that signs the sign-in cookie (required on Netlify)
//   DEMO_PASSWORD           password for the placeholder demo accounts; sign-in is off without it
//   VIES_REQUESTER_COUNTRY  e.g. NL, with VIES_REQUESTER_NUMBER: makes VIES return a consultation number
//   VIES_REQUESTER_NUMBER   the requesting VAT number without the country prefix
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
  viesRequester(): { country: string; number: string } | null {
    const country = get("VIES_REQUESTER_COUNTRY");
    const number = get("VIES_REQUESTER_NUMBER");
    return country && number ? { country: country.toUpperCase(), number } : null;
  },
};
