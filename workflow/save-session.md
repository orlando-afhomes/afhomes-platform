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
- Saved 2026-11-24 (Asia/Manila). AFHomes Platform, branch `develop`, HEAD `b683446`. The session began at `b683446` after `/load`.
- Tool: OpenCode. Model: DeepSeek V4.1 Flash 1017 (verified from the environment). Permission mode not verified. Context was not compacted.
- Objectives in order: finish the Codex plan for branded report PDFs and borderless Linked Records buttons; enhance the dashboard date-range filter; remove "e.g." from every input placeholder; audit and fix button icons app-wide; staff page filter icons, two-word status label, password-reveal error and Prefix. Phase: frontend prototype with sample data, QA.

## 2. Current Project State
- Report PDFs are built: shared report template and export menu; Download PDF on every Reports tab including Summary, Close the Month, Monthly Check, Receipt History Export and Customers -> Export; Customer PDF uses the five preview columns; filter metadata is printed; PDF actions are audited. Linked Records rows are borderless and still open Contract/Sale/Membership tabs.
- Dashboard date range has a trigger calendar icon, distinct preset icons/descriptions, a resolved date line, a compact custom-range layout, and a focus-safe reveal pattern.
- Input placeholders no longer contain "e.g." anywhere in `src`.
- Action buttons and menus require icons. Shared enforcement is in `detail-actions.tsx`, `row-actions-menu.tsx`, `button-icons.ts` and `page-actions.tsx`. Icons are unique within a visible menu/group; duplicate collisions found on Finance, IGP document signatures and staff were fixed.
- Staff area: the Directory view chips have distinct icons (`LayoutGrid`, `UsersRound`, `KeyRound`, `Clock`); the employment status filter reads "All statuses"; the password reveal no longer blurs/validates; Personal Details has an optional Prefix dropdown stored on the staff record and shown in the profile.
- Dev server on port 3000. Mock data is browser memory only; reload resets it.

## 3. Important Decisions
- Owner-approved icon rule: every action button and action menu item has an icon; no two actions in the same visible menu/button group share an icon; structural controls are excluded (page numbers, tabs, sortable headers, navigation links, notification feed rows, invisible report-card overlays). The same action may reuse its icon on another screen.
- Owner-approved Prefix format: optional title dropdown (Mr., Ms., Mrs., Dr., Engr., Atty., Prof., Rev.) with "No prefix"; stored; shown in profile details; directory display name and sorting remain the legal name.
- Password reveal: owner reported validation errors on click; fixed with `onMouseDown` prevent-default on the shared reveal button while keeping `type="button"`.
- Report PDFs: Summary is a table of the visible figures and comparisons; Customer PDF uses Customer, VIP Plan, Status, Seller, Submitted; Excel/CSV keep their existing columns and 5,000-row limit; PDF downloads are audited without row data.
- Placeholders: remove the "e.g." term, keep the example values.
- Restrictions kept: sample data only, no persistence, Git writes reserved for the owner, no business-rule changes.

## 4. Completed Work
- Report PDFs: `src/panels/admin/documents/report-pdf.ts`, `report-pdf-output.tsx` (pre-existing untracked, extended), `report-shell.tsx`, `reports-summary-panel.tsx`, `customer-export-history.tsx`, `customer-import-export-page.tsx`; filter metadata across the seven report pages; `customer-detail-panels.tsx` (restored ProgressStep `last`); tests `report-pdf.test.ts`, `report-shell.test.tsx`, `reports-pages.test.tsx`, `customer-review-pages.test.tsx`.
- Dashboard filter: `src/shared/components/dashboard/dashboard-date-filter.tsx`, `src/shared/components/modern/search-select.tsx`, `src/shared/ui/combobox.tsx`.
- Placeholders: `src/shared/forms/example-text.ts` and test, `src/shared/forms/modern/text-field.tsx`, `role-dialogs.tsx`, `roles-page.test.tsx`, `forgot-password-panel.tsx`, `contact-form.tsx`, `faq.ts`.
- Button icons: shared `button-icons.ts` + test, `detail-actions.tsx` + test, `row-actions-menu.tsx` + test, `page-actions.tsx`, `report-shell.tsx` export menu, `customer-import-steps.tsx`; action builders `customer-actions`, `history-import-actions`, `redemption-actions`, `sales-contract-actions`, `sales-network-actions`; components `commission-shared`, `membership-table`, `payment-actions`, `restaurant-reservations-table`; pages including commissions, experiences, finance collections, IGP page/projects, lists, promo points, promos, redemption points table, registration applications, sales contract detail, sales, staff, staff dialogs, stay points, tier codes, VIP products. IGP document signatures now use seven distinct document icons.
- Staff: `src/shared/forms/validation/person-name.ts` (`PREFIX_OPTIONS`, `validatePrefix`), `select-field.tsx` (`PrefixField`), `index.ts`, `text-field.tsx`; `modules/organization/types.ts`, `data/contracts/staff-repository.ts`, `data/mock/staff-repository.ts` + test; `pages/staff-dialogs.tsx`, `pages/staff-page.tsx`, `staff-page.test.tsx`, `staff-access-page.test.tsx`, `modern-fields.test.tsx`.
- The previous snapshot's failing Customers Import test was updated to current behavior (Import tab is gone) and passes.

## 5. Git Working Tree
- Staged: none. `git diff --cached --stat` is empty.
- Unstaged: 192 modified files, 3,059 insertions and 1,822 deletions (`git diff --stat`). This is a large pre-existing uncommitted batch plus this session's work. This session's files are the paths in section 4. Pre-existing or unknown changes include navigation/sidebar/sales-network genealogy, allowance review, dashboards, status pills/badges, button/input/select primitives, tokens, docs and many tests. `workflow/save-session.md` is modified by this save. Not every pre-existing change was inspected.
- Untracked: 21 files. This session's additions/edits among them: `src/panels/admin/documents/report-pdf.ts`, `report-pdf.test.ts`, `report-pdf-output.tsx`, `src/shared/forms/example-text.ts` + test, `src/shared/ui/button-icons.ts` + test, `src/shared/components/modern/detail-actions.tsx` + test. Other untracked files are pre-existing: `gsd-dashboard.tsx`, `hr-dashboard.tsx`, `tab-icons.ts`, `sonner.test.tsx`, `admin-nav-icons.test.ts`, genealogy fixtures/tests, `status-presentation.test.ts`, `detail-actions-colors.test.ts`, and `docs/implementation/01-prototype/ui-states/button-group-status-audit.md`.
- Deleted: `src/shared/components/dashboard/page-actions.css` (pre-existing deletion, not this session).
- No renames.

## 6. Pending Tasks
- Owner review and commit of the entire uncommitted tree; agents must not stage or commit.
- Optional browser QA not yet done: report PDF download/print preview, a few rarely opened dialogs/menus, and a clean-checkout run.
- Earlier open items remain: doc 14 amendment, G3/G4 allowance questions, G5 process checks, live camera demo, full-suite confirmation.
- Known limitation: Prefix appears in profile details only, not in directory display names or search/sort. The custom dashboard range wraps the title at narrow widths. The two date-dependent `business-flow` tests were not rerun this session.

## 7. Verification State
- `npx tsc --noEmit` clean (final run).
- `npx eslint src` clean (final run).
- `npm run build` clean (final run).
- Targeted Vitest passed: report shell 12, report PDF 2, reports pages 22, customer pages 21; finance 20, commissions 12; VIP 21, sales 6, sales network 8; IGP 9 + stage 4 2; staff 22, staff access 14, staff repository 54, modern fields 36; button icons 2, row actions 8, detail actions 2, modern components 16; departments/roles/lists/staff access 67 (one business-pages test timed out in an overloaded run but passed alone in 6s).
- Known heavy-suite behavior: large parallel batches can time out (staff, wizard, lists, business pages); the affected tests pass in smaller groups.
- Sample PDFs were generated and inspected with `pdftotext -enc UTF-8`: wide report (12 pages, 2 column groups with the identifying column repeated), Summary, empty report, Customer Export; page numbers, repeated headings, peso signs and accented names were correct.
- Browser QA done: dashboard date filter; Finance Verify/Request Fix/Reject, Refund, and details footer; 41 row menus across admin routes with no missing/duplicate icons; 26 routes with no visible action button without an icon; IGP document icons; staff chips, status label, Prefix field and password toggle. Screenshots were used for visual checks.
- Not performed: full test suite, clean-checkout run, browser PDF download/print preview, and some dialogs not opened.

## 8. Next Session Instructions
- Run `/load`, confirm HEAD `b683446` and the 192-file unstaged tree.
- Do not commit or stage. Ask the owner to review the uncommitted work; the tree includes earlier sessions' changes unrelated to this one.
- If continuing QA, run only the targeted suites for the touched area and one browser pass over report PDF actions and any unopened menus.
- Sample accounts are in `src/data/mock/mock-credentials.ts`. Reload resets sample data; the in-app camera is blocked; the dev server runs on port 3000.
- Check `git status` before editing shared files; other work may be in progress.

## 9. Execution Recommendation
- Phase: QA. Current mode: not verified (OpenCode). Current model: DeepSeek V4.1 Flash 1017 (verified). Recommended: Claude Sonnet 5.5, medium effort. Ultracode: OFF.
- Token optimization: owner review plus targeted checks only; no full-suite rerun unless the owner requests it.
- Reason: the remaining work is review/commit and optional visual QA, not new implementation.
<!-- SESSION_SNAPSHOT_END -->
