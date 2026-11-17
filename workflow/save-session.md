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
- HEAD: 0527933 "feat: upgrade Next.js and refactor public site chrome" (verified this run via `git rev-parse`). Previous snapshot HEAD 9cb9d43 is its parent.
- Tool and model: OpenCode (Beam Free). Model ID not independently verified this run.
- Session objective: run `/load` then `/save`. No implementation, code change, or verification was requested or performed this session.
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion. Backend, database, API and hosting are skipped until then (owner, 2026-11-16, carried forward).
- Context note: this session started fresh with no prior conversation. The snapshot and repository state are the sources. Between `/load` and `/save` no edits were made by this session, yet the working tree is now very large and dirty (see sections 2 and 5); origin of those changes is unknown to this session and must be reconciled by the owner.

## 2. Current Project State
- Verified this run: on `develop`, HEAD 0527933. Working tree is NOT clean: many modified tracked files plus many untracked files (see section 5). Nothing staged.
- `package.json` / `package-lock.json`: `next` and `eslint-config-next` at 16.4.5 (verified). Lockfile shows further churn this run (+318/-... lines vs the prior +50/-50), i.e. the tree has moved beyond the documented bump; not verified against `node_modules`.
- New/expanded areas visible in the uncommitted tree: `src/app/admin/customer-lookup/`, `src/data/contracts/member-qr-repository.ts` + mock + tests, `src/panels/admin/components/member-qr.*`, `src/panels/admin/pages/customer-lookup.css`, a large public-site page/component split under `src/panels/public/{about,blog,compliance,contact,faq,post,vip}/`, `src/panels/public/site/vip-tier-list.tsx`, and new shared site components (`site-badge`, `site-callout`, `site-components.css`, `site-feature-card`, `site-header-scroll`, `site-room-card`, `site-tier-card`). Business intent of these not verified this session.
- Docs touched in the working tree: `docs/business-rules/09-vip-membership-and-stay-points.md`, `docs/business-rules/10-redemption.md`, `docs/implementation/decisions-and-gaps.md`.
- Current focus per prior snapshot: QA stage, owner content decisions and review. That assumption may no longer hold given the large dirty tree; owner confirmation required before any work continues.

## 3. Important Decisions
- Only the project owner stages, commits and pushes (AGENTS.md). Every delivery stops and reports.
- Still binding from earlier sessions: UI5 to UI22 and A1 to A8; SweetAlert2 only through `AppAlert`/`useConfirmRun`; mock business data in browser memory only; no new dependencies without approval; max 5 table columns; namespaced kebab-case classes; no gold in the shell; a public header must not use `usePathname`; dynamic route params must be read inside a `Suspense` boundary.
- Owner, 2026-11-16 (UI21 and UI22): Customer Look Up is staff-only (no public lookup); Verify copies the v2 steps and output while keeping the v3 rules (Expired shown, OST shows Valid until, IST does not); all 9 blog posts in full with a category filter; contact form opens the visitor's email app; VIP page keeps the old numbers with doc 09 point wording; keep the old villa pictures with printed room rates.
- Hot-spring count (5 or 10) still unanswered by the owner (carried forward).
- Redemption remains disabled per docs; mock UI may be live — do not activate routes/APIs without authorization.

## 4. Completed Work
- This session: `/load` then `/save`. No product, test, doc, or configuration change authored by this session. The working tree is dirty, but none of it was produced here.
- Repository: HEAD 0527933 contains the Next.js bump + public-site chrome refactor (verified via `git show --stat` earlier this session).
- Historical verification (carried, not re-run): `npx tsc --noEmit` clean; `npm run lint` clean; full test run 161 files passed with 2 slow files (9 tests) timing out under load but passing alone; `business-pages.test.tsx` alone 103 passed; `npm run build` passed with all 9 blog posts prerendered. These predate the current dirty tree and the 16.4.5 bump, so they do not prove the current state.

## 5. Git Working Tree
- Staged: none (verified).
- Unstaged modified (verified, count ~74 tracked files): docs (09, 10, decisions-and-gaps), package.json/package-lock.json, many src files across admin/customer-lookup/member-qr, public site pages, content modules, data contracts/mocks/repositories/seed, redemption, stay points, promos, notifications, shared components, theme tokens. Full list recorded by `git diff --name-status` this run (not reproduced here).
- Untracked (verified, ~70+ files): `public/images/member-qr-logo.jpg`, `src/app/admin/customer-lookup/page.tsx`, member-qr contract/mock/tests, `src/modules/public-site/content/blog.test.ts`, `member-qr.tsx` + test + css, large public-site page/component split (about, blog, compliance, contact, faq, post, vip), `src/panels/public/site/vip-tier-list.tsx`, new shared site components (site-badge, site-callout, site-components.css, site-feature-card, site-header-scroll, site-room-card, site-tier-card).
- Deleted (tracked): `src/panels/public/site/blog-index.tsx`, `src/panels/public/site/faq-list.tsx`.
- Stash `stash@{0}` "local: sales-network cleanup + member detail redesign" still present (verified earlier this session).
- Origin of all working-tree changes: unknown to this session (not authored here). Git warns LF→CRLF on checkout. The dirty tree is large enough that it should be treated as in-progress work of unknown owner/agent provenance until reconciled.

## 6. Pending Tasks
- Reconcile the large dirty working tree with the owner: determine whether it is intended in-progress work, a leftover from another session/agent, or accidental. Do not commit, discard, or stash without owner direction.
- Verify the Next 16.4.5 bump and the dirty tree together: `npm install` state, typecheck, lint, tests, build, browser smoke. Not performed this session.
- Owner answers still needed: hot-spring count (5 or 10); keep/edit/archive old blog posts with dated claims (REBAP 50% VIP promotion, "potential investors"; Expo post "over 20 hectares" and "600 staycation units"); Teppanyaki Lounge count (four in text, two in caption); whether to show HR email; legal review of disclaimer, compliance statements, Verify privacy notice; update Smart Wellness Hotel status once open (grand opening November 2026); privacy policy page.
- Add the UI22 "keep the rate pictures" answer to `docs/implementation/decisions-and-gaps.md` (small docs edit, not done).
- Not yet checked: tablet width and dark mode for public site and shell; Customer Look Up as Finance, Clerk and OST in browser (only Super Admin checked); real contact-form hand-off to email app; visual pass of every desktop page.
- From earlier snapshots, still open: priority sorting for every table; B1 permission fixes (`sales-network.*` for svd/ssm/sm; Admin adds IST and OST; `finance.refund` for admin; remove `requestedBy` check in `finance-cancellation-detail-page.tsx`; delete customer-status copy in `membership-repository.ts`); Redemption decision (docs disabled, mock UI live); small word items; commission rounding rule (D14); Clerk Commissions visibility. Outside the team: signed IST Clawback Addendum, real points-per-night table, legal retention period, real login, database and hosting.

## 7. Verification State
- This session: no typecheck, lint, test, build, or browser QA was run (not performed). `/save` is documentation only.
- Historical verification (carried): typecheck/lint clean; full test run 161 files passed with 2 slow files (9 tests) timing out under load but passing alone; `business-pages.test.tsx` alone 103 passed; build passed with all 9 blog posts prerendered. Predates the current dirty tree and the 16.4.5 bump.
- Known failures: none beyond slow-test timeouts under full-run load. Dev-only `/blog/[slug]` params warning not rechecked.
- Checks not performed this session: everything (typecheck, lint, tests, build, browser, `npm install` state, `node_modules` vs lockfile).

## 8. Next Session Instructions
- Recommended first action: `/load`, then ask the owner to reconcile the large dirty working tree (see section 5) before any implementation or verification. Confirm whether it is intended in-progress work. Only after that, verify the tree (typecheck → lint → targeted tests → full test run → build → browser smoke).
- If the dirty tree is not intended, the owner must decide how to handle it (stash/keep/discard) — agent must not perform Git write operations.
- Relevant files: `workflow/save-session.md`, `package.json`, `package-lock.json`, the modified/untracked groups in section 5, `docs/implementation/decisions-and-gaps.md`, `src/modules/identity/permissions.ts`, `src/panels/admin/navigation.ts`.
- Required approvals: any commit/push (owner only); each plan before building; permission changes; backend/database/API/hosting work; `AGENTS.md` edits; dependency changes or downloads; handling of the dirty working tree.
- Warnings: mock data resets on full page load; do not run build and tests simultaneously; run `business-pages` alone; full test run has slow-test timeouts that pass alone; do not delete `.next`; never claim visual verification without a browser run; the dirty tree may break typecheck/tests until reconciled; do not stage or commit anything.

## 9. Execution Recommendation
- Phase: QA / reconciliation (owner must clarify scope before feature work)
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: medium
- Ultracode: OFF
- Token optimization: first reconcile the dirty tree with the owner (cheap, no code), then targeted typecheck+lint, then one full test run and one build, then one item at a time.
- Reason: HEAD is committed at 0527933, but the working tree now contains a large, unverified set of changes of unknown origin; verification and scope clarification must precede any feature or QA work.
<!-- SESSION_SNAPSHOT_END -->
