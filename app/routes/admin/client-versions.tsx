import { data, Form, useNavigation } from "react-router";
import { Button, Card, Chip, PageHeader } from "~/components/ui";
import type { Rule } from "~/engine";
import { authContext } from "~/lib/auth.server";
import { getClientBySlug } from "~/models/clients.server";
import { listVersions, resetDraftTo } from "~/models/rules.server";
import type { Route } from "./+types/client-versions";

export const meta: Route.MetaFunction = () => [{ title: "Published versions · Admin · VAT Rules Checker" }];

function diff(prev: Rule[] | null, cur: Rule[]) {
  if (!prev) return { added: cur.length, removed: 0, changed: 0, moved: false };
  const p = new Map(prev.map((r) => [r.id, JSON.stringify(r)]));
  const c = new Map(cur.map((r) => [r.id, JSON.stringify(r)]));
  let added = 0, removed = 0, changed = 0;
  for (const [id, j] of c) {
    if (!p.has(id)) added++;
    else if (p.get(id) !== j) changed++;
  }
  for (const id of p.keys()) if (!c.has(id)) removed++;
  const order = (rs: Rule[]) => rs.map((r) => r.id).filter((id) => p.has(id) && c.has(id)).join();
  return { added, removed, changed, moved: order(prev) !== order(cur) };
}

export async function loader({ params }: Route.LoaderArgs) {
  const org = await getClientBySlug(params.slug);
  if (!org) throw new Response("Client not found", { status: 404 });
  const versions = await listVersions(org.id);
  return {
    versions: versions.map((v, i) => ({
      id: v.id,
      version: v.version!,
      summary: v.summary,
      publishedAt: v.publishedAt?.toISOString() ?? null,
      publishedBy: v.publishedBy ?? "Unknown",
      rules: v.rules.length,
      tests: v.tests.length,
      signoff: v.rules.filter((r) => r.signoff).length,
      diff: diff(versions[i + 1]?.rules ?? null, v.rules),
    })),
  };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const auth = context.get(authContext);
  const org = await getClientBySlug(params.slug);
  if (!org) throw new Response("Client not found", { status: 404 });
  const version = Number((await request.formData()).get("version"));
  if (!(await resetDraftTo(org.id, version, auth.user.id))) return data({ error: "That version doesn't exist." }, { status: 404 });
  return { message: `Version ${version} copied into the draft. Review it on the Draft rules tab, then publish.` };
}

export default function ClientVersions({ loaderData, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state === "submitting";
  return (
    <>
      <PageHeader title="Published versions" intro="Every version client staff have checked against. Saved checks record which one decided them. To roll back, copy an older version into the draft and publish it again." />
      {actionData && "message" in actionData ? <p className="mb-3 text-[14px] font-semibold text-ok" role="status">{actionData.message}</p> : null}
      {loaderData.versions.length === 0 ? (
        <Card className="px-5 py-8 text-center text-muted">Nothing published yet.</Card>
      ) : (
        <ol className="grid gap-2.5">
          {loaderData.versions.map((v, i) => {
            const d = v.diff;
            const changes = [
              d.added && `${d.added} added`,
              d.changed && `${d.changed} changed`,
              d.removed && `${d.removed} removed`,
              d.moved && "order changed",
            ].filter(Boolean);
            return (
              <li key={v.id}>
                <Card className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2.5">
                      <h3 className="text-[15px] font-medium">Version {v.version}</h3>
                      {i === 0 ? <Chip tone="ok">Live</Chip> : null}
                      <span className="text-[13px] text-muted">
                        {v.publishedAt ? new Date(v.publishedAt).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""} · {v.publishedBy}
                      </span>
                    </div>
                    {v.summary ? <p className="mt-1 max-w-[80ch] text-[14.5px]">{v.summary}</p> : null}
                    <p className="mt-1 text-[13px] text-muted">
                      {v.rules} rules, {v.tests} tests{v.signoff ? `, ${v.signoff} needing sign-off` : ""}
                      {i < loaderData.versions.length - 1 ? ` · Rules ${changes.length ? changes.join(", ") : "unchanged"} since version ${loaderData.versions[i + 1].version}` : ""}
                    </p>
                  </div>
                  {i > 0 ? (
                    <Form method="post">
                      <input type="hidden" name="version" value={v.version} />
                      <Button type="submit" size="sm" disabled={busy}>Copy into draft</Button>
                    </Form>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
