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
- Saved at: 2026-11-11
- Repository: afhomes-platform (remote `https://github.com/orlando-afhomes/afhomes-platform.git`)
- Branch: develop
- HEAD: acd6f95 "feat: expand customer onboarding, sales attribution, and shared form validation" (d3c0b18 and d302dc7 are its parents). Verified this run: nothing staged.
- Session objective: implement owner-approved customer-onboarding work — Gold pricing resolution, Step 2 payment-plan redesign, address/ZIP/PSGC integration, realtime field validation, government-ID rules, Sales attribution genealogy, Customer ID auto/manual, unified Edit Customer wizard, landline/TIN fixes, shared button restyle — verifying each and handing off for owner commit.
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion.
- Context note: no compaction notice. Most session work was committed by the owner as acd6f95; the remaining uncommitted set is a later workstream (see §5) that this session's visible context did not produce.

## 2. Current Project State
- Committed (acd6f95): customer onboarding wizard is the single New + Edit layout (`CustomerFormPage` renders `CustomerApplicationWizard` with optional `existing`); Sales attribution is genealogy-driven (`resolveAttributionChain`, `genealogyTeamOstIds`) with team-scoped OST options, labels `OST (Recommender)` / `OST (Referrer)`, and missing rungs filled from the recommender's chain; Customer ID is `YYYY-NNNN` automatic/manual (`modules/customers/customer-number.ts`), auto-allocated at submit only; address uses PSGC data with province-first selects and a derived, disabled ZIP; landline validation is area-code aware (8 digits for 02, 7 otherwise); TIN display width is 15 so 12-digit TINs fit; government IDs are uppercase-only with per-type rules; the wizard persists in-progress form state to `sessionStorage` and restores it on refresh.
- Shared UI: `outline` button variant is a brand-soft fill with hairline border and a visible hover; `PaymentOptionGrid` renders scheme/classification cards; `SectionBlock` header uses a rounded primary-tinted chip.
- Data: `src/shared/data/philippine-locations.ts` + generated `psgc-data.generated.ts` cover 1,634 cities (100% principal ZIP) and 84 provinces (100% area code); generator script `scripts/generate-psgc.mjs`.
- Docs amended: 04 (TIN inventory/sensitivity, secondary holder §7.3.1, office-address shape), 05 (item 11 Gold pricing, item 12 Move schemes), 06 (item 3 Move payment codes).

## 3. Important Decisions
- Owner rulings implemented: Gold pricing finalized (Spot/Move A 312,000; Installment/Move B 390,000; 780,000 rejected); Move A/B are standard schemes with Card ID codes Spot C01, Installment/Move A T04, Move B B1 T04 / S1 T08 / G1 T12; government IDs uppercase-only with National ID 12/16 numeric; landline length follows the auto-filled area code; Customer ID format `YYYY-NNNN` with automatic assignment at submit.
- UI decisions: reuse one shared `Button` variant rather than per-call-site classes; PaymentOptionGrid created because RadioCardGroup could not express the reference layout; ZIP always disabled/derived with a "Principal ZIP" hint.
- Persistence decision: only the in-progress wizard draft is stored in `sessionStorage` (key `afhomes.customer-wizard.v1`), never mock business records; it is cleared after a successful submit and on test setup.
- Restrictions: mock records stay in browser memory (seed restores on refresh); agents perform no Git writes; AGENTS.md/CLAUDE.md edits need owner authorization.

## 4. Completed Work
- Implemented and verified this session: Gold price-conflict resolution + doc rulings; Step 2 payment-plan redesign (PaymentOptionGrid, scheme pills, Move notice, classification cards); field height unification (h-11) and unique gender/civil-status icons; customer form new fields (citizenship, age, TIN, landline, occupation/business, office address) plus Gold secondary-holder toggle with full mirror; subdivision removal; PSGC address data with province-first dependency and derived ZIP; realtime blur validation; uppercase government-ID input and per-type validation (UMID + Digital National ID added); Sales attribution genealogy chain, team scoping, chain fill; Customer ID auto/manual; Edit Customer unified to the wizard; landline area-code rules; TIN width fix; Review submit silent-failure fix; wizard refresh persistence; button restyle; customers table "Full record" column removed; Customer step order Personal → Address → Contact → Government ID → Employment.
- Verification per workstream: focused vitest suites green (final customer suites 80/80 business-pages, 135 TIN/validation, 111 landline/validation), `tsc` clean, `lint` 0 errors (1 pre-existing `genealogy.ts` warning), `build` success, browser checks for button styling, refresh persistence, row click, and attribution chain.

## 5. Git Working Tree
- Staged: none.
- Unstaged tracked (11 files): `src/data/business-queries.ts`, `src/data/mock/business-effects.ts`, `src/data/mock/business-flow.test.ts`, `src/data/mock/contract-repository.ts`, `src/modules/contracts/rules.test.ts`, `src/modules/contracts/rules.ts`, `src/modules/vip/pricing.ts`, `src/modules/vip/rules.ts`, `src/panels/admin/components/scheme-card-content.ts`, `src/panels/admin/pages/customer-application-wizard.tsx`, `src/panels/admin/pages/scheme-guide-page.tsx` (185 insertions, 100 deletions).
- Untracked: `src/modules/customers/application/register-customer.ts` (a `registerCustomer` application service over customer/contract/payment repositories).
- Attribution: **not produced by this session's visible context.** The diff introduces `paymentSchemeTierTerms` (per-tier scheme terms replacing `schemePriceCentavos`/`installmentCountFor` in `buildSchedule`) and the registration service. Treat as a later/parallel workstream; do not revert.
- Deleted or renamed: none pending.

## 6. Pending Tasks
- Owner review/commit of the uncommitted per-tier scheme-terms + registration-service workstream (§5).
- Open owner decisions carried over: Move A/B Card ID mapping (now ruled — verify implementation matches), Move B down-payment due date, required initial payment per scheme, overpayment/refund timing, Welcome Gift lapse, template authority, commission default rates.
- Doc follow-ups: doc 04 §7.8 still says Referrer and VIP Recommender must be the same OST, while the implemented flow allows two (same-team) OSTs; doc 04 still records the Customer ID format as pending decision D2.
- Optional: identity switcher for restricted-role QA; screen-reader audit; production-build browser pass.
- No blockers.

## 7. Verification State
- This save run: `npx tsc --noEmit` clean. Full `npx vitest run`, `lint`, and `build` were NOT run during the save.
- Last verified in-session: `business-pages` 80/80, customer/validation suites 111/111 and 135/135, attribution 20/20 + 10/10 UI; `lint` 0 errors with 1 pre-existing warning; `build` succeeded; browser checks passed for the button, refresh persistence, row-click navigation, and the Ana/Mark attribution chain.
- Known flake: heavy jsdom suites (`business-pages`, `staff-page`) hit 15s timeouts under parallel load and pass in isolation.
- Not performed: restricted-role browser QA, manual screen-reader audit, production-build browser pass.

## 8. Next Session Instructions
- Recommended first action: `/load`, then `git status --short` to see the uncommitted scheme-terms/registration workstream, and confirm with the owner whether to continue it or start elsewhere.
- Relevant files: `src/panels/admin/pages/customer-application-wizard.tsx`, `src/panels/admin/components/customer-form-sections.tsx`, `src/modules/customers/customer-number.ts`, `src/modules/customers/field-validation.ts`, `src/modules/sales-network/genealogy.ts`, `src/shared/data/philippine-locations.ts`, `src/shared/ui/button.tsx`, `src/shared/forms/modern/structured-fields.tsx`, `src/modules/vip/rules.ts` (`paymentSchemeTierTerms`).
- Required approvals: any commit or push (owner only), AGENTS.md/CLAUDE.md edits, new dependencies, doc-04 amendments for the two flagged inconsistencies.
- Warnings: do not run build and tests together; do not delete `.next`; a full page load resets mock data to seed (wizard draft is the only sessionStorage exception); line-ending warnings (LF→CRLF) are expected on Windows.

## 9. Execution Recommendation
- Phase: QA
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: medium
- Ultracode: OFF
- Token optimization: one targeted test run + one build + one browser pass per task; run the full suite only when shared code changes.
- Reason: the committed state is verified; the working tree holds an unreviewed workstream that needs owner direction before more changes.

<!-- SESSION_SNAPSHOT_END -->
