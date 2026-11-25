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
- Saved 2026-11-25 (Asia/Manila). AFHomes Platform, branch `full-stack`, HEAD `fbe3e7e`. `prototype` is at `4a64b44`; `develop` is at `fbe3e7e`.
- Tool: OpenCode. Model: DeepSeek V4.1 Flash 1017 (verified from the environment). Permission mode not verified beyond the Build agent. Context was not compacted.
- Objectives: split the frozen prototype from the clean full-stack line; remove mock/static data from the runtime by seeding confirmed business configuration; start F1 organization access.
- Phase: full-stack local build, F0 complete (data layer), F1 foundation built.

## 2. Current Project State
- Branch model: `prototype` is the frozen pre-backend sample-data demo and is never merged; `full-stack` is the primary line; `develop` holds the pilot plus Step D. Mock removal is planned only at F9, after every group connects.
- F0 data layer is complete. Confirmed configuration is in the database: tier levels, products, payment schemes, experiences, outlets, reference lists and the print-template registry. `db:seed` loads fixtures; `db:seed:clean` loads one Super Admin plus the same confirmed configuration and no business records, and clears receipt files.
- Server catalog/content reads replace the static `CATALOG`; routes exist for products, payment schemes, tier levels, experiences, outlets, reference lists and print templates. The Experiences, Settings and customer forms read them in api mode.
- F1 foundation: `Department`, `DepartmentRole`, `StaffMember`, `AccountStatusEvent` and `UserAccount.staff` exist. The actor resolves delegable department-role modules only while staff, role and department are active. Session modules include those grants; operations remain system-role only; parent navigation scopes are filtered out.
- Local environment: Auth 9099, SQL Connect 9399, Storage 9199 and UI 4400 are running. Java 21 is installed at `C:\Program Files\Eclipse Adoptium\jdk-21.0.13.10002-hotspot`. The database is on the clean seed. Port 3100 is stopped; the mock dev server on 3000 is running.

## 3. Important Decisions
- Owner: `prototype` frozen; `full-stack` primary; remove the mock layer only after all groups; clean seed is Super Admin-only for business records; confirmed reference/configuration data is allowed in that seed.
- Owner decisions for F1: MFA enforcement deferred with hooks, 8-hour production sessions, Firebase email password reset, CAPTCHA deferred to staging.
- Print templates: the confirmed registry (key, name, revision, asset path) is in the database; the supplied PDF forms and app-rendered card design stay as files, with private storage planned later.
- Seed fix: contract and sale genealogy now store inserted member UUIDs, so sellers see seeded records. The previous views-test failure was fixed at the root.
- Restrictions kept: owner-only Git; synthetic local data; no business-rule changes.

## 4. Completed Work
- Schema: reference tables `TierLevel`, `Product`, `PaymentScheme`, `Experience`, `Outlet`, `ReferenceEntry`, `PrintTemplate`; F1 tables `Department`, `DepartmentRole`, `StaffMember`, `AccountStatusEvent`; `UserAccount.staff`.
- Seed: `scripts/seed-local-db.ts` now supports `--clean`, seeds the confirmed configuration in both modes, maps member UUIDs in JSON snapshots, and wipes the new tables and receipt files. `package.json` has `db:seed:clean`.
- Server: `src/server/repositories/catalog.ts`, `content.ts`; `src/modules/contracts/print-templates.ts`; routes for experiences, outlets, reference lists, print templates and tier levels; HTTP repositories for experiences, reference lists and outlets.
- Access: `src/modules/identity/types.ts` (`departmentRoleModuleIds`), `permissions.ts` (department grants in `getGrantedModuleIds`), `src/server/auth/actor.ts` (staff/role/department resolution), `src/server/auth/department-access.test.ts`.
- Docs: `docs/implementation/02-full-stack/full-stack-phase-plan.md` has the branch/seed model, F0-F9 phases and current status blocks. F0 is complete for the data layer; F1 is in progress.

## 5. Git Working Tree
- Staged: none. `git diff --cached --stat` is empty.
- Unstaged: 22 modified files after this save (21 before it), 11,642 insertions and 2,139 deletions. This session's work includes the schema and regenerated `dataconnect/.dataconnect/schema/main/*.gql`, the seed, the new server repositories/routes, identity/actor access changes, print registry, tests and docs. `workflow/save-session.md` is the extra modified file from this save.
- Untracked: 9 files: the five new API routes (`experiences`, `outlets`, `print-templates`, `reference-lists`, `tier-levels`), `src/modules/contracts/print-templates.ts`, `src/server/auth/department-access.test.ts`, `src/server/repositories/catalog.ts` and `content.ts`.
- No deletions or renames this session.
- The owner has not committed F0/F1 yet.

## 6. Pending Tasks
- Owner review and commit of F0/F1. Agents must not stage or commit.
- F1 remaining: accounts/departments/roles/staff routes and screens; last-Super-Admin and delegation guards; password-reset request; MFA hooks; apply the 8-hour session length; organization seed fixtures.
- F2 Group 2 through F9 as written in the phase plan.
- Print screen still labels revisions from the shared constant; wire it to `/print-templates` later. Supplied PDFs/card art move to private storage later.
- The clean start cannot create a seller, customer or contract until F1/F2.

## 7. Verification State
- `npx vitest run src/server`: 36 of 36 passed across 8 files after a fresh fixture seed. This includes the new department-access test.
- `npx tsc --noEmit`: clean. `npm run lint`: clean, architecture check 768 files. `npm run build`: clean.
- `npm run db:seed`: 28 contracts, 40 customers, 15 members, 84 payments, 3 tier levels, 3 products, 4 schemes, 3 experiences, 5 outlets, 20 reference entries, 8 print templates.
- `npm run db:seed:clean`: one user account and one role, zero business records, with the confirmed configuration rows.
- Known behavior: the Data Connect emulator did not always hot-reload a schema change; restarting the emulators and reseeding fixed it. Always restart after schema edits.
- Not performed: full `npm test`, browser api-mode QA for F0/F1, staging checks.

## 8. Next Session Instructions
- Run `/load`; confirm branch `full-stack`, HEAD `fbe3e7e`, and the 21-file unstaged tree plus 9 untracked files.
- Do not commit or stage. Ask the owner to review and commit F0/F1 first.
- Continue F1 by reading `src/data/mock/role-repository.ts`, `staff-repository.ts`, `account-repository.ts`, `src/modules/identity/permissions.ts`, `src/server/auth/actor.ts` and the schema.
- After any schema edit, restart the emulators and run `npm run db:seed` before tests. Leave the database on `db:seed:clean` when handing back.
- Run the targeted suites and the 36-test server suite; do not run the full `npm test` unless asked.

## 9. Execution Recommendation
- Phase: Build (F1 continues). Current mode: Build (OpenCode), verified. Model: DeepSeek V4.1 Flash 1017 (verified).
- Recommended: Claude Opus 5.5, high effort. Ultracode: OFF.
- Token optimization: next slice is the organization routes plus seed fixtures, then screens and guards; targeted tests only.
- Reason: the permission foundation is verified; the remaining F1 work is CRUD, protection rules and UI wiring.
<!-- SESSION_SNAPSHOT_END -->
