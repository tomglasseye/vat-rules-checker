import { data, Link } from "react-router";
import { Checker, SaveToLog } from "~/components/Checker";
import { Banner, PageHeader, buttonClass } from "~/components/ui";
import { DEFAULT_INPUT, inputFromParams, saleFromJson } from "~/engine";
import { authContext, requireActiveClient } from "~/lib/auth.server";
import { saveCheck } from "~/models/checks.server";
import { ratesOn } from "~/models/rates.server";
import { getPublished } from "~/models/rules.server";
import type { Route } from "./+types/check";

export const meta: Route.MetaFunction = () => [{ title: "Check a sale · VAT Rules Checker" }];

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  const client = auth.activeClient;
  const initial = inputFromParams(new URL(request.url).searchParams, DEFAULT_INPUT);
  if (!client) return { client: null, ruleSet: null, rates: {}, initial, isAdmin: auth.isAdmin };
  const [published, rates] = await Promise.all([getPublished(client.id), ratesOn()]);
  return {
    client: { id: client.id, name: client.name, slug: client.slug },
    ruleSet: published ? { id: published.id, version: published.version!, rules: published.rules, publishedAt: published.publishedAt?.toISOString() ?? null } : null,
    rates,
    initial,
    isAdmin: auth.isAdmin,
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = context.get(authContext);
  const client = requireActiveClient(auth);
  const form = await request.formData();
  if (form.get("intent") !== "save") return data({ ok: false, error: "Unknown action" }, { status: 400 });
  const sale = saleFromJson(String(form.get("sale") ?? ""));
  if (!sale) return data({ ok: false, error: "The sale couldn't be read. Reload and try again." }, { status: 400 });
  const res = await saveCheck({
    organizationId: client.id,
    userId: auth.user.id,
    ruleSetId: String(form.get("ruleSetId") ?? ""),
    orderRef: String(form.get("orderRef") ?? "").slice(0, 120),
    sale,
    viesLookupId: String(form.get("viesLookupId") ?? "") || null,
  });
  return res.ok ? { ok: true, id: res.id } : data({ ok: false, error: res.error }, { status: 409 });
}

export default function Check({ loaderData }: Route.ComponentProps) {
  const { client, ruleSet, rates, initial, isAdmin } = loaderData;
  if (!client) {
    return (
      <>
        <PageHeader title="Check a sale" />
        <Banner tone="warn">
          {isAdmin ? (
            <>There are no clients yet. <Link to="/admin" className="font-semibold underline">Add one in Admin</Link>.</>
          ) : (
            "Your account isn't linked to a client yet. Ask PVM Consultants to add you."
          )}
        </Banner>
      </>
    );
  }
  if (!ruleSet) {
    return (
      <>
        <PageHeader title="Check a sale" />
        <Banner tone="warn">
          No rules have been published for {client.name} yet.
          {isAdmin ? <> <Link to={`/admin/clients/${client.slug}`} className="font-semibold underline">Review and publish the draft</Link>.</> : " PVM Consultants will let you know when it's ready."}
        </Banner>
      </>
    );
  }
  return (
    <>
      <PageHeader
        title="Check a sale"
        intro={`Enter where the goods ship from and go to, and who's buying. You'll get the VAT treatment, the company to invoice from, and the wording the invoice needs.`}
        actions={isAdmin ? <Link to={`/admin/clients/${client.slug}`} className={buttonClass("default", "sm")}>Edit rules</Link> : null}
      />
      <Checker
        key={`${client.id}-${ruleSet.id}`}
        rules={ruleSet.rules}
        rates={rates}
        initial={initial}
        organizationId={client.id}
        showInternals={isAdmin}
        ruleHref={isAdmin ? (id) => `/admin/clients/${client.slug}?rule=${encodeURIComponent(id)}` : undefined}
        versionLabel={`Rules version ${ruleSet.version}${ruleSet.publishedAt ? `, published ${new Date(ruleSet.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}` : ""}`}
        footer={({ inp, vies }) => <SaveToLog ruleSetId={ruleSet.id} inp={inp} vies={vies} />}
      />
    </>
  );
}
