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
- Saved at: 2026-11-10
- Repository: afhomes-platform (remote `https://github.com/orlando-afhomes/afhomes-platform.git`)
- Branch: develop
- HEAD: 4d35fab "feat: split admin flows into process-by-process pages and add VIP payment schemes". Nothing staged (verified this run).
- Session objective: redesign only the Admin Dashboard main content using `docs/ui-redesign/dashboard.png` as the visual reference, preserving branding, role scoping, and all business definitions.
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion.
- Context note: no compaction notice this session. The reference image is gitignored by the owner's uncommitted `.gitignore` change.

## 2. Current Project State
- Dashboard redesign implemented. Seller roles still render `SalesNetworkPanel`; inactive accounts still see the restricted state.
- Admin/Super Admin/Finance/HR use the new dashboard: header with compact range selector, KPI grid, performance chart, VIP donut, recent activity, pending actions.
- Gating: team members = `sales-network`; customers = `customers`; contracts/donut/activity = `vip-products` or `sales`; Contract Review queue = `vip-products`; Verified Collections and chart collections = `finance.reports.view`; Payment Verification queue = `finance`; Activation queue = `membership` + `membership.activate`.
- Super Admin: 4 KPIs, both chart series, donut, activity, Contract Review + Activation queues. Admin: 3 KPIs (no collections), sales-only chart, donut, activity, Contract Review + Activation. Finance: collections KPI, collections-only chart, no donut/contract queues, Payment Verification + Activation, activity. HR: "No dashboard metrics" note. No sidebar/topbar changes.
- Native SVG charts, no new dependency. Chart uses Confirmed Sales Value by signed adjustment date (doc 13) and gross Verified Collections by `verifiedDate` (doc 11), zero-filled Asia/Manila days, accessible summary and expandable data table.
- Contract Review pending = `submitted` + `under_review`; Payment Verification = `submitted` + `under_review`; Activation = `pending`. Total Contracts and the donut are current snapshots excluding cancelled; the date filter affects the chart and Verified Collections only.
- Activity uses visible contract/payment/membership history, not audit. "View all" goes to `/admin/audit-logs` for audit-authorized roles, otherwise `/admin/finance/payments`.

## 3. Important Decisions
- Owner approved the recommended approach: native SVG instead of installing d3/recharts; keep `SalesNetworkPanel` for seller roles; Contract Review count includes submitted + under_review; Super Admin sees the collections KPI/chart but not the Payment Verification queue, mirroring current module grants.
- No changes to `ROLE_MODULE_GRANTS`, operations, repositories, seed data, navigation, sidebar, header, layout, tokens, business-rule documents, or dependencies.
- No trend/comparison badges: there are no historical KPI snapshots or an approved comparison definition.
- Carried over: Move A/B Card ID codes stay `paymentCode: null`; Gold installment price (390,000 vs 780,000) unresolved; Super Admin only approves Move arrangements; mock data in memory only; no agent Git writes; AGENTS.md/CLAUDE.md edits need owner authorization.
- `docs/development/frontend.md` section 40.6 still says dated metrics/charts are deferred; it is stale and was not edited.

## 4. Completed Work
- Rewrote `src/panels/admin/pages/admin-dashboard-page.tsx`.
- Extended `src/panels/admin/dashboard-metrics.ts` with contract/tier/pending/activity/daily-series helpers; tests in `dashboard-metrics.test.ts`.
- New components: `dashboard-date-range.tsx`, `dashboard-kpi-grid.tsx`, `dashboard-performance-chart.tsx`, `dashboard-product-distribution.tsx`, `dashboard-activity-list.tsx`, `dashboard-pending-actions.tsx`, `dashboard-chart-model.ts` plus test.
- New loaded-data test `dashboard-page.test.tsx`; extended `admin-dashboard-page.test.tsx` for role gating.
- Verification: targeted dashboard tests 33/33; TypeScript clean; lint 0 errors (2 pre-existing warnings); build clean; browser QA as Super Admin at 1440/768/390 including date presets, custom-range validation, chart data table, donut, activity, pending links, keyboard order, and no console errors.

## 5. Git Working Tree
- Staged: none.
- Unstaged tracked: `.gitignore` (owner change adding `/docs/ui-redesign`, pre-existing and preserved), `src/panels/admin/pages/admin-dashboard-page.tsx`, `dashboard-metrics.ts`, `dashboard-metrics.test.ts`, `admin-dashboard-page.test.tsx`.
- Untracked: `dashboard-activity-list`, `dashboard-chart-model` plus test, `dashboard-date-range`, `dashboard-kpi-grid`, `dashboard-pending-actions`, `dashboard-performance-chart`, `dashboard-product-distribution`, `dashboard-page.test.tsx`.
- No deleted or renamed files. Line-ending warnings (LF to CRLF) on edited files; CRLF preserved where edited.
- Reference image `docs/ui-redesign/dashboard.png` is gitignored, not tracked.

## 6. Pending Tasks
- Owner review and commit (owner only).
- Optional: extend the redesign to seller dashboards (unchanged by decision).
- Browser QA for Admin/Finance/HR layouts is blocked by the absence of a dev identity switcher; tests cover them.
- Open owner decisions (carried over): Move A/B Card ID mapping; Gold installment price; Move B down-payment due date; required initial payment per scheme; overpayment/refund timing; Welcome Gift lapse; template authority; commission default rates.
- Possible follow-ups: approved trend/comparison definition; Super Admin finance-queue module gap; stale `frontend.md` section 40.6.

## 7. Verification State
- Targeted: dashboard tests 33/33 passed (metrics, chart model, static role gating, loaded Super Admin/Finance/Admin).
- Full: `npx vitest run` 675/676 passed, 57/58 files. Single failure: `staff-page.test.tsx > adds staff with cascading department role` timed out at 15000ms under full-suite load; it passes alone (20/20).
- Typecheck: `npx tsc --noEmit` clean.
- Lint: `npm run lint` 0 errors, 2 pre-existing warnings (`sales-network/genealogy.ts`, `shared/forms/validation/contact.ts`).
- Build: `npm run build` compiled successfully; all routes generated.
- Browser QA: Super Admin only, using the pre-existing dev server on port 3000. 1440/768/390 checked; Past 7 Days, Today, Past 6 Months and Custom verified; invalid range shows the alert and no figures; 29/185-row data table; pending links correct; keyboard order and focus reachable; no console errors.
- Not performed: browser QA for Admin/Finance/HR, manual screen-reader audit, manual reduced-motion check (global CSS collapses transitions; charts have no animation), production-build browser pass.
- Known limitation: activity "View all" uses Audit Logs for audit-authorized roles, which is empty in the seed, so it may show fewer entries than the business-history feed.

## 8. Next Session Instructions
- Recommended first action: `/load`, then inspect `git status --short`; review the dashboard in the browser as Super Admin if desired; owner commits when ready.
- Relevant files: the nine dashboard files listed above, `admin-dashboard-page.test.tsx`, `dashboard-page.test.tsx`, `dashboard-metrics.test.ts`; reporting rules `src/modules/sales/rules.ts`, `src/modules/finance/rules.ts`.
- Required approvals: any commit or push (owner only), AGENTS.md/CLAUDE.md edits, new dependencies (e.g. d3), an identity switcher, RBAC changes.
- Warnings: do not run build and tests together; do not delete `.next`; a full page load resets mock data; the owner's dev server on port 3000 was left running; line-ending warnings are expected.

## 9. Execution Recommendation
- Phase: QA
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: low
- Ultracode: OFF
- Token optimization: one targeted dashboard test run, one build, one browser pass; avoid re-running the full suite unless shared code changes.
- Reason: implementation and automated checks are complete; remaining work is owner review/commit and optional decisions.
<!-- SESSION_SNAPSHOT_END -->
