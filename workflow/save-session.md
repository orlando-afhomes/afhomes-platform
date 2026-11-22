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
- Saved at: 2026-11-22 (Asia/Singapore).
- Repository: afhomes-platform; branch `develop`; HEAD `ead677c` (verified in this run).
- Tool and model: Codex desktop context; model not independently verified.
- Session objective: Restore project context, then save a handoff snapshot. No implementation requested or performed.
- Development phase: Frontend prototype on typed in-memory mock data; backend, real authentication, database, and deployment remain deferred.
- Context note: Current conversation context was available; no additional history was assumed beyond the existing snapshot.

## 2. Current Project State
- Current branch and HEAD verified as `develop` at `ead677c`.
- The prior snapshot reports that the field-guide, image-viewer, cash OR, and 9-digit TIN batch is committed in `ead677c`; commit contents, remote state, and prior verification were not rechecked in this save session.
- Current source change: `src/panels/public/experience/exp-rooms.tsx` no longer imports or renders `RenderingsNote`. The reason and owner are unknown.
- Package versions were not rechecked in this save session; the prior snapshot records Next.js 16.4.5, React 19.3, Tailwind CSS 4, TanStack Query/Table, Vitest + Testing Library, Zod, SweetAlert2, and Sonner.

## 3. Important Decisions
- Keep the approved frontend-first architecture and browser-memory-only mock business data; backend, production authentication, databases, migrations, infrastructure, and deployment need separate authorization.
- Keep live Redemption and Services disabled; do not add public customer or card lookup.
- Prior snapshot records owner decisions for field-guide popovers, soft brand-tinted secondary buttons, exactly 9-digit TINs, and generated cash receipt numbers in `OR-YYYYMMDD-NNNN` form. These were not independently reverified in this save session.
- Prior snapshot notes that business rule document 07 still describes manual OR entry; align it only after owner approval.
- Project Git policy reserves all staging, commits, pushes, merges, resets, and deployment for the owner.

## 4. Completed Work
- This session: restored context and updated this handoff snapshot only.
- No application code was changed by the agent. The existing `exp-rooms.tsx` modification was present before this snapshot update.
- Prior snapshot reports the UI batch was verified with targeted tests, typecheck, lint, build, and browser checks; none were rerun in this session.

## 5. Git Working Tree
- Branch: `develop`; HEAD: `ead677c`.
- Staged: none.
- Unstaged: `src/panels/public/experience/exp-rooms.tsx` (present before this session; provenance and intent unknown); `workflow/save-session.md` (already modified before this save, then updated inside its snapshot markers as requested).
- Untracked: none reported by `git ls-files --others --exclude-standard`.
- Deleted or renamed: none reported by `git diff --name-status`.
- No Git write operation was performed.

## 6. Pending Tasks
- Review the `exp-rooms.tsx` change and confirm its intended effect before changing or reverting it.
- Owner decision/approval is still needed before aligning `docs/business-rules/07-finance-and-payments` with the system-generated cash OR behavior.
- Optional follow-up recorded previously: rerun the full suite after its earlier load timeouts and complete browser QA for the image-viewer click path.
- Preserve the restrictions on disabled modules, public lookups, and owner-only Git operations.

## 7. Verification State
- This run verified `pwd`, branch, HEAD, staged/unstaged status, diff names and stats, and the untracked-file list.
- No tests, lint, typecheck, build, browser QA, or application behavior checks were run in this session.
- The prior snapshot reported clean typecheck, lint, build and targeted test runs; it also reported 17 full-suite timeouts that passed when run alone. Those results are historical and were not rerun.
- Snapshot readback and marker/content checks are performed after this update.

## 8. Next Session Instructions
- First action: run `/load` and compare the snapshot with the current code and Git state.
- Review `src/panels/public/experience/exp-rooms.tsx` as an existing uncommitted change; do not assume it is authorized or discard it.
- If asked to address the cash OR documentation, inspect the relevant part of `docs/business-rules/07-finance-and-payments` and its implementation paths, then follow the project approval rules.
- Do not perform Git writes, enable Redemption or Services, or add public customer/card lookup.

## 9. Execution Recommendation
- Phase: Context restored; handoff snapshot saved; no implementation work performed.
- Current mode: Default (verified from the active developer instruction).
- Recommended next mode: Review the existing `exp-rooms.tsx` change and clarify its intended result before implementation.
- Current model: not verified.
- Effort: low for reviewing the one-line behavior change; reassess if scope expands.
- Ultracode: not verified.
- Token optimization: inspect only the changed component and directly related presentation rules.
- Reason: the current tree contains a source change with unknown intent, while the next business-document task still has an owner-approval gate.
<!-- SESSION_SNAPSHOT_END -->
