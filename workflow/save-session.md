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
- Saved 2026-11-23 (Asia/Singapore and Asia/Manila). AFHomes Platform, branch `develop`, HEAD `cd10b3e`.
- Tool: Codex desktop, Default mode. Exact model not verified. Current conversation and preceding saved handoff were available.
- Objective: verify GSD points rules, build the approved front-desk flow, demonstrate the forms, and fix the reported hover issue. Phase: frontend prototype with sample data.

## 2. Current Project State
- HEAD `cd10b3e` contains the GSD implementation, on top of `5f8a9ef` (realistic seed and prototype completion work). The working-copy hover fix is separate.
- Customer Look Up lets GSD check active membership by name and distinguish matches by VIP Number. Scanning the member's current QR opens Earn Points and Redeem Points. GSD actions and booking views are scoped to that scanned holder. GSD cannot retrieve member codes through staff QR display or approve bills/payments.
- Earn Points collects Service Used, Receipt Number and payment details, then submits for review. Redeem Points asks staff to check ID and offers a reward or overnight stay with the points balance and cost shown.
- Source review: the external AFHomes VIP Grants describe the Annual Welcome Gift. No QR operating workflow was found in the AFHomes materials reviewed. The platform QR and points rules are in docs 01, 09 and 10. The seed plan still says Planned despite the committed seed implementation.

## 3. Important Decisions
- Owner approved QR entry for both GSD points actions and requested the labels Earn Points and Redeem Points. Name lookup is for active membership verification.
- An approved qualifying purchase can earn configured Promo Points and count toward the fixed annual Stay Points gift. A scan identifies the cardholder. Separate balances, receipt uniqueness, existing bill approval, reward eligibility and stay reservation/completion rules still apply.
- Prototype only, with browser-memory sample data. Live redemption, Services activation, Stage 7, real sign-in, database work and deployment require separate authorization. Git writes are reserved for the project owner.
- Prior snapshot decision still relevant: IGP Formal VIP Grant signing creates the prototype buyer membership with a frozen tier, Series Number and zero Stay Points. Doc 14 amendment needs owner sign-off before live use.

## 4. Completed Work
- GSD implementation in `src/panels/admin/pages/customer-lookup-panel.tsx`, `gsd-points-page.tsx`, related staff forms, `src/data/mock`, `src/modules/identity/permissions.ts` and Business Rule 01. Added UI coverage in `src/panels/admin/customer-lookup.test.tsx` and mock tests for name lookup, QR scope, receipt duplication, approval and balance limits.
- ChatGPT browser walkthrough opened the purchase and points-use forms for a sample member under the already signed-in Super Administrator. No sample transaction was submitted. The administrator screens use the older labels.
- Fixed the hover flash on Scan QR, Enter Resort Bill and Record Points Use by preserving the gradient and solid fill through the transition. Manage Stay Bookings now updates its fill and border on hover. Only `src/panels/admin/pages/customer-lookup.css` changed for this fix.
- Prior handoff reports Stages 0–6, realistic seed, review fixes and role walkthroughs completed with manual exceptions recorded in `docs/implementation/01-prototype/ui-states/16-state-verification.md`. Git confirms the seed commit exists.

## 5. Git Working Tree
- Before this save: `develop` at `cd10b3e`, no staged changes, no untracked files, and no deletions or renames.
- Unstaged from this session: `src/panels/admin/pages/customer-lookup.css` (10 insertions, 4 deletions). This save additionally changes the snapshot block of `workflow/save-session.md`.
- HEAD also contains changes to `commissions-pages.test.tsx` alongside the GSD work. Those test changes were not made or tested in the GSD task described here. No agent Git writes.

## 6. Pending Tasks
- A live sample GSD walkthrough with a real camera and customer QR was not performed. The hover fix is local and ready for owner review.
- Full suite confirmation remains open. The prior snapshot reported 2,091 passed and 11 failed of 2,102, with affected tests passing alone. No post-fix full rerun is recorded. The 11 failures are suspected load-related, not confirmed cleared.
- Prior open items: doc 14 amendment, G3/G4 allowance questions (including OCT I1), seven G5 owner process checks, manual browser checks, static blog dates and F11.3 comparison against official workbook figures. Stage 7 and D8 remain separate.

## 7. Verification State
- GSD implementation: 82 focused tests passed, including simulated QR input, expired/replaced codes, duplicate receipts and insufficient balances. TypeScript, lint and `git diff --check` passed. Webpack production build passed (101 static pages generated) after restricted attempts hit filesystem and Google Fonts access errors.
- Hover fix: verified browser hover at the screenshot width on all four controls. The green gradient and readable text survived the transition. Lint and `git diff --check` passed. No production build or automated test suite was rerun for the CSS-only fix.
- Save command: read-only Git checks and snapshot write/readback only. No product checks rerun.

## 8. Next Session Instructions
- Run `/load` and verify HEAD and the working tree. Start with `src/panels/admin/pages/customer-lookup.css`, the lookup screen, and the GSD test if resuming this work.
- For the requested live demo, use the GSD sample account plus a sample membership QR. Check both actions from the scan. The admin name-lookup shortcut is a different UI. Use sample records only.
- If the owner authorizes broader QA, rerun the full suite with the dev server stopped, then check any failures separately. Check current canonical docs before any business-rule or launch work.

## 9. Execution Recommendation
- Phase: QA. Current and recommended next mode: Default in Codex. Current model: not verified.
- Recommended model: GPT-6.2 Sol, medium effort. Ultracode: OFF.
- Token optimization: verify only the live GSD path for the demo. Run the full suite once separately if requested.
- Reason: focused checks cover the implementation. The remaining checks concern live camera handling and broader regression results.
<!-- SESSION_SNAPSHOT_END -->
