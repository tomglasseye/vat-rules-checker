// Runs the built-in test scenarios and the full input-coverage check against the rules engine.
// Usage: node prototype/run-tests.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
// The repo's package.json is "type": "module", so engine.js loads as ESM and sets globalThis.VAT
const mod = require("./engine.js");
const V = typeof mod.defaultRules === "function" ? mod : globalThis.VAT;

const model = { rules: V.defaultRules(), rates: V.defaultRates() };
const tests = V.defaultTests();
let failed = 0;
for (const t of tests) {
  const r = V.runTest(t, model);
  if (!r.pass) { failed++; console.log(`FAIL ${t.id} ${t.label}: ${r.fails.join(", ")}`); }
}
console.log(`${tests.length - failed} of ${tests.length} test scenarios pass`);

const c = V.coverage(model);
const dead = model.rules.filter((r, i) => c.hits[i] === 0).map(r => r.id);
console.log(`${c.total.toLocaleString("en-GB")} input combinations, ${c.gaps} not covered, ${dead.length} rules never match${dead.length ? ": " + dead.join(", ") : ""}`);
if (c.gaps) console.log("Example gap:", V.describeInputs(c.gapExample));
process.exit(failed || c.gaps || dead.length ? 1 : 0);
