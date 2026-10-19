// Sign-in, for now with placeholder demo accounts.
//
// Every route gets the signed-in person through this file (requireUser / requireAdmin and
// authContext), never from the cookie directly. When Better Auth is added, only the internals here
// change: signIn/signOut call Better Auth, and loadAuth reads its session. The `user`,
// `organization` and `member` tables already use Better Auth's shape, and "active client" maps to
// its session.activeOrganizationId.
import { and, asc, eq } from "drizzle-orm";
import { createContext, createCookieSessionStorage, redirect, type MiddlewareFunction } from "react-router";
import { db, schema } from "./db.server";
import { env } from "./env.server";

export type PlatformRole = "admin" | "user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: PlatformRole;
}

export interface ClientAccess {
  id: string;
  name: string;
  slug: string;
  /** Member role in that client, or "pvm" when a PVM admin is looking in */
  role: string;
}

export interface Auth {
  user: AuthUser;
  isAdmin: boolean;
  clients: ClientAccess[];
  activeClient: ClientAccess | null;
}

export const authContext = createContext<Auth>();

type SessionData = { userId: string; activeOrganizationId?: string };

let storage: ReturnType<typeof createCookieSessionStorage<SessionData>> | undefined;
function sessions() {
  storage ??= createCookieSessionStorage<SessionData>({
    cookie: {
      name: "__vrc_session",
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: env.isProd,
      secrets: [env.sessionSecret()],
      maxAge: 60 * 60 * 24 * 7,
    },
  });
  return storage;
}

async function loadAuth(request: Request): Promise<Auth | null> {
  const session = await sessions().getSession(request.headers.get("Cookie"));
  const userId = session.get("userId");
  if (!userId) return null;

  const [u] = await db().select().from(schema.user).where(eq(schema.user.id, userId)).limit(1);
  if (!u) return null;
  const user: AuthUser = { id: u.id, name: u.name, email: u.email, role: u.role === "admin" ? "admin" : "user" };
  const isAdmin = user.role === "admin";

  const clients: ClientAccess[] = isAdmin
    ? (await db().select().from(schema.organization).orderBy(asc(schema.organization.name))).map((o) => ({ id: o.id, name: o.name, slug: o.slug, role: "pvm" }))
    : await db()
        .select({ id: schema.organization.id, name: schema.organization.name, slug: schema.organization.slug, role: schema.member.role })
        .from(schema.member)
        .innerJoin(schema.organization, eq(schema.member.organizationId, schema.organization.id))
        .where(eq(schema.member.userId, user.id))
        .orderBy(asc(schema.organization.name));

  const activeId = session.get("activeOrganizationId");
  const activeClient = clients.find((c) => c.id === activeId) ?? clients[0] ?? null;
  return { user, isAdmin, clients, activeClient };
}

export async function getAuth(request: Request): Promise<Auth | null> {
  return loadAuth(request);
}

function loginRedirect(request: Request) {
  const url = new URL(request.url);
  const next = url.pathname + url.search;
  return redirect(next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login");
}

/** Route middleware: signed-in people only. Puts the Auth object on context for loaders and actions. */
export const requireUser: MiddlewareFunction<Response> = async ({ request, context }) => {
  const auth = await loadAuth(request);
  if (!auth) throw loginRedirect(request);
  context.set(authContext, auth);
};

/** Route middleware: PVM admins only. Use after requireUser. */
export const requireAdmin: MiddlewareFunction<Response> = async ({ context }) => {
  const auth = context.get(authContext);
  if (!auth.isAdmin) throw new Response("Only PVM admins can open this page.", { status: 403 });
};

/** The client a check belongs to: the active one, which the person must have access to. */
export function requireActiveClient(auth: Auth): ClientAccess {
  if (!auth.activeClient) throw new Response("You aren't linked to a client yet. Ask PVM to add you.", { status: 403 });
  return auth.activeClient;
}

export function signInAvailable(): boolean {
  return !!env.demoPassword();
}

export type SignInResult = { ok: true; headers: Headers } | { ok: false; error: string };

export async function signIn(request: Request, email: string, password: string): Promise<SignInResult> {
  const demoPassword = env.demoPassword();
  if (!demoPassword) return { ok: false, error: "Sign-in isn't switched on yet." };
  const clean = email.trim().toLowerCase();
  const [u] = await db().select({ id: schema.user.id }).from(schema.user).where(eq(schema.user.email, clean)).limit(1);
  // Same message for unknown email and wrong password, so it doesn't reveal who has an account
  if (!u || password !== demoPassword) return { ok: false, error: "That email and password don't match an account." };
  const session = await sessions().getSession(request.headers.get("Cookie"));
  session.set("userId", u.id);
  session.unset("activeOrganizationId");
  return { ok: true, headers: new Headers({ "Set-Cookie": await sessions().commitSession(session) }) };
}

export async function signOut(request: Request): Promise<Headers> {
  const session = await sessions().getSession(request.headers.get("Cookie"));
  return new Headers({ "Set-Cookie": await sessions().destroySession(session) });
}

/** Switches the client the person is working for. Returns null if they can't access it. */
export async function setActiveClient(request: Request, auth: Auth, organizationId: string): Promise<Headers | null> {
  if (!auth.clients.some((c) => c.id === organizationId)) return null;
  const session = await sessions().getSession(request.headers.get("Cookie"));
  session.set("activeOrganizationId", organizationId);
  return new Headers({ "Set-Cookie": await sessions().commitSession(session) });
}

/** Membership check for actions that take an organisation id from the form */
export async function canAccessClient(auth: Auth, organizationId: string): Promise<boolean> {
  if (auth.isAdmin) return true;
  const [m] = await db()
    .select({ id: schema.member.id })
    .from(schema.member)
    .where(and(eq(schema.member.organizationId, organizationId), eq(schema.member.userId, auth.user.id)))
    .limit(1);
  return !!m;
}
