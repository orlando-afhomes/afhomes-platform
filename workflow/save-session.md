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
- Saved at: 2026-11-09
- Repository: afhomes-platform (remote `https://github.com/orlando-afhomes/afhomes-platform.git`)
- Branch: develop
- HEAD: 7e17fcd "update: mock data". Nothing staged (verified this run).
- Session objective: separate every business process into its own page and sidebar parent ("process by process"), then refine the sidebar (Reports dropdown, unique icons and labels, no yellow active bar, process order, Sales first, Reports above Audit Logs).
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion.
- Context note: work this session was done with six parallel subagents; their reports were read and I re-ran the checks myself afterwards. No compaction notice in this session.

## 2. Current Project State
- Sidebar order (top to bottom, `src/panels/admin/navigation.ts`): Dashboard, Sales (Customers, Customer Import, Contracts, Contract Review, Sales Records), Finance (Payment Verification, Collections, Commission Assignment, Commissions, Commission Payouts, Payment History, Financial Holds, Cancellation Requests), Membership (Activation Queue, VIP Memberships, Stay Points), VIP Products (Product Catalog, Payment Schemes, Scheme Guide, Tier Codes), Sales Network (Members, Genealogy), Organization (Departments, Roles, Staff), Reports (Customer Growth, Sales Performance, Collections Report, Commission Report, Membership Report, Stay Points Report), Audit Logs. The Insights group was removed. `/admin/accounts` stays a hidden compatibility route.
- Every visible nav item has a unique label and a unique icon (enforced by a test in `navigation.test.ts`). The active link has no gold bar, only a highlighted background and `aria-current`.
- One page per process. Routes: `/admin/sales`, `/admin/sales/contracts`, `/admin/sales/contract-review`; `/admin/vip-products`, `/schemes`, `/scheme-guide`, `/tier-codes`; `/admin/finance`, `/collections`, `/payments`, `/holds`, `/cancellations`; `/admin/commissions`, `/assignment`, `/payouts`; `/admin/membership`, `/activation`; `/admin/stay-points`; `/admin/reports/{sales-performance,customer-growth,collections,commissions,membership,stay-points}`.
- Contract detail is four pages sharing `components/contract-sections.tsx`, `contract-dialogs.tsx` and `useContractRecord`: Sales contract `/admin/sales/contracts/[id]`, Contract Review `/admin/sales/contract-review/[id]`, Finance collection `/admin/finance/collections/[id]`, Finance cancellation `/admin/finance/cancellations/[id]`. Old routes `/admin/vip-products/contracts`, `/admin/vip-products/contracts/[id]` and `/admin/finance/contracts/[id]` are redirects. `useContractHref` and `useContractReviewHref` build the links.
- Navigation model: `AdminNavKey`, optional `grants` (any-of) and `operation` per item, one shared `filterNavForAccess` used by `getRoleAwareAdminNavigation` and `use-role-aware-navigation.ts`.
- Earlier payment-scheme work (Spot Cash, Move A and B, milestones, due dates) is unchanged and still governed by docs 05, 06, 07.

## 3. Important Decisions
- Owner rules this session: one page per process; a process involving Finance sits under the Finance parent; VIP Products is its own dropdown; all report pages sit in one Reports dropdown; the sidebar follows the business process, Sales first, Reports directly above Audit Logs (last); all nav labels and icons unique.
- Audit Logs stays top-level (not inside Reports). Setup groups (VIP Products, Sales Network, Organization) sit below the operational flow; offered to move them up if the owner prefers.
- No change to `ROLE_MODULE_GRANTS`, operation grants, repositories, business rules or seed data. Each page keeps its module grant, and some also need an operation (Contract Review needs vip-products; Commission Payouts needs `commission.payout`; Activation Queue needs `membership.activate`; Customer Import needs `customers.import`; Collections Report needs `finance.reports.view`).
- Carried over from the prior snapshot: Move A and B Card ID codes stay `paymentCode: null`; Gold installment price (390,000 vs 780,000) unresolved; Super Admin only approves Move arrangements; no Git writes by agents; mock data in memory only; AGENTS.md edits need owner authorization.
- Admin and Super Admin do not see the Finance queue pages because neither holds the `finance` module (same as before this change).

## 4. Completed Work
- Pages split: VIP Products (3 pages), Finance (5 pages), Sales and Contracts and Contract Review, Memberships and Activation, Commissions and Payouts, six report pages with `components/report-shell.tsx` (`useReportRange`, `ReportShell`). Old combined `reports-page.tsx`, `contract-detail-page.tsx` and `/admin/reports` route deleted.
- Shared code: `membership-table.tsx`, `commission-shared.tsx`, `contract-sections.tsx`, `contract-dialogs.tsx`, `report-shell.tsx`.
- New tests: `contract-detail-pages.test.tsx`, `finance-pages.test.tsx`, `vip-products-pages.test.tsx`, `sales-pages.test.tsx`, `reports-pages.test.tsx`; nav tests (`navigation.test.ts`, `admin-nav-list.test.tsx`, `admin-sidebar.test.tsx`, `admin-nav-match.test.ts`) rewritten for the new tree; `business-pages.test.tsx` repointed (payment schemes test split from the catalog test; reports and membership tests use the new pages).
- Removed unused `confirmRun` in `commissions-page.tsx`.

## 5. Git Working Tree
- Staged: none.
- Unstaged: 93 modified or deleted tracked files, including this session's nav, page, route and test files plus earlier-session work (`AGENTS.md`, `CLAUDE.md`, docs 05 to 07, repositories, UI primitives, tokens). Deleted tracked files: `src/app/admin/reports/page.tsx`, `src/panels/admin/pages/contract-detail-page.tsx`, `src/panels/admin/pages/reports-page.tsx`.
- Untracked (new this session): routes under `src/app/admin/{reports/*,finance/{collections,payments,holds,cancellations}(+[id]),sales/{contracts,contract-review}(+[id]),commissions/payouts,membership/activation,vip-products/{schemes,tier-codes}}`; pages `{collections,commission,customer-growth,membership,sales-performance,stay-points}-report-page`, `finance-{collections,payments,holds,cancellations}-page`, `finance-{collection,cancellation}-detail-page`, `sales-contract-detail-page`, `contract-review-page`, `contract-review-detail-page`, `commission-payouts-page`, `membership-activation-page`, `payment-schemes-page`, `tier-codes-page`; components `commission-shared`, `contract-dialogs`, `contract-sections`, `membership-table`, `report-shell`; the five new test files. Earlier-session untracked files (card images, finance milestones, vip rules, wizard, radio card, etc.) are still untracked.
- 154 changed paths in total per `git status --short`. Line-ending warnings (LF to CRLF) appear on many files; CRLF was preserved in edited files.

## 6. Pending Tasks
- Owner review and commit (owner only).
- Browser QA of the new structure (see section 7).
- Open owner decisions (carried over): Move A and B Card ID code mapping; Gold installment price; Move B down-payment due date; required initial payment per scheme; overpayment, refund timing, Welcome Gift lapse, template authority, commission default rates.
- Optional owner calls: move VIP Products, Sales Network or Organization higher in the sidebar; put Audit Logs inside Reports; split account administration out of Staff & Access.

## 7. Verification State
- Last full runs (after the Reports move): `npx vitest run` 656/656 (56 files); `npm run lint` 0 errors, 2 pre-existing warnings (`sales-network/genealogy.ts`, `shared/forms/validation/contact.ts`); `npm run build` compiled and lists all new routes; `npx tsc --noEmit` clean.
- After that, only UI-order changes were made (icons, labels, yellow bar, sidebar order). Those were checked with the 51 nav and sidebar tests, `npx tsc --noEmit` and ESLint on the changed files, all passing. The full suite and the build were NOT re-run after them.
- Not performed: any browser check of the new pages, the sidebar, the four contract detail pages, other roles, 390px width, accessibility audit. The Confirm cancellation button is untested because the seed data has no pending cancellation request. `staff-page.test.tsx` can time out under full-suite load; it passes alone.

## 8. Next Session Instructions
- Recommended first action: `/load`, then run `npx vitest run` and `npm run build` one after the other (not together) to re-confirm the final state, then one browser pass as Super Admin over every sidebar item.
- Relevant files: `src/panels/admin/navigation.ts`, `components/admin-nav-icons.ts`, `components/admin-nav-list.tsx`, `use-role-aware-navigation.ts`, `components/contract-sections.tsx`, `use-contract-href.ts`, `components/report-shell.tsx`, and the new pages and tests listed above.
- Required approvals: any commit or push (owner only), AGENTS.md or CLAUDE.md edits, new schemes or payment codes, an identity switcher for browser QA.
- Warnings: a full page load resets mock data; do not run build and tests together; do not delete `.next`; no dev identity switcher exists, so other roles are covered by tests only.

## 9. Execution Recommendation
- Phase: QA
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: low
- Ultracode: OFF
- Token optimization: one full suite run, one build, one browser pass; use targeted tests for any fixes.
- Reason: the restructure and automated checks are done; only final re-verification, browser confirmation and owner decisions remain.<!-- SESSION_SNAPSHOT_END -->
