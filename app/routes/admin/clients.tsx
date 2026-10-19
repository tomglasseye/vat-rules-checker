import { data, Form, Link, redirect, useNavigation } from "react-router";
import { Button, Card, Chip, PageHeader } from "~/components/ui";
import { authContext } from "~/lib/auth.server";
import { createClient, listClientsWithStats } from "~/models/clients.server";
import type { Route } from "./+types/clients";

export const meta: Route.MetaFunction = () => [{ title: "Clients · Admin · VAT Rules Checker" }];

export async function loader() {
  return { clients: await listClientsWithStats() };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = context.get(authContext);
  const form = await request.formData();
  const name = String(form.get("name") ?? "").trim();
  const copyFrom = String(form.get("copyFrom") ?? "") || null;
  if (name.length < 2) return data({ error: "Give the client a name." }, { status: 400 });
  const { slug } = await createClient({ name, copyFrom, userId: auth.user.id });
  return redirect(`/admin/clients/${slug}`);
}

const fmtDate = (d: Date | string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "–");

export default function Clients({ loaderData, actionData }: Route.ComponentProps) {
  const { clients } = loaderData;
  const busy = useNavigation().state === "submitting";
  return (
    <>
      <PageHeader title="Clients" intro="Each client has its own rules, its own staff accounts and its own log of saved checks. Rules are edited as a draft and only reach client staff when you publish." />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-line text-2xs font-semibold tracking-[0.08em] text-muted uppercase">
                <th className="px-4 py-2.5 font-semibold">Client</th>
                <th className="px-4 py-2.5 font-semibold">Live rules</th>
                <th className="px-4 py-2.5 font-semibold">Draft edited</th>
                <th className="px-4 py-2.5 text-right font-semibold">Staff</th>
                <th className="px-4 py-2.5 text-right font-semibold">Checks (30 days)</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3"><Link to={`/admin/clients/${c.slug}`} className="font-semibold text-accent underline-offset-3 hover:underline">{c.name}</Link></td>
                  <td className="px-4 py-3">{c.publishedVersion ? `Version ${c.publishedVersion}` : <Chip tone="warn">Not published</Chip>}</td>
                  <td className="px-4 py-3 text-muted">{fmtDate(c.draftUpdatedAt)}</td>
                  <td className="tabular px-4 py-3 text-right">{c.users}</td>
                  <td className="tabular px-4 py-3 text-right">{c.checks30d}</td>
                </tr>
              ))}
              {!clients.length ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">No clients yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </Card>

        <Card className="p-4">
          <h2 className="wide mb-3 text-[17px] font-bold">Add a client</h2>
          <Form method="post" className="grid gap-3">
            <div className="grid gap-1.5">
              <label htmlFor="name" className="text-[13px] font-semibold">Company name</label>
              <input id="name" name="name" required minLength={2} maxLength={120} className="field-control" />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="copyFrom" className="text-[13px] font-semibold">Start the rules from</label>
              <select id="copyFrom" name="copyFrom" className="field-control" defaultValue="">
                <option value="">Starter rules (UK company, NL paper registration)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>A copy of {c.name}'s draft</option>
                ))}
              </select>
            </div>
            {actionData?.error ? <p className="text-[13px] font-semibold text-block">{actionData.error}</p> : null}
            <Button type="submit" variant="primary" disabled={busy}>{busy ? "Adding…" : "Add client"}</Button>
            <p className="text-[12.5px] text-muted">You'll review the draft rules and publish them before the client's staff can run checks.</p>
          </Form>
        </Card>
      </div>
    </>
  );
}
