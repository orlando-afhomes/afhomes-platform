# Realistic Seed Data Plan

Status: **Planned. Not authorized.** Per `AGENTS.md` section 7, the owner must authorize the build before any file in `src/` changes. Written 2026-11-23 against `develop @ 3058633`.

Scope: replace the placeholder mock data with clean, production-like synthetic data, and make sure no page, tab or table in the prototype opens empty. This is a data and test change only. It changes no business rule, no UI component and no repository contract.

## 1. Why this is needed

The owner asked for sample content that looks production-ready: no entries such as "Customer B One", and no empty tables on any page.

A read-only survey of the seed and of every route found three problems.

### 1.1 Placeholder and unrealistic values

| Area | Where | Problem |
|---|---|---|
| Customers | `src/data/mock/seed-data.ts` (customers) | Names such as "Customer A One", "Customer A Two" and "Customer B One". Mobiles run `09171110001` to `09171110008`. Emails use `@afhomes.local`. No customer has a Customer ID (`YYYY-NNNN`). One customer is a bare draft with 5 fields. |
| Staff and accounts | `seed-data.ts` (accounts, staff) | Role-named people: "Super Admin", "HR User", "Finance User", "Pending User", "Admin User". `staff-admin` and `staff-super` are both positioned "HR Staff". Department descriptions repeat the department name. |
| Sellers | `seed-data.ts` (members) | `randomuser.me` photo URLs. Fake-looking TINs (`123-456-789`), government IDs (`P1234567A`) and streets ("123 Maharlika Street", "456 Ayala Avenue"). All seven share one accreditation date and expiry. The four IST accreditations are `pending` while their members are `active`. |
| Payments | `seed-data.ts` (`pay()` factory) | References such as `BT-PAY-1` instead of `PAY-YYYYMMDD-NNNN`. Every payment is a bank transfer with a `receipt-pay-N.jpg` file. |
| Commission payout | `seed-data.ts` | Payout reference `PAY-2026-0011` collides with the payment reference prefix. |
| IGP catalog | `src/modules/igp/types.ts` lines 152–165 | "Sample Heights", "Sample City", "Sample Gardens", "Sample Property Owner", "Sample Land Holdings". |
| Import templates | `src/modules/igp/history-import.ts`, `src/modules/imports/receipt-import.ts`, `src/panels/admin/pages/customer-import-export-page.tsx` | "Sample Buyer", "Sample Customer", `SALE-EXAMPLE-1`, `maria.santos@example.com`. |
| Dev logins | `src/data/mock/dev-identities.ts`, `mock-credentials.ts` | Labels such as "SVD Alpha (Dev)", "OST Beta One (Dev)", "GSD Counter (Prototype)". Two email domains (`@afhomes.local` and `@afhomes.test`). |
| Promos and outlets | `src/modules/promos/sample-seed.ts`, `src/modules/settings/lists.ts` | One promo flagged `sample: true`, unpublished, with no rewards. Three outlets flagged `sample: true`. |
| Import jobs | `seed-data.ts` (customerImportJobs) | Jobs report 12 and 5 created customers, but `createdCustomerIds` is empty. |

The public site copy (`src/modules/public-site/content/`: blog, FAQ, about, compliance, experiences, VIP, privacy) is real company text. It is not part of this change.

### 1.2 Empty collections

`createSeedStore()` (`src/data/mock/seed.ts` lines 105–165) starts 14 collections empty: `registrationApplications`, `seatVacancies`, `closedMonths`, `unmatchedReceipts`, `commissionRateSettings`, `vipPositionRates`, `commissionClawbacks`, `commissionPayoutLists`, `allowanceReviews`, `promoPoints`, `receiptImportBatches`, `reconciliationEntries`, `monthSwitchSignOffs` and `temporaryPasswords` (the last is intentionally empty and stays so). The IGP lists (`sales`, `accreditations`, `buyerMemberships`, `historyBatches`), the Stay Points lists (`ledger`, `refunds`, `waivers`) and the redemption `bookings` and `ledger` are also empty.

### 1.3 Thin core data and a moving clock

- The core data is small: 4 contracts, 4 sales, 8 payments, 2 memberships (one with a card), 3 commissions (all on team B) and 3 resort bills. Pages that derive from these are nearly empty.
- Seed dates are fixed between 2026-09-28 and 2026-11-10. The dashboard and reports default to the last 28 days, Receipts to the last month and Reconciliation to the current month. All of them read the real clock. Every date-filtered view goes empty after about 2026-12-08.
- Many seller identities see empty pages because the data is concentrated in team B.

### 1.4 Pages that are empty today

| Area | Empty page or tab | Cause |
|---|---|---|
| Sales | IGP register and JA&D accreditation history | `igp` lists empty |
| Finance | Receipt exceptions, unmatched receipts, month-end close, reconciliation decisions | `unmatchedReceipts`, `closedMonths`, `reconciliationEntries` empty. No exception cases in the payments |
| Commissions | Payout lists, recovery, rates, saved allowance reviews | Five commission collections empty |
| Stay points | Waivers, and the gift history for most customers | `stayPoints.waivers` empty. Only one cardholder |
| Promos | Promo points, GSD points, public `/offers` page | `promoPoints` empty. The only promo is unpublished with no rewards |
| Redemption | Bookings, ledger | `redemption.bookings` and `ledger` empty |
| Reports and imports | Historical import batches, stay points report, promo points report | Batches empty. Derived data empty |
| Sales network | Registrations, seat vacancies, member History tab | Collections empty. No `parentHistory` |
| Customer detail | Contract, Sales, Membership and Audit tabs for most customers | Only a few customers have contracts |
| Portal | Only one customer can sign in | One QR record, one card |

## 2. Decisions already made by the owner

| Topic | Decision |
|---|---|
| Dates | Relative to the day the app opens, so date-filtered pages always have data. |
| Volume | Medium: about 40 customers, 25 contracts, 12 sellers on 3 teams, about 6 months of activity. |
| Emails | Real-looking domains. Staff use `@afhomes.com.ph`. Customers use `@gmail.com` or `@yahoo.com`. |
| Delivery | One build of everything with one final report. |

## 3. Constraints that do not change

- Synthetic records only, held in browser memory. A full refresh restores the seed. Do not persist mock business data (`AGENTS.md` section 4).
- No business rule changes. Seed values that are owner-decided stay as they are: product prices (B1 ₱72,000, S1 ₱240,000, G1 ₱390,000), payment scheme amounts, the points-per-night table, the holiday calendar and venue cut-offs.
- Live Redemption stays disabled and Services stay disabled. The staff Redemption prototype stays as it is.
- IGP buyer membership stays as the existing prototype behavior. Do not treat it as an approved live rule.
- All money is integer centavos. Use the `peso()` helper in `seed-data.ts`.
- Real-looking email domains are display-only mock data. The mock never sends email. Add this comment where the domains are defined: `shortcut: real-looking domains are display-only mock data, replace with real records at import`.
- Invent no financial, legal or security policy. Where a business rule gives a number (25% sale count, 40% commission release, 90-day review), derive the data from the rule through the existing functions.

## 4. Design

### 4.1 Time anchor

Add `src/data/mock/seed/anchor.ts`:

- `seedToday` is captured once per store build with `manilaToday()` (`src/modules/accreditation/dates.ts:24`).
- `daysAgo(n)` and `monthsAgo(n)` build on `addDaysToDate` (`src/shared/lib/dates.ts:35`). They never use `Date.now()` directly.
- Every seeded date is an offset from `seedToday`. The same code gives the same relative picture on any day.
- Date-only fields stay date-only strings (Asia/Manila semantics, `AGENTS.md` section 6). Timestamps are built from the date plus a fixed time.
- Month boundaries are explicit: the seed uses full calendar months for closed periods and the current month for open ones. The last two calendar months are closed, so the current month is the first open month.

Consequence for generated numbers: VIP Numbers (`YYMMDD…`), Series Numbers and OR numbers contain dates, so they change with the anchor. Tests must not pin them. They read the number from the seed.

### 4.2 Source layout

New folder `src/data/mock/seed/`, replacing the single `seed-data.ts` literal file:

| File | Holds |
|---|---|
| `anchor.ts` | `seedToday`, `daysAgo`, `monthsAgo`, month helpers |
| `people.ts` | Name lists, address list, phone and ID generators, email builder |
| `network.ts` | Members, accreditations, seat vacancies, parent history, registration applications |
| `customers.ts` | Customers, import jobs |
| `sales.ts` | Contracts, sales, payments, memberships, resort bills |
| `operations.ts` | Receipts exceptions, closed months, reconciliation, payout inputs, allowance inputs, clawbacks, rate settings, waivers, promo and redemption seed, audit events |
| `igp.ts` | IGP catalog, JA&D accreditations, IGP sales, history batch |
| `staff.ts` | Departments, roles (kept), staff, accounts |
| `index.ts` | `buildSeed(seedToday)`, which returns the same shape `createSeedStore()` uses today |

`src/data/mock/seed.ts` keeps `createSeedStore()` and calls `buildSeed`. `seed-data.ts` is removed once nothing imports it. Tests import fixtures from the seed builder, not from `seed-data.ts`.

Rules for the generators:

- Fully deterministic. No `Math.random()`. Pick from fixed lists by index.
- Fixed lists of realistic Filipino given names, surnames, barangays, cities (Laguna and Metro Manila first) and street names. No name appears twice with the same full name in the same list. No placeholder wording anywhere.
- Mobiles use real prefixes (`0917`, `0918`, `0927`, `0998` and similar) with non-sequential digits. TINs use `NNN-NNN-NNN-000`. Government IDs use a plausible format for the ID type selected.
- No photo URLs. The existing initials avatar fallback is used.
- A generator never emits a value that could match a real person, such as a real celebrity name. Use common surnames with uncommon combinations.

### 4.3 People

**Sales network (12 sellers, 3 teams).** The existing member IDs are kept so scope tests stay valid.

| Team | Structure |
|---|---|
| A | `mem-svd-a` → `mem-ssm-a` → `mem-sm-a` → `mem-ost-a1`. `mem-ost-a2` reports directly to `mem-svd-a`. Two more OSTs are added under `mem-sm-a` and `mem-ssm-a`. |
| B | `mem-svd-b` → `mem-ssm-b` → `mem-ost-b1` and a second OST. |
| C (new) | `mem-svd-c` → `mem-sm-c` → `mem-ost-c1`. |

Rules for the network data:
- Accreditation dates are staggered across about 18 months. At least one accreditation is expired, so the "expired still sells, reminder shown" rule (doc 03) is visible. At least one is within the renewal window. IST admin status matches member status.
- Seat vacancies: at least 2 open seats (one SSM, one SM). Parent history: at least 3 members with a recorded parent change, so the History tab shows.
- Registrations (`registrationApplications`): 4 OST applications covering pending, approved, returned for correction (with a working `/register/ost/correct/[token]` token) and rejected.
- Sponsor links obey the cycle rule (doc 02). The seed integrity test already checks it.

**Customers (about 40).** Customer IDs run `YYYY-NNNN` from a sequence per year, with the RA numbers in the seeded contracts matching. Status mix: about 6 drafts (some started by a seller, some completed by a clerk), 4 submitted, 3 sent back, 2 rejected, the rest approved. Every OST and SM has at least 3 customers. Some customers have two VIP records. Some have no contract yet. Each customer has a unique full name, a unique mobile and a unique email.

**Staff, accounts and departments.** Seven or more staff with realistic names, positions that match their role, and department descriptions that state the department's purpose. Role names and modules stay as they are (doc 01). Accounts include one suspended account, one pending activation account and one locked account, so those states show.

### 4.4 Core sales data (about 25 contracts)

All schedules come from `buildSchedule` (`src/modules/contracts/rules.ts:58`). All numbers use the real builders: `buildVipNumber` (`src/modules/membership/rules.ts:12`), `nextPaymentReference` and `nextOfficialReceiptNo` (`src/modules/finance/payment-reference.ts`).

Contract stage mix, with each OST receiving at least two stages:

| Stage | Count |
|---|---|
| Reservation recorded, signed RA pending | 3 |
| Needs review (Clerk submitted, awaiting Administrator) | 3 |
| Finalized, below 25% collected | 4 |
| Finalized, sale confirmed (25% to 40%) | 5 |
| Collected 40% or more, commission released | 4 |
| Fully paid | 3 |
| Cancelled with refund and clawback | 1 |
| Non-Standard with recorded authorization (doc 05) | 1 |
| Financial hold | 1 |

Product and scheme mix covers B1, S1 and G1 and all four schemes.

Payments:
- About 70 payments over 6 months, in mixed methods (bank transfer, cash, check, GCash) and statuses (submitted, verified, returned, rejected).
- Verified evidence file names follow `OR-YYYYMMDD-NNNN` style names, not `receipt-pay-N.jpg`.
- Several payments fall in the last 28 days and in the current month.
- Every contract's ledger total equals its verified payments. Every schedule adds up to the contract price. The existing integrity checks stay.

Memberships and cards:
- About 10 memberships. Six have claimed cards (some claimed by the customer, one deemed claimed through `recordDueDeemedClaim`, `src/data/mock/card-claim.ts:8`). Two are pending activation. One carries a financial hold.
- A `memberQr` record is seeded for each carded membership, so about six customers can sign in to the portal.

Resort bills: about 12 across several cardholders, in submitted, approved and refunded states, so the resort bill, refund and waiver tabs show rows.

### 4.5 Derived state, built by the existing rules

After the base facts are loaded, the seed runs the real effect functions once, with a `"system"` actor, instead of hand-typing derived numbers. Everything below is consistent with docs 07 to 09 by construction.

| Result | Function |
|---|---|
| Sale confirmation, 25% count, holds | `reconcileContract` (`src/data/mock/business-effects.ts:115`) |
| Frozen seller and referrer rates | `freezeCommissionRates` (`src/data/mock/commission-effects.ts:21`) |
| Commission stages and releases | `releaseSaleCommissions`, `applyCommissionTrigger` (`:50`, `:133`) |
| Payout lists | `buildPayoutList` (`:98`) |
| Promo points from bills | `earnPromoPointsForBill` (`src/data/mock/promo-effects.ts:22`) |
| IGP collections | `reconcileIgpCollections` (`src/data/mock/igp-payment-effects.ts:45`) |

Where an effect stamps `today()` internally, the seed passes the business date or patches the stamped date afterward so the record lands in the intended month. This keeps late-receipt rules (first open month, doc 08) testable.

### 4.6 Collections that need their own seed

| Collection | Seed content |
|---|---|
| `closedMonths` | The two previous calendar months, with period-close snapshots from the existing snapshot builder. |
| `unmatchedReceipts` | 3: one matchable, one duplicate-OR conflict, one to reject. |
| Receipt exceptions | Derived from the base payments: one closed-month receipt, one reference conflict, one suggested match. |
| `receiptImportBatches` | 1 reviewed batch. |
| `reconciliationEntries`, `monthSwitchSignOffs` | 3 entries with decisions, 1 comparison sign-off for a closed month. It records a comparison and does not switch payouts (Doc 08 §16 stays open). |
| `commissionRateSettings`, `vipPositionRates` | One setting per active seller and position, using the approved rate model. No invented rates: copy the approved defaults from `src/modules/commissions/rules.ts`. |
| `commissionPayoutLists` | 2: one closed-month list marked Paid with a disbursement reference that does not use the `PAY-` prefix, one prepared list for the latest closed month. |
| `commissionClawbacks` | 1, from the cancelled contract. |
| `allowanceReviews` | 2 saved reviews for the closed months, with the explicit split confirmation recorded (doc 08). |
| `stayPoints.waivers`, `stayPoints.refunds` | 2 waivers, 1 refund. |
| `promos`, `promoPoints` | 3 promos. Two are published and active with rewards and public text, so `/offers` has content. One is a draft. Promo points come from section 4.5. The `sample: true` flag is dropped. |
| `outlets` | The five outlets remain. Drop the `sample: true` flag only if the owner confirms the outlet list is final. Otherwise keep the flag but make the rows complete (see section 7, question 2). |
| `redemption.bookings`, `ledger` | About 6 bookings across the two venues (confirmed, checked in, cancelled), with matching ledger entries. The points table, holidays and cut-offs stay as decided on 2026-11-22. |
| `igp.accreditations`, `igp.sales`, `igp.historyBatches` | 2 JA&D accreditations. 5 IGP sales built with `formatIgpSeriesNumber` (`src/modules/igp/rules.ts:32`), including one above ₱9,000,000 (band digit 0), one Replaced and linked to its replacement, and one with a buyer membership record on Formal VIP Grant signing and no Stay Points. 1 history batch. |
| IGP catalog | Realistic project, property owner and unit names replace "Sample …" (`src/modules/igp/types.ts`). Names must be generic enough not to match a real developer. |
| `customerImportJobs` | `createdCustomerIds` point at real seeded customers. |
| `auditEvents` | One event for each seeded action that has an audit rule in doc 12. `SEED_AUDIT_EVENT_COUNT`, `auditSequence` and `counters` are computed from the arrays, not hard-coded. |

### 4.7 Dev identities and logins

- Dev identity labels become the person's name and role, for example "Ramon Del Rosario · SVD". One login per identity stays.
- The shared mock password and the identity switcher rules do not change. A mock login is still never a production mechanism (`AGENTS.md` section 4).
- One email domain: `@afhomes.com.ph` for staff and sellers.
- Every identity must see data. Where a role legitimately has no access to a module (doc 01), the page shows the existing no-access state, not an empty table. Finance and the Customer Growth report need a check against doc 01 before the build: if Finance is not granted the report, no change is needed.
- Seller identities need at least one contract, one commission and one cardholder, spread across teams A, B and C.

### 4.8 Import templates

Replace "Sample Buyer", "Sample Customer", `SALE-EXAMPLE-1` and `maria.santos@example.com` with realistic template rows. The template rows are display-only and do not create records.

## 5. Tests

Update the tests that pin old seed values. Where possible, tests read the value from the seed (for example `seed.customers.find(...)`) instead of hard-coding the new name, so later seed edits do not break them.

| Test file | What changes |
|---|---|
| `seed-integrity.test.ts` | Remove the pinned card ID, counters and commission IDs. Keep the structural checks (unique IDs, references resolve, ledger equals verified payments, schedule equals price, sale confirmed exactly when finalized and 25% met). |
| `mock-store.test.ts` | Keep the scope expectations. They stay valid because the existing IDs are kept. |
| `business-flow.test.ts` (about 176 ID references) | Keep `ctr-1` to `ctr-4` and their meaning where practical. Move the pinned amounts and dates to values read from the seed. |
| `customer-lookup.test.ts`, `customer-portal-repository.test.ts`, `customer-portal-page.test.tsx`, `customer-portal-provider.test.tsx` | Read the portal customer from the seed. |
| `business-pages.test.tsx`, `commissions-pages.test.tsx`, `contract-dialogs.test.tsx`, `customer-form-attribution.test.tsx` | Replace pinned names and AA numbers with values read from the seed. |
| `customer-review-pages.test.tsx`, `sales-network-member-detail-page.test.tsx`, `dashboard-page.test.tsx`, `registration-applications-page.test.tsx`, `ost-correction-page.test.tsx` | Same. |
| `igp-repository.test.ts`, `igp-page.test.tsx`, `igp-stage4.test.ts` | Read the IGP project and unit from the seed. |
| `reference-lists.test.ts`, `lists-page.test.tsx`, `promo-pages.test.tsx` | Read outlets and promos from the seed. |
| `audit-repository.test.ts` | Replace the hard-coded total 128 with `SEED_AUDIT_EVENT_COUNT + created`. |
| `mock-credentials.test.ts`, account, staff, role and my-account tests, `roles-page.test.tsx` | Read names and emails from the seed. |
| `redemption-repository.test.ts` | The pinned points table (1,000 weekday and 1,500 weekend) stays. Add the seeded bookings to its setup if it counts them. |

New assertions in `seed-integrity.test.ts`:

1. No seeded string matches `/\b(sample|test user|customer [a-z]\b|lorem|dummy|placeholder|tbd)\b/i`, and none contains `randomuser.me`, `example.com`, `.local` or `.test`.
2. Every collection listed in section 4.6 is non-empty, and every seller identity sees at least one contract, commission and cardholder.
3. With `vi.setSystemTime` at two dates three months apart, the seed has at least one sale confirmation, one verified payment, and one receipt in the last 28 days and in the current month. A seed built on either date must still pass all structural checks.
4. All generated numbers (VIP Number, Series Number, OR, payment reference, AA number, Customer ID) pass their own format validators (`parseIgpSeriesNumber` at `src/modules/igp/rules.ts:73`, and the existing validators for the others).
5. Customer full names, mobiles and emails are unique.

## 6. Build order

One build, in this order, so each step can be checked with the targeted tests before the next:

1. `anchor.ts`, `people.ts` and their generators, with a small test for determinism and format validity.
2. `network.ts` and `staff.ts`, then run `mock-store.test.ts` and the staff, role and account tests.
3. `customers.ts` and `sales.ts`, then the derived-state run (section 4.5), then run `seed-integrity.test.ts` and `business-flow.test.ts`.
4. `operations.ts` and `igp.ts` (section 4.6), then the IGP, promo, redemption and audit tests.
5. Dev identities, credentials and import templates (sections 4.7 and 4.8).
6. Update the remaining tests (section 5) and add the new integrity assertions.
7. Browser verification (section 8).

## 7. Open questions for the owner

These do not block the plan but need an answer before or during the build:

1. **Finance and Customer Growth report.** Doc 01 decides whether Finance sees this report. If Finance is granted it, the seed must give Finance scope to customers. If not, the page needs no change. Check doc 01 first.
2. **Outlet `sample` flags.** Three of five outlets are flagged sample (Teppanyaki Restaurant, Resort Spa, Souvenir Shop). Is the outlet list final? If yes, remove the flag. If not, keep the flag and fill in the rest of each row.
3. **IGP project and owner names.** The plan uses generic invented names. If the owner has real project names approved for the demo, supply them. Real names must not be used without approval.
4. **Public blog dates.** The blog has 11 posts dated up to 2026-11-09. They are static and do not follow the relative clock. Decide whether to leave them.

## 8. Verification

1. `npx vitest run src/data/mock`, then the affected panel tests, then `npm test` in the background. Separate pre-existing failures from new ones (`CLAUDE.md`).
2. `npx tsc --noEmit`, `npm run lint` and `npm run build`.
3. Browser check with the dev server on every route in the page inventory (admin, public and portal). For each tab, confirm rows exist and no placeholder text appears. Repeat as these identities: Super Administrator, Finance, Clerk, HR, GSD, SVD-A, OST-A1, OST-B1, a team C OST, and a portal customer. Capture screenshots of the key pages. The open prototype checks (throttled navigation, forced error and retry, Back on a dirty form, visible keyboard focus; see [16-state-verification.md](../ui-states/16-state-verification.md)) remain separate owner items.
4. Run `git diff --check` and `git status --short`. No Git write operation.

## 9. Out of scope

- Backend, database, emulator, and Firebase work. The real data import is separate (see [Production approved imports](../../02-full-stack/03-production/04-approved-imports-and-readiness.md)).
- New screens, new components, new business rules, or changes to approved decisions.
- Public site copy.
- Live Redemption and Services.

## 10. Risks

| Risk | Mitigation |
|---|---|
| Derived-state functions stamp `today()` and put records in the wrong month | Pass the business date, or patch after the run, and assert the month in the integrity test. |
| Relative dates change generated numbers and break pinned tests | Tests read the numbers from the seed (section 5). |
| The seed becomes slow to build on every page load | Build once per store creation, measure, and keep the volume at the medium size. |
| A realistic name matches a real person | Use common surnames with uncommon combinations, and avoid public figures. |
| Hand-built derived numbers drift from the rules | Do not hand-build them. Use the existing effect functions (section 4.5). |
