# Save Session — Instructions and Latest Snapshot

Authoritative workflow for `/save`. Part A is permanent. A `/save` run replaces only the text between the two snapshot markers in Part B. Never edit Part A, the markers, or anything outside them.

## Part A — Permanent instructions

`AGENTS.md` governs. Saving is documentation only: it does not authorize implementation. Never run Git write operations (no add, commit, push, pull, merge, checkout, switch, reset, clean, stash, tag).

### Steps

1. Review the conversation context actually available. If the context was compacted or a file was unreadable, say so in the snapshot. Never fabricate missing context.
2. Extract decisions, instructions, requirements, and approvals; completed and ongoing work; pending tasks, unresolved problems, blockers; architecture and business-rule decisions; files created, modified, or removed this session; verification results, errors, and known failures; the recommended next action.
3. Inspect the working tree with read-only commands only:
   ```bash
   git status --short
   git branch --show-current
   git rev-parse --short HEAD
   git diff --stat
   git diff --cached --stat
   git diff --name-status
   git diff --cached --name-status
   git ls-files --others --exclude-standard
   ```
   Read individual diffs only when needed to understand unfinished changes.
4. Record staged, unstaged, and untracked changes separately. Do not assume every change belongs to this session; mark each as this-session, pre-existing, or unknown.
5. Build the snapshot using the structure below.
6. Edit the file so only the text between the SESSION_SNAPSHOT_START and SESSION_SNAPSHOT_END HTML comment markers in Part B changes (the only literal marker lines are in Part B). Replace the previous snapshot; never append a second one. If either marker is missing, stop and report; do not create markers or edit elsewhere.
7. Read the file back. Confirm the markers occur exactly once each, Part A is unchanged, all nine sections are present, and the content is complete. Report "saved" only after this check passes.
8. If the write is denied or fails, keep the previous snapshot, report the failure, and ask for approval or a mode change. Do not bypass permissions.

### Content rules

- Concise but sufficient to resume without losing critical information. Preserve exact identifiers, decisions, and error text where they matter.
- Reference paths instead of copying documentation, source, large diffs, or conversations.
- Exclude secrets, environment values, credentials, tokens, and unnecessary personal data.
- Distinguish verified facts from assumptions. Write "not performed" for checks that were not run.
- Final reply to the user: files and Git state saved, verification of the readback, limitations. Keep it short.

### Snapshot structure

```markdown
# Latest Session Snapshot

## 1. Session Metadata
- Saved at:
- Repository:
- Branch:
- HEAD:
- Session objective:
- Development phase:

## 2. Current Project State
- Verified implementation status
- Relevant modules and architecture
- Current development focus

## 3. Important Decisions
- Approved decisions
- Business-rule decisions
- Architecture decisions
- Restrictions and assumptions

## 4. Completed Work
- Implemented changes
- Relevant files
- Actual verification results

## 5. Git Working Tree
- Staged changes
- Unstaged changes
- Untracked files
- Deleted or renamed files
- Relevant unfinished work

## 6. Pending Tasks
- Remaining implementation
- Open bugs
- Unresolved decisions
- Blockers

## 7. Verification State
- Tests
- Lint
- Typecheck
- Build
- Browser QA
- Known failures
- Checks not performed

## 8. Next Session Instructions
- Recommended first action
- Relevant files to inspect
- Required approvals
- Important warnings

## 9. Execution Recommendation
- Phase
- Recommended next mode
- Recommended model
- Effort
- Ultracode
- Token optimization
- Reason
```

Use the global Execution Recommendation policy for section 9; do not create a separate routing policy.

## Part B — Latest Session Snapshot

<!-- SESSION_SNAPSHOT_START -->
# Latest Session Snapshot

## 1. Session Metadata
- Saved at: 2026-11-16
- Repository: afhomes-platform (remote not re-checked)
- Branch: develop
- HEAD: 3f95316 "feat: add approved VIP position commission rates" (verified this run; the owner's commit of 2026-11-16 09:30). Earlier owner commits: a50ba7e, ab03220 (holds the 2026-11-15 26-item UI redesign), b9089f0. Origin shows no ahead/behind marker locally (no fetch run). Push state not verified.
- Session objective: (1) 2026-11-15: the owner's 26 UI problems from `docs/ui-redesign` were built and committed by the owner (ab03220, b9089f0). (2) 2026-11-16: the owner said the system has too many processes and clicks and asked for a fast, simple solution using KISS, YAGNI and boring technology. Two read-only maps and a plan were made; the plan was approved and built with subagents (milestones M1 to M8).
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion.
- Context note: the context was compacted once earlier in the session. Models used: Opus 5.5 and Sonnet 5.5 (the owner switched with /model); subagents were Sonnet 5.5 except M2 and M5 (Opus 5.5, owner-approved recommendation). Plan file: `C:\Users\SSD-ORLANDO\.claude\plans\1-docs-ui-redesign-screenshot-2026-11-15-peaceful-gizmo.md` (now holds the 2026-11-16 simplification plan, M0 to M8). The owner wants every reply in "explain like I am 5" language and the nickname Dos first. Agent briefs lived in this session's scratchpad (`simplify-brief.md`) and may be gone.
- Another effort's uncommitted work shares the working tree (see section 5). Agents were told to use targeted edits only and never revert it.

## 2. Current Project State
- All milestones of the 2026-11-16 simplification plan are built (not committed): M1, M2, M3, M4, M5, M6 (small version), M7, M8.
  - M1 `row-actions-menu.tsx`: a row with exactly one action shows that action as a direct button, no "..." menu (`toneButtonVariant` exported).
  - M2 "Approve deal": `src/modules/contracts/application/approve-deal.ts` (+ test) runs, idempotently and each with its own audit event: approve customer, approve sale, record signed agreement (issues the VIP Number), finalize (only when no hold). Checks first: contract submitted/under_review/finalized, no open cancellation, no missing commission rate. Returns `finalizeHeld` reasons. `useApproveDeal` in `business-queries.ts`; `sales-contract-actions.ts` has one green "Approve deal" (confirmation kept); `startReview` removed from contract and payment repositories (status `under_review` kept for old data); old actions approve-sale, finalize, record-signed-agreement, start-review removed; `RaDialog` deleted; Non-Standard hold text fixed in `src/modules/contracts/rules.ts` (hold itself stays until doc 05 §10.2 is built).
  - M3: `register-customer.ts` also submits the contract; prepare dialog has no typed due dates and asks the scheme only when missing; acceptance asked once; Standard (S) default in `customer-form-sections.tsx` `toDraft`; wizard success is a toast plus redirect instead of a 3-second pop-up.
  - M4 Receipts: `payment-actions.tsx` Verify is a direct green button, no confirmation (possible-match reason dialog kept); Start review removed from the UI; form defaults to next unpaid line and today; Finance tabs now Receipts (key `verification`, Show: Waiting/Exceptions/All), Month-end close, Reconciliation (plus Collections, Cancellations for Finance role); `finance-payments-page.tsx` deleted; Admin dashboard shows the receipts queue (`admin-dashboard.tsx` permission check).
  - M5 Payouts: `buildPayoutList` in `commission-effects.ts`, called by `closeMonth`; `CommissionPayoutBar` (Approve list, Record payout for all ready (N), Confirm all disbursed (N)); `useBulkCommissionPayout` appended to `business-queries.ts`; Payouts tab merged into Commissions; the Clerk no longer sees the Commissions area.
  - M6 (small): Activate membership has no confirmation (`membership-table.tsx`); Record card claim keeps it.
  - M7: sidebar item "VIP Products" renamed "Settings" (route `/admin/vip-products`, key unchanged) with tabs Products, Payment schemes, Tier levels, Points table, Holidays, Venues, Lists, Historical import, IGP projects; Scheme guide moved to Sales; Finance Holds became the "On financial hold" option in the Collections status filter (`finance-holds-page.tsx` deleted); old routes redirect via `redirectToAreaTab`; `module-nav.ts` destinations updated.
  - M8: `src/panels/admin/dashboard/clerk-dashboard.tsx` plus a "clerk" kind in `resolve-dashboard.ts`: a to-do list with returned receipts, contracts and customers to fix.
- Docs updated by this session: `docs/implementation/decisions-and-gaps.md` (UI11 to UI18), doc 04 item 24, doc 05 items 26 to 31, doc 06 item 10, doc 07 items 4 to 6, doc 08 (2026-11-16 amendment, bulk payouts), doc 12 (2026-11-16 amendment).
- Current focus: owner review of the uncommitted files and answers to the open decisions; then commit by the owner.

## 3. Important Decisions
- Owner decisions of 2026-11-16 (via questions): wait for the other work to be committed (the owner later said "Start" anyway, so work began on top of the uncommitted tree); pain areas = new customer to card, receipts, month-end payouts, too many menus; one "Approve deal" button; keep confirmations only for risky actions (money out, cancel, delete, close month); when a row has only one action show that button directly; build M1, M3, M4, M6, M7, M8 first, then M2 and M5 ("proceed").
- Recorded as UI11 to UI18 in `docs/implementation/decisions-and-gaps.md`. Business rules kept: Clerk enters / Finance approves each receipt; sale approved before receipts; activation is its own event; card claim date; rates confirmed before a VIP Number (doc 08 §9.1); payout list approved, payouts recorded, disbursement confirmed, duplicate guard; every event stays audited.
- Earlier owner decisions still binding: UI5 to UI10 (button colors by purpose, no underlines, em dash for empty, one value per column, plain wording, tier levels and IGP catalog admin-managed), A1 to A8 of 2026-11-12. Only the owner commits or pushes; SweetAlert2 only through `AppAlert`/`useConfirmRun`; mock data in browser memory only; no new dependencies; tokens in `src/theme/tokens.css` unchanged; max 5 table columns.
- Not decided and not built: Non-Standard approval flow (doc 05 §10.2); seller grants `sales-network.manage/transfer/status` (`permissions.ts`); Add IST/OST limited to Super Admin; two-person rule for cancellation; Admin lacks `finance.refund`; activation copying `active_member` into the customer status (doc 04 §8).

## 4. Completed Work
- 2026-11-15 UI redesign: committed by the owner (ab03220, b9089f0); see decisions UI5 to UI10.
- 2026-11-16 simplification: M1 to M8 as listed in section 2, built by subagents and verified (section 7).
- Small fixes made by the main session: Finance dashboard links (`tab=verification&show=all`, `tab=commissions`) in `finance-dashboard.tsx` and `dashboard-page.test.tsx`; `permissions.test.ts` (Lists now under Settings); doc amendments.
- Files created: `src/modules/contracts/application/approve-deal.ts` and `.test.ts`, `src/panels/admin/dashboard/clerk-dashboard.tsx`. Files deleted: `finance-payments-page.tsx`, `finance-holds-page.tsx` (contract-review pages were deleted by the other effort).
- Browser QA done for the new work (agent-browser, mock accounts, desktop 1440 and phone 390): Receipts Verify, Settings tabs, old-link redirects, Clerk to-do list, Approve deal end to end (a missing rate stops it with a clear message; after setting the rate it issued a VIP Number and showed separate audit events), payout bar.

## 5. Git Working Tree
- Staged: none (verified).
- Unstaged: 113 files changed, 1701 insertions, 1280 deletions (verified, `git diff --stat`). Counts by folder: `src/panels/admin/pages` 26, `src/panels/admin/components` 16, `src/panels/admin` 13, `src/data/mock` 7, `docs/business-rules` 6, `src/shared/components/modern` 5, `src/panels/admin/dashboard` 5, `src/panels/admin/actions` 4, `src/modules/notifications` 4, `src/shared/components/admin` 3, `src/modules/contracts` 3, `src/data/contracts` 3, `src/shared/providers` 2, `workflow` 1. Git only warns about LF to CRLF.
- Untracked: 3 files (verified): `src/modules/contracts/application/approve-deal.ts`, `approve-deal.test.ts`, `src/panels/admin/dashboard/clerk-dashboard.tsx`.
- Deleted (unstaged): `contract-review-detail-page.tsx`, `contract-review-page.tsx` (other effort), `finance-holds-page.tsx`, `finance-payments-page.tsx` (this session). No renames. Stash `stash@{0}` "local: sales-network cleanup + member detail redesign" is still kept.
- Origin of the changes: a mix. Mine: M1 to M8 and the doc amendments listed above. Not mine: an earlier uncommitted effort (before this session's M-work) that merged the contract review into `sales-contract-detail-page.tsx`, removed the "Contract review" tab, grouped the sidebar (`admin-nav-list.tsx` NAV_GROUPS: Money, Member services, Management, Reports and audit), and changed notifications, `area-page.tsx`, `tab-bar.tsx`, `use-tab-param.ts`, `admin-tabs.tsx` and the customer detail "Prepare contract / New VIP purchase" rule. Several files hold both. The owner has not reviewed any of it. It could not be separated per file, so review the whole tree together.

## 6. Pending Tasks
- Owner to review and commit the uncommitted files (owner only). Build was not run.
- Two tests fail because of the other effort, not this one: `src/panels/admin/components/admin-sidebar.test.tsx` ("collapses to an icon rail" cannot find a direct "Organization" link because the sidebar is grouped) and `src/panels/admin/customer-review-pages.test.tsx` ("shows each action once in the header" cannot find a "Prepare contract" button for a submitted customer because `customer-detail-page.tsx` changed the rule). Whoever finishes that effort must fix the page or the tests.
- Owner questions open: (a) the Clerk no longer sees Commissions (preparing the list is automatic): OK?; (b) no Hold action exists to leave one commission out of "pay all": add one?; (c) Audit Logs shows "Vip number issued" and "Contract ra recorded": change to plain words?; (d) the unresolved items in section 3; (e) earlier ones still open: success green `#3f7d4e` vs dark green, Welcome Gift "Not earned" wording, agent-added buttons "Make unavailable/available" and "Delete project", version bump on text-only product edits, tier change on edit, allowance withholding reason error, raising `testTimeout` (15 s) in `vitest.config.ts`.
- Small known gaps: the dashboard Financial holds link opens Collections without pre-selecting the "On financial hold" filter; no test for the receipt-form defaults; Clerk to-do numbers not checked against real data in a test; a commission released into an already closed month has no button to build its list (code `preparePayoutList` still works); `useCommissionPayoutListAction` still has an unused `"prepare"` option; `IgpProjectsActions` unused export; custom roles with the Finance module but no `finance.verify` would have lost Payment history (none found).
- Not done by choice (carried over): Reports Summary trend chart; dashboard card "View all" underline on hover; dashboard "Past 28 Days" filter; doc UI3 text mentions "View full details" (UI6 refines it); `frontend.md` has two sections numbered 41; `AGENTS.md`/docs wording about Redemption and IGP status, D-B (40% month by receipt date), phase-07 F7.1, doc 08 "R8 items 3-6" citations, doc 07 section 18 title, Workflow Atlas update (`/update-workflow-atlas`) not rechecked.
- Open outside the team: signed IST Clawback Addendum, IGP grant terms and band code above PHP 9M, points-per-night table, legal retention period.
- Housekeeping done: nine old chat transcripts were deleted with `/delete-archived` on the owner's confirmation; one more candidate (e49d34f9) had only a dry run and was never deleted (the owner did not say "yes, delete" for it).

## 7. Verification State
- Typecheck: `npx tsc --noEmit` on the whole project: clean (exit 0), run after the last code change.
- Lint: `npm run lint`: clean (exit 0), same run.
- Tests: full `npx vitest run` (last run): 158 files, 1773 tests, 1755 passed, 18 failed. Of the 18: 2 are the other effort's failures listed in section 6; the rest are 15 s timeouts under load (`business-pages`, `staff-page`, `payment-reference-fields`, `dashboard-page`). Re-run alone with `--testTimeout=90000`: `dashboard-page`, `staff-page`, `payment-reference-fields` and `business-pages` passed 134 of 134. `permissions.test.ts` passed 15 of 15 after my fix. Subagents also ran many targeted files, all green (for example business-flow 82, commission-effects 9, commissions-pages 8, finance-pages 16, navigation 20, approve-deal 5).
- Build (`npm run build`): not performed.
- Browser QA: performed only for the new work (section 4). Not rechecked: the single-action button on a real single-action row (the Clerk's rows had 2 actions), the New Customer form (Standard default, toast), Settings tabs at phone width beyond Products and Receipts, the grouped sidebar.
- Known failures: the 2 tests in section 6; timeouts under full-suite load.
- Checks not performed: build, accessibility audit, full `business-pages` as one isolated run, bulk payout in the browser (only the bar was seen with 1 ready commission).

## 8. Next Session Instructions
- Recommended first action: `/load`, then ask the owner the open questions in section 6 and whether the other effort is finished; when the owner has committed, optionally fix the two tests, change the audit labels if approved, and run `npm run build` alone.
- Relevant files: `docs/implementation/decisions-and-gaps.md` (UI5 to UI18), `src/modules/contracts/application/approve-deal.ts`, `src/modules/customers/application/register-customer.ts`, `src/panels/admin/actions/sales-contract-actions.ts`, `src/panels/admin/components/{payment-actions,commission-shared,row-actions-menu}.tsx`, `src/panels/admin/pages/{commission-payouts-page,commissions-page,commissions-area-page,finance-page}.tsx`, `src/panels/admin/navigation.ts`, `src/data/business-queries.ts`.
- Required approvals: any commit or push (owner only), changing a brand color token, raising the test timeout, new features such as a commission Hold action or the doc 05 §10.2 Non-Standard flow, the unresolved permission questions in section 3, real authentication, `AGENTS.md` edits.
- Warnings: do not revert the uncommitted files (they include another effort's work); use targeted Edit on shared files; do not run build and tests together; do not delete `.next`; mock data resets on refresh; subagents that start background test runs can re-send reports, so stop them with TaskStop when finished; never claim visual verification without a browser run; mock sign-in password and accounts live in `src/data/mock/mock-credentials.ts` (mock login must be removed when real auth lands).

## 9. Execution Recommendation
- Phase: QA
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: medium
- Ultracode: OFF
- Token optimization: answer the open questions first, then one short fix pass (two tests, audit labels) and one build run on its own; do not re-read the docs or re-run the full suite until fixes are made.
- Reason: the code checks are clean and the new flows were seen working, so what remains is owner decisions, two tests from the other effort and the build.
<!-- SESSION_SNAPSHOT_END -->
