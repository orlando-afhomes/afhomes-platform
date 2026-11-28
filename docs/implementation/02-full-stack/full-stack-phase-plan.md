# Full-Stack Phase Plan

[Delivery plan](delivery-plan.md) · [Pilot plan](01-localhost/pilot-implementation-plan.md) · [Roadmap](README.md) · Written 2026-11-25 · Status: **Planned, not authorized**

This is the phase-by-phase execution plan for the branch split and the move to the clean full-stack application: no sample data on screen, no mock repositories in the runtime, and the confirmed business data seeded in the database. It does not authorize any work. Each phase needs separate owner approval under [AGENTS.md](../../../AGENTS.md) section 7, and the owner performs every Git branch, commit and push operation.

## 1. Branch model

| Branch | Base | Purpose |
| --- | --- | --- |
| `prototype` | commit `4a64b44` | Frozen frontend-only snapshot: browser sample data, mock login, dev identity switching, no `src/server`, no `/api/v1`, no Firebase or Data Connect. Stakeholder demo only. It is never merged and receives no new work. |
| `develop` | — | Stays at the verified localhost pilot state (Steps A to C plus the committed Step D work). |
| `full-stack` | `develop` after the Step D commit | The real application. All future work happens here and ends with no mock data and no static catalogs. |

Owner steps, in order:

1. Commit the current uncommitted Step D work on `develop` (read endpoints, HTTP repositories, evidence storage, access snapshot, docs). It belongs to `full-stack`.
2. Create `prototype` at `4a64b44`.
3. Create `full-stack` at the new `develop` tip.
4. Switch to `full-stack` for all work from F0 onward.

Agents never create branches, switch branches, commit, push or merge. They work only in the branch the owner has checked out, and each phase ends with the owner's commit.

## 2. Seed model

| Command | Contents | Use |
| --- | --- | --- |
| `db:seed` | True data only: one Super Admin, the confirmed reference data, no synthetic business records; clears the local tables first | Manual start-up and owner walkthroughs |
| `db:seed:fixtures` | Synthetic pilot records: 17 accounts, 15 members, 40 customers, 28 contracts, sales, receipts and the other sample records; clears the local tables first | Required by the server and screen test suites |
| `db:seed:clean` | True data only, same as `db:seed`; deletes the private receipt files | Explicit clean reset |
| `db:seed:clean --dry` | Prints the clean counts without writing | Planning and confirmation |

Reference data is configuration, not sample business records, so it is present in the clean seed. It is reviewed by the owner against the business rules before use. The clean seed still starts with one account only; the reference rows do not add a seller, staff member or any operational record.

Safety stays as built: only `127.0.0.1`/`localhost` hosts and `demo-` projects, never staging or production.

## 3. Rules every phase follows

1. One phase, one owner authorization, one owner commit.
2. Order inside a phase: schema and migrations, repositories and services, `/api/v1` routes with Zod, HTTP repository, connected screens, emulator tests, touched screen tests, status block.
3. Mock repositories and sample records stay until F9. Until then, mock mode keeps working for unconnected screens; api mode must never mix in sample data.
4. Reuse the pure rules in `src/modules/*`. If a rule is trapped in a mock repository, extract it so the screen and server share it, as with `apply-input.ts` and `canSeeContractRecord`.
5. Money is whole centavos; business dates are Asia/Manila; official numbers are allocated under unique indexes with retry; one transaction per business change; every write carries an `Idempotency-Key`.
6. Complete lists use `listAll()`; lists a screen pages use `limit`/`after`. Replace "load all" shortcuts with bounded queries.
7. Authorization is server-side: `requireActor`, `requireOperation` or `requireModule`, then record scope. A record the person may not see is 404.
8. Tests: emulator tests for the flow, rollback, repeat, simultaneous requests, roles and scope, plus the touched screen suites. Skipped automatically when the emulators are down.
9. Each phase ends with the [AGENTS.md](../../../AGENTS.md) section 9 report and a status block here: revision, environment, commands, actual results, limits, next approval.

## 4. Phase index

| Phase | Group | Outcome | Size, model | Gate |
| --- | --- | --- | --- | --- |
| F0 | Reference data | Confirmed catalogs and templates live in the database; clean seed and fixture seed | Medium, Sonnet 5.5 high | Owner sign-off on seeded rows |
| F1 | Group 1 | Organization, staff, roles, accounts; Super Admin creates the Admin | Large, Opus 5.5 high | MFA, session, recovery, CAPTCHA, delegation decisions |
| F2 | Group 2 | Sales network and accreditation | Large, Opus 5.5 high | F1 |
| F3 | Group 3 | Customer applications, imports, exports, ID files | Medium-large, Sonnet 5.5 high | F2 for attribution |
| F4 | Group 4 | Products, contracts, sales, IGP | Large, Opus 5.5 high | Non-Standard 1–36 vs 1–12 |
| F5 | Group 5 | Payments, adjustments, cancellations, holds | Large, highest risk, Opus 5.5 high | F4 |
| F6 | Group 6 | Commissions, allowances, payouts | Large, Opus 5.5 high | F5; G3/G4/G5 and legal clawback |
| F7 | Group 7 | Membership, cards, Stay Points, redemptions, experiences | Large, Opus 5.5 high | F5/F6 |
| F8 | Group 8 | Reports, audit review, reconciliation, close | Medium-large, Sonnet 5.5 high | F7 |
| F9 | Cleanup | No mock layer, api-only, full local verification | Medium, Sonnet 5.5 high | F1–F8 verified |

## 5. F0 — Reference data and seed foundation

**Goal:** the confirmed business configuration is read from the database, and the clean seed can start a real, empty workflow.

**Schema additions:** `Product`, `PaymentScheme`, `TierLevel`, `Experience`, `Outlet`, `ReferenceEntry` (banks, government ID types, acquisition channels and other confirmed lists) and `PrintTemplate` (Reservation Agreement, VIP Grant, VIP card). Version or effective-date columns where the confirmed rule requires them; unique keys on codes; foreign keys to parent configuration.

**Confirmed rows to seed** (owner sign-off against the linked document before use):

- Products and prices: Bronze B1, Silver S1, Gold G1, [doc 05](../../business-rules/05-vip-products-and-contracts.md).
- Payment schemes and reservation terms, docs 05 and 07.
- Tier levels and non-active tier codes, docs 05 and 06.
- VIP card template fields and print layout, docs 05 and 06.
- Printable Reservation Agreement and VIP Grant templates, docs 05 and 06.
- Experiences and outlets, the owner-confirmed module data.
- Reference lists: only values confirmed in the business rules, not sample values.
- Points-per-night table and holiday calendar, docs 09 and 10 (owner-confirmed 2026-11-22).
- Nothing from an open decision, and no retention/privacy wording that Legal or the DPO may still replace.

**Server:** replace `CATALOG` in `src/server/services/common.ts` and the static template text with repository reads. Cache the rows per request; no cross-request mutable cache. A missing template fails with a safe error instead of falling back to hard-coded text.

**Routes:** read-only `GET` for products, payment schemes, tier levels, experiences, outlets, reference lists and print templates, with the same authentication as the pilot. Editing screens and write routes belong to F4 and F7; F0 does not add admin CRUD.

**Screens:** the contract and customer forms read the seeded products and schemes. The VIP Products, Experiences and Settings pages may list the seeded rows read-only; editing stays "not connected" until its group. Printing reads the template rows.

**Seed:** add the reference rows to both seeds. `db:seed:clean` and `db:seed` create one Super Admin plus the reference rows; `db:seed:fixtures` adds the synthetic fixtures on top of the same reference rows.

**Tests:** emulator tests for the seeded counts and key fields, the product/scheme reads, template rendering, the clean seed (one account, reference rows, zero business records) and the fixture seed (tests unaffected). Unit tests for template rendering and missing-template errors.

**Exit:** a clean database has one account and the confirmed configuration; the pilot forms read configuration from the database; no static catalog or template text remains in server code; the owner signs off every seeded row and its source document.

**Risks:** template wording must match the signed documents; product codes and prices feed contracts, so a seed error changes pricing; reference rows must not silently encode an open decision.

**F0 status (2026-11-25):** the clean seed is implemented and verified. `db:seed:clean` creates one Super Admin, one `super_admin` role, zero members, customers, contracts, sales or receipts, and clears the private receipt files. The confirmed pricing catalog is in the database: 3 tier levels, 3 products and 4 payment schemes are loaded by both seeds; the server reads them through `src/server/repositories/catalog.ts`, and the static `CATALOG` constant is gone from the server. The fixture seed is unchanged for tests. A root-cause seed fix now stores contract and sale genealogy with the inserted member UUIDs instead of the sample member ids, so sellers can see their seeded records; `views.test.ts` covers it and the catalog. The server suite passes 35 of 35 immediately after a fresh fixture seed. Experiences (3), outlets (5) and reference lists (20 entries) are also seeded and read through `/api/v1/experiences`, `/api/v1/outlets` and `/api/v1/reference-lists`; the Experiences, Settings and customer forms read them in api mode. The printable-form and card registry is seeded (8 rows: the application form, three reservation agreements, three grants and the VIP card) and exposed through `/api/v1/print-templates`. The supplied PDF forms and the app-rendered card design stay as files: the database holds the confirmed key, name, revision and asset path, not the binary; moving the forms into private storage is a later storage task. The print builder still labels revisions from the shared registry constant until the print screen is wired to the row; that is a follow-up with the print UI, not a data gap.

## 6. F1 — Group 1: organization, staff, roles, accounts

**Goal:** the Super Admin creates the Admin, departments, roles and staff through the app.

**Schema:** `Department`, `DepartmentRole` with module grants, `StaffMember` linked to `UserAccount`, and account-status history. The temporary-password flow is replaced by Firebase password reset once the provider decision is made.

**Server:** replace the system-roles-only grants in `src/server/auth/actor.ts` with `resolveEffectiveModules` reached through staff, role and department; no grants when the account is not Active. Move last-Super-Admin protection and `assertCanDelegate` into services. Audit every role and access change. The session `modules` and `operations` must come from the resolved grants.

**Routes:** accounts, departments, roles and staff (create, edit, status, assignment); password-reset request. Reuse the prototype's module checklist semantics: every module delegable, only modules the actor holds, parent navigation scopes never granted.

**Screens:** the Organization area (Staff, Departments, Roles) and the Staff Access compatibility route read the API; no sample rows.

**Decisions before start:** MFA policy for privileged roles, production session length, password-recovery provider, CAPTCHA provider, Super Administrator delegation and export authority.

**Tests:** pin the existing grant tables before changing them; emulator tests for CRUD, delegation limits, last-Super-Admin protection, status changes taking effect on the next request, record scope and audit; the touched Organization screen suites.

**Exit:** from `db:seed:clean`, the Super Admin creates an Administrator account, a department, a role and a staff member; the new Admin signs in and sees the modules granted to the role.

**Size and risk:** large; this changes every permission check. Opus 5.5, high.

**F1 status (2026-11-25):** F1 is built end to end. The schema has `Department`, `DepartmentRole`, `StaffMember` and `AccountStatusEvent`, plus `UserAccount.staff` and `UserAccount.createdBy`. The actor resolves department module grants only while the staff member, role and department are active; operations stay with system roles. New services and `/api/v1` routes cover departments, roles (including assignment options), staff (create/edit, pending-account provisioning, linked-account status) and accounts (create/edit, role assignment, status history, last-Super-Admin and protected-account guards, password-reset request). Every write is transactional with an audit entry. The Organization screens and Staff & Access read the API in api mode. Owner decisions recorded: MFA enforcement deferred with hooks, 8-hour production sessions, Firebase email password reset (the temporary-password flow is removed), CAPTCHA deferred to staging. The rich seed loads departments, delegable roles and staff linked to the office accounts; `db:seed:clean` stays one Super Admin. Verified: 43 server tests across 9 files, including the organization suite (create department, role and staff, activate the account, sign in and receive the department-role module), `npx tsc --noEmit`, `npm run lint` and `npm run build`. Not performed: a browser api-mode walkthrough of the same exit scenario, and real email delivery (the local Auth emulator returns the reset link).

## 7. F2 — Group 2: sales network and accreditation

**Goal:** the Admin builds the real sales network and the sellers can sign in.

**Schema:** `Accreditation`, `RegistrationApplication`, `SeatVacancy`, and effective-dated status and transfer history on `Member`.

**Server:** cycle prevention and sponsor validation as a guarded write that checks the whole chain inside the transaction; AA number allocation with a unique index and retry; a renewal issues a new AA number; real `evaluateSaleParties` replacing the pilot shortcut in customer submit, approval and contract submit; public verification by exact identifier with restricted fields and no "Valid Until".

**Routes:** members (create, edit, transfer, status), accreditation (issue, renew, suspend, end), registration applications (submit, approve, reject), public verification.

**Performance:** the tree reaches 14,000 sellers. Replace `loadScopeMembers` with a bounded subtree query and cache the visible set per request.

**Screens:** Members, Team Tree, Seller Applications and public verification; the existing filter, transfer and accreditation actions move to the API.

**Tests:** hierarchy cycles, sponsor validation, AA uniqueness and renewal, public field restrictions, record scope for SVD/SSM/SM/OST, the large-network fixture, audit.

**Exit:** from a clean seed, the Admin creates a seller and the seller can sign in (after F1) and be attributed to a customer.

**Size:** large. Opus 5.5, high.

**F2 status (2026-11-25):** F2 is built. The schema adds `Accreditation`, `AccreditationNumber` (the unique per-number ledger), `RegistrationApplication`, `SeatVacancy`, and `Member.parentHistory`/`rowVersion`. Server services and routes cover member create/edit/transfer/status, eligible parents, downline and history, referral checks, seat vacancies, accreditation issue/renew/status, scoped accreditation reads, public verification, and the full public OST application lifecycle (submit, correction link, complete, approve, return, reject). AA numbers are allocated through the unique ledger with bounded retry; the transfer write is row-version guarded, with the residual race window recorded for the staging transaction review. The rich seed loads 15 accreditations with 19 issued numbers, four applications and one vacancy; the clean seed stays one Super Admin. Verified: 49 server tests across 10 files (the 6-test F2 suite covers scope, hierarchy refusal, seller creation and renewal, the public projection with no validity date, the full registration approval, and Super-Admin-only status changes), `npx tsc --noEmit`, `npm run lint`, `npm run build`, and the 24 sales-network/registration screen tests. Not performed: a browser api-mode walkthrough; serializable cycle prevention and public rate limiting/CAPTCHA remain staging items.

## 8. F3 — Group 3: customer applications and record access

**Goal:** the complete customer lifecycle runs on the database, including imports and private ID images.

**Schema:** customer status history, import job and row tables, and government-ID/profile-photo references through the storage service.

**Routes still missing:** update draft, discard draft, send back, reject, correct with a reason, import (validate, confirm, history), audited export (5,000-row cap, row count only in audit) and staff customer lookup.

**Replace pilot shortcuts:** the load-all duplicate check and number allocation with an indexed normalized name and date-of-birth query, and the highest `YYYY-NNNN` per year under a unique index.

**Rules to preserve:** the customer identity and VIP Number are distinct; drafts never consume the Customer ID; there is no public customer or card lookup.

**Tests:** validation, duplicates, draft versus submitted, import validation and confirmation, export audit without row data, ID-file scope, restricted downline projection.

**Exit:** create, submit, approve, correct, import and export customers in api mode; only the owner sees the full record, a downline sees the restricted view.

**Size:** medium to large. Sonnet 5.5, high.

**F3 status (2026-11-25):** F3 is built. Customer rows carry indexed identity columns (`normalizedEmail`, `normalizedMobile`, `normalizedName`, `dateOfBirth`) used for duplicate candidate queries. A draft keeps its requested Customer ID in the profile so it never occupies the unique column until submission; automatic allocation reads the year's highest number. The service covers update, discard, send back, reject and reasoned correction, plus import (job and diagnostics tables, ready rows only, duplicates flagged), import history and audited export (row count only, 5,000 cap). The government ID image is stored privately and served through an authenticated, record-scoped endpoint; downline views stay restricted. The staff VIP card lookup is deferred to F7 because it needs active memberships. Verified: 56 server tests across 11 files (the 7-test F3 suite covers the lifecycle, duplicate manual ID, send back/resubmit/reject, import counts and audit hygiene, export audit, ID image scope and the downline projection), 124 customer screen tests, `npx tsc --noEmit`, `npm run lint` and `npm run build`. Not performed: a browser api-mode walkthrough; import row diagnostics keep counts/errors only.

## 9. F4 — Group 4: products, contracts, sales, IGP

**Goal:** the confirmed product configuration becomes editable and every contract, sale and IGP workflow is connected.

**Schema:** product, payment scheme and tier level versioning (finalized contracts never rewrite), reference lists and outlets, IGP project, sale and catalog tables.

**Screens and writes:** Admin screens for products, schemes and tier codes now edit the F0 tables with effective dates and audit. Contract update, return, cancel, request and decide cancellation (two steps with forfeiture), Non-Standard contracts (two approvals), reject sale, correct sale commission, and IGP enter, approve, sign documents and cancel.

**Decisions:** settled by the owner on 2026-11-24: Non-Standard monthly payments are 1 to 12 (doc 05 §10.2 and item 32; the earlier UI20 "1 to 36" figure is superseded). Build Non-Standard at 1 to 12.

**VIP Number:** the contract side records the blockers (approved sale, signed agreement, first scheduled payment, frozen commission rates). Actual issuance is built at the start of F6 because the rates come from there. The one-number rule `YYMMDDNNNNNVTPMMS`, monthly sequence, unique index and retry stay as specified in doc 06.

**Tests:** versioning, finalized-contract immutability, cancellation forfeiture, Non-Standard approvals, IGP, sale approval and rejection, audit.

**Exit:** the Admin configures a product and scheme, prepares and finalizes a contract, approves the sale and can see every hold and term on the contract page.

**Size:** large. Opus 5.5, high.

**F4 status (2026-11-25):** F4 is built. **Catalog:** `TierLevel` carries `configVersion`, `effectiveDate` and `changes`; `src/server/services/catalog-admin.ts` and `/api/v1` routes create, edit and approve products (retire and delete with a blocker check), create and edit payment plans, and create, edit, deactivate and delete tier levels. Every change bumps the version, records the change entry and writes an audit row; approved products keep their stated benefits and only the Super Administrator may change economic terms. Finalized contracts keep their snapshots, so catalog edits never rewrite them. **Contracts:** `update`, return-for-correction, direct cancel, request/decide cancellation with forfeiture, arrangement approval, payment-code recode and signed-agreement recording are connected. Non-Standard is enabled at 1 to 12 monthly payments (owner amendment 2026-11-24), with the Administrator step then Finance confirmation; a send-back or price/schedule change clears both approvals. `recordSignedAgreement` records the date and the remaining VIP-Number blockers (first scheduled payment and frozen commission rates); actual issuance stays in F6. **Sales:** commission correction updates the referrer and frozen DSC/DRI rates (exact centavos enforced by the commission rules). **IGP:** the schema adds `IgpProject`, `IgpUnit`, `IgpSale`, `IgpAccreditation`, `IgpSettings`, `IgpBuyerMembership` and `IgpHistoryBatch`; services and routes cover the register, entry with the monthly Series Number, approval, stopped-paying, cancellation with refund, reissue, correction, JA&D accreditation, document signing with grant-tier freezing and buyer membership, threshold and grant-tier settings, history import and the project/unit catalog. IGP receipts stay on the sale's details until F5 unifies the receipt table (recorded shortcut). The rich seed loads the IGP catalog, settings and four JA&D accreditations; the clean seed keeps only settings and the confirmed catalog. Verified: 62 server tests across 13 files (the F4 suites pass 6/6), `npx tsc --noEmit`, `npm run lint` (859 files) and `npm run build`; the rich seed then the clean seed were run. Not performed: a browser api-mode walkthrough; sale reinstatement and month-close remain F5; commissions, payout and VIP Number issuance remain F6.

## 10. F5 — Group 5: payments, adjustments, cancellations, holds

**Goal:** every receipt decision and financial adjustment runs on one transactional, auditable path.

**Schema:** `ClosedMonth`, unmatched receipts, payment adjustments as an insert-only table (moved out of `details`), receipt import batches, the financial hold flag and the bank list.

**Routes still missing:** reject, return for correction, resubmit, adjust (reversal, refund; the Reservation Fee is non-refundable), unmatched receipt intake, match and reject, bank choice, close month and the re-open rules.

**Replace pilot shortcuts:** `countedDate` uses `firstOpenDate(closedMonths, ...)`; reinstate a defaulted sale on a verified receipt; reversal can drop a Confirmed sale back to Pending with a negative adjustment and commission and membership holds. Port the whole of `reconcileContractState` ([reconcile-contract.ts](../../../src/modules/finance/application/reconcile-contract.ts)) through a server ports adapter in the same transaction.

**Races to test:** reversal and approval together, two reversals, close month while an approval runs (guard on the closed-month row).

**Exit:** submit, verify, reject, return and resubmit a receipt; reverse and refund; close a month; collections reconcile with the adjustments.

**Size and risk:** large, highest risk. Opus 5.5, high; xhigh only if concurrency tests keep failing.

**F5 status (2026-11-25):** F5 is built. **Receipts:** reject, return-for-correction and resubmit keep the original reference and history; verification stamps `countedDate` as the first open month, accepts a bank from the existing reference list for bank transfers and cheques, and keeps the duplicate/reference guards. A verified receipt on a Defaulted sale reinstates it. **Adjustments:** reversals and refunds write the new insert-only `PaymentAdjustment` ledger, cap at the remaining verified amount, refuse a Reservation Fee refund, and block a repeated adjustment. A reversal that drops a Confirmed sale below 25% returns it to Pending with a negative sale adjustment and the interim `Sale.financialHold` flag; reaching 25% again clears it. **Month close:** `ClosedMonth` freezes the month totals and gates later receipts into the first open month; closing an ended month twice returns the existing snapshot; closing the current month is refused. Re-opening a closed month has no approved rule, so it is not implemented. **Stopped paying:** `markSaleDefaulted` requires an approved sale with no verified receipt for 90 days and records the reversal and hold; commission clawback and membership holds stay in F6/F7. **Unmatched receipts:** intake, match (same frozen money, OR kept as the document number) and reject, with a system-wide OR/reference uniqueness check across payments, open unmatched receipts and import batches; a rejected intake frees its number. **History imports:** batch create, Administrator sign-off (self-sign flagged) and reject; only signed-off batches count. **Screens:** the HTTP repositories now connect the finance collections, cancellations, closed-month, unmatched and history-import screens. Verified: 73 server tests across 14 files (the F5 suite passes 8/8, including the returned/resubmitted/rejected receipts, closed-month dating, reversals and holds, a simultaneous-reversal race, unmatched matching, imports, the default guard, the system-wide OR check and an audit-row assertion; the F4 suites add finalized-contract immutability, Non-Standard price persistence, tier-level version read-back and two-step forfeiture; the IGP suite adds the referrer JA&D refusal and the persisted correction), 29 finance/import screen tests, `npx tsc --noEmit`, `npm run lint` (868 files) and `npm run build`; the rich seed then the clean seed were run. Six review passes then aligned the Administrator's refund authority with doc 07 section 5.3, guarded the product delete-blocker counts with `vip-products.manage`, corrected the audit entity types and moved the new audit actions into the canonical constants, made adjustments contract-version guarded, fixed `saveContract` to write the indexed columns (and clear nullable ones) so a Non-Standard price edit persists, made IGP corrections persist their price/referrer columns, converted the remaining money reads to `int64ToCentavos`, enforced the OR/reference uniqueness across payments, open unmatched receipts, import batches and IGP receipts at entry, resubmission, verification and sign-off (case-insensitive, and auto-assigned Cash numbers advance past held numbers), allowed an explicitly approved zero commission rate, added the IGP suspended/ended seller and referrer JA&D checks, read the tier-level version fields, kept the referrer on a rate-only commission correction, cleared the referrer reference and reminders when a referrer is removed, validated IGP Cash terms as a `termMonths` field error, recorded a dated sale reversal when a confirmed sale is cancelled, made the adjustment table the only read source, replaced the internal milestone wording on the VIP issuance hold with user-facing text and fixed its grammar, cleared nullable catalog and IGP project fields on save, made the F5 test remove only the closed month it created, isolated the F4 immutability test to the test-created product, gave duplicate payment-plan slugs a unique key instead of a raw 500, stopped the IGP settings read from writing on GET, audited the defaulted hold from either prior status, uploaded a replacement proof on resubmission, refused an unmatched-receipt file with a clear message instead of dropping it, gated the IGP register settings on `igp.enter`, and corrected the date-brittle sales-network renewal assertion to use today's Manila date. Deferred from the reviews: porting `reconcileContractState` through a server adapter (the F5 branches are inline; commission and membership ports belong to F6/F7), applying signed-off import batches to contract collections (the rows carry no contract link; the reconciliation module in F8 owns that), splitting the large services into repositories, and a database row lock for close-month versus approval (the service re-reads closed months per attempt; SQL Connect has no row lock). Not performed: a browser api-mode walkthrough; IGP receipts still live on the IGP sale until this phase's receipt table is extended to them; the closed-month commission and allowance totals stay zero until F6.

## 11. F6 — Group 6: commissions, allowances, payouts

**Goal:** commission rates freeze on the sale, releases and payouts follow the confirmed rules.

**Schema:** commission rate settings, VIP position rates, commissions, clawbacks, payout lists and allowance reviews.

**Order:** commission-rate freezing and VIP Number issuance first, then release at 40% collected, month-end payout lists (the release month must be closed), clawback offset after the signed addendum date, and approval versus confirmed disbursement ("approved" is not "Paid").

**Races to test:** duplicate payout, release while a reversal runs, clawback twice.

**Decisions:** open allowance questions G3 and G4 and the G5 process checks in the decision register; Legal confirms the clawback addendum before real payouts.

**Exit:** a paid sale creates the DSC and DRI commission at frozen rates, releases at 40%, appears on a month-end payout list, and a clawback is traceable end to end.

**Size:** large. Opus 5.5, high.

**F6 status (2026-11-26):** F6 is built. **Rates:** `CommissionRateSetting` (per member, product and role) and `VipPositionRate` tables with Admin set-rate, position rates, apply-position-rate and the per-IST Clawback Addendum signing date (`COMMISSION_ADDENDUM_RECORDED`); the rate directory backs the Commissions screen. **Issuance:** the F4 blockers resolve into the real VIP Number — the verified first scheduled payment plus approved DSC/DRI rates allocate the number under `YYMMDDNNNNNVTPMMS` with a unique index and retry, freeze the rates and the Closed Deal threshold on the sale, and point the RA number at the number when none was recorded; a missing rate keeps a precise user-facing blocker. **Release:** the receipt that first reaches 40% of the contract TCP releases the stage-1 commissions in the counted month, one insert-only row per role and stage, with holds and restorations riding the same receipt transaction; the release engine is product-aware, but only VIP sales run through it until the IGP receipt pipeline exists (recorded shortcut). Reversals and returned cheques hold unpaid commission and, for a paid stage paid in a closed month, raise the clawback (open payout months escalate for Finance review). **Month-end:** closing a month freezes the real commission and allowance totals in the snapshot and prepares that month's payout list automatically (2026-11-16 amendment); approval applies the signed-IST payback offsets (`PAYOUT-OFFSET`), and payout record, bulk record and bulk confirmation (doc 08 §11.6, held commissions never confirmed in bulk), void and duplicate protection follow doc 08 section 11 — Approved is not Paid. **Clawbacks:** the ledger records recoveries, direct collection, write-off and reinstatement effects (`COMMISSION_DEFAULT_REINSTATED`, refund-due reporting). **Allowances:** the assembled BA/PA/PB review (F8.6) saves with workbook comparison figures and applies `ALLOWANCE-OFFSET` paybacks on a signed IST's first review of the month; during the parallel run every figure is comparison-only and nothing is recorded as paid. The commissions screens read the API in api mode through the HTTP repository. **Status changes (F6.2, 2026-11-26):** one Director-style action records `rescinded` or `downgraded` on an active sale — rescission only ninety days after booking (Clawback Addendum §2(d)) — removing the Closed Deal, writing the dated reversal and holding unpaid / clawing back paid commission through the same trigger engine; the buyer's repurchase after a downgrade is a new sale from zero. The company source pack under the owner's Business Rules folder is now the first reference (AGENTS.md §2), and doc 06's date-segment gloss was reconciled to NUM v6.2 (transaction date). Verified: 77 server tests across 15 files (the 4-test F6 suite covers rate freeze and issuance, staged release at 40%, the month-end list, approval, bulk record/confirm with duplicate refusal, cancellation clawbacks, the released-sale correction guard, reversal holds and restoration, the allowance review, and the rescission guard, downgrade hold and dated reversal), `npx tsc --noEmit`, `npm run lint` (883 files) and `npm run build` clean. Not performed: a browser api-mode walkthrough, the clawback offset against a paid payout end to end (the offset planner keeps its module tests), the IGP receipt pipeline (IGP commissions release with it — recorded shortcut), and the two pre-existing failing screen suites.

## 12. F7 — Group 7: membership, cards, Stay Points

**Goal:** membership, card records and the points ledger are database-backed; the experiences data becomes editable.

**Schema:** membership, member QR holders, Stay Points ledger and resort spend, promos and promo points, experiences and outlets (edit screens now), restaurant reservations, and the redemption prototype tables.

**Server:** membership is created when a finalized contract is fully settled, inside the receipt transaction; activation is approved separately (receipt approval never activates); the ledger follows the signed Grant's yearly tranches; credits are idempotent with a unique key per source event; financial holds apply.

**Boundaries:** keep the staff QR and Stay Points prototype available. Live Redemption, Services and the Customer Portal need separate approval.

**Exit:** a settled contract produces a membership record, approval activates it, the Grant tranches credit points idempotently, and a hold blocks the right effects.

**Size:** large. Opus 5.5, high.

**F7 status (2026-11-26):** F7 core is built. The signed Grant mechanics were verified first against the company pack (the Bronze/Silver/Gold Grant texts: five annual tranches of 10,000 = 7,000 weekday + 3,000 weekend, the Points Activation Date as the earlier of the first redemption or the second claim anniversary, the ₱1,000 qualifying-spend activation, the 60-day Compassionate Waiver) and matched doc 09's ratified tier table. **Membership:** `Membership`, `ResortSpend` and `StayPointsWaiver` tables; the pending membership is created inside the receipt transaction when a finalized contract is fully settled (also at finalization of an already-settled contract), activation is a separate Admin action that stamps the card-level VIP Number and full-settlement date, the Card Claim Date is recorded actual or deemed (first settlement anniversary) and starts the tier validity, and card replacement/transfer/inheritance keep the written request and approval references with unused points closed on transfer. **Stay Points:** resort bills are entered by a Clerk with a system-issued, system-wide-unique OR number (the payments uniqueness check now covers resort bills), approved by Finance with the self-approval note, refunded as dated capped entries, and waived through the 60-day Compassionate Waiver; the Annual Welcome Gift ledger is insert-only (`StayPointsLedgerEntry`, one row per tranche, bucket and type): releases, waiver releases, transfer closures and expiry forfeits are written once when they occur, the deemed Points Activation Date is recorded as a business date, and a released tranche is never taken back by a later refund. A transfer or inheritance closes unused points as not transferred (later tranches continue for the new holder). **Financial hold:** any reversal or refund that leaves the total price outstanding holds the membership; verified money that settles the contract again — including reinstatement or reconfirmation — releases it with the restored date. The memberships and Stay Points screens read the API in api mode through the HTTP repository. Verified: 79 server tests across 16 files (the 2-test F7 suite covers full settlement → pending membership, activation, card claim and validity, the backdated Points Activation Date releasing the first tranche (7,000/3,000), a refund below the minimum leaving the released tranche intact, duplicate-OR refusal, staff lookup, a transfer closing the unused points, and the reversal hold with reinstatement release; fixtures use their own customers), `npx tsc --noEmit`, `npm run lint` (893 files) and `npm run build` clean. Deferred with recorded shortcuts: the member-QR scan intake, promo points, restaurant reservations and the redemption prototype tables stay on the authorized mock prototype (live redemption needs separate authorization); experiences/outlets editing and the first-redemption-driven PAD wait for the server redemption build.

## 13. F8 — Group 8: reporting, audit review, reconciliation, close

**Goal:** every report reads authoritative records in the database and the audit history is append-only in the database.

**Schema:** reconciliation entries, month-switch sign-offs (insert-only) and report export records.

**Routes:** audit read with filters and paging, audited report exports, sales performance, reconciliation decisions, period close and sign-off. The Step C collections report extends here with the permissions in [doc 11](../../business-rules/11-reports-and-analytics.md); confirm who may read it.

**Append-only audit:** enforce it in the database (trigger or revoked privileges through a Cloud SQL migration), not only by exposing insert operations. Rehearse in staging.

**Performance:** aggregate in the database, not in the server over all rows; indexed date filters and pre-aggregated totals where a report is slow.

**Exit:** every report matches the source records and audit trail, exports are audited without row data, and audit rows cannot be changed or deleted.

**Size:** medium-large. Sonnet 5.5, high.

**F8 status (2026-11-26):** F8 is built. **Audit read:** `GET /api/v1/audit` filters (module, record type, action, actor, record id, date range) and pages in the database, and `GET /api/v1/audit/actors` lists the actors for the filter; both require `audit.read` (Administrator and Super Administrator only — Finance and sellers are refused), and the read is append-only with no write path. Every new audit event now stores its owning module (`AuditEvent.module`, taken from the payload, with a record-type fallback); the view carries the payload's statuses, values and reasons, resolves the actor's name and current roles, and labels records from the payload's display reference (older events without one show the record type). **Reconciliation:** insert-only `ReconciliationEntry` and `MonthSwitchSignOff` (one per month) tables; `GET /reconciliation/totals` recomputes the five live totals server-side from the same records the reports read (verified receipts including dated adjustments, imported receipts from signed-off batches, confirmed sales value including IGP adjustments, commissions payable and paid), a matching total can be confirmed while any difference can only be recorded as explained with a reason (never hidden), and every decision is audited. The parallel-run switch requires a closed month, every measure checked against the current totals, and a saved allowance review for every leader in post that month; only the Super Administrator signs off (Audited `PARALLEL_RUN_SWITCH_SIGNED_OFF`), and repeating the sign-off returns the recorded one. **Period close:** F5's finance close locks the month; the switch sign-off completes the company-side period close. The sales performance report reads the F4 sales and IGP APIs (all pages), so its figures match the source records; database-side aggregation and staging indexes remain the recorded performance follow-up for slow reports, not a correctness gap at pilot volume. **Collections readers:** owner decision of 2026-11-26 — the Administrator and Finance (the Super Administrator holds every operation); `finance.reports.view` was granted to the Administrator and the navigation expectation updated. **Exports:** the existing audited export event (name, format, range, row count only) is the export record; no separate table exists because no screen reads one — a deliberate deviation from the phase-plan schema line. **Append-only audit in the database:** `dataconnect/security/audit-append-only.sql` provides the Cloud SQL trigger and the documented REVOKE for staging and production; the local emulator does not apply triggers, so the plan's staging rehearsal remains. Verified: 82 server tests across 17 files on a fresh seed (the 3-test F8 suite covers audit filters, paging, date bounds and the permission refusals; the collections-report readers; reconciliation validation, the four-of-five gate, the close, the switch refusal for the Administrator and the Super Administrator sign-off with its repeat; the F8.1 review pass added the legacy-module filter and date-only-bound assertions and the entries-refusal check), the F8 suite also green on reruns without reseeding (test-owned records only), `npx tsc --noEmit`, `npm run lint` (900 files, architecture check included), `npm run build` and the navigation/report screen suites clean. **F8.1 review fixes:** the audit module filter also matches pre-F8 events without the stored module through their record type's module, so filter and display agree; date-only `from`/`to` bounds cover the whole Asia/Manila business day; `outcome` is documented as the committed-action invariant (a failed action leaves no row) rather than a stored column; the switch sign-off's `checkedLeaders` counts exactly the leaders the gate requires (seats vacant all month excluded); `GET /reconciliation/entries` refuses identities without `reconciliation.manage`; the audit-module derivation and the month schema now have one source each; both reconciliation query schemas are strict. One pre-existing failure remains outside this work: the Finance-dashboard legend assertion in `dashboard-page.test.tsx` (untouched by F8; flagged with the owner-modified screen tests). Deferred: browser api-mode walkthrough of the audit, reconciliation and period-close screens; staging trigger rehearsal; database-side report aggregation and audit count/actor-list aggregation (small volumes in the pilot).

## 14. F9 — Remove the mock layer and verify

**Goal:** the application has no mock data or mock repositories; the database is the only source.

**Work:**

1. Delete `src/data/mock`, `MockStoreProvider`, the dev identity switcher, the mock login and `NEXT_PUBLIC_DATA_MODE`; api becomes the only mode. Update the Better Auth shortcut comments.
2. Delete the static catalog and template constants left after F0.
3. Rewrite the remaining screen tests against route handlers or stubbed HTTP responses; module behavior lives in the emulator suites.
4. Run the complete local verification in [guide 06](01-localhost/06-local-verification.md): recreate the emulators and seed from clean, run all suites in parallel and three times in a row, verify paging and `listAll`, and record the evidence table.
5. Remove the sample-data documentation that no longer applies and update the phase statuses.

**Exit:** `npm test` runs without `src/data/mock`; api mode is the only runtime; a clean seed starts from one Super Admin and the confirmed reference data and a staff-created workflow is possible.

**Size:** medium. Sonnet 5.5, high.

**F9 status (2026-11-26):** F9 is built. **Mock removal:** `src/data/mock` is deleted (92 files) with `MockStoreProvider`, the dev identity provider/switcher, the localStorage mock login and `NEXT_PUBLIC_DATA_MODE`; the seed builders, dev identities and credentials moved to `src/data/seed/` and feed `db:seed`, `db:seed:clean` and the emulator suites, with the fixture store in `src/data/seed/store.ts`. The API is the only runtime: `useRepositories()` returns the HTTP repositories, the root layout mounts only the session identity provider, the login posts through Firebase and `POST /session`, `src/proxy.ts` always redirects a cookieless `/admin` visitor, and `npm run dev` runs Next with the emulator settings. **Prototype retirement (owner decision 2026-11-26):** the staff redemption prototype, promos, member-QR, reservations and the customer portal are retired with the mock layer — they are retired to not-connected stubs (their contracts, query hooks and page components remain, but every repository call is rejected and no navigation entry reaches them), the Redemption area, the Promotions/Promo History tabs and the Settings Night Rates/Holidays/Venues tabs are removed, the old promo/redemption redirect routes are deleted, and the public site's Customer Login links are removed; the remaining stub screens show the honest not-connected state if reached directly, and live Redemption and Services stay disabled. Public website content reads a static confirmed-catalog snapshot (`src/data/public-content.ts`); the CMS stays deferred. **Tests:** the mock-only page tests were removed (54 files: customers, contracts, IGP, staff, departments, roles, sales network, promos, redemption, portal and public-site pages; recorded as a deliberate coverage trim) and the maintained UI core was rewritten on a stubbed-HTTP harness (`src/test/api-harness.tsx`): auth gate, login, navigation and area matching, audit page, reconciliation page, area page and admin kit; pure module tests read the seed store, and the flaky public-accreditation check now picks each member's current record. Verified: 128 client/module test files (1075 tests) and 17 emulator files (82 tests, run twice on fresh seeds with `--no-file-parallelism`) pass; `npx tsc --noEmit`, `npm run lint` (845 files, architecture check) and `npm run build` clean; `npm test` executes all 145 files — the client suites pass in parallel, while the emulator files keep the documented serial-run constraint (shared session cookie) and pass 82/82 serially. Deferred: a parallel-safe `npm test` for the emulator suites, the browser api-mode walkthrough and the staging checks.

## 15. Cross-cutting work

| Item | Phase | Notes |
| --- | --- | --- |
| Generated connector bindings | F1 | Move raw GraphQL strings into connector operations; needs a Google credential for `dataconnect:compile`. |
| Append-only audit in the database | F8 | Rehearse in staging. |
| Bounded queries | Each phase | Replace every remaining "load all" shortcut in the pilot plan. |
| Rate limiting and lockout | F1 or staging | Sign-in and password reset; CAPTCHA provider is an owner decision. |
| Background work (emails, scheduled releases) | When a phase needs it | Keep external effects out of retryable transactions; use an outbox table written in the same transaction. |
| Retention and privacy | Before production | The ten-year schedule exists; Legal and the DPO may replace it. |
| Observability | Staging | Structured logs with the `correlationId`; no personal data. |
| Stale comments | F9 | Remove the mock-login shortcut comments with the mock layer. |

## 16. Decision gates

| Decision | Blocks | Phase |
| --- | --- | --- |
| ~~Non-Standard monthly payments 1–36 or 1–12~~ | Settled 2026-11-24: 1–12 | F4 |
| Session length | Auth and session work | F1 |
| MFA for privileged roles | Accounts and sign-in | F1 |
| Password-recovery and CAPTCHA providers | Accounts and sign-in | F1 |
| Collections report readers | Reports | F8 |
| Allowance questions G3, G4, G5 | Commissions | F6 |
| Legal confirmation of the clawback addendum | Real payouts | F6 and production |
| Production region, domain, sizing, cost, recovery | Staging hosting | After F9 |
| Retention and public privacy wording | Production | After F9 |

## 17. Status and reporting

Each phase adds a status block with:

- Starting revision, branch and environment.
- Approved scope and the owner decision references.
- Commands run and actual results.
- Known limits and skipped checks.
- Next required approval.

Use **Planned**, **Ready**, **Verified**, or **Blocked** so a written procedure is never mistaken for a completed build. Agents stop after the report; Git stays with the owner.

## 18. Daily commands

```bash
npm run emulators        # Auth, SQL Connect and Storage emulators
npm run db:seed:fixtures # synthetic pilot records for the server test suites (clears local tables)
npm run db:seed          # true data only: one Super Admin + confirmed reference data (clears local tables)
npm run dev:api          # api mode (stop other next dev servers first)
npx vitest run src/server
```
