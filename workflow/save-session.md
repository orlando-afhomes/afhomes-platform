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
- Saved at: 2026-11-11
- Repository: afhomes-platform (remote `https://github.com/orlando-afhomes/afhomes-platform.git`)
- Branch: develop
- HEAD: bc1f0e9 "feat: add fixed-prefix phone entry and temporary Government ID image preview" (owner-committed; parent dcc53bc). Verified this run: nothing staged.
- Session objective: (1) `/delete-archived` of four old sessions; (2) responsive `AdminStatCard` with auto-shrinking values and 2-word labels/descriptions; (3) pointer cursor on every clickable control. Both UI tasks were planned, owner-approved, implemented, and browser-verified.
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion.
- Context note: no compaction notice. Several uncommitted files in the tree come from a parallel workstream not visible to this session (see section 5).

## 2. Current Project State
- Committed through bc1f0e9: customer wizard (single New/Edit layout), genealogy-driven attribution, `registerCustomer` orchestration, centralized contract cancellation, scheme-aware VIP pricing, fixed-prefix phone entry and temporary Government ID preview. Details live in git history and the decisions in section 3.
- This session (uncommitted): `src/shared/components/admin/admin-stat.tsx` now sizes by container queries (`tw:@container`; the icon chip stacks below 14rem) and has an internal `FitValue` that shrinks the value from 30px to a 12px floor (exported pure `fitValueSize`, 2% safety margin, `title` shown only at the floor). The label is clamped to 2 lines and the description is truncated. Labels and descriptions across 15 admin pages were shortened to at most 2 words.
- This session (uncommitted): `src/app/globals.css` has a base-layer rule giving `button, summary, [role=button|tab|menuitem*|option]` and button-type inputs `cursor: pointer`, and `not-allowed` for disabled ones. `cursor-default` became `cursor-pointer` on dropdown-menu items, select items, and combobox items (select scroll arrows keep the arrow).
- Navigation (not from this session): the `customer-import` item has `hideFromNav: true` (entered from the Customers page); related nav tests were adjusted.

## 3. Important Decisions
- Owner ruled the 2-word limit covers both labels and descriptions of stat cards (the wording was proposed by Claude; no business meaning changed).
- Owner ruled menu items and select/combobox options also show the pointer cursor.
- Earlier owner rulings still apply: Gold pricing finalized (Spot/Move A 312,000; Installment/Move B 390,000); Move A/B standard schemes; government IDs uppercase-only; Customer ID `YYYY-NNNN` assigned at submit; the wizard draft in `sessionStorage` (`afhomes.customer-wizard.v1`) is the only persisted browser state.
- Restrictions: agents perform no Git writes; AGENTS.md/CLAUDE.md edits need owner authorization.

## 4. Completed Work
- Deleted sessions c474e373, 28cff7c7, 8870f768, aadde5fa (permanent, no backups).
- Stat card responsive/fit work: `admin-stat.tsx`, `admin-kit.test.tsx` (new `fitValueSize` test), `reports-pages.test.tsx` and `business-pages.test.tsx` (label text updates), and label/description edits in the collections-report, commission-payouts, commission-report, customer-growth-report, finance-collections, finance-payments, membership, membership-activation, membership-report, sales, sales-performance-report, stay-points, and stay-points-report pages plus `contract-sections.tsx` and `sales-network-panel.tsx`.
- Cursor work: `globals.css`, `dropdown-menu.tsx`, `select.tsx`, `combobox.tsx`.
- Verified: `admin-kit` 8/8, `reports-pages` 7/7, `business-pages` 83/83, `src/shared/ui` 14/14; `tsc` 0 errors; ESLint clean on touched folders; `npm run build` succeeded (after the cursor change). Browser: long amounts shrink without clipping at 360/768/1280 px on Customers and Sales; computed cursor was correct on 90 controls across 8 pages, and the row "..." menu items and status select options show the pointer.

## 5. Git Working Tree
- Staged: none.
- Unstaged tracked (40 files, 796 insertions, 197 deletions). From this session: `globals.css`, `admin-stat.tsx`, `admin-kit.test.tsx`, `dropdown-menu.tsx`, `select.tsx`, `combobox.tsx`, `reports-pages.test.tsx`, `business-pages.test.tsx`, the 13 report/finance/sales/membership/stay-points pages, `contract-sections.tsx`, `sales-network-panel.tsx`.
- Pre-existing or unknown (not made by this session; do not revert): `package.json`, `package-lock.json`, `business-flow.test.ts`, `customer-repository.ts`, `seed-data.ts`, `register-customer.ts`, `modules/customers/rules.ts`, `modules/customers/types.ts`, `customer-form-attribution.test.tsx`, `customer-form-sections.tsx`, `customer-application-wizard.tsx`, `customer-detail-page.tsx`, `customers-page.tsx`, and the nav edits (`navigation.ts`, `navigation.test.ts`, `admin-nav-list.test.tsx`, `admin-nav-match.test.ts`).
- Untracked: `src/modules/customers/attribution.ts`, `src/panels/admin/components/use-new-customer-exit.ts` (pre-existing or unknown).
- Deleted or renamed: none.
- Note: the `package.json` and lockfile changes are unexplained by this session; the owner should confirm no dependency was added unintentionally.

## 6. Pending Tasks
- Owner review and commit of the uncommitted work (suggested split: stat card, cursor, nav hiding, and the parallel customer/attribution set).
- Verify the parallel workstream (customer attribution, `use-new-customer-exit`, rules/types changes) before commit; the full customer suites have not been re-run for it.
- Open owner decisions carried over: Move B down-payment due date, required initial payment per scheme, overpayment/refund timing, Welcome Gift lapse, template authority, commission default rates.
- Doc follow-ups: doc 04 §7.8 (Referrer and VIP Recommender must be the same OST vs two same-team OSTs implemented) and the Customer ID format still listed as pending D2.
- Optional: restricted-role browser QA, screen-reader audit, and a check of the disabled-control cursor (no disabled control was on the pages swept).
- No blockers.

## 7. Verification State
- Tests: targeted suites listed in section 4 passed; the full suite was not run. Heavy jsdom suites (`business-pages`, `staff-page`) can time out at 15s in parallel and pass alone.
- Lint: clean on touched folders; full `npm run lint` not run this session.
- Typecheck: 0 errors on the last run (an earlier run once showed a transient error in `customer-form-attribution.test.tsx`, attributed to parallel edits).
- Build: succeeded after the cursor change.
- Browser QA: done for the stat card and cursors as above; not done for restricted roles, dialogs, screen reader, or a production-build pass.

## 8. Next Session Instructions
- Recommended first action: `/load`, `git status --short`, then owner commits in logical groups; run the full `npx vitest run` once (alone, not alongside a build) before committing the parallel customer workstream.
- Relevant files: `src/shared/components/admin/admin-stat.tsx`, `src/app/globals.css`, `src/shared/ui/{dropdown-menu,select,combobox}.tsx`, `src/modules/customers/attribution.ts`, `src/panels/admin/components/use-new-customer-exit.ts`, `package.json`.
- Required approvals: any commit or push (owner only), AGENTS.md/CLAUDE.md edits, new dependencies, doc-04 amendments.
- Warnings: do not run build and tests together; do not delete `.next`; a full reload resets mock data; LF to CRLF warnings are expected on Windows; the dev server was already running on port 3000.

## 9. Execution Recommendation
- Phase: QA
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: medium
- Ultracode: OFF
- Token optimization: one full test run and one lint, no further browser passes unless new UI changes.
- Reason: the two UI tasks are verified, so the remaining work is owner review and commit of a mixed working tree.
<!-- SESSION_SNAPSHOT_END -->
