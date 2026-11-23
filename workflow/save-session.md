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
- Saved 2026-11-23 (Asia/Manila). AFHomes Platform, branch `develop`, HEAD `12c7518` (`feat: issue VIP Numbers on qualifying payment and defer membership creation`, made by the owner during this session; the session began at `cd10b3e`).
- Tool: Claude Code desktop, Sonnet 5.5, permission mode not verified. Context was not compacted.
- Objective: continue `docs/implementation/01-prototype/plans/vip-contract-printing-plan.md`, then browser-walk the print flows. Phase: frontend prototype with sample data, QA.

## 2. Current Project State
- The printing feature is mostly built (found already in the working tree): `src/modules/contracts/print-data.ts` (template choice, Grant eligibility, receipt summary), `src/panels/admin/documents/vip-print-pdf.ts` (PDF-LIB fill for application, reservation, grant, Finance summary), `vip-print-controls.tsx` (dialog, per-session archive, signed-sample attach, reprint), seven supplied templates in `public/vip-print-templates/`, wired into the customer wizard, customer detail, sales contract detail and Finance collection detail pages. Packages `pdf-lib` and `@pdf-lib/fontkit` were added to `package.json`.
- The owner commit `12c7518` changed VIP Number issuance (docs 04–07, `business-effects.ts`). The printing code was not re-checked against it.

## 3. Important Decisions
- Owner said "continue the implementation" of the printing plan, then approved the browser walkthrough and the application/access check.
- Plan limits stand: sample PDFs only, browser memory only, official signing copies unavailable until the owner clears original wording, variants and prices. Printing changes no workflow status. Git writes are reserved for the owner.

## 4. Completed Work
- Added the missing per-page sample stamp "SAMPLE - NOT FOR SIGNING" (pale diagonal) in `vip-print-pdf.ts` (`stampSample`, called in `renderVipDocument`), plus test "stamps every page of every output as a sample" in `vip-print-pdf.test.ts`.
- Browser walkthrough on localhost with sample accounts: Bronze Reservation Agreement (2 pages), Grant (9 pages) and Finance summary (receipts total ₱25,500, balance ₱46,500 as on the contract page) rendered filled and stamped. Application form from the wizard rendered 2 pages filled and stamped. Saving as draft linked the prepared copy ("Print filed application sample" on the customer). The Clerk saw it (has manage access). An unrelated seller could not list or open that customer and saw no print button. No console errors.

## 5. Git Working Tree
- Staged: none. Unstaged (modified): `docs/implementation/01-prototype/README.md`, `package.json`, `package-lock.json`, `src/modules/customers/types.ts`, `src/panels/admin/contract-detail-pages.test.tsx`, `customer-application-wizard.tsx`, `customer-detail-page.tsx`, `finance-collection-detail-page.tsx`, `sales-contract-detail-page.tsx` (111 insertions, 28 deletions). Most predate this session (the printing work found in the tree); this session edited only the stamp and its test in the untracked files below.
- Untracked: `docs/implementation/01-prototype/plans/vip-contract-printing-plan.md`, `public/vip-print-templates/` (7 PDFs), `src/modules/contracts/print-data.ts` and `.test.ts`, `src/panels/admin/documents/` (3 files). No deletions or renames. The earlier hover fix in `customer-lookup.css` and the old snapshot are no longer in the working tree (owner committed them).

## 6. Pending Tasks
- Browser-untested variants: Silver, Gold, Gold with supplementary holder, Non-Standard, and the signed-sample attach path. Unit tests cover the tiers, not the browser.
- Re-verify printing against owner commit `12c7518` (VIP Number now issued on qualifying payment; membership deferred). Check the "Pending issuance" text and Grant eligibility still match.
- Owner clearance before official signing copies: legacy Reservation No. field, payment deadlines, ambiguous referral labels, Grant wording and prices.
- Prior open items: doc 14 amendment, G3/G4 allowance questions, G5 process checks, live camera GSD demo, full-suite confirmation.

## 7. Verification State
- Run this session (before `12c7518` was seen): focused tests passed (11 across `print-data.test.ts` and `vip-print-pdf.test.ts`, plus 14 in `contract-detail-pages.test.tsx`), `npx tsc --noEmit` clean, ESLint on the changed files clean, `npm run build` completed (tail only checked).
- Browser QA: as above. Not performed: full test suite, visual check of every PDF page, Silver/Gold/Non-Standard browser runs.

## 8. Next Session Instructions
- Run `/load`, confirm HEAD, then rerun the focused print tests and `npx tsc --noEmit` against `12c7518`.
- Inspect `src/panels/admin/documents/`, `src/modules/contracts/print-data.ts`, and the plan file. Keep sample data only; never use real customer data.
- Dev server may already run on port 3000; sample sign-in accounts are in `src/data/mock/mock-credentials.ts`. A full page reload resets the in-memory data and signs out, so navigate by clicks.

## 9. Execution Recommendation
- Phase: QA. Recommended next mode: Default. Model: Sonnet 5.5, medium effort. Ultracode: OFF.
- Token optimization: targeted print tests first; one full-suite run only if asked.
- Reason: remaining work is regression checks against the new commit and a few browser variants.
<!-- SESSION_SNAPSHOT_END -->
