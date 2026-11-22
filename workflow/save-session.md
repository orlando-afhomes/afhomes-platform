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
- Saved at: 2026-11-22 (Asia/Singapore; exact time not recorded).
- Repository: afhomes-platform.
- Branch: develop.
- HEAD: 1dbba88 (verified).
- Objective: Implement approved AFHomes architecture phases 0–7, resume after an interrupted session, finish validation and save a handoff.
- Development phase: Frontend prototype on typed browser-memory data. Backend, real authentication, database, migrations and deployment remain deferred.
- Context note: This session resumed from prior conversation state and verified current files.

## 2. Current Project State
- Verified current branch and HEAD: develop at 1dbba88. Nothing is staged.
- Architecture work from the previous run is present in commits through 1dbba88. This agent did not make Git writes.
- This resumed turn completed the Settings lazy-load experiment, corrected asynchronous test readiness and updated the architecture report.
- Existing portal/UI work remains in the tree and was preserved. The current tree has 59 modified tracked files and 7 untracked files; not all belong to this architecture task.
- Settings defers Payment Plans, Import Old Records and Property Projects (IGP) using Next dynamic imports and an accessible skeleton.

## 3. Important Decisions
- Keep the existing Next.js modular monolith and installed stack. No dependencies added.
- Linked account data is the source of live roles for linked mock identities; unlinked synthetic personas retain their fixed roles.
- Access changes cancel pending authority reads and remove protected query caches before fresh grants appear. Public Experiences, Offers and VIP projections remain allowlisted. Real production authorization requires backend checks in future work.
- Per owner choice on 2026-11-22, new payment schemes reject conflicting single and per-tier payment codes. Existing contract snapshots and issued VIP Numbers remain unchanged. Document 06 records this decision.
- Customer cursor pagination is additive, stable by ID, and limited to 1–100 entries. No HTTP/database rollout was included.
- Git staging, commits, pushes, merges, resets and deployment remain owner-only.

## 4. Completed Work
- Phases 0–7 are summarized in docs/development/architecture-refactoring-report.md.
- Controlled production webpack comparison, five cacheless HTTP samples per variant with all other production source hashes unchanged:
  - Eager Settings: 44 scripts, 727,295 compressed body bytes, 2,387,077 decoded bytes.
  - Lazy Settings: 43 scripts, 718,537 compressed body bytes, 2,356,728 decoded bytes.
  - Savings: 8,758 compressed bytes (1.204%). No browser speed/Core Web Vitals claim.
- Production browser smoke verified synthetic sign-in and Products, Payment Plans, Property Projects and Import Old Records panels. The temporary tab was closed.
- Final full Vitest run: 192 files, 1,983 tests passed, zero failed. Raw output: workflow/architecture-baseline/final-verified-tests.json.
- TypeScript, lint, architecture scan (672 source files), architecture checker tests (4/4), production webpack build (100 pages), and git diff check passed.
- The earlier full run had five readiness assertion failures. Four affected test files were updated to await async access/data; their corrected run passed 45/45 before the final clean full run.

## 5. Git Working Tree
- Staged: none.
- Unstaged: 59 modified tracked files. Existing owner portal/UI changes include customer portal, QR/repository changes, admin/public layout and styling. This resumed task changed the architecture report, Settings page lazy imports, and asynchronous readiness assertions in four tests. Other current edits may be owner work.
- Untracked: 7 files: scripts/measure-route-payload.mjs; src/panels/admin/components/customer-detail-photo.test.tsx; src/shared/components/dashboard/page-actions.css; src/shared/components/dashboard/page-actions.test.tsx; src/shared/components/dashboard/page-actions.tsx; src/shared/forms/validation/image.ts; src/shared/lib/member-qr-image.ts.
- Deleted/renamed: none reported.
- Read-only diff stat: 59 files, 1,140 insertions, 399 deletions.
- Initial and resumed inventories are under workflow/architecture-baseline. The tracked patch does not back up untracked files.

## 6. Pending Tasks
- No approved work remains in the architecture roadmap scope.
- Browser Performance API timing and Core Web Vitals were not available; current evidence is HTTP script payload size and functional rendering.
- Database pagination/indexes, snapshot-consistent cursors, production authentication and server authorization remain future separately authorized work.
- Preserve current user changes in any later work.

## 7. Verification State
- Full suite: 1,983/1,983 passed across 192 files.
- TypeScript: passed.
- ESLint plus architecture scan: passed.
- Architecture checker tests: 4/4 passed.
- Production webpack build: passed; 100 pages generated.
- Browser smoke: passed for synthetic sign-in and the four Settings panels.
- Payload measurement is compressed and decoded script response body size; it excludes headers, inline payload, CSS/fonts and does not measure latency.
- Corrected targeted suites: commission/report 28/28, profile 11/11, reconciliation import 6/6, Settings/IGP 26/26.
- Benign JSDOM scroll/canvas/navigation warnings and one React key warning appeared; final suite passed.
- No database or migration check was needed or run.

## 8. Next Session Instructions
- First run /load; verify current status, branch and HEAD. Preserve the 59 modified tracked and 7 untracked files.
- Review docs/development/architecture-refactoring-report.md and workflow/architecture-baseline/final-verified-tests.json.
- Inspect the current diff for src/panels/admin/pages/vip-products-page.tsx and the four asynchronous test updates with the owner’s current changes before further edits.
- No owner decision remains for the implemented architecture scope. New backend/auth/database/production work needs its own authorization.
- Do not perform Git writes or destructive operations.

## 9. Execution Recommendation
- Phase: QA complete.
- Current mode: not verified.
- Recommended next mode: Plan for any new requested scope.
- Current model: GPT-6 Luna (supplied by system).
- Recommended model: GPT-6 Sol, medium effort for routine frontend work; availability not verified.
- Effort: medium.
- Ultracode: OFF.
- Token optimization: inspect only the targeted current diff and avoid repeating completed checks without new changes.
- Reason: implementation and final verification are complete; remaining modifications include preserved owner work.

<!-- SESSION_SNAPSHOT_END -->
