import { describe, expect, test } from "vitest";
import { checkVatFormat, coverage, defaultRates, describeInputs, evaluate, health, parkedIossRules, runTest, starterRules, starterTests, valueRelevant } from "./index";

const model = { rules: starterRules(), rates: defaultRates() };

describe("starter rules", () => {
  for (const t of starterTests()) {
    test(`${t.id} ${t.label}`, () => {
      const r = runTest(t, model);
      expect(r.fails).toEqual([]);
    });
  }

  test("every possible sale matches a rule", () => {
    const c = coverage(model);
    expect(c.total).toBe(118_581);
    expect(c.gaps, c.gapExample ? describeInputs(c.gapExample) : "").toBe(0);
  });

  test("no rule is unreachable", () => {
    const c = coverage(model);
    const dead = model.rules.filter((_, i) => c.hits[i] === 0).map((r) => r.id);
    expect(dead).toEqual([]);
  });

  test("health says the starter set is publishable", () => {
    const h = health(model.rules, starterTests(), model.rates);
    expect(h.ok).toBe(true);
    expect(h.signoff).toBe(7);
  });

  test("UK stock into the EU is rerouted via NL, B2B and B2C", () => {
    for (const type of ["B2B", "B2C"] as const) {
      const r = evaluate({ dispatch: "UK", dest: "France", cust: "France", type, vies: "unchecked", value: "low" }, model);
      expect(r.code).toBe("REROUTE VIA NL REQUIRED");
      expect(r.level).toBe("block");
    }
  });

  test("the parked IOSS rules still drop back in cleanly", () => {
    const rules = starterRules().flatMap((r) => (r.id === "r-uk-eu-reroute-b2c" ? parkedIossRules() : [r]));
    const c = coverage({ rules, rates: model.rates });
    expect(c.gaps).toBe(0);
    expect(c.hits.filter((h) => h === 0)).toEqual([]);
    const r = evaluate({ dispatch: "UK", dest: "Germany", cust: "Germany", type: "B2C", vies: "unchecked", value: "low" }, { rules, rates: model.rates });
    expect(r.code).toBe("IOSS");
    expect(r.invoice).toBe("Distance sale of imported goods – Germany VAT charged at 19% under IOSS.");
  });

  test("the parcel-value question only shows when a rule uses it", () => {
    const sale = { dispatch: "UK", dest: "Germany", type: "B2C" as const };
    expect(valueRelevant(sale, starterRules())).toBe(false);
    expect(valueRelevant(sale, [...starterRules(), ...parkedIossRules()])).toBe(true);
    expect(valueRelevant(sale)).toBe(true);
  });
});

describe("engine behaviour", () => {
  test("an invalid VAT number downgrades to B2C at the delivery rate", () => {
    const r = evaluate({ dispatch: "Netherlands", dest: "Germany", cust: "Germany", type: "B2B", vies: "invalid", value: "low", vatNumber: "DE000000000" }, model);
    expect(r.f.downgraded).toBe(true);
    expect(r.rate).toBe(19);
    expect(r.level).toBe("warn");
  });

  test("VIES unavailable never zero-rates silently", () => {
    const r = evaluate({ dispatch: "Netherlands", dest: "Germany", cust: "Germany", type: "B2B", vies: "unavailable", value: "low" }, model);
    expect(r.code).toBe("0% Intra-Community Supply");
    expect(r.level).toBe("warn");
  });

  test("placeholders fill in", () => {
    const r = evaluate({ dispatch: "UK", dest: "Germany", cust: "Germany", type: "B2C", vies: "unchecked", value: "low" }, model);
    expect(r.notes[0].text).toBe("The client isn't registered for IOSS, so UK stock can't be sent straight to a consumer in Germany. Move the goods to the Netherlands warehouse first, then check the sale again with the Netherlands as the ship-from country.");
  });

  test("no matching rule blocks the sale", () => {
    const r = evaluate({ dispatch: "UK", dest: "UK", cust: "UK", type: "B2C", vies: "unchecked", value: "low" }, { rules: [], rates: {} });
    expect(r.rule).toBeNull();
    expect(r.level).toBe("block");
  });

  test("VAT number format checks", () => {
    expect(checkVatFormat("de 123.456.789")).toEqual({ ok: true, clean: "DE123456789", country: "Germany" });
    expect(checkVatFormat("GB123456789").ok).toBe(false);
    expect(checkVatFormat("GR123456789").ok).toBe(false);
    expect(checkVatFormat("EL123456789")).toMatchObject({ ok: true, country: "Greece" });
  });
});
