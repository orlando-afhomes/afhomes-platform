# FP13: Public Layout and Route Loading

- Status: Implemented on 2026-11-18. Route group and 16 loading files built; production build passes.
- Layer: Frontend (mock).
- Business rules: none changed. UI standards: `AGENTS.md` section 8.
- Depends on: FP12 (state primitives and public skeletons).
- Authorizes: nothing by itself.

## Objective

Give every public route a true route-level loading state that keeps the public header and footer mounted. Move the public pages into one route group so `loading.tsx` renders inside the shared public layout, then add content-shaped skeletons for every route and both login pages.

## Scope

- Create `src/app/(public)/layout.tsx` with `PublicLayout`.
- Move 14 public pages into the group; URLs do not change.
- Remove the repeated `PublicLayout` wrapper and duplicate `public.css` import from each page.
- Add 14 public `loading.tsx` files.
- Add login loading files and replace login/blog Suspense fallbacks.
- Update the route-existence test helper.
- Add a route-loading test.

## Out of scope

- Changing page content, metadata, business logic or routes.
- Admin pages.
- CMS data fetching. The skeletons are ready for it.

## F13.1 Public route group

| Field | Value |
|---|---|
| Current | Every public page wraps itself in `PublicLayout`. A route-level `loading.tsx` would render without the header and footer. |
| Target | One `(public)` layout owns the header, main landmark, footer and public CSS. Pages render only their content. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | URLs are unchanged; the header/footer appear exactly once; all public tests and the build pass. |
| Status | Planned |

**Files**

- Create: `src/app/(public)/layout.tsx`
- Move into `src/app/(public)/`:
  - `page.tsx` (home)
  - `about/page.tsx`
  - `blog/page.tsx`
  - `blog/[slug]/page.tsx`
  - `compliance/page.tsx`
  - `contact/page.tsx`
  - `experiences/alm-japanese-restaurant/page.tsx`
  - `experiences/hotspring-ecofarm-resort/page.tsx`
  - `experiences/smart-wellness-hotel/page.tsx`
  - `faq/page.tsx`
  - `register/ost/page.tsx`
  - `register/ost/correct/[token]/page.tsx`
  - `verify/page.tsx`
  - `vip-privilege/page.tsx`
- Keep outside the group: `login`, `login/sales`, `status/[code]`, all `admin` routes.
- Modify: `src/panels/public/public-links.test.tsx`

**Layout**

```tsx
import { PublicLayout } from "@/panels/public/layouts/public-layout";
import "@/panels/public/public.css";

export default function PublicSectionLayout({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}
```

**Tasks**

- [ ] Create the group layout above.
- [ ] Move each page to its new path with a filesystem move (PowerShell `Move-Item`). Do not use `git mv` or any Git command. Do not retype page content during the move.
- [ ] In each moved page:
  - Remove the `PublicLayout` import.
  - Remove the `<PublicLayout>...</PublicLayout>` wrapper and keep the page component as the child.
  - Remove the duplicate `import "@/panels/public/public.css"` where present; the layout imports it once.
  - Keep `metadata`, `generateStaticParams`, `generateMetadata`, feature CSS imports and the page component.
- [ ] Update the route test helper:

```ts
const APP_ROOTS = ["src/app", "src/app/(public)"];
const routeExists = (href: string) =>
  APP_ROOTS.some((root) => existsSync(join(process.cwd(), root, href.split("#")[0].slice(1), "page.tsx")));
```

- [ ] Run `npx vitest run src/panels/public/public-links.test.tsx src/panels/public/site-pages.test.tsx`.
- [ ] Run `npx tsc --noEmit` and `npm run lint`.
- [ ] Run `npm run build`; compare the route table with the previous build. Every public URL must remain, with the same rendering mode.
- [ ] Browser: `/`, `/about`, `/contact`, `/blog`, `/verify`; exactly one `<header>` and one `<footer>`, no console errors, no duplicated main landmark.
- [ ] Do not stage or commit.

## F13.2 Public route loading files

| Field | Value |
|---|---|
| Current | Only the blog-post page has an inline skeleton fallback. The other public routes have no route loading UI. |
| Target | Every public route renders a content-shaped skeleton inside `(public)/layout.tsx` while the route is loading. |
| Layer | Frontend (mock) |
| Blocked by | F13.1, FP12 |
| Acceptance | Each route has a `loading.tsx`; each renders at least one status region and one skeleton block; the header/footer remain visible. |
| Status | Planned |

**Compositions**

| Route | Skeleton |
|---|---|
| `/` | `PublicHeroSkeleton actions` + `PublicSectionSkeleton cards={3}` + `PublicTierGridSkeleton` |
| `/about` | `PublicHeroSkeleton actions` + `PublicSectionSkeleton cards={3}` |
| `/experiences/*` (3) | `PublicHeroSkeleton actions` + `PublicSectionSkeleton cards={3}` |
| `/vip-privilege` | `PublicHeroSkeleton actions` + `PublicTierGridSkeleton` + `PublicSectionSkeleton cards={3}` |
| `/compliance` | `PublicHeroSkeleton` + `PublicSectionSkeleton cards={3}` |
| `/faq` | `PublicHeroSkeleton` + `PublicFormPageSkeleton fields={1}` + `PublicSectionSkeleton cards={2}` |
| `/blog` | `PublicHeroSkeleton` + `PublicSectionSkeleton cards={3}` |
| `/blog/[slug]` | `PublicArticleSkeleton` |
| `/contact` | `PublicHeroSkeleton` + `PublicSectionSkeleton cards={2}` + `PublicFormPageSkeleton fields={4}` + `PublicSectionSkeleton cards={2}` |
| `/verify` | `PublicFormPageSkeleton fields={1}` + `PublicSectionSkeleton cards={1}` |
| `/register/ost` | `PublicFormPageSkeleton fields={4}` |
| `/register/ost/correct/[token]` | `PublicFormPageSkeleton fields={4}` |
| `/login` | `PublicLoginSkeleton` |
| `/login/sales` | `PublicLoginSkeleton` |

**Tasks**

- [ ] Create a `loading.tsx` for every route in the table, with a default `Loading()` export.
- [ ] Put the public route loading files under `src/app/(public)/...`.
- [ ] Put the login loading files at `src/app/login/loading.tsx` and `src/app/login/sales/loading.tsx`; they are outside the group because the login shell owns its own layout.
- [ ] Replace the inline `<p role="status">Loading sign in…</p>` fallbacks in `src/app/login/page.tsx` and `src/app/login/sales/page.tsx` with `PublicLoginSkeleton`.
- [ ] Replace the inline skeleton in `src/app/(public)/blog/[slug]/page.tsx` with `PublicArticleSkeleton` inside the existing `Suspense`.
- [ ] Create `src/panels/public/public-loading.test.tsx`:
  - Import every `loading.tsx` default export.
  - Render each one.
  - Assert at least one `role="status"` and at least one `[data-slot="skeleton"]`.
- [ ] Run the new test, `npx tsc --noEmit` and `npm run lint`.
- [ ] `npm run build`; confirm the route table remains unchanged. If a loading file changes a route from static to partial, report it before continuing.
- [ ] Browser with DevTools throttling: `/about`, `/blog`, `/verify`. Confirm the skeleton appears inside the public shell and the header/footer do not remount.
- [ ] Do not stage or commit.

## Verification

- [ ] `npx tsc --noEmit`
- [ ] `npm run lint`
- [ ] `npx vitest run src/panels/public/public-links.test.tsx src/panels/public/site-pages.test.tsx src/panels/public/public-loading.test.tsx`
- [ ] `npm run build`
- [ ] Browser route table and shell checks.

## Risks

- **Route moves:** a missed page or a stale import will break a URL. Use the full list above and check the build route table.
- **Route test helper:** without the second root, every public link test fails after the move.
- **Static/partial rendering:** `loading.tsx` can change route behavior under Cache Components. Compare the build output before and after.
- **Double shell:** if a moved page still renders `PublicLayout`, the header/footer appear twice. This must be caught in browser review.

## Next phase

FP14 fills the public empty/error states and standardizes the login submit button.
