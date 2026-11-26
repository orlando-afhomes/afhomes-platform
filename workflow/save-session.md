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
- Saved 2026-11-26 (Asia/Manila). AFHomes Platform, branch `full-stack`, HEAD `55f01df` ("feat: add reconciliation and audit read to the pilot backend" — the owner committed F8 during this session).
- Tool: OpenCode. Model: GLM-5.3-Flash (verified from the environment). Permission modes cycled Plan/Build by the owner. Context note: this session began from a harness conversation checkpoint (compacted context); the snapshot below reflects the verified state since then.
- Objectives: F8 review fixes (F8.1), the full F9 build (remove the mock layer, api-only runtime, prototype retirement, seed relocation), the F9 two-axis code review, the approved cleanup pass, the AGENTS.md/docs 10 governance wording, and an owner-verified Super Admin login.
- Phase: full-stack local build; F0–F9 complete. F8 and its review fixes are committed as `55f01df`; all F9 work is uncommitted.

## 2. Current Project State
- Branch model unchanged: `prototype` frozen, `develop` holds the pilot plus Step D, `full-stack` is primary. Mock removal completed at F9.
- F9 is built: `src/data/mock` deleted (92 files) with `MockStoreProvider`, the dev identity provider/switcher, the localStorage mock login and `NEXT_PUBLIC_DATA_MODE`; the seed builders, dev identities and credentials moved to `src/data/seed/` (fixture store `src/data/seed/store.ts`), feeding `db:seed`, `db:seed:clean` and the emulator suites. The API is the only runtime: one `useRepositories()` returning HTTP repositories, the session identity provider as the only provider, Firebase + `POST /session` login, the proxy always redirects cookieless `/admin`, and `npm run dev` runs Next with the emulator env (`scripts/dev-api.mjs`; `dev:api` removed).
- Prototype retirement (owner decision 2026-11-26): redemption staff prototype, promos, member-QR, reservations and the customer portal are retired to not-connected stubs; their repositories reject every call, the Redemption area, Promotions/Promo History and Settings Night Rates/Holidays/Venues tabs are removed, old promo/redemption redirect routes and portal routes/links deleted. The member-QR buttons/dialog/scan flow were removed from the live Membership and Customer Search screens (loyalty actions preserved for the primary holder). Live Redemption and Services stay disabled.
- Public website content reads a static confirmed-catalog snapshot (`src/data/public-content.ts`); the CMS stays deferred.
- Governance: `AGENTS.md` §5 now records the prototype retirement (owner-approved wording), and `docs/business-rules/10-redemption.md` carries the dated 2026-11-26 amendment. `docs/development/README.md`, `implementation.md` and `database.md` no longer describe mock mode as current.
- Local environment: emulators running (Auth 9099, Data Connect 9399, Storage 9199); a dev server started via `npm run dev` is running on port 3000 (PID 39912, background shell `sh_217218706001xH8Ltb2jLCqK8q`), and the database currently holds the rich seed (`npm run db:seed`) because the owner is signed in as Super Admin. Do not reseed clean while the owner is using the app.

## 3. Important Decisions
- Owner: owner-only Git; the owner committed F8 as `55f01df` during the session; the AGENTS.md wording change was explicitly approved by the owner before it was applied.
- Owner decisions of 2026-11-26: (a) retire the prototypes with the mock layer; (b) trim the mock-data page tests to a maintained UI core, recorded; (c) the F8 collections-report readers remain Administrator + Finance (committed with F8).
- F9 review/cleanup decisions: retain the retired modules as not-connected stubs (contracts/hooks/pages remain, every call rejected); actor names resolve from the server accounts query, never the seed identities; remove the dead member-QR controls rather than leave failing buttons; keep a truthful `instant = false` opt-out comment on admin pages.
- Retained earlier decisions: offset settlement net via itemized deductions; VIP Number YYMMDD = transaction date; rescission/downgrade sale statuses; durable insert-only Stay Points ledger; report-export records are the audited export events (no separate table).

## 4. Completed Work
- F8.1 review fixes (committed with `55f01df`): legacy-module audit filter, date-only bounds, static outcome documentation, consistent `checkedLeaders`, entries-refusal, shared module derivation and month schema.
- F9 build: seed relocation; data-mode collapse; HTTP-only repositories; public-content statics; prototype retirement (nav, routes, portal, member-QR); screen-test trim (54 mock-only files removed, maintained core rewritten on `src/test/api-harness.tsx`: auth gate, login, navigation/area matching, audit page, reconciliation page, area page, admin kit); pure module tests read the seed store; deterministic public-accreditation test.
- F9 code review (two-axis) then cleanup: 49 stale mock-login comments replaced; member-QR UI removed from the live screens (`member-qr.tsx` + test deleted); actor names from `useAccounts()` in `contract-sections.tsx` and the member detail page; F9 status wording corrected to "retired to not-connected stubs"; three development docs refreshed.
- Governance: `AGENTS.md` §5 and the docs 10 amendment applied.
- Verification: 127 client/module test files (1072 tests), 17 emulator files (82 tests) twice on fresh seeds with `--no-file-parallelism`, `npx tsc --noEmit` clean, `npm run lint` clean (844 files, architecture check), `npm run build` compiled.
- Browser: Super Admin login verified in Chrome (`orlandodelacruz@afhomes.com.ph`), `/admin` dashboard rendered with seeded figures, `GET /api/v1/session` returns role `super_admin`, status active.

## 5. Git Working Tree
- Staged: none.
- Unstaged: 320 tracked files changed (+647/−33,169). The bulk is the deleted mock layer and mock-only tests; also the seed relocation, runtime collapse (`src/data/queries.ts`, `access-snapshot.ts`, `src/app/layout.tsx`, `src/app/admin/layout.tsx`, `src/panels/public/login/login-form.tsx`, `src/proxy.ts`, navigation, membership table, customer lookup), 49 admin page comments, credential-import changes in the server suites, `package.json`/`scripts`, the phase-plan F9 status, `AGENTS.md`, docs 10 and three development docs.
- Untracked (15): `src/data/seed/{anchor,business,catalog,dev-credentials,dev-identities,igp,index,operations,organization,people,seed-build.test,store}.ts`, `src/data/public-content.ts`, `src/shared/providers/identity-provider.tsx`, `src/test/api-harness.tsx`.
- Deleted: `src/data/mock/**` (92 files), `src/data/mock`-only tests, 54 mock-data page tests, the four old promo/redemption redirect pages, `src/app/portal/*`, `src/data/customer-portal-queries.ts`, `src/panels/customer-portal/*`, `src/panels/admin/components/member-qr.{tsx,test.tsx}`, `src/shared/providers/{mock-store-provider,mock-session,dev-identity-provider,customer-portal-provider}.tsx`, `src/shared/lib/data-mode.ts`.
- No commits after HEAD; the F9 tree awaits the owner's review and commit.

## 6. Pending Tasks
- Owner: review and commit the F9 tree plus the governance documentation edits.
- Next phase: staging planning (needs owner authorization). Decision gates: production region/domain/sizing/cost/recovery, CAPTCHA provider, observability, retention/privacy wording (Legal/DPO), and the append-only audit trigger rehearsal (`dataconnect/security/audit-append-only.sql`).
- Parked: browser api-mode walkthrough of the remaining F6–F9 screens (Super Admin login already verified), a parallel-safe `npm test` for the emulator suites (serial-run constraint documented), the pre-existing mojibake `holder?Ts` in `docs/business-rules/10-redemption.md`, staging checks, live Redemption/Services (separately unauthorized).
- The F9 status records the test trim and the retired-stub behavior; no code work is outstanding for F9.

## 7. Verification State
- `npx vitest run src/panels src/shared src/data src/modules`: 127 files / 1072 tests passed.
- `npx vitest run src/server --no-file-parallelism`: 17 files / 82 tests passed, twice on fresh seeds.
- `npm test` executes 145 files; client suites pass in parallel, while the emulator files need the documented serial mode (shared session cookie) and pass 82/82 serially.
- `npx tsc --noEmit` clean; `npm run lint` clean (844 files, architecture check); `npm run build` compiled.
- Database currently rich-seeded (`db:seed`); the dev server runs on port 3000 and the owner is signed in as Super Admin. Emulators were up throughout; no staging or hosted systems touched.
- Not performed: full browser walkthrough of every screen, staging rehearsal of the audit trigger, real email delivery.

## 8. Next Session Instructions
- Run `/load`; confirm branch `full-stack`, HEAD `55f01df`, and the F9 tree described in section 5; ask the owner to commit it first.
- Then plan staging (manual pack and the staging guides first: `docs/implementation/02-full-stack/02-staging/`), present the decision gates, and wait for authorization before any environment work.
- Environment: emulators hold 9099/9199/9399 and the dev server holds 3000 (PID 39912) — Next refuses a second `next dev` in the same folder; stop the old one with `taskkill /PID 39912 /F` if a restart is needed. Emulator restarts need Java 21 (`C:\Program Files\Eclipse Adoptium\jdk-21.0.13.10002-hotspot`).
- Do not reseed clean while the owner is using the app; ask before changing the local database state.
- Run server suites with `--no-file-parallelism`; leave the database in the state the owner expects and report it.
- Warnings: `src/data/mock` no longer exists (do not recreate it); seed identities live in `src/data/seed/dev-identities.ts` and credentials in `src/data/seed/dev-credentials.ts` (local only).

## 9. Execution Recommendation
- Phase: close-out (owner commit of F9), then Plan staging.
- Recommended next mode: QA review of the F9 diff by the owner, then Plan.
- Recommended model: Claude Opus 5.5, high effort.
- Ultracode: OFF.
- Token optimization: targeted reads of the F9 diff and the staging guides; run the emulator suites only with `--no-file-parallelism`.
- Reason: the local build is complete and verified; the remaining risk sits in the first hosted environment, so the next session should start with the owner's commit and then the staging decision gates.
<!-- SESSION_SNAPSHOT_END -->
