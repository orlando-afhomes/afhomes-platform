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

Migrated from the retired `workflow/session.md` (its last verified date was 2026-10-29) and checked against live Git state on 2026-11-06. Where the two disagree, the live state below wins.

## 1. Session Metadata
- Saved at: 2026-11-06 (live `/save` run; Git state re-read at save time)
- Repository: afhomes-platform
- Branch: develop
- HEAD: 5e238ac (`frontend: polished sales network and organization ui`)
- Session objective: finish the session-handoff workflow (`/save` and `/load`), relocate the audit, and clean `workflow/`. Workflow cleanup is complete; `/save` was run once to verify the snapshot path.
- Development phase: Phase 05–06 frontend prototype. Mock data only. No backend, auth, database, or deployment.

## 2. Current Project State
- Stack: Next.js App Router, React, TypeScript, Ant Design 6, regular namespaced CSS, TanStack Query, Vitest. Zod installed, not yet used in `src/`.
- Directories: `src/app`, `src/panels`, `src/modules`, `src/shared`, `src/data` (mock repositories and contracts), `src/theme`. No `src/server`.
- Shared form system in `src/shared/forms/`: typed field components, formatting, validation, barrel `@/shared/forms`. Business-rule free.
- Sales Network and Staff UI wired to shared components. Staff form has split names, suffix, address, and government ID. Reusable `ProfilePhotoUploader` and `SuffixField`.
- Reusable `DirectoryTable`; table rows open detail views.
- `showFieldErrors()` modal lists every invalid field on the major forms.
- Cross-classification transfers (IST ↔ OST) implemented in the sales-network repository; blocks moves that would orphan a downline.
- Current focus: owner review of committed work and of the uncommitted workflow changes.

## 3. Important Decisions
- Owner-approved: frontend-first with mock data that resets on refresh. Nothing persists in browser storage or servers.
- Owner-approved: AI agents never stage, commit, push, merge, reset, or deploy. Only the owner does these (AGENTS.md).
- Owner-approved: formal gates (lint, full test, typecheck, build, browser QA) are deferred until the full frontend prototype is complete.
- Behavior notes flagged for review: non-admins get no status action on non-active members, and direct active→Suspended is no longer offered. Cross-classification transfers keep the original accreditation records, because no reclassification policy exists. The Edit member modal does not change the profile photo.
- Restrictions: the Phase 07 IST/OST portals are planning only. Do not implement them.

## 4. Completed Work
- Committed in `5e238ac` (owner-committed 2026-10-28): the shared forms, Sales Network and Staff UI, directory tables, validation UX, transfer workflows, and profile editing listed above.
- Files: `src/shared/forms/`, `src/modules/sales-network/`, `src/modules/organization/`, `src/panels/admin/`, `src/data/`.
- Verification (2026-10-29, targeted only): vitest green for staff (11), departments (14), roles (13), accounts (9), my-account (7), sales-network repo, mock store, and genealogy (59).
- Workflow work this task: `/save` and `/load` skills registered in `.claude/skills/`; workflow files `save-session.md` and `load-session.md`; `graphidian/` and `opencode/` deleted; `docs/audits/afhomes-v3-project-audit.md` created as a copy of the audit.

## 5. Git Working Tree
- Staged changes: none.
- Unstaged changes (`git diff --stat`: 14 files, 109 insertions, 1983 deletions):
  - `AGENTS.md`: modified (governance condensation; 109 insertions, 747 deletions; reference updates to the session snapshot).
  - `workflow/graphidian/*` and `workflow/opencode/*` (12 files): deleted. Recoverable from HEAD.
  - `workflow/session.md`: deleted (its uncommitted edits were migrated into this snapshot, then the file was removed).
- Untracked files: `.claude/skills/save/SKILL.md`, `.claude/skills/load/SKILL.md`, `CLAUDE.md`, `workflow/load-session.md`, `workflow/save-session.md`, `docs/audits/afhomes-v3-project-audit.md` (relocated copy of the former `workflow/claude/project-audit.md`, which was removed after a byte-identical check).
- Deleted or renamed: the deletions above. Git records no renames.
- Origin: all listed changes came from this session's authorized work (governance condensation, workflow cleanup). No unrelated changes were found at save time.
- Unfinished work: none in progress. Owner decides what to commit. Do not auto-commit.

## 6. Pending Tasks
- Owner to review and commit the uncommitted changes listed in section 5.
- Formal gates, deferred by owner: `npm run lint`, `npm test`, `npx tsc --noEmit`, `npm run build`, browser QA.
- Known baseline failures (from the project audit, `docs/audits/afhomes-v3-project-audit.md`): lint errors, typecheck errors (partly from stale `.next` types), and one load-sensitive full-suite test in staff. Not re-verified this session.
- Open policy items: referral-code issuance, OST applicant fields, submission and approval authority, account provisioning, AAO issuance timing, renewal operations, portal access on expired accreditation, legacy fixture migration, production domain and sizing.
- Unresolved conflict: module-level versus operation-level permissions (doc 01 versus code). Owner decision required.
- Blockers: none that stop frontend work.

## 7. Verification State
- Tests: targeted suites passed on 2026-10-29. Full suite not run this session.
- Lint: not run this session.
- Typecheck: not run this session.
- Build: not run this session. `.next/` may be stale (about 1.8 GB). Delete it only with owner approval.
- Browser QA: not run this session.
- Known failures: see section 6.
- Checks not performed: all of the above for this session. Structural checks, `git status` and `git diff --stat` only. The `/save` run did not run the project's test or build commands.

## 8. Next Session Instructions
- Recommended first action: run `/load`, then have the owner decide whether to commit the uncommitted changes.
- Relevant files: `AGENTS.md`, `CLAUDE.md`, `docs/audits/afhomes-v3-project-audit.md` (historical; not authority), `docs/business-rules/01-roles-and-permissions.md`, `src/modules/identity/permissions.ts`.
- Required approvals: any commit, push, or deletion of `.next/`; the permission-model decision; any frontend change beyond the approved scope.
- Warnings: do not treat the audit as current authority. Browser refresh resets mock data. A dev server adds an `AGENTS.md` append block (remove it). The `workflow/session.md` file was retired by this task.

## 9. Execution Recommendation
- Phase: Verification (session handoff set up; no implementation pending)
- Recommended next mode: Plan, for the owner's commit decision and any next frontend task
- Recommended model: Haiku 5.5 for `/load`; Sonnet 5.5 for any substantive frontend work
- Effort: low for `/load`; medium for frontend work
- Ultracode: OFF
- Token optimization: `/load` reads only the snapshot, `CLAUDE.md`, `package.json` and targeted files; the snapshot is replaced on each save, not appended
- Reason: the handoff system is in place, and the next real checkpoint is a live `/load` in a new session.

<!-- SESSION_SNAPSHOT_END -->
