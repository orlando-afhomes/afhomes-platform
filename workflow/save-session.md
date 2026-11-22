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
- Saved 2026-11-22. AFHomes Platform, branch develop, HEAD 41e4e2f (verified with read-only Git).
- Tool and model: Claude Code, Sonnet 5.5 (Opus 5.5 was used briefly for planning). Context was not compacted.
- Objective: review the roadmap, run a health check, write the detailed fixes register, and settle the four items listed as "waiting on others". Phase: frontend prototype, QA and owner decisions.

## 2. Current Project State
- Frontend mock prototype on browser-memory data. Backend, real auth, database and deployment are not started and need separate authorization.
- Health check at 50d6143 (verified): tsc, lint and build pass; full suite 1,990 of 1,991 passed, the one failure a 15 s timeout that passes alone.
- Commit 41e4e2f ("apply 2026-11-22 owner decisions on IGP, clawback and privacy") now holds the work of this session. Commit 02a053e promoted Customer Login (header and footer). The commit actor was not investigated.

## 3. Important Decisions
- Owner decisions 2026-11-22, recorded in docs/implementation/fixes/05-owner-decisions-2026-11-22.md and in dated amendments to docs 03, 04, 08, 10, 12, 14, decisions-and-gaps.md and AGENTS.md section 5:
  - IGP band digit 0 above PHP 9M; SUPERSEDED means Replaced; Formal VIP Grant card level by price (B1 from 1M, S1 from 2M, G1 from 4M), editable and frozen at signing.
  - Clawback offset per IST once the Administrator records the signed addendum date (payouts first, then allowances, capped, carry forward). OST and unsigned ISTs: direct collection.
  - Starting points-per-night table, holiday calendar to Dec 2027, venue cut-offs (Hotel 48 h, Resort 72 h).
  - Working ten-year retention schedule and a public Privacy Policy at /privacy.
- Header: Customer Login (/portal) plus Join VIP; Verify Accreditation sits in the Explore menu; footer Access note applies to the staff and seller links only; the portal sign-in page says it is a preview.
- Git writes are owner-only. These rules are working defaults, not legal advice.

## 4. Completed Work
- Fixes register: docs/implementation/fixes/ (README and files 01 to 05).
- Code: src/modules/igp (rules, types), src/data/mock/igp-repository.ts, src/modules/commissions (rules, types, allowances), src/data/mock/commission-repository.ts, src/modules/redemption/sample-seed.ts, src/modules/audit/retention.ts, src/panels/public/pages/privacy-page.tsx, src/panels/admin/components/clawback-addendum-dialog.tsx, footer legal links, matching tests.
- Verification of the final tree (this session, before the commit): tsc, lint and build pass. Full suite: 4 tests timed out under load and pass alone; one real regression (extra Allowance Review column) was fixed and its file passes. The full suite was not re-run after that fix. /privacy loaded in the browser pane with no console errors at a narrow width.

## 5. Git Working Tree
- Staged: none (verified).
- Unstaged, modified: docs/implementation/prototype/16-state-verification.md and src/panels/admin/business-pages.test.tsx. Origin unknown; they were not edited in this save and may be the owner's slow-test fix (fixes/02 T1).
- Untracked: none. No deletions or renames.
- This save modifies only the snapshot body in workflow/save-session.md.

## 6. Pending Tasks
- Fixes register files 01 to 04: admin state fixes (25 Partial routes, four batches), slow-test fix and open browser checks, mock feature gaps (F6.5, F7.4, F8.6, F11.5, portal plan audit), document drift. None is authorized yet.
- Not built: membership record for IGP buyers, IGP history import, any retention deletion, an admin view of the retention schedule.
- Legal and the Data Protection Officer should review retention, privacy wording and the clawback addendum before real payouts.
- Doc 07 was modified by someone else earlier in the session (not by this work); its status is now unknown.

## 7. Verification State
- tsc, lint, build: passed before commit 41e4e2f (this session). Not re-run in this save.
- Tests: see section 4. Browser QA: only /privacy checked, narrow width. 320 and 1100 px, reduced motion, no-JS and role walkthroughs: not performed.

## 8. Next Session Instructions
- Run /load, then check git status; the two modified files above may be unfinished owner work. Preserve them.
- Read docs/implementation/fixes/README.md and ask the owner which file to plan next. Recommended: the slow-test fix first (small), then admin state fixes Batch 1.
- Keep Git operations read-only. Obtain explicit authorization for each batch.

## 9. Execution Recommendation
- Phase: Plan. Recommended next mode: Plan. Recommended model: Sonnet 5.5. Effort: medium. Ultracode: OFF.
- Token optimization: load only the fixes file for the chosen batch and its listed tests; run targeted tests first.
- Reason: ordinary frontend state fixes and test hardening.
<!-- SESSION_SNAPSHOT_END -->
