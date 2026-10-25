# session.md — Chat Handoff Context

## Stack (unchanging)

npm + next (no task runner). `src/app` (App Router) | `src/panels` presentation | `src/shared` | `src/data` mock foundation | docs. Business rules in `docs/business-rules/` (01–13), dev docs in `docs/development/` (9 files). No DB yet; local MongoDB planned Phase 2. No secrets committed.

## Standing user preferences (apply without asking)

- Never stage/commit/push/branch/tag/stash/reset or run GitHub actions unless explicitly commanded.
- Leave foreign diffs alone; never restore what the user deliberately removed.
- Re-check `git status` / `git log` before assuming state; re-read shared files before editing.
- Never persist or echo secrets, credentials, tokens, keys, connection strings, or customer PII.
- Gate on the project's documented checks (see Verify below).

## Repo state (verified 2026-10-25)

- Branch `develop` @ `df3b24d` "installation: npm package".
- Working tree contains Phase 1B-A, R1–R3 remediation, Phase 1B-B01, and B01 production UI cleanup changes (tracked modifications + untracked implementation files). All uncommitted user work; preserve.
- Pre-existing failures: none reported.
- Gates this session: `npm test` passed (26 tests); `npm run lint` passed (0 errors); TypeScript passed; `npm run build` passed (routes `/`, `/admin`, `/login`; `/admin/design` removed).

## Last session's work (UNCOMMITTED)

- Phase 1A frontend foundation implemented and accepted.
- Phase 1B-A mock foundation implemented and remediated through R1–R3:
  - Centralized browser-scoped in-memory mock store.
  - Deterministic synthetic seeds with genealogy relationships.
  - Typed member/customer/product repository contracts.
  - Genealogy-aware access filtering.
  - Development-only identity switching.
  - TanStack Query identity isolation.
  - Draft-only customer mutations.
  - Deterministic async delay/error/cancellation support.
  - 26 passing Vitest tests.
- Phase 1B-B01 design system implemented and production-cleaned:
  - Shared UI primitives under `src/components/ui/`.
  - Semantic tokens and reusable utility classes in `src/app/globals.css`.
  - Development-only design preview removed.
  - Admin dashboard cleaned of mock diagnostics and preview link.
  - Production UI standards documented in `docs/development/frontend.md` and `AGENTS.md`.
- `AGENTS.md` created and refined as permanent AI-agent governance.
- No backend, DB, auth, or app modules beyond frontend foundation.

## Test gotchas

- Next.js 16 prerender rejects `new Date()` in render (fixed footer to static year).
- Lint rule `@next/next/no-html-link-for-pages` requires `next/link` for internal nav (fixed admin sidebar).
- `next dev` generates an `AGENTS.md` append block; remove it after dev-server use.
- Dev server can trigger pnpm/npm artifacts; verify `git status` for unexpected files.
- Build cache may reference removed routes; delete `.next` and rebuild if TypeScript validator complains.
- Admin sidebar previously used native anchors; now uses `next/link` for client-side navigation.
- Browser refresh resets mock data; client-side navigation preserves it.

## Open threads

- Phase 1B-B01 complete and cleaned; awaiting owner visual review and authorization for Phase 1B-B02.
- Nonblocking: admin sidebar links to unimplemented module routes.
- Nonblocking: HR/Finance module permissions are represented only as safe denials.
- Nonblocking: advanced own/team/all scope remains a development simulation.
- Unresolved business decisions remain: Gold/Silver contract prices, Non-Standard commercial rules, Move scheme terms, RA numbering scope, accreditation expiry rules, Better Auth/MongoDB compat, Atlas tier transaction support, audit retention, production domain/sizing.
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