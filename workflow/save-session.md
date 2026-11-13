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
- Saved at: 2026-11-13
- Repository: afhomes-platform, remote `https://github.com/orlando-afhomes/afhomes-platform.git` (verified with `git remote -v` earlier this session)
- Branch: develop
- HEAD: d7a6ca5 (verified at save time). Commit `d7a6ca5` was pushed to `origin/develop` this session with the owner's explicit permission ("do the git add . && git commit && git push", one time only). Everything built after it is uncommitted.
- Session objective: (1) `/load`; (2) commit and push the previous session's work (owner permission); (3) create the plan to finish the whole frontend prototype before any backend, database or API work; (4) build milestones M1 to M4, M9 and M10 with parallel subagents.
- Development phase: frontend prototype with mock data, build stage. Only the owner declares the frontend complete. No backend work is authorized.
- Context note: model switched by the owner between Sonnet 5.5 and Opus 5.5 several times. Plan was made on Opus 5.5 in plan mode, then approved; the build agents ran on Sonnet 5.5. Owner wants every reply in "explain like I am 5" language (memory `plain-language-questions.md`) and each reply starts with "Dos".
- Plan file (outside the repo): `C:\Users\SSD-ORLANDO\.claude\plans\read-the-docs-claude-md-replicated-cloud.md` (milestones M1 to M11, inputs Dos must supply).

## 2. Current Project State
- Audit this session (3 read-only agents) found much of the code still followed pre-2026-11-12 rules. Remaining prototype work is milestones M5 to M8 and M11 (see section 6).
- Built this session (uncommitted, see section 4): error and status pages, sign-in return flow, Clerk role and permission rework, payment fix-and-resend, unique receipt references, accreditation expiry/renewal/alias history, vacant seats, public OST application and office review queue, customer approval flow and attribution, Redemption (with sample points table), reconciliation and historical receipt import.
- Not touched yet: sale counting (25%), month close, VIP Number issuance and Card Claim Date, commissions (rates, payout list, clawback, allowances), stay-points engine rewrite (still Spend-to-Earn), card servicing, IGP module, report updates.

## 3. Important Decisions
- Owner answers this session: Redemption IS included in the prototype (Admin-editable points-per-night table with clearly marked SAMPLE rows); the 40% commission month uses the receipt date (doc 13 section 4.3 to 4.4, settles D-B); custom error pages for 400, 401, 403, 404, 500 and all error or warning states; a signed-out user returns to the requested page after sign-in; build order: M1 to M4, M9, M10 on Sonnet 5.5 (medium, M4 high), then M5 to M8 on Opus 5.5 (high).
- Permission model now: `clerk` role exists; `customers.draft` (own draft only) for sellers; `customers.manage` (complete, submit) for Clerk, Admin, Super Admin; `customers.approve` for Admin and Super Admin; Administrator now holds `finance.verify`; sellers lost `payments.submit` and `contracts.prepare`.
- Owner answers A1 to A8 (2026-11-12) and R1 to R13 still stand. Redemption build is authorized by the owner on 2026-11-13, but `AGENTS.md`, `CLAUDE.md` and doc 10 still say it is disabled; only the owner can authorize edits to `AGENTS.md`.
- Git: only the owner commits or pushes. The one-time permission this session does not carry forward.

## 4. Completed Work
- M1a: `src/shared/components/status/` (StatusPage 400/401/403/404/500/notice), `src/app/error.tsx`, `global-error.tsx`, `src/app/status/[code]`, `not-found.tsx` restyled (`not-found.css` deleted), `src/shared/lib/safe-return-path.ts`, `admin-auth-gate.tsx` (401 view with `?next`), `login-form.tsx` (returns to `next`, passes the mock store to sign-in), `use-logout.ts` (sales go to `/login/sales`), `admin-page.tsx` uses the 403 view (heading still "Access restricted").
- M1b: Fix and resend dialog (`payment-actions.tsx`), required and system-unique receipt reference with suggested-match hint (`finance/rules.ts`, `payment-repository.ts`), public header and home links, My Account password note, audit for role delete and department create/update.
- M2: Clerk role, grants above, mock sign-in respects account status, Administrator "Set temporary password" (audited without the value), neutral forgot-password message, self-approved account activation flagged in audit, `ACCOUNT_UPDATED` audit.
- M4a: expired sellers eligible with a reminder on the sale, renewal from the expiry month with a new monthly AA number, AA Number History and alias lookup, public verify shows "expired", `vacancy.ts` with seat vacancy and roll-up functions and repository methods, UI badges.
- M4b: public OST application (`/register/ost`), private correction link (`/register/ost/correct/[token]`), admin queue `/admin/sales-network/registrations`, Clerk check then Administrator approve, return or reject; approval creates the OST and a Pending account.
- M3: customer statuses `approved`, `sent_back`, `rejected`; closing seller chosen explicitly, optional referrer, referral reference when the same person is both; wizard step in the URL (`?step=`) with Back, Forward and the Save/Discard/Stay prompt; four synthetic customers `cust-a5` to `cust-a8`.
- M9: `/admin/redemption` and `/admin/redemption/points-table`, `src/modules/redemption/`, versioned sample points table, booking, cancellation, forfeiture, `cancelFutureBookingsForTransfer`, `evaluateFirstRedemption`. No Services built (doc 10 defines none).
- M10: `/admin/reports/reconciliation` and `/admin/reports/historical-import` (receipts only), new operations `reconciliation.manage`, `history-import.manage`, `history-import.signoff`.
- Orchestrator edits: Clerk gets the `accreditation-registrations` module; login form and its test use the mock store; `admin-nav-match.test.ts` expects `redemption-group`; removed an unused variable in `genealogy.ts`.

## 5. Git Working Tree
- Staged: none. Stash: `stash@{0}` "local: sales-network cleanup + member detail redesign" still kept.
- Unstaged: 91 modified files (2,462 insertions, 682 deletions), all from this session's agents and edits. `src/app/not-found.css` is deleted. The docs under `docs/` are unchanged since commit `d7a6ca5`.
- Untracked (new this session): routes `src/app/admin/redemption/`, `admin/reports/historical-import/`, `admin/reports/reconciliation/`, `admin/sales-network/registrations/`, `src/app/error.tsx`, `global-error.tsx`, `register/ost/correct/`, `status/`; modules `src/modules/imports/`, `reconciliation/`, `redemption/`, `accreditation/registration.ts`, `customers/review.ts`, `sales-network/vacancy.ts`, `sales/accreditation-standing.ts`; data contracts, mock repositories and query files for redemption, reconciliation, history import; new admin pages and dialogs; `src/shared/components/status/`, `src/shared/lib/safe-return-path.ts`; about 20 new test files.
- Git warns that LF will become CRLF on the next Git touch.

## 6. Pending Tasks
- Owner review and commit of the uncommitted work (owner only).
- M5 (Opus, high): 25% sale count and Administrator sale approval, Closed Deal / 40% / fully paid states, Defaulted and 90-day list, receipt-date stamping (D-B), minimal month close, one VIP Number issued when the signed RA is recorded (monthly allocator, no hand-typed RA number), Card Claim Date and validity, exception queue (F6.5).
- M6 (Opus): per-person DSC and DRI rates frozen on the sale, payout list with preparer self-approval flag (A3), release policy, held-commission void or confirm, F7.4 rebased on the 25% rule, default/cure/late admission, clawback ledger (no automatic deduction until the addendum is signed), BA/PA/PB allowances (needs the owner's workbook).
- M7 (Opus): rewrite the stay-points engine to the Annual Welcome Gift tranches, remove the Points Hold code, resort spend entry, refunds and Compassionate Waiver, card servicing (calls `cancelFutureBookingsForTransfer`). Redemption reads points only through `src/data/mock/redemption-points-source.ts`; update that one file when tranches land.
- M8 (Opus): IGP module (doc 14 five-step sequence).
- M10 rest: F11.4 period close, report updates to the new rules (after M5).
- M11: full QA, browser walkthrough of J01 to J12 for every role, update phase card statuses and `decisions-and-gaps.md`, `/update-workflow-atlas`. Not yet done: phase card status lines in `docs/implementation/` were not updated for the built features.
- Open owner questions (unanswered): update `AGENTS.md`/`CLAUDE.md`/doc 10 for Redemption; cancellation exactly at the cut-off (in time or late); points reserved at creation or on confirmation for cash-pending bookings; front-desk role for booking; who may prepare and self sign off an import batch; back-dated renewal and renewal of a rights-suspended record; rejected receipts keep their reference number; explicit "sent to Clerk" status for seller drafts; move AA issuance to the monthly sequence; seed accreditations for SVD, SSM, SM are `pending` (cannot be picked as sellers) and the only seeded card holder `memb-1` is on a financial hold.
- Open outside the team: signed IST Clawback Addendum, IGP grant terms and band code above PHP 9M, real points-per-night table, legal retention period, workbook figures for F8.6 and F11.3, overpayment and refund timing (F7.1).

## 7. Verification State
- Typecheck: `npx tsc --noEmit` clean after the last edit.
- Lint: `npx eslint src` clean (0 errors, 0 warnings) after removing the unused variable.
- Tests: `src/modules`, `src/data`, `src/panels/admin/components`, `src/panels/public`: 59 files, 768 tests passed. `src/panels/admin` (rest), `src/shared`, `src/app`: 624 passed, 7 failed with the 15-second default timeout (wizard and staff-page tests under load); all of those files passed when rerun with `--testTimeout=60000` (staff-page and payment-reference-fields 24 of 24; the business-pages "scheme pricing" tests 9 of 9). `admin-nav-match.test.ts` was fixed after that run and its single file was not rerun after the one-line edit.
- Build: not run. Full suite in one run: not run.
- Browser QA: NOT done. The dev server started on port 3001 and exited with code 1, and the browser pane refused the page load (pane hidden). None of the new screens has been seen in a browser.
- Not verified: the 401 page flash on logout, the `global-error.tsx` CSS, wizard Back-button behavior in the real Next router, new screens for each role.

## 8. Next Session Instructions
- Recommended first action: `/load`, then answer the open owner questions in section 6, do the browser check (show the browser pane; port 3000 may already be in use), then authorize M5 to M8 on Opus 5.5 (high). Review and commit the current work first if the owner wants a safe checkpoint.
- Relevant files: the plan file above, `docs/implementation/decisions-and-gaps.md`, `src/modules/identity/permissions.ts`, `src/data/mock/payment-repository.ts`, `src/data/mock/business-effects.ts`, `src/modules/commissions/rules.ts`, `src/modules/membership/rules.ts`, `src/modules/stay-points/engine.ts`, `src/data/mock/redemption-points-source.ts`.
- Required approvals: any commit or push, each milestone start, edits to `AGENTS.md`, any backend or real authentication.
- Warnings: shared files (`src/data/queries.ts`, `seed.ts`, `seed-data.ts`, `permissions.ts`, `navigation.ts`) were edited by several agents; parallel agents need strict file ownership and targeted edits. Do not run build and tests together; do not delete `.next`; mock data resets on a full page reload; mock sign-in details are in `src/data/mock/mock-credentials.ts` (Clerk: `clerk@afhomes.test`).

## 9. Execution Recommendation
- Phase: Build (M5 to M8 next), then QA
- Recommended next mode: default (ask before edits)
- Recommended model: Opus 5.5
- Effort: high
- Ultracode: OFF
- Token optimization: one milestone per agent wave with strict file ownership, targeted tests only, `/save` after each wave.
- Reason: M5 to M8 change money, numbering and points rules, which carry the highest rework risk.
<!-- SESSION_SNAPSHOT_END -->
