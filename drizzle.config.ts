import { defineConfig } from "drizzle-kit";

// Generate migrations only (`npm run db:generate`). `npm run db:migrate` applies them, and Netlify
// runs that before every build. Don't use `drizzle-kit push` or `drizzle-kit migrate`.
export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "db/migrations",
});
