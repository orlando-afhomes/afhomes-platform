# Fixes Register

Created 2026-11-22 from the roadmap review (`docs/implementation/README.md`, `prototype/`, `decisions-and-gaps.md`) and the health check at HEAD `50d6143`. It lists what to fix, where, and how to prove it. It authorizes nothing: each file needs owner approval before work starts (AGENTS.md section 7).

## Baseline (2026-11-22)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Pass |
| `npm run lint` (ESLint and architecture check, 672 files) | Pass |
| `npm test` | 1,990 passed, 1 failed of 1,991. The failure was a 15 s timeout; the file passes alone (103 of 103) |
| `npm run build` | Pass |
| Browser checks | Not run |

## Files

| File | Scope | Status |
|---|---|---|
| [01-admin-ui-state-fixes.md](01-admin-ui-state-fixes.md) | 25 Partial admin routes: error, retry and busy states, in 4 batches | Batch 1 built 2026-11-22; batches 2 to 4 open |
| [02-test-and-qa-fixes.md](02-test-and-qa-fixes.md) | Slow test, 320 px overflow, open browser checks, role walkthroughs | T1, T2 and R1 built 2026-11-22; browser checks and role walkthroughs open |
| [03-mock-feature-gaps.md](03-mock-feature-gaps.md) | F6.5, F7.4, F8.6, F11.5, portal plan audit | Open, awaiting approval |
| [04-doc-drift.md](04-doc-drift.md) | Documents that disagree with each other or the code | Open |
| [05-owner-decisions-2026-11-22.md](05-owner-decisions-2026-11-22.md) | Eight items that were "waiting on others", now decided and built | Decided, built in the mock |

## Status legend

`Open` not started. `Awaiting approval` needs the owner's go-ahead for that batch. `Decided` the owner ruled and the rule is in the docs. `Built` implemented and verified in the mock.

## Working order

1. File 05 first: the decisions change business rules that the other files cite.
2. File 02, to keep the test baseline reliable.
3. File 01, one batch at a time (money and status first).
4. Files 03 and 04 as separate approved tasks.

Every batch follows the verification in `prototype/admin-ui-state-audit.md` ("How to verify a page") and ends with `npx tsc --noEmit`, `npm run lint`, targeted `npx vitest run <path>`, and `npm run build`.
