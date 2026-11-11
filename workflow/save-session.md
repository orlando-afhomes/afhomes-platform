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
- HEAD: dcc53bc "feat: orchestrate customer registration and centralize contract cancellation effects" (acd6f95 and d3c0b18 are its parents). Verified this run: nothing staged.
- Session objective: provide owner-requested commit messages for successive batches (no agent Git writes), then save the current state. The uncommitted workstream visible at save time adds fixed-prefix mobile/landline entry and temporary Government ID image previews to the new-customer wizard.
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion.
- Context note: no compaction notice. Commit-message work covered acd6f95 and dcc53bc; the remaining uncommitted phone/ID-preview set appeared after dcc53bc and was not produced by this session's visible context.

## 2. Current Project State
- Committed (dcc53bc): `registerCustomer` application service + `useRegisterCustomer` orchestrates draft, customer submit, contract preparation, and reservation submission with typed outcomes; `CustomerApplicationWizard` now uses it. `cancelRelatedContractRecords` centralizes cancellation side effects (sale cancellation, forfeiture reversal, commission holds, membership cancellation, audits) for both contract-cancel paths. `paymentSchemeTierTerms` centralizes per-tier price/reservation/count/installment terms used by `buildSchedule`, scheme cards, and the scheme guide.
- Earlier committed (acd6f95): customer onboarding wizard is the single New + Edit layout (`CustomerFormPage` renders `CustomerApplicationWizard` with optional `existing`); Sales attribution is genealogy-driven (`resolveAttributionChain`, `genealogyTeamOstIds`) with team-scoped OST options, labels `OST (Recommender)` / `OST (Referrer)`, and missing rungs filled from the recommender's chain; Customer ID is `YYYY-NNNN` automatic/manual (`modules/customers/customer-number.ts`), auto-allocated at submit only; address uses PSGC data with province-first selects and a derived, disabled ZIP; government IDs are uppercase-only with per-type rules; the wizard persists in-progress form state to `sessionStorage`.
- Current uncommitted workstream: new-customer phone controls (fixed `09` mobile prefix; landline local digits with address-derived area code and length limit); temporary Government ID image preview for the primary and Gold secondary holder; `ProfilePhotoUploader` gains a document preview mode. Only new applications use the fixed-prefix/local-digit controls; edit mode keeps existing full-value inputs.
- Data/docs already committed: `src/shared/data/philippine-locations.ts` + generated `psgc-data.generated.ts` (1,634 cities, 84 provinces); docs 04 (TIN sensitivity, secondary holder §7.3.1, office-address shape), 05 (Gold pricing item 11, Move schemes item 12), 06 (Move payment codes item 3).

## 3. Important Decisions
- Owner rulings implemented earlier: Gold pricing finalized (Spot/Move A 312,000; Installment/Move B 390,000; 780,000 rejected); Move A/B are standard schemes with Card ID codes Spot C01, Installment/Move A T04, Move B B1 T04 / S1 T08 / G1 T12; government IDs uppercase-only with National ID 12/16 numeric; Customer ID format `YYYY-NNNN` with automatic assignment at submit.
- Phone UX decision (uncommitted): new applications show a fixed `09` mobile prefix and store the full `09XXXXXXXXX` value; landline shows the address-derived area code and accepts only local digits up to the area-code limit (8 for 02, 7 otherwise). Edit mode retains the previous full-value entry behavior.
- Government ID preview decision (uncommitted): previews are temporary object URLs only, never persisted to the customer record; cleared after save/submit, when leaving Gold, when the secondary toggle is off, and on `pagehide`/unmount.
- Wizard draft persistence remains the only `sessionStorage` use (key `afhomes.customer-wizard.v1`); mock business records stay in browser memory.
- Restrictions: agents perform no Git writes; AGENTS.md/CLAUDE.md edits need owner authorization.

## 4. Completed Work
- This session: generated commit messages for acd6f95 and dcc53bc; the owner performed both commits. No source changes were made by this session.
- Uncommitted workstream (not from this session's visible context): `masked-fields.tsx` fixed-prefix mobile and local-digit landline controls with paste/limit handling; `customer-id-image-preview.tsx` hook/component; `profile-photo-uploader.tsx` document mode; wizard and customer-form-sections integration; `customer-phone-fields.test.tsx` added; `business-pages.test.tsx` and `payment-reference-fields.test.tsx` updated.
- Verification: no tests, lint, typecheck, build, or browser QA were run during this save. The new phone tests and updated customer-page tests are unverified.

## 5. Git Working Tree
- Staged: none.
- Unstaged tracked (6 files): `src/panels/admin/business-pages.test.tsx`, `src/panels/admin/components/customer-form-sections.tsx`, `src/panels/admin/pages/customer-application-wizard.tsx`, `src/panels/admin/payment-reference-fields.test.tsx`, `src/shared/forms/modern/masked-fields.tsx`, `src/shared/forms/modern/profile-photo-uploader.tsx` (236 insertions, 54 deletions).
- Untracked: `src/panels/admin/components/customer-id-image-preview.tsx`, `src/shared/forms/modern/customer-phone-fields.test.tsx`.
- Attribution: **not produced by this session's visible context.** It is a later/parallel workstream; do not revert.
- Deleted or renamed: none pending.

## 6. Pending Tasks
- Verify and owner-commit the uncommitted phone/ID-preview workstream (§5).
- Open owner decisions carried over: Move B down-payment due date, required initial payment per scheme, overpayment/refund timing, Welcome Gift lapse, template authority, commission default rates.
- Doc follow-ups: doc 04 §7.8 still says Referrer and VIP Recommender must be the same OST while the implemented flow allows two (same-team) OSTs; doc 04 still records the Customer ID format as pending decision D2.
- Optional: identity switcher for restricted-role QA; screen-reader audit; production-build browser pass.
- No blockers.

## 7. Verification State
- This save run: no tests, lint, typecheck, build, or browser QA were run.
- Last verified state (before the current uncommitted workstream): `business-pages` 80/80, customer/validation suites 111/111 and 135/135, attribution 20/20 + 10/10 UI; `tsc` clean; `lint` 0 errors with 1 pre-existing warning; `build` succeeded; browser checks passed for button styling, refresh persistence, row-click navigation, and the Ana/Mark attribution chain.
- New phone/ID-preview tests have not been run.
- Known flake: heavy jsdom suites (`business-pages`, `staff-page`) hit 15s timeouts under parallel load and pass in isolation.
- Not performed: restricted-role browser QA, manual screen-reader audit, production-build browser pass.

## 8. Next Session Instructions
- Recommended first action: `/load`, then `git status --short`; run targeted tests for the uncommitted workstream (`customer-phone-fields.test.tsx`, `business-pages.test.tsx`, `payment-reference-fields.test.tsx`), then `npx tsc --noEmit`, `npm run lint`, and one build. Owner reviews/commits afterward.
- Relevant files: `src/shared/forms/modern/masked-fields.tsx`, `src/panels/admin/components/customer-id-image-preview.tsx`, `src/shared/forms/modern/profile-photo-uploader.tsx`, `src/panels/admin/components/customer-form-sections.tsx`, `src/panels/admin/pages/customer-application-wizard.tsx`, `src/shared/forms/modern/customer-phone-fields.test.tsx`, `src/modules/customers/application/register-customer.ts`, `src/modules/vip/rules.ts` (`paymentSchemeTierTerms`).
- Required approvals: any commit or push (owner only), AGENTS.md/CLAUDE.md edits, new dependencies, doc-04 amendments for the two flagged inconsistencies.
- Warnings: do not run build and tests together; do not delete `.next`; a full page load resets mock data to seed (wizard draft is the only sessionStorage exception); line-ending warnings (LF→CRLF) are expected on Windows.

## 9. Execution Recommendation
- Phase: QA
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: medium
- Ultracode: OFF
- Token optimization: one targeted test run + one build + one browser pass; avoid the full suite unless shared code changes.
- Reason: the committed state is verified, but the current phone/ID-preview workstream is unverified and needs owner review before commit.

<!-- SESSION_SNAPSHOT_END -->
