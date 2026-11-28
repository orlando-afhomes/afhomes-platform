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
- Saved 2026-11-27 17:40 +08:00 (Asia/Manila). AFHomes Platform, branch `full-stack`, HEAD `f31994f` ("feat: retire the mock layer and switch to the real backend" — the F9 commit made by the owner in the prior session).
- Tool: OpenCode. Model: Hy4 flash Free (provider `opencode-go`, model `hy4-flash-free`, verified from the environment). Permission mode not verified.
- Context note: this session resumed from the 2026-11-27 00:28 snapshot via a conversation checkpoint; the context was compacted and restored from a summary. Facts marked "per checkpoint summary" below are reconstructed, not independently re-derived; nothing was fabricated.
- Objectives: polish the admin/account and organization screens — complete Super Admin seed data; modern read-only/detail UI with no blank fields; dirty-aware Save buttons; visible loading feedback; structured name fields; working private-Storage profile-photo upload/capture. Keep `db:seed` true-data-only.
- Phase: full-stack local build. F0–F9 are committed as `f31994f`; all of this session's work is uncommitted.

## 2. Current Project State
- Verified implementation status: F0–F9 behavior intact; this session added the organization/account polish and the avatar/camera work recorded below. Working tree was green on the last full verification pass (section 7).
- Architecture unchanged: Next.js App Router; `src/panels` UI, `src/modules` domain rules, `src/data` HTTP repositories, `src/server` services/emulators, shared UI under `src/shared`; Sonner toasts; SweetAlert2 confirmations via the shared `AppAlert`. New private Storage routes stream staff avatars.
- Current development focus: the owner reviews and commits the ~102-file tree; staging planning comes after.
- Local DB is true-data-only after the clean seed: one staff record (Orlando Dela Cruz), zero members/customers/sales.

## 3. Important Decisions
- `npm run db:seed` seeds only true data; synthetic pilot records stay behind `npm run db:seed:fixtures`.
- Clean seed creates one Super Admin account, a Smart System Department, a protected Super Admin department role, and a linked staff record; `role-super-admin` uses all `DELEGABLE_MODULES`.
- My Account uses structured name fields only (Prefix, First Name, Middle Name + "No middle name", Last Name, Suffix), not the full staff profile.
- Save/Create/Update buttons disabled when unchanged, for Organization and Account forms only; shared `useFormDirty` and `reset()` re-baseline after a successful save.
- Password reset is self-service for all signed-in users; confirmation dialog kept; spinner shown on the confirmation Save after confirming.
- Profile photos upload to private Firebase Storage — never base64 in `avatarUrl` (capped at 500 chars). Because `StaffMember` has no `avatarUrl` DB column, the short authenticated URL and `avatarFile` metadata are stored in the staff `profile` JSON.
- Role Details shows the full module catalog with granted/not-granted states; the duplicate "Authorized modules" row was removed — "Effective module access" is the single module view. Shared `RecordDetailsDialog` and `ModuleAccessList` centralize the modern detail/module UI.
- All work stays uncommitted; the project owner commits manually (AGENTS.md absolute Git rule).

## 4. Completed Work
- Clean seed + fixture separation: `scripts/seed-local-db.ts`, `package.json`.
- Super Admin org profile: `src/data/seed/organization.ts`, `src/modules/identity/permissions.ts`, `src/data/seed/organization.test.ts`.
- Modern detail UI: `src/shared/components/modern/record-details-dialog.tsx`, `module-access.tsx`, `record-details.tsx`, `record-details-sheet.tsx` (+ tests); `role-dialogs.tsx`, `department-dialogs.tsx`, `account-dialogs.tsx`, `staff-dialogs.tsx`.
- My Account: `src/panels/admin/pages/my-account-page.tsx` + test — split name fields, self-service reset, dirty-aware Save, confirmation spinner.
- Confirmation spinner: `src/shared/components/modern/app-alert.tsx` + test; shared dirty hook `src/shared/forms/modern/use-form-dirty.ts` + test.
- Avatar/camera: redesigned `src/shared/forms/modern/camera-capture-dialog.tsx` + test (larger modal, centered spinner, blurred/dim overlay); `src/server/storage.ts` + test (upload/download/delete helpers, image detection, metadata, URL stored in profile); two new routes `src/app/api/v1/staff/[id]/avatar/route.ts` and `src/app/api/v1/staff/[id]/avatar/[fileId]/route.ts`; `uploadAvatar` contract in `src/data/contracts/staff-repository.ts`; `src/data/http/repositories.ts` and `src/data/queries.ts` (`useUploadStaffAvatar`); `profile-photo-uploader.tsx`; upload wiring in `my-account-page.tsx` and `staff-dialogs.tsx` (+ tests).
- Fixes: stripped `id` from five update mutation bodies ("Update failed. Unrecognized key: \"id\""); fixed empty-error keys blocking every My Account save; fixed "Update failed. Too big: expected string to have <=500 characters" by routing uploads through Storage; fixed the latent Data Connect error ("Cannot query field \"avatarUrl\" on type \"StaffMember\"") by moving the URL into `profile`.
- Business-rule docs updated for password recovery: `docs/business-rules/01-roles-and-permissions.md`, `04-customer-management.md`, `12-audit-logs-and-governance.md`; AGENTS.md §5 "honest not-connected stubs" note.
- Verification results: section 7.

## 5. Git Working Tree
- Branch `full-stack`; HEAD `f31994f` unchanged; nothing staged (`git diff --cached` empty).
- Unstaged: 76 tracked files modified (+1570/−702 by `git diff --stat`): documentation (`AGENTS.md`, five `docs/business-rules/*`, `workflow/save-session.md`), seed/scripts/test config (`package.json`, `scripts/seed-local-db.ts`), data contracts/HTTP/seed, `src/modules`, ~22 `src/panels` files, server tests/services/repositories/storage, and `src/shared` (app-alert, app-toaster, modern forms/fields, input-sanitizers, identification validation).
- Untracked (26 entries): two avatar route files, `scripts/backfill-sales-roles.ts`, `src/data/seed/organization.test.ts`, `src/modules/organization/name.ts` + test, sales-role files (`sales-role.ts`, `sales-role-backfill.ts` + tests, `accredited-seller.test.ts`), several new tests/pages under `src/panels/admin`, and new `src/shared` components/tests (`module-access.tsx` + test, `record-details-dialog.tsx` + test, `record-details.tsx`, `use-form-dirty.ts` + test, `camera-capture-dialog.tsx` + test, `profile-photo-uploader.test.tsx`, `app-toaster.test.ts`, `customer-detail-panels.test.tsx`, `formatting/identification.test.ts`).
- Deleted/renamed: none.
- Scope note: the prior snapshot recorded a 44-file tree; the tree is now ~102 files. Because the context was compacted, the exact this-session vs pre-existing split of individual files could not be fully reconstructed — files are marked present/verified, but origin is "unknown" where the summary did not attribute them. No work was discarded or overwritten.

## 6. Pending Tasks
- Owner: review and commit the ~102-file tree (one commit acceptable). No agent Git operations.
- Browser QA of the avatar upload/capture flow (not performed — see section 7): `/admin/account` → upload/take photo → Save → reload → photo persists; camera overlay blur/dim and centered spinner.
- Optional: update stale implementation docs that still describe temporary-password/password-reset flow: `docs/implementation/decisions-and-gaps.md`, `docs/development/role-module-permission-matrix-proposal.md`, `docs/implementation/01-prototype/features/02-public-entry-and-sign-in.md`.
- Optional: Storage emulator integration test for avatar upload/download/replace (only unit tests exist for image detection and metadata).
- Staging planning needs separate owner authorization (decision gates: region/domain/sizing/cost/recovery, CAPTCHA provider, observability, retention/privacy wording, audit-trigger rehearsal).
- Live Redemption/Services remain unauthorized; do not build.

## 7. Verification State
- `npx tsc --noEmit` — clean (after the final avatarUrl/profile fixes).
- `npm run lint` — clean; architecture check passed (854 files).
- `npx vitest run src/panels src/shared src/data src/modules src/server/storage.test.ts` — 143 files / 1,143 tests passed (pre-existing warnings only).
- `npm run build` — passed, 164 static pages; new avatar routes present.
- `git diff --check` — no errors (pre-existing CRLF warnings only).
- Camera and My Account tests followed TDD RED→GREEN.
- Live emulator check: uploaded a PNG through the real route → 90-character URL (not a data URL) → downloaded the identical 68 bytes → removed the test object and DB reference; restored First Name "Orlando".
- Known failure: `src/server/services/organization.test.ts` was not green in this run — its emulator setup expects fixture accounts but the DB is true-only after the clean seed. Pre-existing; not re-seeded to avoid wiping true data.
- Not performed: browser visual verification of the avatar/camera flow (browser tool namespaces unavailable after the dev-server restart); Storage emulator integration test; full server suite.

## 8. Next Session Instructions
- Run `/load`; confirm branch `full-stack`, HEAD `f31994f`, and the 76 modified + 26 untracked files above; ask the owner to commit first.
- Before the commit, re-run `npx tsc --noEmit`, `npm run lint`, `npx vitest run src/panels src/shared src/data src/modules src/server/storage.test.ts`, and `npm run build` if anything changed.
- If browser tools are available, walk the avatar upload/capture flow; otherwise ask the owner to verify manually.
- Environment: local DB true-data-only (clean seed: 1 staff Orlando Dela Cruz, 0 members/customers/sales); `npm run db:seed` restores true data, `npm run db:seed:fixtures` adds synthetic data; emulators on 9099/9199/9399; dev server on port 3000 — verify the PID, do not assume.
- Server suites need fixture accounts: run only after `npm run db:seed:fixtures`, then restore the clean seed; coordinate with the owner so true data is not lost.
- Warnings: local credentials live only in `src/data/seed/dev-credentials.ts` (never copy their values into documents); `src/data/mock` no longer exists; do not reseed clean while the owner is using the app; no Git writes.

## 9. Execution Recommendation
- Phase: owner review/commit, then Plan staging.
- Recommended next mode: Build for any small fix; Plan for staging.
- Recommended model: current `hy4-flash-free` (verified); a stronger model for staging planning if available.
- Effort: medium.
- Ultracode: OFF.
- Token optimization: targeted reads; run emulator suites serially only.
- Reason: the tree is green and deterministic; the remaining risk is browser-level avatar verification and the first hosted environment. No global Execution Recommendation policy exists, so this short list follows the skill default.
<!-- SESSION_SNAPSHOT_END -->
