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
- Saved at: 2026-11-23 (Asia/Manila business date; exact time not recorded).
- Repository: AFHomes Platform; branch `develop`; HEAD `5f8a9ef` (owner committed all session work; tree clean at save).
- Tool and model: OpenCode session (model not verified).
- Session objective: (a) finish prototype completion plan Stages 0–6 plus two review-verdict fix rounds; (b) continue the realistic-seed-data plan from Claude's start to implementation-complete.
- Development phase: frontend mock prototype; implementation done, owner review/commit pending. Backend, real authentication, database, deployment remain separately authorized.
- Context note: built on the prior `/load` snapshot (Stage 1 at `6ea21df`); this save supersedes it. Nothing was compacted; everything below was read or run in this session unless marked otherwise.

## 2. Current Project State
- Verified implementation status: Stages 1–6 built and verified in the working copy, then committed by the owner as `5f8a9ef` (`refactor: split the seed builder and rename dev identities to realistic names`). Realistic seed (`src/data/mock/seed/`: anchor, people, organization, business, catalog, operations, igp, index) replaced `seed-data.ts` (deleted); dev identities/credentials use realistic names with `@afhomes.com.ph`; import templates use realistic rows; IGP catalog uses generic invented names.
- Review-verdict fixes (all committed): shared OR/bank-number duplicate check across intake, matching, submission, correction and verification; IGP monthly sequence and uniqueness include imported history; Replaces links validate against existing records or rows that will actually import (two-pass); copied allowance figures require explicit split confirmation; spreadsheet-switch sign-off relabeled comparison-only (doc 08 §16), payout rules unchanged.
- Two genuine bugs found via the new seed and fixed: wizard Customer-ID step check now excludes the record itself (`customer-application-wizard.tsx`); dashboard KPI sr-only label no longer reads "Down +X%" (`dashboard-kpi.tsx`).
- Open items kept as-is: Stage 7 (separate authorization); D8 owner-only note; doc-14 IGP-membership amendment proposal (awaiting owner sign-off); blog dates static (no ruling); outlet `sample` flags kept with complete rows (plan default).

## 3. Important Decisions
- Owner answers this session: do all Stages 0–6 (Stage 7 excluded by the plan); IGP-1/F11.3 — research `AFHomes Document/Business Rules` first, then implement a recommended solution, never leave pending (external folder held no IGP-benefits paper; F11.3 runs against `AFHomes_Sales_Collections_DSC_DRI-v11_0_0-BUILD_2026-10-04a.xlsx` on synthetic data); D1 AGENTS.md narrow fix authorized; S6 stays `useConfirmRun`; all five review fixes approved; IGP import stays Admin + Super Admin; switch fix as record-only copy.
- IGP-1 owner-authorized recommendation: buyer membership record created on Formal VIP Grant signing, frozen price tier, no VIP Number, no Stay Points (grant benefits beyond tier undefined).
- One stage per session and one-change-set-per-stage rules were set aside by the explicit "do all remaining phases" instruction; Stages 2/3/4 ran via parallel subagents, coordinator closed cross-scope gaps.
- Git writes remain reserved for the owner (commits `9796900`, `5f8a9ef` made by the owner). Builder subagents were barred from git writes.

## 4. Completed Work
- Stages 2/3/4 via subagents: Batch 2 error states (53/53), Batch 4 (109/109, S6 recorded in `frontend.md`), G1/G2 finance exceptions (187/187), G3/G4 allowance assembly + switch sign-off (53/53, 5 items honestly reported not invented), IGP-1/IGP-2 (41/41), G5 portal audit (21/28 boxes ticked; 7 Step-2 RED boxes left unticked).
- Coordinator: G1 clerk intake surface on the contract Payments tab (+2 tests); Stage 5 browser matrix + role walkthroughs (recorded in `16-state-verification.md`); Stage 6 D1–D7 (F5.5, F3.7, F8.5, AGENTS.md narrow fix, implementation README refresh, 63-page route reconcile, D7 verified clean).
- Review round: 5 fixes + 7 regression tests in `payment-repository.ts`, `igp-repository.ts`, `history-import.ts`, `allowance-review-page.tsx`, `reconciliation-page.tsx`; fallout repaired (self-payment exclusion, `workbook` test convention, toast scoping, seed-balance test data, forced-duplicate cleanup, split-day overflow).
- Seed continuation: business-pages migrated to seed-derived values (103/103), admin-header identity labels (4/4), commissions Set Rate race fixed, `seed-build.test.ts` determinism/format tests (4/4), plan status line set to Implemented.
- Browser QA (seed): all admin routes × every tab, 19 public URLs, portal sign-in as cardholder; scoped checks for Finance, Clerk, HR, GSD, SVD-A, OST-A1, OST-B1, OST-C1; 8 screenshots in `/tmp/seed-qa/`; zero placeholders. Owner-manual items recorded, not attempted.

## 5. Git Working Tree
- Branch `develop`, HEAD `5f8a9ef`, nothing staged, nothing unstaged, no untracked, deleted, or renamed files (verified with read-only Git at save).
- Previous working copy (Stages 1–6, seed build, review fixes, ~72 entries incl. `src/data/mock/seed/`, deleted `seed-data.ts`) was committed by the owner; this save changes only the snapshot block.
- No Git write operation was performed by any agent in this session.

## 6. Pending Tasks
- Doc-14 IGP buyer-membership amendment proposal (record the 2026-11-23 ruling, supersede "not built" notes) — needs owner sign-off; do not treat prototype behavior as live rule.
- G3/G4 reported items: Qualifying/Extended split allocation, assumed-credit records, three unattested member filters (surfaced in UI), OCT I1 both-legs reading (needs owner ruling if the workbook treats it differently), post-close entry limit (by design).
- G5: 7 Step-2 RED boxes left for owner process trust; gap list returned by the audit.
- Browser/manual: throttled nav, browser forced-error, dirty-form Back, focus-ring visual (standing owner items); blog dates (no ruling); F11.3 live-figure comparison (needs the official workbook figures).
- Stage 7 (backend, real auth, database, deployment) and D8 remain excluded/separate.

## 7. Verification State
- This session, real output: `npx tsc --noEmit` clean (repeated); `npm run lint` clean (681 then 687 files); `npm run build` pass (twice); `git diff --check` clean; mock suite 538/538; targeted suites green in isolation (Stage 2: 53/53; Stage 3: 109/109; G1/G2: 187/187; G3/G4: 53/53; IGP: 41/41; clerk surface: 14/14; seed-build: 4/4; business-pages: 103/103; staff: 21/21; commissions/dashboard/promo/finance/contract-detail/reconciliation suites green).
- Full `npm test`: 2091 passed, 11 failed of 2102 — all in known load-sensitive files (business-pages, staff-page, dashboard, promo) or findBy-expiry under parallel load; every one passes standalone (business-pages 103/103, staff 21/21, promo+dashboard 19/19). Last full run did not include a post-fix whole-suite re-run; rerun once with the dev server stopped to separate load flakes.
- Browser QA: real-browser pass per section 4 (one tab wedge on dirty-form Back recorded; no console app errors besides noted HMR/dev entries).
- Not performed: full suite re-run after the final test edits (Gold timeout bump, commissions race fix); owner manual browser items; IGP live-figure workbook comparison.

## 8. Next Session Instructions
- Run `/load`, verify HEAD (expect `5f8a9ef`, clean tree), then run the full suite once with the dev server stopped to confirm the 11 load-only failures clear.
- Then owner review and commit of any further changes; do not start Stage 7, backend, or provisioning without separate explicit authorization.
- If the owner approves: record the doc-14 amendment, rule on OCT I1, and tick G5 RED boxes on trust. Keep payout-switch and IGP-membership prototype behavior out of live-rule status.
- Inspect first: `workflow/save-session.md` (this snapshot), `git log --oneline -5`, `docs/implementation/01-prototype/plans/realistic-seed-data-plan.md` (status: Implemented, review/commit pending).

## 9. Execution Recommendation
- Phase: QA (one full-suite confirmation run), then owner review.
- Current mode: not verified.
- Recommended next mode: default, for the confirmation run and review.
- Current model: not verified.
- Recommended model: Sonnet 5.5.
- Effort: medium.
- Ultracode: OFF.
- Token optimization: single full-suite run with the dev server stopped; targeted suites only for any failure.
- Reason: everything verifiable is green in isolation; the only open verification is separating full-suite load flakes from real regressions.
<!-- SESSION_SNAPSHOT_END -->
