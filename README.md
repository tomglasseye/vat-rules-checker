# VAT Rules Checker

A web app that works out the VAT treatment of a sale from where the goods ship from, where they're delivered, where the customer is based and whether it's a business or consumer sale. For each sale it gives the tax code and rate, which company should raise the invoice, the mandatory invoice wording and compliance checks, with live VIES checks of EU VAT numbers.

Built for PVM Consultants (Miranda Hope). Each PVM client gets its own rules, its own staff accounts and its own log of saved checks. PVM edits a client's rules as a draft, tests them, and publishes a version when they're ready.

The rules started as Miranda's EU VAT Calculator spreadsheet (v3) and follow her answers up to 22 October 2026. Rules marked "needs sign-off" are still awaiting her confirmation. Not tax advice.

## Stack

- **React Router 8** (framework mode) on **Netlify**. Pages render on the server, and loaders and actions run as Netlify Functions, so there's no separate API.
- **Tailwind CSS v4**, styled after the Minia admin template: IBM Plex Sans, an indigo primary, a sidebar and top bar, and flat bordered cards. Colour tokens are set in `app/app.css`; light and dark follow the system setting until someone uses the toggle in the top bar, which is saved in a cookie.
- **Postgres** on **Supabase**, using **Drizzle ORM** with node-postgres. On your computer `npm run dev` runs a real Postgres engine in `.netlify/db` instead, so nothing needs installing and local work never touches the real data.
- **Sign-in:** placeholder demo accounts for now, laid out for **Better Auth** (see below).
- **Vitest** for the rules engine and migrations.

## Getting started

Needs Node 22.22 or later (Netlify builds with Node 24).

```bash
npm install
npm run dev
```

Open http://localhost:5173 and sign in with one of the demo accounts. On your computer the password is `demo`.

| Account | What it can do |
|---|---|
| `admin@pvm.test` | PVM admin: every client, rules editor, VAT rates, staff accounts |
| `staff@demo-client.test` | Client staff: check sales and see saved checks for the demo client |

`npm run dev` first brings the local database up to date with the migrations. To start again from the demo data, stop the dev server and run `npm run db:local:reset`.

Other commands:

- `npm test` runs the 28 rule scenarios, the coverage check across all 118,581 possible inputs, a test that applies every migration to a throwaway database, and the sign-in and Clients page queries against it.
- `npm run typecheck`
- `npm run build`

## What's where

| Path | What it is |
|---|---|
| `app/engine/` | The rules engine: pure TypeScript with no database or DOM. It runs in the browser for instant results and on the server before anything is saved. `starter.ts` holds Miranda's rules and the test scenarios. |
| `app/routes/` | Pages. `check.tsx` is the checker, `history*.tsx` the saved checks, `help.tsx` the How to page (admin sections only show for PVM admins), and `admin/` holds clients, the draft rules editor, trying the draft, published versions, staff accounts and VAT rates. |
| `app/routes/api.vies.ts` | `POST /api/vies` checks a VAT number with the EU's VIES service and stores the answer as evidence. Signed-in users only. |
| `app/components/` | `Checker.tsx` (shared by the checker and "Try the draft"), `RulesEditor.tsx`, `Skeletons.tsx` (page outlines shown while a page loads) and UI pieces |
| `app/models/` | Database queries, one file per area |
| `app/lib/auth.server.ts` | Sign-in. Everything goes through this file (see Sign-in) |
| `app/lib/prefetch.client.ts` | Loads a page's data when the pointer rests on a link to it (see Speed) |
| `db/schema.ts` | Database tables |
| `db/migrations/` | SQL migrations. `npm run db:migrate` applies new ones to Supabase, and Netlify runs it before every build |
| `db/migrate.ts`, `db/connection.ts` | The migration runner and the connection settings (SSL for Supabase, none locally) |
| `prototype/` | The original single-file prototype, kept for reference. It isn't deployed |

## How rules work

- A client's rules are an ordered list. The first rule whose conditions match the sale decides the result.
- PVM edits a **draft**. Every edit re-runs the test scenarios and checks that every possible sale matches a rule and that no rule is unreachable.
- **Publishing** copies the draft into a new numbered version. It's refused unless every check passes. Client staff always use the latest published version.
- Each saved check records the version that decided it. The server works the result out again from those rules and the stored VIES answer, so the log never depends on what the browser sent.
- To roll back, copy an older version into the draft on "Published versions" and publish it again.

VAT rates are shared by all clients and have an "applies from" date, so a rate change can be added ahead of time and takes over on the day.

## Speed

Each page change is one request to the Netlify Function, which checks who's signed in and runs the page's loaders. What keeps it quick:

- **Few database round trips.** The sign-in check is one query (the person and their clients together) and runs on every click, so keep it to one. Admin pages find the client in the list it already loaded (`clientFromSlug`) rather than looking it up again. Run a page's own queries side by side with `Promise.all`, or fold them into one.
- **Connections stay open** for two minutes between requests (`app/lib/db.server.ts`), because opening one to Supabase takes several round trips.
- **Prefetching on hover.** `app/lib/prefetch.client.ts` starts loading a page when the pointer rests on a link (or a finger touches it, or the mouse button goes down) and hands the response over when the click arrives. Any save throws prefetched pages away, so nothing opens with data from before a change. Don't add React Router's `<Link prefetch>`: the browser doesn't reuse what it fetches, so every page would load twice.
- **Skeletons.** If a page isn't ready within about a tenth of a second, its outline shows straight away (`app/components/Skeletons.tsx`) and the menu highlights where you're going. Add an outline there for any new page.
- **Keep the function and the database in the same region.** Netlify Functions run in US East (Ohio) unless the project's functions region is changed, which needs a paid Netlify plan. Every query crosses between the two regions, so if Supabase is in Europe each one costs about a tenth of a second.

## Database changes

1. Edit `db/schema.ts`.
2. Run `npm run db:generate`. This writes a new folder in `db/migrations/`.
3. `npm run dev` applies it locally. The next Netlify build applies it to Supabase (`npm run db:migrate`, which records what it has applied in the `app_migrations` table).

Never edit or delete a migration that has been applied to Supabase: the runner won't run it again, so the change would be lost. Write a new one instead. Don't use `drizzle-kit push` or `drizzle-kit migrate`.

To apply migrations to Supabase by hand, run `DATABASE_URL="…" npm run db:migrate`.

`drizzle-orm` and `drizzle-kit` are pinned to the 1.0 beta, which writes migrations in this folder-per-migration format.

## Sign-in

`app/lib/auth.server.ts` is the only file that knows how sign-in works. Pages use `requireUser` / `requireAdmin` (route middleware) and `authContext`, never the cookie directly.

For now it signs in the accounts in the `user` table with one shared password (`DEMO_PASSWORD`). With that variable unset on Netlify, nobody can sign in.

The `user`, `organization` (a PVM client) and `member` tables already use Better Auth's names and fields. "Active client" maps to Better Auth's `session.activeOrganizationId`. To switch on Better Auth:

1. `npm install better-auth`, then set it up in `app/lib/auth.server.ts` with the Drizzle adapter (pointing at `db/schema.ts`) and the `organization` and `admin` plugins.
2. Add Better Auth's own tables (`session`, `account`, `verification`, `invitation`) to `db/schema.ts` and generate a migration.
3. Add a catch-all route for `/api/auth/*` that hands requests to Better Auth.
4. Replace the inside of `loadAuth`, `signIn`, `signOut` and `setActiveClient`, keeping their names and return shapes.
5. Add an email sender (Resend, Postmark…) for invitations and password resets. "Staff accounts" then sends invites instead of using the shared password.
6. Remove the demo accounts with a migration and unset `DEMO_PASSWORD`.

## Deploying to Netlify

The Netlify project `vat-rules-checker` builds from `main` on GitHub. Until the app's first successful build, the site serves the prototype, which was deployed by hand; that build replaces it.

- **Database:** create a Supabase project (the free plan is fine), then in Supabase choose **Connect** and copy the **Transaction pooler** connection string (port 6543), with your database password filled in. That's `DATABASE_URL`. The first build creates the tables and the demo data.
- **Environment variables** (Project configuration > Environment variables):
  - `DATABASE_URL`: required. The Supabase connection string above.
  - `SESSION_SECRET`: required. A long random string, e.g. from `openssl rand -base64 32`.
  - `DEMO_PASSWORD`: the shared password until Better Auth is in. Leave it unset to switch sign-in off.
  - `VIES_REQUESTER_COUNTRY` and `VIES_REQUESTER_NUMBER`: optional. Set them to the client's own VAT number to get a VIES consultation number with each check, which is the evidence an auditor asks for.
- **Deploy:** connect the Git repo in Netlify, or run `npx netlify-cli deploy` from this folder.
- **Deploy previews** use the same `DATABASE_URL` unless you scope it to Production in Netlify, so a preview runs migrations against the real database and shows real data. Preview links are public, so don't share them once real client data is in. For a separate preview database, create a second Supabase project and set `DATABASE_URL` for the Deploy Previews context to its connection string.
