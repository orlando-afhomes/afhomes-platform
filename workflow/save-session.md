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
- Saved at: 2026-11-16
- Repository: afhomes-platform (remote not re-checked)
- Branch: develop
- HEAD: ca75d77 "feat: refine IGP, promos, reports, accreditation, membership, and navigation" (verified this run; unchanged since the last snapshot). Push state not verified; no fetch run.
- Session objective: (1) build the staff Customer Look Up; (2) rebuild the public Verify page with the v2 steps and output; (3) rebuild the whole public website from the old WordPress site (https://afhomes.com.ph) with new content-faithful pages and a new design. Dos wants every reply in plain "explain like I am 5" language, with the nickname Dos first.
- Development phase: frontend prototype with mock data, QA stage. Only the owner declares frontend completion. Backend, database, API and hosting are skipped until then (owner, 2026-11-16).
- Context note: the context was compacted at least once. Models used: Sonnet 5.5 and Opus 5.5 (switched with /model; the last switch was to Sonnet 5.5). Plan file for this work: `C:\Users\SSD-ORLANDO\.claude\plans\create-a-customer-look-purring-chipmunk.md` (holds the latest public-website plan). Scratch files live in the session scratchpad and may be gone (picture download script and the originals).

## 2. Current Project State
- Committed by the owner in ca75d77 (earlier work, not re-inspected): UI19 plain words, Title Case test fixes, IGP, promos, reports, membership.
- Built this session and NOT committed (verified in the working tree):
  - **Staff Customer Look Up (UI21):** new tab "Customer Look Up" under Customers (`src/panels/admin/pages/customer-lookup-panel.tsx`, route tab `lookup` in `src/panels/admin/navigation.ts`). New operation `customers.lookup` (Super Admin, Admin, Clerk, Finance; not sellers) in `src/modules/identity/permissions.ts`. New `lookupActiveVip(term)` on the membership repository (contract and mock), hook `useCustomerLookup` in `src/data/business-queries.ts`. Search from 2 characters, partial match on name, Customer ID, VIP Number and email, active unexpired memberships only, up to 50, 6 suggestions, then the real tier card image with name, VIP Number, Valid Until, Customer ID and total, weekday and weekend points. The v2 ID-picture side is not built.
  - **Public Verify page (UI21)** `/verify`: AA number, privacy notice tick, visitor name/email/mobile (receipt kept 24 hours in memory), 3 successful checks a day (memory only), then a result with masked name (`src/modules/accreditation/public-name.ts`), photo, Copy ID, Accredited or Expired, type, Valid until (OST only) and the support and bank block. Files: `src/panels/public/pages/accreditation-verification-page.tsx`, `components/verify-dialogs.tsx`, `components/verify-result-card.tsx`, `verify-session.ts`, `src/modules/public-site/support-info.ts` (v2 bank and support values), `privacy-notice.ts` (draft wording). The contract `PublicAccreditationResult` gained `maskedName` and `photoUrl`.
  - **New public website (UI22):** routes `/about`, `/vip-privilege`, `/compliance`, `/faq`, `/contact`, `/blog`, `/blog/[slug]` (9 posts), `/experiences/hotspring-ecofarm-resort`, `/experiences/smart-wellness-hotel`, `/experiences/alm-japanese-restaurant`, plus a new home. Content is typed data in `src/modules/public-site/content/{site,about,experiences,faq,compliance,vip,blog}.ts`. UI in `src/panels/public/pages/` and `src/panels/public/site/` (`blocks.tsx`, `gallery.tsx`, `faq-list.tsx`, `contact-form.tsx`, `blog-index.tsx`), header with Experiences dropdown and phone menu (`components/public-header.tsx`, `public-mobile-menu.tsx`), footer, and `src/panels/public/site.css` (namespace `site-*`, imported by `PublicLayout`). `public.css` now holds only the layout and the Verify page. 64 pictures (shrunk WebP, 13 MB) are in `public/images/site/`. Contact form validates, then opens the visitor's email app to info@afhomes.com.ph (`src/modules/public-site/contact-message.ts`).
  - **Earlier uncommitted work still in the tree** (from the previous session, see its snapshot facts): the Non-Standard contract approval (doc 05 items 31 and 32, UI20), the wizard fix, the notification word swap, and the admin sidebar and topbar redesign (`admin-brand.tsx`, `use-admin-user.ts`, shell components, `--gradient-brand-logo` in `tokens.css`).

## 3. Important Decisions
- Owner, 2026-11-16 (UI21): Customer Look Up is a STAFF page, not public (keeps R11: no public customer or card lookup). Verify copies the v2 output and steps, with the v3 rules kept (Expired is shown, OST shows Valid until, IST does not). v2 bank and support values were copied. Visitor details are never stored or shown back.
- Owner, 2026-11-16 (UI22): download a chosen set of pictures (done, 64); the contact form opens the email app; all 9 blog posts in full with a category filter; the VIP page keeps the old numbers but uses the doc 09 wording (points released each year when the qualifying spend is met, not "upon activation"). The owner chose to KEEP the old villa pictures that have room rates printed inside them (King Villa picture and floor plans show rates such as 25,000 and 35,000). The UI22 note in `docs/implementation/decisions-and-gaps.md` does not yet record this "keep" answer (offered to add it; not done).
- Earlier decisions still binding: UI5 to UI20, A1 to A8; only the owner commits or pushes; SweetAlert2 only through `AppAlert` and `useConfirmRun`; mock data in browser memory only; no new dependencies; max 5 table columns; namespaced kebab-case classes; no gold in the shell; a public header must not use `usePathname` (it broke the production build); dynamic route params must be read inside a `Suspense` boundary.
- Hot-spring count: shown nowhere (old site says "over 10" on About and "over 5" in the FAQ); owner has not answered.

## 4. Completed Work
- Verified this session: all three features above built; typecheck, lint, build and tests pass (section 7). Browser checks: Verify flow (desktop and phone), Customer Look Up as Super Admin, every new public page loads with no sideways scroll and no broken pictures, phone menu, villa photo viewer.
- Docs updated: docs 01, 03 (section 9.3 note and new 9.4), 04, 11, and decision entries UI21 and UI22 in `docs/implementation/decisions-and-gaps.md`.
- Tests added: public-name, verify-session, verify page, customer-lookup, contact-message, site pages (FAQ, VIP, contact, blog post), links and picture-path checks; navigation tests updated.

## 5. Git Working Tree
- Staged: none (verified).
- Unstaged: 53 tracked files changed, 1662 insertions, 316 deletions (verified). Includes the earlier Non-Standard and shell redesign work plus this session's edits (public pages, repositories, permissions, navigation, docs, tests).
- Untracked (verified): 47 source and test files outside pictures (new public pages, content, components, tests, routes under `src/app/{about,blog,compliance,contact,experiences,faq,vip-privilege}`, `public-name`, `customer-lookup-panel.tsx`, `admin-brand.tsx`, `non-standard-terms-fields.tsx`, `use-admin-user.ts`) and 64 pictures under `public/images/site/`.
- Deleted or renamed: none. Stash `stash@{0}` "local: sales-network cleanup + member detail redesign" is still kept.
- Origin: this session's work plus the previous session's uncommitted work; not separated. Git only warns about LF to CRLF.

## 6. Pending Tasks
- Owner: review and commit the working tree (owner only).
- Owner answers needed (not blocking): hot-spring count (5 or 10); keep, edit or archive the old blog posts with dated claims (REBAP 50% VIP promotion and "potential investors"; Expo post "over 20 hectares" and "600 staycation units"); the Teppanyaki Lounge count (four in the text, two in a caption); whether to show the HR email; legal review of the disclaimer, compliance statements and the verify privacy notice; update the Smart Wellness Hotel status once it opens (grand opening November 2026); a privacy policy page.
- Add the "keep the rate pictures" answer to UI22 (small docs edit, not done).
- Not yet checked: tablet width and dark mode for the new public site and the shell; Finance, Clerk and OST logins for Customer Look Up in the browser (only Super Admin was checked); a real contact-form hand-off to an email app; a visual pass of every desktop page.
- From earlier snapshots, still open: priority sorting for every table; B1 permission fixes (`sales-network.*` for svd, ssm, sm; Admin adds IST and OST; `finance.refund` for admin; remove the `requestedBy` check in `finance-cancellation-detail-page.tsx`; delete the customer-status copy in `membership-repository.ts`); the Redemption decision (docs say disabled, mock UI live); small word items ("DSC" in the approve-deal error, mixed capital letters, some hard words); the commission rounding rule (D14); the Clerk Commissions visibility question. Outside the team: signed IST Clawback Addendum, real points-per-night table, legal retention period, real login, database and hosting.

## 7. Verification State
- Typecheck: `npx tsc --noEmit` clean (verified after the last code change).
- Lint: `npm run lint` clean (verified).
- Tests: full run without `business-pages`: 161 files passed; 2 files (`staff-page.test.tsx`, `payment-reference-fields.test.tsx`, 9 tests) timed out under full-run load and passed when run alone (24 tests). `business-pages.test.tsx` run alone: 103 passed.
- Build: `npm run build` passed after the final change (all 9 blog posts prerendered). The first build failed because the public header used `usePathname`; fixed.
- Browser QA: see section 4. Not done: tablet, dark mode, non-Super-Admin logins, real email hand-off.
- Known failures: none known beyond the slow-test timeouts under full-run load. The dev server was stopped by the user during the session, so a possible dev-only warning about `/blog/[slug]` params was not rechecked; the production build is clean.

## 8. Next Session Instructions
- Recommended first action: `/load`, ask Dos to commit the working tree (it is large), then ask which to do next: record UI22 "keep" answer, a tablet and dark-mode pass of the public site, the content questions in section 6, table priority sorting, or the B1 permission fixes.
- Relevant files: `docs/implementation/decisions-and-gaps.md` (UI19 to UI22), `src/modules/public-site/content/`, `src/panels/public/`, `src/panels/admin/pages/customer-lookup-panel.tsx`, `src/modules/identity/permissions.ts`, `src/panels/admin/navigation.ts`.
- Required approvals: any commit or push (owner only); each plan before building; permission changes; backend, database, API or hosting work; `AGENTS.md` edits; downloads (the pictures were approved once, per file list).
- Warnings: mock data resets on any full page load, so do browser walkthroughs without reloading; do not run the build and the tests together; run `business-pages` alone; the full test run shows slow-test timeouts that pass alone; do not delete `.next`; keep room-rate pictures as the owner chose; never claim visual verification without a browser run.

## 9. Execution Recommendation
- Phase: QA
- Recommended next mode: default (ask before edits)
- Recommended model: Sonnet 5.5
- Effort: medium
- Ultracode: OFF
- Token optimization: after Dos commits, do one tablet and dark-mode pass of the public site, then plan one item at a time; run targeted tests first and one full run plus one build at the end.
- Reason: the features are built and checked; what remains is review, owner content decisions and approved plans.
<!-- SESSION_SNAPSHOT_END -->
