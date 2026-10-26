# AFHomes Platform — Frontend Design

> Authoritative frontend architecture and design specification for the AFHomes Platform.
> Read `docs/development/architecture.md` for system architecture and `docs/business-rules/` (01–13) for authoritative business behavior.
> This document is documentation only; no application code is implemented here.

---

## 1. Purpose and Scope

This document specifies the complete frontend architecture and design for the AFHomes Platform. It explains how the frontend should be organized, how panels interact with the shared application, where frontend code belongs, how data is accessed, and how the UI implements approved business workflows without violating backend authorization or domain boundaries.

It is specific to AFHomes, not a generic React guide.

---

## 2. Approved Frontend Technology Stack

| Category | Approved technology/approach |
|---|---|
| Application framework | Next.js |
| Router | Next.js App Router |
| UI library | React |
| Programming language | TypeScript |
| Styling | Tailwind CSS |
| Additional styling | CSS Modules where appropriate |
| UI foundation | shadcn/ui |
| Validation | Zod |
| Client asynchronous state | TanStack Query |
| Local UI state | React state/hooks |
| Data access | Typed repository and API adapter interfaces |
| Frontend development | Frontend-first using mock data |
| Mock storage | Centralized browser-scoped in-memory store |
| REST integration | `/api/v1` |
| Backend | Server-side services within the Next.js application |
| Production database | MongoDB Atlas through the backend |
| Authentication | Better Auth target direction, subject to verification |
| Authorization | Centralized RBAC and record-level policies |
| Deployment | DigitalOcean Droplet with Docker Compose and HTTPS |

Next.js App Router is the approved target frontend framework. The repository's current implementation status must be verified separately; absence of installed application code does not change the approved decision.

Zod is the selected validation approach, subject to normal dependency compatibility verification. Do not introduce a different validation framework without authorization.

---

## 3. Current Repository Status

The repository is documentation-only. No application code or `package.json` exists. All frontend content here is approved target architecture, not an existing implementation. Do not claim Next.js is already installed.

---

## 4. Frontend Architectural Principles

1. Single Next.js application, panel-based and feature-based modular monolith.
2. Feature-based organization over route-file bloat.
3. Shared domain contracts; no duplicated business logic.
4. Typed interfaces throughout.
5. Centralized mock data during frontend-first development.
6. Backend authorization is authoritative; UI visibility is not security.
7. Repository adapters isolate data access.
8. Panel-scoped design identities.
9. Responsive and accessible by default.
10. Minimal unnecessary complexity.

---

## 5. System Context and Panel Boundaries

Three logical panels in one Next.js application:

1. Admin and Operations (MVP).
2. Public (limited MVP, expandable to approved public website/CMS).
3. Future Customer (documented only; no scaffolding during MVP).

Do not create separate applications solely because layouts differ.

---

## 6. Next.js App Router Structure

`src/app/` owns routing and thin composition. Route groups organize layouts without changing URL paths. Page files compose feature pages. Error/loading boundaries where appropriate. Server Components by default; `"use client"` only where interactivity needed. API Route Handlers under `api/` delegate to backend services.

Example: `src/app/(admin)/admin/customers/page.tsx` composes `src/panels/admin/features/customers/pages/CustomersPage.tsx`.

---

## 7. Target Frontend Folder Organization

(See architecture.md target layout.) Key directories: `src/app/`, `src/panels/`, `src/modules/`, `src/data/`, `src/server/`, `src/shared/`, `src/config/`. This is a target layout, not an instruction to create directories now.

---

## 8. Dependency and Import Rules

| From | May depend on | Must not depend on |
|---|---|---|
| App routes | Panel presentation, shared UI, authorized server composition | Arbitrary feature internals |
| Panel features | Shared UI, domain contracts, client-safe adapters | Server-only infrastructure |
| Shared UI | Generic types, UI utilities | Domain-specific finance/customer modules |
| Domain modules | Pure types, business rules, contracts | Browser APIs, React components, database drivers |
| Client adapters | Client-safe repository contracts, HTTP client | Mongoose, database credentials |
| Server infrastructure | Domain contracts, database and auth integrations | Client-only presentation components |

Prohibit circular dependencies, shared UI importing feature pages, domain logic importing panel components, browser components importing Mongoose, duplicate business logic, hardcoded secrets, uncontrolled cross-panel internal imports.

---

## 9. Admin and Operations Panel

Location: `src/panels/admin/`. Supports Super Admin, Admin, HR/staff, Finance, SVD, SSM, SM, OST, other approved roles sharing a common shell with different permissions and visible modules.

UI for: Dashboard, Organization/Departments/Staff, Roles & Permissions, Sales Network, Genealogy, IST/OST Accreditation, Customer Management/Search/Import-Export, VIP Products, VIP Contracts, VIP Cards, Sales, Finance, Commission Management, VIP Membership, Stay Points, Reports & Analytics, Audit Logs. Redemption and Services hidden/disabled.

UI patterns: sidebar, top nav, breadcrumbs, tables, search, filters, pagination, detail dialogs, forms, status badges, summary cards, charts, user menus, loading/error states.

---

## 10. Public Panel

Location: `src/panels/public/`. Separate presentation experience within the same app. Supports company branding, public website, content sections, accreditation verification, Customer Lookup, login entry, public CMS integration, approved public contact/payment inquiry info.

Public verification follows approved rules: official AA number, no unauthorized discovery, IST omits "Valid Until", OST may show validity, private details restricted. Public Customer Lookup follows document 04 (only eligible Active membership records, approved masking/disclosure).

Responsive sections, public nav, content presentation, search, accessibility, SEO, media, CMS-driven content where approved. Public styling isolated from Admin.

---

## 11. Future Customer Panel

Location: `src/panels/customer/`. Architecturally planned, not authorized for implementation in initial phase. Future: customer profile, membership info, VIP Card info, benefits, personal transactions, Stay Points, authorized self-service. Enforce customer-specific access. Do not scaffold during Phase 1 unless authorized.

---

## 12. IST and OST Portal Experience

IST designations: SVD, SSM, SM. Hierarchy: SVD → SSM → SM → OST, with OST directly attachable to authorized SVD/SSM/SM.

### 12.1 IST Interface

Authorized IST members access: personal sales, authorized team sales, genealogy, team performance, relevant customer records, accreditation info, commission info where permitted, reports, dashboard. IST may be eligible for commissions per Commission Management policies (do not restore older "IST never earns commission" assumption).

### 12.2 OST Interface

OST experience follows common operational design style with narrower data scope: proper sidebar, personal sales, own authorized customer records, personal commission info, own accreditation info, permitted upline names, appropriate dashboard metrics. OST sales reporting limited to own permitted sales. No exposure of unrelated sellers, branches, customer records, or commission records.

### 12.3 Genealogy Interface

Tree presentation, collapsible branches, permitted profile access, read-only upline names, descendant navigation, historical attribution, restricted personal info. Visual tree is not a substitute for record-level authorization.

### 12.4 Reporting Filters

Support where approved: Today, Past 7 Days, Past 28 Days, Past 6 Months, custom Start/End Date. Do not reintroduce obsolete "Period preset" label. Use authoritative reporting definitions from 11 and 13.

---

## 13. Feature Folder Conventions

Feature-based organization (see example in architecture.md). Pages compose feature UI; components render/collect; hooks manage local UI/form/data; styles scoped; index exposes controlled API. Avoid excessive nesting for trivial features; avoid giant unrelated shared folders.

---

## 14. UI Design System

- Tailwind CSS, shadcn/ui, CSS variables, CSS Modules where appropriate.
- Shared primitives in `src/shared/ui/` when genuinely reusable; panel-specific variants with panel; feature-specific UI within feature.
- Panel-scoped themes (`.admin-theme`, `.public-theme`, `.customer-theme`) via scoped CSS variables; avoid global overrides.
- Responsive design across desktop/tablet/mobile; data-intensive Admin screens use responsive tables, overflow, mobile filters, accessible sidebars, touch targets, responsive forms.
- Accessibility: semantic HTML, keyboard nav, focus visibility, screen readers, form labels, error announcements, dialog focus, contrast, reduced motion, zoom, WCAG alignment.

### 14.1 Production UI Standards

Application-facing screens must not display developer notes, debug controls, temporary design-preview links, milestone labels, mock diagnostics, or internal implementation commentary. Development-only tooling must remain isolated from normal application experiences and unavailable in production builds. Every visible control must serve a legitimate purpose, and incomplete functionality must be represented honestly without misleading production behavior.

---

## 15. Shared UI Components

Potential primitives: Button, Input, Textarea, Select, Checkbox, Radio Group, Dialog, Alert Dialog, Drawer, Tabs, Table, Badge, Card, Pagination, Dropdown Menu, Tooltip, Popover, Date Picker, Skeleton, Toast. Representative, not mandatory in first milestone. Avoid uncontrolled duplication.

---

## 16. Panel-Scoped Themes

Scoped CSS variables per panel. Do not create global overrides affecting other panels.

---

## 17. Responsive Design

Mobile-first responsive layouts. Progressive disclosure for complex business info. Do not remove complex information merely to fit mobile.

---

## 18. Accessibility

As in Section 14.

---

## 19. Server and Client Components

Server Components by default where appropriate; `"use client"` only for interactivity (forms, dialogs, interactive tables, client state, hooks, TanStack Query). Avoid unnecessary client bundles. Protect server-only data. API Route Handlers distinct from page components.

Error/loading boundaries: `loading.tsx`, `error.tsx`, `not-found.tsx`, nested layouts, Suspense where appropriate. No mandatory placeholder files without need.

---

## 20. Frontend Routing

Route files thin; compose feature pages. Route groups organize layouts. Avoid conflicting/duplicate URL paths. Intended namespaces: public, login, admin, future customer.

---

## 21. State Management

Three types: local UI state (React state/hooks), asynchronous data state (TanStack Query), canonical business data (centralized mock store during dev; authenticated backend API + persistent data in production). TanStack Query caches are not permanent source of financial/membership truth. Do not store important server business records only in local React state.

---

## 22. TanStack Query Conventions

Query key organization, feature-specific hooks, typed results, mutation handling, cache invalidation, pagination, search, error mapping, loading states, cache isolation between identities, session transitions, sensitive data protection. On identity change (dev demo switch or real login/logout): invalidate permission-sensitive queries, clear inappropriate cached data, refresh authorized navigation, prevent previous user data leakage.

---

## 23. Centralized Mock Data Architecture

One centralized, browser-scoped, in-memory mock business data store. Rules: synthetic seed records only; no real customer info; no localStorage/IndexedDB persistence; reset to initial synthetic seed state on full browser refresh; use repository adapters; components do not directly mutate seed arrays; consistent identifiers across related records.

### 23.1 Next.js runtime boundary

A module-level store in server runtime is not equivalent to browser-scoped mock store. Do not use a mutable server singleton that could share mock user data across HTTP requests/sessions. Document isolation-safe browser-scoped development approach consistent with App Router. Do not claim server module state automatically resets on browser refresh.

### 23.2 Synthetic data relationships

Mock data supports realistic relationships among staff/roles, Sales Network, genealogy, accreditations, customers, VIP products, contracts, sales, finance records, commissions, memberships, Stay Points, audit events.

### 23.3 Demo identity switching

Support simulated authorized users: Super Admin, Admin, Finance, Staff, SVD, SSM, SM, OST. Role switching is development-only; never exposed as production impersonation. Changing identities invalidates permission-sensitive caches.

### 23.4 Mock data service behavior

Mock repository supports CRUD simulations where authorized, filtering, search, pagination, related-record lookup, simulated async operations, validation outcomes, domain state transitions, error scenarios, permission-aware results, audit simulations. Mock store must follow same domain contracts as intended backend; not an independent business-rule authority.

---

## 24. Repository Contracts and API Adapters

Frontend communicates through typed data access contracts. Document repository interfaces, mock adapters, HTTP API adapters, typed inputs/outputs, domain service interfaces, error handling, cache integration.

Mock data flow: Feature UI → Frontend Hook/Application Interface → Repository Contract → Mock Adapter → Centralized In-Memory Mock Store.

Production API flow: Feature UI → Frontend Hook/API Client → REST `/api/v1` → Authentication → Authorization → Domain Application Service → Mongoose Repository → MongoDB Atlas.

Frontend must not directly connect to MongoDB.

### Mock-to-real migration

Preserve stable interfaces when replacing mock adapters with live API adapters. Avoid rewriting every component, recreating business rules in hooks, duplicate source-of-truth stores, inconsistent identifiers, incompatible error handling, stale permission-sensitive caches.

---

## 25. Type Safety and Validation

TypeScript throughout frontend. Domain types from shared contracts; avoid conflicting versions per feature. Zod for forms, input constraints, shared API payloads, client-side validation, type inference, data boundary validation. Client validation improves UX; server validation authoritative. Do not allow valid frontend form to bypass backend eligibility checks.

Do not make frontend-calculated financial values authoritative. UI may display provisional amounts, calculated previews, pending summaries. Authoritative payment, commission, activation, points outcomes follow backend business rules.

---

## 26. Forms and User Input

Architecture for controlled inputs, shared validation, required/optional/dynamic fields, dropdowns, searchable selections, date selection, numeric input, phone input, file uploads, submission states, validation errors, duplicate-submission prevention, draft saving, form resetting, accessible labels.

### 26.1 Existing AFHomes input preferences

Where supported by canonical business documents: normalize names appropriately, apply approved capitalization, validate Philippine mobile-number formats, use approved ID-type choices, use authorized geographic/address selections, system-managed postal code where supported, avoid invalid characters in numeric-only fields. Do not enforce blindly on every international/non-phone field; use domain-specific validation.

### 26.2 Customer drafts

Draft records may contain incomplete information. Distinguish Save Draft vs Submit Application. Do not require fully completed application validation merely to save an authorized partial draft.

### 26.3 Financial submissions

Payment submission UI must not falsely indicate Finance has verified the payment. Use accurate submission and verification status presentation.

---

## 27. Authentication-Aware Frontend

Support authentication through approved server-side architecture. Better Auth is target direction, with actual compatibility subject to verification. Document login screens, logout, session awareness, protected navigation, session loading, expired sessions, unauthorized screens, deactivated/suspended accounts, role selection where authorized, security-sensitive interactions. Do not write independent competing frontend authentication system. Do not treat development demo accounts as production credentials.

---

## 28. Module RBAC and Record Visibility

Distinguish Module Access, Operation Permission, Record Visibility. Permission-aware components: navigation guards, permission-aware actions, disabled actions, authorized toolbar buttons, secure record filtering, protected detail views, status-based workflows.

Frontend is not ultimate permission enforcement layer. Backend independently authorizes sensitive operations and data access. Do not assume hidden button protects an API.

Visibility scopes: preserve approved own/team/all concepts and actual genealogy rules. Do not assume all managers may view all sellers or all customer details.

Privacy-aware displays: implement authorized masking and field access. Do not expose private government IDs, bank records, payment proof, or unrelated customer information simply because available in a frontend response.

---

## 29. Business Module Frontend Responsibilities

(As in Part 20 of task: Organization Management, Roles & Permissions, Sales Network, Genealogy, Accreditation, Customer Management, VIP Products and Contracts, Sales, Finance, Commission Management, VIP Membership and Card Issuance, Stay Points, Reports and Analytics, Audit Logs, Redemption (disabled), Services (disabled).) Each with UI concerns. Do not equate sales creation with Finance verification; do not apply new product config to historical finalized contracts; do not automatically distribute commissions from genealogy; do not equate Confirmed Sale with Active Membership; frontend must not directly mutate authoritative points balances; reports use approved source metrics; audit not editable table; redemption/services preserved but disabled.

---

## 30. Dashboard Design

Shared approach for role-specific dashboards: page heading, filter toolbar, date-range control, summary cards, data tables, charts, activity history, status indicators, empty states, drill-down navigation. Business correctness: do not invent metric calculations; use approved definitions. Role-specific summaries follow authorized account scope; OST should not see organization-wide reporting; IST access respects hierarchy; Finance reporting access does not automatically grant unrestricted admin capabilities.

---

## 31. Tables, Search and Filtering

Common standards: typed columns, pagination, search, sorting, status filters, date filters, responsive overflow, loading skeletons, empty/error states, accessible headings, appropriate row actions, permission-aware columns, server-driven filtering when integrated.

Search correctness: search interfaces must not reveal unauthorized records through autocomplete, counts, filter options, hidden columns, error messages, pagination totals, export results.

Company terminology: consistent AFhomes terminology; do not revive removed UI labels without approved need.

---

## 32. File Uploads and Media Presentation

Frontend behavior for payment proofs, customer ID documents, accreditation photographs, contract attachments, public website media. Cover file selection, type restrictions, size validation, upload progress, error handling, private previews, authorization, download/access links, responsive presentation. Client-side validation not sufficient; backend independently validates authorized uploads and access. Do not expose private file URLs in public interfaces. Do not assume production storage provider selected.

---

## 33. Frontend Error Handling

Consistent error presentation: validation, authentication, authorization, not found, duplicate records, invalid business-state transitions, network failures, timeouts, expired sessions, temporary unavailability, unexpected API failures. User-friendly messages; avoid exposing stack traces, MongoDB details, server secrets, sensitive backend error info. Appropriate recovery actions. Do not show success before authoritative operation succeeds.

---

## 34. Loading, Empty and Success States

Every major feature defines appropriate presentation states: initial loading, background refresh, empty data, no search matches, no permission, pending approval, successful submission, verification pending, completed transaction, request rejected, recoverable error. User-facing status must match underlying business lifecycle (e.g., do not use generic success banner for payment merely submitted and awaiting Finance verification).

---

## 35. Responsiveness and Accessibility

Mobile-first responsive layouts; desktop operational efficiency; responsive sidebar; tables with appropriate overflow; form layouts; dialog accessibility; keyboard navigation; screen reader labels; focus management; error announcements; sufficient contrast; reduced-motion support; responsive text and controls. Do not remove complex business information merely to fit mobile; use progressive disclosure and responsive presentation.

---

## 36. Performance Architecture

Frontend performance requirements: route-level splitting, lazy loading when justified, Server Components, appropriate client boundaries, image optimization, large-table pagination, avoiding unnecessary rerenders, cache management, search request handling, bundle-size awareness, performance measurement. Potential heavy features: genealogy visualization, advanced reporting charts, complex operational tables, historical import previews, large financial forms. Do not introduce performance libraries without clear justification.

---

## 37. Frontend Security

No privileged database access in browser code; no secrets in client bundles; safe handling of authenticated data; secure session-aware UI; authorization-aware navigation; proper logout cleanup; permission-sensitive cache isolation; input validation; safe file upload presentation; sensitive field masking; public/private interface boundaries; production demo-mode restrictions. Do not claim client-side RBAC alone provides secure access control.

---

## 38. Feature Flags

Frontend architecture must support feature availability controlled by approved backend/configuration rules. Current target status: Redemption Disabled, Services Disabled. Document behavior for sidebar visibility, direct navigation, feature pages, feature actions, API calls, role permissions, disabled-state presentation. Feature flag must be enforced by backend for protected workflows. Hiding a menu item is not sufficient. Do not implement or activate these modules during this task.

---

## 39. Frontend and Backend Integration

Frontend consumes versioned API `/api/v1`. Document integration architecture for authentication, requests, typed API clients, query parameters, pagination, filtering, mutations, validation responses, error handling, query invalidation, idempotent submission patterns, file uploads, authorization failures.

### 39.1 Integration migration

During initial frontend phase: use mock adapters. During future approved backend integration: replace with real API adapters. Preserve frontend feature interfaces where practical. Do not hardcode MongoDB or Mongoose into frontend components.

### 39.2 Secure server integration

Frontend must not bypass server-side payment verification, membership activation, commission approval, genealogy restrictions, Stay Points balance validation, official identifier generation.

---

## 40. Future Customer and Mobile Compatibility

Approved architecture allows future extension. Customer Portal: future web panel in same Next.js app; do not implement prematurely. Mobile: future React Native + Expo in same repository; uses shared REST APIs; potentially shares domain types, Zod schemas, API contracts, platform-neutral utilities; does not directly share Next.js page components, browser-specific hooks, DOM-based UI components, shadcn/ui components, web navigation. Do not create mobile files or packages now.

---

## 40.8 Organization & Staff Management (Frontend)

Final verification: department transfer count update is covered by `org-transfer-count.test.tsx` (Finance 1→0, HR 1→2). All 116 tests pass. Lint, TypeScript, and build pass. Browser visual verification remains pending owner review.

Final verification: department edit/save/cancel, staff edit/save/cancel, search, filter, sort, and department counts are covered by React Testing Library interaction tests. Unsupported Department Head assignment and staff employment-status editing are blocked at repository level. Tests: 9 department repo + 9 staff repo + 11 org interaction. Total suite 110 passing.

Department create/edit, staff create/edit, search/filter/sort, employee counts, and profile view are implemented. Department Head assignment and staff employment-status editing were removed because canonical eligibility/policy is undefined. Department active/archived status is supported. Tests: 5 department + 5 staff repo tests + 4 RTL interaction tests.

Organization Management is implemented at `/admin/organization` with departments and staff tabs. Departments support create/edit, search, filter, sort, and employee counts. Staff supports create/edit, search, filter, sort, and profile view. Repositories enforce authorization (super_admin/admin/hr). Tests: 5 department + 5 staff repository tests. No backend/DB/auth.

## 40.7 Account Management (Frontend)

Account status transitions are enforced in `MockAccountRepository` via `ALLOWED_TRANSITIONS`. Protected Super Administrator accounts cannot be modified by non-super-admin actors. Super Administrator role assignment/revocation is restricted to super-admin actors. Dashboard KPI cards remain gated by module grants. (R3 corrections applied.)

Account Management is implemented at `/admin/accounts` and gated by the `accounts` module grant (Super Admin/Admin only). It provides list, search, filter, sort, details, create, edit, role assignment/revocation, and status transitions over the centralized in-memory mock store. Forms use inline validation and duplicate-email checks. Dashboard KPI cards are gated by their own module grants (sales-network/customers). No backend, auth, or database work is included.

## 40.6 Dashboard and Analytics (Frontend)

Dashboard KPIs use only scoped mock repositories that exist: visible team members and visible customers (admin/HR/Finance panels) plus visible members, customers, and uplines (Sales Network panel). Metrics are calculated via pure helpers in `dashboard-metrics.ts`. No financial, sales, commission, or membership metrics are displayed because their frontend data contracts do not yet exist. Loading and empty states are handled. Date filters and charts are deferred until dated repositories exist.

## 40.5 Sales Network Panel Shells (Phase 1B-B06)

The `/admin` dashboard title adapts to Sales Network designations (SVD, SSM, SM, IST, OST) in addition to Admin/HR/Finance. Shared layout/navigation/permission components are reused. No dedicated Sales Network routes or business modules are introduced; full Sales Network panels are deferred.

## 40.4 Admin and Operations Panel Shells (Phase 1B-B05)

The `/admin` dashboard is a role-sensitive shell: title and description adapt to effective active roles (Super Administrator, Administrator, HR, Finance, Sales Network, Sales, Staff) and inactive accounts see a restricted state. No fake KPIs or unimplemented module links are rendered. Shared layout/navigation/permission components are reused. Sales Network dedicated panels and business modules remain deferred.

## 40.3 Role-Aware Navigation Baseline (Phase 1B-B04-R3)

R3 aligns the resolver with the approved scoped baseline. Super Admin/Admin receive Dashboard, Organization, Accounts, and VIP Products. HR receives Dashboard and Organization. Finance receives Dashboard and Finance. SVD/SSM/SM/IST/OST receive Dashboard and Sales Network. All other modules remain denied pending canonical grants. Operation-level permissions are modeled separately (`hasOperationPermission`) for Finance verification/refunds/reconciliation, commission approval/payout, HR staff vs role administration, and sales/customer visibility. Dashboard is a neutral landing, not a business-module grant.

## 40.2 Role-Aware Navigation (Phase 1B-B04)

Phase 1B-B04-R1 reconciled grants with canonical docs: Super Admin/Admin receive Dashboard plus Organization and Accounts; HR receives Dashboard plus Organization; Finance receives Dashboard plus Finance; SVD/SSM/SM/IST/OST receive Dashboard plus Sales Network. All other modules (accreditation, customers, VIP products, sales, commissions, membership, stay points, reports, audit logs) are denied by default pending canonical grants. Dashboard is a neutral landing page, not a business-module permission.

Role-aware navigation is resolved in `src/modules/identity/permissions.ts` and consumed through `useRoleAwareAdminNavigation`. Effective active roles are derived from the existing mock identity model, including multiple active roles and inactive assignments. Grants are deny-by-default; inactive accounts receive no modules. Super Admin and Admin receive the full provisional module set; HR, Finance, and Sales Network roles receive only the documented/approved subsets. Desktop and mobile navigation share the same filtered result. Breadcrumbs are filtered through `getRoleAwareAdminBreadcrumbs`. These grants are simulated frontend defaults pending the canonical role matrix; backend authorization remains authoritative. No backend, database, or authentication work is included.

## 40.1 Navigation System (Phase 1B-B03)

The Admin navigation is centralized in `src/panels/admin/navigation.ts`. It defines available and future module entries, recursive availability filtering, normalized route matching (`normalizePath`, `isAdminNavItemActive`), and breadcrumb resolution (`getAdminBreadcrumbs`). Only available destinations render as links; future modules remain unavailable until implemented. Nested groups are supported through `AdminNavList` and `NavGroup`, with accessible disclosure controls and `aria-current`. Unknown routes use the global `src/app/not-found.tsx`. Navigation rendering accepts a filtered item list so future role-aware filtering (B04) can be added without changing rendering components. Mock providers and store behavior are unchanged.

## 41. Frontend Testing Strategy

Approved initial method is frontend-first and manual-first. Production readiness requires automated verification. Relevant tests: component behavior, navigation, forms, validation, mock repository behavior, permission-aware UI, data visibility, Finance workflow presentation, customer draft behavior, Sales Network genealogy, VIP status presentation, commission lifecycle states, Stay Points balance presentation, loading/error states, accessibility, responsive behavior, API integration, security-sensitive cache clearing. Refer to `docs/development/testing.md`. Do not claim test suites exist or have passed unless verified.

---

## 42. Frontend Implementation Phases

Align with `implementation.md`. Phase 0 documentation; Phase 1 frontend foundation (scaffold, Tailwind/shadcn, shared components, Admin layout, Public layout, auth UI placeholders, typed contracts, mock repository foundation, demo identities, role-aware navigation, initial selected module interfaces) — exact authorized Phase 1 scope must be approved separately; do not interpret as blanket authorization to build every module at once. Phase 2 database design (frontend contracts aligned); Phase 3 backend foundation (API contracts, real auth/authz); Phase 4 business modules; Phase 5 integration; Phase 6 testing; Phase 7 deployment readiness; Phase 8 stabilization. Do not invent dates or staffing.

---

## 43. Frontend Business Invariants

1. One Next.js application.
2. Panel-based modular architecture.
3. Feature-based organization.
4. React and TypeScript.
5. Next.js App Router.
6. Tailwind CSS and shadcn/ui.
7. Zod validation.
8. TanStack Query for appropriate async state.
9. Thin route composition.
10. Shared domain contracts.
11. No business rules duplicated unnecessarily in components.
12. No MongoDB access from browser components.
13. No client-side production secrets.
14. Centralized mock store during frontend-first development.
15. No localStorage persistence for mock business data.
16. Mock data resets on full browser refresh.
17. Development identities never become production authentication.
18. Permission-aware navigation.
19. Server-side authorization remains authoritative.
20. Record-level privacy remains protected.
21. Historical genealogy attribution remains intact.
22. Payment submission is not Finance verification.
23. Confirmed Sale is not necessarily Fully Paid.
24. Fully Paid does not automatically mean Active Membership.
25. Commission approval is manual.
26. Approved Commission is not automatically Paid Commission.
27. Stay Points earning capacity is not spendable balance.
28. Reserved points are not finally consumed points.
29. Gold supplementary holders share one membership points pool.
30. Official identifiers come from the authoritative backend process.
31. Reports use approved source metrics.
32. Public verification respects disclosure restrictions.
33. Public CMS architecture remains supported.
34. Redemption remains disabled.
35. Services remains disabled.
36. Customer Portal is a future implementation phase.
37. Mobile is a future implementation phase.
38. Frontend configuration must accommodate authorized business-policy changes.
39. Existing signed contract rights are not overridden by current UI defaults.
40. Documentation does not authorize application implementation.

---

## 44. Cross-Document References

- `docs/development/architecture.md` — system architecture.
- `docs/development/backend.md` — backend architecture.
- `docs/development/database.md` — MongoDB Atlas.
- `docs/development/security.md` — security.
- `docs/development/testing.md` — testing.
- `docs/development/implementation.md` — phases.
- `docs/development/deployment.md` — deployment.
- `docs/development/README.md` — navigation.
- `docs/business-rules/01–13` — authoritative business rules.

---

## 45. Implementation Acceptance Criteria

### Architecture
- [ ] Next.js App Router explicitly selected.
- [ ] React and TypeScript.
- [ ] Single modular monolith.
- [ ] No unapproved separate frontend/backend applications.
- [ ] Panel boundaries.
- [ ] Shared domain architecture.
- [ ] Server-only database boundaries.
- [ ] Future Customer/Mobile correctly deferred.

### Frontend Stack
- [ ] Tailwind CSS.
- [ ] shadcn/ui.
- [ ] CSS Modules where appropriate.
- [ ] Zod.
- [ ] TanStack Query.
- [ ] Typed API adapters.
- [ ] Centralized mock store.

### Panels
- [ ] Admin/Operations.
- [ ] Public.
- [ ] IST/SVD/SSM/SM.
- [ ] OST.
- [ ] Future Customer.
- [ ] Panel-specific design themes.
- [ ] Role-aware navigation.

### Business Modules
- [ ] Organization and Roles.
- [ ] Sales Network.
- [ ] Genealogy.
- [ ] Accreditation.
- [ ] Customers.
- [ ] VIP Products.
- [ ] Contracts.
- [ ] Sales.
- [ ] Finance.
- [ ] Commissions.
- [ ] Membership.
- [ ] Stay Points.
- [ ] Reports.
- [ ] Audit.
- [ ] Disabled Redemption.
- [ ] Disabled Services.

### Data and Security
- [ ] Mock reset on refresh.
- [ ] No mock localStorage persistence.
- [ ] No direct seed mutation in components.
- [ ] Cache isolation.
- [ ] Server-authoritative validation.
- [ ] RBAC.
- [ ] Record-level visibility.
- [ ] Public privacy.
- [ ] No client database credentials.
- [ ] No unauthorized automatic financial transitions.

### Quality
- [ ] Responsive design.
- [ ] Accessibility.
- [ ] Loading/error/empty states.
- [ ] Typed forms.
- [ ] Frontend testing.
- [ ] Performance.
- [ ] Implementation phase alignment.
- [ ] Cross-document consistency.

Only mark criteria complete if actually documented. Documentation completion is not proof of implemented functionality.

---

## Completion Report

- **File created/updated:** `docs/development/frontend.md` (rewritten/expanded).
- **Frontend architecture coverage:** Next.js App Router, React/TypeScript, folder structure, panel architecture, UI design system, state management, mock data, typed adapters, API integration, security, frontend testing.
- **Portal coverage:** Admin/Operations, Public, IST, OST, Future Customer.
- **Business module coverage:** Organization/Roles, Sales Network, Genealogy, Accreditation, Customers, VIP Products, Contracts, Sales, Finance, Commissions, Membership, Stay Points, Reports, Audit, disabled Redemption/Services.
- **Cross-document consistency:** Aligned with architecture.md and business rules 01–13. No material conflicts.
- **Frontend implementation readiness:** Sufficient direction for future Phase 1 frontend task. Material unresolved dependencies: auth framework compatibility, exact API contracts, storage provider selection, feature flag mechanism.
- **Validation results:** Markdown structure validated; relative links verified; architecture and business-rule consistency checked; git diff inspection performed.
- **Execution safety:** Application code modified: No. Application scaffold created: No. Database modified: No. APIs implemented: No. Other documentation modified: No. New development files created: No. Git commit: No. Git push: No. Git merge: No. Deployment: No. Redemption enabled: No. Services enabled: No.

STOP — awaiting explicit authorization before beginning Phase 1 implementation.

## 41. Official UI Component Standard — shadcn/ui First

shadcn/ui is the mandatory primary component foundation for all AFHomes frontend work.

1. Official reference: https://ui.shadcn.com/docs/components.
2. Reuse existing components in `src/components/ui/` before introducing new implementations.
3. If an appropriate official shadcn/ui component exists but is not installed, integrate it using the official documentation and the project's Base UI-compatible configuration.
4. Prefer composition of shadcn primitives for complex business interfaces.
5. Build a custom primitive only when no official component or combination can satisfy the requirement, and document the reason.
6. Do not use raw custom interactive controls as shortcuts when suitable shadcn components exist.
7. All components must follow the official AFHomes theme tokens defined in `src/app/globals.css`.
8. Accessibility and responsiveness are mandatory.
9. Future AI coding agents must follow these standards.
10. Existing business functionality must not be changed during UI standardization.
