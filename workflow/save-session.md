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
- Saved 2026-11-24 (Asia/Manila). AFHomes Platform, branch `develop`, HEAD `ed9ceb8` (`feat: add restaurant reservations and polish shared table controls`, made by the owner during the session; the session began at `cd10b3e`, with `12c7518` and `22160bf` committed by the owner in between).
- Tool: Claude Code desktop. Model switched between Sonnet 5.5 and Opus 5.5 by the owner; permission mode not verified. Context was not compacted. The owner used the in-app browser pane in parallel, so some browser checks were interrupted.
- Objectives this session (in order): continue the VIP contract printing plan and verify it; a 16-item admin UI polish list; Earn Points / Redeem Points / booking polish; many small follow-up UI fixes; a final 9-item batch (colors, terms, Linked Records, Edit Draft, tab bar). Phase: frontend prototype with sample data, QA.

## 2. Current Project State
- Printing feature (plan `docs/implementation/01-prototype/plans/vip-contract-printing-plan.md`) is built and committed by the owner: `src/modules/contracts/print-data.ts`, `src/panels/admin/documents/` (PDF fill, controls, tests), seven templates in `public/vip-print-templates/`. Diagonal watermark was removed at the owner's request; the templates keep their own header label.
- Restaurant table reservations exist (committed in `ed9ceb8`): `src/modules/reservations/`, `src/data/mock/reservation-repository.ts`, `src/panels/admin/components/new-booking-flow.tsx`, `restaurant-reservation-dialog.tsx`, `restaurant-reservations-table.tsx`. They record the guest only, no points or money.
- Shared UI changed this session: select with optional icon and description, container-query filter bar, modern record details sheet, pagination, field shell, tab bar, status pills, extra button styles.

## 3. Important Decisions
- Owner choices: action names Earn Points / Redeem Points / View Bookings; receipt number auto-issued `OR-YYYYMMDD-NNNN`; amount labels Total Bill Amount and Amount Not Eligible for Points; reconciliation section "Complete Spreadsheet Comparison"; menu group Finance with inner link Payments; Stay Points tabs Annual Points / Bills to Review / Special Cases / Promotions / Promo History; restaurant is reservation only (website says no walk-ins), with no points; the three PDF packages (`pdf-lib`, `@pdf-lib/fontkit`, `@fontsource/noto-sans`) were approved to keep.
- Claude choices awaiting owner confirmation: Reports tab "Payments Received" with cards Confirmed Payments / Refunds and Reversals / Total After Refunds; "Confirmed This Period"; tab "Programs, IDs & Banks"; payout method list (Bank Transfer, GCash, Maya, Cash, Cheque); restaurant party-size ceiling of 20 (placeholder, no capacity rule exists); the Sales performance report column "Period Confirmed" and the Finance page cards were not renamed.
- Prototype only, browser-memory sample data. Live redemption, Services, real sign-in, database work and deployment still need separate authorization. Git writes are reserved for the owner.

## 4. Completed Work
- Final batch (not yet committed): Net Collections card blue on Reports and Finance; plain terms above; Draft grey vs Returned/Sent Back violet in `src/shared/components/admin/status-pill.tsx` with a new `violet` tone in `status-badge.tsx`; new `violet`, `teal`, `rose` button variants and tokens (`src/theme/tokens.css`) used on Property Sales (IGP) actions; Linked Records rows are buttons that open the matching customer tab (`customer-detail-panels.tsx`, `customer-detail-page.tsx`); Edit Draft resumes at the first step with missing data via an effect in `customer-application-wizard.tsx` (the View Only guard moved below the hooks); tab bar restyled in `src/shared/components/modern/tab-bar.tsx`; filter bar keeps readable minimum widths and wraps when needed.
- Earlier this session (some now committed): modern shared dropdown, receipt auto-number, Redeem Points dialog, booking chooser, lookup keyboard and QR image upload, Finance menu rename, GSD tab removal, payout dialog redesign with a fixed searchable method list (validated in `commission-repository.ts`), Add IST / Add OST button names, field label alignment, Stay Points and Membership stat card colors, Payment icon, Annual Points card colors, person icon on the lookup heading, responsive lookup action buttons.

## 5. Git Working Tree
- Staged: none. Untracked: none. Stash: one older entry (`stash@{0}`, "sales-network cleanup + member detail redesign"), not made by this session.
- Unstaged: 37 modified files (225 insertions, 153 deletions). Most are this session's final batch and follow-ups; `src/data/mock/dev-identities.ts` and `src/data/mock/mock-credentials.ts` are modified but were not edited by this session (pre-existing or the owner's; not inspected). No deleted or renamed files.

## 6. Pending Tasks
- Browser check not done after the last edits for: Customers table badges (seen once), Reports Collections page, Sales page colors, payout dialog, restaurant pass at 375px, Earn Points venue dropdown icons, real QR image decode (only unit-tested with a mock).
- Failures in the last full run (2134 tests, 6 failed before fixes): two `business-flow.test.ts` tests depend on today's calendar date (seed clock; VIP Number date part `261103…` vs `261102…`) and likely failed because the date rolled to 2026-11-24; one `staff-page.test.tsx` test timed out under load (passes alone). The three wizard-edit tests were fixed after that run. These were not rerun as one full suite afterwards.
- Owner items still open: confirm Claude's term choices above; clearance of original wording before official PDF signing copies; restaurant capacity, hours, deposit and cancellation rules; doc 14 amendment; G3/G4 allowance questions; seven G5 process checks.

## 7. Verification State
- Last run: `npx tsc --noEmit` clean; `npx eslint src` clean after removing one unused import; `npm run build` compiled successfully; targeted suites passed (commissions pages 14, promo and staff pages, navigation, print tests, wizard edit tests 5, filter-bar and shared component tests).
- Browser (sample Super Administrator on port 3000) confirmed during the session: Sales IGP button colors and tab bar, Linked Records row opening the Sales tab, Edit Draft landing on Step 2 for the Florencia Mallari draft, lookup arrow-and-Enter, booking chooser and restaurant reservation, Earn Points locked receipt field, 375px filter stacking.
- Not performed: full-suite rerun after the final fixes, visual check of the payout dialog, a clean-checkout run of the two date-dependent tests.

## 8. Next Session Instructions
- Run `/load`, confirm HEAD `ed9ceb8` and the unstaged list. Rerun `npx tsc --noEmit`, then the two date-dependent business-flow tests and the staff-page test on their own to confirm the cause.
- Do one browser pass: Customers table, Customer detail Linked Records and Edit Draft, Reports Collections, Sales, payout dialog at desktop and 375px. Sample accounts are in `src/data/mock/mock-credentials.ts` (check it first, it is modified); a full page reload resets the in-memory data.
- Keep sample data only. Ask the owner to confirm the term choices before treating them as final.

## 9. Execution Recommendation
- Phase: QA. Recommended next mode: Default. Model: Sonnet 5.5, medium effort. Ultracode: OFF.
- Token optimization: run only the failing tests alone, one browser pass, then one full-suite run with the dev server stopped.
- Reason: the remaining work is verifying already-built UI and a few date-dependent tests.
<!-- SESSION_SNAPSHOT_END -->
