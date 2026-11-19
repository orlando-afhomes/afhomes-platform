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
- Saved at: 2026-11-19 11:24 (first save today; supersedes the 2026-11-18 22:53 snapshot).
- Repository: afhomes-platform (remote not re-checked; no fetch run).
- Branch: develop. HEAD: 44c8e0f "docs: align project documentation with 2026-11-18 owner decisions" (verified). No commits were made this session.
- Tool and model: OpenCode, DeepSeek V4.1 Flash 1017 (session metadata; not independently probed).
- Session objective: restore context with `/load`, run the site locally, then implement the owner's browser feedback: favicon, nav active state, footer Access motion, skeleton loaders, button identity/motion/palette, room modal, dropdown auto-close, experience status, contact order and blog backdrops.
- Development phase: frontend prototype on typed in-memory mock data. Backend, real authentication, database and deployment remain deferred.
- Context note: no compaction. Plans live outside the repo at `C:\Users\SSD-ORLANDO\.opencode\plan\2026-11-18-favicon.md` and `C:\Users\SSD-ORLANDO\.opencode\plan\2026-11-19-ui-feedback-batch.md`.

## 2. Current Project State
- Verified this run: `develop` at 44c8e0f; nothing staged; 51 tracked files modified, five deleted and six untracked (section 5). No commits this session.
- The dev server is running at http://localhost:3000 (background shell `sh_1f1ac3972001NaZxtTTd3hMhmy`, PID 23912). It was restarted for favicon and loading-state checks.
- Public favicon is the AF monogram: `src/app/icon.png` 512, `src/app/apple-icon.png` 180, branded `src/app/favicon.ico` 48/32/16. The default Next favicon was replaced and the five starter SVGs were deleted.
- Public header nav active state is pathname-driven (`aria-current`); the footer Access block is a button disclosure with a measured max-height transition; room photos open an immersive gallery.
- Button identity lives in `src/panels/public/site/site-actions.ts`. Standard primary is green, standard secondary is ghost white, gold stays for Join VIP and VIP Privilege; home and about keep the white primary on dark via `primaryTone="contrast"`. Every action icon lifts 2 px upward on hover.
- Documentation baseline unchanged: 14 business rules, 10 development docs, 19 implementation docs, plus `docs/project.md`, `AGENTS.md`, `CLAUDE.md` and `PRODUCT.md`.
- Current focus: owner review and manual commit of the accumulated UI work; then the three open policy decisions and the Phase 2 admin plan.

## 3. Important Decisions
- Only the project owner stages, commits, pushes, merges or deploys. No agent Git writes were performed.
- Favicon: AF monogram only, transparent background, centered square; use Next file conventions in `src/app`; remove the `metadata.icons` override; delete the starter SVGs.
- Nav: active state from `usePathname`, not route-class CSS, because Next keeps hidden prefetch/loading shells with a bare `.site-home`.
- Footer Access: button disclosure with `aria-expanded`/`aria-controls`/`inert` and a measured max-height transition; native `<details>` could not animate reliably.
- Skeletons: neutral grays only, left-to-right 1.6 s shimmer, 112 px top clearance, reduced motion instant.
- Buttons: one identity per action (icon plus role); standard primary green, secondary ghost white, premium gold; home/about white primary exception; icons lift upward; per-button-family timings (SiteButton 350 ms, header actions 400 ms, blog chips 300 ms, utility shadcn 150 ms).
- Room modal: charcoal immersive gallery with blurred stage, counter, thumbnail rail, ArrowLeft/ArrowRight and stage focus on open.
- Dropdowns: close by unmounting the panel on a link click; no exit animation.
- Experience status sits above the eyebrow; contact details follow the form; blog covers use a blurred backdrop with an 8–10 px padded frame.
- No business rules, routes, permissions, identifiers, prices or dependencies changed.

## 4. Completed Work
- Favicon: connected-component isolation of the AF monogram from `public/images/logo.png`; 512/180 PNGs and a 48/32/16 DIB ICO; removed the layout metadata override; deleted `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`. Served hashes matched disk and the icon links pointed at the new files.
- Nav/footer: `site-header-link.tsx` plus `isActiveNavHref`; dropdown `aria-current`; old route-class active CSS removed; `site-footer-access.tsx` with animated max-height. 91 public/shared tests passed at that stage.
- UI batch: gray skeletons with header clearance, action registry and full `SiteButton` migration, immersive room gallery, auto-closing dropdowns, experience status at the hero top, contact form before details, blog blurred backdrops. 99 public/shared tests passed; tsc and ESLint clean.
- Motion: base transition includes transform/filter; SiteButton filter/transform and 350 ms icon transform; icons lift up; header action icons at 400 ms; FAQ chevron 200 ms; footer toggle 200 ms; login submit 180 ms; blog feature icon override removed.
- Palette: VIP hero Contact us green plus Payment steps ghost; experience heroes one green primary plus ghost secondary; View plan green; home/about white primary exceptions; gold premium preserved. Final focused tests 18 passed; tsc and ESLint clean.

## 5. Git Working Tree
- Staged: none.
- Unstaged (this session, grouped): favicon/layout/globals; skeleton loaders; public header/footer/nav; all button-migration pages under `src/panels/public`; room dialog; blog cards/featured; contact/FAQ/closing pages; `site.css`, `site-chrome.css`, `public-skeletons.*`, `site-pages.test.tsx`, `public-links.test.tsx`, `site-chrome.test.tsx`, `site-actions.test.tsx`.
- Unstaged (pre-existing only, from the 2026-11-18 session, not touched now): `src/panels/public/blog/blog-hero.css`, `src/panels/public/contact/contact-page.css`, `src/panels/public/vip/vip-hero.css`, `src/shared/components/site/site-components.css`, `src/shared/components/site/site-mobile-menu.tsx`.
- Untracked: `src/app/icon.png`, `src/app/apple-icon.png`, `src/panels/public/site/site-actions.ts`, `src/panels/public/site/site-actions.test.tsx`, `src/shared/components/site/site-footer-access.tsx`, `src/shared/components/site/site-header-link.tsx`.
- Deleted: `public/file.svg`, `public/globe.svg`, `public/next.svg`, `public/vercel.svg`, `public/window.svg`.
- `workflow/save-session.md` is modified by this save; its previous snapshot was already uncommitted. No commits this session. `stash@{0}` ("local: sales-network cleanup + member detail redesign") is still present.
- No renamed files.

## 6. Pending Tasks
- Owner review and manual commit of the whole working tree.
- GATE-1: doc 09 Non-Activated tranche rule (`09:178`) versus the late-bill release (`09:180`, `10:153-154`).
- GATE-2: doc 11 unapproved PHP 1,000,000 monthly SM target (`11:369`) versus doc 08 SM PA target (`08:383`).
- Protected-operation wording: `06:115`, `06:284`, `08:404`, `12:204` versus doc 01's overriding authority rule.
- Phase 2 admin plan from `docs/implementation/ui-state-audit.md`.
- Optional verification: full repository suite, production build (Google Fonts unreachable in this environment), visual skeleton capture.
- Pre-existing failures: `admin-mobile-nav.test.tsx` drawer-logout expectation; three admin files time out under full-suite load; 320 px home overflow from `site-feature-card`.
- Header keeps gold Join VIP and outlined Verify on every page; utility shadcn buttons keep static icons and 150 ms; bespoke login submit and home verification callout keep their palettes. The owner may extend the rule.
- Home/about exception is explicit; future dark primary actions there need `primaryTone="contrast"`.

## 7. Verification State
- Tests: 99 public/shared tests in 12 files passed after the UI batch; 18 focused action/page tests passed after the palette and motion changes. Full repository suite not run this session.
- Typecheck: `npx tsc --noEmit` clean after the latest TypeScript changes.
- Lint: ESLint clean on all touched public/shared folders and files.
- Build: not run; the dev server logs Google Fonts download failures, so a production build would hit the same network limitation.
- Browser QA: favicon served hashes and icon links; nav active states at `/`, `/vip-privilege`, `/about` and `/blog`; dropdown panels unmount after link clicks; footer animation heights; modal focus, ArrowRight and Escape; contact order; blog two images per cover; experience status centered at 390 px; button classes/icons and hero-action screenshots.
- Hover checks: computed transition properties and final hover targets were verified with transitions temporarily disabled because the Chrome window froze transition frames during capture.
- Known limits: skeleton loading UI was too brief to screenshot; the modal's initial focus is a manual stage ref callback; popovers close without an exit animation; the green primary on dark photos is a deliberate owner choice.
- Diff check: `git diff --check` clean apart from LF/CRLF warnings.
- Not performed: full suite, production build, screenshot of skeletons, visual regression.

## 8. Next Session Instructions
- First action: `/load`; confirm `develop` at 44c8e0f. Expect the large uncommitted UI working tree; do not discard or revert it.
- Owner should review and commit the work before further code changes.
- Inspect the two plan files outside the repo, `src/panels/public/site/site-actions.ts`, `src/shared/components/site/site-chrome.css`, `room-details-dialog.*`, and `public-skeletons.tsx`.
- After the commit: resolve GATE-1, GATE-2 and the protected-operation wording; then plan Phase 2 admin states.
- Required approvals: owner commits; any business-rule edits; backend/database/auth/deployment; any palette extension beyond the current exception.
- Warnings: keep live Redemption and Services disabled; no public customer or card lookup; preserve reduced-motion behavior and the home/about exception; the snapshot is a progress reference, not authority over the code or business rules.

## 9. Execution Recommendation
- Phase: QA complete for the UI work; next is owner review and commit.
- Current mode: not verified.
- Recommended next mode: owner review/commit, then Plan for the three policy gates.
- Current model: not verified (session metadata names DeepSeek V4.1 Flash 1017).
- Recommended model: Sonnet 5.5.
- Effort: medium.
- Ultracode: OFF.
- Token optimization: review the working tree by area from section 4; no need to reread the documentation baseline.
- Reason: every requested UI change is implemented, tested and browser-checked; only the owner's commit and the open policy decisions remain.
<!-- SESSION_SNAPSHOT_END -->
