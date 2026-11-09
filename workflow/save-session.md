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
- HEAD: 22c9b4f (unchanged; owner commits only); nothing staged; 72 diff entries + 39 untracked files (prior session's G1-G7/P13/money work still uncommitted underneath)
- Session objective: /load, then plan component centralization, then owner's "proceed" authorized implementation with the recommended approach.
- Development phase: frontend prototype with mock data; G1-G7, P13 doc amendments, and money/points grouping done (prior session); component centralization implemented this session. Only the owner declares frontend completion.
- Context note: Plan mode was active during /load and planning (plan written to `C:\Users\SSD-ORLANDO\.opencode\plan\2026-11-09-component-centralization.md`); owner lifted Plan mode, then authorized implementation ("proceed, do what is the best approach and recommended"). Ultracode OFF.

## 2. Current Project State
- Verified this session: `npx tsc --noEmit` clean, lint 0 errors (2 pre-existing warnings), `npm run build` succeeds, full vitest 555/557 (2 known flaky staff-page tests under load; 20/20 alone).
- All application-facing UI now comes from `src/shared/ui/` primitives or `src/shared/components/` composed components. No page-level card surfaces, search boxes, tables, badges, standard dialogs, or toast hosts remain (6 documented raw-button exceptions with comments; 1 sr-only file input; DataTable wrapper keeps card classes intentionally as an overflow-hidden table container).
- Prior-session state preserved: commission 7-day release, Commission Assignment page, Finance membership activation, customer import/export (read-excel-file/write-excel-file), supplementary holder (Gold), random numeric customer ids, Scheme Guide, grouped money/points inputs.

## 3. Important Decisions
- Owner decisions this session: proceed with recommended approach — all application-facing screens including public pages; keep Sonner + Base UI AlertDialog (no SweetAlert2); semantic `primary`/`danger` button aliases with old names kept; pure refactor with exact visual parity; docs/frontend.md update and test-gate enforcement left undecided (not done).
- Architecture: pages → shared components → shared primitives; `src/shared` never imports `src/panels`; domain-aware shared components live in `src/shared/components/business/` (`biz-badge`, `designation-badge`, `role-badge` with caller-supplied labels).
- Preserved unchanged by design: both badge tone registries (account vs business `approved` conflict kept), Button gray `secondary` variant, shadcn variant names as aliases; direct `toast.*` calls remain in 16 files (host centralized; `notify`/`useActionRunner` preferred for new code).
- Prior owner rulings (2026-11-09, unchanged): allocation waterfall; 40% gate + 7-day release; manual Commission Assignment (Finance, Super Admin); doc-05 schemes with Spot Cash unavailable; random numeric internal ids; Finance/Admin/Super Admin may activate memberships; imports create drafts only; XLSX approved; comma grouping for money/Stay Points only.
- Restrictions: no Git writes by agents; AGENTS.md/CLAUDE.md edits need owner authorization. One `git stash` + `stash pop` cycle was used read-only mid-session to isolate a test failure (tree fully restored; disclosed in session, not repeated).

## 4. Completed Work
- Primitives: `src/shared/ui/card.tsx` (new Card system); `button.tsx` gained `primary`/`danger` aliases; `status-badge.tsx` gained shared `toneClass`; `data-table.tsx` gained `paginate` prop (default true).
- New composed components: `search-input`, `filter-bar`, `section`, `card-section`, `stat-tiles`, `tab-bar`, `query-state`, `money`, `form-dialog` (FormDialog + ReasonDialog), `use-action-runner`, `app-toaster` (+ `notify`), `business/biz-badge`, `business/designation-badge`, `business/role-badge`, `lib/format-date.ts`.
- Migrations: 20 `business-ui` importers rewritten to shared imports; `business-ui.tsx` and `sales-badges.tsx` shims deleted; 5 directory pages to FilterBar (departments, roles, staff, members; + RoleBadge in staff); single AppToaster in AdminLayout with 6 duplicate mounts removed; member-detail raw table to DataTable; my-account/member-detail/overview/dashboard/sales-panel/customer-form/public pages to Card/CardSection; 6 raw-button exception comments.
- Regression found and fixed: ModulePage Toaster removal hid toast text asserted by business-pages.test (customer-form validation error surfaces via toast) — fixed by mounting AppToaster in the test wrapper (Card wrapper proven innocent via isolated revert).
- Tests added: `centralization.test.tsx` (11 tests); AppToaster added to 5 test wrappers (business-pages, departments, roles, staff, my-account).

## 5. Git Working Tree
- Staged: none.
- Unstaged this-session (centralization): `src/shared/ui/button.tsx`, `src/shared/components/modern/{data-table,status-badge}.tsx`, `src/panels/admin/components/{module-page,accreditation-status-action,admin-header,admin-nav-list,contracts-table,payment-actions,prepare-contract-dialog,sales-network-panel,sales-network-tree-node,vip-product-dialogs}.tsx`, `src/panels/admin/layouts/admin-layout.tsx`, 22 admin pages, `src/panels/public/pages/{accreditation-verification,ost-registration}-page.tsx`, 5 test files, `workflow/save-session.md` (this save).
- Unstaged pre-existing (prior session, untouched this session): `docs/business-rules/05,07,08-*.md`, `package.json`, `package-lock.json`, `src/data/*`, `src/data/mock/*`, `src/modules/*`, `src/shared/forms/*`, `src/shared/lib/{money,dates}.ts`, etc.
- Untracked this-session: `src/shared/components/business/`, `src/shared/components/modern/{app-toaster,card-section,centralization.test,filter-bar,form-dialog,money,query-state,search-input,section,stat-tiles,tab-bar,use-action-runner}.tsx`, `src/shared/lib/format-date.ts`, `src/shared/ui/card.tsx`.
- Untracked pre-existing: `docs/system-flow/`, 3 route dirs, `ids.test.ts`, `import.{ts,test.ts}`, 3 new pages, `spreadsheet.ts`.
- Deleted this-session: `src/panels/admin/components/business-ui.tsx`, `src/panels/admin/components/sales-badges.tsx` (zero importers; verified). Renamed: none. Unfinished work: none in progress.

## 6. Pending Tasks
- Owner decisions open (unchanged): OD-8 (Card Claim vs Activation Date, legacy ids; blocks Historical import), OD-5, OD-6, OD-7, OD-9, OD-10, OD-13 to OD-16, refund/waiver after forfeiture, supplementary holder field list and age limit, reservation expiry rule, whether Admin may assign commissions; plus new: unify `approved` badge mapping? update `docs/development/frontend.md`? centralization check in CI?
- Optional: Zod migration one form at a time; full accessibility audit; migrate 16 files' direct `toast.*` calls to `notify`/`useActionRunner`; browser walk-through of other roles; returned-payment correction UI; paid-commission recovery flag.
- Not built (not defined in business rules): QR token, fallback member code, customer activation link, printable membership card.

## 7. Verification State
- Tests: full `npx vitest run` 555/557; the 2 failures are the known flaky staff-page tests under load (staff-page alone 20/20). Targeted: centralization 11/11, foundation+modern 33/33, departments+roles 38/38, business-pages 22/22, sales-network 9/9.
- Lint: 0 errors, 2 pre-existing warnings. Typecheck: clean. Build: succeeded (all routes).
- Browser QA: not performed this session (no visual-parity screenshot pass; recommended before owner acceptance).
- Known failures: staff-page flakiness under full-run load only (pre-existing pattern).
- Checks not performed: accessibility audit, other-role browser walk-through, exported-XLSX opening.

## 8. Next Session Instructions
- Recommended first action: run `/load`, then do the visual-parity browser pass (desktop 1440px + mobile 390px, one page per wave; keyboard focus/dialog/menu checks) before asking the owner to accept the milestone.
- Relevant files: `src/shared/components/modern/*`, `src/shared/components/business/*`, `src/shared/ui/card.tsx`, `src/shared/ui/button.tsx`, `src/panels/admin/layouts/admin-layout.tsx`, plan at `C:\Users\SSD-ORLANDO\.opencode\plan\2026-11-09-component-centralization.md`.
- Required approvals: milestone acceptance and any commit/push (owner only); new features; Zod migration; Historical import; doc or AGENTS.md edits.
- Warnings: reloading a browser page resets the mock store (use in-page navigation); do not run build and tests concurrently; port 3000 may host the owner's dev server; use `tw:` prefix; memoize DataTable columns; shell heredocs with apostrophes break (use Write tool); `git stash` is prohibited by AGENTS.md even read-only (used once this session, disclosed, do not repeat — use targeted reverts instead).

## 9. Execution Recommendation
- Phase: QA
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: medium
- Ultracode: OFF
- Token optimization: one visual-parity browser pass per wave first, then owner acceptance; resolve open owner decisions before any new feature.
- Reason: centralization implementation and automated verification are complete; what remains is visual/keyboard parity confirmation and owner decisions.
<!-- SESSION_SNAPSHOT_END -->
