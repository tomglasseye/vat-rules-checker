// The rules engine: pure functions, no DOM, no database. Runs in the browser (instant results)
// and on the server (re-checked before anything is saved).
import { DISPATCH_PLACES, ENTITY, LEVEL_LABEL, PLACES, PREFIX_TO_COUNTRY, VIES_LABEL, originOf, placeLabel, zoneOf } from "./places";
import type { CheckInput, Facts, Level, Model, Note, Result, Rule, TestScenario, ViesState, When } from "./types";

export function facts(inp: CheckInput): Facts {
  const downgraded = inp.type === "B2B" && inp.vies === "invalid";
  return {
    origin: originOf(inp.dispatch),
    dispatch: inp.dispatch,
    dest: inp.dest,
    cust: inp.cust,
    type: downgraded ? "B2C" : inp.type,
    downgraded,
    destZone: zoneOf(inp.dest),
    custZone: zoneOf(inp.cust),
    dispatchIsDest: inp.dispatch === inp.dest,
    custIsDest: inp.cust === inp.dest,
    vies: inp.type === "B2B" ? inp.vies || "unchecked" : "unchecked",
    value: inp.value === "high" ? "high" : "low",
  };
}

export const LIST_FIELDS = ["origin", "type", "destZone", "custZone", "vies", "value"] as const;
export const BOOL_FIELDS = ["dispatchIsDest", "custIsDest"] as const;

export function matches(when: When, f: Facts): boolean {
  for (const k of LIST_FIELDS) {
    const v = when[k] as string[] | undefined;
    if (Array.isArray(v) && !v.includes(f[k])) return false;
  }
  for (const k of BOOL_FIELDS) {
    const v = when[k];
    if (typeof v === "boolean" && v !== f[k]) return false;
  }
  return true;
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "–";
  return (Math.round(n * 100) / 100).toString() + "%";
}

export function fill(tpl: string, ctx: Record<string, string>): string {
  return String(tpl || "").replace(/\{(\w+)\}/g, (m, k: string) => (k in ctx ? ctx[k] : m));
}

const LEVEL_RANK: Record<Level, number> = { ok: 0, warn: 1, block: 2 };
const atLeastWarn = (l: Level): Level => (LEVEL_RANK[l] < 1 ? "warn" : l);

export function evaluate(inp: CheckInput, model: Model): Result {
  const f = facts(inp);
  const idx = model.rules.findIndex((r) => matches(r.when, f));
  const notes: Note[] = [];
  if (idx < 0) {
    return {
      f, idx: -1, rule: null, code: "No rule matched", rate: null, level: "block", entity: "", invoice: "",
      notes: [{ level: "block", text: "No rule covers this sale. Ask PVM to add one before invoicing." }],
    };
  }
  const rule = model.rules[idx];
  const t = rule.then;
  const rate = t.rate.kind === "fixed" ? Number(t.rate.value) : t.rate.kind === "dest" ? (model.rates[f.dest] ?? null) : null;
  const vat = (inp.vatNumber || "").trim();
  const ctx = {
    dest: placeLabel(f.dest),
    dispatch: placeLabel(f.dispatch),
    cust: placeLabel(f.cust),
    rate: fmtPct(rate),
    destRate: fmtPct(model.rates[f.dest]),
    vat: vat || "[customer VAT number]",
  };
  let level: Level = t.level || "ok";
  if (f.downgraded) {
    notes.push({ level: "warn", text: `VIES says ${vat || "this VAT number"} is not valid, so this is treated as a consumer sale (B2C) and the tax has been recalculated.` });
  }
  if (t.warning) notes.push({ level: t.level === "block" ? "block" : t.level === "warn" ? "warn" : "info", text: fill(t.warning, ctx) });
  if (t.needsVat && f.type === "B2B") {
    if (f.vies === "valid") {
      notes.push({ level: "ok", text: vat ? `VAT number ${vat} verified with VIES.` : "VAT number verified with VIES." });
    } else if (f.vies === "unavailable") {
      notes.push({ level: "warn", text: "VIES couldn't be reached, so the VAT number isn't verified yet. Don't zero-rate until it is: try again later, or treat the sale as B2C." });
      level = atLeastWarn(level);
    } else {
      notes.push({ level: "warn", text: "Check the customer's EU VAT number with VIES before invoicing at 0%. If you can't get a valid number, treat the sale as B2C." });
      level = atLeastWarn(level);
    }
  }
  if (f.downgraded) level = atLeastWarn(level);
  return { f, idx, rule, code: t.code, rate, level, entity: t.entity || "", invoice: fill(t.invoice, ctx), notes };
}

/** Extra checks that depend on the typed VAT number rather than the rules */
export function inputNotes(inp: CheckInput): Note[] {
  const notes: Note[] = [];
  if (inp.type === "B2B" && inp.vatNumber) {
    const fmt = checkVatFormat(inp.vatNumber);
    const cz = zoneOf(inp.cust);
    if (fmt.ok && (cz === "EU" || cz === "NL") && fmt.country !== inp.cust) {
      notes.push({ level: "info", text: `The VAT number is registered in ${placeLabel(fmt.country)}, but the customer is based in ${placeLabel(inp.cust)}. Check it's the right number.` });
    }
  }
  return notes;
}

// ---- Tests & coverage ----

export interface TestRun {
  pass: boolean;
  fails: string[];
  res: Result;
}

export function runTest(test: TestScenario, model: Model): TestRun {
  const res = evaluate({ vatNumber: "", ...test.inp }, model);
  const e = test.expect;
  const fails: string[] = [];
  if (e.code !== undefined && res.code !== e.code) fails.push(`code is "${res.code}"`);
  if (e.rate !== undefined && !(res.rate !== null && Math.abs(res.rate - e.rate) < 1e-9)) fails.push(`rate is ${fmtPct(res.rate)}`);
  if (e.level !== undefined && res.level !== e.level) fails.push(`status is "${LEVEL_LABEL[res.level]}"`);
  if (e.entity !== undefined && res.entity !== e.entity) fails.push(`invoice from ${res.entity ? ENTITY[res.entity].short : "not set"}`);
  return { pass: fails.length === 0, fails, res };
}

export interface Coverage {
  total: number;
  gaps: number;
  gapExample: CheckInput | null;
  hits: number[];
}

/** Runs every possible input through the rules: finds sales no rule covers and rules nothing reaches. */
export function coverage(model: Model): Coverage {
  const hits = new Array(model.rules.length).fill(0);
  let total = 0;
  let gaps = 0;
  let gapExample: CheckInput | null = null;
  for (const dispatch of DISPATCH_PLACES) for (const dest of PLACES) for (const cust of PLACES) for (const type of ["B2B", "B2C"] as const) {
    const viesStates: ViesState[] = type === "B2B" ? ["unchecked", "valid", "invalid", "unavailable"] : ["unchecked"];
    const values = dispatch === "UK" && type === "B2C" ? (["low", "high"] as const) : (["low"] as const);
    for (const vies of viesStates) for (const value of values) {
      total++;
      const inp: CheckInput = { dispatch, dest, cust, type, vies, value };
      const f = facts(inp);
      const i = model.rules.findIndex((r) => matches(r.when, f));
      if (i < 0) {
        gaps++;
        if (!gapExample) gapExample = inp;
      } else hits[i]++;
    }
  }
  return { total, gaps, gapExample, hits };
}

export interface Health {
  tests: { t: TestScenario; r: TestRun }[];
  passed: number;
  coverage: Coverage;
  deadRules: number;
  signoff: number;
  /** Publishable: all tests pass, every sale is covered, no rule is unreachable */
  ok: boolean;
}

export function health(rules: Rule[], tests: TestScenario[], rates: Model["rates"]): Health {
  const model = { rules, rates };
  const runs = tests.map((t) => ({ t, r: runTest(t, model) }));
  const passed = runs.filter((x) => x.r.pass).length;
  const cov = coverage(model);
  const deadRules = cov.hits.filter((h) => h === 0).length;
  return {
    tests: runs,
    passed,
    coverage: cov,
    deadRules,
    signoff: rules.filter((r) => r.signoff).length,
    ok: passed === tests.length && cov.gaps === 0 && deadRules === 0,
  };
}

/** The parcel-value question only matters for UK stock sold to an EU consumer */
export function valueRelevant(inp: Pick<CheckInput, "dispatch" | "type" | "dest">): boolean {
  const z = zoneOf(inp.dest);
  return inp.dispatch === "UK" && inp.type === "B2C" && (z === "EU" || z === "NL");
}

export function describeInputs(inp: CheckInput): string {
  let s = `${placeLabel(inp.dispatch)} stock → ${placeLabel(inp.dest)} · customer in ${placeLabel(inp.cust)} · ${inp.type}`;
  if (inp.type === "B2B" && inp.vies && inp.vies !== "unchecked") s += ` · VIES ${VIES_LABEL[inp.vies].toLowerCase()}`;
  if (valueRelevant(inp)) s += inp.value === "high" ? " · over €150" : " · €150 or less";
  return s;
}

export type VatFormat =
  | { ok: true; clean: string; country: string }
  | { ok: false; clean: string; reason: string; gb?: boolean };

export function checkVatFormat(raw: string): VatFormat {
  const v = String(raw || "").toUpperCase().replace(/[\s.\-]/g, "");
  const m = v.match(/^([A-Z]{2})([0-9A-Z]{2,12})$/);
  if (!m) return { ok: false, clean: v, reason: "That doesn't look like an EU VAT number. It should start with a two-letter country code, like DE123456789." };
  if (m[1] === "GB") return { ok: false, clean: v, gb: true, reason: "UK (GB) VAT numbers aren't in VIES since Brexit. They'll be checked with HMRC in a later version." };
  if (!PREFIX_TO_COUNTRY[m[1]]) return { ok: false, clean: v, reason: `"${m[1]}" isn't an EU VAT country code. Greece uses EL, and Northern Ireland uses XI.` };
  return { ok: true, clean: v, country: PREFIX_TO_COUNTRY[m[1]] };
}

/** Builds a test scenario that expects whatever the rules give now */
export function scenarioFromResult(id: string, label: string, inp: CheckInput, res: Result): TestScenario {
  const { vatNumber: _vat, ...rest } = inp;
  const expect: TestScenario["expect"] = { code: res.code, level: res.level };
  if (res.rate !== null) expect.rate = res.rate;
  if (res.entity) expect.entity = res.entity;
  return { id, label, inp: rest, expect };
}

const SALE_TYPES = ["B2B", "B2C"] as const;
const VIES_STATES = ["unchecked", "valid", "invalid", "unavailable"] as const;

/** Reads a sale from URL search params (?dispatch=UK&dest=France…), falling back to defaults */
export function inputFromParams(sp: URLSearchParams, fallback: CheckInput): CheckInput {
  const pick = (k: string, allowed: readonly string[], d: string) => {
    const v = sp.get(k);
    return v && allowed.includes(v) ? v : d;
  };
  return {
    dispatch: pick("dispatch", DISPATCH_PLACES, fallback.dispatch),
    dest: pick("dest", PLACES, fallback.dest),
    cust: pick("cust", PLACES, fallback.cust),
    type: pick("type", SALE_TYPES, fallback.type) as CheckInput["type"],
    vies: pick("vies", VIES_STATES, fallback.vies) as ViesState,
    value: pick("value", ["low", "high"], fallback.value) as CheckInput["value"],
    vatNumber: (sp.get("vat") ?? fallback.vatNumber ?? "").toUpperCase().slice(0, 20),
  };
}

export function inputToParams(inp: Omit<CheckInput, "vatNumber"> & { vatNumber?: string }): string {
  const sp = new URLSearchParams({ dispatch: inp.dispatch, dest: inp.dest, cust: inp.cust, type: inp.type, value: inp.value });
  if (inp.type === "B2B" && inp.vies !== "unchecked") sp.set("vies", inp.vies);
  return sp.toString();
}

export const DEFAULT_INPUT: CheckInput = { dispatch: "Netherlands", dest: "Ireland", cust: "Ireland", type: "B2B", vies: "unchecked", value: "low", vatNumber: "" };

/** Reads a sale posted as JSON, keeping only known values */
export function saleFromJson(raw: string): CheckInput | null {
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== "object") return null;
    const sp = new URLSearchParams();
    for (const k of ["dispatch", "dest", "cust", "type", "vies", "value"]) if (typeof o[k] === "string") sp.set(k, o[k] as string);
    if (typeof o.vatNumber === "string") sp.set("vat", o.vatNumber);
    return inputFromParams(sp, DEFAULT_INPUT);
  } catch {
    return null;
  }
}
