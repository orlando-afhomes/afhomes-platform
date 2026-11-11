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
- Saved at: 2026-11-12
- Repository: afhomes-platform (remote `https://github.com/orlando-afhomes/afhomes-platform.git`)
- Branch: develop
- HEAD: 0c6d2c6 "feat: add customer attribution validation, exit protection, and UI polish" (owner-committed). Verified this run: nothing staged; 103 changed paths (93 modified, 10 untracked).
- Session objective: UI standardization pass across all admin pages: skeleton loaders and button spinners; table and filter layout with one reusable pagination (10 rows per page); stat-card design; one searchable dropdown; title-case labels; no raw ids on screen. Each item was owner-requested; the larger ones were planned and approved first.
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion.
- Context note: no compaction notice. Subagents did much of the per-page work; their reports were relayed, not independently re-read.

## 2. Current Project State
- Loading states: `Skeleton` (shimmer, 150 ms fade-in delay), `Spinner`, `Button loading` prop, composed skeletons in `src/shared/components/modern/skeletons.tsx`; `QueryState`/`DataTable` use them; admin layout and `/verify` have skeleton fallbacks. Opt-in mock latency: `NEXT_PUBLIC_MOCK_DELAY_MS` (read in `useMockRepositories`, `src/data/queries.ts`; off by default).
- Tables: `DataTable` always shows 10 rows per page (`TABLE_PAGE_SIZE`), footer `Pagination` (`modern/pagination.tsx`: range/total, first/prev/numbers/next/last, no page-size select), optional `serverPagination` (used by Audit Logs). Old paginate prop and hand-written paging removed.
- Layout: filter card and table card are direct siblings on pages (no titled card wrapping a table; `AdminSectionHeading` in `shared/components/admin` exists but the owner-marked headings were removed); `FilterBar` is one container, one row at md+, all controls 44 px, plus `header` slot; the filter sits directly above its table (stats moved above on Audit Logs and Payment History); Sales has one filter card (search, status, period dates).
- Owner-removed content: headings Verification queue, Collections monitor, Confirmed sales, Approved commissions, All payments, Activation queue, Ledger (stay points), Product catalog, Payment scheme register (New scheme button moved to the page header), Commission records, the lone "All sales" tab, the "Showing N contracts" line, the stat-card vertical divider.
- Stat cards (`AdminStatCard`): always row layout (chip + text, no divider), value shrinks to fit. Dashboard KPI cards unchanged.
- Dropdowns: one `SearchSelect` (`modern/search-select.tsx`, type-to-filter combobox, 44 px) used by `SelectField` (showSearch removed), `FilterBar`, the dashboard date filter, and the Account, Department, Role dialogs and Genealogy team filter. `shared/ui/select.tsx` has no callers (left in place). Action menus (`DropdownMenu`) unchanged by owner decision.
- Display text: `humanize` (`shared/lib/humanize.ts`) title-cases enum/status/action values; `StatusBadge` and `StatusPill` use it. Payment method labels were left alone (GCash).
- Raw ids hidden: `recordLabel` (`shared/lib/record-label.ts`) builds labels like "Contract · Name · B1". Audit events now carry `entityLabel` and `actorName` (types in `modules/audit/types.ts`, built in `data/mock/audit-repository.ts`); Audit Logs hides ids and its actor filter matches names. Contracts table lost its id column; contract and customer detail titles, import job labels, member relationship history (branch columns removed), dashboard activity references, and duplicate-payment and status-transition error messages were updated.

## 3. Important Decisions
- Owner: section titles became plain headings, later removed where marked; period dates join the single filter card; all tables 10 rows (no page-size choice); 4-card stat rows stay 4 across with shrinking values; action menus stay as menus; raw ids use "descriptive label" replacements.
- Restrictions: agents perform no Git writes; AGENTS.md/CLAUDE.md edits need owner authorization. `docs/ui` was deleted once by mistake and restored from `C:\Users\user\OneDrive\Desktop\Pictures\Screenshots` (originals still there).
- Earlier owner rulings still apply (Gold pricing, Move A/B schemes, uppercase government IDs, Customer ID `YYYY-NNNN`, wizard draft in sessionStorage only).

## 4. Completed Work
- All items in section 2, implemented across about 100 files. New files: `admin-section-heading.tsx`, `pagination.tsx` (+test), `search-select.tsx`, `skeletons.tsx`, `spinner.tsx`, `humanize.ts` (+test), `record-label.ts` (+test).
- Verification actually run this session: `tsc --noEmit` 0 errors (last run at save time); ESLint 0 errors with one old warning (`modules/sales-network/genealogy.ts` unused `byId`); `npm run build` succeeded before the final raw-id edits.

## 5. Git Working Tree
- Staged: none.
- Unstaged tracked: about 93 files across `src/shared`, `src/panels/admin`, `src/data/mock`, `src/modules/{audit,finance}`, `src/app`; mostly this session; earlier-session leftovers may be mixed in (unknown).
- Untracked: `src/shared/components/admin/admin-section-heading.tsx`, `src/shared/components/modern/{pagination,pagination.test,search-select,skeletons}.ts(x)`, `src/shared/lib/{humanize,humanize.test,record-label,record-label.test}.ts`, `src/shared/ui/spinner.tsx`; `docs/ui/` (owner screenshots, also untracked).
- Deleted or renamed: none.

## 6. Pending Tasks
- Fix tests that assert old text (cannot run here): `src/panels/admin/dashboard-metrics.test.ts` (~lines 238-244 expect references like "COM-1", "PAY-4"; fixtures need `customerName`/`displayName`), `src/panels/admin/business-pages.test.tsx:276` (`findAllByText("CTR-4")`), page tests using "Actor id", old Audit Logs/section headings, or lowercase status text.
- Re-run ESLint and `npm run build` after the final raw-id edits (not done after them).
- Browser QA of everything above (none done): 4-card stat rows at 1280-1366 px, Audit Logs filter row width, dropdowns in dialogs, pagination on mobile, loaders with `NEXT_PUBLIC_MOCK_DELAY_MS=800`.
- Possible leftovers the owner may want removed: "N matching customer(s)" next to Export, "N visible member(s)" in the team list, and the other "Commission records" text on the commission-assignment page.
- Owner decisions carried over: Move B down-payment due date, required initial payment per scheme, overpayment/refund timing, Welcome Gift lapse, template authority, commission default rates; doc 04 §7.8 and Customer ID format (D2).
- Blocker for tests: Vitest crashes on load (jsdom's bundled undici under Node v22.14.0); a newer Node 22.x is the likely fix (unconfirmed).

## 7. Verification State
- Tests: none run this session (environment crash above). Added and updated tests are unverified.
- Lint: 0 errors (earlier run). Typecheck: clean at save time. Build: succeeded earlier this session.
- Browser QA: not performed.

## 8. Next Session Instructions
- Recommended first action: `/load`, `git status --short`, fix Node (or run tests elsewhere), run the full `npx vitest run` once alone, then update the stale assertions in section 6.
- Relevant files: `src/shared/components/modern/{data-table,pagination,filter-bar,search-select,skeletons}.tsx`, `src/shared/lib/{humanize,record-label}.ts`, `src/data/mock/audit-repository.ts`, `src/panels/admin/dashboard-metrics.ts`, `src/panels/admin/pages/audit-logs-page.tsx`.
- Required approvals: any commit or push (owner only), AGENTS.md/CLAUDE.md edits, new dependencies, deleting `select.tsx`.
- Warnings: do not run build and tests together; do not delete `.next`; never delete untracked owner files (`docs/ui`); LF to CRLF warnings are expected.

## 9. Execution Recommendation
- Phase: QA
- Recommended next mode: Build (after the owner reviews the browser result)
- Recommended model: Sonnet 5.5
- Effort: medium
- Ultracode: OFF
- Token optimization: one test run once Node is fixed; browser pass per page group, not per component.
- Reason: broad UI work is implemented but unverified at runtime; the remaining work is test repair and browser QA.
<!-- SESSION_SNAPSHOT_END -->
