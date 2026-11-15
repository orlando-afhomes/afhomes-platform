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
- Saved at: 2026-11-15 (the conversation itself ran mostly on 2026-11-12)
- Repository: afhomes-platform (remote not re-checked)
- Branch: develop
- HEAD: bc9a693 "feat: implement IGP, promos, allowances, month close, reports, notifications, and supporting modules" (verified this run). Whether it is pushed was not checked.
- Session objective (this conversation): audit `docs/implementation` and `docs/business-rules` for contradictions, ask the owner 8 questions (answers A1 to A8), apply them to the docs, and build two small app changes (HR activates office staff accounts; "Referred by me" sales tab).
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion.
- Context note: model switched Sonnet 5.5, then Opus 5.5, then Sonnet 5.5 (owner, /model). Ten subagents were used (5 read-only auditors, 5 doc editors). The owner wants every reply in "explain like I am 5" language (memory `plain-language-questions.md`).
- IMPORTANT: this conversation did not do the work in commits a0cba09 and bc9a693, nor the 216 uncommitted files listed in section 5. They came from other sessions or the owner after this conversation's last real step. Their content was not reviewed here.

## 2. Current Project State
- This conversation's work is committed in `d7a6ca5` "feat: record owner rulings A1-A8, add referred-by-me sales tab, let HR reactivate staff accounts" (verified by the commit title and its stat: 47 files). The 28 doc edits and the 11 `src/` edits from this conversation should be inside it.
- Two later commits (both 2026-11-13), titles and sizes only, not reviewed: `a0cba09` "finish prototype milestones M1-M4, M9, M10 (error pages, Clerk role, accreditation, OST applications, customer approval, Redemption, reconciliation)" (158 files) and `bc9a693` "implement IGP, promos, allowances, month close, reports, notifications, and supporting modules" (221 files).
- Consequence to check: the docs and `AGENTS.md` still say Redemption is disabled and IGP is not built. The titles above suggest the code has moved past that. Trust the code, then ask the owner whether the docs need updating. Not verified.

## 3. Important Decisions
Owner answers, 2026-11-12 (still binding):
- A1 Points plus cash: split by whole nights. A2 Keep Customer ID `YYYY-NNNN` at submit; never the VIP Number.
- A3 Finance, Administrator or Super Administrator may approve a payout list they prepared; flagged in history.
- A4 HR activates and reactivates office staff accounts only. A5 Final: no Acting or temporary leader. A6 Renewal allowed while login is Suspended or Deactivated.
- A7a Card transfer cancels the former holder's future points bookings, staff inform first. A7b Year 1 spend not met at first redemption: tranche 1 not released or carried over.
- A8 My Sales is closing seller only; separate "Referred by me" list.
- Still true: only the owner commits or pushes; mock login must be removed when real auth lands; SweetAlert2 via `AppAlert` for all confirmations.

## 4. Completed Work
- Audit: about 97 mismatches found and fixed in docs 01 to 14, the matrix proposal, `docs/implementation` (README, decisions-and-gaps, phase-01 to phase-11, new card F11.7). Old text marked "Superseded", not deleted.
- Code with tests (TDD): `staff-repository.ts` (HR activation, Administrator accounts protected), `modules/sales/{types,rules}.ts` (`referredSales`), `contract-repository.ts`, `sale-repository.ts`, `seed-data.ts`, `sales-page.tsx`.
- Verification at that time (before the later commits): 539 tests passed in 32 files; `npx tsc --noEmit` clean. Not re-run now.

## 5. Git Working Tree
- Staged: none (verified). Stash: `stash@{0}` "local: sales-network cleanup + member detail redesign" still kept.
- Unstaged: 196 modified files (verified count, `git diff --stat`: 196 files, 3902 insertions, 2409 deletions). Almost all under `src/` (admin pages, `src/app/admin/*/page.tsx`, shared components, navigation, notifications, mock repositories); 4 under `docs/`. Exact list: run `git status --short`. Git only warns about LF to CRLF.
- Untracked: 20 files (verified), for example `src/app/admin/reports/page.tsx`, `src/panels/admin/area-redirect.ts`, `src/shared/components/admin/area-page.tsx`, `src/modules/notifications/format-action.ts`, several `*-area-page.tsx` pages and their tests.
- Origin: not this conversation. They look like a navigation and area-page restructure, which is an inference from file names only.
- `workflow/save-session.md` was unmodified before this save.

## 6. Pending Tasks
- Owner to review the 216 uncommitted changes and commit them (owner only).
- Decide whether docs and `AGENTS.md` need updating for the later commits (Redemption and IGP status).
- Browser QA of the two screens from this conversation (HR turning an account on; "Referred by me" tab), and of the new area pages.
- D-B: stamp the 40% month by receipt date (doc 13 OCT O3). Not checked whether the later commits changed it.
- Open owner item: overpayment and refund timing (phase-07 F7.1) is not on the decisions page.
- Small cleanups: doc 08 "R8 items 3-6" citations; doc 07 section 18 title "VIP Card ID Integration".
- Open outside the team: signed IST Clawback Addendum, IGP grant terms and band code above PHP 9M, points-per-night table, legal retention period.
- Workflow Atlas (outside the repo) not updated; consider `/update-workflow-atlas`.

## 7. Verification State
- Tests, lint, typecheck, build: not performed in this save run. Last known results (2026-11-12, before commits a0cba09 and bc9a693): 539 tests passed, typecheck clean, lint only an unused-variable warning in `genealogy.ts`.
- Docs: a second audit after the doc edits was not run.
- Not performed: browser QA; a review of the later commits and the uncommitted files.

## 8. Next Session Instructions
- Recommended first action: `/load`, then run `git status --short` and `npx tsc --noEmit` to see whether the uncommitted work compiles, and ask the owner what the 216 files are.
- Relevant files: `docs/implementation/decisions-and-gaps.md`, `src/panels/admin/navigation.ts`, `src/shared/components/admin/area-page.tsx`, `src/panels/admin/pages/sales-page.tsx`.
- Required approvals: any commit or push (owner only), any new feature, real authentication, `AGENTS.md` edits.
- Warnings: do not run build and tests together; do not delete `.next`; do not revert the uncommitted files; mock data resets on refresh; a dev server may already run on port 3000.

## 9. Execution Recommendation
- Phase: QA
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: medium
- Ultracode: OFF
- Token optimization: typecheck, then targeted tests for the changed areas; do not re-read the docs.
- Reason: a lot of unreviewed work landed after this conversation, so verification comes before any new feature.
<!-- SESSION_SNAPSHOT_END -->
