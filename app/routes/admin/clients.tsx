import { data, Form, Link, redirect, useNavigation } from "react-router";
import { Button, Card, CardHeader, Chip, PageHeader } from "~/components/ui";
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
          <table className="data-table min-w-[560px]">
            <thead>
              <tr>
                <th>Client</th>
                <th>Live rules</th>
                <th>Draft edited</th>
                <th className="text-right">Staff</th>
                <th className="text-right">Checks (30 days)</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id}>
                  <td><Link to={`/admin/clients/${c.slug}`} className="font-semibold text-accent underline-offset-3 hover:underline">{c.name}</Link></td>
                  <td>{c.publishedVersion ? `Version ${c.publishedVersion}` : <Chip tone="warn">Not published</Chip>}</td>
                  <td className="text-muted">{fmtDate(c.draftUpdatedAt)}</td>
                  <td className="tabular text-right">{c.users}</td>
                  <td className="tabular text-right">{c.checks30d}</td>
                </tr>
              ))}
              {!clients.length ? (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted">No clients yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader title="Add a client" />
          <Form method="post" className="grid gap-3.5 p-5">
            <div className="grid gap-1.5">
              <label htmlFor="name" className="text-[14px] font-medium">Company name</label>
              <input id="name" name="name" required minLength={2} maxLength={120} className="field-control" />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="copyFrom" className="text-[14px] font-medium">Start the rules from</label>
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
