// `npm run db:migrate`: applies new migrations to the database in DATABASE_URL (Supabase).
// Netlify runs this before every build. Without DATABASE_URL it does nothing, so a build without a
// database still succeeds (the app just can't sign anyone in).
import { migrate } from "../db/migrate";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("DATABASE_URL isn't set, so no migrations were applied.");
} else {
  await migrate(url);
}
