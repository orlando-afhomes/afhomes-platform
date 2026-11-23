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
- Saved at: 2026-11-23 (Asia/Singapore).
- Repository: AFHomes Platform, `afhomes-platform`; branch `develop`; HEAD `3058633` at this save.
- Tool: Codex. Exact model identifier: not verified.
- Objective: document the Firebase delivery sequence, resolve the mock-app review findings, and save a handoff.
- Development phase: frontend/mock prototype complete for the reviewed fixes; Firebase technical guides written. Localhost full-stack setup has not started in this session.
- Context: based on the available conversation and the repository checks below. Historical verification is identified separately.

## 2. Current Project State
- Verified at save: `3058633` is titled `feat: complete mock feature gaps and move the planned stack to Firebase`. The working tree was clean before this save. The Firebase roadmap and IGP regression tests are tracked.
- Current app is still based on typed, browser-memory mock data. The Firebase roadmap is a planned stack change, not a completed backend or deployment.
- Begin at `docs/implementation/02-full-stack/README.md`. It links the numbered Localhost, Staging, and Production guides and the existing FP1–FP16 feature records. The prototype completion plan's older branch/working-copy note is historical; use live Git status.

## 3. Important Decisions
- Planned stack: one Next.js app, `/api/v1` Route Handlers and Zod, Firebase Auth, server-only SQL Connect with PostgreSQL, and private Firebase Storage. Use emulators locally. Vercel is the sample-data preview option subject to its plan terms. Start the Spark database trial when ready to test the local pilot against hosted PostgreSQL. Verify Firebase App Hosting in staging; Cloud Run is the fallback.
- Launch all approved modules together after staging sign-off and approved imports only. Deployments, billing, real authentication, database work, and each implementation milestone require separate approval.
- Doc 07: cash receipt allocation uses the shared receipt reservation check. Doc 08: saving copied allowance figures requires an explicit split confirmation, renewed after edits; changing month or leader clears the copied figures. Doc 14 §5.3: frozen Series Number segments must match the imported fields. IGP history import remains available to Administrators and Super Administrators.
- Agent Git operations are read-only. Only the owner can stage, commit, and push. Keep mock mode synthetic and browser-scoped.

## 4. Completed Work
- Created 23 Firebase implementation guides and updated 18 existing technical/navigation files. See `docs/implementation/02-full-stack/00-documentation-transition.md` for the file inventory. Kept business-rule files and historical stack evidence.
- Cash receipts now skip numbers reserved by unmatched receipts, across ordinary entry and related cash-entry forms. Allocator: `src/data/mock/payment-repository.ts`.
- Allowance confirmation is required again after editing copied figures. Month and leader changes clear the copied draft. See `src/panels/admin/pages/allowance-review-page.tsx`.
- IGP history import rejects missing replacement chains, circular links and dependent rows, dates that do not exactly match the Series Number, and payment plan, term months, or contract type mismatches. The shared validator runs in preview and on Confirm. See `src/modules/igp/history-import.ts` and `src/modules/igp/history-import.test.ts`.
- Review fixes and their tests predate this save and are in the now-committed working baseline. This save changes only the handoff snapshot.

## 5. Git Working Tree
- Before this save: branch `develop`, HEAD `3058633`; nothing staged, unstaged, untracked, deleted, or renamed. Verified with read-only Git.
- This-session change: `workflow/save-session.md` snapshot only, unstaged. All other files were already in the committed baseline.

## 6. Pending Tasks
- Actual payout switch under Doc 08 §16 is still open. The workbook sign-off screen records a comparison rather than switching payouts.
- Doc 14 IGP buyer membership amendment still needs owner sign-off. Do not treat the prototype behavior as an approved live rule.
- Prototype browser checks still listed as open: throttled navigation, forced error/retry, Back on a dirty form, and visible keyboard focus. See `docs/implementation/01-prototype/ui-states/16-state-verification.md`.
- Firebase emulator, backend/API, Spark trial, demo release, and production work await separately authorized milestones.

## 7. Verification State
- Earlier review work at `6ea21df` plus working changes: 172 tests passed in nine suites for receipt, IGP, and allowance fixes. The latest IGP field-validation pass reported 20 tests passing across three IGP suites, TypeScript exit 0, targeted ESLint exit 0, and `git diff HEAD --check` exit 0.
- Documentation earlier passed 329 internal link checks and `git diff --check`. These are prior checks, not reruns at `3058633`.
- This save verifies Git state, presence of the tracked roadmap and regression tests, and selected fix symbols. Application tests, lint, typecheck, build, browser QA, and deployments were not performed for this save.

## 8. Next Session Instructions
- Run `/load` and verify live HEAD first. Start with `docs/implementation/02-full-stack/README.md` and the current `AGENTS.md`.
- If the owner authorizes localhost work, follow `docs/implementation/02-full-stack/01-localhost/01-database-and-emulators.md` before backend/API work. For QA only, use the open browser checks and the existing mock fixtures.
- Keep the payout switch and Doc 14 amendment pending until explicitly approved. Do not edit Git state or start hosted provisioning based on this snapshot.

## 9. Execution Recommendation
- Phase: QA if closing prototype checks; Plan if preparing the localhost milestone.
- Current mode: Codex Default.
- Recommended next mode: Default for authorized QA; Plan for localhost architecture decisions.
- Current model: not verified.
- Recommended model: keep the available coding model in the active session.
- Effort: medium.
- Ultracode: OFF.
- Token optimization: read only the next numbered guide or the open QA cases, then run targeted checks.
- Reason: prototype fixes are recorded; the next implementation milestone needs explicit scope and approval.
<!-- SESSION_SNAPSHOT_END -->
