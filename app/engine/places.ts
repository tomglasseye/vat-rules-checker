import type { EntityKey, Level, Origin, ParcelValue, ViesState, Zone } from "./types";

/** EU member states: name, VAT-number prefix, standard rate (%) when the app was set up. */
export const EU: ReadonlyArray<readonly [name: string, prefix: string, rate: number]> = [
  ["Austria", "AT", 20], ["Belgium", "BE", 21], ["Bulgaria", "BG", 20], ["Croatia", "HR", 25],
  ["Cyprus", "CY", 19], ["Czech Republic", "CZ", 21], ["Denmark", "DK", 25], ["Estonia", "EE", 24],
  ["Finland", "FI", 25.5], ["France", "FR", 20], ["Germany", "DE", 19], ["Greece", "EL", 24],
  ["Hungary", "HU", 27], ["Ireland", "IE", 23], ["Italy", "IT", 22], ["Latvia", "LV", 21],
  ["Lithuania", "LT", 21], ["Luxembourg", "LU", 17], ["Malta", "MT", 18], ["Netherlands", "NL", 21],
  ["Poland", "PL", 23], ["Portugal", "PT", 23], ["Romania", "RO", 21], ["Slovakia", "SK", 23],
  ["Slovenia", "SI", 22], ["Spain", "ES", 21], ["Sweden", "SE", 25],
];

export const EU_NAMES = EU.map((e) => e[0]);
/** Delivery and customer locations */
export const PLACES = [...EU_NAMES, "UK", "ROW"];
/** Where goods can ship from */
export const DISPATCH_PLACES = ["UK", ...EU_NAMES];
/** Countries that have a VAT rate in the app */
export const RATE_COUNTRIES = ["UK", ...EU_NAMES];

export const COUNTRY_CODE: Record<string, string> = Object.fromEntries([
  ...EU.map((e) => [e[0], e[1]] as const),
  ["UK", "GB"],
]);

export const PREFIX_TO_COUNTRY: Record<string, string> = {
  ...Object.fromEntries(EU.map((e) => [e[1], e[0]])),
  XI: "UK", // Northern Ireland goods numbers are in VIES
};

export function placeLabel(p: string | undefined): string {
  if (p === "UK") return "United Kingdom";
  if (p === "ROW") return "Rest of world";
  return p || "";
}

export function zoneOf(p: string): Zone {
  if (p === "UK") return "UK";
  if (p === "ROW") return "ROW";
  if (p === "Netherlands") return "NL";
  return "EU";
}

export function originOf(dispatch: string): Origin {
  return dispatch === "UK" ? "UK" : dispatch === "Netherlands" ? "NL" : "OTHER";
}

export const ORIGIN_LABEL: Record<Origin, string> = { UK: "UK", NL: "Netherlands", OTHER: "Other EU country" };
export const ZONE_LABEL: Record<Zone, string> = { UK: "UK", NL: "Netherlands", EU: "Other EU country", ROW: "Outside UK & EU" };
export const LEVEL_LABEL: Record<Level, string> = { ok: "Ready to invoice", warn: "Check before invoicing", block: "Do not invoice" };
export const VIES_LABEL: Record<ViesState, string> = { unchecked: "Not checked", valid: "Valid", invalid: "Invalid", unavailable: "VIES unavailable" };
export const VALUE_LABEL: Record<ParcelValue, string> = { low: "€150 or less", high: "Over €150" };

/** Invoicing companies ("Invoice Branding" in the spreadsheet). Per-client set-up comes later. */
export const ENTITY: Record<EntityKey, { short: string; text: string }> = {
  UK: { short: "UK company", text: "Use the UK VAT registration (UK entity details and letterhead)" },
  NL: { short: "Netherlands company", text: "Use the NL VAT registration (Netherlands entity details and paper VAT registration)" },
};

export function defaultRates(): Record<string, number> {
  const r: Record<string, number> = Object.fromEntries(EU.map((e) => [e[0], e[2]]));
  r.UK = 20;
  return r;
}
