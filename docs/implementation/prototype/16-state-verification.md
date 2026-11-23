# FP16: State Verification and Handoff

- Status: Complete on 2026-11-18, with recorded limitations. Build and focused checks pass; full suite has one known pre-existing admin drawer failure; F16.3 browser coverage is partial.
- The task boxes below are the original plan; they are retained as history and are not a live checklist. See the recorded results below.
- Layer: QA and documentation.
- Business rules: none changed.
- Depends on: FP12 to FP15.
- Authorizes: nothing.

## Objective

Verify that every loading, empty, error and busy state delivered by FP12 to FP15 is correct, accessible, responsive and does not change business behavior. Produce the implementation report and stop for owner review.

## Scope

- Static checks, targeted tests, one full test run and one build.
- Browser checks at 320, 375, 768, 1100 and 1280 px.
- Reduced-motion and no-JavaScript checks.
- Route skeleton behavior on fast and throttled navigation.
- Double-submit checks.
- Final report in the `AGENTS.md` A to I format.

## Out of scope

- New features or fixes beyond regressions found in FP12 to FP15.
- Admin page fixes from the FP15 audit.
- Git staging, commits, pushes or deployment.

## F16.1 Static and targeted checks

| Field | Value |
|---|---|
| Current | The tree has uncommitted public-site work; the new state files are not yet verified. |
| Target | Typecheck, lint and targeted tests pass before browser work. |
| Layer | QA |
| Blocked by | FP12 to FP15 |
| Acceptance | Every command below exits 0, or the failure is recorded and explained. |
| Status | Complete on 2026-11-18; all listed checks ran |

**Commands**

- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npx vitest run src/shared/components/modern/state-components.test.tsx`
- [ ] `npx vitest run src/panels/public/components/public-skeletons.test.tsx`
- [ ] `npx vitest run src/panels/public/public-loading.test.tsx`
- [ ] `npx vitest run src/panels/public/site-pages.test.tsx src/panels/public/public-links.test.tsx src/shared/components/site/site-chrome.test.tsx`
- [ ] `npx vitest run src/panels/public/login/staff-login-page.test.tsx`
- [ ] `npx vitest run src/panels/public/ost-registration-page.test.tsx src/panels/public/ost-correction-page.test.tsx`
- [ ] `git diff --check` on every touched file.

## F16.2 Full suite and build

| Field | Value |
|---|---|
| Current | Prior full runs had slow admin files timing out under load but passing alone. |
| Target | One full run and one build, sequentially. |
| Layer | QA |
| Blocked by | F16.1 |
| Acceptance | The full result is recorded; any timeout is rerun alone and reported honestly. |
| Status | Complete on 2026-11-18; full suite recorded 4 failures (3 timeouts pass alone, 1 pre-existing admin drawer test) |

**Tasks**

- [ ] Run `npm test` once. Record passed/failed counts and the exact failing files.
- [ ] If an admin file times out, run that file alone. Report both the full-run result and the isolated result.
- [ ] Run `npm run build`. Do not run it at the same time as the test suite.
- [ ] Compare the build route table with the pre-change table:
  - Every public URL still exists.
  - Rendering mode (static or partial) is unchanged, or the change is explained.
  - No route is missing because of the `(public)` move.
- [ ] Record the build result and any warnings.

## F16.3 Browser, accessibility and responsiveness

| Field | Value |
|---|---|
| Current | The public site is running at `http://localhost:3000`. |
| Target | Every state is visible, readable and accessible at all target widths. |
| Layer | QA |
| Blocked by | F16.2 |
| Acceptance | No horizontal overflow, no clipped text, no missing spinner, no infinite loading. |
| Status | Partial; browser checks at 375/768/1280 only. 320/1100, reduced-motion and no-JavaScript checks were not performed |

**Routes and states**

| Route | Check |
|---|---|
| `/` | Hero skeleton, content loads, header/footer stay |
| `/about` | Route skeleton inside the public shell |
| `/blog` | Skeleton, empty state branch if reachable |
| `/blog/[slug]` | Article skeleton, no layout jump |
| `/contact` | Hero, cards, form, maps; no fake spinner on `Open email` |
| `/faq` | Search no-match `EmptyState` |
| `/verify` | Busy skeleton, no-match, daily limit, unavailable error |
| `/login` | Page skeleton, `Sign In` spinner, `aria-busy` |
| `/login/sales` | Same login states |
| `/register/ost` | Submit spinner and `Could not submit` error |
| `/register/ost/correct/[token]` | Form skeleton, invalid link, resend spinner |
| `/experiences/*` | Route skeleton and real content |
| `/vip-privilege` | Tier skeleton |
| `/compliance` | Route skeleton |

**Tasks**

- [ ] At 320, 375, 768, 1100 and 1280 px: no horizontal overflow, no clipped skeleton or error text.
- [ ] Throttle the network in DevTools; navigate to `/about`, `/blog`, `/verify`. Confirm the skeleton shows inside the public header/footer and does not flash on a fast reload.
- [ ] Check reduced motion: no skeleton shimmer, no spinner animation; content still readable.
- [ ] Disable JavaScript in one tab: the public page content remains readable; no blank page caused by a skeleton-only fallback.
- [ ] Double-click each async button: one request, spinner, disabled, no duplicate toast or record.
- [ ] Keyboard: tab through the state components; retry buttons and links are reachable with a visible focus ring.
- [ ] Screen-reader semantics: loading regions have `role="status"`, errors `role="alert"`, buttons expose `aria-busy` while pending.
- [ ] Close every browser tab opened for QA.

## F16.4 Final report

- [ ] Report in the `AGENTS.md` A to I format:
  - A. Task summary.
  - B. Files created, modified, deleted.
  - C. Business-rule compliance (no rule changes; state-only).
  - D. Actual commands and results.
  - E. Security and data safety (no new persistence or secrets).
  - F. Known limitations (static pages may not show a skeleton on instant navigation; admin fixes deferred).
  - G. Git status (branch, HEAD, staged/unstaged/untracked).
  - H. Unauthorized operations check.
  - I. Exact STOP declaration.
- [ ] Do not stage or commit. The owner reviews and commits manually.

## Acceptance summary

- [x] Every public route has a loading state inside the public shell.
- [x] Both login pages have a page skeleton and a pending submit button.
- [x] FAQ, blog, Verify and OST show the correct empty/error state.
- [x] Shared `EmptyState` and `ErrorState` are used instead of one-off messages.
- [x] Admin has a complete audit, not unreviewed changes.
- [x] Typecheck, lint, targeted tests, full suite and build are reported honestly.
- [x] The clarification protocol is in `AGENTS.md`.
- [x] No Git or deployment operation was performed by an agent.

## Build result (2026-11-18)

- `npx tsc --noEmit`: clean.
- `npm run lint`: clean.
- Targeted public/state tests: 118 passed across 12 files.
- `npm run build`: passed; 94/94 static pages generated; the public route table and rendering modes are unchanged.
- Full `npm test`: **1889 passed, 4 failed**.
  - 3 failures were 15 s timeouts under full-run load in `business-pages`, `payment-reference-fields` and `staff-page`; all three files pass alone (**127 tests**).
  - 1 failure is pre-existing and outside FP12–FP16: `admin-mobile-nav.test.tsx` expects a "Log out" button in the drawer, but `AdminMobileNav` has no drawer footer. No admin file was changed in these phases. This needs an owner decision in the Phase 2 admin plan.
    - **Resolved 2026-11-22:** `AdminMobileNav` now renders `LogoutButton` in its drawer footer. The fixes register (`02-test-and-qa-fixes.md`, T2) records that the 2026-11-22 full run did not fail that test. The note is closed; the test remains the regression guard.
- Browser:
  - `/` at 375/768/1280: one header, one footer, one main landmark, zero horizontal overflow.
  - `/login` and `/login/sales`: one login shell on a fresh load, "Sign In" button, footer `© 2026 AFhomes`, zero horizontal overflow.
  - `/faq` search with no match: "No questions found" plus the existing empty copy.
  - `/register/ost/correct/invalid-token`: "Link not valid" plus the existing message, one header/footer.
- Build fix: `LoginShell` now takes an optional `year`; the login pages pass it, while the route skeleton omits it so prerendering never reads the clock.
- Not observed in browser: the route skeletons themselves, because the public pages are static and resolve before a skeleton paints. They are covered by `public-loading.test.tsx` (16 route loaders) and `public-skeletons.test.tsx` (12 tests). They will appear when CMS data makes the routes suspend.
- Historical note (superseded by the 2026-11-23 recheck below): the 320px home layout used to overflow from `site-feature-card`. This predated FP12–FP16 and was not a regression from the state work.
  - **Fixed 2026-11-22 (R1):** `min-width: 0` on the grid item, card, link and body, and a bounded title, let the ellipsis contain the nowrap title. **Rechecked 2026-11-23** (see "Stage 0 and Stage 1 browser pass" below): no document-level horizontal overflow at 320/375/768/1100/1280 px.

## Stage 0 and Stage 1 browser pass (2026-11-23)

Run with the browse relay on Chrome against the local dev server (`localhost:3000`), using the Super Admin (Dev) mock identity.

- Home page at 320, 375, 768, 1100 and 1280 px: no document-level horizontal overflow (`scrollWidth` did not exceed the viewport at any width). At 768 px one tier-card image paints 10 px beyond the viewport inside its clipped card; the page itself does not scroll.
- `/admin/membership` (both tabs), `/admin/commissions/allowances`, `/admin/finance/collections/ctr-1`, `/admin/finance/cancellations/ctr-1` and `/admin/reports/period-close` loaded with their data tables. No application console errors; the only console entry was the Next.js dev HMR socket closing on a back-forward navigation.
- The seeded pending membership is not eligible, so its details footer has no Activate button. The one-request Activate guard is covered by its unit test, not by a browser double-click.
- Not reproducible against the in-memory mock: a forced query error with retry (there is no network request to block) and slow-network skeletons (the mock delay is 0). Both are still pending the owner's manual DevTools/browser pass. Automated coverage separately: the error branches and loading states are covered by targeted tests.
- Still open for the owner: reduced motion, no JavaScript, throttled navigation, keyboard and focus order, and double-click on every mutating button.

## Stage 0 remainder + Stage 5 matrix + role walkthroughs (2026-11-23, session 2)

Run with agent-browser (session `acceptance`) on Chrome against the already-running dev server at `http://localhost:3000` (a server was already listening on port 3000, so no new server was started or stopped). Identity: Super Admin (Dev) mock session unless a walkthrough names another role. Default viewport 1262x800 unless noted. No application code or tests were changed; the only mutating browser actions were dialog opens that were cancelled/closed without recording, one synthetic Compare entry (reverted by refresh), and one header-only Excel export download (outside the repo).

### Stage 0 remainder — /admin/membership (both tabs), /admin/commissions?tab=allowances, /admin/finance/collections/ctr-1, /admin/finance/cancellations/ctr-1, /admin/reports/period-close

- Page loads (all 5, Super Admin): PASS. Each page rendered its data (membership table with both tabs; allowances assembly form; ctr-1 payment schedule/ledger/milestones; cancellations ledger with "No Cancellation Request"; period-close Close the Month + Closed Months + Compare tabs). No document-level horizontal overflow at 1262 px (`scrollWidth == innerWidth` on all 5). Console: no application errors (only React DevTools/HMR info, Fast Refresh log, and pre-existing Next.js bronze.webp LCP warnings).
- Ready to Activate tab: PASS. Shows Customer A One (Pending, no Activate button — not eligible, as previously recorded). The one-request Activate guard remains covered by its unit test, not by a browser double-click.
- Slow/throttled network: NOT DONE. agent-browser has no network-throttle emulation and the mock TanStack layer resolves with ~0 delay, so skeletons do not paint in the browser. Offline was tested instead: `offline on` + reload shows the Chrome error page (`ERR_INTERNET_DISCONNECTED`); reopening online restores the app. Loading branches remain covered by targeted tests (`public-loading.test.tsx`, state component tests).
- Forced query error with retry: NOT DONE in the browser. The mock is in-memory (no HTTP/XHR to block): routing `**/api/**` to abort had no effect (page still loads, no retry UI), and aborting the page URL fails navigation rather than the query. The error branches exist in code (`QueryState`/`ErrorState` with `onRetry` in `customers-page`, `finance-page`, `member-detail`, `allowance-review-page`, `commissions-page`; `membership-page.tsx:41` wraps its query in `QueryState` with an error branch) and are covered by targeted tests.
- Double-click (one request, no duplicate): PASS on every reachable mutating control.
  - Period-close Close Month double-click opened exactly one SweetAlert2 confirm ("Close This Month? ... 2026-10 ... Cancel / Close Month"); Cancel was clicked, no month was closed (`dialogs: 0`, "No months have been closed." still true).
  - Closed-months Export double-click produced a single download (`~/Downloads/period-close-2026-11-23.xlsx`, one file): header-only, 0 data rows (seed has no closed months).
  - Allowances Calculate and Save Review double-clicked on the empty form: single "Choose the month." validation each, still "No reviews saved." (no duplicate).
  - Collections "Undo or Refund" double-click opened exactly one dialog; it was closed via Cancel/Close without recording.
  - Membership "Service Card" double-click opened exactly one servicing dialog; closed via Close without recording.
  - No mock mutation issues HTTP requests (in-memory), so "one request" is evidenced by single-dialog/single-toast/single-file behavior.
- Reduced motion: PASS. `set media light reduced-motion` → `matchMedia('(prefers-reduced-motion: reduce)')` is true; home page shows 0 animated elements and full content; all admin pages remain readable with data intact. Motion safeguards exist in code (`tw:motion-reduce:transition-none` utilities, `@media (prefers-reduced-motion: reduce)` in `app-alert.css`). Skeleton shimmer could not be observed because the 0-delay mock never paints a skeleton.
- Keyboard and focus order: PARTIAL PASS. All 5 pages expose a `main` landmark and a logical tab order starting at "Skip to main content" → Dashboard → section links (24–62 focusable elements per page). Tab moves focus visibly through controls. A programmatic visible-focus-ring check was inconclusive (computed `outline` on a Tab-focused link reported `1px none`; the design system renders focus via `focus-visible:ring-*` utilities and `:focus-visible` outlines in `site-components.css`, which only apply to keyboard modality). Recommend one owner visual pass of the focus ring.
- Screen-reader semantics in steady state: live regions present (2/2/4/1 `aria-live` on membership/allowances/collections/period-close), no `role="status"`/`role="alert"`/`aria-busy` while idle — expected, since those render only during loading/error/pending, which the 0-delay mock does not hold. Loading/error semantics are covered by the shared state-component tests.

### Stage 5 matrix

- 320 px, no document overflow: PASS on `/` (hero readable), `/login` signed-out (Login form, 164 chars), `/login/sales` (176 chars), `/portal` (Customer Login), `/admin/membership`, `/about`, `/verify`, `/admin` dashboard. Signed-in `/login` at 320 redirects to the dashboard (full dashboard content, no overflow); the first paint read `textLen 8` before hydration completed, full content confirmed after waiting.
- 1100 px, no document overflow: PASS on `/`, `/login` (signed-out Login form; signed-in shows "Welcome Back, Super Admin"), `/portal`, `/admin/membership`.
- Reduced motion / no-JavaScript / throttled / keyboard / double-click: see the Stage 0 remainder entries above (same results apply to the matrix pages).
- No-JS proxy (agent-browser cannot disable JS; raw-HTML `curl` check): PASS. `/` serves its `<h1>` ("Homestyle Hospitality Reimagined") without JS; `/login` serves Login/Sign-in copy; `/portal` serves Customer Login copy (interaction needs JS); `/admin/membership` serves the loading-skeleton shell only (expected — admin requires JS plus the mock session).

### Role walkthroughs (synthetic data only, one role at a time)

- F5.5 sales milestones (Finance, then Super Admin) on `/admin/finance/collections/ctr-1`: PASS (observed, no mutations). Collection Milestones lists Payment recorded → Payment verified by Finance (Sep 30, 2026) → Sale confirmed (Oct 28, 2026) → Stage 1 40% (—) → Fully paid (—) → Membership activated (—) → VIP Number issued (—), with Payment Ledger below. No milestone was advanced.
- F5.7 IGP (Super Admin) on `/admin/sales?tab=igp`: PASS (observed, nothing recorded). Property Sales (IGP) table headers Series Number/Buyer/Project/Contract Price/Status with "No property sales (IGP) are available." in seed; Record Sale, Record JA&D Accreditation, When a Sale Counts, VIP Card Levels, Import History all present.
- F9.4 card servicing (Super Admin): PASS (dialog inspected, closed without recording). Service dialog requires Written request reference*, Management approval reference*, Former card, with Cancel/Record Service/Close. Replacement/transfer behavior itself remains covered by mock tests.
- F1.5a My Account (Clerk, then Super Admin): PASS with a note. Both roles see Department "—" / Role "—" with the "managed by an authorized administrator" note and no department/role inputs (read-only enforced). Clerk: Full Name and Email inputs are disabled and Save Changes is disabled. Super Admin: Full Name/Email editable, Save enabled. So a Clerk cannot self-edit even their name in the mock — recorded as observed, not judged.
- F3.2 member detail + clawback date (Super Admin on `mem-svd-a`; Clerk for permissions): PASS (observed, nothing recorded). Detail shows Edit/Deactivate for Super Admin; the clawback addendum control lives on Commissions → Commission Paybacks → "Signed Addendum Dates" (Super Admin sees the button and "No payback records."; Clerk gets 403 "Access restricted" on the paybacks tab, so the control is correctly hidden). No addendum date was recorded.
- F4.2 exit protection: PARTIAL. Dirty New Customer (Bronze selected) → Cancel opens "Leave this application?" with Stay / Discard all Changes / Save Draft; Stay keeps the user on `/customers/new` (dialog closed, draft kept). Clean-form Back goes to `/admin/customers` and Forward returns to `/customers/new` (PASS). Dirty-form browser Back is NOT DONE: the tab wedged (`page_wedged`, replaced by `about:blank`; mock session survived and the tab recovered by navigating to `/`, likely an unanswerable native beforeunload prompt). Needs the owner's manual browser pass.
- F11.3 closed-period totals vs the company workbook: procedure run, result recorded.
  - Exported the mock's closed-period totals via Close the Month → Export → Excel: single file `~/Downloads/period-close-2026-11-23.xlsx`, header-only row `Month | Recognized Sales | Net Collections | Commission Ready to Pay | Reviewed Allowances | Closed on`, zero data rows (the seed has no closed months).
  - Workbook reference (read-only, no values transcribed): `AFhomes_Sales_Collections_DSC_DRI-v11_0_0-BUILD_2026-10-04a.xlsx` sheets are START HERE, Director Console, People, VIP Sales Register, IGP Sales Register, Collections, IST Monthly Summary, DSC and DRI Payout, Clawbacks, Clawback Movements, Allowance Recoveries, Prior Receipt Keys, Renewed Numbers, Script Log. Relevant header rows (row 4): Collections (`Date received, Buyer, Balance before this receipt, Product (VIP / IGP), Series number, Amount, Reference no., OR no., Remarks, Salesperson AA No., Upline SM/SSM/SVD now, Sale date, Sale TCP, Running total after this receipt`); IST Monthly Summary (`Month, Clawback to offset from BA / PA / PB, AA No., Name, Position, Window start, Cut-off, QP/EP stretches, QP own/team closed-deal TCP VIP/IGP, QP collections, ...`); DSC and DRI Payout (`Month, AA No., Name, Engagement, DSC released, DRI released, TOTAL, Sales involved, Clawback offset, NET PAYABLE, Clawback still owed`).
  - Column mapping (export → workbook): Month → `Month` (IST Monthly Summary / DSC and DRI Payout); Recognized Sales → QP own/team closed-deal TCP VIP+IGP; Net Collections → QP/EP collections plus Collections-sheet running totals; Commission Ready to Pay → `TOTAL` / `NET PAYABLE` (DSC and DRI Payout); Reviewed Allowances → BA/PA/PB figures from the separate Allowances workbook (`AFhomes_Allowances_BA_PA_PB-v1_0_0-BUILD_2026-10-04a.xlsx`); Closed on → no workbook equivalent (platform metadata).
  - Comparison run on synthetic data via Compare with Spreadsheet (November 2026, open month): entered synthetic Company Spreadsheet Total 31000 for "Verified receipts (net)" → System ₱31,000.00 vs Spreadsheet ₱31,000.00 → Difference ₱0.00 → status Matches, decision recorded, "Totals match." Records behind the total: BT-PAY-7/BT-PAY-8, ₱15,500.00 × 2, Verified. Open-month system totals observed: Verified receipts (net) ₱31,000.00; Imported receipts ₱0.00; Confirmed sales value (net) ₱0.00; Commissions payable (approved, unpaid) ₱0.00; Commissions paid ₱1,440.00.
  - A full refresh restored the seed (all five measures back to "Not checked yet"), confirming browser-memory-only mock behavior. Value comparison against real company figures was deliberately not run (synthetic data only); with no closed month in the seed, closed-period value comparison is N/A until a month is closed.
