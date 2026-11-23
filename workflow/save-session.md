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
- Saved at: 2026-11-23 (Asia/Manila business date; exact time not recorded).
- Repository: AFHomes Platform; branch `develop`; HEAD `6ea21df` (verified in this run).
- Tool and model: OpenCode, DeepSeek V4.1 Flash 1017 (from the session environment).
- Session objective: implement `docs/implementation/fixes/06-prototype-completion-plan.md`, one stage per session.
- Development phase: frontend mock prototype; UI-state hardening and QA. Backend, real authentication, database and deployment remain deferred.
- Context note: the conversation was not compacted. Everything below was read or run in this session unless marked otherwise.

## 2. Current Project State
- The plan's Stage 0 was partially run, and Stage 1 (Admin Batch 3) is implemented but uncommitted.
- Stage 1: period close shows `Button loading`; the shared `useConfirmRun` now blocks a duplicate confirm with a ref; report export shows a spinner/`aria-busy` and ignores a second export while recording.
- The fixes register now shows Batch 3 built and Stage 0 partial. The user-added `docs/implementation/fixes/06-prototype-completion-plan.md` remains untracked.
- Mock feature gaps G1–G5, Batches 2 and 4, the browser and role acceptance, and document drift remain open.

## 3. Important Decisions
- The completion plan governs the order: Stage 0 browser close-out, Stage 1 Batch 3, Stage 2 Batch 2, Stage 3 Batch 4, Stage 4 G1–G5 plus IGP leftovers, Stage 5 QA, Stage 6 docs, Stage 7 outside the prototype. One stage per session.
- Batch 3 went before Batch 2 because month close is irreversible and had no busy guard.
- Report export uses a spinner; the plan allowed either a spinner or a documented "keep disabled" choice.
- `useConfirmRun` now guards every confirm action against a second click, not only month close.
- No business rule changed. Git writes remain reserved for the owner.

## 4. Completed Work
- Stage 1 files: `src/panels/admin/pages/period-close-page.tsx`, `src/shared/components/modern/use-confirm-run.tsx`, `src/panels/admin/components/report-shell.tsx`.
- Stage 1 tests: `src/panels/admin/components/confirm-tones.test.tsx` (month close double-click sends one request; the page button shows `aria-busy`/`aria-disabled`) and `src/panels/admin/reports-pages.test.tsx` (Export trigger busy while the export is recorded).
- Docs: `docs/implementation/prototype/16-state-verification.md` records the 2026-11-23 browser pass; `docs/implementation/fixes/README.md` marks Batch 3 built, Stage 0 partial, and adds the plan row.
- Stage 0 browser pass: the home page at 320/375/768/1100/1280 px has no document-level horizontal overflow; at 768 px one tier-card image paints 10 px into its clipped card. `/admin/membership` (both tabs), `/admin/commissions/allowances`, `/admin/finance/collections/ctr-1`, `/admin/finance/cancellations/ctr-1` and `/admin/reports/period-close` loaded with data and no application console errors.

## 5. Git Working Tree
- Branch `develop`, HEAD `6ea21df`, nothing staged.
- Unstaged, this session: the seven Stage 1 source and documentation files in section 4.
- Unstaged, this save: `workflow/save-session.md` held the previous handoff; this save replaces only its snapshot block.
- Untracked, pre-existing/user: `docs/implementation/fixes/06-prototype-completion-plan.md`.
- No deleted or renamed tracked files.

## 6. Pending Tasks
- Stage 0 manual checks: reduced motion, no JavaScript, throttled navigation, keyboard and focus order, forced query error with retry, and double-click on every mutating button.
- Stage 2 (Batch 2): customer detail and edit error branches, customer empty-versus-no-match wording, sales-network list `QueryState`, member detail errors, genealogy error branch. Stage 3 (Batch 4): organization, staff, departments, roles, Lists, scheme-guide empty state, account error, promos, and the S6 decision.
- Stage 4: G1 unmatched receipts, G2 linked effects, G3 allowance assembly and workbook comparison, G4 historical sign-off, G5 portal-plan audit. IGP buyer membership and IGP history import need owner decisions.
- Stage 5: the browser matrix and the F5.5, F5.7, F9.4, F1.5a, F3.2, F4.2 and F11.3 walkthroughs. Stage 6: D1–D8 and the README status refresh.

## 7. Verification State
- Targeted Stage 1 suites (confirm-tones, reports-pages, finance-pages, audit-logs-page, reconciliation-import-pages): 51/51 passed.
- `npx tsc --noEmit`: passed. `npm run lint`: passed (ESLint and the architecture check, 677 files). `npm run build`: passed, 101 pages.
- Full `npm test`: 2,013 passed, 5 failed of 2,018. All five were 15 s timeouts under load (`business-pages` 3, `staff-page` 2); both files pass alone, 123/123 in 211 s. The dev server was running, which raises load.
- Browser QA: the width and page-load checks above; no application console errors (one Next.js dev HMR socket entry after a back-forward navigation).
- Not performed: reduced motion, no JavaScript, throttled navigation, keyboard and focus, forced-error retry, and the full double-click sweep. The office-address test still times out under full load despite `delay: null`; it passes alone in about 3.9 s.

## 8. Next Session Instructions
- Run `/load`, verify HEAD, and review the uncommitted Stage 1 changes before building on them; the owner commits.
- Then run Stage 2 from `06-prototype-completion-plan.md` and `01-admin-ui-state-fixes.md` (Batch 2). Stage 2 needs owner approval; do not start Stage 3 in the same change set.
- Inspect `src/panels/admin/pages/customer-detail-page.tsx` (it still shows "Customer Not Found" without a query-error branch), `customers-page.tsx`, the sales-network pages, `sales-network-member-detail-page.tsx` and the genealogy page.
- Run the full suite with the dev server stopped to separate real failures from load timeouts.

## 9. Execution Recommendation
- Phase: Build, paused between stages.
- Recommended next mode: default, for Stage 2 after the owner reviews and commits Stage 1.
- Recommended model: Sonnet 5.5.
- Effort: medium.
- Ultracode: OFF.
- Token optimization: one stage per pass, targeted suites first; run the full suite once with the dev server stopped.
- Reason: Stage 1 is verified; the remaining risk is the unbuilt stages and the manual browser acceptance.
<!-- SESSION_SNAPSHOT_END -->
