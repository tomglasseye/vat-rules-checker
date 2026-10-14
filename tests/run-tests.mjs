// Runs the built-in test scenarios and the full input-coverage check against the rules engine.
// Usage: node tests/run-tests.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const V = require("../prototype/engine.js");

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
