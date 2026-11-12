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
- Saved at: 2026-11-12
- Repository: afhomes-platform (remote `https://github.com/orlando-afhomes/afhomes-platform.git`, not re-checked)
- Branch: develop
- HEAD: 0512a31 "docs: add workflow atlas implementation roadmap and update-workflow-atlas skill" (verified)
- Session objective: finalize every conflicting business rule and process before any further frontend work and before the backend/DB/API phase. Run plain-language decision rounds with the owner, then write the answers into the rule documents.
- Development phase: frontend prototype with mock data. Business rules are now finalized (documentation). No `src/` change this session.
- Context note: very long session. Rounds R4 to R13 were collected in plan mode and then applied by subagents. The plan file `C:/Users/SSD-ORLANDO/.claude/plans/proceed-muna-tayo-sa-cozy-popcorn.md` lists every answer.

## 2. Current Project State
- The rule documents in `docs/business-rules/01` to `14` reflect the owner decisions of 2026-11-12. `14-igp-sales.md` is new. Each changed doc ends with dated "Owner rulings amendment (2026-11-12, ...)" sections.
- `docs/implementation/decisions-and-gaps.md`: all G01 to G12 and U01 to U13 rows are Decided, Deferred or Out of scope. It also has "Round results", "Follow-up decisions (items 1-30)" and "Still open" lists. Its "What each decision asks for" section is marked historical.
- The development docs (`architecture`, `backend`, `database`, `frontend`, `security`, `testing`, `README`), `docs/project.md` and the permission-matrix proposal have dated consistency notes.
- `AGENTS.md` section 5 summary bullets and the "Unresolved decisions" list were updated with owner authorization. No other part of `AGENTS.md` changed.
- Company sources are at `C:/Users/SSD-ORLANDO/Documents/AFHomes Document/Business Rules/` (reorganized during the session into `AFHomes/`, `JAD/` and `Shared/`). Text extracts were in the session scratchpad, which is temporary. Never read `Restricted Records`.

## 3. Important Decisions (owner, 2026-11-12)
- **Authority.** The company workbook wins by default. Signed contracts, privacy, legal and Finance controls win where stricter. Dated owner rulings outrank all. AUG and OCT count as approved company practice. The IST Clawback Addendum is a DRAFT and is not applied.
- **Roles.**
  - The Administrator can do everything. The Super Administrator has full control with no blocks, and only a Super Administrator can give or remove the Super Administrator role.
  - Self-approval is allowed and audited. A Clerk enters only; Admin acts as Supervisor; Director = Super Administrator.
  - Sellers only view: SVD, SSM and SM see their own and their team's records; OST sees only its own.
  - Page access means viewing; sensitive actions need operation permissions. HR activates staff accounts only. Finance sees all reports.
- **Numbering.**
  - One VIP Number (NUM v6.2) for the RA, Grant and Card, issued at RA signing, with a monthly sequence.
  - Validity starts on the Card Claim Date, or the first anniversary of full settlement if the card is not claimed.
  - Upgrades get a new number with a "Replaces" link (built later). Numbers are never reused.
- **Sellers.**
  - Expired sellers can still sell, with a reminder. Suspended or departed sellers cannot.
  - Renewal issues a new monthly AA number and moves the history to it.
  - A new seller is entered and approved in two steps.
  - A vacant seat earns nothing; its downline rolls up. No Acting SM. JA&D IDs are stored separately for IGP.
- **Customers.**
  - Closing seller plus an optional, possibly different, referrer.
  - A seller starts a customer draft, the Clerk completes it, and the Admin approves, returns or rejects it.
  - The public OST application is kept, with a fix-and-resend link. Home gets links to seller login and the seller check.
  - The Admin resets passwords. There is no public card lookup.
- **Payments.**
  - Clerk enters receipts. Finance, Admin or Super Admin approves them.
  - Reference numbers are unique system-wide. Returned receipts can be fixed and resent. Reversals are dated, never deleted.
  - Sellers may upload slip photos as proof only. Imported receipts count as approved, with one sign-off per batch.
- **Sales.**
  - A sale counts at 25% approved collection once the sale record is approved; contract finalization is not required for the count.
  - Month close is used. Sales unpaid for 90 days are listed and an Admin marks them Defaulted.
- **Commission.**
  - Per-person DSC and DRI rates, frozen on the sale. Only the seller and the referrer earn per sale; there is no override.
  - VIP is paid 100% at the month-end after 40% is collected. The 7-day wait is removed; it was not found in any company paper.
  - Pay survives the seller leaving.
  - BA, PA and PB are computed with a parallel run beside Excel. Team credit follows the current leader.
  - Clawbacks are recorded. Automatic recovery waits for the signed addendum. OST clawbacks are collected directly.
- **Non-Standard.** Price and schedule only. The Admin approves, then Finance confirms; only the Super Admin may do both. No price floor. Commission on the actual TCP.
- **Silver** is PHP 240,000. Move A and Move B take effect 2026-11-09.
- **Points.**
  - The signed Grant Annual Welcome Gift applies; Spend-to-Earn is removed.
  - The Points Activation Date is the earlier of the first actual stay using points or two years after card claim.
  - Bills are entered by office staff with a receipt number and approved like receipts.
  - A refund delays a tranche that has not been released. The supplementary holder's spend counts. A tranche due during a Hold waits.
  - A failed Year 1 spend means tranche 1 is not released.
  - The Admin may approve a waiver.
- **Redemption (doc 10, still disabled).**
  - Room stays only. Weekday and weekend points are kept separate.
  - The Admin keeps the points-per-night table, versioned and fixed per card at its Card Claim Date. The Admin keeps a holiday calendar.
  - Front-desk and office staff book with no extra approval. The card must be claimed first.
  - Cancelling before the cut-off returns the points; a late cancel or no-show forfeits them.
  - Points plus cash, split by whole nights.
  - On transfer, the old holder's points are lost and their bookings cancelled. Heirs go through the transfer process.
- **IGP (doc 14).**
  - In scope and built together with VIP, for the AFhomes channel only.
  - 16-character Series Number. Closed Deal at 10%. 40% of commission at 40% collected, the rest at full payment.
  - Sellers need a JA&D ID. A TCP over PHP 9M is blocked. Refunds are decided outside the system.
  - Re-numbering moves the payments to the new number. Basic unit fields only. Documents are tracked as a checklist.
- **Records.** Kept forever until legal advice. History import with a parallel run. CMS deferred.

## 4. Completed Work
- All decision rounds were applied to the docs listed in section 5.
- Memory files added: `plain-language-questions.md`, plus its MEMORY.md line.
- Verification: `git diff --check` passed. A grep sweep for superseded terms (Spend-to-Earn, Finance-Assigned, manually assign, Public Customer Lookup, RA No., sole authority, Move B1) found no live statements; the remaining hits are historical or marked superseded. `src/` is unchanged.

## 5. Git Working Tree
- Staged: none.
- Modified, this session: `AGENTS.md`; `docs/business-rules/01` to `13`; `docs/development/{README,architecture,backend,database,frontend,security,testing,role-module-permission-matrix-proposal}.md`; `docs/project.md`; `docs/implementation/decisions-and-gaps.md`; `phase-03`, `phase-11`.
- Modified, origin unknown (small edits found at save time, not made by the main session; possibly subagent consistency edits or the owner): `docs/implementation/README.md`; `phase-01`, `02`, `04` to `10`.
- Not from this session: `.gitignore` modified; `docs/ui-design-referrence/login-referrence.jpg` deleted. Ask the owner.
- Untracked: `docs/business-rules/14-igp-sales.md` (this session).
- Ignored: `workflow/save-session.md` (this snapshot).
- Stash: `stash@{0}` "local: sales-network cleanup + member detail redesign" is still kept.

## 6. Pending Tasks
- Still open, outside the team's control:
  - IGP VIP grant benefit terms (company document needed).
  - IGP band code for a TCP over PHP 9M.
  - Signing of the IST Clawback Addendum.
  - The points-per-night table (an Admin fills it in).
  - A legal records retention period.
  - JA&D SUPERSEDED status meaning.
- Run `/update-workflow-atlas`. The atlas baseline `a0bdcef` is badly outdated against these decisions.
- Build the frontend alignment backlog. Areas to change:
  - `src/modules/stay-points/engine.ts` (replace with the Welcome Gift model)
  - `src/modules/commissions/rules.ts` (per-person rates, month-end release, no 7-day wait)
  - `src/modules/membership/rules.ts` and `contract-repository.ts` (VIP Number at RA signing, monthly sequence, no RA reuse)
  - `payment-repository.ts:158` (self-approval) and `payment-actions.tsx` (resend)
  - `customer-form-sections.tsx` (closing seller plus referrer)
  - `mock-credentials.ts` (status rules)
  - `permissions.ts` (Clerk role, view-only sellers)
  - accreditation numbering (monthly)
  - IGP module
  - 25% sale count
  Each item needs owner authorization.
- Earlier failing tests were not investigated: `business-pages.test.tsx`, `pagination.test.tsx`, `dashboard-page.test.tsx`. Many tests will need updating once the code is aligned.

## 7. Verification State
- Tests, lint, typecheck and build: not run (documentation-only session).
- Browser QA: not run.
- Doc checks: `git diff --check` passed; grep sweep clean of live stale statements.
- Checks not performed: link and ID check of `docs/implementation`; independent review of the subagent-written docs (08, 09, 10, 14 are large rewrites and worth an owner read).

## 8. Next Session Instructions
- Recommended first action: `/load`. Ask the owner about the `.gitignore` change and the deleted jpg. Then run `/update-workflow-atlas`, or create the frontend alignment backlog.
- Relevant files: `docs/implementation/decisions-and-gaps.md`, `docs/business-rules/06`, `08`, `09`, `10`, `14`, and the plan file above.
- Required approvals: every code change (one feature per task), any `AGENTS.md` edit, commits (owner only), building Redemption or IGP.
- Warnings:
  - Ask the owner questions in plain, non-technical language (memory).
  - The atlas is out of Git, so back it up before editing.
  - Do not delete `.next`.
  - Mock data resets on refresh.

## 9. Execution Recommendation
- Phase: Plan (frontend alignment backlog) / Build (atlas refresh)
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5 for the atlas refresh and the backlog; Opus 5.5 for commission and points code changes
- Effort: medium; high for money and points code
- Ultracode: OFF
- Token optimization: start a fresh session; read only the doc sections a feature needs; one feature card per task
- Reason: the rules are settled, so the remaining work is scoped implementation, one area at a time.
<!-- SESSION_SNAPSHOT_END -->
