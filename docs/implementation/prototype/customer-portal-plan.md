# AFHomes Customer Portal and Dynamic Content Prototype — Implementation Plan

> **For agentic workers:** This is a frontend-only prototype plan. Begin implementation only after the owner approves this plan and switches out of Plan mode. Follow TDD: write and observe a failing test before production code. Do not stage, commit, push, deploy, or modify business-rule documents as part of this prototype.

**Goal:** Build a browser-memory prototype for a customer loyalty portal, public Promo Points offers and rewards, dynamic Experiences content, and future VIP product drafts.

**Architecture:** Extend the existing typed mock repositories and TanStack Query patterns. Keep customer demo identity isolated from staff identity, keep Promo Points separate from Grant Stay Points, and drive public cards/pages from browser-scoped mock records. Divide delivery into three independently verifiable milestones: Loyalty Portal/Offers/GSD, Experiences content, then VIP product drafts.

**Tech Stack:** Existing Next.js App Router, React, TypeScript, TanStack Query, shadcn/ui on Base UI, Tailwind CSS 4, Vitest, and Testing Library. No new dependencies.

**Spec:** Owner-approved decisions from the OpenCode conversation on 2026-11-22; governing rules in `AGENTS.md` and `docs/business-rules/04-customer-management.md`, `05-vip-products-and-contracts.md`, `06-vip-card-issuance.md`, `09-vip-membership-and-stay-points.md`, `10-redemption.md`, and `12-audit-logs-and-governance.md`.

## Global Constraints

- All three milestones are prototype-only. Use synthetic browser-memory data; a full refresh restores the seed. Do not use localStorage, IndexedDB, a shared server singleton, real customer data, a database, API, production authentication, or deployment.
- Customer demo identity is separate from staff `DevIdentity`. Scope profile, membership, QR, ledger, and query-cache reads to the signed-in mock customer. Clear customer-scoped cache on sign-out or identity switch.
- No public customer or card lookup. Public pages may expose only published offer/experience content and explicitly public VIP-product fields; never expose customer balances, contact information, government IDs, or staff-only product fields.
- Customer profile edits are limited to Contact Information: landline, mobile, and email. Do not update address, TIN, government ID, Customer ID, VIP Number, or card data through the portal.
- Stay Points and Promo Points are separate wallets. Stay Points keep the signed Annual Welcome Gift rules and can only be used for eligible overnight accommodation. Promo Points remain governed by configured promotions and eligible outlets; they have no cash value.
- Promo Points earning occurs only through an eligible Finance-approved bill, once per bill/promo. A QR scan identifies a holder; it never credits or debits points by itself. GSD cannot approve bills. Uses require a configured named reward, its configured points cost, an eligible outlet, holder verification, and sufficient balance. Voids retain the original entry and require a reason.
- The GSD identity is a development-only persona with narrow scan/Promo Points-use capability. Do not add a production GSD role or grant broad `customers.lookup`, `promo.manage`, or `stay-points.approve` access to it.
- Promo Offers and Experiences are different content models. Promo Offers use Draft → Preview → Publish; only published, in-date offers with complete reward terms appear publicly. Experience entries publish on save after validation. Neither adds service booking or payment workflows; the separate Services module remains disabled.
- VIP product drafts remain non-saleable until Super Admin approval. New products require an approved unique two-character code, price, validity, benefits, and available payment schemes. Only approved, active, explicitly listed products appear on the public VIP page. Do not assign a VIP Number when creating or approving a product; preserve issued numbers and finalized contracts.
- Existing UI standards apply: compose current shadcn/Base UI primitives, Tailwind 4, theme tokens, accessible semantic controls, namespaced custom classes, shared confirmation components, and loading/empty/error states. No Ant Design, CSS Modules, new component system, or direct feature-level SweetAlert calls.
- Read `docs/development/testing.md` during implementation. Run targeted tests first, then the full suite and required static/build checks. No Git write operations.

## File Map

### Existing areas to extend

- **Promo data and ledger:** `src/modules/promos/types.ts`, `src/modules/promos/rules.ts`, `src/data/contracts/promo-repository.ts`, `src/data/mock/promo-repository.ts`, `src/data/mock/promo-effects.ts`, `src/data/promo-queries.ts`, and `src/data/mock/promo-repository.test.ts`.
- **Promo admin and QR:** `src/panels/admin/pages/promos-page.tsx`, `src/panels/admin/pages/promo-points-page.tsx`, `src/panels/admin/promo-pages.test.tsx`, `src/panels/admin/components/member-qr.tsx`, `src/panels/admin/components/member-qr.test.tsx`, and `src/data/mock/member-qr-repository.test.ts`.
- **Customer source records:** `src/modules/customers/types.ts`, `src/data/contracts/customer-repository.ts`, `src/data/mock/customer-repository.ts`, `src/modules/membership/types.ts`, `src/data/mock/seed-data.ts`, `src/data/query-keys.ts`, and `src/shared/providers/mock-store-provider.tsx`.
- **Public Experiences:** `src/modules/public-site/content/experiences.ts`, `src/panels/public/pages/experience-pages.tsx`, the three existing `src/app/(public)/experiences/*/page.tsx` routes, and `src/panels/public/site-pages.test.tsx`.
- **VIP products and public cards:** `src/modules/vip/types.ts`, `src/data/contracts/product-repository.ts`, `src/data/mock/product-repository.ts`, `src/panels/admin/pages/vip-products-page.tsx`, `src/panels/admin/components/vip-product-dialogs.tsx`, `src/data/business-queries.ts`, `src/modules/identity/permissions.ts`, `src/data/mock/product-repository.test.ts`, `src/panels/admin/pages/vip-products-pages.test.tsx`, `src/modules/public-site/content/vip.ts`, `src/panels/public/vip/vip-cards.tsx`, `src/panels/public/site/vip-tier-list.tsx`, and `src/panels/public/site-pages.test.tsx`.

### New areas

- Customer portal: `src/modules/customer-portal/`, `src/data/contracts/customer-portal-repository.ts`, `src/data/mock/customer-portal-repository.ts`, `src/data/customer-portal-queries.ts`, `src/shared/providers/customer-portal-provider.tsx`, `src/panels/customer-portal/`, and `src/app/portal/`.
- Public offers: `src/app/(public)/offers/page.tsx`, backed by the existing Promo repository’s public projection.
- Experiences content management: an Experiences-specific repository and tests under `src/data/`, an admin page under `src/panels/admin/pages/`, and an admin route under `src/app/admin/`.
- New tests: repository and page tests beside the corresponding modules, plus focused access/query-cache tests. Reuse seeded synthetic `cust-b1` / `memb-1` for the customer demo; do not reuse staff mock credentials.

## Review Focus

1. **Cross-customer leakage:** a customer identity switch must not retain another customer’s query result or QR. Cover in Task 4.
2. **QR side effects and scope:** scan/resolve only selects a holder; GSD cannot search customers or approve bills. Cover in Task 3.
3. **Points integrity:** only eligible approved bills earn once; reward uses enforce promo/outlet/cost/balance; voids preserve history. Cover in Tasks 1–3.
4. **Public visibility:** drafts, expired promos, incomplete rewards, and unlisted VIP products never appear publicly. Cover in Tasks 2 and 7.
5. **Existing routes and terms:** dynamic Experiences preserve the three current slugs; public VIP projection does not confuse product validity with the existing `discountYears` copy. Cover in Tasks 5–7.

---

## Phase 1 — Customer Portal, Promo Offers, and GSD Demo

### Task 1: Add dynamic named rewards to the existing Promo model

**Files**
- Modify: `src/modules/promos/types.ts`
- Modify: `src/modules/promos/rules.ts`
- Modify: `src/data/contracts/promo-repository.ts`
- Modify: `src/data/mock/promo-repository.ts`
- Modify: `src/data/mock/promo-effects.ts`
- Modify: `src/data/mock/seed.ts` and `src/modules/promos/sample-seed.ts` only as required for safe, unpublished synthetic records
- Test: `src/data/mock/promo-repository.test.ts`
- Test: `src/modules/promos/rules.test.ts`

**Interfaces**
- Add a promo-owned named reward record with an ID, name, public description/terms, eligible outlet, configured whole-point cost, and active/archived state.
- Promo use records a reward reference and the points cost used at the time of the transaction. Retain the current ledger history and do not derive rewards from a hard-coded service list.
- Keep the existing promo earn rate and Grant Stay Points model separate. Do not add numeric sample reward costs.

- [ ] **Step 1: Write failing tests.** Add tests that (a) a reward cannot be used without a configured cost and eligible outlet, (b) a use consumes the configured cost and records its reward reference, and (c) an approved-bill earn/refund still changes only Promo Points and never Grant Stay Points.
- [ ] **Step 2: Verify RED.** Run `npx vitest run src/data/mock/promo-repository.test.ts src/modules/promos/rules.test.ts`. Expected: the new reward/cost assertions fail because reward records are not yet modeled.
- [ ] **Step 3: Implement the minimal reward model and repository behavior.** Keep costs data-driven; require a configured positive whole-point cost before use.
- [ ] **Step 4: Verify GREEN.** Rerun the targeted tests and preserve the existing tests for approved-bill earning, one earn per bill, refunds, separate wallets, and insufficient balance.

### Task 2: Add public Promo Offer lifecycle and rendering

**Files**
- Modify: `src/modules/promos/types.ts`, `src/modules/promos/rules.ts`, `src/data/contracts/promo-repository.ts`, `src/data/mock/promo-repository.ts`, and `src/data/promo-queries.ts`
- Modify: `src/panels/admin/pages/promos-page.tsx` and `src/panels/admin/promo-pages.test.tsx`
- Create: `src/app/(public)/offers/page.tsx` and a focused public-offers page test

**Interfaces**
- Promo admin supports Draft, Preview, and explicit Publish. Preview does not publish.
- A public offer is derived from a published, date-valid promo with complete public terms and configured reward costs. Use a public-field projection; do not expose internal configuration or customer data.

- [ ] **Step 1: Write failing tests.** Assert that draft, expired, or incomplete promos are absent from the public offer list; a valid published promo appears with its named reward and point cost; the preview action does not change public visibility.
- [ ] **Step 2: Verify RED.** Run `npx vitest run src/panels/admin/promo-pages.test.tsx` and the new public-offers test. Expected: publication state and public listing behavior are missing.
- [ ] **Step 3: Implement the lifecycle and public read projection.** Keep existing Promo CRUD and permission rules; require terms and reward costs before Publish.
- [ ] **Step 4: Verify GREEN.** Rerun focused tests, including Asia/Manila date-boundary behavior.

### Task 3: Add a narrow, development-only GSD QR service flow

**Files**
- Modify: `src/data/mock/dev-identities.ts` and the development-only identity/grant helper
- Modify: `src/data/contracts/member-qr-repository.ts`, `src/data/mock/member-qr-repository.ts`, and the shared scanner UI as needed
- Modify or create: a GSD-only scan/use panel under `src/panels/admin/pages/` and its route under `src/app/admin/`
- Test: `src/data/mock/member-qr-repository.test.ts`, `src/panels/admin/components/member-qr.test.tsx`, and the focused GSD panel/repository tests

**Interfaces**
- Add a development-only GSD persona and a narrow Promo Points operation. Do not add a production GSD role or grant `customers.lookup`, `promo.manage`, or `stay-points.approve`.
- QR resolution returns only the holder information needed for the operation. Do not reuse the broad staff name/email search for GSD.
- GSD can record a configured Promo Points use after holder verification. Earns remain driven by an eligible Finance-approved bill; GSD scanning never issues or approves a bill or credits points.

- [ ] **Step 1: Write failing tests.** Assert that the GSD demo identity can resolve a valid QR for the service flow, cannot run full customer search or approve bills, and that scanning alone leaves both balances unchanged. Assert that an eligible reward use requires verification and sufficient Promo Points.
- [ ] **Step 2: Verify RED.** Run the focused QR/GSD tests. Expected: no GSD demo identity or narrow scan permission exists.
- [ ] **Step 3: Implement the dev-only identity and scan/use path.** Reuse the camera scanner where practical; preserve manual fallback and current staff permissions.
- [ ] **Step 4: Verify GREEN.** Rerun focused tests, including invalid/replaced QR and no-balance-change cases.

### Task 4: Add the customer-scoped mock portal

**Files**
- Create: `src/modules/customer-portal/types.ts`
- Create: `src/data/contracts/customer-portal-repository.ts`
- Create: `src/data/mock/customer-portal-repository.ts`
- Create: `src/data/customer-portal-queries.ts`
- Create: `src/shared/providers/customer-portal-provider.tsx`
- Create: `src/panels/customer-portal/pages/customer-login-page.tsx`, `src/panels/customer-portal/pages/customer-portal-page.tsx`, and `src/panels/customer-portal/components/customer-qr.tsx`
- Create: route wrappers under `src/app/portal/`
- Test: customer-portal repository, provider/cache, and page tests under `src/data/mock/`, `src/shared/providers/`, and `src/panels/customer-portal/`

**Interfaces**
- Mock sign-in is email + password for a seeded synthetic customer (owner decision, 2026-11-22): the page shows no sample or prototype notes, and the test password is `MOCK_CUSTOMER_PASSWORD` in `src/data/mock/customer-portal-repository.ts` (mock only). "Forgot Password?" links to `/contact`; no reset flow exists. The customer may also upload their own profile picture (owner decision, 2026-11-22): images only, 2MB or smaller, shown at once, replaceable and removable; staff and the owning seller see it on the customer record, and staff see it on the counter QR lookup. The portal QR is the same image as the staff "Show QR" (logo in the center). keep it separate from staff `DevIdentity` and staff credentials.
- Repository methods resolve the customer from the mock session, not a customer ID supplied in a URL or form. The portal may read only that customer’s profile, memberships, Promo/Stay balances, linked activity, and QR.
- Contact update input is limited to `landline`, `mobileNumber`, and `email`, using existing validation. Do not call the broad staff `CustomerRepository.correct()` method.
- Display Promo Points and Stay Points as separate balances and histories. Show linked bills/rewards/bookings only when they belong to the signed-in customer. Display the issued membership QR read-only; do not expose QR replacement.

- [ ] **Step 1: Write failing tests.** Assert that the portal returns only the signed-in customer’s data; another customer’s profile, points, or QR cannot be requested; only the three contact fields update; and identity changes clear/partition sensitive query data.
- [ ] **Step 2: Verify RED.** Run the new portal repository/provider tests. Expected: no customer portal repository or session exists.
- [ ] **Step 3: Implement the mock session, scoped repository, queries, and UI.** Use the synthetic `cust-b1` / `memb-1` relationship. Keep the mock entry unavailable as production authentication.
- [ ] **Step 4: Verify GREEN.** Rerun focused tests and add page assertions for separate wallets, linked activity, editable contact fields, and read-only QR.

## Phase 2 — Dynamic Public Experiences

### Task 5: Add Experiences content CRUD and dynamic pages

**Files**
- Modify: `src/modules/public-site/content/experiences.ts` to preserve existing content as mock seed data
- Create: an Experiences-specific contract/repository/query layer under `src/data/contracts/`, `src/data/mock/`, and `src/data/`
- Modify: `src/data/mock/seed.ts` and `src/data/mock/seed-data.ts` only for synthetic content state
- Create: `src/panels/admin/pages/experiences-page.tsx` and its admin route under `src/app/admin/`
- Modify: `src/modules/identity/permissions.ts` and its tests to add a dedicated Experiences-content permission for Admin and Super Admin only
- Modify: `src/panels/public/pages/experience-pages.tsx` and the existing three experience routes; add a dynamic `[slug]` route for new entries
- Test: `src/panels/public/site-pages.test.tsx`, a new Experiences repository test, and an admin Experiences page test

**Interfaces**
- Keep Experiences distinct from Promo Rewards. Use a data-driven content record for slug, title, category, summary, detail content, and image references, reusing current experience content where applicable.
- Valid Admin/Super Admin saves publish immediately, as selected. Archive/remove records without adding bookings or payment actions.
- Preserve the three existing public slugs and their current content. New experiences must not require a code change to add a public card/detail page.

- [ ] **Step 1: Write failing tests.** Assert that an Admin/Super Admin can create/update/archive an experience; valid save publishes it; the public listing/detail page renders a newly added slug; and the three existing routes retain their current content.
- [ ] **Step 2: Verify RED.** Run the new repository/admin tests and `npx vitest run src/panels/public/site-pages.test.tsx`. Expected: content remains static and no Experiences editor/repository exists.
- [ ] **Step 3: Implement the typed mock content repository, Admin CRUD, and data-driven public rendering.**
- [ ] **Step 4: Verify GREEN.** Rerun focused tests. Confirm no booking/payment/Services controls are introduced.

## Phase 3 — Dynamic VIP Product Drafts and Public Cards

### Task 6: Add product draft and Super Admin approval lifecycle

**Files**
- Modify: `src/modules/vip/types.ts`
- Modify: `src/data/contracts/product-repository.ts` and `src/data/mock/product-repository.ts`
- Modify: `src/panels/admin/pages/vip-products-page.tsx` and `src/panels/admin/components/vip-product-dialogs.tsx`
- Modify: `src/modules/identity/permissions.ts` and `src/modules/identity/permissions.test.ts` for a Super Admin-only product approval operation
- Test: `src/data/mock/product-repository.test.ts` and `src/panels/admin/pages/vip-products-pages.test.tsx`

**Interfaces**
- New products are created as Draft and cannot enter contract selection or the public catalog. Admin and Super Admin may manage drafts; only Super Admin may approve/activate.
- Approval requires the approved unique two-character code, price, validity, benefits, available payment schemes, and a reason recorded in the audit trail. Missing terms keep the product in Draft.
- Preserve existing active B1/S1/G1 products. Do not assign a VIP Number at product creation/approval; number issuance remains tied to recording the signed Reservation Agreement.
- Do not copy internal product values into public cards without an explicit public projection. In particular, do not map product `validityYears` to the existing public `discountYears` text. Do not rewrite finalized contract snapshots or invent terms for a new tier.

- [ ] **Step 1: Write failing tests.** Assert that new products default to Draft; drafts are not selectable by contract creation and do not appear publicly; Admin cannot approve; Super Admin can approve only complete products with a reason; and existing B1/S1/G1 behavior is unchanged.
- [ ] **Step 2: Verify RED.** Run `npx vitest run src/data/mock/product-repository.test.ts src/panels/admin/pages/vip-products-pages.test.tsx src/modules/identity/permissions.test.ts`. Expected: new products are immediately active and no separate approval permission exists.
- [ ] **Step 3: Implement draft persistence, Super Admin approval, audit recording, and validation.**
- [ ] **Step 4: Verify GREEN.** Rerun focused tests and the existing product/catalog tests.

### Task 7: Make public VIP cards data-driven and explicitly listed

**Files**
- Modify: `src/modules/public-site/content/vip.ts`
- Modify: `src/panels/public/vip/vip-cards.tsx` and `src/panels/public/site/vip-tier-list.tsx`
- Modify: product public projection/query code as needed
- Test: `src/panels/public/site-pages.test.tsx`

**Interfaces**
- Render only products that are approved, active, and explicitly marked public. Use an allowlisted public projection; drafts and internal-only details remain private.
- Keep current public B1/S1/G1 presentation and existing direct links stable while removing the fixed three-card data dependency.

- [ ] **Step 1: Write failing tests.** Assert that a listed approved product appears; draft, unapproved, inactive, and unlisted products do not; existing B1/S1/G1 public copy remains unchanged.
- [ ] **Step 2: Verify RED.** Run `npx vitest run src/panels/public/site-pages.test.tsx`. Expected: the public page still reads the hard-coded `VIP_TIERS` array.
- [ ] **Step 3: Implement the public product projection and dynamic card rendering.**
- [ ] **Step 4: Verify GREEN.** Rerun focused tests and product page tests.

## Final Verification and QA

- Run focused Vitest tests for each task before implementation code and verify the expected RED failure first.
- At each milestone, run `npm test` and report every failure. Historical full-suite timeouts were noted in the project snapshot and are not presumed to pass.
- Run `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
- Browser-check the customer sign-in/profile/wallet/QR flow; Admin promo draft/preview/publish and reward CRUD; GSD QR selection/use with no scan side effect; approved-bill earning; dynamic Experiences save/public visibility; and VIP draft/approval/listing gates.
- Check keyboard use, focus, labels, dialog behavior, contrast, responsive layouts, and loading/empty/error states.
- Do not run Git staging/commit/push, deployment, database, or infrastructure operations.

## Pre-Production Follow-Up (Not Part of This Prototype)

- Reconcile the external `C:\Users\SSD-ORLANDO\Documents\AFHomes Document\Business Rules` folder with the current repository Promo Points amendment before any live rollout.
- Update the canonical product rules to document the selected Draft/Super Admin approval/public-listing lifecycle before production activation of new VIP products.
- Production customer authentication, server authorization, database persistence, live customer submissions, and live service/redemption flows require separate authorization and implementation planning.
