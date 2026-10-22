// Runs the queries behind every page change (the sign-in check) and the admin pages against a
// throwaway local Postgres with the real migrations and demo data.
import { NetlifyDB } from "@netlify/database-dev";
import { afterAll, beforeAll, expect, test } from "vitest";
import { migrate } from "../db/migrate";

let pg: NetlifyDB;

beforeAll(async () => {
  pg = new NetlifyDB({ logger: () => {} });
  const url = await pg.start();
  await migrate(url, "./db/migrations", () => {});
  // A second client, named so it sorts first, that the demo staff account isn't a member of
  await pg.query(`INSERT INTO organization (id, name, slug) VALUES ('org_acme', 'Acme Ltd', 'acme')`);
  process.env.NETLIFY_DB_URL = url;
});
afterAll(async () => {
  const { closeDb } = await import("../app/lib/db.server");
  await closeDb();
  await pg?.stop();
});

async function signedIn(email: string) {
  const { getAuth, signIn } = await import("../app/lib/auth.server");
  const res = await signIn(new Request("http://localhost/login"), email, "demo");
  if (!res.ok) throw new Error(res.error);
  const cookie = res.headers.get("Set-Cookie")!.split(";")[0];
  return getAuth(new Request("http://localhost/check", { headers: { Cookie: cookie } }));
}

test("client staff see only the clients they're a member of", async () => {
  const auth = await signedIn("staff@demo-client.test");
  expect(auth?.user).toEqual({ id: "usr_demo_staff", name: "Client staff (demo)", email: "staff@demo-client.test", role: "user" });
  expect(auth?.isAdmin).toBe(false);
  expect(auth?.clients).toEqual([{ id: "org_demo", name: "Demo client (UK + NL)", slug: "demo-client", role: "member" }]);
  expect(auth?.activeClient?.id).toBe("org_demo");
});

test("PVM admins see every client, in name order", async () => {
  const auth = await signedIn("admin@pvm.test");
  expect(auth?.isAdmin).toBe(true);
  expect(auth?.clients).toEqual([
    { id: "org_acme", name: "Acme Ltd", slug: "acme", role: "pvm" },
    { id: "org_demo", name: "Demo client (UK + NL)", slug: "demo-client", role: "pvm" },
  ]);
});

test("admin pages find a client by slug without a query, and 404 for an unknown one", async () => {
  const { clientFromSlug } = await import("../app/lib/auth.server");
  const auth = (await signedIn("admin@pvm.test"))!;
  expect(clientFromSlug(auth, "demo-client").id).toBe("org_demo");
  expect(() => clientFromSlug(auth, "nope")).toThrow();
});

test("the Clients page figures come back in one query", async () => {
  const { listClientsWithStats } = await import("../app/models/clients.server");
  const rows = await listClientsWithStats();
  expect(rows.map((r) => r.slug)).toEqual(["acme", "demo-client"]);
  const demo = rows.find((r) => r.slug === "demo-client")!;
  expect(demo).toMatchObject({ users: 1, checks30d: 0, publishedVersion: 1 });
  expect(demo.draftUpdatedAt).toBeInstanceOf(Date);
  expect(rows[0]).toMatchObject({ users: 0, checks30d: 0, publishedVersion: null, draftUpdatedAt: null });
});

test("live version number", async () => {
  const { getLiveVersion } = await import("../app/models/rules.server");
  expect(await getLiveVersion("org_demo")).toBe(1);
  expect(await getLiveVersion("org_acme")).toBeNull();
});
