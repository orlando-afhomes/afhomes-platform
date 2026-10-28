# session.md — Chat Handoff Context

## Stack (unchanging)

npm + next (no task runner). `src/app` (App Router) | `src/panels` presentation | `src/shared` | `src/data` mock foundation | docs. Business rules in `docs/business-rules/` (01–13), dev docs in `docs/development/` (9 files). No DB yet; local MongoDB planned Phase 2. No secrets committed.

## Standing user preferences (apply without asking)

- Never stage/commit/push/branch/tag/stash/reset or run GitHub actions unless explicitly commanded.
- Leave foreign diffs alone; never restore what the user deliberately removed.
- Re-check `git status` / `git log` before assuming state; re-read shared files before editing.
- Never persist or echo secrets, credentials, tokens, keys, connection strings, or customer PII.
- Gate on the project's documented checks (see Verify below).

## Repo state (verified 2026-10-28)

- Branch `develop` @ `adf2dca` (`WIP: phase 05.2`).
- Working tree contains extensive uncommitted work: modified tracked files + many untracked implementation files. All uncommitted user/agent work; preserve.
- Pre-existing failures: none reported; formal verification deferred by owner instruction.
- Latest known gates: Phase 05.2 full suite passed (28 files / 254 tests); Phase 06.x formal tests not run.
- Key untracked additions: Sales Network pages (overview/members/detail/genealogy/dialogs), public OST registration page, accreditation records/renewals/registration queue/detail pages, new domain modules, new shared components, `public/images/`.

## Last session's work (UNCOMMITTED)

- Phase 05.2 Sales Network mock domain and repository foundation implemented.
- Phase 05.3 Sales Network Directory & Member Management implemented.
- Phase 05.4 Interactive Genealogy Tree implemented.
- Phase 05.5 read-only referral-code foundation implemented.
- Phase 05.6 Sales Network integration stabilization implemented.
- Phase 06.2 Registration & Accreditation mock domain foundation implemented.
- Phase 06.3 public OST referral-first registration shell implemented (submission disabled).
- Phase 06.4 administrative registration queue/details implemented (read-only).
- Phase 06.5 accreditation records directory/details implemented (read-only).
- Phase 06.6 renewal monitoring and hypothetical preview implemented.
- Phase 06.7 read-only cross-module reference integration implemented.
- Phase 06.8 stabilization implemented: Lucide import verified, account-reference privacy gated, authorized descendant counts, accreditation member-profile link gated, canonical current-accreditation selection consolidated, breadcrumb/detail integration reviewed.
- No backend, DB, auth, deployment, or Git state-changing work.

## Test gotchas

- Next.js 16 prerender rejects `new Date()` in render (fixed footer to static year).
- Lint rule `@next/next/no-html-link-for-pages` requires `next/link` for internal nav.
- `next dev` generates an `AGENTS.md` append block; remove it after dev-server use.
- Dev server can trigger artifacts; verify `git status` for unexpected files.
- Build cache may reference removed routes; delete `.next` and rebuild if TypeScript validator complains.
- Browser refresh resets mock data; client-side navigation preserves it.
- jsdom + React Testing Library installed for component tests.
- Owner has deferred formal testing until full frontend prototype is complete; do not claim tests passed unless actually run.

## Open threads

- Phase 06.8 stabilization: READY FOR OWNER REVIEW; unverified build/typecheck/browser QA deferred.
- Unresolved policy decisions: referral-code issuance, OST applicant fields, submission/approval authority, account provisioning, AAO issuance timing, renewal operations, portal access on expired accreditation, legacy fixture migration, production domain/sizing.
- Phase 07 IST/OST portals: planning only; not implemented.
- `workflow/` and all docs may be untracked or modified; user must stage/commit when ready (do not auto-commit).

## Verify (from root)

```sh
npm run lint
npm test
npx tsc --noEmit
npm run build
git status --short
git diff --check
```