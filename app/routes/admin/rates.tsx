import { data, Form, useNavigation } from "react-router";
import { Button, Card, Chip, PageHeader } from "~/components/ui";
import { COUNTRY_CODE, RATE_COUNTRIES, fmtPct, placeLabel } from "~/engine";
import { authContext } from "~/lib/auth.server";
import { addRate, allRates, deleteFutureRate, today } from "~/models/rates.server";
import type { Route } from "./+types/rates";

export const meta: Route.MetaFunction = () => [{ title: "VAT rates · Admin · VAT Rules Checker" }];

export async function loader() {
  const rows = await allRates();
  const day = today();
  const byCountry = RATE_COUNTRIES.map((country) => {
    const list = rows.filter((r) => r.country === country); // newest first
    const current = list.find((r) => r.effectiveFrom <= day) ?? null;
    const upcoming = list.filter((r) => r.effectiveFrom > day).reverse();
    return {
      country,
      code: COUNTRY_CODE[country],
      current: current ? { rate: current.rate, from: current.effectiveFrom, source: current.source } : null,
      upcoming: upcoming.map((r) => ({ id: r.id, rate: r.rate, from: r.effectiveFrom, source: r.source })),
      history: list.filter((r) => r.effectiveFrom <= day && r !== current).map((r) => ({ id: r.id, rate: r.rate, from: r.effectiveFrom, source: r.source })),
    };
  });
  return { day, byCountry };
}

export async function action({ request, context }: Route.ActionArgs) {
  const auth = context.get(authContext);
  const form = await request.formData();
  if (form.get("intent") === "delete") {
    const ok = await deleteFutureRate(String(form.get("id")));
    return ok ? { ok: true, message: "Scheduled change removed." } : data({ ok: false, error: "Only changes that haven't started yet can be removed." }, { status: 400 });
  }
  const country = String(form.get("country") ?? "");
  const rate = Number(String(form.get("rate") ?? "").replace(",", "."));
  const effectiveFrom = String(form.get("effectiveFrom") ?? "");
  const source = String(form.get("source") ?? "").trim().slice(0, 500) || null;
  if (!RATE_COUNTRIES.includes(country)) return data({ ok: false, error: "Pick a country." }, { status: 400 });
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return data({ ok: false, error: "The rate should be a percentage between 0 and 100." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) return data({ ok: false, error: "Pick the date the rate applies from." }, { status: 400 });
  await addRate({ country, rate, effectiveFrom, source, userId: auth.user.id });
  return { ok: true, message: `${placeLabel(country)}: ${fmtPct(rate)} from ${fmtDate(effectiveFrom)} saved.` };
}

function fmtDate(d: string) {
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export default function Rates({ loaderData, actionData }: Route.ComponentProps) {
  const { day, byCountry } = loaderData;
  const busy = useNavigation().state === "submitting";
  return (
    <>
      <PageHeader
        title="Standard VAT rates"
        intro="Used by every client's rules wherever a rule says “delivery country's standard rate”, and by the {rate} and {destRate} placeholders. Add a change with the date it applies from; it takes over automatically on that day."
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-line text-2xs font-semibold tracking-[0.08em] text-muted uppercase">
                <th className="px-4 py-2.5 font-semibold">Country</th>
                <th className="px-4 py-2.5 text-right font-semibold">Rate today</th>
                <th className="px-4 py-2.5 font-semibold">Since</th>
                <th className="px-4 py-2.5 font-semibold">Scheduled</th>
              </tr>
            </thead>
            <tbody>
              {byCountry.map((c) => (
                <tr key={c.country} className="border-b border-line align-top last:border-b-0">
                  <td className="px-4 py-2.5">
                    <span className="mr-2 inline-block w-6 font-mono text-[11.5px] text-muted">{c.code}</span>
                    {placeLabel(c.country)}
                    {c.history.length ? (
                      <details className="mt-1 ml-8 text-[12.5px] text-muted">
                        <summary className="cursor-pointer">Earlier rates</summary>
                        <ul className="mt-1 grid gap-0.5">
                          {c.history.map((h) => <li key={h.id}>{fmtPct(h.rate)} from {fmtDate(h.from)}</li>)}
                        </ul>
                      </details>
                    ) : null}
                  </td>
                  <td className="tabular px-4 py-2.5 text-right font-mono font-semibold">{c.current ? fmtPct(c.current.rate) : <Chip tone="block">None</Chip>}</td>
                  <td className="px-4 py-2.5 text-muted" title={c.current?.source ?? undefined}>{c.current ? fmtDate(c.current.from) : "–"}</td>
                  <td className="px-4 py-2.5">
                    {c.upcoming.length ? (
                      <ul className="grid gap-1">
                        {c.upcoming.map((u) => (
                          <li key={u.id} className="flex flex-wrap items-center gap-2">
                            <Chip tone="accent">{fmtPct(u.rate)} from {fmtDate(u.from)}</Chip>
                            <Form method="post">
                              <input type="hidden" name="intent" value="delete" />
                              <input type="hidden" name="id" value={u.id} />
                              <button type="submit" className="text-[12.5px] font-semibold text-block underline" disabled={busy}>Remove</button>
                            </Form>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-muted">–</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card className="p-4 lg:sticky lg:top-4">
          <h2 className="wide mb-3 text-[17px] font-bold">Add a rate change</h2>
          <Form method="post" className="grid gap-3">
            <input type="hidden" name="intent" value="add" />
            <div className="grid gap-1.5">
              <label htmlFor="country" className="text-[13px] font-semibold">Country</label>
              <select id="country" name="country" required className="field-control" defaultValue="">
                <option value="" disabled>Choose…</option>
                {RATE_COUNTRIES.map((c) => <option key={c} value={c}>{placeLabel(c)}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label htmlFor="rate" className="text-[13px] font-semibold">Standard rate (%)</label>
                <input id="rate" name="rate" type="number" min={0} max={100} step={0.1} required className="field-control" />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="effectiveFrom" className="text-[13px] font-semibold">Applies from</label>
                <input id="effectiveFrom" name="effectiveFrom" type="date" required defaultValue={day} className="field-control" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="source" className="text-[13px] font-semibold">Source</label>
              <input id="source" name="source" className="field-control" placeholder="e.g. link to the official announcement" />
            </div>
            {actionData ? (
              <p className={actionData.ok ? "text-[13px] font-semibold text-ok" : "text-[13px] font-semibold text-block"} role="status">
                {"message" in actionData ? actionData.message : actionData.error}
              </p>
            ) : null}
            <Button type="submit" variant="primary" disabled={busy}>Save rate</Button>
            <p className="text-[12.5px] text-muted">Saving a rate for a date that already has one replaces it. Rates that have started can't be deleted, so the history stays intact.</p>
          </Form>
        </Card>
      </div>
    </>
  );
}
