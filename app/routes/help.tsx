// "How to": instructions for using the app. Everyone sees the checking sections; PVM admins also see
// how to manage clients, rules, rates and staff.
import type { ReactNode } from "react";
import { Link } from "react-router";
import { Card, CardHeader, Chip, PageHeader } from "~/components/ui";
import { useAppData } from "./app-layout";
import type { Route } from "./+types/help";

export const meta: Route.MetaFunction = () => [{ title: "How to · VAT Rules Checker" }];

// ---------- Small building blocks ----------

/** A name shown on screen (a button, box or menu item), so readers can match it to the page */
function Ui({ children }: { children: ReactNode }) {
  return <b className="font-medium text-head">{children}</b>;
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="grid gap-3.5">{children}</ol>;
}

function Step({ n, children }: { n: number | string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[22px_minmax(0,1fr)] items-start gap-3">
      <span className="mt-px inline-grid size-[22px] place-items-center rounded-full bg-accent-soft text-[11.5px] font-semibold text-accent">{n}</span>
      <div className="min-w-0">{children}</div>
    </li>
  );
}

function Points({ children }: { children: ReactNode }) {
  return <ul className="grid list-disc gap-2 pl-5 marker:text-muted">{children}</ul>;
}

function Tip({ children }: { children: ReactNode }) {
  return <p className="rounded-card bg-sunken px-4 py-3 text-[13.5px] text-muted">{children}</p>;
}

function Section({ id, title, sub, children }: { id: string; title: string; sub?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-[94px]">
      <Card>
        <CardHeader title={<span id={`${id}-title`}>{title}</span>} sub={sub} />
        <div className="grid gap-4 px-5 py-5 leading-relaxed">{children}</div>
      </Card>
    </section>
  );
}

const PLACEHOLDERS: [string, string][] = [
  ["{dest}", "the delivery country"],
  ["{dispatch}", "the country the goods ship from"],
  ["{cust}", "the customer's country"],
  ["{rate}", "this rule's rate"],
  ["{destRate}", "the delivery country's standard rate"],
  ["{vat}", "the customer's VAT number"],
];

// ---------- Page ----------

const CHECKING = [
  { id: "check", title: "Check a sale" },
  { id: "result", title: "Read the result" },
  { id: "vies", title: "Check a VAT number" },
  { id: "save", title: "Save a check" },
  { id: "history", title: "Find a saved check" },
  { id: "account", title: "Your account" },
];
const ADMIN = [
  { id: "clients", title: "Clients" },
  { id: "rules", title: "Edit the draft rules" },
  { id: "tests", title: "Tests and checks" },
  { id: "try", title: "Try the draft" },
  { id: "publish", title: "Publish and roll back" },
  { id: "rates", title: "VAT rates" },
  { id: "staff", title: "Staff accounts" },
];

function Contents({ isAdmin }: { isAdmin: boolean }) {
  const group = (label: string, items: { id: string; title: string }[]) => (
    <div>
      <div className="px-5 pt-4 pb-1.5 text-[12px] font-medium text-muted">{label}</div>
      <ul className="pb-2">
        {items.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="block px-5 py-1.5 text-[14px] text-nav hover:text-accent">{s.title}</a>
          </li>
        ))}
      </ul>
    </div>
  );
  const all = isAdmin ? [...CHECKING, ...ADMIN] : CHECKING;
  return (
    <>
      {/* Phones: a compact row of links. Larger screens: a card that stays in view while scrolling */}
      <nav aria-label="On this page" className="flex flex-wrap gap-1.5 lg:hidden">
        {all.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="rounded-btn bg-btn px-2.5 py-1 text-[13px] font-medium text-nav hover:text-accent">{s.title}</a>
        ))}
      </nav>
      <nav aria-label="On this page" className="hidden lg:sticky lg:top-[94px] lg:block">
        <Card className="pb-1">
          {group("Checking sales", CHECKING)}
          {isAdmin ? <div className="border-t border-line">{group("PVM admin", ADMIN)}</div> : null}
        </Card>
      </nav>
    </>
  );
}

export default function Help() {
  const { isAdmin, activeClient } = useAppData();
  const company = activeClient?.name ?? "your company";
  return (
    <>
      <PageHeader
        title="How to"
        intro={
          isAdmin
            ? "How to check a sale and read the result, then how to look after each client's rules, the VAT rates and staff accounts."
            : `How to check the VAT treatment of a sale for ${company}, read the result and keep a record of it.`
        }
        crumbs={[{ label: "VAT Rules Checker", to: "/check" }, { label: "How to" }]}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
        <Contents isAdmin={isAdmin} />

        <div className="grid min-w-0 gap-5">
          <Section id="check" title="Check a sale" sub="The numbers match the boxes on the page; the result updates as you go.">
            <p>Open <Link to="/check" className="font-medium text-accent hover:underline">Check a sale</Link> from the menu and fill in the boxes:</p>
            <Steps>
              <Step n={1}><Ui>Ships from</Ui>: the country the goods leave from, either the UK or an EU country.</Step>
              <Step n={2}><Ui>Delivered to</Ui>: where the goods are physically delivered.</Step>
              <Step n={3}><Ui>Customer based in</Ui>: where the buyer's company (or the consumer) is based. This can be a different country from the delivery.</Step>
              <Step n={4}><Ui>Customer type</Ui>: <Ui>B2B</Ui> for a business, <Ui>B2C</Ui> for a consumer.</Step>
              <Step n={5}><Ui>Customer EU VAT number</Ui>: business sales only. Type it and check it (see <a href="#vies" className="font-medium text-accent hover:underline">Check a VAT number</a>).</Step>
            </Steps>
          </Section>

          <Section id="result" title="Read the result">
            <p>The bar at the top tells you whether you can go ahead:</p>
            <Points>
              <li><Chip tone="ok">Ready to invoice</Chip> Go ahead and raise the invoice as shown.</li>
              <li><Chip tone="warn">Check before invoicing</Chip> Something needs confirming first, usually the customer's VAT number. The compliance checks say what.</li>
              <li><Chip tone="block">Do not invoice</Chip> The sale can't go ahead as it stands. For example, the goods have to go through the Netherlands warehouse first. The checks explain why.</li>
            </Points>
            <p>Below that:</p>
            <Points>
              <li><Ui>Rate and tax code</Ui>: the VAT rate to charge and the code for your records.</li>
              <li><Ui>Invoice from</Ui>: which company raises the invoice (the UK company or the Netherlands company), and which VAT registration and letterhead to use.</li>
              <li><Ui>Invoice wording</Ui>: the text the invoice must carry. <Ui>Copy</Ui> puts it on your clipboard.</li>
              <li><Ui>Compliance checks</Ui>: anything to confirm or do before invoicing.</li>
              <li><Ui>Why this result</Ui>: the rule that decided it and the rules version in use.</li>
            </Points>
          </Section>

          <Section id="vies" title="Check a VAT number" sub="Business sales are only zero-rated with a valid EU VAT number.">
            <Steps>
              <Step n={1}>Choose <Ui>B2B</Ui>, then type the number in box 5 with its two-letter country code, such as DE123456789. Greece uses EL.</Step>
              <Step n={2}>Press <Ui>Check with VIES</Ui>. This asks the EU's own VAT number service.</Step>
            </Steps>
            <Points>
              <li><b className="font-medium text-ok">Valid</b>: the registered name and address appear, where the country shares them. Check they match the customer on the order.</li>
              <li><b className="font-medium text-block">Not valid</b>: the sale is treated as a consumer sale (B2C) and the tax is worked out again automatically.</li>
              <li><b className="font-medium text-warn">VIES didn't answer</b>: the EU service is sometimes down. Don't zero-rate the sale until the number is checked; try again in a few minutes.</li>
            </Points>
            <Tip>UK (GB) VAT numbers aren't in VIES since Brexit. Northern Ireland businesses trading goods use numbers starting XI, which are.</Tip>
          </Section>

          <Section id="save" title="Save a check" sub="Keeps a record of the decision for each order.">
            <Steps>
              <Step n={1}>Once the result is right, type the order reference in box 6, <Ui>Order reference</Ui>.</Step>
              <Step n={2}>Press <Ui>Save to log</Ui>. <Ui>View the record</Ui> opens what was saved.</Step>
            </Steps>
            <p>Each record keeps the sale, the result, the rules version that decided it and any VIES answer, which is the evidence an auditor asks for. The result is worked out again on the server before it's saved, so the record always matches the published rules.</p>
          </Section>

          <Section id="history" title="Find a saved check">
            <Points>
              <li><Link to="/history" className="font-medium text-accent hover:underline">Saved checks</Link> lists every check saved for {company}, newest first.</li>
              <li>Search by order reference to find one.</li>
              <li>Open a check to see the full result and the VIES evidence. <Ui>Check this sale again</Ui> opens the same sale in the checker with today's rules.</li>
            </Points>
          </Section>

          <Section id="account" title="Your account">
            <Points>
              <li><Ui>Light or dark</Ui>: the moon or sun button at the top right switches between them.</li>
              <li><Ui>Switching company</Ui>: if you work for more than one client, pick one in the box at the top of the page.</li>
              <li><Ui>Signing out</Ui>: click your name at the top right, then <Ui>Sign out</Ui>.</li>
            </Points>
          </Section>

          {isAdmin ? (
            <>
              <div className="mt-3 flex items-center gap-3">
                <h2 className="text-[16px] font-medium">PVM admin</h2>
                <span className="h-px flex-1 bg-line" />
              </div>

              <Section id="clients" title="Clients" sub="Each client has its own rules, staff accounts and saved checks.">
                <Points>
                  <li><Link to="/admin" className="font-medium text-accent hover:underline">Clients</Link> in the Admin menu lists every client with its live rules version, number of staff and checks in the last 30 days.</li>
                  <li>To add one, fill in <Ui>Add a client</Ui>: the company name, and whether to start from the starter rules or a copy of another client's draft.</li>
                  <li>A new client's staff can't check sales until you've reviewed the draft rules and published them.</li>
                </Points>
              </Section>

              <Section id="rules" title="Edit the draft rules" sub="Clients > client > Draft rules">
                <p>You always edit a draft. The client's staff keep using the published version until you publish, so you can work on changes safely.</p>
                <Points>
                  <li>Rules are checked from the top down, and the first rule that matches the sale decides the result. Use the up and down arrows to change the order.</li>
                  <li>The pencil opens a rule. Under <Ui>When the sale matches</Ui>, tick the values each condition accepts; all ticked means any value. The two yes/no conditions are <Ui>Ships from the same country it's delivered to</Ui> and <Ui>Customer based in the delivery country</Ui>.</li>
                  <li>Under <Ui>Then</Ui>, set the <Ui>Tax code</Ui>, <Ui>Rate</Ui> (no rate, a fixed rate or the delivery country's standard rate), <Ui>Invoice from</Ui>, <Ui>Status shown</Ui>, and whether 0% needs a valid VAT number, which adds the VIES check.</li>
                  <li><Ui>Invoice wording</Ui> and <Ui>Warning</Ui> can include placeholders that fill in for each sale (listed below).</li>
                  <li><Ui>Review note</Ui> is only shown to PVM. <Ui>Legal reference or link</Ui> records the source for the rule.</li>
                  <li><Ui>Duplicate</Ui> copies a rule. <Ui>Delete rule</Ui> asks you to click twice. <Ui>Add rule</Ui> starts a rule that matches nothing, so it can't change a result until you set it up.</li>
                  <li>Rules tagged <Chip tone="warn">Needs sign-off</Chip> are assumptions waiting to be confirmed. Press <Ui>Mark as signed off</Ui> once they are.</li>
                  <li>Press <Ui>Save draft</Ui> in the bar at the top when you're done. <Ui>Undo changes</Ui> goes back to the last save, and the app warns you if you try to leave with unsaved changes.</li>
                </Points>
                <div className="overflow-x-auto rounded-card border border-line">
                  <table className="data-table min-w-[420px]">
                    <thead><tr><th>Placeholder</th><th>Becomes</th></tr></thead>
                    <tbody>
                      {PLACEHOLDERS.map(([p, d]) => (
                        <tr key={p}><td className="font-mono text-[13px]">{p}</td><td>{d}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section id="tests" title="Tests and checks" sub="They rerun on every edit, so a change can't quietly break another case.">
                <Points>
                  <li>The boxes at the top of the draft show whether every possible sale matches a rule, whether any rule never matches, how many tests pass and how many rules need sign-off.</li>
                  <li>The <Ui>Tests</Ui> tab lists sales with a known right answer, failing ones first. <Ui>Only failing</Ui> hides the rest.</li>
                  <li>If a test fails because you meant to change the answer, press <Ui>Accept new answer</Ui>. If not, fix the rule.</li>
                  <li><Ui>Try it</Ui> opens the test's sale in Try the draft. <Ui>Delete</Ui> removes a test.</li>
                </Points>
              </Section>

              <Section id="try" title="Try the draft" sub="Clients > client > Try the draft">
                <Points>
                  <li>The same checker, run against the saved draft instead of the published rules. Save your edits first.</li>
                  <li>Under the result, <Ui>Save as a test scenario</Ui> locks in today's answer for that sale, so a later change that alters it shows up as a failing test.</li>
                </Points>
              </Section>

              <Section id="publish" title="Publish and roll back">
                <Steps>
                  <Step n={1}>On Draft rules, press <Ui>Publish…</Ui>. It only works when every test passes, every sale is covered and no rule is unreachable.</Step>
                  <Step n={2}>Write a line in <Ui>What changed</Ui> and press <Ui>Publish version</Ui>. The client's staff get the new version straight away.</Step>
                </Steps>
                <Points>
                  <li>Saved checks keep the version they were made with, so old records still show how they were decided.</li>
                  <li><Ui>Published versions</Ui> lists every version with its note and what changed since the one before.</li>
                  <li>To roll back, press <Ui>Copy into draft</Ui> on an older version, then publish it. It goes live as a new version number.</li>
                  <li>To throw away draft edits, use <Ui>Go back to version</Ui> on Draft rules.</li>
                </Points>
              </Section>

              <Section id="rates" title="VAT rates" sub="Shared by every client">
                <Points>
                  <li><Link to="/admin/rates" className="font-medium text-accent hover:underline">VAT rates</Link> shows each country's standard rate today, when it started and any scheduled changes.</li>
                  <li>The rates are used wherever a rule charges the delivery country's standard rate, and by the {"{rate}"} and {"{destRate}"} placeholders.</li>
                  <li>To change a rate, fill in <Ui>Add a rate change</Ui> with the country, the rate, the date it applies from and a link to the announcement. It takes over automatically on that day.</li>
                  <li>A scheduled change can be removed before it starts. Rates that have started stay as history.</li>
                </Points>
              </Section>

              <Section id="staff" title="Staff accounts" sub="Clients > client > Staff accounts">
                <Points>
                  <li>Add people with their name, email and role (<Ui>Staff</Ui>, <Ui>Client admin</Ui> or <Ui>Owner</Ui>). Client staff can check sales and see their company's saved checks, but never the rules or other clients.</li>
                  <li><Ui>Remove</Ui> takes away someone's access.</li>
                </Points>
                <Tip>For now everyone signs in with the shared demo password. When proper sign-in is added, each person will get an invitation email to set their own.</Tip>
              </Section>
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
