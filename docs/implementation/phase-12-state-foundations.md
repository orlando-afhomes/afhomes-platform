# FP12: State Foundations

- Status: Implemented on 2026-11-18. Verified with typecheck, lint and focused tests.
- The task boxes below are the original plan; they are retained as history and are not a live checklist. See Status and Verification for the recorded result.
- Layer: Frontend (mock).
- Business rules: none changed. UI standards: `AGENTS.md` section 8.
- Depends on: none.
- Authorizes: nothing by itself. Each build task still needs project-owner approval.

## Objective

Create the shared building blocks for every loading, empty, error and busy state on the public site, both login pages and the admin site, and add the permanent clarification rule for all AI harnesses.

## Scope

- Permanent clarification protocol in `AGENTS.md`.
- Shared `EmptyState` and `ErrorState` components.
- `QueryState` updated to use `ErrorState` and support retry.
- Content-shaped public skeleton compositions.
- Component tests for all of the above.

## Out of scope

- Moving public routes into the `(public)` group; that is FP13.
- Adding route `loading.tsx` files; FP13.
- Migrating FAQ, blog, Verify and OST empty/error states; FP14.
- Admin page changes; FP15 only audits them.

## State contract (applies to FP12 to FP16)

| Situation | Required UI |
|---|---|
| First content load | Content-shaped skeleton, `role="status"`, `aria-busy="true"`, one sr-only "Loading…" |
| Background refetch | Keep existing content; show a small busy indicator, never replace content with a skeleton |
| Successful but empty | `EmptyState` with icon, title, short text and optional action; distinguish "nothing yet" from "no matches" |
| Failed load | `ErrorState` with a clear message and Retry when retrying is safe; `role="alert"` |
| Async button | `Button loading={pending}`; disabled while pending, spinner, label preserved, `aria-busy` |
| Successful action | Existing inline status or toast; no duplicate submit |
| Destructive/irreversible | Confirmation first; spinner only during the confirmed action |
| No JavaScript | Page content remains readable; the skeleton is decorative, not the only signal |
| Reduced motion | No skeleton shimmer or spinner animation |

## F12.1 Clarification protocol for all AI harnesses

| Field | Value |
|---|---|
| Current | The owner has asked that planning and interview workflows ask questions one at a time, or in small batches, with concrete options and a recommendation. |
| Target | The rule is permanent in `AGENTS.md`, which OpenCode, Codex and Claude Code read. |
| Layer | Documentation only |
| Blocked by | none |
| Acceptance | The section exists verbatim; no other part of `AGENTS.md` changes. |
| Status | Implemented on 2026-11-18 |

**File:** `AGENTS.md`.

**Task**

- [ ] Add this section after the workflow/authorization section and before the reporting format:

```markdown
## Clarification Protocol (all AI harnesses)

When using `grill-me`, `writing-plans`, or any planning/interview workflow, ask the project owner before proceeding:

- One question at a time, or a small batch of closely related questions.
- Every question offers 2 to 4 concrete options.
- Every question states a recommendation and why.
- Wait for the answers before planning or implementing.

This applies to OpenCode, Codex, Claude Code, and any other agent reading this file.
```

**Verification**

- [ ] `Select-String -Path AGENTS.md -Pattern "Clarification Protocol"` returns the section.
- [ ] `git diff -- AGENTS.md` shows only this addition.
- [ ] Do not stage or commit.

## F12.2 Shared EmptyState and ErrorState

| Field | Value |
|---|---|
| Current | `QueryState` shows a plain error paragraph. Public empty states are one-off paragraphs. Admin tables have an inline empty row. |
| Target | One accessible `EmptyState` and one `ErrorState` used by public and admin surfaces. `QueryState` forwards an optional retry. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Component tests cover rendering, roles, retry and success. Existing admin tests still pass. |
| Status | Implemented on 2026-11-18 |

**Files**

- Create: `src/shared/components/modern/empty-state.tsx`
- Create: `src/shared/components/modern/error-state.tsx`
- Modify: `src/shared/components/modern/query-state.tsx`
- Test: `src/shared/components/modern/state-components.test.tsx`

**Interfaces**

```tsx
export function EmptyState(props: {
  icon?: React.ReactNode;
  title: string;
  text?: string;
  action?: React.ReactNode;
  className?: string;
}): React.ReactElement;

"use client";
export function ErrorState(props: {
  title?: string;              // default "Something went wrong"
  text?: string;               // default "We could not load this right now."
  onRetry?: () => void;
  retryLabel?: string;         // default "Try again"
  className?: string;
}): React.ReactElement;

export function QueryState(props: {
  isLoading: boolean;
  error: unknown;
  skeleton?: React.ReactNode;
  onRetry?: () => void;
  children: React.ReactNode;
}): React.ReactElement;
```

**Tasks**

- [ ] Write failing tests first:
  - `EmptyState` renders icon, title, text and action.
  - `ErrorState` has `role="alert"`, renders the message, and calls `onRetry` on click.
  - `QueryState` loading shows `role="status"`, `aria-busy="true"`, sr-only "Loading…" and the chosen skeleton.
  - `QueryState` error shows `ErrorState` and forwards `onRetry`.
  - `QueryState` success renders only children.
- [ ] Run the test and confirm it fails for the missing components.
- [ ] Implement `EmptyState` with a centered icon tile, title, text and optional action.
- [ ] Implement `ErrorState` as a client component using `role="alert"` and the existing `Button` for Retry.
- [ ] Change `QueryState` to render `ErrorState`; keep the default `TableSkeleton`.
- [ ] Run `state-components.test.tsx`, `modern-components.test.tsx` and `centralization.test.tsx`.
- [ ] `npx tsc --noEmit` and `npm run lint`.
- [ ] Do not stage or commit.

## F12.3 Content-shaped public skeletons

| Field | Value |
|---|---|
| Current | Only the admin shell, blog-post fallback and Verify use skeletons. Public pages have no reusable skeleton composition. |
| Target | A small set of public skeleton components that match the real page shapes and can be reused when the CMS makes content dynamic. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Every skeleton announces loading, contains skeleton blocks, matches the real layout, and renders the login shell for the login pages. |
| Status | Implemented on 2026-11-18 |

**Files**

- Create: `src/panels/public/components/public-skeletons.tsx`
- Test: `src/panels/public/components/public-skeletons.test.tsx`

**Interfaces**

```tsx
export function PublicHeroSkeleton(props?: { actions?: boolean; media?: boolean }): React.ReactElement;
export function PublicSectionSkeleton(props?: { cards?: number }): React.ReactElement;
export function PublicTierGridSkeleton(): React.ReactElement;
export function PublicArticleSkeleton(): React.ReactElement;
export function PublicFormPageSkeleton(props?: { fields?: number }): React.ReactElement;
export function PublicLoginSkeleton(): React.ReactElement;
```

**Tasks**

- [ ] Write failing tests:
  - Every skeleton renders `role="status"` and `aria-busy="true"`.
  - Every skeleton renders at least one `[data-slot="skeleton"]`.
  - `PublicLoginSkeleton` renders `.login-shell` and a form skeleton.
  - No skeleton renders real page copy.
- [ ] Implement the shapes:
  - Hero: dark rounded block, pill line, two title lines, lede line, optional actions, optional media panel.
  - Section: heading lines and a responsive card grid; each card has an image block, title and two text lines.
  - Tier grid: three cards with a tall stage and two stat lines.
  - Article: title, meta, wide image and paragraph lines.
  - Form: heading, white card, label/input pairs and a button block.
  - Login: `LoginShell` around a form skeleton.
- [ ] Reuse the existing `Skeleton` primitive. It already respects reduced motion; do not add another animation.
- [ ] Run the new test, `npx tsc --noEmit` and `npm run lint`.
- [ ] Do not stage or commit.

## Verification

- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npx vitest run src/shared/components/modern/state-components.test.tsx src/shared/components/modern/modern-components.test.tsx src/shared/components/modern/centralization.test.tsx src/panels/public/components/public-skeletons.test.tsx`
- [ ] Browser is not required for this phase; the components are exercised in FP13.

## Risks

- `QueryState` gaining `onRetry` can cross a server/client boundary. Keep it used inside client components, or mark it as a client component if the build complains.
- Skeleton shapes that do not match the real layout cause visible jumps. Compare each shape with the page at 375 and 1280 before accepting FP13.

## Next phase

FP13 adds the `(public)` route group and route-level `loading.tsx` files using these skeletons.
