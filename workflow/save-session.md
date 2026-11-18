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
- Saved at: 2026-11-18 (third save this day; supersedes the previous snapshot).
- Repository: afhomes-platform (remote not re-checked; no fetch run).
- Branch: develop.
- HEAD: e2e459a "docs: remove obsolete audit documents" (verified this run). The owner committed the earlier UI work as f3ddfba and the audit-doc removal as e2e459a during the session; the FP12-FP16 work is uncommitted.
- Tool and model: OpenCode, DeepSeek V4.1 Flash 1017 (session metadata; not independently probed).
- Session objective: implement FP12 to FP16 - loading, empty, error and busy states across the public site and both login pages, a public route group with route loaders, a content-shaped skeleton system, an admin state audit, and the permanent clarification protocol. This run is `/save` only.
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion; backend/database/API/hosting deferred. Public content will become CMS-driven later.
- Context note: no compaction. Work was split across subagents for FP12 states, FP13 route group, FP14 login/public states and FP15 audit; the parent integrated and verified. The public route group and loading files were added after the subagent moves.

## 2. Current Project State
- Verified this run: `develop`, HEAD e2e459a; 19 modified tracked files, 14 deleted old page paths, 43 untracked files; nothing staged.
- Implemented and uncommitted:
  - `AGENTS.md` has a new "Clarification Protocol (all AI harnesses)" section: one-by-one or small-batch questions, 2-4 options, recommendation, wait for answers.
  - Shared `EmptyState` and `ErrorState`; `QueryState` now delegates errors to `ErrorState` and accepts `onRetry`.
  - Public skeleton library: `PublicHeroSkeleton`, `PublicSectionSkeleton`, `PublicTierGridSkeleton`, `PublicArticleSkeleton`, `PublicFormPageSkeleton`, `PublicLoginSkeleton`.
  - `src/app/(public)` route group with `layout.tsx` wrapping `PublicLayout` and importing `public.css` once. All 14 public pages moved there; URLs and metadata unchanged; old per-page `PublicLayout` wrappers and duplicate CSS imports removed.
  - 14 public `loading.tsx` files plus `src/app/login/loading.tsx` and `src/app/login/sales/loading.tsx`; login Suspense fallbacks and the blog-post fallback now use the skeletons.
  - FAQ no-match and blog empty states use `EmptyState`; Verify uses `EmptyState` for no-match/limit and `ErrorState` for unavailable; OST registration/correction use `ErrorState`/`EmptyState`/`PublicFormPageSkeleton`.
  - Login submit uses `Button loading`; `LoginShell` now takes an optional `year` so prerendering the skeleton never calls `new Date()`. Both login pages pass the current year.
  - Admin audit `docs/implementation/ui-state-audit.md`: 62 routes, 62 rows, 28 complete, 25 partial, 8 redirects, 1 static. No admin source changed.
  - Docs `phase-12` to `phase-16` and the README UI-state section are in place and marked implemented/complete where applicable.
- Known pre-existing 320px home overflow (`site-feature-card` 331px in 310px content) still present.
- Current focus: owner review and commit of the FP12-FP16 tree; the admin audit is the input for a separately approved Phase 2 plan.

## 3. Important Decisions
- Only the project owner stages, commits and pushes (`AGENTS.md`). Every delivery stops and reports.
- Public pages use a route group so route-level `loading.tsx` renders inside `PublicLayout`; without the group the header/footer would disappear while loading. URLs are unchanged.
- Skeletons are content-shaped and CMS-ready. Static pages may not show a skeleton on instant navigation; the loaders become visible when CMS data makes a route suspend.
- Button spinners are for asynchronous actions only. Navigation links/CTAs, the synchronous mailto contact form, the clipboard copy button and synchronous step buttons do not get fake spinners.
- Shared `EmptyState`/`ErrorState` replace one-off messages; `QueryState` forwards retry only where safe.
- Admin is audit-first: FP15 changes no admin code; any fixes need a separate approved Phase 2 plan.
- The permanent clarification protocol applies to OpenCode, Codex, Claude Code and any agent reading `AGENTS.md`.
- No business rules, permissions, financial logic, data contracts, routes or copy were changed.
- No new dependencies; mock data remains browser-memory only.
- `LoginShell` year is passed by the client login pages; the route skeleton omits it, so the skeleton footer has no year.

## 4. Completed Work
- Governance: `AGENTS.md` clarification section.
- Docs: `docs/implementation/README.md`, `phase-12-state-foundations.md`, `phase-13-public-layout-and-route-loading.md`, `phase-14-public-empty-and-error-states.md`, `phase-15-admin-state-audit.md`, `phase-16-state-verification.md`, `ui-state-audit.md`.
- Shared states: `src/shared/components/modern/empty-state.tsx`, `error-state.tsx`, `query-state.tsx`, `state-components.test.tsx`.
- Public skeletons: `src/panels/public/components/public-skeletons.tsx`, `public-skeletons.test.tsx`, `src/panels/public/public-loading.test.tsx`.
- Public routes: `src/app/(public)/layout.tsx`, 14 moved pages, 14 public `loading.tsx`; `src/app/login/loading.tsx`, `src/app/login/sales/loading.tsx`; login page fallbacks; `src/app/(public)/blog/[slug]/page.tsx` fallback.
- Public states: `src/panels/public/faq/faq-questions.tsx`, `blog/blog-browser.tsx`, `pages/accreditation-verification-page.tsx`, `pages/ost-registration-page.tsx`, `pages/ost-correction-page.tsx`.
- Login: `src/panels/public/login/login-form.tsx`, `login-shell.tsx`, `src/panels/public/pages/staff-login-page.tsx`, `sales-login-page.tsx`.
- Tests updated/added: `state-components.test.tsx`, `public-skeletons.test.tsx`, `public-loading.test.tsx`, `site-pages.test.tsx`, `ost-registration-page.test.tsx`, `ost-correction-page.test.tsx`, `staff-login-page.test.tsx`, `public-links.test.tsx`.
- Verification:
  - `npx tsc --noEmit`: clean.
  - `npm run lint`: clean.
  - Targeted public/state tests: 118 passed across 12 files; final login/loading rerun: 38 passed.
  - Full `npm test`: 1889 passed, 4 failed.
  - Three full-run timeouts (`business-pages`, `payment-reference-fields`, `staff-page`) pass alone: 127 passed.
  - One failure is pre-existing and unrelated: `src/panels/admin/components/admin-mobile-nav.test.tsx` expects a "Log out" drawer footer that `AdminMobileNav` does not render.
  - `npm run build`: passed; 94/94 static pages; public route table and rendering modes unchanged. Build initially failed on `new Date()` in the login skeleton; fixed with the `LoginShell` year prop.
  - Browser: `/` at 375/768/1280 has one header, one footer, one main and zero horizontal overflow; `/login` and `/login/sales` fresh loads have one shell, Sign In, footer `(c) 2026 AFhomes`, zero overflow; `/faq` no-match shows "No questions found" plus the existing copy; `/register/ost/correct/invalid-token` shows "Link not valid" plus the existing message.
- Admin audit findings: 14 routes have no query-error state; 3 contract detail routes report load failure as "Contract Not Found"; several actions have disabled-only busy states; no admin page uses `QueryState onRetry`, `EmptyState` or `useActionRunner`; Redemption exists in code while instructions record it as disabled, flagged for owner confirmation.

## 5. Git Working Tree
- Staged: none (verified via `git diff --cached --stat`).
- Unstaged modified (19): `AGENTS.md`, `docs/implementation/README.md`, login page files (`src/app/login/page.tsx`, `sales/page.tsx`), FAQ/blog public components, login form/shell and pages, OST/Verify public pages and tests, `public-links.test.tsx`, `site-pages.test.tsx`, `src/shared/components/modern/query-state.tsx`.
- Deleted (14): the old public page paths under `src/app/{about,blog,blog/[slug],compliance,contact,experiences/*,faq,page,register/ost,register/ost/correct/[token],verify,vip-privilege}`. These are moves, not removals.
- Untracked (43): `src/app/(public)/` (layout + 14 pages + 14 loading files), 2 login loading files, 6 docs, 3 shared state files/tests, 3 public skeleton/loading test files. Full list was read via `git ls-files --others --exclude-standard`.
- `stash@{0}` ("local: sales-network cleanup + member detail redesign") still present.
- No package/lock changes. Git warns LF->CRLF. `git diff --check` clean (only line-ending warnings).
- HEAD e2e459a is the owner's commit; no agent staging/commit occurred.

## 6. Pending Tasks
- Owner review and commit of the FP12-FP16 tree. Do not stage or commit.
- Decide the pre-existing `admin-mobile-nav` drawer-logout test: either restore a drawer footer/logout control or update the test. This is admin auth UI outside FP12-FP16; needs owner authorization.
- Phase 2 admin plan from `docs/implementation/ui-state-audit.md`; start with finance/payments/commissions/membership, then customer/sales, reports/audit, organization/settings.
- Fix the pre-existing 320px `site-feature-card` overflow under a separate plan.
- CMS work later: wire public pages to data and confirm the route skeletons appear on slow navigation.
- Carried owner content/legal items: hot-spring count (5/10); dated blog claims; Teppanyaki count; HR email; legal review of disclaimer/compliance/Verify privacy; Smart Wellness Hotel status; privacy policy; UI22 "keep rate pictures" note in `docs/implementation/decisions-and-gaps.md`.
- Carried not rechecked: tablet/dark mode; Customer Look Up as Finance/Clerk/OST; real contact-form hand-off; full desktop visual pass; B1 permission fixes; table priority sorting; Redemption decision; D14 rounding; Clerk Commissions; IST Clawback Addendum; points-per-night table; legal retention; real login/DB/hosting.
- Tooling: `@grill-me` still resolves to a stub (the `grilling` target is missing).

## 7. Verification State
- This `/save` run: no typecheck, lint, tests, build or browser QA; documentation only.
- Last implementation run: typecheck clean, lint clean, targeted tests green, full suite 1889/4, build passed, browser checks as in section 4.
- Known failures:
  - `admin-mobile-nav.test.tsx` drawer logout test: pre-existing, unrelated, not fixed.
  - Three admin files time out under full-suite load but pass alone: `business-pages`, `payment-reference-fields`, `staff-page`.
  - 320px home overflow from `site-feature-card` remains.
- Not performed:
  - Visual observation of route skeletons, because the public pages are static and resolve before a skeleton paints. They are covered by the 16-loader and 12-skeleton component tests.
  - Admin page fixes from the audit; Phase 2 only.
  - Screenshots; full visual desktop pass; `npm install`/node_modules check.
- Browser tabs opened during QA were intermittently detached when the debugging bar was dismissed; all required checks were completed before the final detach.

## 8. Next Session Instructions
- First action: `/load`, inspect the uncommitted tree against HEAD e2e459a, and ask the owner to review/commit the FP12-FP16 work.
- Verify if needed: `npx tsc --noEmit`, `npm run lint`, targeted tests, one full test run, one build (sequential). Re-run the three admin timeout files alone if the full run times out.
- Do not fix the `admin-mobile-nav` test or any admin page without a new owner authorization; use `docs/implementation/ui-state-audit.md` for the Phase 2 plan.
- Relevant files: `workflow/save-session.md`; `docs/implementation/phase-12` to `phase-16`; `docs/implementation/ui-state-audit.md`; `src/app/(public)/layout.tsx`; `src/panels/public/components/public-skeletons.tsx`; `src/shared/components/modern/{empty-state,error-state,query-state}.tsx`; `src/panels/public/login/login-shell.tsx`; `src/panels/public/login/login-form.tsx`; public FAQ/blog/Verify/OST files.
- Required approvals: owner commits; each phase before building; permission/backend/DB/API/hosting; `AGENTS.md` edits; dependency changes; any admin fix.
- Warnings: mock data resets on full page load; do not commit; never run build+tests simultaneously; full suite slow; do not delete `.next`; never claim visual verification without a browser; route skeletons do not show on instant static navigation; browser automation may detach if the debugging bar is dismissed.

## 9. Execution Recommendation
- Phase: QA
- Current mode: not verified
- Recommended next mode: default (owner review)
- Current model: DeepSeek V4.1 Flash 1017 (session metadata, not independently probed)
- Recommended model: Sonnet 5.5
- Effort: medium
- Ultracode: OFF
- Token optimization: owner reviews/commits the tree; then generate the Phase 2 admin plan from the audit in approved batches. No further verification is needed for FP12-FP16.
- Reason: all five phases are implemented and verified; the remaining items are the commit decision, the pre-existing admin drawer test, and the separately approved admin fixes.
<!-- SESSION_SNAPSHOT_END -->
