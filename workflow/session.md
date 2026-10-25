# session.md — Chat Handoff Context

## Stack (unchanging)

npm + next (no task runner). `src/app` (App Router) | `src/panels` presentation | `src/shared` | docs. Business rules in `docs/business-rules/` (01–13), dev docs in `docs/development/` (9 files). No DB yet; local MongoDB planned Phase 2. No secrets committed.

## Standing user preferences (apply without asking)

- Never stage/commit/push/branch/tag/stash/reset or run GitHub actions unless explicitly commanded.
- Leave foreign diffs alone; never restore what the user deliberately removed.
- Re-check `git status` / `git log` before assuming state; re-read shared files before editing.
- Never persist or echo secrets, credentials, tokens, keys, connection strings, or customer PII.
- Gate on the project's documented checks (see Verify below).

## Repo state (verified 2026-10-25)

- Branch `develop` @ `1ad7b0b` "initial setup".
- Working tree: 3 tracked modified (docs/business-rules/01, docs/development/architecture, docs/project) + ~31 untracked (docs 02–13, workflow/, Next.js scaffold src/, package.json, etc.). All uncommitted user work; preserve.
- Pre-existing failures (NOT from this session): none reported.
- Gates this session: `npm run build` passed (routes `/`, `/admin`, `/login`, `/_not-found`); `npm run lint` passed (0 errors); TypeScript passed during build.

## Last session's work (UNCOMMITTED)

- Phase 1A frontend foundation implemented: Next.js 16.4.3 App Router + React 19.3 + TS 5 + Tailwind 4 + shadcn/ui + Zod + TanStack Query.
- Panel shells: public (header/footer/home) at `/`, admin (sidebar/header/dashboard) at `/admin`, login placeholder at `/login`.
- TanStack Query provider wired in root layout; metadata set to AFhomes.
- Docs finalized: project.md, architecture.md, frontend.md, database.md, backend.md, security.md, testing.md, implementation.md, deployment.md, README.md, business-rules 01–13 (with 01/architecture/project tracked edits).
- workflow/SESSION.md renamed to workflow/session.md; references updated.
- No backend, DB, auth, or app modules beyond scaffold.

## Test gotchas

- Next.js 16 prerender rejects `new Date()` in render (fixed footer to static year).
- Lint rule `@next/next/no-html-link-for-pages` requires `next/link` for internal nav (fixed public header).
- `cp -r` of node_modules failed due to symlinks; used `npm install` instead; node_modules regenerated.
- Build produces static routes; no DB required.

## Open threads

- Phase 1A complete; awaiting authorization for Phase 1B (mock store, synthetic data, role switching, feature screens) or Phase 2.
- Unresolved: finance auto-activation conflict in architecture.md §25 vs business rules 05/06/07 (High, blocks Phase 4I only).
- Other unresolved: Gold/Silver contract prices, Non-Standard commercial rules, Move scheme terms, RA numbering scope, accreditation expiry rules, Better Auth/MongoDB compat, Atlas tier transaction support, audit retention, production domain/sizing.
- workflow/ and all docs untracked; user must stage/commit when ready (do not auto-commit).

## Verify (from root)

```sh
npm run lint
npm run build
git status --short
git diff --check
```