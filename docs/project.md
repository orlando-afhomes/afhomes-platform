# AFHomes Platform — Master Project Context

> Authoritative project-level context for AI coding agents and contributors.
> Detailed specs live under `docs/business-rules/` and `docs/development/`.
> This file is the single source of master project context; do not duplicate field schemas or permission matrices here.

---

## Part I — Project Overview

### 1. Project Identity

| Attribute | Value |
|---|---|
| Project Name | AFHomes Platform |
| Repository / Root Directory | `afhomes-platform` |
| Project Type | Full-Stack Web-Based Business Management Platform |
| Architecture | Modular Monolith |
| Development Methodology | Accelerated Agile SDLC |
| Development Strategy | Frontend-First, Mock-Data-Driven |
| Development Execution | AI-Assisted Development |
| MVP Target | Seven Calendar Days |
| Current Phase | Planning and Documentation |
| Primary Deliverable | Functional Web-Based MVP |
| Initial Development Environment | Local Development |
| Planned Database | MongoDB |
| Planned Authentication | Better Auth |

### 2. Project Background

AFHomes requires a centralized platform for managing business operations, organizational users, customers, VIP membership cards, IST/OST accreditation, sales genealogy, and related administrative processes. The new platform aims for a cleaner, more organized, modular, secure, and scalable foundation. The initial MVP focuses on essential operational functionality rather than every business module, designed for long-term maintainability and future expansion without unnecessary architectural complexity.

### 3. Project Objectives

**Primary objective:** Develop a functional, secure, maintainable, and extensible web-based MVP for AFHomes within the seven-day development target.

**Specific objectives:**

1. Establish authentication and authorization.
2. Implement configurable Role-Based Access Control (RBAC).
3. Provide CRUD operations for system roles and permissions.
4. Provide CRUD operations for customer records.
5. Manage VIP card product definitions.
6. Manage customer-issued VIP cards.
7. Manage IST/OST personnel and accreditation.
8. Implement and maintain the AFHomes sales genealogy.
9. Provide public IST/OST accreditation verification.
10. Provide authorized customer search for staff.
11. Maintain audit logs of important system operations.
12. Implement the minimum Finance verification workflow required for VIP card activation.
13. Establish reusable business services and API-ready architecture for future expansion.
14. Prepare the platform for future modules and mobile application integration.

---

## Part II — System Scope

### 4. System Interfaces

The initial MVP consists of two primary web interfaces.

#### 4.1 Minimal Public Interface

Accessible without authentication. MVP responsibilities:

- Basic AFHomes branding and navigation
- Public IST/OST accreditation verification
- Authorized login entry point

The public search must use exact official accreditation numbers only. A complete public marketing website is outside the initial MVP; additional public pages, announcements, galleries, marketing content, and other features may come in future phases.

#### 4.2 Admin and Staff Portal

The primary operational interface. Required modules:

- Dashboard and navigation
- Authentication and account access
- Role and permission management
- Customer management
- VIP product management
- Customer-issued VIP card management
- IST/OST management
- Sales genealogy
- Staff customer search
- Finance verification and VIP activation
- Audit log viewing

The portal must support permission-based navigation and access. Different roles may share the same application shell while receiving different menus, actions, and data visibility.

**Important:** Hiding a menu item does not constitute authorization. All protected operations must eventually enforce permissions and record-level access on the backend.

#### 4.3 Future Customer Portal (excluded from MVP)

Potential future capabilities: customer profile management, VIP membership information, issued VIP card details, benefits and entitlements, membership status, other self-service features. Architecture must allow future introduction without a major rewrite.

#### 4.4 Future Mobile Application (excluded from MVP)

The platform must maintain reusable business services and versioned API boundaries to support future mobile clients.

### 5. Target Users and Roles

| Role / User | General Responsibility |
|---|---|
| Super Administrator | Overall system administration and protected system management |
| Administrator | Authorized administrative operations |
| HR | Personnel and organizational administration |
| Finance | VIP payment/settlement verification and activation authorization |
| Vice Director (VD) | Sales organization leadership |
| Senior Sales Manager (SSM) | Sales hierarchy management |
| Sales Manager (SM) | Sales team management |
| Internal Sales Team (IST) | Authorized internal sales operations |
| Outside Sales Team (OST) | Authorized outside sales operations |
| Staff | Operational tasks based on assigned permissions |
| Customer | VIP membership holder; future portal access |
| Public Visitor | Public accreditation verification |

These descriptions are general context only and must not be treated as the final permission matrix. Detailed roles, permissions, access scopes, and restrictions are documented separately under `docs/business-rules/`.

---

## Part III — Confirmed MVP Requirements

### 6. Priority 0 (P0) Functional Scope

#### 6.1 Authentication and Authorization

Required: login/logout, secure session handling, protected routes, account status enforcement, role-aware navigation, authorization checks, secure authentication integration.

**Approved auth technology:** Better Auth with MongoDB. Before backend implementation, verify compatibility between Better Auth, the MongoDB adapter, Next.js, and the selected runtime. During frontend development, authentication may be simulated through mock services. During backend integration it must become real and server-enforced. Mock authentication is never production-ready.

#### 6.2 Roles and RBAC Management

**Approved model:** Protected system roles with configurable built-in and custom roles.

Required: create custom roles; view roles; update configurable roles; archive/deactivate eligible roles; manage permissions; assign roles to users; restrict module access; restrict operations by permission; support record-level access scopes (`own`, `team`, `all`); prevent unauthorized privilege escalation; audit role/permission changes.

The Super Administrator role is protected. The system must prevent unauthorized modification/deletion of protected system privileges and removal of the last effective Super Administrator. Permission enforcement must be centralized, not independently hardcoded across components. The exact role-permission matrix is defined in a separate business-rules document.

#### 6.3 VIP Product Management

Manage AFHomes VIP card product definitions. Initial tiers: Bronze, Silver, Gold.

Required: create/view/update/archive-deactivate products; manage pricing, benefits, validity, contract versions, product status.

**Approved source:** Latest approved 2026 AFHomes VIP contracts. Baseline:

| Tier | Official Tier Code | Standard Price | Validity | Discount |
|---|---|---|---|---|
| Bronze | B1 | ₱72,000 | 7 years (5+2) | 15% |
| Silver | S1 | ₱240,000 | 12 years (10+2) | 20% |
| Gold | G1 | ₱390,000 | 22 years (20+2) | 25% |

Complete terms, benefits, restrictions, and conditions must be reconciled against approved source contracts before final implementation. Product definitions and historical contract versions must remain distinguishable; do not silently overwrite previously approved contract terms.

#### 6.4 Customer-Issued VIP Card Management

Manage individual VIP cards issued to customers. VIP product definitions and customer-issued VIP cards are **separate domain entities**; updating a VIP product must not automatically modify historical contract snapshots of previously issued cards.

Required: issue cards; associate with customers; generate/assign unique card control numbers; view/update permitted info; manage statuses; track Finance verification; track activation info; track validity dates; preserve contract snapshots; deactivate/archive; maintain issuance and activation history.

**Approved activation policy:** Newly issued cards initially remain Pending. A card must not automatically become Active merely because issued. Activation requires Finance verification and approval based on approved payment/settlement eligibility rules. The minimum Finance activation workflow is included in the MVP; detailed eligibility rules documented separately before production.

#### 6.5 Customer Management

Required: create/view/update/archive-deactivate customer records; generate official customer IDs; associate customers with issued VIP cards; validate required fields; prevent defined duplicates.

Approved customer ID format/RA No.: `YYYY-NNNN` (e.g., `2026-0001`). Official IDs must be unique. Historical relationships and audit records must remain intact when a customer is archived.

#### 6.6 IST/OST Management

Required: create/view/update/deactivate IST/OST records; manage official accreditation numbers; manage accreditation status; manage applicable validity and renewal info; associate eligible members with the sales hierarchy.

IST and OST must remain distinguishable accreditation types with their respective identifier formats. Do not assume identical renewal policies. Detailed issuance/renewal/transfer rules maintained in a separate business-rules document.

#### 6.7 Sales Genealogy

Hierarchy: **VD → SSM → SM → OST**. Approved direct OST placement under VD or SSM must be supported without inventing intermediate managers.

Required: parent/upline assignment; hierarchical relationship management; expandable genealogy tree; member search; hierarchical visibility; relationship validation; circular relationship prevention; controlled reassignment; genealogy history.

Genealogy must be based on actual entity relationships, including during mock development. IST must not automatically be inserted into the OST sales genealogy unless an approved business rule requires it.

#### 6.8 Public IST/OST Accreditation Search

**Approved policy:** Exact official AA number only; active results only.

Required: search using exact official AA number; normalize input per approved AA formatting rules; return only qualifying active accreditations; exclude inactive/deactivated/revoked/expired; generic not-found response for nonqualifying searches; validate input; apply rate limiting during backend integration; display only approved public information.

No name-based public discovery. Approved display distinction: **IST** does not display "Valid Until"; **OST** displays "Valid Until" where applicable.

Public search must not expose: private contact info, residential addresses, identification documents, financial information, or other unauthorized personal information. Exact public result field specification maintained separately.

#### 6.9 Staff Customer Search

Authorized staff search customer records by official customer ID and authorized customer name fields; display permitted info; apply role-based and record-level access restrictions; support filtering and appropriate result handling. Internal operational search, separate from any future public customer lookup.

#### 6.10 Audit Logs and Activity History

Record important operations: authentication events; role/permission changes; customer changes; VIP product changes; issued VIP card changes; IST/OST accreditation changes; genealogy changes; Finance verification decisions; VIP card activation events; other sensitive admin actions.

Audit records should contain: actor, action, target entity, timestamp, outcome, relevant safe change metadata. Never record passwords, auth tokens, or unnecessary sensitive information. During frontend development, audit events may be simulated through centralized mock services; during backend integration, logging must be persistent, protected, and server-enforced.

#### 6.11 Finance Verification and VIP Card Activation (P0)

Include the **minimum** Finance module required for VIP card activation — not the entire Finance system.

Required capabilities: view pending activation requests; review customer and issued-card info; review applicable contract info; review payment/authorized settlement evidence; approve/reject verification; record decisions, responsible Finance personnel, timestamps, reasons; enforce activation eligibility; activate eligible cards; record activation date and validity info; maintain verification and activation audit history.

**Workflow:** (1) Authorized staff issues a VIP card → (2) card enters Pending → (3) request appears in Finance verification queue → (4) authorized Finance reviews evidence → (5) approve or reject based on verified eligibility → (6) only Finance-approved requests may proceed to authorized activation → (7) system records activation and audit history.

Finance approval must not be simulated as an unrestricted status toggle in production.

**Frontend mock phase:** simulate pending activation requests, Finance approve/reject, role-based Finance access, mock audit events, realistic success/rejection/validation scenarios.

**Backend phase:** enforce Finance permissions server-side; persist verification records; validate activation eligibility; prevent duplicate/unauthorized activation; preserve audit history; ensure consistent state transitions.

Detailed payment verification and settlement eligibility rules must be defined separately before production implementation.

### 7. Features Outside the Initial MVP

Unless explicitly approved later, defer:

- Finance workflows beyond VIP card verification and activation
- Full accounting and financial reporting
- General payment collection workflows
- Commission calculation and withdrawals
- Advanced analytics
- Complex reporting
- Service booking
- Stay-point redemption
- QR-based redemption
- Full CMS administration
- Bulk historical data migration
- Dedicated mobile applications
- Customer portal
- Advanced customer self-service
- Full public marketing website

These may influence module boundaries and data modeling but must not introduce unnecessary implementation work during the seven-day MVP.

---

## Part IV — Development Approach

### 8. Frontend-First Development Strategy

**Frontend-first, mock-data-driven.** Establish functional, approved UI/UX before integrating real backend services and MongoDB.

- **Stage 1 — Documentation and Planning:** master project context, MVP scope, business rules, architecture guidelines, frontend guidelines, mock data strategy, AI agent instructions.
- **Stage 2 — Centralized Mock Data:** one centralized mock data system: typed entity models, consistent relationships, reusable seed data, shared repository interfaces, simulated async operations, mock CRUD, mock auth/authz, mock Finance verification, mock audit events, optional localStorage persistence. Components must not maintain separate conflicting copies of business records; all modules access mock data through defined services/repositories. Mock data must maintain consistent relationships across customers, VIP products, issued cards, sales-team members, accreditations, Finance verification records, and audit events.
- **Stage 3 — Frontend Implementation:** functional interfaces using centralized mock data: working navigation, functional CRUD forms, search/filtering, form validation, confirmation dialogs, loading/empty/error states, responsive layouts, permission-aware interface simulation, genealogy visualization, Finance verification workflow, VIP card activation workflow, audit log viewing. Must behave like a functional app without a real database; no purely decorative interfaces.
- **Stage 4 — UI/UX Review and Approval:** project owner reviews/tests; visual inspection, workflow testing, usability review, layout adjustments, form/navigation refinement, module approval. Avoid unnecessary backend work before frontend milestone approved. Timebox frontend refinement to preserve backend integration time.
- **Stage 5 — Backend and Database Integration:** replace mock implementations with real backend services. Approved/planned tech: MongoDB, Mongoose, Better Auth, application APIs, server-side RBAC, server-side validation, persistent audit logs, database indexes, data consistency safeguards. Verify compatibility between framework, auth library, MongoDB adapter, and runtime before implementation. UI should communicate through stable service interfaces so replacing mock repositories does not require rewriting presentation components.
- **Stage 6 — Testing and Release Evaluation:** functional, CRUD, authentication, authorization, search, genealogy, Finance verification, VIP card activation, audit log, integration, regression, security testing. Not production-ready while relying on mock auth or localStorage for authoritative business data. Public deployment requires separate hosting approval.

---

## Part V — Technical and Architectural Direction

### 9. Preferred Technology Stack

| Layer | Technology |
|---|---|
| Full-Stack Framework | Next.js |
| Frontend | React |
| Programming Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| Validation | Zod |
| Database | MongoDB |
| Database Modeling | Mongoose |
| Authentication | Better Auth |
| Unit and Integration Testing | Vitest |
| Browser Testing | Playwright |
| Local Containerization | Docker Compose |

Preferred architecture: **single deployable modular monolith**.

Avoid: microservices, unnecessary monorepo complexity, separate frontend/backend repos without justification, premature infrastructure abstraction, unnecessary dependencies, vendor-specific lock-in where practical alternatives exist.

#### 9.1 Hosting and Deployment

**Approved decision:** Local development first. No production hosting provider committed. Potential future options: DigitalOcean, Adaptive Web Hosting. MongoDB is the planned application database.

Do not assume a hosting provider supports the selected runtime without verification. Do not provision, purchase, or deploy production infrastructure without explicit approval. The seven-day MVP target includes release-readiness evaluation, but public deployment remains conditional on hosting approval. Prioritize free, local, open-source tools where feasible.

### 10. Architectural Principles

1. Separation of concerns
2. Clear module boundaries
3. Centralized business rules
4. Reusable UI components
5. Shared validation contracts
6. Repository-based data access
7. Secure-by-default authorization
8. Consistent error handling
9. Traceable state changes
10. Minimal unnecessary complexity
11. Maintainability
12. Extensibility
13. API readiness for future clients

Remain a modular monolith unless a future architectural change is justified.

### 11. Data Management Principles

Support: centralized mock data during frontend development; consistent IDs and entity relationships; shared data access contracts; unique official identifiers; soft deletion/archival where appropriate; versioned VIP product definitions; historical contract snapshots for issued VIP cards; Finance verification records; activation history; traceable business operations; protected audit records; backend-enforced validation and permissions in production; compatibility with future historical data imports.

LocalStorage may be used only for disposable development state. Do not store real sensitive customer information, plaintext passwords, auth tokens, or authoritative business records in localStorage.

#### 11.1 Historical Data Migration

**Approved decision:** Design import compatibility now; perform migration after the MVP.

- Use synthetic data during mock development.
- Preserve official identifier formats.
- Maintain consistent entity relationships.
- Consider future import mapping requirements.
- Avoid architectural decisions that prevent historical imports.
- Do not import live business data during the seven-day MVP.
- Do not modify the existing production database.

Actual migration procedures will be designed and approved separately.

---

## Part VI — Project Execution

### 12. Seven-Day Accelerated Agile SDLC

| Day | Primary Activities |
|---|---|
| Day 1 | Documentation, architecture, mock data contracts, project foundation |
| Day 2 | Admin/public layouts, authentication UI, Roles CRUD, mock RBAC |
| Day 3 | Customer CRUD, staff customer search, VIP product CRUD |
| Day 4 | IST/OST CRUD, accreditation UI, genealogy |
| Day 5 | Issued VIP card CRUD, Finance verification UI, activation workflow, public AA search, UI/UX review |
| Day 6 | MongoDB integration, Better Auth, APIs, real RBAC, Finance verification, integration tests |
| Day 7 | Regression testing, security checks, UAT, deployment-readiness evaluation, handover |

This schedule is an aggressive target, not a guarantee. Frontend implementation must be timeboxed to preserve sufficient time for backend integration and testing. Security, authorization, audit integrity, and data consistency must not be bypassed to meet the deadline. Defer noncritical enhancements rather than release insecure functionality if necessary.

### 13. AI-Driven Development Workflow

#### 13.1 Project Owner Responsibilities

Define requirements; provide business context; approve decisions; review UI/UX; test completed functionality; report defects; approve milestones.

#### 13.2 AI Agent Responsibilities

Analyze requirements; read relevant documentation; prepare implementation plans; implement approved tasks; run available tests; report implementation results; identify missing requirements; flag contradictions and risks.

#### 13.3 AI Agent Restrictions

Agents must not:

- Invent missing business rules
- Modify unrelated modules
- Introduce unnecessary dependencies
- Execute production changes without explicit approval
- Treat mock authorization as production security
- Claim unverified functionality is complete
- Silently change approved architecture or scope

Detailed agent operating instructions are maintained separately in `AGENTS.md`.

### 14. Definition of Done

A feature is complete when:

1. Documented requirements are implemented.
2. UI interactions function correctly.
3. The approved data access layer is used.
4. Required validation is enforced.
5. Permission and visibility rules are respected.
6. Important changes generate audit events.
7. Relevant tests pass.
8. Related modules remain functional.
9. No critical regressions remain.
10. The project owner approves the result.

#### 14.1 Mock-Complete

A frontend feature may be marked **Mock-Complete** when it passes applicable acceptance criteria using centralized mock services. Mock-Complete does not mean production-ready.

#### 14.2 Production-Ready

A feature may be marked **Production-Ready** only when: real backend integration is complete; persistent storage is verified; authentication and authorization are enforced server-side; relevant automated tests pass; critical security checks pass; audit and data consistency requirements are verified; required business rules are approved; the project owner accepts the result.

---

## Part VII — Documentation Governance and Approved Decisions

### 15. Documentation Structure and Authority

`docs/project.md` is the master project-level context. Detailed specifications are maintained separately under `docs/business-rules/` and `docs/development/`. The master document must not duplicate detailed field schemas, permission matrices, or low-level implementation instructions; link to relevant documentation as files become available.

#### 15.1 Documentation Precedence

When resolving conflicting information:

1. Latest explicitly approved business decisions
2. Approved business-rule specifications
3. Approved architecture and development specifications
4. Master project context
5. Verified legacy references

AI assumptions are not authoritative requirements. If two approved sources conflict, flag the contradiction and request clarification; do not silently invent a resolution.

### 16. Approved Project Decisions and Remaining Dependencies

#### 16.1 Hosting

**Decision:** Local development first; hosting selection deferred. No production hosting commitment; maintain deployment portability; do not provision production infrastructure without approval; hosting provider selection remains a future decision.

#### 16.2 Authentication

**Decision:** Better Auth with MongoDB. Use Better Auth as intended auth solution; validate framework and database compatibility; use replaceable mock authentication during frontend development; enforce real authentication and authorization during backend integration.

#### 16.3 Roles and RBAC

**Decision:** Protected system roles with configurable built-in and custom roles. Protect Super Administrator privileges; support custom role creation; configurable permissions; `own`, `team`, `all` access scopes; prevent unauthorized privilege escalation; audit permission changes. Detailed permission matrix remains to be specified.

#### 16.4 VIP Card Activation

**Decision:** Newly issued VIP cards remain Pending until Finance verification. Additional approved requirement: include the minimum Finance verification and activation workflow in the MVP. Issuance does not automatically activate; Finance verification required; approval/rejection recorded; activation follows approved eligibility rules; activation history auditable; full Finance operations outside scope. Detailed payment and settlement eligibility rules remain to be specified.

#### 16.5 VIP Contracts and Benefits

**Decision:** Use the latest approved 2026 AFHomes VIP contracts. Bronze, Silver, Gold are initial tiers; preserve contract version history; preserve issued-card contract snapshots; reconcile complete benefits and restrictions against approved source documents; do not invent missing contract clauses. Actual stay-point redemption remains outside the MVP.

#### 16.6 Historical Data Migration

**Decision:** Design import compatibility now; migrate after the MVP. Preserve official identifiers; maintain compatible data relationships; use synthetic development data; do not import live historical records during the MVP; do not modify the existing production database.

#### 16.7 Public IST/OST Search

**Decision:** Exact AA number search only; active results only. No public name-based discovery; return only qualifying active accreditation records; generic not-found responses for nonqualifying searches; protect private information; IST results do not show "Valid Until"; OST results show "Valid Until" where applicable.

#### 16.8 Remaining Implementation Dependencies

Still requiring verification or separate specifications:

1. Better Auth and MongoDB version compatibility.
2. Exact role-permission matrix.
3. Detailed Finance payment verification and settlement eligibility.
4. Complete VIP contract clauses and benefit calculations.
5. Official identifier generation and future import mappings.
6. Accreditation active-status and expiry evaluation rules.
7. Final hosting provider and deployment approval.

These dependencies must not be silently converted into invented business rules. AI agents may continue documentation and frontend mock development using clearly labeled assumptions, but must not implement unresolved financial eligibility or production security behavior as if approved.

---

## Part VIII — Execution Instructions

### 17. Required Actions (for agents executing this task)

1. Inspect the existing `afhomes-platform` repository.
2. Confirm the current documentation directory structure.
3. Create or update only `docs/project.md`.
4. Use the complete project context supplied.
5. Organize using clear Markdown headings and tables.
6. Preserve all confirmed project requirements.
7. Clearly distinguish approved decisions, proposed details, and unresolved dependencies.
8. Avoid excessive repetition.
9. Keep the document concise but complete enough for future AI agents.
10. Do not invent missing business rules.
11. Do not create additional documentation files.
12. Do not implement application code.
13. Do not initialize frameworks.
14. Do not install dependencies.
15. Do not modify databases or deployments.
16. Do not modify unrelated files.
17. Validate the resulting document for completeness and internal consistency.

### 18. Expected Deliverable

File: `docs/project.md`. The completed document must allow a new AI agent to understand: what AFHomes Platform is; why it is being developed; who will use it; which features are in the MVP; which are deferred; how frontend-first development works; how centralized mock data is used; how backend integration is approached; which technologies are approved or planned; which business and architectural decisions are confirmed; which requirements still need clarification; what restrictions AI agents must follow.

**STOP after completing `docs/project.md`. Do not proceed to other documentation or implementation tasks without explicit approval.**

---

## Completion Report

- **File created/updated:** `docs/project.md`
- **Major sections included:** Part I Project Overview; Part II System Scope; Part III Confirmed MVP Requirements (P0); Part IV Development Approach; Part V Technical and Architectural Direction; Part VI Project Execution; Part VII Documentation Governance and Approved Decisions; Part VIII Execution Instructions.
- **Confirmed project and architectural decisions:** Modular monolith on Next.js/React/TypeScript/Tailwind/shadcn; MongoDB + Mongoose; Better Auth; frontend-first mock-data-driven; local dev first; protected system roles with configurable built-in/custom roles and `own`/`team`/`all` scopes; VIP cards remain Pending until Finance verification with minimum Finance workflow in MVP; latest approved 2026 VIP contracts with versioned snapshots; exact-AA-number-only public accreditation search (active only); IST hides "Valid Until", OST shows it; import compatibility now, migration after MVP; soft archival preserving history; centralized mock data via services/repositories.
- **Remaining unresolved dependencies:** Better Auth + MongoDB compatibility; exact role-permission matrix; Finance payment/settlement eligibility rules; complete VIP contract clauses/benefit calculations; official identifier generation and import mappings; accreditation active-status/expiry evaluation rules; final hosting provider and deployment approval.
- **Contradictions identified:** None identified during documentation. AI assumptions must not be treated as authoritative; flag any future conflict between approved sources rather than resolving silently.
- **Documentation validation result:** Structure is internally consistent with the approved scope; no application code, frameworks, dependencies, databases, or unrelated files were modified. Document distinguishes approved decisions, deferred features, and unresolved dependencies.
