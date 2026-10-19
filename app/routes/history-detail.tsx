import { Link } from "react-router";
import { Card, Notes, PageHeader, StatusBar, buttonClass } from "~/components/ui";
import { ENTITY, LEVEL_LABEL, VALUE_LABEL, fmtPct, inputToParams, placeLabel, valueRelevant, type EntityKey } from "~/engine";
import { authContext } from "~/lib/auth.server";
import { getCheck } from "~/models/checks.server";
import type { Route } from "./+types/history-detail";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: `${loaderData?.check.orderRef ?? "Saved check"} · VAT Rules Checker` },
];

export async function loader({ params, context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  if (!auth.activeClient) throw new Response("Not found", { status: 404 });
  const row = await getCheck(auth.activeClient.id, params.checkId);
  if (!row) throw new Response("Not found", { status: 404 });
  const { check, vies } = row;
  return {
    check: {
      id: check.id,
      orderRef: check.orderRef,
      at: check.createdAt.toISOString(),
      version: check.ruleSetVersion,
      input: check.input,
      result: check.result,
    },
    by: row.userName ? `${row.userName} (${row.userEmail})` : "Removed user",
    vies: vies
      ? {
          number: `${vies.countryCode}${vies.vatNumber}`,
          state: vies.state,
          code: vies.code,
          name: vies.name,
          address: vies.address,
          requestIdentifier: vies.requestIdentifier,
          requestDate: vies.requestDate,
          at: vies.createdAt.toISOString(),
        }
      : null,
  };
}

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-0.5 border-t border-line px-5 py-3 first:border-t-0 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[13.5px] font-medium text-muted">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

export default function HistoryDetail({ loaderData }: Route.ComponentProps) {
  const { check, by, vies } = loaderData;
  const r = check.result;
  const inp = check.input;
  const ent = r.entity ? ENTITY[r.entity as EntityKey] : null;
  return (
    <>
      <PageHeader
        title={check.orderRef ? `Order ${check.orderRef}` : "Saved check"}
        crumbs={[{ label: "Saved checks", to: "/history" }, { label: check.orderRef ?? "Saved check" }]}
        intro={`Saved ${fmtWhen(check.at)} by ${by}. Decided by rules version ${check.version}.`}
        actions={<Link to={`/check?${inputToParams(inp)}`} className={buttonClass("default", "sm")}>Check this sale again</Link>}
      />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <StatusBar level={r.level}>{LEVEL_LABEL[r.level]}</StatusBar>
          <dl>
            <Row label="Tax code"><span className="font-mono font-semibold uppercase">{r.code}</span></Row>
            <Row label="Rate">{fmtPct(r.rate)}{r.downgraded ? <span className="text-muted"> · recalculated as B2C after the VIES check</span> : null}</Row>
            {ent ? <Row label="Invoice from"><b>{ent.short}</b><div className="text-[13.5px] text-muted">{ent.text}</div></Row> : null}
            {r.invoice ? <Row label="Invoice wording">{r.invoice}</Row> : null}
            {r.notes.length ? <Row label="Compliance checks"><Notes notes={r.notes} /></Row> : null}
            {r.ruleName ? <Row label="Rule">{r.ruleName}</Row> : null}
          </dl>
        </Card>
        <div className="grid gap-5">
          <Card>
            <dl>
              <Row label="Ships from">{placeLabel(inp.dispatch)}</Row>
              <Row label="Delivered to">{placeLabel(inp.dest)}</Row>
              <Row label="Customer based in">{placeLabel(inp.cust)}</Row>
              <Row label="Customer type">{inp.type}</Row>
              {inp.type === "B2B" ? <Row label="Customer VAT number"><span className="font-mono">{inp.vatNumber || "Not given"}</span></Row> : null}
              {valueRelevant(inp) ? <Row label="Parcel value">{VALUE_LABEL[inp.value]}</Row> : null}
            </dl>
          </Card>
          {inp.type === "B2B" ? (
            <Card>
              <div className="border-b border-line px-5 py-3"><div className="eyebrow">VIES evidence</div></div>
              {vies ? (
                <dl>
                  <Row label="Number checked"><span className="font-mono">{vies.number}</span></Row>
                  <Row label="Answer">{{ valid: "Valid", invalid: "Not valid", unavailable: "VIES unavailable", error: "Couldn't be checked" }[vies.state]}{vies.code ? ` (${vies.code})` : ""}</Row>
                  <Row label="Checked at">{fmtWhen(vies.at)}</Row>
                  {vies.name ? <Row label="Registered name">{vies.name}</Row> : null}
                  {vies.address ? <Row label="Registered address"><span className="whitespace-pre-line">{vies.address}</span></Row> : null}
                  <Row label="Consultation number">{vies.requestIdentifier ? <span className="font-mono">{vies.requestIdentifier}</span> : <span className="text-muted">None (the requester VAT number isn't set up yet)</span>}</Row>
                </dl>
              ) : (
                <p className="px-5 py-4 text-muted">The VAT number wasn't checked with VIES before this was saved.</p>
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
