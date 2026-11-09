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
- Saved at: 2026-11-09
- Repository: afhomes-platform (remote `https://github.com/orlando-afhomes/afhomes-platform.git`)
- Branch: develop
- HEAD: 6e1e031; nothing staged (`git diff --cached` empty); 252 status entries, 86 untracked (HEAD and counts unchanged by this session's work)
- Session objective: /load, final QA and business-rule reconciliation review (read-only, 8-agent workflow), then C1 integrity corrections, then C2 owner-decided restrictions.
- Development phase: frontend prototype with mock data; P0-P12 implemented; C1 and C2 done; comprehensive QA and further decisions pending. Only the owner declares frontend completion.
- Context note: model switched Sonnet to Opus to Sonnet by the user; Ultracode OFF for builds. The plan file `C:\Users\SSD-ORLANDO\.claude\plans\pasted-content-id-5072-afhomes-agile-sky.md` now holds the C2 plan; the earlier review register was overwritten, so its open items are summarized in section 6.

## 2. Current Project State
- Verified: C1 and C2 changes are in the working tree; `tsc` clean, lint 0 errors (2 old warnings), build succeeds, full vitest 528/530 (only the known flaky staff-page test failed under load; 20/20 alone).
- Central seed `data/database/afhomes-seed.js`; business repositories in `src/data/mock/`; domain rules in `src/modules/*`; admin pages in `src/panels/admin/pages/`.
- New this session: `src/modules/commissions/rules.ts` (40% payout release), contract cancellation types (`CANCELLATION_GROUNDS`, `ContractCancellation`), `ownerHold` on payment schemes, audit actions CONTRACT_CANCELLATION_REQUESTED/DECLINED, SALE_CANCELLED, PAYMENTS_FORFEITED, MEMBERSHIP_CANCELLED, `holdUnpaidCommissions` in `business-effects.ts`.

## 3. Important Decisions
- Owner rulings (2026-11-09): OD-1 Super Admin keeps Finance operations (counts as authorized Finance personnel; docs 07/08 to be amended in P13). OD-2 cancellation with forfeiture on Reservation Agreement grounds, two-step (Admin requests, Finance confirms, requester cannot decide). OD-4 adopt the AFhomes 40% stage-1 payout threshold (recording a payout needs 40% of contract value Finance-verified). OD-11 Spot Cash unavailable (price pending; owner hold). OD-12 reservation fee non-refundable (reversal allowed).
- Earlier interim choices still need confirmation: sale confirms at reservation + first installment (D25); Admin/Super Admin activate memberships; manual RA number; public verification omits holder name; Gold held on 390,000 vs 780,000; Move A/B1/B2 unusable; Non-Standard held; overpayments rejected; no fractional commissions.
- Source classification: A1/A3/A5/B1/B3/B5/B7 are JA&D; C2 header covers both companies; A2/A4/A6/A7 are AFhomes workbook material not adopted into canon except as ruled; Closed Deal (25%) and BA/PA/PB are engagement statistics, not sales commissions; DRI goes to the recruiting referrer.
- Restrictions: no Git writes by agents; AGENTS.md, CLAUDE.md and docs edits need owner authorization (P13 not done).

## 4. Completed Work
- Review: 8-agent read-only review produced the decision register, blockers and QA plan (full text no longer saved; see section 6).
- C1 (tested in `business-flow.test.ts`): payout steps re-check Confirmed sale; initiated unconfirmed payouts preserved, flagged and not cancellable; no payment verification on cancelled contracts; no verification by the person who corrected a returned payment; RA must be exactly 4 digits, finalized contract only, previous/new RA audited; public `/verify` checks expiry for IST and OST and current record only; blocked linked accounts lose business authority (`business-base.ts`); finalize and Customer ID audit before/after fixed; `public.css` imported on `/verify` and `/register/ost`.
- C2: reservation refund blocked (repository and dialog); Spot Cash seed set pending/unavailable with `ownerHold`; 40% payout gate; two-step cancellation (repository, hooks, contract page, Finance "Cancellation requests" tab). 7 new tests (6 in business-flow, 1 in business-pages); 3 payout tests now verify installment MA2 first; one C1 test sets the sale status directly.
- Files touched: contract, payment, commission, product, customer and accreditation repositories; business-base; business-effects; contract-detail, finance and commissions pages; payment-actions; permissions comments; seed; contract, audit and vip types; business-queries.

## 5. Git Working Tree
- Staged: none.
- Unstaged and untracked: 252 entries (86 untracked) mixing earlier sessions (Ant Design removal, P0-P12) and this session's C1/C2 edits; origin not separated per file.
- Deleted files in the tree come from the earlier Ant Design removal, not this session.
- Unfinished work: none in progress.

## 6. Pending Tasks
- Owner decisions open: OD-5 activation role and second approver; OD-6 RA vs Customer ID; OD-7 RA scope and reuse after cancellation; OD-8 Card Claim vs Activation Date cutover and legacy IDs; OD-9 commission recipients, rates, aggregate cap, referrer; OD-10 engagement pay scope; OD-13 public verification fields and suspended-account wording; OD-14 `/register/ost` vs doc 02 section 4.2; OD-15 P10 Customer Lookup; OD-16 smaller items (Silver hold, rounding, overpayment, audit amount visibility, who corrects a returned payment, maker-checker); refund or waiver after forfeiture.
- Remaining work: C4 test hardening (staff-page 5000 ms timeouts, financial idempotency and audit-event assertions, identity x page matrix including dev-svd-b); C5 accessibility (TabBar ARIA, row keyboard access, dialog focus return, combobox size, loading role=status); returned-payment correction UI missing; paid-commission recovery flag; P13 doc reconciliation (Ant Design text, documentation-only claims, OD-1/2/4/11/12 rulings in docs 05/07/08) needs authorization.

## 7. Verification State
- Tests: full `npx vitest run` 528/530 (2 staff-page timeouts under load, 20/20 alone); business-flow 30/30; business-pages and seed-integrity 23/23.
- Lint: 0 errors, 2 pre-existing warnings. Typecheck: clean. Build: succeeded.
- Browser QA: not performed this session (only Super Admin was checked earlier). Not performed: role matrix, accessibility pass, mobile sheet, finance-to-activation chain in browser.
- Known failures: flaky staff-page test.

## 8. Next Session Instructions
- Recommended first action: run `/load`, get owner decisions on the open OD list, then do the browser QA pass (role matrix, financial chain including cancellation with forfeiture, public pages) and C4/C5 fixes.
- Relevant files: `src/data/mock/{contract,payment,commission,business-effects,business-base}.ts`, `src/modules/commissions/rules.ts`, `src/panels/admin/pages/{contract-detail,finance,commissions}-page.tsx`, `data/database/afhomes-seed.js`, `src/data/mock/business-flow.test.ts`.
- Required approvals: any new milestone, P13 doc edits, dependency changes, Git writes (owner only).
- Warnings: do not run build and tests concurrently; use `tw:` prefix; memoize DataTable columns; shell heredocs with apostrophes break (use Write tool); stop any `next start` server on port 3107; each UI test render creates its own mock store.

## 9. Execution Recommendation
- Phase: QA
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: high
- Ultracode: OFF
- Token optimization: one role-by-role browser pass, targeted tests per fix, one full-suite run at the end.
- Reason: remaining work is verification and small fixes once the owner decides the open items.
<!-- SESSION_SNAPSHOT_END -->
