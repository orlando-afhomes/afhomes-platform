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
- Saved at: 2026-11-20 14:24 (supersedes the 2026-11-19 22:19 snapshot).
- Repository: afhomes-platform; remote `https://github.com/orlando-afhomes/afhomes-platform.git` (push confirmed this session).
- Branch: develop. HEAD: 677a240 "feat: table ordering, pagination, import/export tabs, customer fields, cash payment rule" (verified).
- Tool and model: OpenCode, GLM-5.3-Flash (harness metadata; not independently probed).
- Session objective: UI/UX batch from browser comments (breadcrumbs, buttons, prefix, citizenship, seller teams, cash rule), then merge the work to develop and verify it, then fix the login art responsiveness.
- Development phase: frontend prototype on typed in-memory mock data. Backend, auth, database and deployment remain deferred.
- Context note: no compaction. Session began in the `kind-eagle` worktree and was moved to the main checkout.

## 2. Current Project State
- develop at 677a240, pushed to origin; clean except one CSS edit and one untracked file (section 5).
- Session work committed by the owner as 677a240 (78 files, +1024/−847) and fast-forwarded into develop, then pushed.
- Worktrees: `worktree\13158f\kind-eagle` at 677a240 (detached, clean), `worktree\13158f\crisp-tiger` at 897a000 (detached, clean), `.claude\worktrees\skills-load-73b67f` at 1ad7b0b (pre-existing).
- Current focus: login art panel responsiveness in `src/panels/public/login/login.css`; edit is uncommitted.
- Dev server runs at http://localhost:3000 from this checkout; `.next/dev` was deleted and regenerated after the route moves.

## 3. Important Decisions
- Owner explicitly authorized commit, merge, fast-forward and push despite the standing AGENTS Git prohibition; AGENTS.md was not modified. Future agents will again refuse Git writes unless the policy is amended.
- Table ordering: newest business date first, attention statuses only break same-date ties; staff and members add a Newest/A-Z/Z-A control.
- Customers area has separate `import` and `export` tabs; old `?tab=import-export` falls back; notifications point at the new tabs.
- Same-team rule for Closing seller and Referrer (branchId), applied to customer wizard, IGP record/correct, Prepare Contract and VIP commission correction.
- Citizenship stores ISO codes (`citizenshipCodes`) with nationality text kept in sync; searchable fixed list; dual/multiple toggle. Prefix is an optional fixed list.
- Cash rule: system payment reference `PAY-YYYYMMDD-NNNN` for every method, separate `documentNo` (invoice/receipt), no bank/e-wallet reference for cash, Finance verification stays manual.
- Breadcrumbs: every crumb with a route is clickable, including the current page.
- Login art: one proportional card fan at all widths; organic edge only at ≥1100px with 136px reserved padding; compact mobile band; `100dvh`; short-height laptop tweaks.

## 4. Completed Work
- Build fix: `(verify)` and `(correction)` route groups; header frame no longer uses `usePathname`; active-nav split; build passes again.
- Table UX: `src/shared/lib/table-order.ts` + `DataTable` `orderBy`; pagination text and page dropdown; import/export tab split; proportional login fan and `sizes`.
- Browser-comment batch: breadcrumb links, Cancel/Save-Draft variants, step pill redesign, prefix, citizenship picker, same-team sellers, print button variants (`info`), cash rule across wizard/Finance/IGP dialogs.
- Customer ID auto/manual verified as already functional (repository and tests), no change needed.
- Dead `src/shared/forms/validation/reference-number.ts` and its test removed.
- Verification on develop: `npx tsc --noEmit` clean, `npm run lint` clean, `npm run build` passes (96 routes); full suite 174/176 files, `business-pages` and `staff-page` pass 124/124 when run alone (load flakes).
- Login responsiveness pass: CSS rewritten; CDP measurements at 390×844, 768×1024, 1000×700, 1440×900 show no horizontal overflow, cluster inside the art panel, and clear of the green curve at ≥1100. CDP screenshot script fixed after a websocket buffering error but not re-run.

## 5. Git Working Tree
- Staged: none.
- Unstaged: `src/panels/public/login/login.css` (this session; responsive art fix).
- Untracked: `.claude/settings.json` (source unknown; likely pre-existing tooling).
- Deleted or renamed this session: the moved route files and the removed reference-number module were committed in 677a240.
- `workflow/save-session.md` becomes modified after this save.

## 6. Pending Tasks
- Owner review and commit of the login CSS edit, then push.
- Re-run login visual QA with the fixed CDP screenshot script if desired (geometry already verified).
- Optional: full suite rerun after the CSS edit (CSS-only; not rerun).
- Owner action: remove the `kind-eagle` and `crisp-tiger` worktrees when convenient.
- Open governance choice: amend AGENTS.md if agents should keep performing Git operations.

## 7. Verification State
- Typecheck: clean on develop before the CSS edit.
- Lint: clean on develop before the CSS edit.
- Build: passes on develop before the CSS edit (route list includes `/verify`).
- Tests: 174/176 files; the two failing files pass 124/124 alone; failures are timing flakes, not code.
- Login QA: geometry verified by CDP for four viewports after the breakpoint fix; earlier headless CLI screenshots were mis-sized and are not evidence.
- Not performed: build/lint/typecheck after the final CSS edit; screenshot capture after the script fix.

## 8. Next Session Instructions
- First action: `/load`; expect develop at 677a240 plus the uncommitted `login.css` edit.
- Inspect `src/panels/public/login/login.css` (cards, edge breakpoints) and `login-shell.tsx`.
- Run `npx tsc --noEmit`, `npm run lint`, `npm run build` if more login changes are made; CSS-only edits do not change tests.
- Required approvals: owner commits; any AGENTS.md amendment.
- Warnings: keep live Redemption and Services disabled; no public customer or card lookup; dev server on 3000 is the owner's process.

## 9. Execution Recommendation
- Phase: QA complete; owner review and commit of the CSS edit next.
- Current mode: not verified.
- Recommended next mode: owner review/commit.
- Current model: GLM-5.3-Flash (opencode-go), verified from harness metadata.
- Recommended model: Sonnet 5.5, low effort.
- Effort: low.
- Ultracode: OFF.
- Token optimization: no further runs needed unless the login layout changes again.
- Reason: all requested work is on develop and verified; one small CSS pass awaits commit.
<!-- SESSION_SNAPSHOT_END -->
