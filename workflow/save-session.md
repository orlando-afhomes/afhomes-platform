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
- Saved at: 2026-11-15
- Repository: afhomes-platform (remote not re-checked)
- Branch: develop
- HEAD: a50ba7e "feat: restructure admin navigation into area pages and extend commissions, finance, and notifications" (verified this run). It is the owner's commit of 2026-11-15 14:06 (217 files). It was made after `/load` (HEAD was bc9a693 then) and before this session's agents edited code. Whether it is pushed was not checked.
- Session objective: the owner marked 26 UI problems in 27 screenshots (`docs/ui-redesign/Screenshot 2026-11-15 *.png`). This session planned and built all 26 with 18 parallel subagents in waves, plus read-only sweeps.
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion.
- Context note: model switched Opus 5.5 (plan mode) then Sonnet 5.5 (owner, /model). Subagents ran on Sonnet 5.5 (inherited, not escalated). Plan file: `C:\Users\SSD-ORLANDO\.claude\plans\1-docs-ui-redesign-screenshot-2026-11-15-peaceful-gizmo.md`. The agent briefs lived in this session's scratchpad and may be gone. The owner wants every reply in "explain like I am 5" language (memory `plain-language-questions.md`) and the nickname Dos first.
- Context was not compacted. A few finished agents kept re-sending reports because of background test runs they had started; three were stopped with TaskStop (Customers, VIP Products, Sales). No work was lost.

## 2. Current Project State
- All 26 screenshot items are implemented in code (not browser-verified). Summary:
  - Buttons: new variants in `src/shared/ui/button.tsx` (`success`, `warning`, `info`; `destructive`/`danger` now solid red; `outline` neutral white). Applied by purpose to every page, row-menu item and confirm pop-up.
  - Tables: whole-row hover and `onRowOpen` in `src/shared/components/modern/data-table.tsx`; empty cells render "—" automatically; no underlined links; "View full details" and the `onView` option removed everywhere (including `RowActionsMenu`); full-details pages show actions once in the header (no duplicate "..." menu).
  - Shared pieces: `src/shared/lib/empty-value.ts` (`EMPTY`, `displayValue`), redesigned `record-details-sheet.tsx`, repaired `filter-bar.tsx`, new `date-range-fields.tsx`, `FormDialog` `size`/`submitVariant`, confirm dialogs accept a `tone`.
  - Page actions lifted to the page heading through each area page's `actions` (organization, sales-network, sales/IGP, finance, commissions).
  - Pages redesigned: customers export preview, audit logs (searchable Actor, one value per column), reports (From/To dates, single Export menu, new Summary), reconciliation (one table + sheet), month-end close, allowances (3-step form), payment scheme dialog, scheme guide, tier codes, Stay Points Welcome Gift flow, Points table ("From <date>"), venues ("Coming soon").
  - Admin-managed data: VIP tier levels (`src/modules/vip/tier-levels.ts`, tier-level repository, "Tier levels" tab, product image/description/other benefits, product-code checks); IGP project and unit catalog (new "Projects" tab, `igp-projects-page.tsx`, catalog repository); JA&D number guided entry with live preview (`src/modules/igp/rules.ts`).
- Current focus: browser QA of everything above, then owner review and commit.

## 3. Important Decisions
Owner decisions of 2026-11-15 (recorded as UI5 to UI10 in `docs/implementation/decisions-and-gaps.md`, with amendments in docs 05 and 14 and a section in `docs/development/frontend.md`):
- UI5 button colors by purpose: dark green main action; green Approve/Confirm/Verify; red Reject/Cancel/Delete/Decline; amber Send back/Return/Adjust/Correct/Hold; blue Export/Download/Print/View; white Cancel/Close in pop-ups. Tokens unchanged (UI4).
- UI6 tables: no underlines, no "View full details", row opens the record, em dash for empty values, one value per column, details show every row value.
- UI7 page action buttons sit at the right of the page heading. UI8 plain wording (no "version"/technical labels; reports use From/To).
- UI9 VIP tier levels are admin-managed; product code stays one letter + one digit; reserved/historical codes (B2, S2, P1, R1, G2, P2, R2) cannot be used; VIP Number code segment unchanged.
- UI10 IGP: JA&D number is typed by staff (guided, never invented); IGP projects and units (owner on the unit) are admin-managed; a sale keeps a copy of the names; a unit change on an issued sale is still cancel and reissue.
- Owner Q&A answers this session: use the proposed color plan; JA&D = guided typing; IGP catalog = Project then Unit with owner on the unit; venue "Not open yet" becomes "Coming soon".
- Older owner answers A1 to A8 (2026-11-12) still binding (see the decisions page). Still true: only the owner commits or pushes; mock login must be removed when real auth lands; SweetAlert2 only through `AppAlert`/`useConfirmRun`; mock data in browser memory only; no new dependencies.

## 4. Completed Work
- Wave 1 (shared): button variants and menu tones; DataTable hover/empty value/`empty-value.ts`; `RecordDetailsSheet`; `FilterBar` + `DateRangeFields`.
- Wave 2 (nine area agents): Customers, Sales/contracts/IGP screens, Finance, Commissions, Sales Network + Organization, Reports + Audit, VIP Products, Redemption, Stay Points/Membership/Promos.
- Wave 3: VIP tier CMS + product image; IGP catalog + JA&D entry; docs (decisions, docs 05 and 14, frontend.md).
- Cleanup passes: shared dialog tones, `onView` removal, audit entity types (`igp-project`, `igp-unit`, `tier-level` labels), dashboards pass products to `toActivityEntries`, plan-card fallback for new tiers (`customer-plan-summary.tsx`, `vip-card-choice.tsx`), leftover words to "—", plain wording, stale tests updated.
- A read-only sweep before the last fix pass found 0 table underlines, 0 tables over 5 columns, 0 two-value columns, 0 actions below tabs; its 17 word placeholders and 8 technical-wording hits were fixed.
- Actual verification: see section 7.

## 5. Git Working Tree
- Staged: none (verified).
- Unstaged: 164 modified files (verified; `git diff --stat`: 164 files, 3538 insertions, 1544 deletions). By area: `src/panels/admin` 121, `src/shared/components` 12, `src/data/mock` 10, `src/modules/vip` 4, `src/modules/igp` 3, `src/data/contracts` 3, `src/shared/ui` 2, `src/modules/customers` 2, `src/shared/lib` 1, `src/modules/audit` 1, `src/data/queries.ts` 1, and 4 docs (`docs/implementation/decisions-and-gaps.md`, `docs/business-rules/05-...md`, `docs/business-rules/14-igp-sales.md`, `docs/development/frontend.md`). Git only warns about LF to CRLF.
- Untracked: 21 files (verified): `src/data/contracts/{igp-catalog-repository,tier-level-repository}.ts`, `src/data/igp-catalog-queries.ts`, `src/data/tier-level-queries.ts`, `src/data/mock/{igp-catalog-repository,tier-level-repository}.ts` and their tests, `src/modules/vip/tier-levels.ts` + test, `src/panels/admin/pages/igp-projects-page.tsx`, `src/shared/components/modern/date-range-fields.tsx` + test, `src/shared/lib/empty-value.ts` + test, and new tests (`audit-logs-page.test.tsx`, `confirm-tones.test.tsx`, `commissions-pages.test.tsx`, `record-details-sheet.test.tsx`, `row-actions-menu.test.tsx`, `button-variants.test.tsx`).
- Deleted or renamed: none (verified). Stash `stash@{0}` "local: sales-network cleanup + member detail redesign" is still kept.
- Origin: all 164 + 21 are this session's agent edits on top of the owner's commit a50ba7e (inferred from commit time 14:06, before the agents started). The owner has not reviewed them.

## 6. Pending Tasks
- Browser QA of every screenshot URL (desktop and phone width). Not done.
- Owner decisions: (a) success green (`#3f7d4e`) may look too close to the dark-green primary; changing it needs approval (UI4); (b) Welcome Gift status "Non-Activated" is shown as "Not earned" in gray, confirm wording; (c) agent-added buttons "Make unavailable/available" (products) and "Delete project" (IGP): keep or remove; (d) should text-only product edits (description/image) bump the configuration version; (e) may a product's tier level be changed on edit (now allowed, active levels only); (f) allowance withholding switch with an empty reason now shows an error (before: silently "not withheld").
- Test speed: 9 tests timed out at the 15 s global limit in the full run (all pass when rerun with a longer timeout). Staff-page and wizard tests are near the limit. Raising `testTimeout` in `vitest.config.ts` or splitting them needs the owner's OK.
- Not done by choice: Reports Summary trend chart (existing chart needs daily series); dashboard card "View all" links still underline on hover; dashboard date filter still has "Past 28 Days"; `UI3` text still says extra values go to "View full details" (UI6 notes it refines UI3); `frontend.md` has two sections numbered 41 (pre-existing).
- Owner to review and commit the uncommitted files (owner only).
- Carried over from the previous snapshot, not rechecked: whether `AGENTS.md`/docs still say Redemption is disabled and IGP is not built; D-B (stamp the 40% month by receipt date, doc 13 OCT O3); overpayment/refund timing (phase-07 F7.1); doc 08 "R8 items 3-6" citations and doc 07 section 18 title; Workflow Atlas not updated (`/update-workflow-atlas`).
- Open outside the team: signed IST Clawback Addendum, IGP grant terms and band code above PHP 9M, points-per-night table, legal retention period.

## 7. Verification State
- Typecheck: `npx tsc --noEmit` on the whole project: clean (exit 0), run this session after the last edit.
- Lint: `npm run lint`: clean.
- Tests: full `npx vitest run`: 156 files, 1735 tests, 1726 passed, 9 failed, all timeouts at 15 s. Reruns alone: `payment-reference-fields.test.tsx` passed; `business-pages.test.tsx` "Step N of 6" and the Bronze/Silver pricing tests passed; the two Gold pricing tests passed in 6 to 8 s with `--testTimeout=90000`; `staff-page.test.tsx` 20 of 20 passed with `--testTimeout=90000` (one different test timed out at 15 s when run alone). So all 9 are accounted for as load/timeouts, not logic.
- Build (`npm run build`): not performed.
- Browser QA: not performed. The agents never ran the app either.
- Known failures: none known beyond the timeout flakiness above.
- Checks not performed: build, browser/visual check, accessibility audit of the new screens, full `business-pages.test.tsx` as one isolated run.

## 8. Next Session Instructions
- Recommended first action: `/load`, then browser QA with agent-browser on the dev server (may already run on port 3000) over the screenshot URLs, desktop and phone width, reporting problems without editing; check the "success" green, the staff toolbar, header buttons, the new dialogs, tier levels, Projects tab and the Welcome Gift flow.
- Relevant files: `docs/implementation/decisions-and-gaps.md` (UI5 to UI10), `src/shared/ui/button.tsx`, `src/shared/components/modern/{data-table,record-details-sheet,filter-bar,date-range-fields,row-actions-menu,form-dialog}.tsx`, `src/shared/lib/empty-value.ts`, `src/panels/admin/pages/{stay-points-page,igp-projects-page,tier-codes-page,reconciliation-page,allowance-review-page}.tsx`, `src/modules/vip/tier-levels.ts`, `src/modules/igp/rules.ts`.
- Required approvals: any commit or push (owner only), changing a brand color token, raising the test timeout, removing or keeping the agent-added buttons, any new feature, real authentication, `AGENTS.md` edits.
- Warnings: do not run build and tests together; do not delete `.next`; do not revert the uncommitted files; mock data resets on refresh; subagents that start background test runs can re-send reports, so stop them with TaskStop when finished; never claim visual verification without a browser run.

## 9. Execution Recommendation
- Phase: QA
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: medium
- Ultracode: OFF
- Token optimization: one browser pass with agent-browser over the screenshot URLs, report only problems, then targeted fixes; do not re-read the docs or re-run the full suite until fixes are made.
- Reason: the code checks are clean, so the remaining risk is how the pages actually look.
<!-- SESSION_SNAPSHOT_END -->
