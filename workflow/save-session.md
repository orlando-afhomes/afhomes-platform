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
- HEAD: 5fdd8d3 "feat: redesign member detail page, remove Sales Network overview, and space page actions", equal to origin/develop (pushed this session). Parent a1eb1bf (owner commit "enhance: ui design components and remove unecessary components"). Verified this run: working tree clean, nothing staged, one stash kept.
- Session objective: (1) responsive stat card, pointer cursor, accreditation dropdown restyle (committed earlier by the owner in a1eb1bf); (2) member detail page redesign; (3) remove the Sales Network overview page and space header action buttons; (4) fix the duplicate "AA" in the member header; (5) integrate with a1eb1bf, then commit and push.
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion.
- Context note: no compaction notice. Subagents prepared merge resolutions in the scratchpad; their reports are model output, verified by running tsc, lint, tests, and build in the real repo.

## 2. Current Project State
- Committed and pushed (5fdd8d3):
  - Member detail page `src/panels/admin/pages/sales-network-member-detail-page.tsx`: `DetailHero` summary, tabs Overview/Profile/Downline/History (Profile and History only when data exists), grouped Profile cards with `InfoGrid`/`InfoItem`, formatted dates, header subtitle shows the AA number once (aaDisplay already includes the AA prefix). It also keeps the owner's `DetailSkeleton`, member and actor name lookups (`parentLabel`, `actorLabel`), `humanize`, and `AdminSectionHeading` sections. The local parent text variable is `parentDisplay`.
  - New shared components: `src/shared/components/admin/detail-hero.tsx` (exported from the admin index) and `src/shared/components/modern/info-grid.tsx`. `AdminTabs` takes an optional `idPrefix` for tab-to-panel linkage. `DetailRow`/`DetailList` unchanged.
  - Sales Network overview page and `sales-network-panel.tsx` removed; `/admin/sales-network` redirects to `/admin/sales-network/members`; "Sales Network" breadcrumb is plain text on Members, Genealogy and member detail. The member's own referral code is now a card on My Account (`MyReferralCodeCard`).
  - `AdminPage`, `DashboardHeader` and `DashboardCard` wrap header actions in a flex container with `gap-2`.
  - `accreditation-status-action.tsx`: select-style trigger with status dot, rotating chevron, check on the current item, and the owner's Spinner and `loading` props.
- In the owner's a1eb1bf (already in the repo): global pointer-cursor rule in globals.css, responsive `AdminStatCard` with auto-shrinking values, new skeletons, pagination, `humanize`, `Spinner`, and `AdminSectionHeading` components.

## 3. Important Decisions
- Owner ruled the 2-word limit covers stat card labels and descriptions; menu items and select options also show the pointer cursor; the referral code moves to My Account when the overview page is removed.
- Owner granted a one-time permission to integrate, commit and push. The AGENTS.md Git prohibition is unchanged and applies again by default. Git operations performed by the agent this session: `git stash push -u`, `git pull --ff-only`, `git stash pop`, `git rm`, `git add`, `git commit`, `git push origin develop`. No merge, rebase, reset, force, or branch switch.
- Earlier owner rulings still apply: Gold pricing finalized (Spot/Move A 312,000; Installment/Move B 390,000); Customer ID `YYYY-NNNN` assigned at submit; wizard draft in `sessionStorage` (`afhomes.customer-wizard.v1`) is the only persisted browser state.
- Restrictions: AGENTS.md and CLAUDE.md edits need owner authorization.

## 4. Completed Work
- All items in section 2, plus tests: new `src/panels/admin/sales-network-member-detail-page.test.tsx` (3 tests) and 2 new tests in `my-account-page.test.tsx`.
- Verified before the commit, in the real repo after the merge: `npx tsc --noEmit` 0 errors; ESLint clean on the changed files; 58 of 58 targeted tests; `npm run build` compiled successfully.
- Earlier browser checks (before the merge): member detail at 1280 and 360 px, tab-to-panel links, accreditation dropdown, cursors.

## 5. Git Working Tree
- Staged: none. Unstaged: none. Untracked: none. Working tree clean.
- Stash: `stash@{0}` "local: sales-network cleanup + member detail redesign" kept as a backup; its content is in 5fdd8d3 and it can be removed with `git stash drop`.
- Line endings: working copy is CRLF, Git stores LF; this caused false whole-file conflicts in a manual dry run until normalized. Warnings about LF to CRLF are expected.

## 6. Pending Tasks
- Browser QA on the merged result: member detail page, Members dropdown with spinner, Add IST / Add OST gap, `/admin/sales-network` redirect, My Account as a sales identity (`dev-svd-a`). Not done after the merge.
- Not covered: keyboard navigation of the member tabs (Arrow, Home, End), History tab and Downline collapse in the browser, tests for the History fallback and ambiguous-accreditation note.
- Failing tests that are not from this work: `src/shared/components/modern/pagination.test.tsx` ("calls onPageChange from the controls and disables the ends", fails in a1eb1bf alone); `src/panels/admin/dashboard-page.test.tsx` ("derives every Super Admin figure", text "Customer submitted" not found; it also failed before a1eb1bf and with the owner's layout files, not checked against a pristine tree).
- Open owner decisions carried over: Move B down-payment due date, required initial payment per scheme, overpayment/refund timing, Welcome Gift lapse, template authority, commission default rates. Doc 04 section 7.8 and the Customer ID decision D2 are still stale.
- No blockers.

## 7. Verification State
- Tests: targeted suites listed in section 4 passed; the full suite was not run. Known failures in section 6.
- Lint: clean on changed files; full `npm run lint` not run.
- Typecheck: 0 errors after the merge.
- Build: succeeded after the merge.
- Browser QA: see section 6.

## 8. Next Session Instructions
- Recommended first action: `/load`, then a browser pass over the merged pages (list in section 6), then decide how to handle the two unrelated failing tests.
- Relevant files: `src/panels/admin/pages/sales-network-member-detail-page.tsx`, `src/shared/components/admin/detail-hero.tsx`, `src/shared/components/modern/info-grid.tsx`, `src/shared/components/admin/admin-tabs.tsx`, `src/panels/admin/components/accreditation-status-action.tsx`, `src/panels/admin/pages/my-account-page.tsx`.
- Required approvals: any commit or push (owner only unless explicitly authorized again), AGENTS.md/CLAUDE.md edits, new dependencies.
- Warnings: do not run build and tests together; do not delete `.next`; a full page reload resets mock data to seed; stash is a backup, not needed after verification; scratchpad holds merge-prep and overlay folders that can be discarded.

## 9. Execution Recommendation
- Phase: QA
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: low
- Ultracode: OFF
- Token optimization: one browser pass and one targeted test run; investigate the two failing tests separately.
- Reason: code, tests and build are verified and pushed, but the merged UI has not been checked in the browser.
<!-- SESSION_SNAPSHOT_END -->
