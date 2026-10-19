// Draft rules editor: reorder, edit, add and remove rules, with tests and the coverage check
// re-run on every change. Saving sends the whole draft; publishing is checked again on the server.
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import {
  ENTITY, LEVEL_LABEL, ORIGIN_LABEL, VALUE_LABEL, VIES_LABEL, ZONE_LABEL, describeInputs, fmtPct, health, inputToParams,
  scenarioFromResult, type Health, type Rates, type Rule, type TestScenario, type When,
} from "~/engine";
import { Button, Chip, IconButton, IconDown, IconEdit, IconUp, LevelIcon, Stat, Stats, buttonClass, cx } from "./ui";

const num = (n: number) => n.toLocaleString("en-GB");

// ---------- Condition display ----------

function rateText(r: Rule["then"]["rate"]) {
  if (r.kind === "none") return "No rate";
  if (r.kind === "dest") return "Delivery country's rate";
  return fmtPct(Number(r.value));
}

function Conds({ w }: { w: When }) {
  const chips: ReactNode[] = [];
  const list = <K extends keyof When>(k: K, label: string, map: (v: string) => string) => {
    const v = w[k] as string[] | undefined;
    if (!Array.isArray(v)) return;
    chips.push(
      v.length === 0 ? (
        <span key={k} className="rounded-field bg-block-soft px-2 py-0.5 text-[13px] text-block"><b className="mr-1 text-xs font-semibold">{label}</b>nothing selected</span>
      ) : (
        <span key={k} className="rounded-field bg-sunken px-2 py-0.5 text-[13px]"><b className="mr-1 text-xs font-semibold text-muted">{label}</b>{v.map(map).join(" / ")}</span>
      ),
    );
  };
  list("origin", "Ships from", (o) => ORIGIN_LABEL[o as keyof typeof ORIGIN_LABEL] ?? o);
  list("type", "Customer", (t) => t);
  list("destZone", "Delivered to", (z) => ZONE_LABEL[z as keyof typeof ZONE_LABEL] ?? z);
  list("custZone", "Customer in", (z) => ZONE_LABEL[z as keyof typeof ZONE_LABEL] ?? z);
  if (typeof w.dispatchIsDest === "boolean") chips.push(<span key="did" className="rounded-field bg-sunken px-2 py-0.5 text-[13px]">{w.dispatchIsDest ? "Ships from = delivered to" : "Ships from ≠ delivered to"}</span>);
  if (typeof w.custIsDest === "boolean") chips.push(<span key="cid" className="rounded-field bg-sunken px-2 py-0.5 text-[13px]">{w.custIsDest ? "Customer country = delivery country" : "Customer country ≠ delivery country"}</span>);
  list("vies", "VIES", (v) => VIES_LABEL[v as keyof typeof VIES_LABEL] ?? v);
  list("value", "Parcel", (v) => VALUE_LABEL[v as keyof typeof VALUE_LABEL] ?? v);
  if (!chips.length) chips.push(<span key="any" className="rounded-field bg-sunken px-2 py-0.5 text-[13px]">Any sale</span>);
  return <div className="flex flex-wrap gap-1.5">{chips}</div>;
}

const LEVEL_TEXT = { ok: "text-ok", warn: "text-warn", block: "text-block" } as const;

// ---------- Rule editor form ----------

const ZONES = ["UK", "NL", "EU", "ROW"] as const;
const FIELD_DEFS = [
  { k: "origin", label: "Ships from", vals: ["UK", "NL", "OTHER"], lab: (v: string) => ORIGIN_LABEL[v as keyof typeof ORIGIN_LABEL] },
  { k: "type", label: "Customer type", vals: ["B2B", "B2C"], lab: (v: string) => v },
  { k: "destZone", label: "Delivered to", vals: ZONES, lab: (v: string) => ZONE_LABEL[v as keyof typeof ZONE_LABEL] },
  { k: "custZone", label: "Customer based in", vals: ZONES, lab: (v: string) => ZONE_LABEL[v as keyof typeof ZONE_LABEL] },
  { k: "vies", label: "VIES result (B2B only)", vals: ["unchecked", "valid", "unavailable"], lab: (v: string) => VIES_LABEL[v as keyof typeof VIES_LABEL] },
  { k: "value", label: "Parcel value (UK stock to EU consumer)", vals: ["low", "high"], lab: (v: string) => VALUE_LABEL[v as keyof typeof VALUE_LABEL] },
] as const;

function Field({ label, htmlFor, children, className }: { label: string; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cx("grid min-w-0 gap-1.5", className)}>
      {htmlFor ? <label htmlFor={htmlFor} className="text-[14px] font-medium">{label}</label> : <span className="text-[13px] font-semibold">{label}</span>}
      {children}
    </div>
  );
}

function Check({ id, checked, onChange, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-1.5 text-sm">
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-(--color-accent)" />
      {children}
    </label>
  );
}

function RuleForm({ rule, onChange, onClose, onDuplicate, onDelete }: { rule: Rule; onChange: (r: Rule) => void; onClose: () => void; onDuplicate: () => void; onDelete: () => void }) {
  const id = rule.id;
  const w = rule.when;
  const t = rule.then;
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const h = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(h);
  }, [armed]);

  const setWhen = (patch: Partial<When>) => {
    const next: When = { ...w, ...patch };
    for (const k of Object.keys(next) as (keyof When)[]) if (next[k] === undefined) delete next[k];
    onChange({ ...rule, when: next });
  };
  const setThen = (patch: Partial<Rule["then"]>) => onChange({ ...rule, then: { ...t, ...patch } });

  return (
    <div className="grid gap-4 rounded-b-card border-t border-line bg-[color-mix(in_srgb,var(--color-sunken)_45%,var(--color-surface))] px-3.5 py-4 sm:pl-12.5">
      <Field label="Rule name" htmlFor={`${id}-name`}>
        <input id={`${id}-name`} className="field-control" value={rule.name} onChange={(e) => onChange({ ...rule, name: e.target.value })} />
      </Field>

      <fieldset className="grid min-w-0 gap-3">
        <legend className="mb-2 text-[15px] font-medium text-head">When the sale matches</legend>
        <div className="grid gap-x-4.5 gap-y-3 md:grid-cols-2">
          {FIELD_DEFS.map((def) => {
            const cur = w[def.k] as string[] | undefined;
            const sel = Array.isArray(cur) ? cur : [...def.vals];
            return (
              <Field key={def.k} label={def.label}>
                <div className="flex flex-wrap gap-x-3.5 gap-y-1.5">
                  {def.vals.map((v) => (
                    <Check
                      key={v}
                      id={`${id}-${def.k}-${v}`}
                      checked={sel.includes(v)}
                      onChange={(on) => {
                        const next = def.vals.filter((x) => (x === v ? on : sel.includes(x)));
                        setWhen({ [def.k]: next.length === def.vals.length ? undefined : next } as Partial<When>);
                      }}
                    >
                      {def.lab(v)}
                    </Check>
                  ))}
                </div>
                <span className="text-xs text-muted">{!Array.isArray(cur) ? "Any (all ticked)" : cur.length === 0 ? "Nothing ticked, so this rule can't match" : ""}</span>
              </Field>
            );
          })}
          {(
            [
              ["dispatchIsDest", "Ships from the same country it's delivered to"],
              ["custIsDest", "Customer based in the delivery country"],
            ] as const
          ).map(([k, label]) => (
            <Field key={k} label={label} htmlFor={`${id}-${k}`}>
              <select
                id={`${id}-${k}`}
                className="field-control"
                value={typeof w[k] === "boolean" ? String(w[k]) : "any"}
                onChange={(e) => setWhen({ [k]: e.target.value === "any" ? undefined : e.target.value === "true" } as Partial<When>)}
              >
                <option value="any">Any</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </Field>
          ))}
        </div>
      </fieldset>

      <fieldset className="grid min-w-0 gap-3">
        <legend className="mb-2 text-[15px] font-medium text-head">Then</legend>
        <div className="grid gap-x-4.5 gap-y-3 md:grid-cols-2">
          <Field label="Tax code" htmlFor={`${id}-code`}>
            <input id={`${id}-code`} className="field-control" value={t.code} onChange={(e) => setThen({ code: e.target.value })} />
          </Field>
          <Field label="Rate" htmlFor={`${id}-ratekind`}>
            <div className="flex flex-wrap gap-2">
              <select
                id={`${id}-ratekind`}
                className="field-control flex-[1_1_200px]"
                value={t.rate.kind}
                onChange={(e) => {
                  const k = e.target.value as "none" | "fixed" | "dest";
                  setThen({ rate: k === "fixed" ? { kind: "fixed", value: 0 } : { kind: k } });
                }}
              >
                <option value="none">No rate</option>
                <option value="fixed">Fixed rate</option>
                <option value="dest">Delivery country's standard rate</option>
              </select>
              {t.rate.kind === "fixed" ? (
                <input
                  type="number"
                  aria-label="Fixed rate percent"
                  min={0}
                  max={100}
                  step={0.1}
                  className="field-control flex-[0_1_110px]"
                  value={t.rate.value}
                  onChange={(e) => {
                    const n = parseFloat(e.target.value);
                    setThen({ rate: { kind: "fixed", value: Number.isNaN(n) ? 0 : Math.min(100, Math.max(0, n)) } });
                  }}
                />
              ) : null}
            </div>
          </Field>
          <Field label="Invoice from" htmlFor={`${id}-entity`}>
            <select id={`${id}-entity`} className="field-control" value={t.entity} onChange={(e) => setThen({ entity: e.target.value as Rule["then"]["entity"] })}>
              <option value="">Not set</option>
              {(Object.keys(ENTITY) as (keyof typeof ENTITY)[]).map((k) => (
                <option key={k} value={k}>{ENTITY[k].short}</option>
              ))}
            </select>
          </Field>
          <Field label="Status shown" htmlFor={`${id}-level`}>
            <select id={`${id}-level`} className="field-control" value={t.level} onChange={(e) => setThen({ level: e.target.value as Rule["then"]["level"] })}>
              {(["ok", "warn", "block"] as const).map((l) => (
                <option key={l} value={l}>{LEVEL_LABEL[l]}</option>
              ))}
            </select>
          </Field>
          <Field label="VAT number">
            <Check id={`${id}-needsVat`} checked={t.needsVat} onChange={(v) => setThen({ needsVat: v })}>0% relies on a valid EU VAT number (adds the VIES check)</Check>
          </Field>
        </div>
        <Field label="Invoice wording" htmlFor={`${id}-invoice`}>
          <textarea id={`${id}-invoice`} className="field-control" value={t.invoice} onChange={(e) => setThen({ invoice: e.target.value })} />
        </Field>
        <Field label="Warning" htmlFor={`${id}-warning`}>
          <textarea id={`${id}-warning`} className="field-control" value={t.warning} onChange={(e) => setThen({ warning: e.target.value })} />
        </Field>
        <p className="text-[12.5px] text-muted">
          Placeholders: {"{dest}"} delivery country, {"{dispatch}"} ships-from country, {"{cust}"} customer country, {"{rate}"} this rule's rate, {"{destRate}"} delivery country's standard rate, {"{vat}"} customer VAT number.
        </p>
      </fieldset>

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Review note (PVM only)" htmlFor={`${id}-note`}>
          <textarea id={`${id}-note`} className="field-control" value={rule.note} onChange={(e) => onChange({ ...rule, note: e.target.value })} />
        </Field>
        <Field label="Legal reference or link" htmlFor={`${id}-source`}>
          <textarea id={`${id}-source`} className="field-control" value={rule.source ?? ""} onChange={(e) => onChange({ ...rule, source: e.target.value || undefined })} placeholder="e.g. Art. 141 VAT Directive" />
        </Field>
      </div>
      <Check id={`${id}-signoff`} checked={rule.signoff} onChange={(v) => onChange({ ...rule, signoff: v })}>Needs sign-off</Check>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={onClose}>Done</Button>
        <Button size="sm" onClick={onDuplicate}>Duplicate</Button>
        <Button
          size="sm"
          variant="danger"
          className={armed ? "border-block! bg-block! text-white!" : undefined}
          onClick={() => (armed ? onDelete() : setArmed(true))}
        >
          {armed ? "Click again to delete" : "Delete rule"}
        </Button>
      </div>
    </div>
  );
}

// ---------- Main editor ----------

export interface DraftState {
  rules: Rule[];
  tests: TestScenario[];
}

export function useHealth(state: DraftState, rates: Rates): Health {
  const deferred = useDeferredValue(state);
  return useMemo(() => health(deferred.rules, deferred.tests, rates), [deferred, rates]);
}

export function HealthStats({ h, onTests }: { h: Health; onTests?: () => void }) {
  const c = h.coverage;
  const total = h.tests.length;
  return (
    <Stats>
      {c.gaps === 0 ? (
        <Stat level="ok" title={`${num(c.total)} combinations`} sub="Every possible sale matches a rule" />
      ) : (
        <Stat level="block" title={`${num(c.gaps)} sales not covered`} sub={c.gapExample ? `For example: ${describeInputs(c.gapExample)}` : ""} />
      )}
      {h.deadRules === 0 ? (
        <Stat level="ok" title="No dead rules" sub="Every rule is reachable" />
      ) : (
        <Stat level="warn" title={`${h.deadRules} rule${h.deadRules > 1 ? "s" : ""} never match`} sub="An earlier rule catches every case first" />
      )}
      <Stat
        level={h.passed === total ? "ok" : "block"}
        title={`${h.passed} of ${total} tests pass`}
        sub={h.passed === total ? "All scenarios give the expected answer" : onTests ? <button type="button" onClick={onTests} className="font-semibold text-accent underline">See failing tests</button> : "See the Tests tab"}
      />
      <Stat level={h.signoff ? "warn" : "ok"} title={`${h.signoff} need${h.signoff === 1 ? "s" : ""} sign-off`} sub={h.signoff ? "Assumptions awaiting confirmation" : "All rules signed off"} />
    </Stats>
  );
}

let idCounter = 0;
const freshId = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(idCounter++).toString(36)}`;

export function RulesEditor({
  state,
  setState,
  rates,
  h,
  tryHref,
  initialOpen,
}: {
  state: DraftState;
  setState: (fn: (s: DraftState) => DraftState) => void;
  rates: Rates;
  h: Health;
  tryHref: (qs: string) => string;
  initialOpen?: string | null;
}) {
  const [tab, setTab] = useState<"rules" | "tests">("rules");
  const [onlyFailing, setOnlyFailing] = useState(false);
  const [filter, setFilter] = useState<"all" | "signoff">("all");
  const [open, setOpen] = useState<string | null>(initialOpen ?? null);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (!initialOpen) return;
    document.getElementById(`rule-${initialOpen}`)?.scrollIntoView({ block: "start" });
  }, [initialOpen]);

  const rules = state.rules;
  const setRules = (fn: (r: Rule[]) => Rule[]) => setState((s) => ({ ...s, rules: fn(s.rules) }));
  const setTests = (fn: (t: TestScenario[]) => TestScenario[]) => setState((s) => ({ ...s, tests: fn(s.tests) }));
  const hits = h.coverage.hits;
  const signoffCount = rules.filter((r) => r.signoff).length;
  const failing = h.tests.filter((x) => !x.r.pass).length;

  const move = (i: number, d: -1 | 1) =>
    setRules((rs) => {
      const j = i + d;
      if (j < 0 || j >= rs.length) return rs;
      const next = rs.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div>
      <div role="tablist" aria-label="Draft" className="mb-4 flex gap-1.5">
        {(
          [
            ["rules", `Rules (${rules.length})`],
            ["tests", `Tests (${h.passed}/${h.tests.length})`],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            role="tab"
            type="button"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={cx(
              "rounded-btn px-3 py-1.5 text-[13px] font-medium",
              tab === k ? "bg-accent-soft text-accent" : "bg-btn text-muted hover:text-head",
              k === "tests" && failing > 0 && tab !== k && "bg-block-soft text-block",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <HealthStats
        h={h}
        onTests={() => {
          setTab("tests");
          setOnlyFailing(true);
        }}
      />

      {tab === "rules" ? (
        <>
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter rules">
              {(
                [
                  ["all", `All (${rules.length})`],
                  ["signoff", `Needs sign-off (${signoffCount})`],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={filter === k}
                  onClick={() => setFilter(k)}
                  className={cx("rounded-btn px-2.5 py-1 text-[12.5px] font-medium", filter === k ? "bg-accent-soft text-accent" : "bg-btn text-muted hover:text-head")}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[13px] text-muted">Checked from the top down. The first rule that matches decides the result.</p>
          </div>
          <ol ref={listRef} className="grid gap-2.5">
            {rules.map((rule, i) => {
              if (filter === "signoff" && !rule.signoff) return null;
              const t = rule.then;
              const hit = hits[i] ?? null;
              return (
                <li key={rule.id} id={`rule-${rule.id}`} className="scroll-mt-36 rounded-card border border-line bg-surface">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 px-3.5 py-3">
                    <span className="tabular min-w-6 font-mono text-[13px] font-semibold text-muted">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="min-w-0 flex-[1_1_220px] text-[15px] font-medium">{rule.name || <span className="text-muted">Untitled rule</span>}</h3>
                    {rule.signoff ? <Chip tone="outline-warn">Needs sign-off</Chip> : null}
                    <span className={cx("tabular text-[12.5px] whitespace-nowrap", hit === 0 ? "font-semibold text-block" : "text-muted")}>
                      {hit === null ? "" : hit === 0 ? "Never matches" : `Matches ${num(hit)} combinations`}
                    </span>
                    <span className="flex gap-1">
                      <IconButton label="Move rule up" disabled={i === 0} onClick={() => move(i, -1)}><IconUp /></IconButton>
                      <IconButton label="Move rule down" disabled={i === rules.length - 1} onClick={() => move(i, 1)}><IconDown /></IconButton>
                      <IconButton label="Edit rule" aria-expanded={open === rule.id} onClick={() => setOpen(open === rule.id ? null : rule.id)}><IconEdit /></IconButton>
                    </span>
                  </div>
                  <div className="grid gap-2.5 px-3.5 pb-3.5 sm:pl-12.5">
                    <div className="grid gap-x-4.5 gap-y-2 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                      <div>
                        <div className="eyebrow mb-1">When</div>
                        <Conds w={rule.when} />
                      </div>
                      <div>
                        <div className="eyebrow mb-1">Then</div>
                        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-sm">
                          <span className="font-mono text-[13.5px] font-semibold">{t.code}</span>
                          <span>{rateText(t.rate)}</span>
                          <span className={cx("text-[12.5px] font-semibold", LEVEL_TEXT[t.level])}>{LEVEL_LABEL[t.level]}</span>
                          {t.needsVat ? <span className="text-[12.5px] text-muted">+ VIES check</span> : null}
                          {t.entity ? <span className="text-[12.5px] text-muted">Invoice from {ENTITY[t.entity].short}</span> : null}
                        </div>
                      </div>
                    </div>
                    {rule.note ? <p className="border-l-3 border-line py-0.5 pl-2.5 text-[13.5px] text-muted">{rule.note}</p> : null}
                    {rule.source ? <p className="text-[13px] text-muted">Reference: {rule.source}</p> : null}
                    {rule.signoff && open !== rule.id ? (
                      <div>
                        <Button size="sm" onClick={() => setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, signoff: false } : r)))}>Mark as signed off</Button>
                      </div>
                    ) : null}
                  </div>
                  {open === rule.id ? (
                    <RuleForm
                      rule={rule}
                      onChange={(nr) => setRules((rs) => rs.map((r) => (r.id === rule.id ? nr : r)))}
                      onClose={() => setOpen(null)}
                      onDuplicate={() => {
                        const copy: Rule = { ...structuredClone(rule), id: freshId("r"), name: `${rule.name} (copy)` };
                        setRules((rs) => [...rs.slice(0, i + 1), copy, ...rs.slice(i + 1)]);
                        setOpen(copy.id);
                      }}
                      onDelete={() => {
                        setRules((rs) => rs.filter((r) => r.id !== rule.id));
                        setOpen(null);
                      }}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
          <div className="mt-3">
            <Button
              onClick={() => {
                const r: Rule = {
                  id: freshId("r"),
                  name: "New rule",
                  note: "",
                  signoff: true,
                  when: { origin: [] },
                  then: { code: "NEW CODE", rate: { kind: "none" }, level: "warn", invoice: "", warning: "", needsVat: false, entity: "" },
                };
                setRules((rs) => [...rs, r]);
                setOpen(r.id);
                setFilter("all");
                requestAnimationFrame(() => document.getElementById(`rule-${r.id}`)?.scrollIntoView({ block: "start", behavior: "smooth" }));
              }}
            >
              Add rule
            </Button>
            <span className="ml-3 text-[13px] text-muted">New rules start matching nothing, so you can set them up before they change any result.</span>
          </div>
        </>
      ) : (
        <TestsPanel h={h} setTests={setTests} tryHref={tryHref} onlyFailing={onlyFailing} setOnlyFailing={setOnlyFailing} />
      )}
    </div>
  );
}

function expectText(e: TestScenario["expect"]) {
  const parts: ReactNode[] = [];
  if (e.code !== undefined) parts.push(<span key="c" className="font-mono font-semibold">{e.code}</span>);
  if (e.rate !== undefined) parts.push(<span key="r">{fmtPct(e.rate)}</span>);
  if (e.level !== undefined) parts.push(<span key="l" className={cx("font-semibold", LEVEL_TEXT[e.level])}>{LEVEL_LABEL[e.level]}</span>);
  if (e.entity) parts.push(<span key="e">invoice from {ENTITY[e.entity].short}</span>);
  return parts.flatMap((p, i) => (i ? [<span key={`s${i}`}> · </span>, p] : [p]));
}

function TestsPanel({
  h,
  setTests,
  tryHref,
  onlyFailing,
  setOnlyFailing,
}: {
  h: Health;
  setTests: (fn: (t: TestScenario[]) => TestScenario[]) => void;
  tryHref: (qs: string) => string;
  onlyFailing: boolean;
  setOnlyFailing: (v: boolean) => void;
}) {
  // Failing tests first, so they're the first thing you see
  const sorted = [...h.tests].sort((a, b) => Number(a.r.pass) - Number(b.r.pass));
  const rows = onlyFailing ? sorted.filter((x) => !x.r.pass) : sorted;
  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-[70ch] text-[13.5px] text-muted">
          Each scenario is a sale with a known right answer. They rerun on every edit, so a change can't quietly break another case. Add more from <b className="text-ink">Try the draft</b>.
        </p>
        <label className="inline-flex items-center gap-1.5 text-sm">
          <input type="checkbox" checked={onlyFailing} onChange={(e) => setOnlyFailing(e.target.checked)} className="size-4 accent-(--color-accent)" />
          Only failing
        </label>
      </div>
      <ul className="overflow-hidden rounded-card border border-line bg-surface">
        {rows.map(({ t, r }) => (
          <li key={t.id} className={cx("grid grid-cols-[26px_minmax(0,1fr)] items-start gap-x-3 gap-y-1 border-t border-line px-3.5 py-3 first:border-t-0 sm:grid-cols-[26px_minmax(0,1fr)_auto]", !r.pass && "bg-block-soft")}>
            <span aria-label={r.pass ? "Pass" : "Fail"}><LevelIcon level={r.pass ? "ok" : "block"} /></span>
            <div className="min-w-0">
              <div className="font-semibold">{t.label}</div>
              <div className="text-[13px] text-muted">{describeInputs(t.inp)}</div>
              <div className="text-[13px]">Expect {expectText(t.expect)}</div>
              {!r.pass ? (
                <div className="text-[13px] font-semibold text-block">
                  Now: {r.fails.join(", ")}
                  {r.res.rule ? ` (rule ${r.res.idx + 1}: ${r.res.rule.name})` : ""}
                </div>
              ) : null}
            </div>
            <div className="col-start-2 flex flex-wrap gap-1.5 sm:col-start-3 sm:justify-end">
              <Link to={tryHref(inputToParams(t.inp))} className={buttonClass("default", "sm")}>Try it</Link>
              {!r.pass ? (
                <Button size="sm" onClick={() => setTests((ts) => ts.map((x) => (x.id === t.id ? scenarioFromResult(t.id, t.label, { ...t.inp }, r.res) : x)))}>
                  Accept new answer
                </Button>
              ) : null}
              <Button size="sm" variant="danger" onClick={() => setTests((ts) => ts.filter((x) => x.id !== t.id))}>Delete</Button>
            </div>
          </li>
        ))}
        {!rows.length ? <li className="px-4 py-6 text-center text-muted">{onlyFailing ? "No failing tests." : "No tests yet."}</li> : null}
      </ul>
    </>
  );
}
