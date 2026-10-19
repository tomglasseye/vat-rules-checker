import { useState } from "react";
import { data, useFetcher } from "react-router";
import { Checker } from "~/components/Checker";
import { Banner, Button } from "~/components/ui";
import { DEFAULT_INPUT, describeInputs, evaluate, inputFromParams, saleFromJson, scenarioFromResult, type CheckInput } from "~/engine";
import { authContext } from "~/lib/auth.server";
import { getClientBySlug } from "~/models/clients.server";
import { ratesOn } from "~/models/rates.server";
import { getDraft, saveDraft } from "~/models/rules.server";
import type { Route } from "./+types/client-try";

export const meta: Route.MetaFunction = () => [{ title: "Try the draft · Admin · VAT Rules Checker" }];

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  const org = await getClientBySlug(params.slug);
  if (!org) throw new Response("Client not found", { status: 404 });
  const [draft, rates] = await Promise.all([getDraft(org.id, auth.user.id), ratesOn()]);
  return {
    client: { id: org.id, slug: org.slug, name: org.name },
    rules: draft.rules,
    rates,
    initial: inputFromParams(new URL(request.url).searchParams, DEFAULT_INPUT),
  };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const auth = context.get(authContext);
  const org = await getClientBySlug(params.slug);
  if (!org) throw new Response("Client not found", { status: 404 });
  const form = await request.formData();
  const sale = saleFromJson(String(form.get("sale") ?? ""));
  const label = String(form.get("label") ?? "").trim().slice(0, 200);
  if (!sale) return data({ ok: false, error: "The sale couldn't be read." }, { status: 400 });
  const draft = await getDraft(org.id, auth.user.id);
  const res = evaluate(sale, { rules: draft.rules, rates: await ratesOn() });
  const test = scenarioFromResult(`t-${Date.now().toString(36)}`, label || describeInputs(sale), sale, res);
  await saveDraft(org.id, draft.rules, [...draft.tests, test], auth.user.id);
  return { ok: true, label: test.label };
}

function SaveAsTest({ inp }: { inp: CheckInput }) {
  const fetcher = useFetcher<{ ok: boolean; label?: string; error?: string }>();
  const [label, setLabel] = useState("");
  return (
    <fetcher.Form method="post" className="grid gap-2" onSubmit={() => setLabel("")}>
      <input type="hidden" name="sale" value={JSON.stringify(inp)} />
      <label htmlFor="label" className="text-[13px] font-semibold">Save as a test scenario</label>
      <div className="flex flex-wrap gap-2">
        <input id="label" name="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={describeInputs(inp)} className="field-control flex-[1_1_200px]" />
        <Button type="submit" disabled={fetcher.state !== "idle"}>Save test</Button>
      </div>
      <p className="text-[13px] text-muted" aria-live="polite">
        {fetcher.data?.ok ? <span className="font-semibold text-ok">Added “{fetcher.data.label}” to the draft's tests, expecting today's answer.</span> : "Locks in this answer, so a later rule change that alters it shows up as a failing test."}
      </p>
    </fetcher.Form>
  );
}

export default function ClientTry({ loaderData }: Route.ComponentProps) {
  const { client, rules, rates, initial } = loaderData;
  return (
    <>
      <div className="mb-4">
        <Banner tone="info">This runs the <b>saved draft</b>, which {client.name}'s staff can't see until you publish it. Save any edits on the Draft rules tab first.</Banner>
      </div>
      <Checker
        rules={rules}
        rates={rates}
        initial={initial}
        organizationId={client.id}
        showInternals
        ruleHref={(id) => `/admin/clients/${client.slug}?rule=${encodeURIComponent(id)}`}
        versionLabel="Draft rules"
        footer={({ inp }) => <SaveAsTest inp={{ ...inp, vatNumber: "" }} />}
      />
    </>
  );
}
