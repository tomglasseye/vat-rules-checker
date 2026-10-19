// The sale checker: numbered input boxes on the left, the live result on the right.
// Results are worked out in the browser as you type; saving re-checks on the server.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useFetcher } from "react-router";
import {
  ENTITY, EU_NAMES, LEVEL_LABEL, checkVatFormat, evaluate, fmtPct, inputNotes, placeLabel, valueRelevant,
  type CheckInput, type Rates, type Rule, type SaleType,
} from "~/engine";
import { BoxNo, Button, Chip, IconBlock, IconOk, IconWarn, Notes, Seg, StatusBar, cx } from "./ui";

export interface ViesInfo {
  id: string;
  number: string;
  country: string;
  state: "valid" | "invalid" | "unavailable";
  code?: string;
  name?: string;
  address?: string;
  requestIdentifier?: string;
  at: string;
}

type VatUi = { status: "idle" } | { status: "checking" } | { status: "error"; message: string } | { status: "done"; info: ViesInfo };

function Cell({ n, label, htmlFor, labelId, children, className, dim }: { n: number; label: string; htmlFor?: string; labelId?: string; children: ReactNode; className?: string; dim?: boolean }) {
  const Lab = htmlFor ? "label" : "span";
  return (
    <div className={cx("flex min-w-0 flex-col gap-2.5 border-t border-line px-5 pt-4 pb-5", className)}>
      <Lab {...(htmlFor ? { htmlFor } : {})} id={labelId} className="flex items-center gap-2 text-[14px] font-medium text-head">
        <BoxNo n={n} dim={dim} />
        {label}
      </Lab>
      {children}
    </div>
  );
}

function PlaceSelect({ id, value, onChange, dispatch }: { id: string; value: string; onChange: (v: string) => void; dispatch?: boolean }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="field-control">
      {dispatch ? <option value="UK">United Kingdom</option> : null}
      <optgroup label="EU">
        {EU_NAMES.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </optgroup>
      {!dispatch ? (
        <optgroup label="Outside the EU">
          <option value="UK">United Kingdom</option>
          <option value="ROW">Rest of world</option>
        </optgroup>
      ) : null}
    </select>
  );
}

function VatStatus({ vat, inp }: { vat: VatUi; inp: CheckInput }) {
  if (vat.status === "error") return <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-warn"><IconWarn />{vat.message}</span>;
  if (vat.status === "checking") return <span className="text-[13px] font-semibold">Checking with VIES…</span>;
  if (vat.status === "idle" || inp.vies === "unchecked") {
    const fmt = inp.vatNumber ? checkVatFormat(inp.vatNumber) : null;
    return (
      <p className="text-[12.5px] text-muted">
        {fmt && fmt.ok
          ? `Registered in ${placeLabel(fmt.country)}. Not checked yet.`
          : "Needed for any 0% business sale within the EU. If VIES says it's invalid, the sale switches to B2C automatically."}
      </p>
    );
  }
  const { info } = vat;
  const t = new Date(info.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const head = {
    valid: <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ok"><IconOk />Valid · {info.number} checked at {t}</span>,
    invalid: <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-block"><IconBlock />Not valid · {info.number} checked at {t}</span>,
    unavailable: (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-warn">
        <IconWarn />VIES didn't answer at {t}{info.code ? ` (${info.code})` : ""}. Try again in a few minutes.
      </span>
    ),
  }[info.state];
  return (
    <div className="grid gap-1">
      {head}
      {info.state === "valid" ? (
        info.name || info.address ? (
          <div className="mt-2 grid gap-0.5 rounded-card bg-sunken px-3 py-2.5 text-sm">
            <div className="eyebrow">Registered to (from VIES)</div>
            <div className="font-semibold">{info.name || "Name not shared"}</div>
            {info.address ? <div className="whitespace-pre-line text-muted">{info.address}</div> : null}
            <p className="mt-1 text-[12.5px] text-muted">Check this matches the customer on the order.</p>
          </div>
        ) : (
          <p className="text-[12.5px] text-muted">{placeLabel(info.country)} doesn't share the registered name and address through VIES, so check them against the customer's own documents.</p>
        )
      ) : null}
      {info.requestIdentifier ? (
        <p className="text-[12.5px] text-muted">VIES consultation number: <span className="font-mono">{info.requestIdentifier}</span></p>
      ) : null}
    </div>
  );
}

export interface CheckerProps {
  rules: Rule[];
  rates: Rates;
  initial: CheckInput;
  organizationId: string;
  /** Show review notes and rule links (PVM admins) */
  showInternals: boolean;
  /** Where "View rule" goes, for admins */
  ruleHref?: (ruleId: string) => string;
  /** Rendered under the result: save to log, or save as test */
  footer?: (state: { inp: CheckInput; vies: ViesInfo | null; result: ReturnType<typeof evaluate> }) => ReactNode;
  versionLabel?: ReactNode;
}

export function Checker({ rules, rates, initial, organizationId, showInternals, ruleHref, footer, versionLabel }: CheckerProps) {
  const [inp, setInp] = useState<CheckInput>({ ...initial, vies: "unchecked" });
  const [vat, setVat] = useState<VatUi>({ status: "idle" });
  const checkingFor = useRef<string | null>(null);

  const model = useMemo(() => ({ rules, rates }), [rules, rates]);
  const res = useMemo(() => evaluate(inp, model), [inp, model]);
  const notes = useMemo(() => [...res.notes, ...inputNotes(inp)], [res, inp]);
  const update = (patch: Partial<CheckInput>) => setInp((p) => ({ ...p, ...patch }));

  async function checkVat() {
    const fmt = checkVatFormat(inp.vatNumber ?? "");
    if (!fmt.ok) {
      update({ vies: "unchecked" });
      setVat({ status: "error", message: fmt.reason });
      return;
    }
    update({ vatNumber: fmt.clean });
    checkingFor.current = fmt.clean;
    setVat({ status: "checking" });
    let d: any;
    try {
      const r = await fetch("/api/vies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vatNumber: fmt.clean, organizationId }),
      });
      d = await r.json();
    } catch {
      d = { state: "unavailable", code: "NETWORK" };
    }
    if (checkingFor.current !== fmt.clean) return; // number edited while checking
    if (!d?.state || d.state === "error") {
      update({ vies: "unchecked" });
      setVat({ status: "error", message: d?.reason ?? `VIES couldn't check that number${d?.code ? ` (${d.code})` : ""}. Check it's typed correctly.` });
      return;
    }
    update({ vies: d.state });
    setVat({
      status: "done",
      info: { id: d.id ?? "", number: fmt.clean, country: fmt.country, state: d.state, code: d.code, name: d.name, address: d.address, requestIdentifier: d.requestIdentifier, at: new Date().toISOString() },
    });
  }

  const showValue = valueRelevant(inp, rules);
  const ent = res.entity ? ENTITY[res.entity] : null;
  const viesInfo = vat.status === "done" ? vat.info : null;

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-7">
      <form
        className="grid grid-cols-1 overflow-hidden rounded-card border border-line bg-surface sm:grid-cols-2 [&>*:first-child]:border-t-0 sm:[&>*:nth-child(2)]:border-t-0"
        autoComplete="off"
        onSubmit={(e) => {
          e.preventDefault();
          if (inp.type === "B2B") checkVat();
        }}
      >
        <Cell n={1} label="Ships from" htmlFor="dispatch" className="sm:border-r">
          <PlaceSelect id="dispatch" dispatch value={inp.dispatch} onChange={(v) => update({ dispatch: v })} />
        </Cell>
        <Cell n={2} label="Delivered to" htmlFor="dest">
          <PlaceSelect id="dest" value={inp.dest} onChange={(v) => update({ dest: v })} />
        </Cell>
        <Cell n={3} label="Customer based in" htmlFor="cust" className="sm:border-r">
          <PlaceSelect id="cust" value={inp.cust} onChange={(v) => update({ cust: v })} />
        </Cell>
        <Cell n={4} label="Customer type" labelId="lab-type">
          <Seg<SaleType>
            name="type"
            labelledBy="lab-type"
            value={inp.type}
            onChange={(v) => update({ type: v })}
            options={[{ value: "B2B", label: "B2B" }, { value: "B2C", label: "B2C" }]}
          />
        </Cell>
        {inp.type === "B2B" ? (
          <Cell n={5} label="Customer EU VAT number" htmlFor="vat" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              <input
                id="vat"
                type="text"
                spellCheck={false}
                placeholder="e.g. IE1234567FA"
                value={inp.vatNumber ?? ""}
                onChange={(e) => {
                  checkingFor.current = null;
                  update({ vatNumber: e.target.value, vies: "unchecked" });
                  setVat({ status: "idle" });
                }}
                className="field-control flex-[1_1_180px] font-mono tracking-[0.02em] uppercase placeholder:normal-case"
              />
              <Button type="submit" variant="primary" disabled={vat.status === "checking" || !(inp.vatNumber ?? "").trim()}>
                Check with VIES
              </Button>
            </div>
            <div aria-live="polite">
              <VatStatus vat={vat} inp={inp} />
            </div>
          </Cell>
        ) : null}
        {showValue ? (
          <Cell n={5} label="Parcel value" labelId="lab-value" className="sm:col-span-2">
            <Seg
              name="value"
              labelledBy="lab-value"
              value={inp.value}
              onChange={(v) => update({ value: v })}
              options={[{ value: "low", label: "€150 or less" }, { value: "high", label: "Over €150" }]}
            />
            <p className="text-[12.5px] text-muted">Only asked for UK stock sold to an EU consumer. It decides between IOSS and import VAT at the border.</p>
          </Cell>
        ) : null}
      </form>

      <section aria-live="polite" aria-label="Result" className="overflow-hidden rounded-card border border-line bg-surface">
        <StatusBar level={res.level}>{LEVEL_LABEL[res.level]}</StatusBar>
        <div className="grid gap-1.5 px-5 pt-5 pb-2">
          {res.rate !== null ? (
            <>
              <div className="tabular text-[clamp(44px,6vw,60px)] leading-none font-semibold tracking-[-0.02em] text-head">{fmtPct(res.rate)}</div>
              <div className="font-mono text-[15px] font-semibold tracking-[0.03em] uppercase [overflow-wrap:anywhere]">{res.code}</div>
            </>
          ) : (
            <div className="font-mono text-[clamp(20px,3vw,26px)] leading-tight font-semibold tracking-[0.03em] uppercase [overflow-wrap:anywhere]">{res.code}</div>
          )}
          {res.f.downgraded ? <div className="text-[13.5px] text-muted">Recalculated as B2C after the VIES check</div> : null}
        </div>

        {ent && res.level !== "block" ? (
          <Section title="Invoice from">
            <div className="flex items-start gap-3 text-[14px]">
              <span className={cx("shrink-0 rounded-field px-2 py-1 font-mono text-[13px] font-semibold", res.entity === "UK" ? "bg-btn text-head" : "bg-accent-soft text-accent")}>{res.entity}</span>
              <div>
                <b>{ent.short}</b>
                <div className="text-[13.5px] text-muted">{ent.text}</div>
              </div>
            </div>
          </Section>
        ) : null}

        {res.invoice ? (
          <Section title="Invoice wording">
            <Wording text={res.invoice} />
          </Section>
        ) : null}

        {notes.length ? (
          <Section title="Compliance checks">
            <Notes notes={notes} />
          </Section>
        ) : null}

        <Section title="Why this result">
          {res.rule ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span>Rule <b>{res.idx + 1}</b> of {rules.length}: {res.rule.name}</span>
                {showInternals && res.rule.signoff ? <Chip tone="outline-warn">Needs sign-off</Chip> : null}
                {showInternals && ruleHref ? (
                  <Link to={ruleHref(res.rule.id)} className="font-semibold text-accent underline underline-offset-3">View rule</Link>
                ) : null}
              </div>
              {showInternals && res.rule.note ? <p className="border-l-3 border-line py-0.5 pl-2.5 text-[13.5px] text-muted">{res.rule.note}</p> : null}
            </>
          ) : (
            <p className="text-sm">No rule matched this sale.</p>
          )}
          {versionLabel ? <p className="text-[12.5px] text-muted">{versionLabel}</p> : null}
        </Section>

        {footer ? <div className="border-t border-line px-5 pt-4 pb-5">{footer({ inp, vies: viesInfo, result: res })}</div> : null}
      </section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-t border-line px-5 py-4">
      <div className="eyebrow">{title}</div>
      {children}
    </div>
  );
}

function Wording({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [text]);
  return (
    <div className="flex items-start gap-2.5 rounded-card border border-line bg-sunken py-3 pr-3 pl-3.5">
      <p className="min-w-0 flex-1 text-[14.5px]">{text}</p>
      <Button
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </Button>
    </div>
  );
}

/** Save-to-log form shown under the result on the live checker */
export function SaveToLog({ ruleSetId, inp, vies }: { ruleSetId: string; inp: CheckInput; vies: ViesInfo | null }) {
  const fetcher = useFetcher<{ ok: boolean; id?: string; error?: string }>();
  const [orderRef, setOrderRef] = useState("");
  const saving = fetcher.state !== "idle";
  const done = fetcher.state === "idle" && fetcher.data?.ok;
  const lastSaved = useRef<string | null>(null);
  useEffect(() => {
    if (done && fetcher.data?.id && lastSaved.current !== fetcher.data.id) {
      lastSaved.current = fetcher.data.id;
      setOrderRef("");
    }
  }, [done, fetcher.data]);
  const sale: CheckInput = { ...inp, vatNumber: inp.type === "B2B" ? inp.vatNumber ?? "" : "" };
  return (
    <fetcher.Form method="post" className="grid gap-2">
      <input type="hidden" name="intent" value="save" />
      <input type="hidden" name="ruleSetId" value={ruleSetId} />
      <input type="hidden" name="sale" value={JSON.stringify(sale)} />
      <input type="hidden" name="viesLookupId" value={vies && vies.number === (inp.vatNumber ?? "").toUpperCase() ? vies.id : ""} />
      <label htmlFor="orderRef" className="flex items-center gap-2 text-[14px] font-medium text-head">
        <BoxNo n={6} />Order reference
      </label>
      <div className="flex flex-wrap gap-2">
        <input id="orderRef" name="orderRef" value={orderRef} onChange={(e) => setOrderRef(e.target.value)} maxLength={120} placeholder="e.g. SO-10482" className="field-control flex-[1_1_180px]" />
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save to log"}</Button>
      </div>
      <p className="text-[13px] text-muted" aria-live="polite">
        {fetcher.data?.error ? <span className="font-semibold text-block">{fetcher.data.error}</span> : null}
        {done && fetcher.data?.id ? (
          <>
            Saved. <Link to={`/history/${fetcher.data.id}`} className="font-semibold text-accent underline underline-offset-3">View the record</Link>
          </>
        ) : !fetcher.data ? (
          "Keeps the result, the rules version and any VIES answer as a record for this order."
        ) : null}
      </p>
    </fetcher.Form>
  );
}

