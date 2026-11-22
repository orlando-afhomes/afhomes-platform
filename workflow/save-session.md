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
- Saved at: 2026-11-22 (Asia/Manila business date; exact time not recorded).
- Repository: afhomes-platform; branch `develop`; HEAD `b64f4d3` (verified in this run).
- Tool and model: Claude Code (desktop app), Sonnet 5.5 as reported by the environment.
- Session objective: Save a handoff snapshot only. This session's own context contained just the `/save` request; no implementation work was done or seen in it.
- Development phase: Frontend prototype on typed in-memory mock data; backend, real authentication, database, migrations, and deployment remain deferred.
- Context note: The conversation had no earlier turns. Everything below about the working tree comes from read-only Git inspection. The cause and intent of the uncommitted changes are NOT known from this session.

## 2. Current Project State
- Branch `develop`, HEAD `b64f4d3` (`feat: add promo rewards and public offers, customer portal, GSD counter`, committed 2026-11-22 11:17 +0800). Verified.
- The previous snapshot (OpenCode run) recorded a clean tree at `b64f4d3`. The tree is no longer clean: 101 uncommitted entries exist now (see section 5). Verified by `git status`.
- From file names only (assumed, not verified by reading the diffs): the uncommitted work looks like Phase 2 (dynamic Experiences: `src/modules/experiences/`, `src/data/mock/experience-repository.ts`, `src/panels/admin/pages/experiences-page.tsx`, `src/app/admin/experiences`, `src/app/(public)/experiences/[slug]`), plus a public-content repository, an access snapshot (`src/data/access-snapshot.ts`), role helpers (`src/modules/identity/active-roles.ts`, `record-scope.ts`), a finance collection-state module, an architecture check script (`scripts/check-architecture.mjs`), and notification module-nav relocation.
- Treat all of that as unknown until the owner confirms or the diffs are read.

## 3. Important Decisions
- Carried over from the prior snapshot (not re-verified here): frontend-first with browser-memory-only mock data; Stay Points and Promo Points stay separate; GSD is a prototype-only identity; live Redemption, customer submissions, and Services stay disabled; Phase 2 and Phase 3 need explicit owner authorization.
- Project Git policy: the owner alone stages, commits, pushes, merges, resets, and deploys. No agent performs any Git write.
- No new decision was made in this session.

## 4. Completed Work
- This session: only this snapshot was written. No application, documentation, or test change was made by this session.
- Prior committed work (`b64f4d3`): Phase 1 customer portal, promo rewards and public offers, GSD counter, experience badge and copy changes, `docs/implementation/` reorganization. Source: prior snapshot.

## 5. Git Working Tree
- Branch `develop`, HEAD `b64f4d3`.
- Staged: none (`git diff --cached --stat` empty).
- Unstaged: 72 entries, 1,905 insertions and 851 deletions (`git diff --stat`). 71 modified, 1 deleted. Status: pre-existing or unknown (not made by this session).
  - Largest groups: `src/panels/admin` (17 files), `src/data/mock` (14), `src/panels/public` (10), `src/shared/providers` (4), `src/modules/vip` (3), `src/data/contracts` (3), `src/app/(public)/experiences` (3 pages).
  - Also modified: `package.json`, `docs/development/architecture.md`, `docs/development/backend.md`, `src/modules/identity/permissions.ts` and test, `src/modules/customers/import.ts` and test, `src/modules/audit/types.ts`, `src/modules/sales-network/genealogy.ts`, `src/modules/public-site/content/vip.ts`, and this file.
- Deleted: `src/modules/notifications/module-nav.ts` (a new `src/panels/admin/notifications/module-nav.ts` is untracked, so this looks like a move).
- Untracked: 29 files, status pre-existing or unknown.
  - `scripts/check-architecture.mjs` and `.test.mjs`
  - `src/app/(public)/experiences/[slug]/page.tsx`, `src/app/admin/experiences/page.tsx`
  - `src/data/access-snapshot.ts` and test; `src/data/contracts/experience-repository.ts`, `public-content-repository.ts`; `src/data/experience-queries.ts`, `public-content-queries.ts`
  - `src/data/mock/customer-pagination.test.ts`, `experience-repository(.test).ts`, `public-content-repository(.test).ts`
  - `src/modules/experiences/` (`rules.ts`, `sample-seed.ts`, `types.ts`); `src/modules/finance/application/collection-state(.test).ts`; `src/modules/identity/active-roles.ts`, `record-scope.ts`
  - `src/panels/admin/components/customer-draft.ts`; `src/panels/admin/notifications/module-nav.ts`; `src/panels/admin/pages/experiences-page(.test).tsx`; `src/panels/admin/providers/notifications-provider.tsx`
  - `src/panels/public/experience/` (2 files); `src/panels/public/pages/experience-detail-page.tsx`, `standard-experience-page.tsx`
  - `src/shared/providers/customer-portal-provider.test.tsx`
- Git also warns that LF will be replaced by CRLF on many modified files; this is a line-ending notice, not a content change.
- Unfinished work: the above looks like an in-progress, uncommitted milestone. Its completeness is unknown.

## 6. Pending Tasks
- Owner to confirm what the 101 uncommitted entries are (Phase 2 Experiences or something broader) and whether they were authorized.
- Phase 2 (dynamic Experiences) and Phase 3 (VIP product drafts, Super Admin approval) remain subject to explicit owner authorization.
- Reconcile the external `AFHomes Document\Business Rules` folder with the repository Promo Points amendment before any production rollout (from prior snapshot).
- Full-suite timeouts (`business-pages`, `staff-page`) were a known project issue (from prior snapshot).
- Keep live Redemption, customer submissions, Services, and public customer/card lookup disabled.

## 7. Verification State
- This session: tests, lint, typecheck, build, and browser QA were all not performed.
- Prior state, valid only for commit `b64f4d3` and not for the current dirty tree: targeted tests, `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed; full suite 1,881 passed with 16 timeouts.
- The current uncommitted tree has no recorded verification.

## 8. Next Session Instructions
- First action: run `/load`, then `git status --short` and ask the owner what the uncommitted changes are before building on them.
- Then run `npx tsc --noEmit` and targeted tests on the new files (`src/data/mock/experience-repository.test.ts`, `src/panels/admin/pages/experiences-page.test.tsx`, `src/data/access-snapshot.test.tsx`) to learn their real state.
- Files to inspect: `src/modules/experiences/`, `src/data/mock/experience-repository.ts`, `scripts/check-architecture.mjs`, `docs/implementation/prototype/customer-portal-plan.md`.
- Approvals needed: owner authorization for any further phase work. All Git writes stay with the owner.
- Warnings: do not assume the dirty tree is verified or complete. Do not delete, overwrite, or discard these files. Do not enable live Redemption or Services.

## 9. Execution Recommendation
- Phase: QA (review and verify the uncommitted work before more building).
- Current mode: not verified.
- Recommended next mode: Plan, then Build only after the owner approves scope.
- Current model: Sonnet 5.5 (reported by environment, not independently verified).
- Recommended model: Sonnet 5.5.
- Effort: high.
- Ultracode: OFF.
- Token optimization: read the diffs of the new files only, run targeted tests first, and avoid the slow full suite until the tree is understood.
- Reason: The working tree holds a large multi-file change of unknown origin, so verification should come before any new building.
<!-- SESSION_SNAPSHOT_END -->
