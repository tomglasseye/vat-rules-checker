import { Form, Link } from "react-router";
import { Banner, Card, LevelIcon, PageHeader, buttonClass } from "~/components/ui";
import { describeInputs, fmtPct, LEVEL_LABEL } from "~/engine";
import { authContext } from "~/lib/auth.server";
import { listChecks } from "~/models/checks.server";
import type { Route } from "./+types/history";

export const meta: Route.MetaFunction = () => [{ title: "Saved checks · VAT Rules Checker" }];

export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  const q = new URL(request.url).searchParams.get("q")?.trim() || null;
  if (!auth.activeClient) return { client: null, rows: [], q };
  const rows = await listChecks(auth.activeClient.id, q);
  return {
    client: { name: auth.activeClient.name },
    q,
    rows: rows.map((r) => ({
      id: r.id,
      orderRef: r.orderRef,
      route: describeInputs(r.input),
      code: r.result.code,
      rate: r.result.rate,
      level: r.result.level,
      version: r.ruleSetVersion,
      by: r.userName ?? "Removed user",
      at: r.createdAt.toISOString(),
    })),
  };
}

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function History({ loaderData }: Route.ComponentProps) {
  const { client, rows, q } = loaderData;
  return (
    <>
      <PageHeader
        title="Saved checks"
        intro={client ? `Every sale saved from the checker for ${client.name}, newest first, with the rules version that decided it.` : undefined}
        actions={
          <Form method="get" role="search" className="flex gap-2">
            <label htmlFor="q" className="sr-only">Search by order reference</label>
            <input id="q" name="q" defaultValue={q ?? ""} placeholder="Order reference" className="field-control w-[200px]" />
            <button type="submit" className={buttonClass("default")}>Search</button>
          </Form>
        }
      />
      {!client ? (
        <Banner tone="warn">Pick a client first.</Banner>
      ) : rows.length === 0 ? (
        <Card className="px-5 py-8 text-center text-muted">
          {q ? <>No saved checks match “{q}”. <Link to="/history" className="font-semibold text-accent underline">Show all</Link></> : <>Nothing saved yet. Check a sale and press <b className="text-ink">Save to log</b>.</>}
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-[14px]">
            <thead>
              <tr className="border-b border-line text-2xs font-semibold tracking-[0.08em] text-muted uppercase">
                <th className="px-4 py-2.5 font-semibold">When</th>
                <th className="px-4 py-2.5 font-semibold">Order ref</th>
                <th className="px-4 py-2.5 font-semibold">Sale</th>
                <th className="px-4 py-2.5 font-semibold">Result</th>
                <th className="px-4 py-2.5 font-semibold">By</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-b-0 hover:bg-sunken/60">
                  <td className="px-4 py-3 align-top whitespace-nowrap">
                    <Link to={`/history/${r.id}`} className="font-semibold text-accent underline-offset-3 hover:underline">{fmtWhen(r.at)}</Link>
                  </td>
                  <td className="px-4 py-3 align-top font-mono text-[13px]">{r.orderRef ?? <span className="text-muted">–</span>}</td>
                  <td className="px-4 py-3 align-top text-muted">{r.route}</td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-start gap-2">
                      <LevelIcon level={r.level} className="mt-0.5" />
                      <div>
                        <div className="font-mono text-[13px] font-semibold uppercase">{r.code}{r.rate !== null ? ` · ${fmtPct(r.rate)}` : ""}</div>
                        <div className="text-[12.5px] text-muted">{LEVEL_LABEL[r.level]} · rules v{r.version}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top whitespace-nowrap text-muted">{r.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
