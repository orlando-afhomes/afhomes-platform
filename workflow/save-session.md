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

- Saved at: 2026-11-13 (Asia/Singapore).
- Repository: `C:/Users/SSD-ORLANDO/Documents/Project/afhomes-platform`. Configured origin: `https://github.com/orlando-afhomes/afhomes-platform.git`.
- Branch: `develop`. HEAD and local `origin/develop` tracking ref both at `a0cba09` at save time. Remote was not fetched.
- Objective: finish the remaining frontend prototype work in stages (M5, M6, M7, M8, M10–M11), preserving receipt fixes. The owner explicitly approved implementation and requested maximum available subagent participation.
- Phase: frontend mock build and QA. Three subagents assisted with commissions/allowances, Stay Points/Redemption, and IGP. The owner decides prototype sign-off.

## 2. Current Project State

- Next.js frontend using typed repositories, TanStack Query and synthetic browser-memory records. Full refresh restores seed data. Real authentication, backend, database and deployment still need separate authorization.
- Main flows for M5–M8, period close and reporting exist in the working copy. This is not a sign-off. See `docs/implementation/README.md` and the related phase cards.
- Workflow Atlas `2026-11-13.1`, baseline `develop @ a0cba09` plus the reviewed working copy. Viewer: `C:/Users/SSD-ORLANDO/.codex/visualizations/2026/11/13/01a1d2c4-6803-75d2-b0f7-ecc65baa94f1/afhomes-viewer/dist/index.html`. Prior release remains in its original folder.

## 3. Important Decisions

- The owner chose staged delivery while business inputs are pending. Use the local October 4 AFHomes Sales and Collections (Rev Q) and Allowances (Rev E) workbooks and modules listed by Master File Register Issue 29 for comparison. Later dated owner rulings take precedence. Excel continues to pay during the parallel run.
- VIP sale approval is separate from contract finalization. VIP milestones are 25%, 40% and 100% approved collections. Retain original receipt date and post late items to the first open month. IGP uses a separate monthly Series Number and frozen threshold (initially 10%).
- Issue one VIP Number when recording the signed Reservation Agreement. Freeze applicable seller/referrer rates then. Missing approved rate pauses issuance, approved zero is valid. Activation reuses the number and validity starts at actual or deemed claim.
- Automatic recovery waits for signed terms. Grant paperwork can be tracked while IGP benefits are pending. Redemption uses clearly marked sample configuration. Do not invent any unresolved policy, fees, rates, signed terms or workbook figures.
- Owner prefers plain language and replies starting with Dos. Absolute Git rules in `AGENTS.md` remain in force.

## 4. Completed Work

- Receipt correction and history: Administrator can open verification. Clerk can correct their own returned receipts from contract Payments. Reference remains fixed and prior versions are visible. Earlier Chrome check verified Clerk submission of ₱1,200, Finance return, Clerk correction to ₱1,250, and Finance verification with original version retained.
- M5: separate sale approval, receipt milestones, late receipt posting, 90-day default and reinstatement, signed agreement/VIP issuance, actual and deemed claims. Payment Verification Exceptions handles submitted possible matches, conflicting references and approval blocks. See `src/data/mock/business-effects.ts`, `sale-repository.ts`, `contract-repository.ts`, `membership-repository.ts`, and untracked `card-claim.ts`.
- M6: rate settings and frozen commission rates, product release stages, month-end payout lists and audit flags, held payout disposition, recovery ledger, late payout confirmation posting, and saved workbook-input allowance reviews. See `src/data/mock/commission-effects.ts`, `commission-repository.ts`, and `src/modules/commissions/allowances.ts`.
- M7: fixed Annual Welcome Gift tranches, resort bill approval, refunds, waivers, card servicing and transfer, and Redemption balance/check-in integration. See `src/modules/stay-points/engine.ts`, `src/data/mock/stay-points-repository.ts`, and `redemption-points-source.ts`.
- M8: IGP intake, JA&D accreditation, separate numbering and reissue, shared receipts, staged commissions and grant checklist. See `src/modules/igp/` and `src/data/mock/igp-repository.ts`.
- M10–M11: period-close snapshots, VIP/IGP reporting, historical receipt duplicate protection, roadmap notes and atlas update. New routes: `/admin/sales/igp`, `/admin/commissions/allowances`, `/admin/reports/period-close`.

## 5. Git Working Tree

- At pre-save inspection: 132 staged paths (44 adds and 88 edits), 31 paths with unstaged changes (20 also staged), and one untracked file, `src/data/mock/card-claim.ts`. Saving this snapshot adds a working-tree edit to the already staged `workflow/save-session.md`.
- Staged contents include receipt fixes present before the prototype work, this-session milestone code and docs, and concurrent notification/admin action-menu changes of unknown provenance. Staging appeared during the earlier work and was not performed by the Codex agents. Do not attribute all staged files to this session.
- Unstaged contents include this-session follow-ups in receipt/import deduplication, claim/transfer, payout posting, dashboard/reporting and phase cards. Notification tests/provider, admin action parity tests and sales-network UI also show concurrent edits with uncertain ownership. No deleted or renamed paths were reported in either diff.
- No Git writes or deployment were performed by Codex. Preserve the index and unrelated work. Use read-only Git to review before the owner handles any commit.

## 6. Pending Tasks

- Finish standalone unmatched receipt intake and any unresolved servicing/reporting edge cases. Separate VIP rescission/downgrade entry paths and post-issuance attribution corrections were not implemented. Reissued IGP sales with prior paid or in-flight commissions need staff reconciliation before another payout.
- Finish automatic allowance input assembly from authorized service/appointment records and compare an official month of sales, commissions, and BA/PA/PB results against the registered workbooks. The present allowance review uses workbook inputs and published position terms.
- Inputs still pending: signed IST Commission and Clawback Addendum and its effective terms, signed IGP grant terms, approved IGP price-band code above ₱9 million and JA&D definition of `SUPERSEDED`, real Redemption points-per-night table, and unresolved booking policy questions. The canonical Redemption disabled wording is stale against the authorized sample prototype.
- Finish a fresh full-suite run, production validation on the final tree, and the full J01–J12 browser walkthrough by applicable role. Then update status and obtain owner sign-off.

## 7. Verification State

- Full application suite during implementation: 1,494 passed, 9 failed out of 1,503. Six wizard timeouts passed on isolated rerun. Follow-up nav/dashboard/sales-page run passed 32. Later focused runs passed 134, 102 and 28 tests in their respective slices. Counts overlap and must not be added. A fresh full-suite pass on the final working copy was not performed.
- TypeScript, final observed application ESLint, and `git diff --check` passed during implementation. Earlier lint found issues in concurrent notifications/sales-network changes; a later full lint invocation exited zero. This save did not rerun tests or lint.
- Default Turbopack build stalled during optimization and was stopped. `npm run build -- --webpack` passed, generating 69 static pages. Later dashboard/report edits had focused tests and typecheck, not a fresh production build.
- Chrome: public landing, Super Admin commission rates, Admin new milestone screens and successful sample month close, Clerk Stay Points, Finance verification, HR denial for period close, and SVD/SSM/SM/OST dashboards. Full per-role workflow, application mobile and keyboard coverage are still pending. A transient concurrent notification-provider error interrupted the first seller check; a fresh session reached all four seller dashboards.
- Atlas: 60 indexed routes, 12 journeys, 48 perspective graphs. Build and 3 tests passed. Chrome passed at 1440px and 390px. Atlas coverage is separate from application QA.

## 8. Next Session Instructions

- Run `/load`, verify branch and staged/unstaged changes, then run full Vitest with restrained worker count, TypeScript, lint and webpack build sequentially. Use targeted reruns for explicit 30-second wizard timeouts. Do not delete `.next`.
- Complete the remaining application workflows with sample data and record exact checks and blockers. The official workbook comparison needs period totals; use the registered files and later owner rulings, never copy real customer/financial records into source or browser fixtures.
- Preserve existing approvals, receipt versions, number sequences and closed snapshots. Check `docs/implementation/decisions-and-gaps.md` and current canonical rules before treating a historical item as open or resolved.
- Owner alone handles staging, commits and pushes. Separate authorization is required for backend, real auth, database or deployment.

## 9. Execution Recommendation

- Phase: QA, then Build for remaining approved prototype gaps.
- Current mode: Codex Default. Current model: not verified.
- Recommended next mode: Default for approved fixes and QA, Plan for business decisions.
- Recommended model: continue in Codex. Exact model availability was not verified. Effort: high for money and lifecycle verification.
- Ultracode: OFF. Assign distinct files to subagents only when authorized and useful.
- Token optimization: run the final checks sequentially, rerun failing slices, and review only affected files and rules.
- Reason: overlapping changes affect approvals, money, card numbering, and points. The isolated checks establish behavior, and a final whole-tree run is needed for sign-off.
<!-- SESSION_SNAPSHOT_END -->
