// Types for the VAT rules engine. Rules are data: an ordered list, first match wins.

export type Origin = "UK" | "NL" | "OTHER";
export type Zone = "UK" | "NL" | "EU" | "ROW";
export type SaleType = "B2B" | "B2C";
export type ViesState = "unchecked" | "valid" | "invalid" | "unavailable";
export type ParcelValue = "low" | "high";
export type Level = "ok" | "warn" | "block";
export type EntityKey = "UK" | "NL";
export type NoteLevel = Level | "info";

export type RateSpec =
  | { kind: "none" }
  | { kind: "fixed"; value: number }
  | { kind: "dest" };

/** Conditions. A missing list means "any value". */
export interface When {
  origin?: Origin[];
  type?: SaleType[];
  destZone?: Zone[];
  custZone?: Zone[];
  vies?: ViesState[];
  value?: ParcelValue[];
  dispatchIsDest?: boolean;
  custIsDest?: boolean;
}

export interface Then {
  code: string;
  rate: RateSpec;
  level: Level;
  /** Invoice wording. Placeholders: {dest} {dispatch} {cust} {rate} {destRate} {vat} */
  invoice: string;
  warning: string;
  /** 0% relies on a valid EU VAT number, so the VIES check applies */
  needsVat: boolean;
  entity: EntityKey | "";
}

export interface Rule {
  id: string;
  name: string;
  /** Internal review note (shown to PVM admins, not client staff) */
  note: string;
  /** Legal reference or link backing this rule */
  source?: string;
  signoff: boolean;
  when: When;
  then: Then;
}

/** What the user enters on the checker */
export interface CheckInput {
  dispatch: string;
  dest: string;
  cust: string;
  type: SaleType;
  vies: ViesState;
  value: ParcelValue;
  vatNumber?: string;
}

export interface TestExpect {
  code?: string;
  rate?: number;
  level?: Level;
  entity?: EntityKey | "";
}

export interface TestScenario {
  id: string;
  label: string;
  inp: Omit<CheckInput, "vatNumber">;
  expect: TestExpect;
}

export type Rates = Record<string, number>;

export interface Model {
  rules: Rule[];
  rates: Rates;
}

export interface Facts {
  origin: Origin;
  dispatch: string;
  dest: string;
  cust: string;
  type: SaleType;
  downgraded: boolean;
  destZone: Zone;
  custZone: Zone;
  dispatchIsDest: boolean;
  custIsDest: boolean;
  vies: ViesState;
  value: ParcelValue;
}

export interface Note {
  level: NoteLevel;
  text: string;
}

export interface Result {
  f: Facts;
  idx: number;
  rule: Rule | null;
  code: string;
  rate: number | null;
  level: Level;
  entity: EntityKey | "";
  invoice: string;
  notes: Note[];
}
