/* ===== VAT rules engine: pure functions + default data. No DOM. =====
   Rules follow Miranda's answers up to 19 Oct 2026 and the wording in her
   EU VAT Calculator spreadsheet v3. Client set-up: established in the UK,
   paper (non-established) VAT registration in the Netherlands, not yet
   registered for IOSS. */
(function (root) {
  "use strict";

  // name, VAT-number prefix, standard rate (%)
  const EU = [
    ["Austria", "AT", 20], ["Belgium", "BE", 21], ["Bulgaria", "BG", 20], ["Croatia", "HR", 25],
    ["Cyprus", "CY", 19], ["Czech Republic", "CZ", 21], ["Denmark", "DK", 25], ["Estonia", "EE", 24],
    ["Finland", "FI", 25.5], ["France", "FR", 20], ["Germany", "DE", 19], ["Greece", "EL", 24],
    ["Hungary", "HU", 27], ["Ireland", "IE", 23], ["Italy", "IT", 22], ["Latvia", "LV", 21],
    ["Lithuania", "LT", 21], ["Luxembourg", "LU", 17], ["Malta", "MT", 18], ["Netherlands", "NL", 21],
    ["Poland", "PL", 23], ["Portugal", "PT", 23], ["Romania", "RO", 21], ["Slovakia", "SK", 23],
    ["Slovenia", "SI", 22], ["Spain", "ES", 21], ["Sweden", "SE", 25]
  ];
  const EU_NAMES = EU.map(e => e[0]);
  const PLACES = EU_NAMES.concat(["UK", "ROW"]);          // delivery + customer locations
  const DISPATCH_PLACES = ["UK"].concat(EU_NAMES);         // where goods can ship from
  const PREFIX_TO_COUNTRY = Object.fromEntries(EU.map(e => [e[1], e[0]]));
  PREFIX_TO_COUNTRY.XI = "UK"; // Northern Ireland goods numbers are in VIES

  function placeLabel(p) {
    if (p === "UK") return "United Kingdom";
    if (p === "ROW") return "Rest of world";
    return p || "";
  }
  const ORIGIN_LABEL = { UK: "UK", NL: "Netherlands", OTHER: "Other EU country" };
  const ZONE_LABEL = { UK: "UK", NL: "Netherlands", EU: "Other EU country", ROW: "Outside UK & EU" };
  const LEVEL_LABEL = { ok: "Ready to invoice", warn: "Check before invoicing", block: "Do not invoice" };
  const VIES_LABEL = { unchecked: "Not checked", valid: "Valid", invalid: "Invalid", unavailable: "VIES unavailable" };
  const VALUE_LABEL = { low: "€150 or less", high: "Over €150" };
  // Invoice entity ("Invoice Branding" in spreadsheet v3)
  const ENTITY = {
    UK: { short: "UK company", text: "Use the UK VAT registration (UK entity details and letterhead)" },
    NL: { short: "Netherlands company", text: "Use the NL VAT registration (Netherlands entity details and paper VAT registration)" }
  };

  function zoneOf(p) {
    if (p === "UK") return "UK";
    if (p === "ROW") return "ROW";
    if (p === "Netherlands") return "NL";
    return "EU";
  }
  function originOf(dispatch) {
    return dispatch === "UK" ? "UK" : dispatch === "Netherlands" ? "NL" : "OTHER";
  }

  function defaultRates() {
    const r = {};
    EU.forEach(e => { r[e[0]] = e[2]; });
    r.UK = 20;
    return r;
  }

  // ---- Wording from Miranda's spreadsheet (v3 where it has it) ----
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
    triWarn: "There must be exactly one physical cross-border movement of goods. The transport must be arranged and paid for by either the supplier (despatch country) or the intermediary (your business)."
  };

  function R(id, name, status, note, when, then) {
    return { id, name, status, note, when, then: Object.assign({ warning: "", needsVat: false, level: "ok", entity: "" }, then) };
  }
  const NONE = { kind: "none" }, ZERO = { kind: "fixed", value: 0 }, DEST = { kind: "dest" };
  const V3 = "Matches spreadsheet v3.";
  const NOTV3 = "Differs from spreadsheet v3: ";

  function baseRules() {
    return [
      R("r-reroute", "Reroute: same-country sale from other EU stock", "sheet",
        V3 + " Miranda confirmed (14 Oct) this blocks consumer sales too, as the client has no local VAT registration.",
        { origin: ["OTHER"], dispatchIsDest: true },
        { code: "REROUTE VIA NL REQUIRED", rate: NONE, level: "block", invoice: W.rerouteInv,
          warning: "Stock in {dispatch} can't be sold for delivery within {dispatch}: the client has no VAT registration there. Move the goods through the Netherlands warehouse first." }),
      R("r-export", "Export outside the UK and EU", "sheet", V3,
        { destZone: ["ROW"] },
        { code: "0% Export", rate: ZERO, invoice: W.exportInv, warning: W.exportWarn, entity: "UK" }),
      R("r-uk-domestic", "UK stock delivered in the UK", "sheet",
        V3 + " The client is established in the UK.",
        { origin: ["UK"], destZone: ["UK"] },
        { code: "20% UK VAT", rate: DEST, invoice: W.ukDomInv, warning: W.ukDomWarn, entity: "UK" }),
      R("r-eu-uk", "EU stock delivered in the UK", "sheet",
        V3 + " Miranda (14 Oct): the client owns the goods on import into the UK, so this is a UK sale. Open point: assumes the client always imports the goods itself.",
        { origin: ["NL", "OTHER"], destZone: ["UK"] },
        { code: "20% UK VAT", rate: DEST, invoice: W.ukImpInv, warning: W.ukImpWarn, entity: "UK" }),
      R("r-uk-eu-reroute-b2b", "UK stock to an EU business: reroute via NL", "fixed",
        NOTV3 + "its formula gives intra-community supply or triangulation here. Miranda (19 Oct): moving UK stock into the EU is a 0% UK export, but it has to be rerouted through the Netherlands first. Open points: should this block the sale or only warn, and does it apply when the goods are delivered in the Netherlands?",
        { origin: ["UK"], destZone: ["EU", "NL"], type: ["B2B"] },
        { code: "REROUTE VIA NL REQUIRED", rate: NONE, level: "block", invoice: W.ukRerouteInv,
          warning: "UK stock can't be sent straight to a business customer in {dest}. Move the goods to the Netherlands warehouse first (a 0% UK export, imported into the Netherlands), then check the sale again with the Netherlands as the ship-from country." }),
      R("r-uk-eu-reroute-b2c", "UK stock to an EU consumer: reroute via NL", "fixed",
        NOTV3 + "its formula uses OSS wording. Miranda (19 Oct): the client isn't registered for IOSS yet, so UK stock has to be rerouted through the Netherlands, and the OSS rules then apply. She's getting them registered, so the IOSS rules (parcels up to €150, and import VAT above €150) are kept aside to put back then. Open points: should this block the sale or only warn, and does it apply when the goods are delivered in the Netherlands?",
        { origin: ["UK"], destZone: ["EU", "NL"], type: ["B2C"] },
        { code: "REROUTE VIA NL REQUIRED", rate: NONE, level: "block", invoice: W.ukRerouteInv,
          warning: "The client isn't registered for IOSS, so UK stock can't be sent straight to a consumer in {dest}. Move the goods to the Netherlands warehouse first, then check the sale again with the Netherlands as the ship-from country." }),
      R("r-nl-rc", "NL stock to a business, delivered in NL", "fixed",
        NOTV3 + "its formula skips the reverse charge when goods ship from the Netherlands and gives intra-community supply or triangulation. Miranda confirmed (13 Oct) the reverse charge applies to any business delivery in NL because of the paper registration. She's checking the \"Section 1e\" reference.",
        { origin: ["NL"], destZone: ["NL"], type: ["B2B"] },
        { code: "0% NL RC", rate: ZERO, invoice: W.nlRcInv, needsVat: true, entity: "NL" }),
      R("r-nl-b2c", "NL stock to a Dutch consumer", "fixed",
        "Same 21% as spreadsheet v3, but v3 uses OSS wording for what is a sale within the Netherlands, so the wording says domestic supply.",
        { origin: ["NL"], destZone: ["NL"], type: ["B2C"] },
        { code: "Standard NL VAT", rate: DEST, invoice: "Dutch domestic supply – NL VAT charged at {rate}.", warning: W.b2cWarn, entity: "NL" }),
      R("r-other-nl", "Other EU stock to a business in NL", "sheet",
        V3 + " Reverse-charged because of the client's paper NL registration. Miranda is checking the \"Section 1e\" reference.",
        { origin: ["OTHER"], destZone: ["NL"], type: ["B2B"] },
        { code: "0% NL RC", rate: ZERO, invoice: W.nlRcInv, needsVat: true, entity: "NL" }),
      R("r-nonEU-novat", "Non-EU customer without a verified EU VAT number", "fixed",
        NOTV3 + "its tax code says triangulation and its warning tells the user to switch to B2C. Miranda confirmed (13 Oct): without a valid EU VAT number it's a consumer sale at the delivery country's rate, so the app does that automatically.",
        { origin: ["NL", "OTHER"], destZone: ["EU"], type: ["B2B"], custZone: ["UK", "ROW"], vies: ["unchecked", "unavailable"] },
        { code: "OSS Destination Rate", rate: DEST, invoice: W.ossInv, entity: "NL",
          warning: "The customer is based in {cust} and has no verified EU VAT number, so this is treated as a consumer sale. If they give you a valid {dest} VAT number for the receiving party, check it with VIES: the sale can then be zero-rated." }),
      R("r-triangulation", "Triangulation", "fixed",
        NOTV3 + "its formula triggers triangulation when the customer's country differs from the delivery country. This follows Miranda's 14 Oct answer: the despatch country, NL and the delivery country are all different. On 19 Oct she said it's when the customer's country differs from the delivery country, as v3 does. Kept on the 14 Oct version until she confirms with worked examples.",
        { origin: ["OTHER"], destZone: ["EU"], type: ["B2B"] },
        { code: "0% EU Triangulation", rate: ZERO, invoice: W.triInv, warning: W.triWarn, needsVat: true, entity: "NL" }),
      R("r-ics", "Intra-community supply from NL stock", "fixed",
        NOTV3 + "its formula calls this triangulation when the customer's country differs from the delivery country. Goods leaving the Netherlands can't be triangulation under Miranda's 14 Oct answer, so this is a plain 0% intra-community supply. Her 19 Oct answer would make NL stock to Germany for a French customer triangulation; kept as it is until she confirms with worked examples.",
        { origin: ["NL"], destZone: ["EU"], type: ["B2B"] },
        { code: "0% Intra-Community Supply", rate: ZERO, invoice: W.icsInv, needsVat: true, entity: "NL" }),
      R("r-oss", "EU stock to an EU consumer (OSS)", "sheet", V3,
        { origin: ["NL", "OTHER"], destZone: ["EU", "NL"], type: ["B2C"] },
        { code: "OSS Destination Rate", rate: DEST, invoice: W.ossInv, warning: W.b2cWarn, entity: "NL" })
    ];
  }

  // Rules with an open point Miranda still needs to confirm
  const SIGNOFF = ["r-eu-uk", "r-uk-eu-reroute-b2b", "r-uk-eu-reroute-b2c", "r-nl-rc", "r-other-nl", "r-triangulation", "r-ics"];
  function defaultRules() {
    return baseRules().map(r => Object.assign(r, { signoff: SIGNOFF.includes(r.id) }));
  }

  function T(id, label, inp, expect) { return { id, label, inp, expect, builtin: true }; }
  function I(dispatch, dest, cust, type, vies, value) { return { dispatch, dest, cust, type, vies: vies || "unchecked", value: value || "low" }; }
  function defaultTests() {
    return [
      T("t01", "UK stock to UK business", I("UK", "UK", "UK", "B2B"), { code: "20% UK VAT", rate: 20, entity: "UK" }),
      T("t02", "UK stock to UK consumer", I("UK", "UK", "UK", "B2C"), { code: "20% UK VAT", rate: 20, entity: "UK" }),
      T("t03", "NL stock to the UK, German customer", I("Netherlands", "UK", "Germany", "B2B"), { code: "20% UK VAT", rate: 20, entity: "UK" }),
      T("t04", "French stock to a UK consumer", I("France", "UK", "UK", "B2C"), { code: "20% UK VAT", rate: 20 }),
      T("t05", "UK stock to rest of world", I("UK", "ROW", "ROW", "B2B"), { code: "0% Export", entity: "UK" }),
      T("t06", "Spanish stock to rest of world", I("Spain", "ROW", "ROW", "B2B"), { code: "0% Export", entity: "UK" }),
      T("t07", "UK stock to Irish business", I("UK", "Ireland", "Ireland", "B2B"), { code: "REROUTE VIA NL REQUIRED", level: "block" }),
      T("t08", "UK stock to German consumer, €150 or less", I("UK", "Germany", "Germany", "B2C", "", "low"), { code: "REROUTE VIA NL REQUIRED", level: "block" }),
      T("t09", "UK stock to German consumer, over €150", I("UK", "Germany", "Germany", "B2C", "", "high"), { code: "REROUTE VIA NL REQUIRED", level: "block" }),
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
      T("t28", "UK stock to Dutch consumer", I("UK", "Netherlands", "Netherlands", "B2C"), { code: "REROUTE VIA NL REQUIRED", level: "block" })
    ];
  }

  // ---- Engine ----
  function facts(inp) {
    const dispatch = inp.dispatch;
    const downgraded = inp.type === "B2B" && inp.vies === "invalid";
    return {
      origin: originOf(dispatch), dispatch, dest: inp.dest, cust: inp.cust,
      type: downgraded ? "B2C" : inp.type, downgraded,
      destZone: zoneOf(inp.dest), custZone: zoneOf(inp.cust),
      dispatchIsDest: dispatch === inp.dest, custIsDest: inp.cust === inp.dest,
      vies: inp.type === "B2B" ? (inp.vies || "unchecked") : "unchecked",
      value: inp.value === "high" ? "high" : "low"
    };
  }

  const LIST_FIELDS = ["origin", "type", "destZone", "custZone", "vies", "value"];
  const BOOL_FIELDS = ["dispatchIsDest", "custIsDest"];

  function matches(when, f) {
    for (const k of LIST_FIELDS) {
      const v = when[k];
      if (Array.isArray(v) && !v.includes(f[k])) return false;
    }
    for (const k of BOOL_FIELDS) {
      const v = when[k];
      if (typeof v === "boolean" && v !== f[k]) return false;
    }
    return true;
  }

  function fmtPct(n) {
    if (n === null || n === undefined || isNaN(n)) return "–";
    return (Math.round(n * 100) / 100).toString() + "%";
  }

  function fill(tpl, ctx) {
    return String(tpl || "").replace(/\{(\w+)\}/g, (m, k) => (k in ctx ? ctx[k] : m));
  }

  const LEVEL_RANK = { ok: 0, warn: 1, block: 2 };

  function evaluate(inp, model) {
    const f = facts(inp);
    const idx = model.rules.findIndex(r => matches(r.when, f));
    const notes = [];
    if (idx < 0) {
      return { f, idx: -1, rule: null, code: "No rule matched", rate: null, level: "block", entity: "",
        invoice: "", notes: [{ level: "block", text: "No rule covers this combination. Add one in the Rules tab." }] };
    }
    const rule = model.rules[idx];
    const t = rule.then;
    const rate = t.rate.kind === "fixed" ? Number(t.rate.value) : t.rate.kind === "dest" ? (model.rates[f.dest] ?? null) : null;
    const vat = (inp.vatNumber || "").trim();
    const ctx = {
      dest: placeLabel(f.dest), dispatch: placeLabel(f.dispatch), cust: placeLabel(f.cust),
      rate: fmtPct(rate), destRate: fmtPct(model.rates[f.dest]), vat: vat || "[customer VAT number]"
    };
    let level = t.level || "ok";
    if (f.downgraded) {
      notes.push({ level: "warn", text: `VIES says ${vat || "this VAT number"} is not valid, so this is treated as a consumer sale (B2C) and the tax has been recalculated.` });
    }
    if (t.warning) notes.push({ level: t.level === "block" ? "block" : t.level === "warn" ? "warn" : "info", text: fill(t.warning, ctx) });
    if (t.needsVat && f.type === "B2B") {
      if (f.vies === "valid") {
        notes.push({ level: "ok", text: `VAT number ${vat || ""} verified with VIES.`.replace("  ", " ") });
      } else if (f.vies === "unavailable") {
        notes.push({ level: "warn", text: "VIES couldn't be reached, so the VAT number isn't verified yet. Don't zero-rate until it is: try again later, or treat the sale as B2C." });
        level = LEVEL_RANK[level] < 1 ? "warn" : level;
      } else {
        notes.push({ level: "warn", text: `Check the customer's EU VAT number with VIES before invoicing at 0%. If you can't get a valid number, treat the sale as B2C.` });
        level = LEVEL_RANK[level] < 1 ? "warn" : level;
      }
    }
    if (f.downgraded) level = LEVEL_RANK[level] < 1 ? "warn" : level;
    return { f, idx, rule, code: t.code, rate, level, entity: t.entity || "", invoice: fill(t.invoice, ctx), notes };
  }

  // ---- Spreadsheet v3 (B6 tax code, B7 entity, B8 wording test), ported as-is for comparison ----
  const SHEET_RATES = Object.fromEntries(EU.map(e => [e[0], e[2] / 100]));
  function sheetV3(inp) {
    const B1 = inp.dispatch, B2 = inp.dest, B3 = inp.cust, B4 = inp.type;
    const entity = B2 === "ROW" || B2 === "UK" ? "UK" : "NL";
    const notNLUK = B1 !== "Netherlands" && B1 !== "UK";
    // B8's reroute test compares delivery with customer location (B2=B3) instead of dispatch with delivery
    const wordingSaysDoNotInvoice = B2 !== "ROW" && B2 !== "UK" && notNLUK && B2 === B3;
    let code;
    if (B2 === "ROW") code = "0% Export";
    else if (B2 === "UK") code = "20% UK VAT";
    else if (notNLUK && B1 === B2) code = "REROUTE VIA NL REQUIRED";
    else if (B4 === "B2C") { const n = SHEET_RATES[B2]; return { code: n === undefined ? "Country Not Found" : String(n), num: n, entity, wordingSaysDoNotInvoice }; }
    else if (notNLUK && B2 === "Netherlands") code = "0% NL RC";
    else if (B2 !== B3) code = "0% EU Triangulation";
    else code = "0% Intra-Community Supply";
    return { code, entity, wordingSaysDoNotInvoice };
  }
  function sameAsSheet(res, sheet) {
    if (!res.rule) return false;
    if (sheet.num !== undefined) {
      return res.rule.then.rate.kind === "dest" && res.level !== "block" && Math.abs((res.rate ?? -1) / 100 - sheet.num) < 1e-9;
    }
    return sheet.code === res.code;
  }

  // ---- Tests & coverage ----
  function runTest(test, model) {
    const res = evaluate(Object.assign({ vatNumber: "" }, test.inp), model);
    const e = test.expect, fails = [];
    if (e.code !== undefined && res.code !== e.code) fails.push(`code is "${res.code}"`);
    if (e.rate !== undefined && !(res.rate !== null && Math.abs(res.rate - e.rate) < 1e-9)) fails.push(`rate is ${fmtPct(res.rate)}`);
    if (e.level !== undefined && res.level !== e.level) fails.push(`status is "${LEVEL_LABEL[res.level]}"`);
    if (e.entity !== undefined && res.entity !== e.entity) fails.push(`invoice from ${res.entity ? ENTITY[res.entity].short : "not set"}`);
    return { pass: fails.length === 0, fails, res };
  }

  function coverage(model) {
    const hits = new Array(model.rules.length).fill(0);
    let total = 0, gaps = 0, gapExample = null;
    for (const dispatch of DISPATCH_PLACES) for (const dest of PLACES) for (const cust of PLACES) for (const type of ["B2B", "B2C"]) {
      const viesStates = type === "B2B" ? ["unchecked", "valid", "invalid", "unavailable"] : ["unchecked"];
      const values = dispatch === "UK" && type === "B2C" ? ["low", "high"] : ["low"];
      for (const vies of viesStates) for (const value of values) {
        total++;
        const f = facts({ dispatch, dest, cust, type, vies, value });
        const i = model.rules.findIndex(r => matches(r.when, f));
        if (i < 0) { gaps++; if (!gapExample) gapExample = { dispatch, dest, cust, type, vies, value }; }
        else hits[i]++;
      }
    }
    return { total, gaps, gapExample, hits };
  }

  // The parcel-value question only matters for UK stock sold to an EU consumer, and only if a rule
  // uses it (just the IOSS rules, kept aside until the client is registered for IOSS)
  function valueRelevant(inp, rules) {
    if (rules && !rules.some(r => Array.isArray(r.when.value))) return false;
    return inp.dispatch === "UK" && inp.type === "B2C" && (zoneOf(inp.dest) === "EU" || zoneOf(inp.dest) === "NL");
  }

  function describeInputs(inp) {
    let s = `${placeLabel(inp.dispatch)} stock → ${placeLabel(inp.dest)} · customer in ${placeLabel(inp.cust)} · ${inp.type}`;
    if (inp.type === "B2B" && inp.vies && inp.vies !== "unchecked") s += ` · VIES ${VIES_LABEL[inp.vies].toLowerCase()}`;
    if (valueRelevant(inp)) s += inp.value === "high" ? " · over €150" : " · €150 or less";
    return s;
  }

  function checkVatFormat(raw) {
    const v = String(raw || "").toUpperCase().replace(/[\s.\-]/g, "");
    const m = v.match(/^([A-Z]{2})([0-9A-Z]{2,12})$/);
    if (!m) return { ok: false, clean: v, reason: "That doesn't look like an EU VAT number. It should start with a two-letter country code, like DE123456789." };
    if (m[1] === "GB") return { ok: false, clean: v, gb: true, reason: "UK (GB) VAT numbers aren't in VIES since Brexit. The real app would check them with HMRC instead." };
    if (!PREFIX_TO_COUNTRY[m[1]]) return { ok: false, clean: v, reason: `"${m[1]}" isn't an EU VAT country code. Greece uses EL, and Northern Ireland uses XI.` };
    return { ok: true, clean: v, country: PREFIX_TO_COUNTRY[m[1]] };
  }

  const api = {
    EU, EU_NAMES, PLACES, DISPATCH_PLACES, ORIGIN_LABEL, ZONE_LABEL, LEVEL_LABEL, VIES_LABEL, VALUE_LABEL, ENTITY,
    LIST_FIELDS, BOOL_FIELDS,
    placeLabel, zoneOf, originOf, valueRelevant, defaultRates, defaultRules, defaultTests, facts, matches, evaluate, fmtPct, fill,
    sheetV3, sameAsSheet, runTest, coverage, describeInputs, checkVatFormat
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.VAT = api;
})(typeof window !== "undefined" ? window : globalThis);
