# AFHomes V3 — Existing Project Audit

**Audit date:** 2026-11-06
**Repository:** `https://github.com/orlando-afhomes/afhomes-platform.git`
**Branch:** `develop`
**HEAD:** `5e238ac` (`frontend: polished sales network and organization ui`)
**Audit method:** read-only inspection, targeted file reads, and execution of the documented lint, test, and typecheck commands.

> **Evidence labels:** Findings are marked **Verified** when confirmed from files or command output. Items marked **Recommendation** are proposals and have not been implemented. No application code, dependencies, documentation, configuration, or project settings were changed by this audit.

---

## 1. Repository Identity and Working-Tree Status

**Verified**

| Item | Value |
|---|---|
| Working directory | `C:/Users/SSD-ORLANDO/Documents/Project/afhomes-platform` |
| Git remote `origin` | `https://github.com/orlando-afhomes/afhomes-platform.git` (fetch and push) |
| Current branch | `develop` |
| Local HEAD | `5e238ac68964e27d67f46023ca76ce91786ddbd9` |
| Local `origin/develop` ref | `adf2dca` |
| Divergence | `develop` is ahead of the local `origin/develop` ref by 1 commit |
| Working tree (before this report) | `M workflow/session.md` only |
| Untracked files (before this report) | None |
| Runtime | Windows, Node `v24.19.0`, npm `11.17.0` |

The single modification is a pre-existing handoff rewrite in `workflow/session.md` (49 insertions, 25 deletions). It was preserved and is unrelated to this report. No `git fetch` was run, so the local `origin/develop` ref may not reflect the current GitHub state.

---

## 2. Verified Technology Stack and Dependencies

**Verified** from `package.json`, `package-lock.json`, installed `node_modules`, and configuration files.

| Layer | Actual implementation |
|---|---|
| Framework | Next.js `16.4.3`, App Router |
| UI runtime | React `19.3.0`, React DOM `19.3.0` |
| Component system | Ant Design `6.6.8`, `@ant-design/nextjs-registry` `1.3.0` |
| Icons | `lucide-react` `1.61.0`; Ant Design icons via the transitive `@ant-design/icons` package |
| Client state | TanStack Query `5.104.5` |
| Forms/validation | Ant Design `Form` plus custom validators; Zod `4.6.7` is installed but unused in `src` |
| Notifications | SweetAlert2 `11.26.25` |
| Language | TypeScript 5, `strict: true`, `noEmit: true`, path alias `@/* -> ./src/*` |
| Styling | Regular `.css` files only; 32 CSS files; 0 `.module.css` files |
| Theme | `src/theme/tokens.css` and `src/theme/antd-theme.ts` |
| Tests | Vitest `2.1.9`, React Testing Library, `jsdom` |
| Lint | ESLint 9 with `eslint-config-next/core-web-vitals` and `/typescript` |

**Not present:** Tailwind CSS, shadcn/ui, Base UI, CSS Modules, class-variance-authority, `components.json`, PostCSS/Tailwind config, Better Auth, Mongoose, MongoDB, API route handlers, `middleware.ts`, Docker, CI workflows, `.env` files.

`package.json` scripts:

```text
dev     next dev
build   next build
start   next start
lint    eslint
test    vitest run
```

There is no `typecheck` script. The documented equivalent is `npx tsc --noEmit`.

Relevant configuration:

- `next.config.ts` sets `cacheComponents: true`, `partialPrefetching: true`, and `agentRules: false`. The last option disables Next.js 16's automatic `AGENTS.md` generation block in `next dev`.
- `eslint.config.mjs` uses the flat config with Next.js core-web-vitals and TypeScript presets.
- `vitest.config.ts` uses `jsdom`, includes `src/**/*.test.ts(x)`, loads `vitest.setup.ts`, and raises the test timeout to 15 seconds.
- `tsconfig.json` includes `.next/types/**/*.ts`, which is why the stale `.next` cache affects typechecking (see §7).

---

## 3. Existing Architecture and Important Paths

**Verified**

```text
src/
├── app/                 App Router routes, layouts, global CSS
├── panels/
│   ├── admin/           Admin layouts, pages, dialogs, navigation, CSS
│   └── public/          Public layout, home, header/footer, OST registration preview
├── modules/             Domain types and pure business helpers
├── data/
│   ├── contracts/       Typed repository interfaces + async options
│   └── mock/            In-memory seed, mock repositories, scoping, audit
├── shared/              Forms, layout primitives, providers, utilities
├── theme/               Brand tokens, Ant Design theme, smoke test
└── lib/                 Local `cn()` helper
```

Important paths:

- `src/app/layout.tsx` — root layout; wraps the whole app in `QueryProvider` → `MockStoreProvider` → `DevIdentityProvider`.
- `src/app/admin/layout.tsx` — admin-only `AntdThemeProvider` boundary inside `Suspense`; imports admin, layout, and SweetAlert CSS.
- `src/theme/providers.tsx` — `AntdRegistry` + `ConfigProvider` + `AntdApp`, scoped to `/admin`.
- `src/data/mock/seed.ts` — canonical in-memory store shape and synthetic fixtures.
- `src/data/mock/repositories.ts` — repository factory bound to the store and current identity.
- `src/data/queries.ts` — all TanStack Query hooks and mutation invalidation.
- `src/modules/identity/permissions.ts` — role/module/operation grants.
- `src/data/mock/authorization.ts` — effective module resolution, including linked department roles.
- `src/data/mock/scope.ts` — genealogy and customer visibility scopes.
- `src/panels/admin/navigation.ts` — navigation tree, availability flags, role-aware filtering, breadcrumbs.

**Absent paths** that the architecture documents describe:

- `src/server/` (server-only services, repositories, auth, integrations)
- `src/config/`
- `src/app/api/` (no REST `/api/v1` handlers)
- `middleware.ts`
- `data/database/`
- `docs/` has no database schema or migration artifacts

This is a frontend-only mock prototype at the audited commit.

---

## 4. Module and Implementation Inventory

**Verified** from routes, panels, modules, and repository contracts.

### 4.1 Public panel

| Area | Route | State |
|---|---|---|
| Public home | `/` (`src/app/page.tsx`) | Implemented; static welcome content |
| Login | `/login` (`src/app/login/page.tsx`) | Placeholder only; no form or authentication |
| OST registration preview | `/register/ost` (`src/app/register/ost/page.tsx`) | Implemented 4-step preview; explicitly does not submit or persist an application |

`src/panels/public/pages/ost-registration-page.tsx` verifies referral codes through `useVerifyReferralSponsor`, collects applicant data in local state, and states in the UI that no application, account, accreditation, or genealogy record is created. `src/data/mock/registration-repository.ts` is read-only and exposes only `list`/`getById`.

Public accreditation verification and public Customer Lookup described in the documentation are **not implemented**.

### 4.2 Admin and operations panel

| Module | Route(s) | Implementation state |
|---|---|---|
| Dashboard | `/admin` | Implemented; role-aware stats, sales-network panel for sales roles |
| My Account | `/admin/account` | Implemented; profile/avatar/password validation; admin department-role editing |
| Accounts and Permissions | `/admin/accounts` | Implemented CRUD and status/role assignment; hidden from primary navigation |
| Departments | `/admin/organization/departments` | Implemented CRUD |
| Roles | `/admin/organization/roles` | Implemented CRUD with delegable-module restrictions |
| Staff | `/admin/organization/staff` | Implemented CRUD, department/role cascade, profile fields |
| Organization index | `/admin/organization` | Redirects to departments |
| Sales Network overview | `/admin/sales-network` | Implemented |
| Sales Network members | `/admin/sales-network/members` | Implemented directory, add/edit/transfer/status dialogs, accreditation action |
| Member detail | `/admin/sales-network/members/[id]` | Implemented detail, profile, genealogy, accreditation summary |
| Genealogy | `/admin/sales-network/genealogy` | Implemented interactive tree |
| Accreditation | Embedded in sales-network member/detail flows | Status transitions and issuance actions; no standalone accreditation routes |
| Customers | No route | Repository and hooks only |
| VIP Products | No route | Repository and types only |
| Finance, Commissions, Membership, Stay Points, Reports, Audit Logs | No routes | Navigation placeholders only (`available: false`) |
| Redemption, Services | No routes | Disabled by policy; no code |

### 4.3 Domain modules

- `src/modules/identity/` — `DevRole`, `DevIdentity`, `Scope`, module/operation grants, permission tests.
- `src/modules/organization/` — `OrgMember`, `SellerProfile`, `Department`, `DepartmentRole`, `StaffMember`, designations.
- `src/modules/sales-network/` — genealogy validation, display helpers, accredited-seller validation.
- `src/modules/accreditation/` — dates, eligibility, identifiers, issuance, transitions, types.
- `src/modules/customers/`, `src/modules/vip/`, `src/modules/accounts/`, `src/modules/audit/` — types only.
- No finance, commission, membership, stay-point, report, or redemption domain modules.

### 4.4 Mock data and repositories

`src/data/mock/seed.ts` seeds:

- 7 sales-network members (2 SVD, 1 SSM, 1 SM, 3 OST)
- 3 customers
- 5 accounts
- 5 departments
- 11 roles
- 5 staff
- 7 accreditation records
- 3 VIP products
- 0 registration applications
- Empty audit history

Repository contracts and implementations:

```text
members, customers, products, accounts, departments,
roles (DepartmentRole), staff, accreditations, registrations
```

CRUD coverage is full for departments, roles, staff, and accounts; partial for customers (draft create/update/discard); full workflow mutations for sales-network members and accreditation; read-only for products and registration applications.

### 4.5 Tests

**Verified:** 28 test files, 261 tests. Coverage is concentrated on:

- mock store cloning/reset, repositories, authorization, scopes, genealogy, permissions
- admin pages for accounts, departments, roles, staff, my account, dashboard
- navigation, menu items, sidebar, header, breadcrumbs
- theme providers and smoke component
- input sanitizers, formatting, role badges

There are no E2E, API, database, security, accessibility, or visual-regression tests.

---

## 5. Frontend State, CRUD, and Data Architecture

### 5.1 State and providers

**Verified**

- `src/shared/providers/query-provider.tsx` creates one `QueryClient` with `staleTime: 30_000` and `refetchOnWindowFocus: false`.
- `src/shared/providers/mock-store-provider.tsx` creates the mock store once in `useState` and exposes it by context.
- `src/shared/providers/dev-identity-provider.tsx` defaults to `DEV_IDENTITIES[0]` (`dev-super-admin`), exposes `setIdentityId`, and invalidates `members`/`customers` queries when the identity changes.
- A full browser refresh recreates the store from `createSeedStore()`; client-side navigation preserves it. No `localStorage`, `sessionStorage`, `IndexedDB`, or `fetch` usage exists in `src`.

### 5.2 Repository pattern

- `src/data/contracts/*.ts` defines typed interfaces; `MockAsyncOptions` supports delay, failure, and abort signals.
- `src/data/mock/repositories.ts` constructs repositories with the store, a `getIdentity()` callback, and async options.
- `src/data/queries.ts` memoizes the repository bundle per store and identity and exposes query/mutation hooks.
- Repository reads generally clone records (with nested cloning for member profiles, accreditation history, and audit `relatedRecordIds`).
- Mutations update the in-memory arrays and increment sequence counters. Failed operations do not advance sequences in the audited paths.

### 5.3 Query keys and invalidation

Queries use identity-scoped keys such as `["members", identity.id]`, `["departments", identity.id]`, `["staff", identity.id]`, `["accounts", identity.id]`, `["accreditations", identity.id]`, and `["sales-network-member", id, identity.id]`.

Mutations invalidate the relevant keys. **Gap:** the identity-change effect only invalidates `members` and `customers`; other identity-scoped keys (`departments`, `roles`, `staff`, `accounts`, `accreditations`, member detail) are not invalidated. This is latent because no identity switcher exists in the application UI (see §8).

### 5.4 Authorization simulation

- `src/modules/identity/permissions.ts` defines `AdminModuleId`, `AdminOperation`, role→module grants, role→operation grants, `getGrantedModuleIds`, `getGrantedOperations`, and `hasOperationPermission`.
- `src/data/mock/authorization.ts` adds linked department-role grants through `staffId → staff → departmentRoleId → role → department`, provided every link is active.
- `src/data/mock/scope.ts` implements `own`/`team`/`all` visibility via genealogy descendants and customer ownership.
- Repositories enforce module/role checks; navigation and pages also render “Access restricted”.
- **No middleware or server guard exists.** `/admin` is reachable by any visitor, and the default mock identity is Super Admin.
- `setIdentityId` has no caller outside `DevIdentityProvider`; tests pass `initialIdentityId` directly. There is no development identity switcher UI.

### 5.5 Validation and audit

- Validation is manual: shared validators in `src/shared/forms/validation/`, sanitizers in `src/shared/utils/input-sanitizers.ts`, and repository-level checks.
- Zod is a declared dependency but has zero imports in `src`.
- `src/data/mock/audit.ts` appends events for sales-network and accreditation mutations. Audit events are not exposed through any UI or query hook.
- `src/modules/audit/types.ts` restricts modules to `sales-network` and `accreditation`, entity types to `member`, `accreditation`, and `account`, and outcome to `success`.

### 5.6 Data relationships

- Member → parent/children via `parentId`; branch/team via `branchId`/root `teamName`; optional `accountId`; optional `sellerProfile`.
- Staff → department via `departmentId`; department role via `departmentRoleId`; account via `accountId`.
- Department role → department via `departmentId`; module grants via `moduleIds`.
- Accreditation → member via `memberId`; append-only `history`.
- Customer → owner member via `ownerMemberId`; branch via `branchId`.
- Account → system roles via `roleIds`; department via `departmentId`.

---

## 6. Applicable Business Rules and Documentation

### 6.1 Documents that exist

**Verified**

- `docs/project.md` (526 lines)
- `docs/business-rules/01-roles-and-permissions.md` through `13-sales-performance-reporting.md` (all 13 present)
- `docs/development/README.md`, `architecture.md`, `frontend.md`, `database.md`, `backend.md`, `security.md`, `testing.md`, `implementation.md`, `deployment.md` (all 9 present)
- `docs/development/role-module-permission-matrix-proposal.md` (partially approved proposal)
- `AGENTS.md` (28,141 bytes)
- `workflow/opencode/` and `workflow/graphidian/` process guides
- `workflow/session.md` (modified handoff context)

**Absent:** `data/database/`, database schemas, migrations, API specifications beyond prose, `.env.example`, CI configuration, `CLAUDE.md`, `.claude/`, MCP configuration.

### 6.2 Governing rules relevant to current code

| Area | Canonical source | Implementation alignment |
|---|---|---|
| Roles, modules, accounts | `docs/business-rules/01-roles-and-permissions.md` | Partially aligned; see conflict below |
| Sales network/genealogy | `02-sales-network-and-genealogy.md` | SVD→SSM→SM→OST edges, cycle prevention, scoped visibility implemented |
| IST/OST accreditation | `03-ist-ost-accreditation.md` | AA prefix/format, annual expiry, status transitions implemented in mock |
| Customers | `04-customer-management.md` | Draft/submitted types and draft CRUD only |
| VIP products/contracts | `05-vip-products-and-contracts.md` | Tier catalog types only; no contracts |
| VIP card issuance | `06-vip-card-issuance.md` | Not implemented |
| Finance/payments | `07-finance-and-payments.md` | Not implemented |
| Commissions | `08-commission-management.md` | Not implemented |
| Membership/stay points | `09-vip-membership-and-stay-points.md` | Not implemented |
| Redemption | `10-redemption.md` | Deliberately disabled; no code |
| Reports/analytics | `11-reports-and-analytics.md` | Not implemented |
| Audit/governance | `12-audit-logs-and-governance.md` | Minimal append-only mock audit only |
| Sales performance | `13-sales-performance-reporting.md` | Not implemented |

### 6.3 Documentation conflicts and drift

**Verified conflicts:**

1. **Status drift.** Multiple documents still claim the repository is documentation-only:
   - `docs/development/README.md` line 5 and §16 line 282
   - `docs/development/implementation.md` §2 line 17
   - `docs/development/frontend.md` §3 line 49
   - `docs/development/architecture.md` line 51
   - `docs/development/backend.md` line 44
   - `docs/development/database.md` line 45
   - `docs/development/deployment.md` line 17
   - `docs/development/testing.md` line 17

   This directly contradicts the implemented Next.js application.

2. **Stale UI stack.**
   - `docs/project.md` lines 116–118 and invariant 6 at line 466 still say Tailwind/shadcn/CSS Modules are approved.
   - `AGENTS.md` §4 lines 249–251 repeats the same stack table; line 265 cites “Tailwind CSS 4”.
   - `docs/development/README.md` line 41 still lists CSS Modules.
   - These are superseded by `docs/development/frontend.md` §41 and `AGENTS.md` §18.5/§18.6 (Ant Design 6 + regular CSS) and by the actual dependency tree.

3. **Phase-status drift.** `AGENTS.md` §13 (lines 671–683) reports Phase 1A implemented and Phase 1B next. The repository contains sales-network and accreditation work identified in `workflow/session.md` as Phase 05.2–06.8. An agent trusting `AGENTS.md` alone would under-scope the project.

4. **Permission-model conflict.** `docs/business-rules/01-roles-and-permissions.md` §3, especially §3.1, states a simple module-level model with no separate read/create/update/delete toggles, and that module access grants all supported functions. The implementation adds `AdminOperation` grants in `src/modules/identity/permissions.ts` (for example `sales-network.transfer`, `sales-network.status`, `finance.verify`) and uses them in UI gating. `docs/development/role-module-permission-matrix-proposal.md` is explicitly “PARTIALLY APPROVED” (line 3), so the operation model is not fully approved business policy.

5. **Dead module grants.** `src/modules/identity/permissions.ts` grants `accreditation-registrations`, `accreditation-records`, and `accreditation-renewals` to `super_admin` and `admin` and lists them in `MODULE_CATALOG`, but `src/panels/admin/navigation.ts` has no accreditation entries and no `/admin/accreditation/*` routes exist. `src/data/mock/registration-repository.ts` and the registration query hooks have no UI consumers.

### 6.4 Unresolved business decisions

`AGENTS.md` §11 reports these as unresolved; they were **not independently re-validated** against external AFHomes sources:

- Gold contract price discrepancy (₱390,000 vs ₱780,000)
- Unfinished Silver contractual amount
- Non-Standard contract authorization
- Move A/B1/B2 commercial terms
- RA numbering scope and uniqueness
- Accreditation expiry/access cutoff interpretation
- Card Claim Date vs Activation Date validity start
- Better Auth/MongoDB compatibility
- Atlas transaction capability
- Audit retention policy
- Production domain, infrastructure sizing, and providers

`docs/business-rules/05-vip-products-and-contracts.md` §6 documents the Gold and Silver contract discrepancies. `docs/business-rules/06-vip-card-issuance.md` §20 lists outstanding approval dependencies. These are not resolved by the current frontend mock and must not be invented during implementation.

---

## 7. Current Development and Testing Workflow

### 7.1 Commands and conventions

**Verified** from `package.json`, `workflow/session.md`, and `AGENTS.md`:

```sh
npm run dev          # Next.js development server
npm run build        # production build
npm run lint         # ESLint
npm test             # Vitest run
npx tsc --noEmit     # typecheck (no script defined)
git status --short
git diff --check
```

`AGENTS.md` §14 defines the workflow: verify repository/branch, inspect the tree, read authoritative documents, implement only authorized scope, run tests, inspect changes, report, and stop. `workflow/opencode/00-overview.md` defines explore → plan → approve → build → verify → review → hand off.

`workflow/session.md` states that formal gates were deferred by the project owner and that only targeted Vitest suites were run in the previous session. It records a `.next` cache of roughly 1.8 GB; the current cache is **1.3 GB** and its validator is dated 2026-10-28.

### 7.2 Actual gate results at this audit

| Command | Result |
|---|---|
| `npm test -- --reporter=dot` | **Exit 1.** 28 files: 27 passed, 1 failed. 261 tests: 260 passed, 1 failed. Duration 113.32s. |
| `npx vitest run src/panels/admin/staff-page.test.tsx` | **Exit 0.** 11/11 tests passed in 47.65s. The full-suite failure did not reproduce in isolation. |
| `npm run lint` | **Exit 1.** 18 errors, 20 warnings. |
| `npx tsc --noEmit` | **Exit 1.** 25 errors: 10 from stale `.next/types` and 15 from `src`. |
| `npm run build` | **Not run.** Expected to fail given the TypeScript errors; not verified. |
| Browser/visual QA | **Not performed.** No responsive, accessibility, or rendering verification. |

### 7.3 Test failure detail

The full-suite failure is:

```text
src/panels/admin/staff-page.test.tsx
  staff page > adds staff with cascading department role
```

The failure occurred while waiting for the “First Name” field after clicking “Add staff”. The same file passes 11/11 when run alone. The full run is CPU-heavy (environment setup 343s, collect 506s) and the per-test timeout is 15s, so this is consistent with a load-sensitive flake. It is **not proven** to be a product defect, and it is not proven to be only a flake; no further isolation runs were performed.

### 7.4 TypeScript errors

**Stale `.next` errors (10):**

`.next/types/validator.ts` references removed routes:

- `src/app/admin/accreditation/records/[id]/page`
- `src/app/admin/accreditation/records/page`
- `src/app/admin/accreditation/registrations/[id]/page`
- `src/app/admin/accreditation/registrations/page`
- `src/app/admin/accreditation/renewals/page`

These routes do not exist in `src/app`. Deleting `.next` and regenerating types should remove these errors; this was not done during the audit.

**Source errors (15):**

| File | Error summary |
|---|---|
| `src/data/mock/member-repository.ts:191` | `SellerProfile` object missing `sellerSource`, `originalAccreditationDate`, `expiryDate` |
| `src/data/mock/member-repository.ts:277` | `input.tin` possibly `null` before `.replace` |
| `src/data/mock/member-repository.ts:583` | `account` possibly `null` |
| `src/data/mock/staff-repository.ts:44` | `input.tin` possibly `null` before `.replace` |
| `src/panels/admin/components/accreditation-status.tsx:27,29` | `Tag` is not defined/imported |
| `src/panels/admin/pages/sales-network-accredited-seller-dialog.tsx:252` | `teamDisplayName` is not defined |
| `src/panels/admin/pages/sales-network-accredited-seller-dialog.tsx:594` | `SelectField` missing required `label` |
| `src/panels/admin/pages/sales-network-member-dialogs.tsx:236` | `SelectField` missing required `label` |
| `src/panels/admin/pages/sales-network-members-page.tsx:73` | `Promise<OrgMember>` not assignable to `void \| Promise<void>` |
| `src/panels/admin/pages/sales-network-members-page.tsx:90` | `AccreditationRecord` not imported |
| `src/panels/admin/pages/staff-dialogs.tsx:399` | `SelectField` missing required `label` |
| `src/shared/forms/components/PhoneFields.tsx:60` | `RefObject<HTMLInputElement>` vs Ant Design `InputRef` |
| `src/shared/forms/components/SelectField.tsx:43` | Readonly option array cast to mutable array |
| `src/shared/forms/components/TinField.tsx:62` | `RefObject<HTMLInputElement>` vs Ant Design `InputRef` |

### 7.5 Lint errors

18 errors across 6 files:

- `src/panels/admin/pages/sales-network-members-page.tsx` — 12 `@typescript-eslint/no-explicit-any` errors, including the `DirectoryTable<any>` declaration.
- `src/modules/sales-network/genealogy.ts:131,132` — 2 `no-explicit-any` errors.
- `src/panels/admin/components/accreditation-status.tsx:27` — `'Tag' is not defined` (`react/jsx-no-undef`).
- `src/panels/admin/pages/sales-network-accredited-seller-dialog.tsx:163` — “Calling setState synchronously within an effect can trigger cascading renders”.
- `src/panels/admin/pages/sales-network-genealogy-page.tsx:96` — `no-explicit-any`.
- `src/panels/admin/pages/sales-network-member-detail-page.tsx:33` — `no-explicit-any`.

20 warnings include unused imports/variables (`staff-dialogs.tsx`, `staff-page.tsx`, `shared/forms/validation/contact.ts`) and the `<img>` LCP warning in `ProfilePhotoUploader.tsx`.

### 7.6 Runtime and latent issues (recorded, not fixed)

- **`teamDisplayName` undefined** at `src/panels/admin/pages/sales-network-accredited-seller-dialog.tsx:252`. The Add IST/OST dialog computes `inheritedTeam` with this undefined symbol when a sponsor is selected. Static inspection indicates a runtime `ReferenceError` on that path; it was not reproduced in a browser.
- **`Tag` not imported** in `src/panels/admin/components/accreditation-status.tsx`. The affected `AccreditationExpiryTag` export currently has no consumers, so this is a compile/lint failure rather than an observed runtime crash.
- **Nullable TIN dereference** in member and staff repositories is a latent runtime error if `null` is passed.
- **Missing `SelectField` labels** are compile errors and accessibility/labeling defects at those call sites.
- **`DirectoryTable<any>`** removes type safety from the sales-network members table.
- **Duplicate CSS import** `import "./fields.css";` appears twice in `src/shared/forms/components/SelectField.tsx`; harmless but redundant.
- **Mixed role checks:** some repositories check raw `identity.roles` (for example `isAdmin`, accreditation `canReadAll`) while module grants use `activeRoles(identity)`. This bypasses `roleAssignments` status for those checks. No seeded identity currently exposes the difference, so this is latent.

---

## 8. Architectural Risks, Gaps, and Unresolved Decisions

**Verified findings, ordered by impact:**

1. **The repository does not pass its documented quality gates.** Lint, typecheck, and the full test suite are red. The production build is unverified and likely to fail. This is the highest-priority foundation risk.

2. **A core add-seller path contains an undefined symbol.** `teamDisplayName` at `sales-network-accredited-seller-dialog.tsx:252` can throw when a sponsor is selected. This affects the owner-authorized manual IST/OST creation workflow.

3. **The `.next` cache is stale and large (1.3 GB).** It contains references to removed accreditation routes, producing 10 false TypeScript errors. Typecheck/build results are unreliable until it is regenerated.

4. **Documentation is materially out of date.** The “documentation-only” claims, Tailwind/shadcn statements, Phase 1A status, and module-grant descriptions conflict with the implementation. An agent that trusts status sections over the file tree will make incorrect decisions.

5. **The permission model is split between canonical rules and provisional operations.** `docs/business-rules/01` describes module-only authorization; code implements operation-level gates based on a partially approved proposal. This needs an owner decision before backend authorization is built.

6. **No development identity switcher and no admin guard.** `/admin` defaults to Super Admin for every visitor. `setIdentityId` is unused. Identity-scoped queries exist but cannot be exercised through the UI.

7. **Identity-change cache invalidation is incomplete.** Only `members` and `customers` are invalidated in `dev-identity-provider.tsx`. Other identity-scoped keys can serve stale data once a switcher is added.

8. **Public OST registration uses Ant Design outside the theme boundary.** `/register/ost` renders `antd` components (`Card`, `Steps`, `Form`, `Input`, `Alert`, `Tag`) but its route does not use `AntdThemeProvider`; brand tokens and `AntdRegistry` SSR style extraction do not apply. This is also a potential `cacheComponents` prerender risk, since the admin boundary uses `Suspense` specifically for `@ant-design/cssinjs`.

9. **Zod is declared but unused.** Validation relies on hand-written validators. The documented validation architecture is therefore not implemented; this needs a decision rather than an assumption.

10. **Public verification boundaries are missing.** Public IST/OST accreditation verification and public Customer Lookup are documented but have no routes or APIs.

11. **No backend, database, auth, or deployment layer exists.** There are no API routes, `src/server`, Mongoose models, migrations, environment configuration, Docker files, or CI. Do not assume any of these are present.

12. **No E2E, accessibility, security, or visual-regression testing.** Existing tests are unit/component tests in jsdom. Finance, identifiers, audit integrity, and backend authorization cannot be validated yet.

13. **Dead configuration and unused hooks.** Accreditation module IDs are granted/cataloged but have no navigation or routes; `useRegistrationApplications`, `useRegistrationApplication`, `useProducts`, and `useCreateCustomerDraft` have zero consumers.

14. **Repository hygiene.** `README.md` is the create-next-app boilerplate. `tsconfig.tsbuildinfo` (466 KB) and `.next` (1.3 GB) are local artifacts. `AGENTS.md` is 28 KB and mixes current rules with stale phase/stack sections.

**Unresolved business decisions** remain as listed in §6.4. They block the affected modules, not the entire frontend foundation, but they must not be silently resolved in code.

---

## 9. Recommended Minimal Claude Code Configuration

**Verified:** no Claude-specific configuration exists. There is no `CLAUDE.md`, `.claude/` directory, `.mcp.json`, hooks, custom skills, `.cursorrules`, or `.github/` directory.

**Recommendation:** keep the configuration small and reuse `AGENTS.md` as the canonical governance document rather than duplicating it.

| File | Purpose | Notes |
|---|---|---|
| `CLAUDE.md` | Always-loaded entry point | ~80–120 lines: hard safety rules, verified state, stack, architecture map, commands, known failures, doc pointers, reporting format |
| `.claude/settings.json` | Permission guardrails | Deny all Git write commands; ask before dependency installs, builds, and `.next` deletion; allow read-only inspection and targeted tests |
| `.claude/hooks/` (optional) | Defense-in-depth Git guard | A `PreToolUse` Bash hook that rejects `git add/commit/push/merge/rebase/reset/clean/stash/checkout/switch/tag`; optional because permissions already cover this |
| `.claude/skills/` | Not recommended initially | Add only when a repeatable workflow justifies one; do not preload business rules as skills |
| MCP servers | Not recommended initially | No MCP dependency is needed for this repository |

**On-demand references** (do not auto-load):

- The specific `docs/business-rules/NN-*.md` relevant to the task
- The relevant `docs/development/*.md`
- `docs/development/role-module-permission-matrix-proposal.md` when working on permissions
- `workflow/session.md` for the latest handoff state
- This audit for verified current state

**Do not** configure Claude Code to import all 13 business-rule documents or the full `AGENTS.md` on every session. The full `AGENTS.md` is valuable for governance detail but expensive and partly stale; reference it and repeat only the non-negotiable rules in `CLAUDE.md`.

`next.config.ts` sets `agentRules: false`, so Next.js will not auto-generate an `AGENTS.md` block during `next dev`. This avoids duplicate governance text.

---

## 10. Essential Instructions Proposed for `CLAUDE.md`

**Recommendation** — proposed always-loaded content, not yet written:

1. **Read `AGENTS.md` first for governance.** This file is a thin entry point; `AGENTS.md` remains the canonical agent policy. Business behavior lives in `docs/business-rules/01–13`; technical design lives in `docs/development/`.
2. **Never run Git write commands.** No `add`, `commit`, `push`, `merge`, `rebase`, `cherry-pick`, `reset --hard`, `clean`, `stash`, `checkout`, `switch`, `tag`, or PR merging. The project owner performs all Git operations manually.
3. **Never deploy, provision infrastructure, install dependencies, run migrations, or change configuration without explicit authorization.**
4. **Current state:** frontend-only mock prototype on `develop` at `5e238ac`; no backend, API, database, auth, or cloud resources. Do not assume they exist.
5. **Verified stack:** Next.js 16 App Router, React 19, TypeScript strict, Ant Design 6, regular CSS, TanStack Query 5, Vitest/RTL. No Tailwind, shadcn/ui, Base UI, or CSS Modules.
6. **UI rules:** use Ant Design primitives first; use namespaced kebab-case classes for authored elements; import feature CSS at the narrowest route/layout boundary; use `src/theme/tokens.css` and `src/theme/antd-theme.ts`; do not target hashed Ant Design classes.
7. **Mock data rules:** business data is in browser memory only; a full refresh resets it; never add `localStorage`, `IndexedDB`, or server-side singleton persistence; clear or isolate identity-scoped query caches when identity changes.
8. **Architecture map:** routes in `src/app`, presentation in `src/panels`, domain logic in `src/modules`, contracts/mocks in `src/data`, shared UI/forms/utilities in `src/shared`. Do not create a separate backend, microservices, or a second data layer.
9. **Business invariants:** never invent financial, contractual, commission, accreditation, or identifier rules; follow canonical documents; preserve historical records; do not enable Redemption or Services; do not treat UI visibility as authorization.
10. **Validated state:** the repository currently fails `npm run lint`, `npx tsc --noEmit`, and the full `npm test`. Do not claim gates pass. Known issues are recorded in this audit.
11. **Stale documentation:** several docs still say “documentation-only” and still mention Tailwind/shadcn. Verify the file tree and `package.json`; do not trust status sections blindly.
12. **Before editing:** verify branch/HEAD, inspect `git status`, preserve unrelated changes, read the relevant canonical document, and confirm the task is authorized.
13. **Verification:** run the narrowest relevant checks. The full test suite takes ~113 seconds; prefer `npx vitest run <path>` for the touched area. Delete/regenerate `.next` before typechecking if stale-route errors appear, but only with authorization.
14. **Reporting:** report what changed, files touched, business-rule compliance, commands actually run and results, security/data-safety notes, known limitations, Git status, and unexpected operations. End with a STOP declaration.
15. **Stop when a requirement is ambiguous or a business rule is unresolved.** Do not fill gaps with assumptions.

---

## 11. Token-Efficiency Recommendations

**Recommendation**

- Keep `CLAUDE.md` under roughly 120 lines. Put volatile project state in `workflow/session.md`, not in the always-loaded file.
- Do not `@import` the full `AGENTS.md` or all business-rule documents. Reference paths and load only the specific document needed for the task.
- Exclude generated and dependency material from exploration:
  - `.next/` (1.3 GB)
  - `node_modules/`
  - `package-lock.json` (338 KB)
  - `tsconfig.tsbuildinfo` (466 KB)
- Use `git ls-files`, `rg`, and targeted reads instead of whole-repository scans. Tracked `src/` is 203 files; TS/TSX totals ~15.9k lines. The docs and workflow guides total ~13.6k lines.
- Run targeted Vitest files rather than the full suite during iteration. The full suite took 113 seconds and produced one load-sensitive failure.
- Read document headings first (`grep "^## "`), then only the relevant section. Do not load all 13 business rules or all 9 development documents at once.
- Use this audit as the single verified baseline instead of re-auditing the repository each session.
- When broad exploration is needed, delegate to a read-only subagent with explicit path exclusions rather than reading files serially.
- Prefer `git diff --stat` and `git diff --check` before reading full diffs; read only the changed hunks.
- Keep the report and `workflow/session.md` concise. Avoid repeating canonical rules in multiple files.

---

## 12. Missing Information and Verification Limitations

- **No external AFHomes reference material is available in the repository.** The V2 application, legacy Supabase data, signed contracts, and other reference documents were not accessible. Their absence is reported, not inferred.
- **No production build was run.** `npm run build` was deliberately skipped to avoid generating or overwriting build artifacts. Build success is therefore unverified and expected to fail given the TypeScript errors.
- **No browser or visual QA was performed.** Rendering, responsive behavior, accessibility, hydration, and the suspected `teamDisplayName` runtime failure were assessed statically, not reproduced in a browser.
- **No backend, database, authentication, Atlas, or DigitalOcean state exists to verify.** Claims about those layers are limited to “not present”.
- **Business-rule documents were reviewed by headings and selected sections, not line-by-line.** Unresolved decisions reported in `AGENTS.md` §11 and the business-rule documents were not independently re-validated against external sources.
- **The test failure classification is limited.** One isolation rerun passed; the full-suite failure was not reproduced or diagnosed further.
- **The `origin/develop` comparison uses a local ref.** No `git fetch` was run, per repository policy, so the ahead/behind result may be stale.
- **Line numbers and commit state are valid for `5e238ac` only.** Later edits will shift them.
- **Windows-specific behavior** (path separators, CRLF warnings for `workflow/session.md`) may differ on other platforms.

---

**Audit conclusion:** the repository is a substantial, working frontend mock prototype with a coherent panel/module/repository structure and meaningful test coverage, but it is not currently gate-clean, its documentation is materially stale, and several authorization and workflow decisions remain unresolved. The recommended next step is a Claude Code configuration that treats `AGENTS.md` as governance, this report as the verified baseline, and the current red gates as known constraints rather than claims of completion.

---

**Audit integrity:** this audit created only this file. No application code, dependencies, existing documentation, configuration, or project settings were changed. No Git staging, commit, push, merge, branch switch, reset, clean, or deployment was performed. The pre-existing `workflow/session.md` modification was preserved.
