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
- Saved at: 2026-11-19 16:31 (supersedes the 2026-11-19 14:26 snapshot).
- Repository: afhomes-platform (remote not re-checked; no fetch run).
- Branch: develop. HEAD: 61e7744 "feat: polish public site visuals and add site action/footer-access helpers" (verified). No commits this session.
- Tool and model: OpenCode, DeepSeek V4.1 Flash 1017 (session metadata; not independently probed).
- Session objective: restore with `/load`, settle the doc 03 public "Valid Until" conflict through a one-question-at-a-time grilling round and an approved written plan, and implement the click-only question rule across the harnesses.
- Development phase: frontend prototype on typed in-memory mock data. Backend, real authentication, database and deployment remain deferred.
- Context note: no compaction. The plan lives outside the repo at `C:\Users\SSD-ORLANDO\.opencode\plan\2026-11-19-doc-03-valid-until.md`.

## 2. Current Project State
- Verified at the end: `develop` at 61e7744, nothing staged, 12 tracked files modified, no untracked files. Eleven are the amendment sweep; `workflow/save-session.md` is this snapshot.
- Canonical rule now: the accreditation validity date applies to every seller, IST and OST; it stays visible on internal screens; it is never shown on the public Verify Search for any type. Doc 03 carries a dated amendment block and a struck original clause.
- The public result card already hid the date before this session; no UI, component or test change was made.
- Harness question rule: exactly one clickable question per message, recommendation first, in `AGENTS.md`, global `CLAUDE.md`, `~/.codex/AGENTS.md` and the shared grilling skill.
- Documentation baseline unchanged: 14 business rules, 10 development docs, 19 implementation docs.

## 3. Important Decisions
- Valid Until applies to the whole sales team, not OST only. Internal screens keep it; the public result shows none (owner, 2026-11-19).
- Recording: append-only amendment block plus strikethrough of the original clause; no in-place rewrite.
- Sweep: all current-state docs updated; the completed phase-03 plan is registered as stale, not rewritten.
- The amendment states the rule only; no motive is asserted.
- Public contract field `validUntil` is kept and remains populated for OST; dropping it is deferred. It is rendered nowhere.
- No test edits were authorized in this change, so `src/data/mock/accreditation-renewal.test.ts:118` keeps its old title as a known wording residue.
- Questions: exactly one per message, clickable options, recommendation first, wait for the choice.
- Only the project owner stages, commits, pushes, merges or deploys.

## 4. Completed Work
- Doc 03: line 210 corrected, line 247 struck, and an `## Owner ruling amendment (2026-11-19, public validity date)` block appended.
- `docs/implementation/decisions-and-gaps.md`: line 314 corrected; stale bullet for phase-03 line 97 added at line 306.
- Corrected sentences in `docs/development/architecture.md:204`, `frontend.md:123`, `security.md:439`, `testing.md:312`, `role-module-permission-matrix-proposal.md:214` and `:268`, `docs/project.md:219` and `:524`, and `AGENTS.md:130`.
- Comments corrected at `src/data/contracts/accreditation-repository.ts:8` and `src/data/mock/accreditation-repository.ts:108`.
- Harness files outside the repo updated: `~/.claude/CLAUDE.md`, `~/.codex/AGENTS.md`, `~/.agents/skills/grilling/SKILL.md`. A new OpenCode global `AGENTS.md` was created then removed because it displaced the global `CLAUDE.md` policy in-session.
- Verification: `git diff --check` clean apart from LF-to-CRLF notices; sweep found 6 hits, all accounted for; exactly one 2026-11-19 amendment heading; `npx vitest run src/panels/public/accreditation-verification-page.test.tsx` passed 2 of 2 in 13.46 s.

## 5. Git Working Tree
- Staged: none.
- Unstaged, this session: `AGENTS.md` (protocol plus line 130), the ten other swept files, and `workflow/save-session.md` after this save.
- Untracked: none.
- Deleted or renamed: none.
- HEAD unchanged at 61e7744; no agent Git writes.
- `stash@{0}` ("local: sales-network cleanup + member detail redesign") remains present.

## 6. Pending Tasks
- Owner review and commit of the 12 modified files.
- Optional one-line fix: the title at `src/data/mock/accreditation-renewal.test.ts:118` still reads "IST hides Valid Until, OST shows it"; it needs owner approval because tests were outside the agreed scope.
- Remaining owner rulings: bank wordmark trademark use; GATE-1 (`09:178` vs `09:180`, `10:153-154`); GATE-2 (`11:369` vs `08:383`); protected-operation wording (`06:115`, `06:284`, `08:404`, `12:204` vs doc 01's authority rule).
- Phase 2 admin plan from `docs/implementation/ui-state-audit.md`, one batch at a time.
- Optional verification: full repository suite, production build, visual regression.

## 7. Verification State
- Tests: 2 of 2 passed in `src/panels/public/accreditation-verification-page.test.tsx`. Full suite not run.
- Typecheck: not run (documentation and comment changes only).
- Lint: not run.
- Build: not run.
- Manual checks: doc diff reviewed; amendment block confirmed at end of file; grep sweep reviewed.
- Known limits: `validUntil` remains on the public contract, rendered nowhere.
- Not performed: full suite, build, browser QA.

## 8. Next Session Instructions
- First action: `/load`; confirm `develop` at 61e7744 and the 12-file working tree.
- Inspect `docs/business-rules/03-ist-ost-accreditation.md` (lines 210, 247 and the tail amendment), `docs/implementation/decisions-and-gaps.md:306` and `:314`, and the plan file named above.
- Owner decisions needed: commit the sweep; then bank wordmark, GATE-1, GATE-2 and the protected-operation wording.
- Required approvals: any business-rule edit, any test edit (including the stale title), backend/database/auth/deployment.
- Warnings: keep live Redemption and Services disabled; there is no public customer or card lookup; the snapshot is a progress reference, not authority over code or rules.

## 9. Execution Recommendation
- Phase: QA complete; owner review and commit next.
- Current mode: not verified.
- Recommended next mode: owner review/commit; then Plan for the next gate.
- Current model: not verified (session metadata names DeepSeek V4.1 Flash 1017).
- Recommended model: Opus 5.5.
- Effort: high for rule arbitration, low for the commit review.
- Ultracode: OFF.
- Token optimization: read section 4 and the two doc hunks; load only the cited rule sections when a gate starts.
- Reason: only business-rule arbitration remains, where a wrong ruling costs more than a cheaper model saves.
<!-- SESSION_SNAPSHOT_END -->
