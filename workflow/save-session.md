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
- Saved at: 2026-11-18 (second save this day; continues the same session arc, supersedes the earlier snapshot below in Part B history).
- Repository: afhomes-platform (remote not re-checked; no fetch run).
- Branch: develop.
- HEAD: c5d332f "feat: refactor public experience pages and add contact map embed" (verified this run via `git rev-parse`; unchanged all session).
- Tool and model: OpenCode, DeepSeek V4.1 Flash 1017 (session metadata; not independently probed).
- Session objective: owner-driven browser-comment refinements (hero status badge, callout border, staff-only Access notes, header logo tile, related/blog image frames); an ORDACY-style contact redesign was built then fully reverted per owner complaint; this run is `/save` only.
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion; backend/database/API/hosting deferred.
- Context note: no compaction; summary from conversation and repo reads. Prior same-day snapshot covered the post-c5d332f UI work; this one adds everything since.

## 2. Current Project State
- Verified this run: `develop`, HEAD c5d332f; 40 modified tracked files, 2 deleted, 8 untracked; nothing staged.
- New this session, all uncommitted, on top of the prior uncommitted work:
  - Open-now badge: `SITE_HOURS` 9:00 AM–5:00 PM daily Asia/Manila (owner-confirmed; matches FAQ cash-payment hours) in `src/modules/public-site/hours.ts` + `hours.test.ts`; `OpenStatusBadge` client component above the hero eyebrow (hidden until mounted, 30s refresh, no hydration flash). Hero status pill "One group, three destinations" REMOVED per owner. Badge restyled to transparent pill with solid border; text/border/soft-tint follow state (green open, red closed); pulse kept, reduced-motion disables.
  - Callout: legacy `.site-callout` rule scoped to `p.site-callout` (payment warning); home Verify Accreditation panel border-left is now 0px.
  - Access notes: mobile-menu Access block and footer Access column carry "not for customers" notes; footer note names "Staff Login and Sales Sign-In" so Verify Accreditation (same column, public) is not misread as restricted. Enhanced to notice pills with Info icons (amber tint on ivory menu, gold tint on dark footer).
  - Header logo tile: white `background` removed (transparent); mobile/footer logo tiles untouched.
  - Related grid: images `contain` + centered (50% 50%); container has gold-glow gradient, hairline divider, inset ring.
  - Post hero frame: gradient matte, gold halo outline offset 4px, deeper shadow; cover gets matching gradient backdrop.
  - Blog index cards + featured media: gradient letterbox backdrops, hairline dividers (featured divider switches bottom→right at 900px), inset rings; card/featured images were already `contain` centered.
  - Contact page: ORDACY redesign (hero/steps/form-card/fields/button) was built by 3 subagents then fully REVERTED per owner ("UI design destroyed"). Page is back to the working state: "Contact Us" hero, ContactCards, "Write to us" mailto form ("Open email"), static maps, `SiteCta` closing. Grep confirms zero `contact-re-`/`PROJECT_TYPES`/"Send an inquiry" remnants.
  - `faq.ts` cash-payment line has a sync comment pointing at `SITE_HOURS`.
- Known pre-existing 320px home overflow (`site-feature-card` 331px in 310px content) still present; unrelated to this session.

## 3. Important Decisions
- Only the project owner stages, commits and pushes (AGENTS.md). Every delivery stops and reports.
- Carried: header "AFHomes / GROUP OF COMPANIES" (header only); 5 top-level nav entries; mobile green-band menu; Sales Sign-In public (owner 2026-11-18); all closing CTAs via `SiteCta`; whole home room card opens `RoomDetailsDialog`; contact maps static; group-level hero copy with resort image; FAQ limits + WAAPI accordion; mock memory-only; no new deps; namespaced classes; Redemption disabled.
- New: `SITE_HOURS` 9:00–17:00 Asia/Manila daily; badge wording "Open now / Closed now" above the eyebrow.
- New: staff-only notes name the sign-in links in the footer so public Verify Accreditation is not misread as restricted.
- New: contact redesign rejected by owner and reverted; working page is the baseline.
- Tooling: `@grill-me` resolves only to its own stub (the `grilling` target is missing); browser comments handled manually.

## 4. Completed Work
- Created this session: `src/modules/public-site/hours.ts`, `hours.test.ts`, `src/panels/public/site/open-status-badge.tsx`, `open-status-badge.test.tsx`.
- Modified this session: `public-home-page.tsx` (status pill removed), `site.css` (hero-top/badge/callout scoping), `site-chrome.css` (logo bg removal, access-note pills), `site-mobile-menu.tsx` + `site-footer.tsx` (notes + Info icons), `post-related.css`/`post-related.tsx`, `post-hero.css`, `blog/blog-card.css`, `blog/blog-featured.css`, `content/faq.ts` (sync comment only).
- Reverted this session (exact HEAD/pre-redesign restores, no `git checkout` used): `contact-message.ts` + `.test.ts`, `site/contact-form.tsx`, `pages/faq-contact-pages.tsx`, `contact/contact-page.css` (redesign block truncated), `site-pages.test.tsx` (button assertion hunk).
- Verification this session: `npx tsc --noEmit` clean and `npm run lint` clean on every run; targeted suites green (final restore run: 35 passed — contact-message 3, site-pages 12, public-links 10, site-chrome 10; badge run: 20 passed; frame run: 22 passed). Browser: badge open/closed styles, callout 0px border, both Access notes, transparent logo, related/hero/blog frames incl. responsive featured divider, restored contact page (Contact Us, Open email, 2 maps, 0 leftovers, 0 overflow). Headless-tab screenshots unavailable; DOM + computed-style verification used.

## 5. Git Working Tree
- Staged: none (verified via `git diff --cached --stat`).
- Unstaged modified (40 tracked): prior set (content site/experiences/faq; header/pages; FAQ; CTAs; room dialog/grid; maps; closings; tests) plus this session newly modified `blog-card.css`, `blog-featured.css`, `post-hero.css`, `post-related.tsx`, `site-footer.tsx`, and further edits to `public-home-page.tsx`, `site.css`, `site-chrome.css`, `site-mobile-menu.tsx`, `post-related.css`, `faq.ts`, `contact-page.css`, `faq-contact-pages.tsx`, `site-pages.test.tsx` (last three net to their pre-redesign state).
- Deleted: `compliance-closing.css`, `experience/exp-closing.css` (pre-existing).
- Untracked (8): 4 pre-existing (`room-details-dialog.{tsx,css}`, `room-preview-grid.tsx`, `site-cta.tsx`) + 4 this session (`hours.ts`, `hours.test.ts`, `open-status-badge.tsx`, `open-status-badge.test.tsx`).
- Stash `stash@{0}` ("local: sales-network cleanup + member detail redesign") still present.
- No package/lock/docs changes. LF→CRLF warnings only; `git diff --check` clean on touched files (one pre-existing EOF-blank-line in `post-related.css` trimmed this session).

## 6. Pending Tasks
- Owner review and commit of the now-larger uncommitted tree. Do not stage/commit.
- Run one full test suite and one build (never simultaneously); `business-pages` alone if needed.
- Fix the pre-existing 320px `site-feature-card` overflow under a separate plan.
- Carried owner-content questions: hot-spring count (5/10); dated blog claims; Teppanyaki count; HR email; legal review of disclaimer/compliance/Verify privacy; Smart Wellness Hotel status; privacy policy; UI22 "keep rate pictures" note in `docs/implementation/decisions-and-gaps.md`.
- Carried, not rechecked: tablet/dark mode; Customer Look Up as Finance/Clerk/OST; contact mailto hand-off; full desktop visual pass; B1 permission fixes; table priority sorting; Redemption decision; D14 rounding; Clerk Commissions; IST Clawback Addendum; points-per-night table; legal retention; real login/DB/hosting.
- Tooling: `grill-me`/`grilling` skill missing.

## 7. Verification State
- This `/save` run: no typecheck, lint, tests, build, or browser QA; documentation only.
- Latest implementation runs: typecheck clean, lint clean, all targeted suites green (see section 4). Full suite and build NOT run on the current tree.
- Browser-verified this session: badge open/closed tint+border+text; callout 0px border/26px radius; Access notes (text, icons, colors); transparent header logo; related images contain+centered with enhanced containers; hero frame halo; blog card/featured frames incl. 900px divider switch; restored contact page.
- Known failures: 320px home overflow (pre-existing). Agent-opened browser tabs intermittently drop from the session (reopen + single-pass evaluate works).
- Not performed: full suite, build, `npm install`/node_modules check, tablet/dark-mode pass, screenshot capture.

## 8. Next Session Instructions
- First action: `/load`, inspect the uncommitted tree vs HEAD c5d332f; ask the owner whether to verify/commit.
- Verify: `npx tsc --noEmit`, `npm run lint`, targeted tests, one full test run, one build (sequential), browser 375/1100/1280.
- Relevant files: `workflow/save-session.md`; `src/panels/public/pages/public-home-page.tsx`; `src/panels/public/site/open-status-badge.tsx`; `src/modules/public-site/hours.ts`; `src/shared/components/site/site-chrome.css`, `site-footer.tsx`, `site-mobile-menu.tsx`; `src/panels/public/post/post-related.{tsx,css}`, `post-hero.css`; `src/panels/public/blog/blog-card.css`, `blog-featured.css`; contact files (restored working state).
- Required approvals: owner commits; each plan before building; permission/backend/DB/API/hosting; AGENTS edits; dependency changes.
- Warnings: mock data resets on full page load; do not commit; never run build+tests simultaneously; full suite slow; do not delete `.next`; never claim visual verification without a browser; dev server may need restart; agent browser tabs may drop (use single-pass open+evaluate).

## 9. Execution Recommendation
- Phase: QA
- Current mode: not verified
- Recommended next mode: default (ask before edits)
- Current model: DeepSeek V4.1 Flash 1017 (session metadata, not independently probed)
- Recommended model: Sonnet 5.5
- Effort: medium
- Ultracode: OFF
- Token optimization: targeted typecheck/lint/tests first, then one full test run and one build; then the 320px overflow plan.
- Reason: the tree is complete and targeted-green but uncommitted and larger than last save; full verification and the commit decision remain.
<!-- SESSION_SNAPSHOT_END -->
