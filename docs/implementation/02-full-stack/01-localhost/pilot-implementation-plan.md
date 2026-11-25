# Localhost Pilot Implementation Plan

[Localhost index](README.md) · Status: **Planned** (written 2026-11-24, not authorized to build)

This plan turns localhost steps 01 to 04 into four build milestones for the first pilot: **customer, contract, receipt approval and collections report**. It authorizes nothing. Each step below needs separate owner approval under [AGENTS.md](../../../../AGENTS.md) section 7.

## Context

The application is a Next.js prototype. Records live in browser memory, sign-in is a mock login kept in `localStorage`, and no server code exists (`src/app/api`, `src/server`, Firebase and Zod usage are all absent). The roadmap target is Firebase SQL Connect (PostgreSQL), Firebase Auth, private Firebase Storage and thin `/api/v1` Route Handlers, first on local emulators.

What the code already provides:

- All 31 repository contracts in `src/data/contracts/` are Promise-based, and the UI reaches them through one hook, `useMockRepositories` (`src/data/queries.ts`).
- The permission logic in `src/modules/identity/` (`permissions.ts`, `record-scope.ts`) contains no browser code and can run on a server unchanged.
- Money is integer centavos (`src/shared/lib/money.ts`). Business dates are `YYYY-MM-DD` Manila strings. Timestamps are ISO strings.

## Owner decisions (2026-11-24)

- Scope: foundation and pilot only (localhost steps 01 to 04).
- Money in the database: **whole centavos** in a `bigint` column (`Int64`). The owner first chose decimal pesos. The Step A gate test (2026-11-24, SQL Connect emulator 3.4.28) then showed that a `numeric(14,2)` column is accepted and exact in PostgreSQL, but the connector returns it as a floating-point number (`Float`), and a `String` field over `numeric` writes but cannot be read back. The owner therefore chose whole centavos, which stay exact end to end (`Int64` travels as a string) and match the integer centavos the screens use.
- Tools: Firebase CLI as a pinned project devDependency. Install Java only if the emulators require it.
- Sample mode stays the default. The setting `NEXT_PUBLIC_DATA_MODE=mock|api` turns on the real local backend.

## Step A: Local database and emulators

1. **Decimal gate (done 2026-11-24).** SQL Connect has no exact decimal type end to end, so money is whole centavos in `Int64` (see Owner decisions). Floats are forbidden for money ([AGENTS.md](../../../../AGENTS.md) section 6).
2. Add devDependency `firebase-tools` (exact version) and a `firebase.json` with only the `dataconnect`, `auth` and `storage` emulators. Use project ID `demo-afhomes`, so the tools cannot reach a real project. Add npm scripts `emulators` and `db:seed` (the seed wipes the pilot tables first, so it doubles as the reset).
3. Add `dataconnect/` with `dataconnect.yaml`, `schema/schema.gql` and a server-only connector. Pilot tables: `UserAccount` (renamed from `StaffAccount` because sales-network members sign in too; unique `firebaseUid`, status), `RoleAssignment`, `Member` (sponsor and parent links for record scope), `Customer`, `Contract`, `Payment`, `AuditEvent` (append-only), `IdempotencyRecord`, `NumberSequence` (one row per official-number series and month).
   - Internal keys are UUIDs. Official numbers (customer number, VIP Number, `OR-` and `PAY-` references) are separate columns with unique constraints.
   - Business dates use `Date`. Action times use `Timestamp`. Money columns are `Int64` centavos and end in `Centavos`.
   - Every operation is `NO_ACCESS` for direct clients.
4. Seed with `scripts/seed-local-db.ts`, reusing `buildSeed` from `src/data/mock/seed/index.ts`. It runs only against the emulator and refuses any project not starting with `demo-`. If Node's built-in TypeScript support cannot resolve the `@/` aliases, ask the owner before adding `tsx`.
5. Add `src/server/money.ts` to convert between the `Int64` wire string and the integer centavos the screens use, rejecting anything outside the safe integer range, with a unit test.

**Verify:** start clean, seed twice and get the same record counts. A receipt pointing to a missing contract is rejected. A duplicate `OR-` number is rejected. 123456 centavos (₱1,234.56) and a Manila business date survive a write and read unchanged.

**Step A status: Verified on 2026-11-24** (SQL Connect emulator 3.4.28, project `demo-afhomes`, starting revision `4a64b44`).

- Seed run twice: 17 user accounts, 19 role assignments, 15 members, 40 customers, 28 contracts, 84 receipts both times. The 10 IGP receipts are skipped because IGP is outside the pilot.
- A receipt with a missing contract was rejected (`payment_contract_id_fkey`). A duplicate document number was rejected (`payment_documentNo_uidx`).
- 123456 centavos (returned as the string `"123456"`), the business date `2026-11-24`, and a Manila timestamp survived a write and read unchanged.
- Ordinary (non-admin) calls to `NO_ACCESS` operations were rejected.
- `npx tsc --noEmit`, ESLint on the new files, the architecture check, `npm run build` and the money unit test passed.
- Java was not needed. The emulator ran on its built-in PGlite database.
- Known limits: the audit table is append-only only because the connector exposes no update or delete (add a database trigger later), and Firebase Auth and Storage emulators were configured but not started yet (Step B and D use them).

## Step B: Real sign-in and permissions

1. Add dependencies `firebase`, `firebase-admin` and `server-only`. Create `src/server/firebase-admin.ts`, which connects to emulators only when `FIREBASE_AUTH_EMULATOR_HOST` is set.
2. Session routes: `POST` and `DELETE /api/v1/session`. The first exchanges a Firebase ID token for an `httpOnly`, `Secure`, `SameSite=Strict` session cookie and checks the `Origin` header against cross-site requests. Sessions are checked with `verifySessionCookie(cookie, true)`, which rejects expired and revoked sessions.
3. `src/server/auth/current-actor.ts` resolves cookie, Firebase UID, `StaffAccount` (must be active), roles, then member and branch. It builds the existing `DevIdentity` shape and feeds the existing `hasOperationPermission`, `getVisibleMemberIds` and `getVisibleCustomerIds`. The rules are reused, not rewritten. `resolveEffectiveModules` (`src/data/mock/authorization.ts`) takes a store slice, so the server loads that slice from the database. A Firebase user without an active staff account gets no permissions.
4. `src/proxy.ts` only redirects `/admin` visitors who have no session cookie. Every handler still performs the real check.
5. In `api` mode, `login-form.tsx` signs in through the Auth emulator and calls the session route. `DevIdentityProvider` is used only in `mock` mode. Keep `clearProtectedQueries` on sign-in and sign-out.
6. The seed also creates Auth-emulator users for the synthetic accounts in `src/data/mock/mock-credentials.ts`. The test password stays in that seed file.

**Verify** (Vitest against emulators): an allowed user succeeds, a wrong role gets 403, an out-of-scope record is hidden, a disabled account and a role change take effect on the next request, an expired or revoked session gets 401, and audit entries contain no tokens.

**Step B status: Verified on 2026-11-24** (Auth emulator and SQL Connect emulator 3.4.28, project `demo-afhomes`, starting revision `4a64b44`).

- `src/server/auth/session.test.ts` passed 11 of 11 against the emulators (`npm run emulators`, `npm run db:seed`, then `npx vitest run src/server`). It skips itself when the emulators are down. Cases: allowed Administrator gets an `HttpOnly`, `Secure`, `SameSite=Strict` cookie; a foreign or missing `Origin` is refused; the wrong sign-in page and a deactivated account get 403 with no cookie; a Firebase user with no linked account gets no session; garbage and missing cookies are 401; a status change and a role change apply on the very next request; sign-out revokes the session; record scope (Administrator all 15 members, OST self only, SVD a downline) and operation checks (`finance.verify` denied to OST and Clerk, allowed to Finance); direct calls to `NO_ACCESS` operations are denied; audit events hold no tokens or passwords.
- Browser check (production build in api mode on port 3100): `/admin` without a session redirected to `/login?next=/admin`; the sample Administrator signed in and reached the dashboard; `document.cookie` could not read the session; sign-out returned 401 afterwards; a wrong password showed "Invalid email or password."
- `npx tsc --noEmit`, ESLint on `src` and the scripts, the architecture check and `npm run build` passed. Mock-mode login tests (10) still pass.
- Revocation is stamped in whole seconds, so a session revoked within the same second it was created is not rejected. The test waits 1.1 seconds. This does not matter for real sign-outs.

How to run api mode locally: `npm run emulators` (leave it running), `npm run db:seed`, then `npm run dev:api`. Next allows only one `next dev` per project folder, so stop any other dev server first. To check api mode beside a running dev server, use `node scripts/dev-api.mjs build`, then the `api-preview` entry in `.claude/launch.json` (port 3100), and run a normal `npm run build` afterwards so `.next` returns to sample mode.

Decisions and limits taken in Step B:

- **Java:** the Storage emulator needs Java, so `npm run emulators` starts only Auth and the database. Add Java and the Storage emulator in Step D.
- **Database access:** the server calls SQL Connect with raw GraphQL through the Admin SDK (`src/server/db.ts`). Move to generated bindings when Step C adds the pilot operations.
- **Permissions:** module and operation grants come from system roles only. Department-role grants need the staff and department tables, which are outside the pilot schema.
- **Session length:** 12 hours for local work. Production session length stays an open owner decision.
- **Screens:** in api mode the identity comes from the server, but the existing screens still read the sample store until Step D.
- **Mock login:** left in place as the default. Its "Better Auth" shortcut comments are unchanged.

## Step C: API and services for the pilot

1. Route handlers under `src/app/api/v1/`: `customers` (list, create draft, submit, approve), `contracts` (prepare, submit, finalize), `payments` (submit, verify) and `reports/collections`. A handler parses with Zod, gets the actor, calls a service and maps the result. Zod schemas sit beside the existing contract types.
2. Services live in `src/modules/<feature>/application/`, the path `scripts/check-architecture.mjs` allows. They reuse the pure rules: `src/modules/customers/customer-number.ts`, `buildVipNumber` (`src/modules/membership/rules.ts`), `src/modules/finance/payment-reference.ts`, and the permission and scope helpers. Server repositories in `src/server/repositories/` call the generated connector and convert money and dates.
3. **Receipt approval** is one transactional SQL Connect mutation: a guarded status change that applies only while the receipt is `submitted`; official-number allocation from `NumberSequence`; the linked effects the mock applies in `src/data/mock/business-effects.ts` (sale counting at 25% and VIP Number issuance); and the audit entry. A forced failure leaves nothing behind.
4. Every write requires an `Idempotency-Key` header recorded in `IdempotencyRecord`, unique per key, user and operation. A repeat with the same payload returns the first result. The same key with a different payload returns 409.
5. Error shape: `{ error: { code, message, fields?, correlationId } }` with 400, 401, 403, 404, 409 and 422. Never return stack traces or raw SQL Connect errors.
6. The collections report reads approved receipts by verified Manila business date, using the same totals as the export.

**Verify:** direct API calls with good and bad input, no session and a bad session, a restricted record, a repeated approval (exactly one effect), a forced rollback, and the approved receipt counted once in collections.

## Step D: Connect the existing screens

1. Add `src/data/http/` with HTTP repositories for Customer, Contract, Payment and Report. They implement the same contracts, send the idempotency key, and map API errors to the errors the screens already handle (for example `CustomerValidationError`).
2. `useMockRepositories` picks mock or HTTP by `NEXT_PUBLIC_DATA_MODE`. In `api` mode, repositories outside the pilot throw a clear "not connected yet" error so those screens show their normal error state and never mix in sample data.
3. Receipt evidence upload goes through the Storage emulator, private, with server-checked type and size, if the current receipt screen needs evidence. Confirm at build time and report.

**Verify:** in the browser (api mode), sign in, create a customer, prepare a contract, submit and approve a receipt, and check the collections report. A refresh keeps the data. In mock mode a refresh still resets it. A second staff account cannot open the receipt file.

**Step D status (2026-11-25):** the read endpoints, HTTP repositories, repository mode switch, server access snapshot and private receipt-file storage are built and verified; the receipt submission, verification, evidence preview and Finance collections were exercised in api mode. The server suite passes 35 of 35. See the status block in the [delivery plan](../delivery-plan.md) section 3 for evidence and limits.

## Checks for every step

Run targeted Vitest first, then `npx tsc --noEmit`, `npm run lint` (includes the architecture check) and `npm run build`. Mock-mode suites that the change touches must still pass. Report in the [AGENTS.md](../../../../AGENTS.md) section 9 format.

## Out of scope

Staging, Vercel, hosting, billing, any real Firebase project, modules other than the pilot, production or imported data, Supabase data, and Git writes.

## Risks and open items

- **Money storage:** resolved. Whole centavos in `Int64` (see Owner decisions).
- **Transaction strength:** the guarded receipt approval may be hard to express inside one SQL Connect mutation. If it cannot be guaranteed locally, stop and report. This is the roadmap's open check (`decisions-and-gaps.md`, Firebase stack transition).
- **Rule conflict:** UI20 in `decisions-and-gaps.md` allows 1 to 36 Non-Standard monthly payments, while `docs/business-rules/05-vip-products-and-contracts.md` (amended 2026-11-24) allows 1 to 12. The pilot uses standard tiers only. The owner should settle this before contract endpoints cover Non-Standard.
- **Stale comments:** the mock-login shortcut comments still name Better Auth. Update them when the mock login is switched off in `api` mode. Do not delete the files, because mock mode stays the default.
- **Tools:** the Firebase CLI is not installed yet. Java is installed only if the emulators ask for it.
