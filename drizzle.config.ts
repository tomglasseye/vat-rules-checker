import { defineConfig } from "drizzle-kit";

// Generate migrations only (`npm run db:generate`). Netlify applies them on deploy.
// Never run `drizzle-kit push` or `drizzle-kit migrate` against the hosted database.
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "netlify/database/migrations",
});
