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
- Saved 2026-11-25 (Asia/Manila). AFHomes Platform, branch `full-stack`, HEAD `1efe2ef`.
- Tool: OpenCode. Model: DeepSeek V4.1 Flash 1017 (verified from the environment). Permission mode not verified. No compaction observed.
- Objectives: continue the full-stack roadmap — build, verify and hand off F2 (sales network and accreditation) and F3 (customer applications and record access).
- Phase: full-stack local build; F0–F3 complete. F1 committed `8cdfc2e`; F2 and F3 committed `1efe2ef` by the owner.

## 2. Current Project State
- Branch model unchanged: `prototype` is frozen, `full-stack` is primary, `develop` holds the pilot plus Step D; mock removal only at F9.
- F2 is built: `Accreditation`, `AccreditationNumber` (unique per-number ledger), `RegistrationApplication`, `SeatVacancy`, and `Member.parentHistory`/`rowVersion`. Services and routes cover members, accreditation issue/renew/status, registrations, seat vacancies, public verification, referral checks and public OST registration. The rich seed loads 15 accreditations with 19 issued numbers, 4 applications and 1 vacancy.
- F3 is built: Customer identity columns (`normalizedEmail`, `normalizedMobile`, `normalizedName`, `dateOfBirth`), `CustomerImportJob`/`CustomerImportRow`, full lifecycle (update, discard, send back, reject, reasoned correction), import/export and private government-ID images. A draft keeps a requested Customer ID in the profile so it does not occupy the unique column until submission.
- Local environment: emulators running (Auth 9099, SQL Connect 9399, Storage 9199, UI 4400); Java 21 at `C:\Program Files\Eclipse Adoptium\jdk-21.0.13.10002-hotspot`; database on `db:seed:clean` (1 account, 0 business records).

## 3. Important Decisions
- Owner: branch/seed model unchanged; F2 and F3 plans approved and built; owner-only Git; synthetic local data; no business-rule changes.
- F2: AA numbers allocated through the unique ledger with bounded retry; transfer guarded by row version, with serializable enforcement deferred to the staging review; registration approval commits the seller then the application (recorded `shortcut:`); public routes are same-origin and `no-store`; public verification never shows a validity date.
- F3: staff VIP card lookup deferred to F7 because it needs active memberships; drafts never occupy the unique Customer ID column; import diagnostics store counts/errors only; only the primary government ID image is connected (supplementary holder image deferred to F4).
- Retained from F1: MFA hooks, 8-hour production sessions, Firebase email password reset, CAPTCHA deferred to staging.

## 4. Completed Work
- F2 files: `src/server/repositories/sales-network.ts`; services `sales-network.ts`, `accreditation.ts`, `registrations.ts`; `src/server/api/public-route.ts`; routes `members/*`, `accreditations/*`, `registrations/*`, `seat-vacancies/*`, `public/*`; `src/server/services/sales-network.test.ts`; schema additions; seed fixtures; phase-plan F2 status.
- F3 files: `src/server/services/customers.ts` (extended), `src/server/repositories/records.ts` (identity columns, duplicate/number queries), `src/server/storage.ts` (customer ID image), customer routes (update, discard, send-back, reject, correct, id-image, import, imports, export), schemas, HTTP repositories, `src/server/services/customers.test.ts`; seed normalized columns; phase-plan F3 status.
- Verification: 56/56 server tests across 11 files (F2 6/6, F3 7/7); 124/124 customer screen tests; 24/24 sales-network/registration screen tests; tsc, lint (836 files) and build clean; rich seed verified; clean seed restored.

## 5. Git Working Tree
- Staged: none.
- Unstaged: 2 modified files, not edited by this session (pre-existing or owner-origin): `src/panels/admin/components/contract-dialogs.test.tsx` and `src/panels/admin/customer-review-pages.test.tsx` (25 insertions, 164 deletions total).
- Untracked: none. Deleted or renamed: none. This session's F2/F3 work is committed in `1efe2ef`.

## 6. Pending Tasks
- F4 planning, gated by the Non-Standard monthly payments decision (1–36 vs 1–12).
- F5–F9 as written in the phase plan; mock removal only at F9.
- Deferred within built phases: staff VIP card lookup (F7), supplementary holder ID image (F4), QR holder-code invalidation (F7), serializable cycle prevention and approval reconciliation (staging), public rate limiting/CAPTCHA (staging).
- Pre-existing mock test failures remain (account delegated-accounts, department reactivation, two business-flow date assertions); they were not re-checked this session.
- Owner: review and commit or discard the two modified test files.

## 7. Verification State
- `npx vitest run src/server --no-file-parallelism`: 56/56 across 11 files (organization 7, sales-network 6, customers 7, department-access 1, session 11, pilot 9, views 7, evidence 3, reports 2, storage 1, money 2).
- Screen suites: customer 124/124; sales-network/registration 24/24.
- `npx tsc --noEmit` clean; `npm run lint` clean (836 files); `npm run build` compiled successfully.
- `npm run db:seed`: 28 contracts, 40 customers, 15 members, 84 payments, 15 accreditations, 19 numbers, 4 applications, 1 vacancy. `npm run db:seed:clean`: 1 user account, 0 business records.
- Known behavior: Data Connect may miss a schema hot reload; restart the emulators after schema edits. Server tests must run with `--no-file-parallelism` because the session suite signs out a shared `dev-admin` cookie.
- Not performed: full `npm test`, browser api-mode walkthroughs, real email delivery, staging checks.

## 8. Next Session Instructions
- Run `/load`; confirm branch `full-stack`, HEAD `1efe2ef`, no staged or untracked changes, and the two modified test files that are not from this session.
- Do not stage or commit. Ask the owner to review those two files and to settle the Non-Standard decision.
- Plan F4 before coding. Read `docs/business-rules/05-vip-products-and-contracts.md`, the decision register UI20 entry, `src/modules/contracts/*`, `src/server/services/contracts.ts` and the product/scheme seed.
- After any schema edit, restart the emulators, run `npm run db:seed`, then tests; leave the database on `db:seed:clean` when handing back.
- Run the targeted suites and the 56-test server suite with `--no-file-parallelism`; do not run the full `npm test` unless asked.

## 9. Execution Recommendation
- Phase: QA (F3 review), then Plan F4 after the owner decision.
- Recommended next mode: QA review, then Plan.
- Recommended model: Claude Opus 5.5, high effort.
- Ultracode: OFF.
- Token optimization: review `services/customers.ts` and the F4 contract modules with targeted reads and suites only.
- Reason: the next phase changes contract and financial invariants and is gated by an unresolved owner decision.
<!-- SESSION_SNAPSHOT_END -->
