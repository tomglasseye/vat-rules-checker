import { data, Form, redirect, useNavigation } from "react-router";
import { Banner, Button, Card } from "~/components/ui";
import { getAuth, signIn, signInAvailable } from "~/lib/auth.server";
import { env } from "~/lib/env.server";
import type { Route } from "./+types/login";

export const meta: Route.MetaFunction = () => [{ title: "Sign in · VAT Rules Checker" }];

/** Only allow redirects back into this app */
function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  if (await getAuth(request)) throw redirect(safeNext(url.searchParams.get("next")));
  return {
    available: signInAvailable(),
    showDemoAccounts: !env.isProd || signInAvailable(),
    signedOut: url.searchParams.has("signedout"),
    next: safeNext(url.searchParams.get("next")),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  const next = safeNext(String(form.get("next") ?? ""));
  if (!email || !password) return data({ error: "Enter your email and password.", email }, { status: 400 });
  const res = await signIn(request, email, password);
  if (!res.ok) return data({ error: res.error, email }, { status: 401 });
  return redirect(next, { headers: res.headers });
}

export default function Login({ loaderData, actionData }: Route.ComponentProps) {
  const nav = useNavigation();
  const busy = nav.state !== "idle" && nav.formMethod === "POST";
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-6">
          <div className="eyebrow mb-1.5">PVM Consultants</div>
          <h1 className="wide text-[30px] font-bold leading-tight tracking-[-0.01em]">VAT Rules Checker</h1>
          <p className="mt-1.5 text-muted">Sign in to check the VAT treatment of a sale.</p>
        </div>

        <Card className="p-5">
          {loaderData.signedOut && !actionData?.error ? (
            <div className="mb-4"><Banner tone="ok">You've signed out.</Banner></div>
          ) : null}
          {actionData?.error ? (
            <div className="mb-4"><Banner tone="block">{actionData.error}</Banner></div>
          ) : null}
          {!loaderData.available ? (
            <Banner tone="warn">Sign-in isn't switched on for this site yet.</Banner>
          ) : (
            <Form method="post" className="grid gap-4">
              <input type="hidden" name="next" value={loaderData.next} />
              <div className="grid gap-1.5">
                <label htmlFor="email" className="text-[13px] font-semibold">Email</label>
                <input id="email" name="email" type="email" autoComplete="username" required defaultValue={actionData?.email ?? ""} className="field-control" autoFocus />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="password" className="text-[13px] font-semibold">Password</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required className="field-control" />
              </div>
              <Button type="submit" variant="primary" disabled={busy} className="mt-1 w-full">
                {busy ? "Signing in…" : "Sign in"}
              </Button>
            </Form>
          )}
        </Card>

        {loaderData.showDemoAccounts && loaderData.available ? (
          <div className="mt-4 rounded-card border border-dashed border-line px-4 py-3 text-[13.5px] text-muted">
            <p className="font-semibold text-ink">Demo accounts (until real sign-in is added)</p>
            <ul className="mt-1.5 grid gap-0.5">
              <li><span className="font-mono text-ink">admin@pvm.test</span> · PVM admin</li>
              <li><span className="font-mono text-ink">staff@demo-client.test</span> · client staff</li>
            </ul>
            <p className="mt-1.5">Password: the demo password ({env_hint()}).</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function env_hint() {
  return import.meta.env.DEV ? "“demo” on your computer" : "set as DEMO_PASSWORD in Netlify";
}
