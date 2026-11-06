@AGENTS.md

# CLAUDE.md — AFHomes Platform V3

Claude Code entry point. `AGENTS.md` (imported above) is mandatory governance and wins on any conflict, especially the Git rules and owner-approval gates.

## Project
- Repository `https://github.com/orlando-afhomes/afhomes-platform`, branch `develop`.
- Frontend-first with typed in-memory mock data. Backend, real auth, databases, migrations, infrastructure, and deployment need explicit owner authorization.
- Progress: run `/load` to restore the latest session snapshot (`workflow/save-session.md`), then check the code. Neither overrides governing documents.

## Stack (verify in package.json)
- Next.js App Router, React, TypeScript; Ant Design 6 with regular namespaced `.css`.
- TanStack Query, typed repository contracts, Vitest + Testing Library.
- Zod is installed but not yet used in `src/`.
- Never add Tailwind, shadcn/ui, Base UI, CSS Modules, or another component system.

## Source map
- `src/app/`: routes and layouts; keep thin.
- `src/panels/`: panel UI (`admin`, `public`).
- `src/modules/`: domain types, rules, logic per feature.
- `src/shared/`: reusable components, forms, providers, utils.
- `src/data/`: repository contracts, mock repositories, query keys and hooks.
- `src/theme/`: Ant Design theme and `tokens.css`.

## Where to look (load only what the task needs)
- Business rules: `docs/business-rules/NN-*.md`. Roles 01, network 02, accreditation 03, customers 04, products 05, card issuance 06, finance 07, commissions 08, membership and points 09, redemption 10, reports 11, audit 12, sales reporting 13.
- Technical design: `docs/development/` (`frontend.md` for UI, `testing.md` for tests, `implementation.md` for phases).
- Historical audit (not current authority): `docs/audits/afhomes-v3-project-audit.md`. Read it only when relevant; do not import it.
- Docs may still describe the project as documentation-only or list Tailwind/shadcn. Trust the code and `AGENTS.md` section 8.

## Working method
1. Inspect relevant files before changing them.
2. Substantial work: present a focused plan and wait for approval.
3. Build one approved frontend module at a time with functional static CRUD over shared state.
4. Validate forms, relationships, permissions, and lifecycle transitions.
5. Verify each module before advancing.
6. Report conflicting or incomplete rules; never invent behavior. Respect signed contracts, effective dates, and approved decisions. Do not apply V2 assumptions.
7. Reusable typed components, centralized validation and formatting, consistent design, responsive and accessible UI, no unfinished or developer-only controls in user pages.

## Verification
- Scripts: `npm run lint`, `npm test`, `npm run build`. No typecheck script; use `npx tsc --noEmit`.
- Run targeted tests first (`npx vitest run <path>`); the full suite is slow.
- Lint, typecheck, and tests had failures before this configuration (see audit). Separate pre-existing failures from new regressions and report real results only.
- A stale `.next` can cause false typecheck errors. Do not delete `.next` or generated files without permission.

## Reports
- Significant plans, audits, implementation reports, and QA reviews end with the Execution Recommendation block defined in the global `~/.claude/CLAUDE.md`. Do not copy the template here.
- Plan, Build, and QA are workflow phases. They are separate from the actual Claude Code permission mode, which is reported separately or as "not verified".

## Token efficiency
- Model and effort follow the global routing guidance. Avoid model switching and needless subagents.
- Grep paths and symbols, then read targeted ranges. No full-repo scans or repeated reads.
- Skip `node_modules`, `.next`, `tsconfig.tsbuildinfo`, and lockfiles unless needed.
- Keep output short: changed files, verification, blockers.
- Suggest compaction or a new session when switching major tasks.
