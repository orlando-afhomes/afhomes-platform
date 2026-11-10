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
- HEAD: d302dc7 "feat: grant Super Admin full control and centralize the admin UI kit". Working tree clean (verified this run: nothing staged, unstaged, or untracked).
- Session objective: implement a series of owner-approved workstreams — Super Admin full control + SoD bypasses, seed records for all Sales-to-Audit-Logs pages, Customers redesign, Customer detail + Export/History redesign, Contracts redesign, admin-wide UI unification kit, stat-card differentiation, reference card design, dashboard KPI restyle — verify everything, then hand off for owner commit.
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion.
- Context note: no compaction notice this session. All implementation was done by the agent (many parallel subagents plus direct edits); the owner committed the finished work as d302dc7 (97 files, +3414/-961) after final verification.

## 2. Current Project State
- Committed state: role-based Admin/Finance/Sales dashboards with KPI comparisons; Super Admin = union of all module+operation grants (incl. finance); SoD blockers bypassed for Super Admin only.
- Shared admin kit: `src/shared/components/admin/` (AdminPage, AdminKpi/Stat cards + grids, AdminSection/Empty/Error, AdminTabs, AdminFilterBar, StepBlock, InfoSplitCard/InfoMiniCard, StatusPill). `BizBadge` delegates to `StatusPillForStatus`; `DataTable` carries the beige header + even-row tint globally.
- All admin pages migrated to the kit; duplicates deleted (`module-page`, `stat-tiles`, `modern/section`, `customer-stat-cards`, `customers-table-card` +css, `contracts-table.css`). `ContractTiles` renders AdminStatCards in a `role="group"`.
- Seed covers every page: 3 commissions (approved/paid/cancelled on sale-2), memb-1 financial hold, ctr-2 cancellation requested, 2 import jobs, 8 audit events. Reference images in `docs/ui-redesign/` remain gitignored.
- Docs amended: 01 §3.6 (Super Admin full control + SoD bypass list), 07 §5.2 + owner-ruling item 5, 08 §11.2, 11 §32.1 (KPI comparisons), 13 §3.1 (dashboard sales counts), frontend.md §40.6 (admin kit).

## 3. Important Decisions
- Owner approvals this session: Super Admin union-grant full control; SoD bypass for Super Admin EXCEPT last-Super-Admin lockout protection (kept for everyone); native SVG charts (no d3); no new dependencies; AdminPage/AdminStat/AdminTabs/StatusPill kit with `DataTable` global theme; reference card design (icon chip + tone divider + big value + faint wave, no pills) for all non-dashboard cards; dashboard KPI restyle kept truthful "vs. previous period" copy.
- Carried over unresolved: Move A/B Card ID mapping; Gold installment price (390,000 vs 780,000); Move B down-payment due date; required initial payment per scheme; overpayment/refund timing; Welcome Gift lapse; template authority; commission default rates; `frontend.md` stale-section follow-ups none remaining (40.6 updated); no identity switcher for browser QA of restricted roles.
- Restrictions: mock data in browser memory only (seed restores on refresh); no agent Git writes (owner committed); AGENTS.md/CLAUDE.md edits need owner authorization.

## 4. Completed Work
- Implemented: role-based dashboards + KPI comparisons; Super Admin module union (`grantsSourceRoles`) + SoD bypasses (payment self-verify, cancellation requester-decides, self-modification) with tests; seed expansion + audit-absolute test updates (+SEED_AUDIT_EVENT_COUNT); customers list/import/VIP-card redesign; customer detail tabs + export/history cards; contracts list/detail/MA1-sheet redesign; admin kit + full page migration + deletions; stat-card differentiation + reference card restyle; dashboard KPI restyle.
- Verification each workstream: targeted suites green, `tsc` clean, `lint` 0 errors, `build` clean, Super Admin browser QA at 1440/390 across all touched pages, no console errors.

## 5. Git Working Tree
- Staged: none.
- Unstaged tracked: none (clean).
- Untracked: none (clean).
- Deleted or renamed files: none pending (all deletions already committed in d302dc7).
- Relevant unfinished work: none in the tree; everything implemented this session is committed.

## 6. Pending Tasks
- Owner review of HEAD d302dc7 (already committed; review only).
- Open owner decisions (carried over, unchanged): Move A/B Card ID mapping; Gold installment price; Move B down-payment due date; required initial payment per scheme; overpayment/refund timing; Welcome Gift lapse; template authority; commission default rates.
- Optional follow-ups: dev identity switcher for restricted-role browser QA; manual screen-reader audit; production-build browser pass.
- No blockers.

## 7. Verification State
- Last full `npx vitest run` before the owner commit: 63 files, 740+ tests, all passing (the only failures seen across runs were the known `staff-page.test.tsx` 15s timeouts under parallel load; the file passes 20/20 in isolation).
- Typecheck: `npx tsc --noEmit` clean. Lint: 0 errors, 2 pre-existing warnings (`sales-network/genealogy.ts`, `shared/forms/validation/contact.ts`). Build: compiled, all routes generated.
- Browser QA: Super Admin at 1440/390 over dashboards, Finance queues, commissions, memberships, customers, contracts + MA1 sheet, import/export history, audit logs, reports — all matching references, no access regressions, no console errors.
- Not performed: restricted-role browser QA (no switcher), manual screen-reader audit, manual reduced-motion check beyond global CSS, production-build browser pass.

## 8. Next Session Instructions
- Recommended first action: `/load`, then `git status --short` to confirm the clean tree at d302dc7, and pick up the owner's next task.
- Relevant files: `src/modules/identity/permissions.ts` (`grantsSourceRoles`), `src/shared/components/admin/*`, `src/shared/components/business/biz-badge.tsx`, `src/shared/components/modern/data-table.tsx`, `src/data/mock/seed-data.ts`, governance docs 01/07/08/11/13 + `frontend.md` §40.6.
- Required approvals: any commit or push (owner only), AGENTS.md/CLAUDE.md edits, new dependencies, identity switcher, RBAC or business-rule changes.
- Warnings: do not run build and tests together; do not delete `.next`; a full page load resets mock data to seed; line-ending warnings (LF->CRLF) are expected on Windows checkouts.

## 9. Execution Recommendation
- Phase: QA
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: low
- Ultracode: OFF
- Token optimization: one targeted test run + one build + one browser pass per task; full suite only when shared code changes.
- Reason: the tree is committed and verified; next work starts from a clean state on the owner's next instruction.

<!-- SESSION_SNAPSHOT_END -->
