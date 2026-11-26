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
- Saved 2026-11-26 (Asia/Manila). AFHomes Platform, branch `full-stack`, HEAD `fcb63fd`.
- Tool: OpenCode. Model: GLM-5.3-Flash (verified from the environment). Permission mode not verified. No compaction observed.
- Objectives: continue the full-stack roadmap — implement and verify F4 (products, contracts, sales, IGP) and F5 (payments, adjustments, cancellations, holds), then run repeated two-axis code reviews and apply the findings.
- Phase: full-stack local build; F0–F5 complete. F4/F5 were committed by the owner as `fcb63fd` during the session; this session's sixth-round review fixes are uncommitted.

## 2. Current Project State
- Branch model unchanged: `prototype` is frozen, `full-stack` is primary, `develop` holds the pilot plus Step D; mock removal only at F9.
- F4 built: catalog admin with versioning (tier-level `configVersion`/`effectiveDate`/`changes`; product/scheme writes, approval, retire, guarded delete), contract lifecycle completion, Non-Standard 1–12 with Administrator then Finance approvals, sale commission correction, IGP catalog/sales/JA&D/documents/threshold/grant rules/buyer membership/history import. VIP Number issuance is blocked with a user-facing note; issuance is F6.
- F5 built: `PaymentAdjustment` (insert-only), `ClosedMonth`, `UnmatchedReceipt`, `ReceiptImportBatch`, `Sale.financialHold`; receipt reject/return/resubmit, counted date in the first open month, bank from the existing reference list, reversals/refunds, cancellation forfeiture with a dated sale reversal, defaulted reinstatement, month close, unmatched receipts and import sign-off.
- Six review rounds fixed authorization, audit identity/actions, concurrency, money precision, contract/IGP column persistence, system-wide OR uniqueness (case-insensitive, including IGP), IGP standing/JA&D, tier-level version reads, the adjustment table as sole source, cancellation adjustments, production copy and test isolation.
- Local environment: emulators were started this session with Java 21 at `C:\Program Files\Eclipse Adoptium\jdk-21.0.13.10002-hotspot`; database left on `db:seed:clean` (1 account, 0 business records).

## 3. Important Decisions
- Owner: owner-only Git; the owner committed F4/F5 as `fcb63fd` during the session. Synthetic local data; no business-rule changes.
- Non-Standard gate closed by the owner on 2026-11-24: 1–12 monthly payments (docs 05 §10.2/item 32); the stale UI20 1–36 text was synced.
- Administrator holds `finance.refund` (doc 07 §5.3), so the Administrator may reverse/refund and decide cancellations.
- OR/reference uniqueness is system-wide and case-insensitive across payments, open unmatched receipts, non-rejected import batches and IGP receipts; auto-assigned Cash OR numbers advance past held numbers.
- Payment adjustments are read only from `paymentAdjustments`; the details copy is stripped.
- Cancelling a confirmed sale writes a dated reversal in the open month (doc 13 §4.5).
- Tests must not mutate seeded records: they create and delete their own contract/sale, product, closed month and unmatched/import records.
- Deferred review items are accepted: unmatched-receipt file storage, reference-list admin CRUD, price-amendment sale adjustment (no operation), effective-date scheduling, closed-month re-open rule, forfeiture amount owner confirmation, `reconcileContractState` port, imports-to-collections (F8), close-month DB lock, IGP paid documents, structural smells, browser walkthrough.
- Retained from F1: MFA hooks, 8-hour production sessions, Firebase email password reset, CAPTCHA deferred to staging.

## 4. Completed Work
- F4 files: `src/server/services/{catalog-admin,contracts,sales,igp,igp-catalog}.ts`; routes under `src/app/api/v1/` for products, payment-schemes, tier-levels, contracts (`[id]/[action]`), sales (correct-commission, default), IGP, IGP catalog; schema additions; seed IGP catalog/settings/accreditations; tests `contracts-f4.test.ts`, `igp.test.ts`; phase-plan F4 status.
- F5 files: `src/server/services/payments.ts` (receipt decisions, adjustments, closed months, unmatched receipts, imports), `src/server/repositories/records.ts` (adjustment ledger reads, `financialHold`), routes for `closed-months`, `unmatched-receipts`, `history-import`, `payments/[id]/[action]`; schemas; HTTP repositories; `payments-f5.test.ts`; phase-plan F5 status.
- Docs: phase plan F4/F5 status and review history; `decisions-and-gaps`, delivery plan and pilot plan Non-Standard sync.
- Verification: 73/73 server tests across 14 files; 29/29 finance/import screen tests; tsc, lint (868 files) and build clean; rich seed then clean seed.

## 5. Git Working Tree
- Staged: none.
- Unstaged (this session's sixth-round fixes; 7 files, 37 insertions, 19 deletions): `docs/implementation/02-full-stack/full-stack-phase-plan.md`, `src/server/services/catalog-admin.ts`, `contracts-f4.test.ts`, `contracts.ts`, `igp.ts`, `payments.ts`, `sales.ts`.
- Untracked: none. Deleted or renamed: none.
- The F4/F5 body is committed in `fcb63fd` (owner). The two previously modified owner test files no longer appear in the working tree; how the owner resolved them in `fcb63fd` was not inspected.
- Unfinished: the 7 unstaged fix files await owner review/commit.

## 6. Pending Tasks
- Owner: review and commit or discard the 7 uncommitted sixth-round fix files.
- Owner decisions for F6: allowance questions G3–G5; Legal confirmation of the clawback addendum before real payouts; cancellation forfeiture amount confirmation (doc 05 §12 says do not invent penalty rules).
- F6 planning/implementation: commission rates frozen on the sale, VIP Number issuance, releases at 40%, month-end payout lists, clawback, approved vs paid.
- F7–F9 as written in the phase plan; mock removal only at F9.
- Deferred review items listed in section 3; plus browser api-mode walkthrough and staging checks.
- Known pre-existing failures: the mock `business-flow` two date assertions; the two owner-modified screen test files (not re-run this session).

## 7. Verification State
- `npx vitest run src/server --no-file-parallelism`: 73/73 across 14 files (targeted F4/F5/IGP 17/17).
- Finance/import screen suites: 29/29. Other screen suites were not re-run; the two owner-modified files were not re-run.
- `npx tsc --noEmit` clean; `npm run lint` clean (868 files); `npm run build` succeeded.
- `npm run db:seed`: 28 contracts, 40 customers, 15 members, 84 payments, 3 tier levels, 3 products, 4 schemes, plus IGP catalog/settings and 4 JA&D accreditations. `npm run db:seed:clean`: 1 account, 0 business records.
- Known behavior: restart the emulators after schema edits; run server tests with `--no-file-parallelism` because the session suite signs out a shared `dev-admin` cookie.
- Not performed: full `npm test`, browser api-mode walkthroughs, staging checks, real email delivery.

## 8. Next Session Instructions
- Run `/load`; confirm branch `full-stack`, HEAD `fcb63fd`, no staged or untracked files, and the 7 unstaged fix files from this session.
- Do not stage or commit. Ask the owner to review/commit those files and to settle the F6 decisions (allowances, clawback addendum, forfeiture amount).
- Plan F6 before coding. Read `docs/business-rules/08-commission-management.md`, `13-sales-performance-reporting.md`, the allowance decisions in `docs/implementation/decisions-and-gaps.md` (G3–G5), the commissions modules/screens and the closed-month snapshot.
- After any schema edit, restart the emulators, run `npm run db:seed`, then tests; leave the database on `db:seed:clean` when handing back.
- Run the targeted suites and the 73-test server suite with `--no-file-parallelism`; do not run the full `npm test` unless asked.

## 9. Execution Recommendation
- Phase: QA (sixth review-fix verification), then Plan F6.
- Recommended next mode: QA review, then Plan.
- Recommended model: Claude Opus 5.5, high effort.
- Ultracode: OFF.
- Token optimization: targeted reads of doc 08, the commissions modules and the allowance decisions; run the server suites only.
- Reason: F6 freezes commission rates and releases payouts on the F5 receipt ledger, so the uncommitted fixes and the gated owner decisions must be settled first.
<!-- SESSION_SNAPSHOT_END -->
