# VAT Rules Checker (prototype)

A small web app that works out the VAT treatment of a sale from where the goods ship from, where they're delivered, where the customer is based and whether it's a business or consumer sale. For each sale it gives the tax code and rate, which company should raise the invoice, the mandatory invoice wording, and compliance checks.

The rules started as Miranda Hope's EU VAT Calculator spreadsheet (PVM Consultants) and follow her answers up to 14 October 2026. Rules tagged "Needs sign-off" in the app are still awaiting her confirmation. This is a prototype for review, not tax advice.

## What's here

| Path | What it is |
|---|---|
| `prototype/index.html` | The whole app in one file: checker, editable rules, test scenarios, VAT rates |
| `prototype/engine.js` | The rules engine on its own (no DOM), shared with the tests |
| `netlify/functions/vies.mjs` | Server function at `/api/vies` that checks EU VAT numbers with the European Commission's VIES service |
| `netlify.toml` | Publishes `prototype/` and the function |
| `tests/run-tests.mjs` | Runs the test scenarios and checks every possible input matches a rule |

## Running it

- Open `prototype/index.html` in a browser. Everything works except the VAT number check, which is simulated when opened as a file.
- `node tests/run-tests.mjs` runs the 27 test scenarios and the coverage check.
- `npx netlify-cli dev` serves it locally with the live VIES function.

## Live VAT number checks

Browsers can't call VIES directly, so the page posts to `/api/vies` and the function asks VIES on its behalf. When the page finds that endpoint it switches to live checks and shows the registered name and address. An unavailable VIES service is never treated as an invalid number.

Optional environment variables (set in Netlify, scoped to Functions):

- `VIES_REQUESTER_COUNTRY`, for example `NL`
- `VIES_REQUESTER_NUMBER`, the client's own VAT number without the country prefix

With both set, VIES returns a consultation number for each check, which is the audit evidence.

## Notes

- Rule edits in the app are saved in the viewer's browser only.
- Client spreadsheets are kept out of the repo by `.gitignore`.
