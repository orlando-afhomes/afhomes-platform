# Architecture refactoring execution record — 2026-11-22

This record covers the owner-authorized roadmap phases 0–7. Existing modified and untracked application work was the starting point, not disposable work. No Git writes or deployment were performed. `workflow/architecture-baseline/initial-status.txt` and `initial-tracked.diff` record the starting tracked changes; the patch is not a complete backup of untracked files.

## Delivered structure and boundaries

Keep `app` for route composition, `panels` for presentation, `modules` for pure rules and application calculations, `data/contracts` for repository interfaces, `data/mock` for browser adapters, and `shared` for reusable UI/platform helpers. `npm run check:architecture` resolves alias/relative imports and exports, rejects domain/contracts-to-mock/panel and shared-to-panel dependencies, rejects domain UI dependencies, and detects static runtime import cycles. Type-only cycles are allowed. `npm run test:architecture` tests enforcement; the standard lint command also runs the boundary checker. No dependencies were added.

## Phase record

- Phase 0: captured starting status and tracked patch. Initial TypeScript passed. The initial lint/full-suite overlapped edits; they are not a clean frozen baseline. The full-suite attempt was stopped after contention/timeouts and live file relocation. These failures cannot be classified as pre-existing. Final checks are recorded below.
- Phase 1: identity-scoped query snapshots drive module/operation/genealogy access. Successful access-affecting commands await invalidation. Pending/error access removes the entire protected admin subtree, including React portals. Access changes cancel in-flight authority reads and remove protected record caches before fresh authority is accepted; identity/session transitions synchronously purge protected caches. Failed atomic commands preserve drafts. Repository guards remain authoritative within the prototype. Live linked-account system-role edits now feed both snapshots and repository identity checks; unlinked synthetic identities retain their existing fallback. Real server authorization remains future work.
- Phase 2: role/scope helpers moved into domain ownership; mock paths retain compatibility exports. Admin notification mapping/provider implementation moved into the admin panel; shared context/hooks remain reusable. Automated boundaries pass.
- Phase 3: public hooks use a focused read-only adapter and shared allowlist projections, with the existing browser store and query keys. Old hook imports remain compatibility exports. Adapter-neutral aggregate interfaces no longer belong to mock infrastructure.
- Phase 4: customer draft type, initialization and conversion moved out of rendering code with compatibility exports. Notification ownership improved. Other large cohesive UI sections were retained rather than fragmented without a concrete reason.
- Phase 5: extracted read-only collection-state application calculation and integrated reconciliation without changing lifecycle/audit ordering. Characterization and 82 business-flow tests passed. Owner selected rejection of conflicting single/per-tier payment codes on new saves/updates; validation and a dated document-06 clarification implement that decision. Existing snapshot/number readers remain unchanged. The reconciliation workflow now lives in `modules/finance/application/reconcile-contract.ts`, accepting narrow domain arrays and explicit audit/ID/clock/points/commission ports; the mock adapter retains its export. Existing 82 existing business-flow tests plus three effect-order/idempotency port tests passed.
- Phase 6: source graph narrowed from the audit's 118 files/28 repository implementations to 28 files/one public adapter, without the address dataset. These are source graph metrics, NOT measured transfer or latency improvements. No additional lazy-loading changes were retained without production evidence. Production/browser measurement remains gated by build environment failures; see final results.
- Phase 7: additive customer cursor pagination supports 1–100 records, stable lexicographic ID ordering, current-visible total and deletion-tolerant after-ID cursor. Visibility/redaction precedes pagination. Existing list callers/UI remain unchanged. Mock scans remain O(n), not snapshot-isolated. HTTP pagination, database indexes, directory UI and broader selective financial refreshes remain future integration work.

## Financial source comparison

Document 06 section 6.3 and dated amendments supply approved C01/TXX/Move mappings and finalized snapshot protection. Existing product completeness, contract snapshot and domain helper resolvers have different precedence for conflicting configuration. The owner explicitly chose rejection rather than automatic precedence on 2026-11-22. New configuration is rejected if both sources differ. No existing finalized contract or issued number is rewritten. Documents 07–09 and 12 remain authoritative for payment, commission, points and audit behavior; this refactor does not approve new commercial rules.

## File ledger

Created: scripts/check-architecture.mjs; scripts/check-architecture.test.mjs; src/modules/identity/active-roles.ts; src/modules/identity/record-scope.ts; src/panels/admin/components/customer-draft.ts; src/panels/admin/providers/notifications-provider.tsx; src/data/access-snapshot.ts; src/data/access-snapshot.test.tsx; src/data/contracts/repositories.ts; src/data/contracts/public-content-repository.ts; src/data/mock/public-content-repository.ts; its colocated test; src/data/mock/customer-pagination.test.ts; src/data/public-content-queries.ts; src/modules/finance/application/collection-state.ts and its test; this execution record and baseline artifacts.

Relocated: src/modules/notifications/module-nav.ts and its test to src/panels/admin/notifications/.

Modified: package scripts; data query keys/general/business/public-compatible query hooks; mock aggregate/customer/product/promo/business-effects/scope/dev-identities; customer repository contract; identity permissions; genealogy; VIP rules/test; admin access/navigation/genealogy/forms/layout/notification consumers; shared QueryProvider/DevIdentityProvider/admin gate/notification context and tests; public Experience/VIP/Offers query imports; architecture/backend docs; document 06 owner clarification. Some of these files already contained owner work; their unrelated changes were preserved.

## Verification and limitations

Focused checks passed: 83 financial characterization/business-flow tests; 27 product/VIP rule tests; 34 public/product/promo/experience repository tests; 8 public-content/pagination tests; 54 boundary/form/domain tests; 8 notification menu and 8 destination tests; 3 native architecture-checker tests. These overlapping counts must not be summed into a unique total. Architecture scan passed 667 source files. Access and final integrated checks are recorded in the final update below.

Sandboxed production build encountered Google Fonts DNS failure and an EPERM output-directory failure. A build retry outside the sandbox was requested. The earlier default Turbopack attempt was stopped while compilation made no progress. Browser CLI could not write its default socket directory, and connector navigation timed out. No browser QA or performance success is claimed from those attempts.

## Rollback and preservation

Use a targeted reversal of only this task's edits after comparing current files for external changes. Never reset/stash/checkout/clean the working tree. Keep the owner's original uncommitted changes and finalized financial records. No database/authentication/backend/hosting changes were made.

Production build update: the outside-sandbox webpack build compiled, passed TypeScript and generated all 100 pages successfully (exit0). This is a local build, not deployment. Runtime measurement is now being performed on a loopback-only local production server. Final source verification remains required after subsequent changes.

Final access checks: live account/system-role revocation regression passed; the reviewer reproduced a four-contract stale-record leak across an Admin-to-OST downgrade/identity round trip, then approved the cache purge correction. Latest access/cache tests 12 passed, auth-gate tests 4 passed (including actual portalled content), account/authorization/access/gate tests 76 passed, staff54 and role27 passed. These counts overlap. No broad record-cache reuse survives an access change; only allowlisted public projections are retained.
