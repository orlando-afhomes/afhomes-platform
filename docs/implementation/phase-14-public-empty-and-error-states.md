# FP14: Public Empty, Error and Login States

- Status: Implemented on 2026-11-18. FAQ/blog/Verify/OST states and login submit state verified.
- Layer: Frontend (mock).
- Business rules: none changed. Do not change copy, validation or daily-limit logic.
- Depends on: FP12 (shared state components and skeletons), FP13 (public layout and loading files).
- Authorizes: nothing by itself.

## Objective

Replace one-off public empty and error messages with the shared components, make every async public action show a spinner and block double submits, and standardize both login pages.

## Scope

- FAQ no-match state.
- Blog empty state.
- Verify failure, limit and unavailable states.
- OST registration submit error.
- OST correction loading, invalid-link and submit-error states.
- Login submit button and page fallback.
- A public async-button audit.

## Out of scope

- Changing FAQ, blog, Verify or OST copy.
- Changing validation, daily limits, registration rules or mailto behavior.
- Admin pages; FP15 audits only.

## Public async-button audit

| Button | Async? | Required state |
|---|---|---|
| Login `Sign In` | Yes, 400 ms mock latency | `Button loading`, spinner, `aria-busy`, disabled |
| Verify `Search` | Yes, repository lookup | Existing `loading={busy}` is correct |
| Verify dialog `Verify accreditation` | Yes | Existing `loading={busy}` is correct |
| OST `Verify sponsor` | Yes | Existing `loading={verifying}` is correct |
| OST `Submit application` | Yes | Existing `loading={submitApplication.isPending}` is correct |
| OST correction `Resend application` | Yes | Existing `loading={resubmit.isPending}` is correct |
| Contact `Open email` | No, synchronous mailto | No spinner; keep the status note |
| Verify `Copy AA number` | No, clipboard | No spinner |
| Form step `Continue` / `Previous` / `Change code` | No, synchronous validation/navigation | No spinner |
| Navigation CTAs and links | No, route navigation | No spinner |

## F14.1 FAQ and blog empty states

| Field | Value |
|---|---|
| Current | FAQ renders a plain paragraph when no question matches. Blog renders a dashed paragraph when there is no featured post. |
| Target | Both use `EmptyState` with an icon, title and the existing copy. |
| Layer | Frontend (mock) |
| Blocked by | FP12 |
| Acceptance | Existing empty copy is unchanged; the `EmptyState` is readable at 320 px and announced in the results region. |
| Status | Planned |

**Files**

- Modify: `src/panels/public/faq/faq-questions.tsx`
- Modify: `src/panels/public/blog/blog-browser.tsx`
- Modify: `src/panels/public/site-pages.test.tsx` (assertions only)

**Tasks**

- [ ] FAQ: replace `<p className="faq-questions__empty">{empty}</p>` with:

```tsx
<EmptyState icon={<Search aria-hidden="true" />} title="No questions found" text={empty} />
```

- [ ] Blog: replace `<p className="blog-browser__empty" role="status">{BLOG_PAGE.empty}</p>` with:

```tsx
<EmptyState icon={<Newspaper aria-hidden="true" />} title="No stories yet" text={BLOG_PAGE.empty} />
```

- [ ] Keep the `FAQ_PAGE.questions.empty` and `BLOG_PAGE.empty` strings unchanged.
- [ ] FAQ search test: assert the exact `FAQ_PAGE.questions.empty` text still appears after a no-match search.
- [ ] Blog empty branch is unreachable with current data; do not add artificial empty data. The `EmptyState` component test covers rendering.
- [ ] Run `npx vitest run src/panels/public/site-pages.test.tsx`.
- [ ] Do not stage or commit.

## F14.2 Verify empty and error states

| Field | Value |
|---|---|
| Current | The Verify page shows a busy skeleton and an `InfoNote` for every failure or limit message. |
| Target | Unavailable uses `ErrorState`; no-match and daily-limit use `EmptyState` with the same copy. Busy behavior is kept. |
| Layer | Frontend (mock) |
| Blocked by | FP12 |
| Acceptance | A failed lookup ends the spinner, shows a clear message, and cannot be confused with a loading state. |
| Status | Planned |

**File:** `src/panels/public/pages/accreditation-verification-page.tsx`

**Tasks**

- [ ] Keep the existing `busy` skeleton (`TextLinesSkeleton`) and its `role="status"` container.
- [ ] Replace the `InfoNote` failure display with a conditional:
  - `message === UNAVAILABLE` → `ErrorState title="Verification unavailable" text={message}`.
  - `message === LIMIT_REACHED` → `EmptyState title="Daily limit reached" text={message}` with a shield icon.
  - Any other non-empty message → `EmptyState title="No matching accreditation" text={message}` with a shield icon.
- [ ] Keep the `GENERIC_FAILURE`, `INVALID_NUMBER`, `LIMIT_REACHED` and `UNAVAILABLE` strings unchanged.
- [ ] Do not add Retry to the failure state; a new search is the retry path.
- [ ] Run the existing Verify tests and add assertions for the new titles if the test file covers those paths.
- [ ] Do not stage or commit.

## F14.3 OST registration and correction states

| Field | Value |
|---|---|
| Current | Registration shows a bare error paragraph on submit failure. Correction shows a plain "Loading your application…" paragraph and an `InfoNote` for an invalid link. |
| Target | Registration uses `ErrorState` for submit failure. Correction uses a form skeleton, `EmptyState` for an invalid link and `ErrorState` for resubmit failure. |
| Layer | Frontend (mock) |
| Blocked by | FP12, FP13 |
| Acceptance | Loading, invalid-link and submit-error states are visually distinct and do not change the underlying rules. |
| Status | Planned |

**Files**

- Modify: `src/panels/public/pages/ost-registration-page.tsx`
- Modify: `src/panels/public/pages/ost-correction-page.tsx`
- Modify: `src/panels/public/ost-registration-page.test.tsx`
- Modify: `src/panels/public/ost-correction-page.test.tsx`

**Tasks**

- [ ] Registration: replace the `submitError` paragraph with:

```tsx
<ErrorState title="Could not submit" text={submitError} />
```

- [ ] Registration: leave `verifyError` as the `TextField` error; it is a field-level validation message, not a page error.
- [ ] Correction: replace the loading paragraph with:

```tsx
<div role="status" aria-busy="true">
  <span className="tw:sr-only">Loading your application…</span>
  <PublicFormPageSkeleton fields={4} />
</div>
```

- [ ] Correction: replace the invalid-link `InfoNote` with `EmptyState` using a link-off icon, title "Link not valid" and `text={INVALID_LINK}`.
- [ ] Correction: replace the `submitError` paragraph with `<ErrorState title="Could not resend" text={submitError} />`.
- [ ] Keep the resubmit button's existing `loading={resubmit.isPending}`.
- [ ] Extend the correction test to assert the invalid-link title/text and the submit-error wrapper.
- [ ] Extend the registration test to assert the `Could not submit` error state.
- [ ] Run `npx vitest run src/panels/public/ost-registration-page.test.tsx src/panels/public/ost-correction-page.test.tsx`.
- [ ] Do not stage or commit.

## F14.4 Login submit and page fallback

| Field | Value |
|---|---|
| Current | The login button manually renders a `Spinner`, sets `disabled` and `aria-busy`. The page fallback is plain text. |
| Target | The shared `Button loading` handles the spinner, disabled state and `aria-busy`. Both login routes use `PublicLoginSkeleton`. |
| Layer | Frontend (mock) |
| Blocked by | FP12, FP13 |
| Acceptance | The label does not jump, double clicks do not submit twice, and the pending state is announced. |
| Status | Planned |

**Files**

- Modify: `src/panels/public/login/login-form.tsx`
- Modify: `src/panels/public/login/staff-login-page.test.tsx`
- Login page fallbacks are covered in FP13.

**Tasks**

- [ ] Replace the manual submit block with:

```tsx
<Button type="submit" className="login-form__submit" loading={submitting}>
  Sign In
</Button>
```

- [ ] Remove the `Spinner` import and the manual `disabled`/`aria-busy` props.
- [ ] Update the existing assertion `expect(submit).toHaveAttribute("aria-busy", "false")` to `expect(submit).not.toHaveAttribute("aria-busy")`.
- [ ] Add a pending test with fake timers:
  - `vi.useFakeTimers()` and `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`.
  - Type valid credentials, click `Sign In`, assert `aria-busy="true"` and a `[data-slot="spinner"]` inside the button.
  - Advance the 400 ms mock latency; assert the spinner is gone and the final state is restored.
  - Restore real timers in `afterEach`.
- [ ] Forgot-password panel is synchronous; do not add a spinner.
- [ ] Run `npx vitest run src/panels/public/login/staff-login-page.test.tsx`.
- [ ] Do not stage or commit.

## Verification

- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npx vitest run src/panels/public/site-pages.test.tsx src/panels/public/ost-registration-page.test.tsx src/panels/public/ost-correction-page.test.tsx src/panels/public/login/staff-login-page.test.tsx`
- [ ] Browser: FAQ no-match, Verify failure/limit, invalid correction link, login pending state. Confirm no spinner remains after an error and no double submit.

## Risks

- Replacing `InfoNote` can change the visual hierarchy. Keep the copy and only change the container.
- The Verify page uses one `message` state for three meanings; the title must branch on the exact constants, not on a substring.
- Fake timers with `userEvent` can hang if `advanceTimers` is not wired. Follow the setup above.

## Next phase

FP15 audits every admin page against the same state contract.
