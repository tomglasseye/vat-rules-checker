// Starter rule set: Miranda Hope's EU VAT Calculator (PVM Consultants, spreadsheet v3) with her
// answers up to 19 Oct 2026 and the formula issues fixed. Client set-up it assumes: established in
// the UK, paper (non-established) VAT registration in the Netherlands, not yet registered for IOSS.
// New clients start from a copy of this, which PVM then adapts.
import type { Rule, TestScenario, Then, When } from "./types";

const W = {
  exportInv: "Zero-Rated Export – Out of Scope of UK/EU VAT. Proof of export required for tax records.",
  exportWarn: "CRITICAL EXPORT CHECK: Fulfill this order from UK stock where possible to avoid EU paper registration customs blockages.",
  ukDomInv: "Standard Domestic Supply - UK VAT charged at the statutory rate.",
  ukDomWarn: "Standard UK Domestic transaction rules apply.",
  ukImpInv: "UK Domestic Supply following importation - UK VAT charged at the statutory rate.",
  ukImpWarn: "NOTE: Import VAT and customs clearance are handled internally by our firm. Charge standard 20% UK domestic VAT to the buyer.",
  ossInv: "EU OSS B2C Distance Selling – VAT charged at local destination rate for {dest}.",
  b2cWarn: "Standard B2C Rules Apply. Ensure destination address matches consumer location.",
  ukExpInv: "Zero-Rated UK Export. Import VAT and local customs duties are payable by the importer/consignee at the border prior to delivery.",
  ukExpWarn: "CRITICAL POST-BREXIT WARNING: Direct transport from UK into the EU constitutes an import. Local customs duties and Import VAT are fully applicable at the border.",
  nlRcInv: "VAT Reversed - Section 1e Dutch Turnover Tax Act (Non-established supplier)",
  rerouteInv: "DO NOT INVOICE: Goods must be rerouted through the Netherlands warehouse to comply with local storage tax rules.",
  ukRerouteInv: "DO NOT INVOICE: UK stock must be rerouted through the Netherlands warehouse before it's sold to a customer in the EU.",
  icsInv: "Zero-Rated Intra-Community Supply - Customer accounts for Acquisition VAT in destination country.",
  triInv: "VAT Reverse Charge – Simplified Triangulation Rule Applies. Final customer self-accounts for local acquisition VAT.",
  triWarn: "There must be exactly one physical cross-border movement of goods. The transport must be arranged and paid for by either the supplier (despatch country) or the intermediary (your business).",
};

const NONE = { kind: "none" } as const;
const ZERO = { kind: "fixed", value: 0 } as const;
const DEST = { kind: "dest" } as const;
const V3 = "Matches spreadsheet v3.";
const NOTV3 = "Differs from spreadsheet v3: ";

function R(id: string, name: string, signoff: boolean, note: string, when: When, then: Partial<Then> & Pick<Then, "code" | "rate" | "invoice">): Rule {
  return { id, name, note, signoff, when, then: { warning: "", needsVat: false, level: "ok", entity: "", ...then } };
}

export function starterRules(): Rule[] {
  return [
    R("r-reroute", "Reroute: same-country sale from other EU stock", false,
      V3 + " Miranda confirmed (14 Oct) this blocks consumer sales too, as the client has no local VAT registration.",
      { origin: ["OTHER"], dispatchIsDest: true },
      { code: "REROUTE VIA NL REQUIRED", rate: NONE, level: "block", invoice: W.rerouteInv,
        warning: "Stock in {dispatch} can't be sold for delivery within {dispatch}: the client has no VAT registration there. Move the goods through the Netherlands warehouse first." }),
    R("r-export", "Export outside the UK and EU", false, V3,
      { destZone: ["ROW"] },
      { code: "0% Export", rate: ZERO, invoice: W.exportInv, warning: W.exportWarn, entity: "UK" }),
    R("r-uk-domestic", "UK stock delivered in the UK", false,
      V3 + " The client is established in the UK.",
      { origin: ["UK"], destZone: ["UK"] },
      { code: "20% UK VAT", rate: DEST, invoice: W.ukDomInv, warning: W.ukDomWarn, entity: "UK" }),
    R("r-eu-uk", "EU stock delivered in the UK", true,
      V3 + " Miranda (14 Oct): the client owns the goods on import into the UK, so this is a UK sale. Open point: assumes the client always imports the goods itself.",
      { origin: ["NL", "OTHER"], destZone: ["UK"] },
      { code: "20% UK VAT", rate: DEST, invoice: W.ukImpInv, warning: W.ukImpWarn, entity: "UK" }),
    R("r-uk-eu-reroute-b2b", "UK stock to an EU business: reroute via NL", true,
      NOTV3 + "its formula gives intra-community supply or triangulation here. Miranda (19 Oct): moving UK stock into the EU is a 0% UK export, but it has to be rerouted through the Netherlands first. Open points: should this block the sale or only warn, and does it apply when the goods are delivered in the Netherlands?",
      { origin: ["UK"], destZone: ["EU", "NL"], type: ["B2B"] },
      { code: "REROUTE VIA NL REQUIRED", rate: NONE, level: "block", invoice: W.ukRerouteInv,
        warning: "UK stock can't be sent straight to a business customer in {dest}. Move the goods to the Netherlands warehouse first (a 0% UK export, imported into the Netherlands), then check the sale again with the Netherlands as the ship-from country." }),
    R("r-uk-eu-reroute-b2c", "UK stock to an EU consumer: reroute via NL", true,
      NOTV3 + "its formula uses OSS wording. Miranda (19 Oct): the client isn't registered for IOSS yet, so UK stock has to be rerouted through the Netherlands, and the OSS rules then apply. She's getting them registered, so the IOSS rules (parcels up to €150, and import VAT above €150) are kept aside to put back then. Open points: should this block the sale or only warn, and does it apply when the goods are delivered in the Netherlands?",
      { origin: ["UK"], destZone: ["EU", "NL"], type: ["B2C"] },
      { code: "REROUTE VIA NL REQUIRED", rate: NONE, level: "block", invoice: W.ukRerouteInv,
        warning: "The client isn't registered for IOSS, so UK stock can't be sent straight to a consumer in {dest}. Move the goods to the Netherlands warehouse first, then check the sale again with the Netherlands as the ship-from country." }),
    R("r-nl-rc", "NL stock to a business, delivered in NL", true,
      NOTV3 + "its formula skips the reverse charge when goods ship from the Netherlands and gives intra-community supply or triangulation. Miranda confirmed (13 Oct) the reverse charge applies to any business delivery in NL because of the paper registration. She's checking the \"Section 1e\" reference.",
      { origin: ["NL"], destZone: ["NL"], type: ["B2B"] },
      { code: "0% NL RC", rate: ZERO, invoice: W.nlRcInv, needsVat: true, entity: "NL" }),
    R("r-nl-b2c", "NL stock to a Dutch consumer", false,
      "Same 21% as spreadsheet v3, but v3 uses OSS wording for what is a sale within the Netherlands, so the wording says domestic supply.",
      { origin: ["NL"], destZone: ["NL"], type: ["B2C"] },
      { code: "Standard NL VAT", rate: DEST, invoice: "Dutch domestic supply – NL VAT charged at {rate}.", warning: W.b2cWarn, entity: "NL" }),
    R("r-other-nl", "Other EU stock to a business in NL", true,
      V3 + " Reverse-charged because of the client's paper NL registration. Miranda is checking the \"Section 1e\" reference.",
      { origin: ["OTHER"], destZone: ["NL"], type: ["B2B"] },
      { code: "0% NL RC", rate: ZERO, invoice: W.nlRcInv, needsVat: true, entity: "NL" }),
    R("r-nonEU-novat", "Non-EU customer without a verified EU VAT number", false,
      NOTV3 + "its tax code says triangulation and its warning tells the user to switch to B2C. Miranda confirmed (13 Oct): without a valid EU VAT number it's a consumer sale at the delivery country's rate, so the app does that automatically.",
      { origin: ["NL", "OTHER"], destZone: ["EU"], type: ["B2B"], custZone: ["UK", "ROW"], vies: ["unchecked", "unavailable"] },
      { code: "OSS Destination Rate", rate: DEST, invoice: W.ossInv, entity: "NL",
        warning: "The customer is based in {cust} and has no verified EU VAT number, so this is treated as a consumer sale. If they give you a valid {dest} VAT number for the receiving party, check it with VIES: the sale can then be zero-rated." }),
    R("r-triangulation", "Triangulation", true,
      NOTV3 + "its formula triggers triangulation when the customer's country differs from the delivery country. This follows Miranda's 14 Oct answer: the despatch country, NL and the delivery country are all different. On 19 Oct she said it's when the customer's country differs from the delivery country, as v3 does. Kept on the 14 Oct version until she confirms with worked examples.",
      { origin: ["OTHER"], destZone: ["EU"], type: ["B2B"] },
      { code: "0% EU Triangulation", rate: ZERO, invoice: W.triInv, warning: W.triWarn, needsVat: true, entity: "NL" }),
    R("r-ics", "Intra-community supply from NL stock", true,
      NOTV3 + "its formula calls this triangulation when the customer's country differs from the delivery country. Goods leaving the Netherlands can't be triangulation under Miranda's 14 Oct answer, so this is a plain 0% intra-community supply. Her 19 Oct answer would make NL stock to Germany for a French customer triangulation; kept as it is until she confirms with worked examples.",
      { origin: ["NL"], destZone: ["EU"], type: ["B2B"] },
      { code: "0% Intra-Community Supply", rate: ZERO, invoice: W.icsInv, needsVat: true, entity: "NL" }),
    R("r-oss", "EU stock to an EU consumer (OSS)", false, V3,
      { origin: ["NL", "OTHER"], destZone: ["EU", "NL"], type: ["B2C"] },
      { code: "OSS Destination Rate", rate: DEST, invoice: W.ossInv, warning: W.b2cWarn, entity: "NL" }),
  ];
}

/**
 * IOSS rules for UK stock sent straight to EU consumers. Not in the starter set: the client isn't
 * registered for IOSS yet (Miranda, 19 Oct 2026). Once they are, put these in place of
 * r-uk-eu-reroute-b2c and update tests t08 and t09.
 */
export function parkedIossRules(): Rule[] {
  return [
    R("r-uk-eu-ioss", "UK stock to an EU consumer, parcel €150 or less", true,
      NOTV3 + "its formula uses OSS wording. Miranda agreed (13 Oct) this is IOSS for parcels up to €150. Kept aside on 19 Oct until the client is registered for IOSS. Invoice wording and invoicing company to confirm.",
      { origin: ["UK"], destZone: ["EU", "NL"], type: ["B2C"], value: ["low"] },
      { code: "IOSS", rate: DEST, level: "warn", entity: "NL",
        invoice: "Distance sale of imported goods – {dest} VAT charged at {rate} under IOSS.",
        warning: "Ship from EU stock if you can. If this order has to leave from the UK, charge {dest} VAT under IOSS and give the carrier your IOSS number for the customs declaration." }),
    R("r-uk-eu-import", "UK stock to an EU consumer, parcel over €150", true,
      NOTV3 + "its formula uses OSS wording. Above €150 IOSS can't be used, so this is a 0% UK export with import VAT at the border. Kept aside on 19 Oct with the IOSS rule. Invoice wording and invoicing company to confirm.",
      { origin: ["UK"], destZone: ["EU", "NL"], type: ["B2C"], value: ["high"] },
      { code: "0% UK Export", rate: ZERO, level: "warn", entity: "NL",
        invoice: "Zero-Rated UK Export. Import VAT and duty are payable on import into {dest}.",
        warning: "Ship from EU stock if you can. Above €150 IOSS can't be used, so import VAT ({destRate}) and any duty are collected at the border unless you ship duties paid (DDP)." }),
  ];
}

function T(id: string, label: string, inp: TestScenario["inp"], expect: TestScenario["expect"]): TestScenario {
  return { id, label, inp, expect };
}
function I(dispatch: string, dest: string, cust: string, type: "B2B" | "B2C", vies: TestScenario["inp"]["vies"] = "unchecked", value: "low" | "high" = "low"): TestScenario["inp"] {
  return { dispatch, dest, cust, type, vies, value };
}

export function starterTests(): TestScenario[] {
  return [
    T("t01", "UK stock to UK business", I("UK", "UK", "UK", "B2B"), { code: "20% UK VAT", rate: 20, entity: "UK" }),
    T("t02", "UK stock to UK consumer", I("UK", "UK", "UK", "B2C"), { code: "20% UK VAT", rate: 20, entity: "UK" }),
    T("t03", "NL stock to the UK, German customer", I("Netherlands", "UK", "Germany", "B2B"), { code: "20% UK VAT", rate: 20, entity: "UK" }),
    T("t04", "French stock to a UK consumer", I("France", "UK", "UK", "B2C"), { code: "20% UK VAT", rate: 20 }),
    T("t05", "UK stock to rest of world", I("UK", "ROW", "ROW", "B2B"), { code: "0% Export", entity: "UK" }),
    T("t06", "Spanish stock to rest of world", I("Spain", "ROW", "ROW", "B2B"), { code: "0% Export", entity: "UK" }),
    T("t07", "UK stock to Irish business", I("UK", "Ireland", "Ireland", "B2B"), { code: "REROUTE VIA NL REQUIRED", level: "block" }),
    T("t08", "UK stock to German consumer, €150 or less", I("UK", "Germany", "Germany", "B2C", "unchecked", "low"), { code: "REROUTE VIA NL REQUIRED", level: "block" }),
    T("t09", "UK stock to German consumer, over €150", I("UK", "Germany", "Germany", "B2C", "unchecked", "high"), { code: "REROUTE VIA NL REQUIRED", level: "block" }),
    T("t10", "NL stock to Dutch business, VAT no. verified", I("Netherlands", "Netherlands", "Netherlands", "B2B", "valid"), { code: "0% NL RC", level: "ok", entity: "NL" }),
    T("t11", "NL stock delivered in NL to a German business", I("Netherlands", "Netherlands", "Germany", "B2B", "valid"), { code: "0% NL RC" }),
    T("t12", "NL stock to Dutch consumer", I("Netherlands", "Netherlands", "Netherlands", "B2C"), { code: "Standard NL VAT", rate: 21 }),
    T("t13", "French stock to Dutch business", I("France", "Netherlands", "Netherlands", "B2B", "valid"), { code: "0% NL RC" }),
    T("t14", "French stock to Dutch consumer", I("France", "Netherlands", "Netherlands", "B2C"), { code: "OSS Destination Rate", rate: 21 }),
    T("t15", "NL stock to German business, VAT no. verified", I("Netherlands", "Germany", "Germany", "B2B", "valid"), { code: "0% Intra-Community Supply", level: "ok", entity: "NL" }),
    T("t16", "NL stock to German business, VAT no. not checked", I("Netherlands", "Germany", "Germany", "B2B"), { code: "0% Intra-Community Supply", level: "warn" }),
    T("t17", "NL stock to Germany, French customer", I("Netherlands", "Germany", "France", "B2B", "valid"), { code: "0% Intra-Community Supply" }),
    T("t18", "French stock to Italian business", I("France", "Italy", "Italy", "B2B", "valid"), { code: "0% EU Triangulation", level: "ok", entity: "NL" }),
    T("t19", "French stock to Italy, Spanish customer", I("France", "Italy", "Spain", "B2B", "valid"), { code: "0% EU Triangulation" }),
    T("t20", "German stock to German business", I("Germany", "Germany", "Germany", "B2B"), { code: "REROUTE VIA NL REQUIRED", level: "block" }),
    T("t21", "German stock to German consumer", I("Germany", "Germany", "Germany", "B2C"), { code: "REROUTE VIA NL REQUIRED", level: "block" }),
    T("t22", "NL stock to Germany, US customer, no EU VAT no.", I("Netherlands", "Germany", "ROW", "B2B"), { code: "OSS Destination Rate", rate: 19 }),
    T("t23", "French stock to Spain, UK customer with verified EU VAT no.", I("France", "Spain", "UK", "B2B", "valid"), { code: "0% EU Triangulation" }),
    T("t24", "NL stock to German business, VAT no. invalid", I("Netherlands", "Germany", "Germany", "B2B", "invalid"), { code: "OSS Destination Rate", rate: 19 }),
    T("t25", "NL stock to German consumer", I("Netherlands", "Germany", "Germany", "B2C"), { code: "OSS Destination Rate", rate: 19, entity: "NL" }),
    T("t26", "NL stock to Portuguese consumer", I("Netherlands", "Portugal", "Portugal", "B2C"), { code: "OSS Destination Rate", rate: 23 }),
    T("t27", "UK stock to Dutch business", I("UK", "Netherlands", "Netherlands", "B2B"), { code: "REROUTE VIA NL REQUIRED", level: "block" }),
    T("t28", "UK stock to Dutch consumer", I("UK", "Netherlands", "Netherlands", "B2C"), { code: "REROUTE VIA NL REQUIRED", level: "block" }),
  ];
}
