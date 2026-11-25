# Delivery Plan

[Roadmap](README.md) · [Full-stack phase plan](full-stack-phase-plan.md) · Written 2026-11-25 · Status: **Planned, not authorized**

This is the detailed plan for everything still to build after the verified localhost pilot (Steps A to C). It does not authorize any work. Each numbered step needs separate owner approval under [AGENTS.md](../../../AGENTS.md) section 7. It follows the [pilot implementation plan](01-localhost/pilot-implementation-plan.md), which records what was built and verified.

## 1. Where we are

Verified on the local emulators (starting revision `4a64b44`):

| Done | What exists | Evidence |
| --- | --- | --- |
| Step A | Pilot database (`dataconnect/`), emulator setup, repeatable seed (`npm run db:seed`), whole-centavo money | Pilot plan, Step A status |
| Step B | Firebase sign-in, server session cookie, fresh roles and status on every request, record scope, `/admin` redirect | 11 emulator tests, browser check |
| Step C | Eleven `/api/v1` routes for customer, contract, sale, receipt and collections, all-or-nothing receipt approval | 22 emulator tests, real HTTP check |

Not done: the screens still read sample data in api mode (Step D), and every module outside the pilot (section 4).

Where the code lives:

| Area | Path |
| --- | --- |
| Database schema, emulator config | `dataconnect/`, `firebase.json`, `storage.rules` |
| Server code (Admin SDK, sign-in, audit, services, idempotency) | `src/server/` |
| Route Handlers | `src/app/api/v1/` |
| Browser sign-in, mode switch, session identity | `src/shared/lib/`, `src/shared/providers/session-identity-provider.tsx` |
| Seed and local scripts | `scripts/seed-local-db.ts`, `scripts/dev-api.mjs`, `scripts/api-local.env` |

Daily commands: `npm run emulators` (leave running), `npm run db:seed`, `npm run dev:api` (needs no other `next dev` in the folder), `npx vitest run src/server`.

## 2. Rules every step follows

These came out of Steps A to C. Each module step applies them without re-deciding.

1. **Money** is whole centavos in `Int64` columns named `*Centavos`. Never floats. Convert only at the edge with `src/server/money.ts`. Values inside a jsonb `details` column stay safe-integer numbers.
2. **Dates**: business days are `Date` columns (Asia/Manila). Action times are `Timestamp`. Use `manilaToday()` and `manilaDateOf()`.
3. **IDs**: internal UUIDs (32 hex digits, no hyphens). Official numbers are separate unique columns. Allocate a number by reading the next free one and inserting under a unique index, then retry on a collision. No counter table.
4. **One transaction per business change.** Use `transact()` in `src/server/services/common.ts`: the mutation fields and every audit entry commit together. Put all `@check` guards in one `query @redact { ... }` block at the end; any failure rolls back everything. Name each guard with a distinctive marker and map it to an `ApiError` through `markers`.
5. **Concurrency** uses the version guard: read a version, then `updateMany(where: id and version)` with `collectionVersion_update: { inc: 1 }`, and check `response.<alias> == 1`. On a stale read, read again and decide again (maximum 3 tries), then return 409. Per-record guards use a status condition in the same way.
6. **Duplicates**: every write needs an `Idempotency-Key` and goes through `route()` and `runIdempotent()`. Same key and body replays the first answer. A new key on an already-decided record returns 409 without a second effect.
7. **Complete lists** use `listAll()` in `src/server/db.ts`. SQL Connect returns at most 100 rows from an unbounded list and drops the rest without any error. Never write a raw list query where completeness matters.
8. **Authorization**: `requireActor` then `requireOperation(actor, operation)` then record scope (`getVisibleMemberIds`, `canSeeContractRecord`, `getVisibleCustomerIds`). A record the person may not see is reported as 404, not 403. Reuse the grant tables in `src/modules/identity/permissions.ts`; never copy them.
9. **Errors**: only `ApiError` messages reach the caller, in the shape `{ error: { code, message, fields?, correlationId } }`. Next.js control-flow errors are re-thrown by `errorResponse`.
10. **Audit**: one entry per change, with the action names from `BUSINESS_AUDIT_ACTIONS`. Details never hold tokens, credentials, government IDs or personal data.
11. **Reuse the pure rules** in `src/modules/*` unchanged. If a rule is trapped inside a mock repository, extract it into `src/modules/` and make the mock call it (as done for `apply-input.ts` and `canSeeContractRecord`) so the screens and the server stay identical.
12. **Mock mode stays the default** and its tests keep passing. A module is not "connected" until its screen works in api mode and in mock mode.
13. **Tests** for each module: emulator tests in `src/server/` (flow, rollback, repeat, simultaneous requests, role and scope blocks), plus the touched sample-mode suites. Emulator tests skip themselves when the emulators are down.
14. **Reporting**: each step ends with the section 9 report in [AGENTS.md](../../../AGENTS.md) and the plan document updated with a status block (revision, environment, commands, actual results, limits).

## 3. Step D: connect the pilot screens

Goal: the customer, contract, sale, receipt and collections screens work against the real local backend, with files in private storage.

**Prerequisites:** Steps A to C verified. Install Java 21 for the Storage emulator and add `storage` back to `npm run emulators` (`firebase.json` already has the rules file).

**Step D status (2026-11-25, revision `8c62a31` plus uncommitted D work): built and locally verified.** D1 adds the read endpoints for contracts, payments, sales and customers (plus members, products and payment schemes for the pilot screens); 7 emulator tests pass. D2 adds `src/data/http/`, the `DATA_MODE` repository switch, the not-connected proxy, 422 field mapping, the session-expired event and the audited `POST /reports/export`; 2 emulator tests pass. D3 adds `modules` and `operations` to `GET`/`POST /session`, reads them from the access snapshot in api mode, and shows the sign-in page for an expired session instead of a 403.
D4 is built with Java 21 and the Storage emulator: receipt files are JPEG, PNG or PDF up to 5 MB, checked by their bytes, stored privately under `payments/{paymentId}/{uuid}`, downloaded only after the same record-scope check as the receipt, audited, and replaced atomically with the payment details. Verification now preserves the file pointer (a regression test covers it). A seller outside the payment's team receives 404 for both the receipt and its file.
D5 was exercised in api mode: a receipt with a file was submitted, verified, previewed from the private address, and appeared in Finance collections; Finance could open the file and the out-of-scope seller could not. The server suite passes 35 of 35 (seven files, twice in a row). Not repeated through the UI: customer and contract creation (covered by the pilot API tests), and the mock-mode reset check. One transient full-suite failure in the read-endpoint file was not reproduced.

Limits: the list endpoints read complete tables and then apply record scope and paging in memory; add indexed database filters when the pilot data grows. The Reports other than Summary/Collections depend on modules that are still outside the pilot, so their figures read "Unavailable" in api mode. The contract detail page shows a membership notice because that module is outside the pilot.

### D1. Read endpoints
The screens need views the pilot did not build. Add them as `GET` routes using `route({ write: false })`:

| Route | Returns | Reuse |
| --- | --- | --- |
| `GET /contracts`, `GET /contracts/{id}` | Contract with customer name, seller name, linked sale, finalization holds | `finalizationHolds`, `canSeeContractRecord` |
| `GET /payments`, `GET /payments/{id}` | Payment with customer name, contract label, submitter name, `approvalBlocked`, `referenceConflict` | the mock `view` logic, extracted to a module first |
| `GET /sales`, `GET /sales/{id}` | Sale with customer, seller, scheme label | team-based visibility from the mock sale repository |
| `GET /customers/{id}` | One customer (restricted projection for downline) | `restrictCustomer` |

Page every list (`limit`, `after`). Do not load everything for a screen; add indexed filters (status, date range) where a screen filters.

### D2. HTTP repositories
1. Add `src/data/http/` with `HttpCustomerRepository`, `HttpContractRepository`, `HttpPaymentRepository`, `HttpSaleRepository` and `HttpReportRepository`. Each implements the existing contract in `src/data/contracts/` and sends an `Idempotency-Key` per user action (a stable key per form submission, so a double click reuses it).
2. Map API errors to what the screens already handle: 422 `fields` to `CustomerValidationError`, 409 to a message the existing confirm and notice dialogs show, 401 to the signed-out page, 403 to the 403 page.
3. `useMockRepositories` in `src/data/queries.ts` picks mock or HTTP by `DATA_MODE`. In api mode a repository outside the pilot throws "not connected yet", so those screens show their normal error state and never mix in sample data.
4. Keep query keys partitioned by identity and keep `clearProtectedQueries` on sign-in and sign-out.

### D3. Access snapshot and navigation in api mode
`useAccessSnapshot` and `AdminAuthGate` still read the mock store and `resolveEffectiveModules`. In api mode read modules and operations from the server: add `GET /api/v1/session` fields `modules` and `operations` computed by `getGrantedModuleIds` and `getGrantedOperations`, and have the gate use them. The sidebar then matches what the server will allow.

### D4. Receipt evidence in private storage
1. `POST /api/v1/payments/{id}/evidence` (multipart): server checks type (JPEG, PNG, PDF), size, and that the actor may see the payment, then writes to Storage under `payments/{paymentId}/{uuid}` through the Admin SDK. Metadata (name, size, content type, uploader, time) goes in `details`. Do not trust the browser file name.
2. `GET /api/v1/payments/{id}/evidence/{fileId}` streams the file after the same checks. No public URLs. Storage rules stay deny-all for clients.
3. Same pattern later for the government ID image and profile photo (group 3) and signed documents. Build the upload service once in `src/server/storage.ts`.
4. Add a short-lived "signed" download only if streaming proves too slow, and only with owner approval.

### D5. Verify
- Complete the pilot once through the UI and once through the API in api mode.
- A refresh keeps api-mode records and resets mock-mode records.
- A second staff account cannot open the receipt file; a seller from another branch gets 404.
- Run the touched screen test suites, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and a browser pass over loading, empty, error and retry states.
- Record results in the pilot plan under Step D.

**Size and configuration:** large (many screens). Sonnet 5.5, high effort, split into D1, D2+D3, D4 sessions.

## 4. Local module plan (roadmap guide 05)

Order follows the [feature checklists](../01-prototype/features/) and dependency. Each group lists what to add, not what exists. Read the linked business rule documents before starting a group, and confirm each repository contract's method list in `src/data/contracts/`. Endpoint names below are proposals that mirror those methods.

Common to every group: schema additions with unique constraints and foreign keys, server repositories and services, `/api/v1` routes with Zod, HTTP repository, screen connected, seed extended from `buildSeed`, emulator tests, status block in the pilot plan.

### Group 1: Organization, staff, roles, sign-in ([FP1](../01-prototype/features/01-organization-and-access.md), [FP2](../01-prototype/features/02-public-entry-and-sign-in.md), [doc 01](../../business-rules/01-roles-and-permissions.md))
- **Add:** `Department`, `DepartmentRole` (with delegable module grants), `StaffMember` (linked to `UserAccount`), account status history, temporary-password flow replaced by Firebase password reset.
- **Server:** replace system-roles-only grants in `src/server/auth/actor.ts` with `resolveEffectiveModules` (department role reached through staff, role and department; none when the account is not Active). Last-Super-Admin protection and `assertCanDelegate` rules move into services. Role and access changes audited.
- **Routes:** accounts, departments, roles, staff (create, edit, status), password reset request.
- **Decide first:** MFA policy for privileged roles, password-recovery provider, session length, Super Administrator delegation and export authority ([security guide](../../development/security.md) leftovers).
- **Risk:** this changes every permission check; add tests that pin the grant tables before touching them.
- **Size:** large. Opus 5.5, high.

### Group 2: Sales network and accreditation ([FP3](../01-prototype/features/03-sales-network-and-accreditation.md), [doc 02](../../business-rules/02-sales-network-and-genealogy.md), [doc 03](../../business-rules/03-ist-ost-accreditation.md))
- **Add:** `Accreditation`, `RegistrationApplication`, `SeatVacancy`, effective-dated status and transfer history on `Member`.
- **Server:** cycle prevention and sponsor validation as a guarded write (check the whole chain inside the transaction), AA number allocation (unique and retry, renewal issues a new number), real `evaluateSaleParties` replacing the pilot shortcut in customer submit, customer approval and contract submit.
- **Routes:** members (create, edit, transfer, status), accreditation (issue, renew, suspend, end), registration applications (submit, approve, reject), public verification by exact identifier with restricted fields (no "Valid Until" shown publicly).
- **Performance:** seller trees reach 14,000 people. Replace `loadScopeMembers` (loads all) with a bounded subtree query, and cache the visible set per request.
- **Size:** large. Opus 5.5, high.

### Group 3: Customer applications and record access ([FP4](../01-prototype/features/04-customer-applications.md), [doc 04](../../business-rules/04-customer-management.md))
- **Add:** status history table, import job and row tables, government ID and profile photo through the Step D storage service.
- **Routes still missing:** update draft, discard draft, send back, reject, correct (with reason), import (validate, confirm, history), audited export (5,000-row cap, row count only in audit), customer lookup for staff.
- **Replace pilot shortcuts:** the "load all customers" duplicate check and number allocation with an indexed query on normalized name and date of birth, and the highest `YYYY-NNNN` per year.
- **Rules to keep:** the customer identity and the VIP Number are distinct; drafts never consume the Customer ID; no public customer or card lookup.
- **Size:** medium to large. Sonnet 5.5, high.

### Group 4: Products, contracts, sales, IGP ([FP5](../01-prototype/features/05-products-contracts-and-sales.md), [doc 05](../../business-rules/05-vip-products-and-contracts.md), [doc 14](../../business-rules/14-igp-sales.md))
- **Add:** product, payment scheme and tier level tables with versioned configuration (finalized contracts never rewrite), reference lists and outlets; IGP project, sale and catalog tables.
- **Move the catalog** from the sample constants to these tables, with Admin screens for products, schemes and tier codes.
- **Routes still missing:** update contract, return, cancel, request and decide cancellation (two steps with forfeiture), Non-Standard contracts (two approvals), reject sale, correct sale commission, IGP enter, approve, sign documents, cancel.
- **Decide first:** Non-Standard monthly payments 1 to 36 ([decision register UI20](../decisions-and-gaps.md)) against 1 to 12 ([doc 05](../../business-rules/05-vip-products-and-contracts.md), amended 2026-11-24). Do not build Non-Standard until settled.
- **VIP Number issuance** (`YYMMDDNNNNNVTPMMS`, one number for the Reservation Agreement, Grant and Card) needs an approved sale, a recorded signed agreement, the first scheduled payment paid, and frozen commission rates. Build it at the start of group 6, because the rates come from there. Use unique index and retry, a monthly sequence per `YYMM`, and a blocker message on the contract when terms or rates need correction (as the sample code does).
- **Size:** large. Opus 5.5, high.

### Group 5: Payments, adjustments, cancellations, holds ([FP6](../01-prototype/features/06-payments-and-verification.md), [FP7](../01-prototype/features/07-adjustments-cancellations-and-holds.md), [doc 07](../../business-rules/07-finance-and-payments.md))
- **Add:** `ClosedMonth`, unmatched receipts, payment adjustments as an insert-only table (move them out of `details`), receipt import batches, financial hold flag, bank reference list.
- **Routes still missing:** reject, return for correction, resubmit, adjust (reversal, refund; Reservation Fee is non-refundable), unmatched receipt intake, match and reject, bank choice, close month, re-open rules.
- **Replace pilot shortcuts:** `countedDate` uses `firstOpenDate(closedMonths, ...)`; reinstate a defaulted sale on a verified receipt; reversal can drop a Confirmed sale back to Pending with a negative adjustment and trigger commission and membership holds. Port the whole of `reconcileContractState` ([reconcile-contract.ts](../../../src/modules/finance/application/reconcile-contract.ts)) through a server ports adapter, in the same transaction.
- **Races to test:** reversal and approval together, two reversals, close month while an approval runs (guard on the closed-month row).
- **Move evidence** to the storage service if not already done.
- **Size:** large, highest risk. Opus 5.5, high; consider xhigh only if concurrency tests keep failing.

### Group 6: Commissions, allowances, payouts ([FP8](../01-prototype/features/08-commissions-and-payouts.md), [doc 08](../../business-rules/08-commission-management.md))
- **Add:** commission rate settings, VIP position rates, commissions, clawbacks, payout lists, allowance reviews.
- **First:** commission rate freezing and VIP Number issuance (see group 4), then release at 40% collected, month-end payout lists (the release month must be closed), clawback offset after the signed addendum date, approval versus confirmed disbursement ("approved" is not "Paid").
- **Races to test:** duplicate payout, release while a reversal runs, clawback twice.
- **Decide first:** open allowance questions G3 and G4 and the G5 process checks listed in the decision register. Legal should confirm the clawback addendum before real payouts.
- **Size:** large. Opus 5.5, high.

### Group 7: Membership, cards, Stay Points ([FP9](../01-prototype/features/09-membership-and-cards.md), [FP10](../01-prototype/features/10-stay-points-and-services.md), [doc 09](../../business-rules/09-vip-membership-and-stay-points.md), [doc 10](../../business-rules/10-redemption.md))
- **Add:** membership, member QR holders, Stay Points ledger and resort spend, promos and promo points, experiences, outlets, restaurant reservations; redemption prototype tables.
- **Server:** membership created when a finalized contract is fully settled (inside the receipt transaction), activation approval (receipt approval never activates), ledger-controlled points under the signed Grant's yearly tranches, idempotent credits (unique key per source event), financial hold effects.
- **Boundaries:** keep the staff QR and Stay Points prototype available; live Redemption, Services and the Customer Portal need separate approval.
- **Size:** large. Opus 5.5, high.

### Group 8: Reporting, audit review, reconciliation, close ([FP11](../01-prototype/features/11-reports-audit-and-close.md), [docs 11, 12, 13](../../business-rules/11-reports-and-analytics.md))
- **Add:** reconciliation entries and month-switch sign-offs (insert-only), report export records.
- **Routes:** audit read with filters and paging (`AuditRepository.list`), audited report exports, sales performance, reconciliation decisions, period close and sign-off. The collections report from Step C extends here (permissions as defined in [doc 11](../../business-rules/11-reports-and-analytics.md); today only Super Administrator and Finance hold `finance.reports.view`, so confirm that is intended).
- **Make the audit log truly append-only** in the database (a trigger or revoked privileges through a Cloud SQL migration), not only by exposing insert operations.
- **Performance:** reports aggregate in the database, not in the server over all rows. Use indexed date filters and pre-aggregated totals where a report is slow.
- **Size:** medium to large. Sonnet 5.5, high.

## 5. Cross-cutting work

| Item | When | Notes |
| --- | --- | --- |
| Generated connector bindings | With group 1 | Move raw GraphQL strings into connector operations and generate typed server bindings. Needs a Google credential for `dataconnect:compile`; do it in staging if it cannot run offline. |
| Append-only audit in the database | Group 8, rehearsed in staging | See above. |
| Bounded queries | Each group | Replace every "load all" shortcut listed in the pilot plan. |
| Rate limiting and lockout | Group 1 or staging | Sign-in and password reset. CAPTCHA provider is an open owner decision. |
| Background work (emails, scheduled releases) | When a group needs it | Keep external side effects out of retryable transaction callbacks. Use an outbox table written in the same transaction. |
| Retention and privacy | Before production | A working ten-year schedule exists; Legal and the Data Protection Officer may replace it. |
| Observability | Staging | Structured logs with the `correlationId`; no personal data in logs. |
| Stale comments | Group 1 | Update the "Better Auth" shortcut comments when the mock login is retired from the default path. |

## 6. Local verification (roadmap guide 06)

After group 8, follow [guide 06](01-localhost/06-local-verification.md) and add:
1. Recreate emulators and seed from clean; run all emulator suites in parallel and then three times in a row.
2. Run the whole test suite (`npm test`) and settle the four known sample-mode failures first (department and account delegation tests, a date-dependent VIP Number test, a sale-confirmation date test); decide which are test bugs and fix or update them.
3. Verify every unbounded list is paged and every list that must be complete uses `listAll`.
4. Record a one-page evidence table per group: revision, commands, results, open items.

## 7. Staging plan ([staging guides](02-staging/README.md))

Needs owner approval for project setup, trial provisioning, billing and deployment. Use synthetic data only.

1. **Prototype demo (optional).** Vercel preview in mock mode (default). No backend.
2. **Project and database trial.** New test-only Firebase project; Spark trial; deploy the schema from `dataconnect/`; seed.
3. **Hosted proofs.** Re-run the Step C checks on real hosted PostgreSQL: the version guard under real concurrency, `@check` rollback, `@transaction` behavior, the 100-row list cap and paging, unique-index retries, idempotency under simultaneous requests. If any guarantee cannot be shown, raise an architecture decision (the open check in the [decision register](../decisions-and-gaps.md)).
4. **Auth.** Real Firebase Auth with test accounts, session cookie settings (secure, same-site), authorized domains, MFA for privileged roles if decided, password reset email delivery.
5. **Storage.** Private Cloud Storage bucket, server-only access, upload limits, the download checks from Step D.
6. **Hosting.** Firebase App Hosting for the current Next.js build; Cloud Run in the same project is the fallback. Verify cookies, `proxy.ts`, route handlers, environment variables and cold start. Region, domain, sizing and cost need owner decisions.
7. **Release rehearsal.** Deploy the full approved scope, run an import rehearsal with a sanitized set, test backup and restore, and write the sign-off.

## 8. Production plan ([production guides](03-production/README.md))

Needs owner approval for provisioning, billing, import execution and launch.

1. Company-owned production Firebase project, Blaze billing with budget alerts, separate secrets and identities.
2. Reviewed schema deployed through the same migration path rehearsed in staging; backups and point-in-time recovery on.
3. Approved staff accounts created by the owner; server credentials held only by the hosting service.
4. Approved imports with totals, checks and a recovery plan; rehearsed in staging first. Never migrate records from the earlier Supabase system automatically.
5. One launch of all approved modules from the same checked build. Redemption, Services and the Customer Portal stay behind their own approvals.
6. Monitoring, backup restore drill and a short operations guide for the people who will maintain it.

## 9. Open decisions (owner)

| Decision | Blocks | Recommended by |
| --- | --- | --- |
| Non-Standard monthly payments: 1 to 36 or 1 to 12 | Group 4 Non-Standard | Settle before group 4 |
| Session length for production | Staging auth | Settle before staging |
| MFA policy for privileged roles | Group 1, staging | Settle before group 1 |
| Password-recovery provider and CAPTCHA provider | Group 1 | Settle before group 1 |
| Who may read the collections report (Administrator today cannot) | Group 8 | Confirm with doc 11 |
| Commission rate setup and allowance questions G3, G4, G5 | Groups 4 and 6 | Settle before group 6 |
| Legal confirmation of the clawback addendum | Real payouts | Before production |
| Production region, domain, sizing, cost, recovery settings | Staging hosting, production | Before staging step 6 |
| Retention schedule and public privacy policy wording | Production | Legal and DPO review |
| Whether Administrator may approve receipts they entered (already decided: yes, flagged) | None | Done |

## 10. Order, approvals and configuration

| Step | Needs approval for | Model, effort | Sessions |
| --- | --- | --- | --- |
| D (connect screens, storage) | Work, Java install | Sonnet 5.5, high | 3 |
| Group 1 | Work, decisions above | Opus 5.5, high | 2 |
| Group 2 | Work | Opus 5.5, high | 2 |
| Group 3 | Work | Sonnet 5.5, high | 2 |
| Group 4 | Work, Non-Standard decision | Opus 5.5, high | 3 |
| Group 5 | Work | Opus 5.5, high | 3 |
| Group 6 (with VIP Number issuance) | Work, commission decisions | Opus 5.5, high | 3 |
| Group 7 | Work | Opus 5.5, high | 3 |
| Group 8 | Work | Sonnet 5.5, high | 2 |
| Local verification | Work | Sonnet 5.5, medium | 1 |
| Staging | Provisioning, billing, deployment | Sonnet 5.5, high | 3 |
| Production | Provisioning, billing, imports, launch | Opus 5.5, high | 3 |

The session counts are estimates. A group may split further when its rules turn out larger than expected. Stop and report when scope or risk grows, as in Step C. Ultracode stays off unless the owner opts in.
