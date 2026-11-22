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
- Saved at: 2026-11-22 (Asia/Manila business date; exact time not recorded).
- Repository: afhomes-platform; branch `develop`; HEAD `16e5fef` (verified in this run).
- Tool and model: Claude Code (desktop app), Sonnet 5.5, medium effort (set by the owner's `/model` and `/effort` commands this session).
- Session objective: Save a handoff, run two code reviews on the uncommitted milestone, plan and apply fixes for all 17 findings, then run the full test suite.
- Development phase: Frontend prototype on typed in-memory mock data; backend, real authentication, database, migrations, and deployment remain deferred.
- Context note: No compaction. The harness lost its Bash tool mid-session, so PowerShell was used for commands.

## 2. Current Project State
- Verified: branch `develop`, HEAD `16e5fef` (`fix: tighten VIP plan sellability, experiences audit and mutation access refreshes`, 2026-11-22 15:04 +0800). Working tree clean (`git status --short` empty; nothing staged or untracked).
- Verified: the owner committed in order `b64f4d3` (Phase 1 portal/promos/GSD), `6c943f2` (refactor: architecture boundaries, public content from repositories; the earlier large uncommitted milestone), and `16e5fef` (this session's 17 fixes, 32 files).
- Current focus: the review-fix pass is done and committed. Open items are an owner decision and test hygiene (section 6).

## 3. Important Decisions
- Owner answers this session (2026-11-22): keep `listPage` (documented Phase 7 in `docs/development/architecture-refactoring-report.md`); add a separate `experiences` audit module; Super Administrator keeps full control of approved products; narrow the `affectsAccess` flag only and keep the access gate's unmount-while-revalidating behavior.
- Implemented rule: on an approved product, only an identity with `vip-products.approve` (Super Administrator) may change price, validity, earning cycles, points, minimum spend, VIP discount, supplementary holders or card level. Administrators keep description, benefits, image, listing, status and price-status flagging.
- Assumption: the Administrator may still flag or resolve a price conflict (`priceStatus`) because it does not change what a customer pays.
- Public VIP card: "Total points over N years" now follows the product's `earningCycles`; the discount-years text still comes from the owner-approved per-code table.
- Project Git policy unchanged: only the owner stages, commits, pushes, merges, resets and deploys.

## 4. Completed Work
- Experience image path: `src/data/mock/experience-repository.ts` accepts plain `/images/` paths only and rejects control characters, `%`, `?`, `#` and backslashes; highlight titles capped at 80 (`src/modules/experiences/rules.ts`); toast reflects archived state (`src/panels/admin/pages/experiences-page.tsx`).
- `experiences` audit module: `src/modules/audit/types.ts`, `src/modules/notifications/creation-actions.ts` (empty creation list), `src/panels/admin/navigation.ts` (one-tab `experiences` area), `src/panels/admin/notifications/module-nav.ts`, plus tests.
- Products (`src/data/mock/product-repository.ts`): retired products cannot be approved; approved-product economic-edit guard; approved benefits cannot be cleared; `delete` formatting fixed. Promo preview requires `promos.manage` (`src/data/mock/promo-repository.ts`).
- Purchase surfaces: customer import ignores drafts (`src/modules/customers/import.ts`); wizard blocks Continue for a retired resumed-draft card (`src/panels/admin/pages/customer-application-wizard.tsx`); repeat-purchase dialog treats a retired plan as no choice (`src/panels/admin/components/prepare-contract-dialog.tsx`); `tierOptions` reuses `isSellableProduct`.
- Access: `affectsAccess` removed from the temporary-password, draft-save, sponsor-lookup and both registration mutations (`src/data/queries.ts`); notification provider and menu read operations from `useAccessSnapshot()`.
- Public card: `earningCycles` added to the public allowlist; perks deduplicated; `src/modules/public-site/content/vip.test.ts` added.
- Other files in the commit were committed by the owner; the exact 32-file list is in `git show --stat 16e5fef`.

## 5. Git Working Tree
- Branch `develop`, HEAD `16e5fef`. Staged: none. Unstaged: none. Untracked: none. Deleted or renamed: none pending. Verified by read-only Git commands.
- All of this session's edits are inside commit `16e5fef` (verified for key files by name; not every file compared line by line).
- No Git write operation was performed by the agent.

## 6. Pending Tasks
- Owner decision: seeded product validity is 22/12/7 years (`src/data/mock/seed-data.ts`) but public copy says 20/10/5 years (`src/modules/public-site/content/vip.ts`, `VIP_BENEFITS`, `CARD_PRESENTATION`). Which is correct is not decided; nothing was changed.
- Test hygiene: many admin page tests render before the async access gate resolves and fail on "Checking access…" (for example `area-page.test.tsx`, `admin-dashboard-page.test.tsx`, `admin-kit.test.tsx`, `departments-page.test.tsx`, `roles-page.test.tsx`, `customer-review-pages.test.tsx` Import-tab test). Cause is the access-gate work (`src/panels/admin/components/admin-auth-gate.tsx`), not these fixes (assumed from failure text; not baseline-tested).
- Other failures seen once in the full run and judged unrelated: "Profile picture file" and "Receipt file" label lookups, reports summary card count (expected 7, got 6), plus 15-second timeouts in staff, business pages, modern fields and commissions suites.
- Authority-changing commands still unmount the admin page by design; revisit only if the owner wants forms kept mounted.
- Still deferred: Phase 2/3 items from the earlier plan if not already covered by commit `6c943f2` (not verified in this session), external Business Rules folder reconciliation, live Redemption/Services disabled.

## 7. Verification State
- Targeted tests (data, module and repository suites): 154 of 154 passed. UI suites run: 79 of 80 passed; the one failure is the pre-existing Import-tab "Checking access…" test.
- After the final regression fix: `tier-level-repository`, `business-flow` and `product-repository` suites 107 of 107 passed.
- `npx tsc --noEmit`: passed (exit 0), last run after the final edit.
- `npm run lint` (includes the architecture check, 669 files): passed, run before the last small test edits.
- `npm run build`: passed, run before the last small test edits.
- Full `npx vitest run`: failed in the access-gate, label-lookup, report-count and timeout groups listed in section 6; not re-run after the two regression fixes.
- Browser QA: not performed. No dedicated test for the notification-operations change (one-line swap).

## 8. Next Session Instructions
- First action: run `/load`, confirm `git status --short` is still clean at `16e5fef`, then ask the owner about the validity-years mismatch.
- If fixing tests, start with one shared fix so admin page tests wait for the access gate (look at `src/panels/admin/components/admin-auth-gate.tsx` and a shared test render helper), then re-run the full suite.
- Files to inspect: `src/data/mock/product-repository.ts`, `src/data/access-snapshot.ts`, `src/data/protected-cache.ts`, `docs/implementation/prototype/customer-portal-plan.md`.
- Approvals needed: owner authorization for any new phase or feature; all Git operations stay with the owner.
- Warnings: do not enable live Redemption or Services, do not add public customer/card lookup, do not reintroduce Ant Design, and do not invent which validity figure is right.

## 9. Execution Recommendation
- Phase: QA
- Current mode: not verified
- Recommended next mode: Plan, then Build once approved
- Current model: Sonnet 5.5, medium effort (reported by the app)
- Recommended model: Sonnet 5.5
- Effort: medium
- Ultracode: OFF
- Token optimization: fix the access-gate test pattern once in a shared helper, run the affected suites individually with longer timeouts, and skip the full suite until then.
- Reason: the remaining work is a single shared test fix plus one owner decision, not new design.
<!-- SESSION_SNAPSHOT_END -->
