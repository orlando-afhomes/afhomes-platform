# 06 Prototype Completion Plan

Created 2026-11-23 from a review of `docs/implementation/` (roadmap, FP1 to FP16 records, decision register and fixes 01 to 05) against the code at HEAD `41e4e2f` plus the Batch 1 work, since committed as `6ea21df`. It is a roll-up and a sequence. It authorizes nothing: each stage needs the owner's approval before work starts (AGENTS.md section 7), and the detail of each item stays in the file it links to.

## Where the prototype stands

- Nearly every feature card in `prototype/01` to `11` is `Exists` or `Implemented in mock`. Only F7.4 is `Partial`, F6.5 is `Partial`, F2.5 is `Missing` (backend) and F2.6 is `Deferred`.
- The 2026-11-22 owner decisions (file 05) are built in the mock.
- UI state hardening (FP12 to FP16): public site and login done; admin Batch 1 built, Batch 3 built and verified 2026-11-23; batches 2 and 4 open.
- Browser checks and role walkthroughs (file 02): widths and page loads verified 2026-11-23 (Stage 0 partial); manual checks open.

"Finished" for the prototype means: stages 1 to 6 below are done and recorded, with backend, real login and the CMS left as separately authorized work (stage 7).

## Stages

| Stage | Work | Source | Needs |
|---|---|---|---|
| 0 | Close Batch 1: browser acceptance and record it (run 2026-11-23; 4 owner-manual items remain) | 01, 02 | Procedure complete; owner-manual items recorded in 16-state-verification.md |
| 1 | Admin Batch 3: Close Month busy state and double-submit guard, report export, regression check of audit logs and import (built and verified 2026-11-23) | 01 | Done; was highest risk (irreversible action) |
| 2 | Admin Batch 2: customer and sales records error states (built 2026-11-23, uncommitted) | 01 | Built; owner review and commit |
| 3 | Admin Batch 4: organization, staff, settings, promos error states (built 2026-11-23, uncommitted) | 01 | Built; owner review and commit |
| 4 | Mock feature gaps G1 to G5, plus the two IGP leftovers (built 2026-11-23, uncommitted) | 03, 05 | Built; owner review and commit |
| 5 | Browser checks and role walkthroughs (run 2026-11-23; 4 owner-manual items remain) | 02 | Procedure complete; owner-manual items open |
| 6 | Document drift D1 to D8 and the roadmap status refresh (this pass, 2026-11-23) | 04 | Built; owner review and commit |
| 7 | Outside the prototype: real login, CMS, database, deployment | decisions register | Separate owner authorization |

**Recommended next step: owner review and commit.** Stages 0 to 6 are built (working copy, uncommitted); Stage 7 stays separately authorized. The 4 owner-manual browser items (throttled nav, browser forced-error, dirty-form Back, focus-ring visual) are recorded in 16-state-verification.md.

## Stage 0: Close Batch 1

Built and committed by the owner as `6ea21df`: Activate busy state and double-click guard, Save Review busy state, contract load error branch with retry, a data-error gate when payments or memberships fail on first load, 320 px home overflow fix, and the matching tests (46 of 46 targeted tests, `tsc`, lint and build passed at the last report).

Verified 2026-11-23 (partial, recorded in `prototype/16-state-verification.md`): home page at 320, 375, 768, 1100 and 1280 px with no document-level horizontal overflow; `/admin/membership` (both tabs), `/admin/commissions/allowances`, `/admin/finance/collections/ctr-1`, `/admin/finance/cancellations/ctr-1` and `/admin/reports/period-close` loaded with data and no application console errors.

Remaining:
- Browser pass on `/admin/membership`, `/admin/commissions/allowances`, `/admin/finance/collections/[id]`, `/admin/finance/cancellations/[id]`: slow network, forced error with retry, double click sends one request, reduced motion.
- Owner manual checks: reduced motion, no JavaScript, throttled navigation, keyboard and focus order, and double-click on every mutating button.

## Stage 1: Admin Batch 3 (reports, audit, period close)

Built and verified 2026-11-23 (uncommitted at the last handoff):
- `/admin/reports/period-close`: the page button shows a visible loading state (`loading`, `aria-busy`/`aria-disabled`) while the request is pending; the confirmation dialog keeps its spinner. A double-click sends exactly one request.
- The shared `useConfirmRun` now blocks a duplicate confirm with a ref guard (every confirm action, not only month close).
- The shared `ReportExport` trigger shows loading feedback (`loading={busy}`) and ignores a second export while busy.
- Regression check only: `/admin/audit-logs`, `/admin/reports/historical-import`.
- Tests: `confirm-tones.test.tsx`, `reports-pages.test.tsx` (targeted Stage 1 run across five suites: 51/51 passed, per the handoff and the independent review).

## Stage 2: Admin Batch 2 (customers and sales)

Nine routes: `/admin/customers` (empty wording S5), `/admin/customers/[id]`, `/admin/customers/[id]/edit`, `/admin/sales/contracts/[id]`, `/admin/sales-network`, `/members`, `/registrations`, `/members/[id]`, `/genealogy`.
- Never show a failed query as "not found".
- `/admin/sales/contracts/[id]` is already covered by the shared contract frame work; confirm it with a test.
- Wrap the three list tables in `QueryState` with `onRetry`.
- Tests: `customer-review-pages.test.tsx`, `sales-network-pages.test.tsx`, `sales-network-member-detail-page.test.tsx`, `registration-applications-page.test.tsx`.

## Stage 3: Admin Batch 4 (organization, staff, settings)

`/admin/organization`, `/staff`, `/departments`, `/roles`, `/settings/lists` and the VIP Products Lists tab (fix once in `ListsPage`), `/vip-products/scheme-guide` (empty state), `/account` (surface the profile error), `/promos` and `/promos/points`.
- Decide S6 and record it in `docs/development/frontend.md`. The guide already lists `useConfirmRun` as an approved confirmation wrapper, and Admin pages use it today. Confirm the convention for future Admin work or approve adopting `useActionRunner`.
- Tests: `staff-page`, `departments-page`, `roles-page`, `lists-page`, `my-account-page`, `promo-pages`.

## Stage 4: Mock feature gaps

| Item | Work | Rule | Risk |
|---|---|---|---|
| G1 / F6.5 | Unmatched receipt intake into the exceptions tab; Finance matches or rejects; duplicate OR numbers refused (built 2026-11-23, incl. clerk intake from the contract Payments tab) | Doc 07 | Medium |
| G2 / F7.4 | Exception after disbursement or in a closed month: first open month, history kept, clawback raised if paid (built 2026-11-23, with clawback escalation for the open-month case) | Docs 07, 08, 13 | High (money) |
| G3 / F8.6 | Assemble BA, PA and PB inputs from closed-month data; compare with the workbook (built 2026-11-23; reviewer allocates Qualifying/Extended split, inherited-credit and unattested-filter notes surfaced) | Doc 08 section 15 | High |
| G4 / F11.5 | Super Administrator sign-off after a month closes with no unexplained differences (built 2026-11-23) | Doc 11 | Medium |
| G5 | Tick or list gaps in `customer-portal-plan.md` (audited 2026-11-23: 21/28 ticked; 7 Step-2 RED boxes left for process trust; gap list returned) | Plan file | Low, no rebuild |
| IGP-1 | Membership record for IGP buyers (built 2026-11-23 to the owner-authorized recommendation: created on Formal VIP Grant signing, frozen price tier, no VIP Number, no Stay Points; grant benefits beyond the tier remain undefined) | Doc 14 | Built; doc-14 amendment proposed for owner sign-off |
| IGP-2 | IGP history import with SUPERSEDED-names-Replaces validation (built 2026-11-23) | Decision 2, file 05 | Built; owner review and commit |

Each build item: typed repository method, panel, one test per rule, audit event for sensitive actions, then `npx tsc --noEmit`, lint, targeted tests, build.

## Stage 5: Browser checks and role walkthroughs

Browser checks (file 02): 320 and 1100 px on public, login, portal and admin; reduced motion; no JavaScript; throttled navigation; keyboard and focus; double click on every mutating button.

Role walkthroughs, one role at a time, synthetic data: F5.5 sales milestones, F5.7 IGP, F9.4 card servicing, F1.5a My Account, F3.2 member detail and the clawback date, F4.2 exit protection, F11.3 closed-period totals against the official workbook (F11.3 run 2026-11-23 on synthetic data against AFHomes_Sales_Collections_DSC_DRI-v11_0_0-BUILD_2026-10-04a.xlsx; 4 owner-manual items remain open).

## Stage 6: Document drift

- D1: done 2026-11-23 — F5.5 corrected to the counted-ledger stamping; the AGENTS.md open-items summary reconciled under explicit authorization; the decision-register D-B note kept.
- D2: done 2026-11-23 — F3.7 corrected: no public Valid Until for any class; staff screens show it.
- D3: done 2026-11-23 via G5 — 21 of 28 portal boxes ticked with behavioral evidence; 7 Step-2 RED boxes left unticked (process trust); gap list returned.
- D4: done — drawer logout closed 2026-11-22 (T2); the FP16 summary refreshed in `docs/implementation/README.md` with the 2026-11-23 browser results.
- D5: done 2026-11-23 — the implementation README status, M5–M8/M10–M11 rows, build status, IGP sequence and F8.5 refreshed to the 2026-11-22/23 decisions and builds.
- D6: done 2026-11-23 — 63 Admin `page.tsx` files (62 at audit; the +1 is `/admin/experiences`, covered by the G5 behavioral audit); Batches 2–4 covered the rest.
- D7: done 2026-11-23 — verified: no stale wording remains (Ant Design mentions are removal notices, supersession notes or prohibitions; documentation-only notes are per-document disclaimers or historical change scopes).
- D8: owner-only note; outside the platform — not touched.

## Open items that do not block frontend work

- Done 2026-11-23: counted-date stamping and the payout-list month-close requirement verified in code and reconciled in F5.5, decisions-and-gaps.md and AGENTS.md; walkthroughs run under Stage 5.
- Future stack checks live in the [Firebase implementation roadmap](../firebase/README.md), including the hosted SQL Connect transaction pilot, App Hosting compatibility, and production domain, location, and sizing.
- Legal and the Data Protection Officer review of the retention schedule, privacy wording and the clawback addendum before real payouts.
- Points-per-night table is the owner's working set until the company issues its own.

## Verification for every stage

`npx tsc --noEmit`, `npm run lint`, targeted `npx vitest run <path>`, `npm run build`. Run the full suite once at the end of each stage and separate load timeouts from real failures. Browser checks follow `prototype/admin-ui-state-audit.md` ("How to verify a page"). Report only real results.

## Execution Recommendation

- Stages 0 to 3, 5, 6: Sonnet 5.5, medium effort.
- Stage 1 (Close Month) and Stage 4 G2, G3: Sonnet 5.5, high effort; Opus 5.5 high only if money rules prove ambiguous.
- Ultracode: OFF. One stage per session.
