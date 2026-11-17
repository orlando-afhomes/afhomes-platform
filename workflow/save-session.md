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
- Saved at: 2026-11-17
- Repository: afhomes-platform (remote not re-checked; no fetch run)
- Branch: develop
- HEAD: 9cb9d43 "chore: public site implementation" (verified this run). The previous snapshot's HEAD ca75d77 is now its parent (verified by `git log`), so the large uncommitted tree was committed by the owner in 9cb9d43. Commit contents were not re-inspected this session; push state not verified.
- Tool and model: OpenCode, DeepSeek V4.1 Flash 1017.
- Session objective: run `/save` only. No implementation, code change, or verification was requested or performed this session.
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion. Backend, database, API and hosting are skipped until then (owner, 2026-11-16, carried forward).
- Context note: this session started fresh with no prior conversation. Everything here comes from the repository and the previous snapshot, not from work done in this session.

## 2. Current Project State
- Verified this run: on `develop`, HEAD 9cb9d43, working tree has only `package.json` and `package-lock.json` modified; nothing staged, no untracked files.
- The UI21 and UI22 work (staff Customer Look Up, rebuilt public Verify, new public website with 64 pictures) and the earlier Non-Standard contract approval and admin shell redesign are now committed in 9cb9d43 (verified that HEAD advanced; file contents not re-inspected this session).
- The only uncommitted change is the Next.js update: `next` and `eslint-config-next` 16.4.3 → 16.4.5 in `package.json`, with the matching lockfile update (+50/−50 lines). Author and verification state are unknown; it was not produced by this session.
- Current focus: QA stage, owner content decisions and review. No feature work is authorized or in progress.

## 3. Important Decisions
- Only the project owner stages, commits and pushes (AGENTS.md). Every delivery stops and reports.
- Still binding from earlier sessions: UI5 to UI22 and A1 to A8; SweetAlert2 only through `AppAlert`/`useConfirmRun`; mock business data in browser memory only; no new dependencies without approval; max 5 table columns; namespaced kebab-case classes; no gold in the shell; a public header must not use `usePathname`; dynamic route params must be read inside a `Suspense` boundary.
- Owner, 2026-11-16 (UI21 and UI22, now committed): Customer Look Up is staff-only (no public lookup); Verify copies the v2 steps and output while keeping the v3 rules (Expired shown, OST shows Valid until, IST does not); all 9 blog posts in full with a category filter; contact form opens the visitor's email app; VIP page keeps the old numbers with doc 09 point wording; keep the old villa pictures with printed room rates.
- Hot-spring count (5 or 10) is still unanswered by the owner (carried forward).

## 4. Completed Work
- This session: wrote this snapshot only. No product, test, doc, or configuration change.
- Repository: the owner committed the UI21/UI22 work plus the earlier Non-Standard and shell redesign as 9cb9d43 (verified only via `git log`; commit contents not re-inspected).
- Carried from the previous snapshot (historical, not re-run): typecheck, lint and build clean; tests mostly passing with two slow files that pass alone; browser checks of Verify, Customer Look Up as Super Admin, and all new public pages. Treat these as prior results, not current proof.

## 5. Git Working Tree
- Staged: none (verified).
- Unstaged (verified): `package.json` and `package-lock.json` only — `next` and `eslint-config-next` 16.4.3 → 16.4.5; lockfile +50/−50. Origin: unknown, pre-existing before this session, not authored here.
- Untracked: none (verified; `git ls-files --others --exclude-standard` empty).
- Deleted or renamed: none.
- Stash `stash@{0}` "local: sales-network cleanup + member detail redesign" was recorded in the previous snapshot as still kept; not re-checked this run. Git warns only about LF to CRLF.

## 6. Pending Tasks
- Verify the Next 16.4.5 bump before the owner commits it: `npm install` state, typecheck, lint, tests, build, and a smoke run of the app. Not performed this session; whether `node_modules` matches the lockfile is unknown.
- Owner answers still needed (not blocking): hot-spring count (5 or 10); keep, edit or archive the old blog posts with dated claims (REBAP 50% VIP promotion and "potential investors"; Expo post "over 20 hectares" and "600 staycation units"); the Teppanyaki Lounge count (four in the text, two in a caption); whether to show the HR email; legal review of the disclaimer, compliance statements and the Verify privacy notice; update the Smart Wellness Hotel status once it opens (grand opening November 2026); a privacy policy page.
- Add the UI22 "keep the rate pictures" answer to `docs/implementation/decisions-and-gaps.md` (small docs edit, not done).
- Not yet checked: tablet width and dark mode for the public site and the shell; Customer Look Up as Finance, Clerk and OST in the browser (only Super Admin was checked); a real contact-form hand-off to an email app; a visual pass of every desktop page.
- From earlier snapshots, still open: priority sorting for every table; B1 permission fixes (`sales-network.*` for svd, ssm, sm; Admin adds IST and OST; `finance.refund` for admin; remove the `requestedBy` check in `finance-cancellation-detail-page.tsx`; delete the customer-status copy in `membership-repository.ts`); the Redemption decision (docs say disabled, mock UI live); small word items ("DSC" in the approve-deal error, mixed capital letters, some hard words); the commission rounding rule (D14); the Clerk Commissions visibility question. Outside the team: signed IST Clawback Addendum, real points-per-night table, legal retention period, real login, database and hosting.

## 7. Verification State
- This session: no typecheck, lint, test, build, or browser QA was run (not performed). `/save` is documentation only.
- Prior snapshot results (historical): `npx tsc --noEmit` clean; `npm run lint` clean; full test run 161 files passed with 2 slow files (9 tests) timing out under load but passing alone; `business-pages.test.tsx` alone 103 passed; `npm run build` passed with all 9 blog posts prerendered.
- These results predate the Next 16.4.5 bump, so they do not prove the current tree. Re-run before the owner commits.
- Known failures: none beyond the slow-test timeouts under full-run load. Dev-only `/blog/[slug]` params warning was not rechecked; the earlier production build was clean.

## 8. Next Session Instructions
- Recommended first action: `/load`, then ask Dos whether the Next 16.4.5 bump is intended and whether `npm install` already ran. If yes, verify it (typecheck, lint, one full test run, build, quick browser smoke) before the owner commits; if not, ask whether to revert `package.json` and the lockfile (owner action).
- After that, offer the next small items: record the UI22 "keep the rate pictures" answer, a tablet and dark-mode pass of the public site, the content questions in section 6, table priority sorting, or the B1 permission fixes. Plan each one and get approval before building.
- Relevant files: `package.json`, `package-lock.json`, `workflow/save-session.md`, `docs/implementation/decisions-and-gaps.md` (UI19 to UI22), `src/modules/public-site/content/`, `src/panels/public/`, `src/panels/admin/pages/customer-lookup-panel.tsx`, `src/modules/identity/permissions.ts`, `src/panels/admin/navigation.ts`.
- Required approvals: any commit or push (owner only); each plan before building; permission changes; backend, database, API or hosting work; `AGENTS.md` edits; dependency changes or downloads beyond the existing bump.
- Warnings: mock data resets on any full page load, so do browser walkthroughs without reloading; do not run the build and the tests at the same time; run `business-pages` alone; the full test run shows slow-test timeouts that pass alone; do not delete `.next`; keep the room-rate pictures as the owner chose; never claim visual verification without a browser run; the Next update may change build output, so trust a fresh build only.

## 9. Execution Recommendation
- Phase: QA
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: medium
- Ultracode: OFF
- Token optimization: verify the dependency bump with targeted commands first (typecheck and lint), then one full test run and one build; after that plan one content or QA item at a time.
- Reason: the repository is committed and nearly clean; the only change is a small framework bump whose verification is unknown, and the remaining work is owner content decisions and approved QA passes.
<!-- SESSION_SNAPSHOT_END -->
