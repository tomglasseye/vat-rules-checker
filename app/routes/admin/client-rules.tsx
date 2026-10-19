import { useEffect, useMemo, useRef, useState } from "react";
import { data, useBeforeUnload, useBlocker, useFetcher, useSearchParams } from "react-router";
import { RulesEditor, useHealth, type DraftState } from "~/components/RulesEditor";
import { Banner, Button, Card } from "~/components/ui";
import { parseRuleSet } from "~/engine/validate";
import { authContext } from "~/lib/auth.server";
import { getClientBySlug } from "~/models/clients.server";
import { ratesOn } from "~/models/rates.server";
import { getDraft, getPublished, publishDraft, resetDraftTo, saveDraft } from "~/models/rules.server";
import type { Route } from "./+types/client-rules";

export const meta: Route.MetaFunction = () => [{ title: "Draft rules · Admin · VAT Rules Checker" }];

async function clientOr404(slug: string) {
  const org = await getClientBySlug(slug);
  if (!org) throw new Response("Client not found", { status: 404 });
  return org;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export async function loader({ params, context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  const org = await clientOr404(params.slug);
  const [draft, live, rates] = await Promise.all([getDraft(org.id, auth.user.id), getPublished(org.id), ratesOn()]);
  return {
    client: { id: org.id, slug: org.slug, name: org.name },
    draft: { rules: draft.rules, tests: draft.tests, updatedAt: draft.updatedAt.toISOString() },
    live: live ? { version: live.version!, sameAsDraft: same(live.rules, draft.rules) && same(live.tests, draft.tests) } : null,
    rates,
  };
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const auth = context.get(authContext);
  const org = await clientOr404(params.slug);
  const form = await request.formData();
  const intent = String(form.get("intent"));

  if (intent === "reset") {
    const live = await getPublished(org.id);
    if (!live?.version) return data({ ok: false, error: "There's no published version to go back to." }, { status: 400 });
    await resetDraftTo(org.id, live.version, auth.user.id);
    return { ok: true, message: `Draft reset to version ${live.version}.` };
  }

  if (intent === "save" || intent === "publish") {
    let raw: unknown;
    try {
      raw = JSON.parse(String(form.get("draft") ?? ""));
    } catch {
      return data({ ok: false, error: "The draft couldn't be read." }, { status: 400 });
    }
    const parsed = parseRuleSet(raw);
    if (!parsed.ok) return data({ ok: false, error: parsed.error }, { status: 400 });
    await saveDraft(org.id, parsed.rules, parsed.tests, auth.user.id);
    if (intent === "save") return { ok: true, message: "Draft saved." };
    const res = await publishDraft(org.id, String(form.get("summary") ?? "").slice(0, 2000), auth.user.id);
    if (!res.ok) return data({ ok: false, error: res.error }, { status: 409 });
    return { ok: true, message: `Published as version ${res.version}. ${org.name}'s staff now check against it.` };
  }
  return data({ ok: false, error: "Unknown action" }, { status: 400 });
}

export default function ClientRules({ loaderData }: Route.ComponentProps) {
  const { client, draft, live, rates } = loaderData;
  const [searchParams] = useSearchParams();
  // Re-adopt the server's draft only when it was actually saved again (save, publish, reset)
  const saved = useMemo<DraftState>(() => ({ rules: draft.rules, tests: draft.tests }), [draft.updatedAt]);
  const [state, setState] = useState<DraftState>(saved);
  const savedJson = useRef(JSON.stringify(saved));

  // When the loader brings a new saved draft (after save, publish or reset), adopt it
  useEffect(() => {
    savedJson.current = JSON.stringify(saved);
    setState(saved);
  }, [saved]);

  const dirty = JSON.stringify(state) !== savedJson.current;
  const h = useHealth(state, rates);
  const fetcher = useFetcher<{ ok: boolean; message?: string; error?: string }>();
  const busy = fetcher.state !== "idle";
  const [publishing, setPublishing] = useState(false);
  const [summary, setSummary] = useState("");

  useBeforeUnload((e) => {
    if (dirty) e.preventDefault();
  });
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);

  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.ok) {
      setPublishing(false);
      setSummary("");
    }
  }, [fetcher.state, fetcher.data]);

  const submit = (intent: "save" | "publish" | "reset") =>
    fetcher.submit(intent === "reset" ? { intent } : { intent, draft: JSON.stringify(state), summary }, { method: "post" });

  const canPublish = h.ok && (dirty || !live?.sameAsDraft);

  return (
    <>
      <div className="sticky top-0 z-10 -mx-4 mb-4 border-b border-line bg-bg/95 px-4 py-2.5 backdrop-blur-sm sm:-mx-7 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13.5px]">
            {dirty ? (
              <span className="font-semibold text-warn">Unsaved changes</span>
            ) : live?.sameAsDraft ? (
              <span className="text-muted">Draft matches the live version {live.version}</span>
            ) : (
              <span className="text-muted">Draft saved {new Date(draft.updatedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{live ? `, not yet published (live is version ${live.version})` : ", never published"}</span>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {dirty ? <Button size="sm" variant="ghost" onClick={() => setState(JSON.parse(savedJson.current))}>Undo changes</Button> : null}
            {!dirty && live && !live.sameAsDraft ? <Button size="sm" variant="ghost" disabled={busy} onClick={() => submit("reset")}>Go back to version {live.version}</Button> : null}
            <Button size="sm" disabled={!dirty || busy} onClick={() => submit("save")}>{busy && fetcher.formData?.get("intent") === "save" ? "Saving…" : "Save draft"}</Button>
            <Button size="sm" variant="primary" disabled={!canPublish || busy} onClick={() => setPublishing(true)} title={!h.ok ? "Fix failing tests, gaps and dead rules first" : undefined}>
              Publish…
            </Button>
          </div>
        </div>
        {fetcher.state === "idle" && fetcher.data ? (
          <p className={fetcher.data.ok ? "mt-1 text-[13px] font-semibold text-ok" : "mt-1 text-[13px] font-semibold text-block"} role="status">
            {fetcher.data.message ?? fetcher.data.error}
          </p>
        ) : null}
      </div>

      {blocker.state === "blocked" ? (
        <div className="mb-4">
          <Banner tone="warn">
            <p>You have unsaved changes to {client.name}'s draft.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={() => { submit("save"); blocker.reset(); }}>Save and stay</Button>
              <Button size="sm" variant="danger" onClick={() => blocker.proceed()}>Leave without saving</Button>
              <Button size="sm" onClick={() => blocker.reset()}>Stay</Button>
            </div>
          </Banner>
        </div>
      ) : null}

      {publishing ? (
        <Card className="mb-4 p-4">
          <h2 className="wide text-[17px] font-bold">Publish a new version for {client.name}</h2>
          <p className="mt-1 text-[14px] text-muted">
            Version {(live?.version ?? 0) + 1} replaces {live ? `version ${live.version}` : "nothing"} for everyone at {client.name} as soon as you publish. Saved checks keep the version they were made with.
            {h.signoff ? ` ${h.signoff} rule${h.signoff === 1 ? " is" : "s are"} still marked “needs sign-off”.` : ""}
          </p>
          <label htmlFor="summary" className="mt-3 block text-[13px] font-semibold">What changed</label>
          <textarea id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} className="field-control mt-1.5" placeholder="e.g. Triangulation now also covers customers based outside the delivery country" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" disabled={busy || !h.ok} onClick={() => submit("publish")}>{busy ? "Publishing…" : `Publish version ${(live?.version ?? 0) + 1}`}</Button>
            <Button onClick={() => setPublishing(false)}>Cancel</Button>
          </div>
        </Card>
      ) : null}

      {!h.ok ? (
        <div className="mb-4">
          <Banner tone="warn">This draft can't be published until every test passes, every sale is covered and no rule is unreachable.</Banner>
        </div>
      ) : null}

      <RulesEditor
        state={state}
        setState={setState}
        rates={rates}
        h={h}
        initialOpen={searchParams.get("rule")}
        tryHref={(qs) => `/admin/clients/${client.slug}/try?${qs}`}
      />
    </>
  );
}
