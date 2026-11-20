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
- Saved at: 2026-11-20 (supersedes the 2026-11-20 14:24 snapshot).
- Repository: afhomes-platform; branch develop; HEAD c958594 "style: refactor login shell card layout and add Claude settings" (verified; no fetch this session).
- Tool and model: OpenCode, DeepSeek V4.1 Flash 1017 (opencode-go), harness metadata; not independently probed.
- Session objective: `/load`, then a UI/UX batch from browser comments (hint icons, button redesign, TIN rule, cash OR number, persisted images with a full-size viewer), then restore the step circles.
- Development phase: frontend prototype on typed in-memory mock data. Backend, auth, database and deployment remain deferred.
- Context note: no compaction.

## 2. Current Project State
- Baseline c958594 was clean and in sync with the local origin/develop ref at session start.
- The whole UI/UX batch is implemented and uncommitted in the working tree (38 modified, 4 untracked files).
- Dev server at http://localhost:3000 (owner's process) served the changed code for browser QA; the mock store resets on page reload.
- Worktrees: `stellar-comet` and `sunny-squid` at c958594 (detached), as reported by `/load`; not touched this session.

## 3. Important Decisions
- Outline/secondary buttons (Details, Change, Cancel, Back, filters) use a soft brand-tinted fill; `secondary` is a deprecated alias of `outline` (owner choice, confirmed again this session).
- Every admin FieldShell hint became a small "Field guide" info icon: opens on hover and click, keyboard focusable; the guide text stays in the DOM as sr-only text. The listed wizard notes moved there; dynamic state notes stay inline.
- TIN accepts exactly 9 digits everywhere (format 123-456-789); 12-digit TINs are rejected; seeds and tests updated.
- Cash receipts get a system `OR-YYYYMMDD-NNNN` Invoice/Receipt number, shown disabled at entry points (customer wizard, payment submit, IGP record); Finance correction/verification dialogs stay editable. The `PAY-YYYYMMDD-NNNN` reference is unchanged. Doc 07 still describes manual OR entry; the owner decision needs a doc update.
- Uploaded images are stored as data URLs in the browser-memory mock store (no localStorage/IndexedDB) and shown as clickable thumbnails with a shared full-size viewer (Dialog, click-to-zoom, PDF opens in a new tab). Scope: Government ID (both holders), reservation proof, payment evidence, commission payout proof, VIP product image.
- Non-preview uploads are read at submit time (avoids FileReader races); ID image and product image previews read at selection.
- Step indicator: circles only, no boxed step buttons (direct owner instruction; reverts the 677a240 pill redesign).

## 4. Completed Work
- Shared UI: outline/secondary button redesign; `field-shell.tsx` + new `hint-tip.tsx`; new `image-preview.tsx` and `file-data.ts`; profile uploader button variant.
- Customers: `types.ts` (CustomerImage), repository copy key, ID preview now yields data URLs, wizard passes images plus the cash OR, customer detail shows ID thumbnails, restricted projection strips them, acquisition channel label marked Optional.
- Finance: `payment-reference.ts` gains `nextOfficialReceiptNo`; payment repository stores the evidence data URL and auto-OR for cash; payment submit/resubmit dialogs use the new rules and viewer; contract ledger shows the receipt thumbnail.
- Commissions: payout stores and displays the proof data URL. Products: image stored as a data URL and clickable in the detail sheet. IGP record uses the cash OR rule.
- TIN: sanitizer, validation, masked-field width, and five test files updated; seeds normalized to 9-digit TINs.
- Step bar restored: 2-line change in `step-indicator.tsx`.
- Verification: typecheck, lint and build clean; targeted suites pass (business-pages 103/103, commissions/roles/sales-network 29/29, staff-page 20/20, customer-review/VIP/parity/commission-effects 66/66, image-preview 3/3, business-flow 82/82, modern fields 29/29, payment-reference 4/4). Full suite 1872/1889 with 17 load timeouts, all in files that pass standalone.
- Browser QA: hint tooltip, TIN cap, cash OR display, and step circles confirmed on localhost:3000.

## 5. Git Working Tree
- Staged: none.
- Unstaged (38 files, all this session): shared UI/forms (`button.tsx`, `field-shell.tsx`, `masked-fields.tsx`, `profile-photo-uploader.tsx`, `input-sanitizers.ts`, `identification.ts` and their tests), customers (`types.ts`, wizard/sections/detail/ID preview, customer/customer-fields/field-validation tests, `seed-data.ts`), finance (`types.ts`, `payment-reference.ts`, payment repository/dialogs, `contract-sections.tsx`, `business-flow.test.ts`), commissions (`types.ts`, repository contract/mock, `business-queries.ts`, `commission-shared.tsx`), products/IGP dialogs and page, and `step-indicator.tsx`.
- Untracked: `src/shared/components/modern/image-preview.tsx`, `src/shared/components/modern/image-preview.test.tsx`, `src/shared/forms/modern/hint-tip.tsx`, `src/shared/lib/file-data.ts`.
- Deleted or renamed: none.
- `workflow/save-session.md` becomes modified after this save.

## 6. Pending Tasks
- Owner review and commit/push of the full batch.
- Documentation: update doc 07 to record the system-generated cash OR number (it still says the Clerk enters a required OR/reference).
- Optional: rerun the full suite; the 17 failures were load timeouts and pass standalone.
- Optional: end-to-end browser QA of submit -> customer record -> image viewer (the tab closed mid-flow; the component test covers the viewer).
- Known limits: Government ID images only attach on creation (the uploader is hidden when editing an existing record); seeded payment evidence is filename-only; staff/accredited-seller/OST-registration profile photos still use object URLs; 5 MB caps are client-side.

## 7. Verification State
- Typecheck: clean after all changes (`npx tsc --noEmit`).
- Lint: clean (`npm run lint`).
- Build: passes (`npm run build`, compiled successfully).
- Tests: targeted suites all pass (numbers above); full suite 1872/1889, 17 15-second timeouts in business-pages/staff-page/roles/sales-network under load, each passing standalone.
- Browser QA: hint icon opens the guide; TIN caps at 9 digits; cash shows `OR-20261120-0001` with the field disabled; the step bar shows circles with no boxes.
- Not performed: full-suite rerun after the final read-at-submit refactor and step change (targeted suites were rerun); image-viewer click path in the browser.

## 8. Next Session Instructions
- First action: `/load`; expect develop at c958594 with the uncommitted batch above.
- Inspect `src/shared/ui/button.tsx`, `src/shared/forms/modern/field-shell.tsx` + `hint-tip.tsx`, `src/shared/components/modern/image-preview.tsx`, `src/shared/lib/file-data.ts`, the wizard/payment/IGP cash paths, and `step-indicator.tsx`.
- Verify with `npx tsc --noEmit`, `npm run lint`, `npm run build`, and targeted `npx vitest run` for touched areas; run the full suite only if time allows.
- Required approvals: owner commits; the doc 07 alignment; any AGENTS.md amendment.
- Warnings: keep live Redemption and Services disabled; no public customer or card lookup; the dev server on 3000 is the owner's process; browser QA data is memory-only and resets on reload.

## 9. Execution Recommendation
- Phase: Build and QA complete; owner review and commit next.
- Current mode: not verified.
- Recommended next mode: owner review/commit.
- Current model: DeepSeek V4.1 Flash 1017 (opencode-go), verified from harness metadata.
- Recommended model: Sonnet 5.5, low effort.
- Effort: low.
- Ultracode: OFF.
- Token optimization: review the diff; rerun only the four formerly failing files if repeating the suite.
- Reason: the batch is complete and verified; commit and the doc 07 alignment remain.
<!-- SESSION_SNAPSHOT_END -->
