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
- Saved at: 2026-11-13
- Repository: afhomes-platform (remote not re-checked)
- Branch: develop
- HEAD: 67f0b68 (verified; unchanged). Nothing from this session or the previous one is committed.
- Session objective: (1) `/load`; (2) browser check of the two new screens (HR turning an account on; "Referred by me" tab); (3) fix what the check found.
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion.
- Context note: the session started on Sonnet 5.5; the owner switched with /model to Fable 5.2, Haiku 5.5, then Fable 5.2 again. The session was interrupted once and resumed ("Try again"). No subagents were used. Owner wants every reply in "explain like I am 5" language (memory `plain-language-questions.md`).

## 2. Current Project State
- Rules: unchanged this session. Docs 01 to 14 carry R1 to R13, follow-ups and the answers A1 to A8; `decisions-and-gaps.md` is the newest summary.
- Code: the Staff & Access screen now lets HR turn an office staff account back on (A4), matching what `staff-repository.ts` already allowed. The Sales page "Referred by me" tab (A8) works as built last session.
- Seed: new suspended office staff login `acct-records` linked to staff `staff-records` ("Records Clerk", `role-ops-staff`, `dept-ops`) so the HR reactivate path can be seen in the browser.

## 3. Important Decisions
- Owner approved this session: do the browser check; fix the HR reactivate button and pop-up text ("Yes, fix it"); "proceed" with the seed addition for visual proof.
- A4 reading confirmed in code: HR may activate non-Administrator office staff accounts; `canActivateTarget` in `staff-repository.ts` blocks HR on accounts with the `admin` role; Super Administrator accounts are protected. The seed "Admin User" staff row links to `acct-admin`, so HR correctly gets no activate button there.
- Owner answers A1 to A8 (2026-11-12) still stand: A1 points plus cash split by whole nights; A2 Customer ID `YYYY-NNNN` is the person, never the VIP Number; A3 preparer may approve own payout list, flagged; A4 as above; A5 no Acting or temporary leader, ever; A6 renewal allowed while login is Suspended or Deactivated; A7a card transfer cancels the former holder's future points bookings, A7b unmet Year 1 condition means tranche 1 is not released or carried over; A8 My Sales is the closing seller only, with a separate "Referred by me" list.
- Still true: docs are planning only; Redemption stays disabled; only the owner commits or pushes; mock login is removed when real auth lands.

## 4. Completed Work
- Browser check, "Referred by me": signed in as `ost.beta1@afhomes.test`. My sales shows only Customer B One (PHP 72,000). Referred by me shows only Customer A One (PHP 240,000, seller Ana Mendoza) with the note that it is not added to own totals. Dashboard counts one own sale. Pass.
- Browser check, HR reactivate: found two defects. `linkedAccountActions` dropped "active", so no turn-on button could show; the suspend pop-up said only an Administrator or Super Administrator can reactivate.
- Fix (test first): `src/panels/admin/pages/staff-account-actions.ts` (adds "active" with label "Activate account", non-danger confirm, new pop-up texts), `staff-dialogs.tsx` and `staff-page.tsx` (activate uses the normal button style), `src/data/queries.ts` (`useUpdateLinkedAccountStatus` accepts "active"), new `staff-account-actions.test.ts` (3 tests).
- Seed and test: `src/data/mock/seed-data.ts` (Records Clerk rows), `staff-access-rows.test.ts` (role filter now expects `staff-3` and `staff-records`).
- Browser recheck as `hr@afhomes.test`: Records Clerk shows Suspended; profile shows green "Activate account"; pop-up reads "The account regains access to the system."; after confirm the status is Active and the buttons become Suspend and Deactivate. Pass.

## 5. Git Working Tree
- Staged: none. Stash: `stash@{0}` "local: sales-network cleanup + member detail redesign" still kept.
- Unstaged: 45 modified files (611 insertions, 510 deletions).
  - Pre-existing from the 2026-11-12 session: 28 docs (`docs/business-rules/01` to `14`, matrix proposal, `docs/implementation` README, decisions-and-gaps, phase-01 to phase-11) and 11 `src/` files (`account-repository.ts`, `business-flow.test.ts`, `contract-repository.ts`, `sale-repository.ts`, `seed-data.ts`, `staff-repository.ts`, `staff-repository.test.ts`, `src/modules/sales/{rules,rules.test,types}.ts`, `sales-page.tsx`).
  - This session: `src/data/queries.ts`, `src/panels/admin/pages/staff-access-rows.test.ts`, `staff-account-actions.ts`, `staff-dialogs.tsx`, `staff-page.tsx`, plus more edits to `seed-data.ts` and this file.
- Untracked: `src/panels/admin/pages/staff-account-actions.test.ts` (this session); `.claude/launch.json` (origin unknown; not written by an agent edit, appeared during this session, possibly from the app's browser preview; content not inspected).
- No deleted or renamed files. Git warns that LF will become CRLF on the next Git touch.

## 6. Pending Tasks
- Owner review and commit of the uncommitted changes (owner only). Decide whether `.claude/launch.json` should be kept, ignored or removed.
- Optional: one read-only re-audit of the 28 changed docs (not done).
- D-B: stamp the 40% month by receipt date (doc 13 OCT O3); code still uses the approval date.
- Open owner item: overpayment and refund timing (phase-07 F7.1) is not on the decisions page.
- Small cleanups: doc 08 "R8 items 3-6" citations; doc 07 section 18 title "VIP Card ID Integration".
- Frontend alignment backlog (each needs authorization): stay-points engine (code still Spend-to-Earn), commission recipients (F8.1), VIP Number at RA signing, 25% sale count, Clerk role, accreditation numbering, IGP module (doc 14).
- Open outside the team: signed IST Clawback Addendum, IGP grant terms and band code above PHP 9M, points-per-night table, legal retention period.
- Workflow Atlas (outside the repo) not updated; consider `/update-workflow-atlas`.

## 7. Verification State
- Tests: after the UI fix, 72 passed (new file, `staff-repository.test.ts`, admin pages). After the seed addition, `src/data`, `src/modules` and `src/panels/admin` gave 923 passed and 1 failed (the role filter test); that test was updated and its file then passed 7 of 7. The whole group was not rerun after that one-line change. Full suite not run (known 15-second timeouts under load on wizard and staff-form tests).
- Typecheck: `npx tsc --noEmit` clean after the last edit.
- Lint: clean on the 5 files of the UI fix; not rerun on `seed-data.ts` and `staff-access-rows.test.ts`; full lint not run.
- Build: not run.
- Browser QA: both screens passed (section 4). Not seen in the browser: the new suspend pop-up wording, and HR being refused on an Administrator account (covered by repository tests only).
- Not performed: second doc audit, build, full test suite.

## 8. Next Session Instructions
- Recommended first action: `/load`, then the owner reviews and commits. Optionally run one read-only audit helper on the changed docs.
- Relevant files: `src/panels/admin/pages/staff-account-actions.ts`, `staff-dialogs.tsx`, `src/data/mock/seed-data.ts`, `src/data/mock/staff-repository.ts`, `docs/implementation/decisions-and-gaps.md`.
- Required approvals: any commit or push (owner only), any new feature, real authentication.
- Warnings: a dev server (`npm run dev`) was started this session and something still answered on port 3000 at save time; do not run build and tests together; do not delete `.next`; mock data resets on a full page reload; the Add staff dialog closes on Escape and loses typed data; mock sign-in details are in `src/data/mock/mock-credentials.ts`.

## 9. Execution Recommendation
- Phase: QA
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: medium
- Ultracode: OFF
- Token optimization: owner review and commit first; the doc re-audit is one read-only helper at most.
- Reason: both screens are verified in the browser, so only the owner's review and the optional doc re-audit remain.
<!-- SESSION_SNAPSHOT_END -->
