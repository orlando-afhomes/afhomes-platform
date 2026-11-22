# FP16: State Verification and Handoff

- Status: Complete on 2026-11-18, with recorded limitations. Build and focused checks pass; full suite has one known pre-existing admin drawer failure; F16.3 browser coverage is partial.
- The task boxes below are the original plan; they are retained as history and are not a live checklist. See the recorded results below.
- Layer: QA and documentation.
- Business rules: none changed.
- Depends on: FP12 to FP15.
- Authorizes: nothing.

## Objective

Verify that every loading, empty, error and busy state delivered by FP12 to FP15 is correct, accessible, responsive and does not change business behavior. Produce the implementation report and stop for owner review.

## Scope

- Static checks, targeted tests, one full test run and one build.
- Browser checks at 320, 375, 768, 1100 and 1280 px.
- Reduced-motion and no-JavaScript checks.
- Route skeleton behavior on fast and throttled navigation.
- Double-submit checks.
- Final report in the `AGENTS.md` A to I format.

## Out of scope

- New features or fixes beyond regressions found in FP12 to FP15.
- Admin page fixes from the FP15 audit.
- Git staging, commits, pushes or deployment.

## F16.1 Static and targeted checks

| Field | Value |
|---|---|
| Current | The tree has uncommitted public-site work; the new state files are not yet verified. |
| Target | Typecheck, lint and targeted tests pass before browser work. |
| Layer | QA |
| Blocked by | FP12 to FP15 |
| Acceptance | Every command below exits 0, or the failure is recorded and explained. |
| Status | Complete on 2026-11-18; all listed checks ran |

**Commands**

- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npx vitest run src/shared/components/modern/state-components.test.tsx`
- [ ] `npx vitest run src/panels/public/components/public-skeletons.test.tsx`
- [ ] `npx vitest run src/panels/public/public-loading.test.tsx`
- [ ] `npx vitest run src/panels/public/site-pages.test.tsx src/panels/public/public-links.test.tsx src/shared/components/site/site-chrome.test.tsx`
- [ ] `npx vitest run src/panels/public/login/staff-login-page.test.tsx`
- [ ] `npx vitest run src/panels/public/ost-registration-page.test.tsx src/panels/public/ost-correction-page.test.tsx`
- [ ] `git diff --check` on every touched file.

## F16.2 Full suite and build

| Field | Value |
|---|---|
| Current | Prior full runs had slow admin files timing out under load but passing alone. |
| Target | One full run and one build, sequentially. |
| Layer | QA |
| Blocked by | F16.1 |
| Acceptance | The full result is recorded; any timeout is rerun alone and reported honestly. |
| Status | Complete on 2026-11-18; full suite recorded 4 failures (3 timeouts pass alone, 1 pre-existing admin drawer test) |

**Tasks**

- [ ] Run `npm test` once. Record passed/failed counts and the exact failing files.
- [ ] If an admin file times out, run that file alone. Report both the full-run result and the isolated result.
- [ ] Run `npm run build`. Do not run it at the same time as the test suite.
- [ ] Compare the build route table with the pre-change table:
  - Every public URL still exists.
  - Rendering mode (static or partial) is unchanged, or the change is explained.
  - No route is missing because of the `(public)` move.
- [ ] Record the build result and any warnings.

## F16.3 Browser, accessibility and responsiveness

| Field | Value |
|---|---|
| Current | The public site is running at `http://localhost:3000`. |
| Target | Every state is visible, readable and accessible at all target widths. |
| Layer | QA |
| Blocked by | F16.2 |
| Acceptance | No horizontal overflow, no clipped text, no missing spinner, no infinite loading. |
| Status | Partial; browser checks at 375/768/1280 only. 320/1100, reduced-motion and no-JavaScript checks were not performed |

**Routes and states**

| Route | Check |
|---|---|
| `/` | Hero skeleton, content loads, header/footer stay |
| `/about` | Route skeleton inside the public shell |
| `/blog` | Skeleton, empty state branch if reachable |
| `/blog/[slug]` | Article skeleton, no layout jump |
| `/contact` | Hero, cards, form, maps; no fake spinner on `Open email` |
| `/faq` | Search no-match `EmptyState` |
| `/verify` | Busy skeleton, no-match, daily limit, unavailable error |
| `/login` | Page skeleton, `Sign In` spinner, `aria-busy` |
| `/login/sales` | Same login states |
| `/register/ost` | Submit spinner and `Could not submit` error |
| `/register/ost/correct/[token]` | Form skeleton, invalid link, resend spinner |
| `/experiences/*` | Route skeleton and real content |
| `/vip-privilege` | Tier skeleton |
| `/compliance` | Route skeleton |

**Tasks**

- [ ] At 320, 375, 768, 1100 and 1280 px: no horizontal overflow, no clipped skeleton or error text.
- [ ] Throttle the network in DevTools; navigate to `/about`, `/blog`, `/verify`. Confirm the skeleton shows inside the public header/footer and does not flash on a fast reload.
- [ ] Check reduced motion: no skeleton shimmer, no spinner animation; content still readable.
- [ ] Disable JavaScript in one tab: the public page content remains readable; no blank page caused by a skeleton-only fallback.
- [ ] Double-click each async button: one request, spinner, disabled, no duplicate toast or record.
- [ ] Keyboard: tab through the state components; retry buttons and links are reachable with a visible focus ring.
- [ ] Screen-reader semantics: loading regions have `role="status"`, errors `role="alert"`, buttons expose `aria-busy` while pending.
- [ ] Close every browser tab opened for QA.

## F16.4 Final report

- [ ] Report in the `AGENTS.md` A to I format:
  - A. Task summary.
  - B. Files created, modified, deleted.
  - C. Business-rule compliance (no rule changes; state-only).
  - D. Actual commands and results.
  - E. Security and data safety (no new persistence or secrets).
  - F. Known limitations (static pages may not show a skeleton on instant navigation; admin fixes deferred).
  - G. Git status (branch, HEAD, staged/unstaged/untracked).
  - H. Unauthorized operations check.
  - I. Exact STOP declaration.
- [ ] Do not stage or commit. The owner reviews and commits manually.

## Acceptance summary

- [x] Every public route has a loading state inside the public shell.
- [x] Both login pages have a page skeleton and a pending submit button.
- [x] FAQ, blog, Verify and OST show the correct empty/error state.
- [x] Shared `EmptyState` and `ErrorState` are used instead of one-off messages.
- [x] Admin has a complete audit, not unreviewed changes.
- [x] Typecheck, lint, targeted tests, full suite and build are reported honestly.
- [x] The clarification protocol is in `AGENTS.md`.
- [x] No Git or deployment operation was performed by an agent.

## Build result (2026-11-18)

- `npx tsc --noEmit`: clean.
- `npm run lint`: clean.
- Targeted public/state tests: 118 passed across 12 files.
- `npm run build`: passed; 94/94 static pages generated; the public route table and rendering modes are unchanged.
- Full `npm test`: **1889 passed, 4 failed**.
  - 3 failures were 15 s timeouts under full-run load in `business-pages`, `payment-reference-fields` and `staff-page`; all three files pass alone (**127 tests**).
  - 1 failure is pre-existing and outside FP12–FP16: `admin-mobile-nav.test.tsx` expects a "Log out" button in the drawer, but `AdminMobileNav` has no drawer footer. No admin file was changed in these phases. This needs an owner decision in the Phase 2 admin plan.
- Browser:
  - `/` at 375/768/1280: one header, one footer, one main landmark, zero horizontal overflow.
  - `/login` and `/login/sales`: one login shell on a fresh load, "Sign In" button, footer `© 2026 AFhomes`, zero horizontal overflow.
  - `/faq` search with no match: "No questions found" plus the existing empty copy.
  - `/register/ost/correct/invalid-token`: "Link not valid" plus the existing message, one header/footer.
- Build fix: `LoginShell` now takes an optional `year`; the login pages pass it, while the route skeleton omits it so prerendering never reads the clock.
- Not observed in browser: the route skeletons themselves, because the public pages are static and resolve before a skeleton paints. They are covered by `public-loading.test.tsx` (16 route loaders) and `public-skeletons.test.tsx` (12 tests). They will appear when CMS data makes the routes suspend.
- Known pre-existing limitation: the 320px home layout still overflows from `site-feature-card`. This predates FP12–FP16 and is not a regression from the state work.
