# session.md — Chat Handoff Context

## Stack (unchanging)

npm + next (no task runner). `src/app` (App Router) | `src/panels` presentation | `src/shared` | `src/data` mock foundation | docs. Business rules in `docs/business-rules/` (01–13), dev docs in `docs/development/` (9 files). No DB yet; local MongoDB planned Phase 2. No secrets committed.

## Standing user preferences (apply without asking)

- Never stage/commit/push/branch/tag/stash/reset or run GitHub actions unless explicitly commanded.
- Leave foreign diffs alone; never restore what the user deliberately removed.
- Re-check `git status` / `git log` before assuming state; re-read shared files before editing.
- Never persist or echo secrets, credentials, tokens, keys, connection strings, or customer PII.
- Gate on the project's documented checks (see Verify below).

## Repo state (verified 2026-10-26)

- Branch `develop` @ `e5f6079` (post-Phase 1B-B06-R1 + Account/Org verification).
- Working tree contains extensive uncommitted work: modified tracked files + many untracked implementation files. All uncommitted user work; preserve.
- Pre-existing failures: none reported.
- Gates this session: `npm test` passed (115 tests); `npm run lint` passed (0 errors); TypeScript passed; `npm run build` passed (routes `/`, `/admin`, `/admin/accounts`, `/admin/organization`, `/login`).

## Last session's work (UNCOMMITTED)

- Phase 1A frontend foundation implemented and accepted.
- Phase 1B-A mock foundation implemented and remediated through R1–R3.
- Phase 1B-B01 design system implemented and production-cleaned.
- Phase 1B-B02 shared application layouts implemented.
- Phase 1B-B03 navigation system implemented.
- Phase 1B-B04 role-aware navigation implemented (R1–R3).
- Phase 1B-B05 admin/operations panel shells implemented.
- Phase 1B-B06 sales network panel shells implemented (R1 remediation).
- Dashboard & Analytics frontend implemented (scoped metrics only).
- Account Management frontend implemented.
- Organization & Staff Management frontend implemented and verified (department/staff CRUD, search, filter, sort, counts, repo safeguards).
- Permission matrix proposal documented (partially approved).
- No backend, DB, auth, or deployment work.

## Test gotchas

- Next.js 16 prerender rejects `new Date()` in render (fixed footer to static year).
- Lint rule `@next/next/no-html-link-for-pages` requires `next/link` for internal nav.
- `next dev` generates an `AGENTS.md` append block; remove it after dev-server use.
- Dev server can trigger artifacts; verify `git status` for unexpected files.
- Build cache may reference removed routes; delete `.next` and rebuild if TypeScript validator complains.
- Browser refresh resets mock data; client-side navigation preserves it.
- jsdom + React Testing Library now installed for component tests.

## Open threads

- Organization & Staff Management: READY FOR OWNER VISUAL APPROVAL (pending browser verification).
- Unresolved policy decisions: Department Head eligibility, staff employment-status lifecycle, Gold/Silver contract prices, Non-Standard commercial rules, Move scheme terms, RA numbering scope, accreditation expiry rules, Better Auth/MongoDB compat, Atlas tier transaction support, audit retention, production domain/sizing.
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