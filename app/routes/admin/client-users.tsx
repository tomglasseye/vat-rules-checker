import { data, Form, useNavigation } from "react-router";
import { Banner, Button, Card, PageHeader } from "~/components/ui";
import { addMember, getClientBySlug, listMembers, removeMember, type MemberRole } from "~/models/clients.server";
import type { Route } from "./+types/client-users";

export const meta: Route.MetaFunction = () => [{ title: "Staff accounts · Admin · VAT Rules Checker" }];

const ROLES: { value: MemberRole; label: string; hint: string }[] = [
  { value: "member", label: "Staff", hint: "Checks sales and sees the client's saved checks" },
  { value: "admin", label: "Client admin", hint: "Same as staff for now; will manage their own team when sign-in is added" },
  { value: "owner", label: "Owner", hint: "The account holder at the client" },
];

export async function loader({ params }: Route.LoaderArgs) {
  const org = await getClientBySlug(params.slug);
  if (!org) throw new Response("Client not found", { status: 404 });
  const members = await listMembers(org.id);
  return { client: { name: org.name }, members: members.map((m) => ({ ...m, since: m.since.toISOString() })) };
}

export async function action({ request, params }: Route.ActionArgs) {
  const org = await getClientBySlug(params.slug);
  if (!org) throw new Response("Client not found", { status: 404 });
  const form = await request.formData();
  if (form.get("intent") === "remove") {
    await removeMember(org.id, String(form.get("memberId")));
    return { ok: true, message: "Access removed." };
  }
  const email = String(form.get("email") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const role = String(form.get("role") ?? "member") as MemberRole;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return data({ ok: false, error: "Enter a valid email address." }, { status: 400 });
  if (!ROLES.some((r) => r.value === role)) return data({ ok: false, error: "Pick a role." }, { status: 400 });
  const res = await addMember(org.id, { name, email, role });
  return res.ok ? { ok: true, message: `${email} can now sign in to ${org.name}.` } : data({ ok: false, error: res.error }, { status: 409 });
}

export default function ClientUsers({ loaderData, actionData }: Route.ComponentProps) {
  const { client, members } = loaderData;
  const busy = useNavigation().state === "submitting";
  return (
    <>
      <PageHeader title="Staff accounts" intro={`People at ${client.name} who can check sales and see the client's saved checks. They never see the rules editor or other clients.`} />
      <div className="mb-4">
        <Banner tone="info">Real sign-in isn't switched on yet, so accounts added here use the shared demo password. When it is, each person gets an invitation email to set their own.</Banner>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-line text-2xs font-semibold tracking-[0.08em] text-muted uppercase">
                <th className="px-4 py-2.5 font-semibold">Name</th>
                <th className="px-4 py-2.5 font-semibold">Email</th>
                <th className="px-4 py-2.5 font-semibold">Role</th>
                <th className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.memberId} className="border-b border-line last:border-b-0">
                  <td className="px-4 py-3 font-semibold">{m.name}</td>
                  <td className="px-4 py-3 font-mono text-[13px]">{m.email}</td>
                  <td className="px-4 py-3">{ROLES.find((r) => r.value === m.role)?.label ?? m.role}</td>
                  <td className="px-4 py-3 text-right">
                    <Form method="post">
                      <input type="hidden" name="intent" value="remove" />
                      <input type="hidden" name="memberId" value={m.memberId} />
                      <Button type="submit" size="sm" variant="danger" disabled={busy}>Remove</Button>
                    </Form>
                  </td>
                </tr>
              ))}
              {!members.length ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">No staff accounts yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </Card>

        <Card className="p-4">
          <h2 className="wide mb-3 text-[17px] font-bold">Add someone</h2>
          <Form method="post" className="grid gap-3">
            <input type="hidden" name="intent" value="add" />
            <div className="grid gap-1.5">
              <label htmlFor="name" className="text-[13px] font-semibold">Name</label>
              <input id="name" name="name" className="field-control" maxLength={120} />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="email" className="text-[13px] font-semibold">Email</label>
              <input id="email" name="email" type="email" required className="field-control" />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="role" className="text-[13px] font-semibold">Role</label>
              <select id="role" name="role" className="field-control" defaultValue="member">
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}: {r.hint}</option>
                ))}
              </select>
            </div>
            {actionData ? (
              <p className={actionData.ok ? "text-[13px] font-semibold text-ok" : "text-[13px] font-semibold text-block"} role="status">
                {"message" in actionData ? actionData.message : actionData.error}
              </p>
            ) : null}
            <Button type="submit" variant="primary" disabled={busy}>Add</Button>
          </Form>
        </Card>
      </div>
    </>
  );
}
