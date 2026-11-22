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
- Saved 2026-11-22 (Asia/Singapore). AFHomes Platform, develop, HEAD 50d6143.
- Tool and model: Codex, GPT-6.2 Sol for this save.
- Objective: Restore the architecture handoff, review the portal and UI changes, then verify the three follow-up fixes. Phase: frontend prototype and QA.

## 2. Current Project State
- HEAD advanced from the reviewed working tree's base 1dbba88 to 50d6143, titled “feat: rebuild customer portal app, compact phone headers and lazy-load settings.” Commit actor was not investigated.
- The prior architecture handoff records phases 0–7 complete for browser-memory mock data. See docs/development/architecture-refactoring-report.md for scope and evidence.

## 3. Important Decisions
- Portal sign-in requires exactly one normalized email owner across all customer records before card eligibility is checked. Duplicate contact emails are rejected without revealing the other owner.
- Profile photos accept up to 2 MiB. Save validation rejects empty or incorrectly padded base64. Profile shows Activated immediately above Valid until.
- Preserve browser-memory mock data and the approved stack. Backend, real authentication, databases, migrations and deployment require separate authorization. Git writes are owner-only.
- Architecture decisions remain in the architecture report and canonical business rules, including rejection of conflicting payment codes for new configurations while preserving existing contract and VIP Number snapshots.

## 4. Completed Work
- User supplied fixes. Codex reviewed them and independently verified the three findings were resolved. Review and save made no source edits.
- Relevant files: src/data/mock/customer-portal-repository.ts and its test, src/shared/forms/validation/image.ts and its test, src/panels/customer-portal/pages/customer-portal-page.tsx, and src/panels/customer-portal/customer-portal-page.test.tsx.
- The final review confirmed the shared-email case with only one cardholder, exact image size boundaries and invalid padding, and the two membership dates and their order.

## 5. Git Working Tree
- Before this save: clean at 50d6143. No staged, unstaged, or untracked files and no pending deletions or renames.
- This save modifies only the snapshot body in workflow/save-session.md. No other changes were made in the save turn.

## 6. Pending Tasks
- No open findings remain within the three-fix review scope. No further implementation is authorized by this handoff.
- Portal browser verification and the full test suite were not rerun for the three fixes. Precise browser performance timing remains unverified from the architecture work.

## 7. Verification State
- Final review independently ran four targeted Vitest files: image validation, mock portal repository, portal provider, and portal page. All 20 tests passed. The DOM test emitted a canvas getContext warning without failing.
- User reported TypeScript and lint passed and that temporarily changing Activated to the wrong date caused its test to fail. Codex did not repeat those checks.
- The 20-test run was on the reviewed working tree before HEAD advanced. Tests, lint, typecheck, build and browser checks were not performed during this save.
- Earlier architecture baseline only: 1,983 tests passed across 192 files. The prior report records passing typecheck, lint, webpack build and Settings browser smoke. See workflow/architecture-baseline/final-verified-tests.json and the architecture report.

## 8. Next Session Instructions
- Run /load and verify HEAD and the working tree. Use the portal files above for follow-up and the architecture report for earlier work.
- Preserve any owner changes. Obtain explicit authorization for new implementation, and keep Git operations read-only.

## 9. Execution Recommendation
- Phase: targeted QA complete. Current mode: Default. Current model: GPT-6.2 Sol.
- For a new substantial scope, use Plan mode with GPT-6.2 Sol at medium effort. Model availability in the next session is unverified.
<!-- SESSION_SNAPSHOT_END -->
