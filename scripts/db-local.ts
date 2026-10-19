// Brings the local development database (.netlify/db, the same one `npm run dev` uses) up to date
// by applying any new migrations. Runs automatically before `npm run dev`.
// `npm run db:local:reset` wipes it first and starts again from the demo data.
import { NetlifyDB } from "@netlify/database-dev";

const reset = process.argv.includes("--reset");
const db = new NetlifyDB({ directory: ".netlify/db", logger: () => {} });

try {
  await db.start();
  if (reset) {
    await db.reset();
    console.log("Local database wiped.");
  }
  const applied = await db.applyMigrations("netlify/database/migrations");
  console.log(applied.length ? `Local database: applied ${applied.join(", ")}` : "Local database is up to date.");
} finally {
  await db.stop();
}
