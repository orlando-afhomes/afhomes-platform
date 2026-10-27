# AFHomes Platform — Development Documentation

> Authoritative development documentation index and governance guide for the AFHomes Platform.
> Read `docs/project.md` for project context and `docs/development/architecture.md` for system architecture.
> This is a documentation-only repository; no application code is implemented yet.

---

## 1. Project Overview

AFHomes Platform is a modular business management system for AFHomes. It covers Organization Management, Departments and Staff, Roles and Permissions, Sales Network, Genealogy, IST/OST Accreditation, Customer Management, Customer Applications, Public Customer Lookup, Public Accreditation Verification, VIP Products, VIP Contracts, Payment Schemes, VIP Card Issuance, Sales Management, Finance and Payments, Commission Management, VIP Membership, Stay Points, Reports and Analytics, Audit Logs and Governance, Public Website/CMS capabilities, Redemption (preserved but disabled), and Services (preserved but disabled).

---

## 2. Purpose of This Directory

This directory (`docs/development/`) contains the authoritative development architecture and implementation documentation. It is the entry point for developers and AI coding agents. Business rules are authoritative in `docs/business-rules/` (01–13); development documents must not redefine business rules, only reference them.

---

## 3. Documentation Authority

- `docs/project.md` — overall project context, purpose, scope, approved project direction.
- `docs/business-rules/01–13` — authoritative business behavior. Implementation must follow the applicable business-rule document. Do not allow frontend, backend, or database agents to invent replacement business rules.
- `docs/development/architecture.md` — complete system topology, layer boundaries, panel organization, approved technology stack, infrastructure direction.
- Layer-specific development documents — explain how the approved architecture should be implemented; must remain consistent with architecture and business rules.
- `docs/development/implementation.md` — development phases, dependencies, acceptance criteria, risks, authorization boundaries. Documenting a phase does not automatically authorize implementation.
- Conflict handling: locate actual authoritative source; identify specific conflict; determine if resolved by approved later decision; follow valid documented decision where clear; do not invent commercial/security approval; report material unresolved conflicts before implementing affected behavior. Do not silently rewrite unrelated documents.

---

## 4. Approved Technology Stack

| Component | Approved direction |
|---|---|
| Application | Next.js |
| Router | Next.js App Router |
| Frontend | React + TypeScript |
| Styling | Regular CSS stylesheets per layout, page, and feature |
| UI foundation | Ant Design 6 |
| Additional styling | CSS Modules where appropriate |
| Validation | Zod |
| Client asynchronous state | TanStack Query |
| Initial frontend data | Browser-scoped in-memory mock store |
| API | Versioned REST `/api/v1` |
| Backend | Domain services within Next.js |
| Authentication | Better Auth direction; compatibility verification required |
| Authorization | Centralized RBAC and record-level policies |
| ODM | Mongoose |
| Local persistent database | MongoDB on localhost |
| Production database | MongoDB Atlas Cloud |
| Application hosting | DigitalOcean Droplet |
| Container deployment | Docker Compose |
| Production HTTPS | TLS reverse proxy |
| Future Customer Portal | Planned, separately authorized |
| Future mobile application | React Native + Expo direction |
| Redemption | Preserved but disabled |
| Services | Preserved but disabled |

Critical architecture: single-repository, single Next.js application, panel-based and feature-based modular monolith. Not separate frontend/backend applications, not microservices, not Express/NestJS, not Kubernetes, not Turborepo by default, not static-only Next.js website, not DigitalOcean App Platform. Backend APIs and frontend share the same application runtime. MongoDB remains server-accessed; browser never connects directly to MongoDB.

---

## 5. Architecture at a Glance

Single Next.js modular monolith with React/TypeScript frontend, panel-based UI (Admin/Operations, Public, Future Customer), shared domain modules, centralized mock data during frontend-first development, versioned REST `/api/v1`, backend services within Next.js, centralized auth and RBAC, MongoDB Atlas (local MongoDB first in development), DigitalOcean Droplet + Docker Compose + HTTPS, security, testing, audit, future Customer Portal/mobile, hidden/disabled Redemption and Services. See `architecture.md` for full details.

---

## 6. Local Development to Cloud Strategy

Three modes:

- **Stage A — Frontend in-memory mock development:** synthetic data, browser-scoped store, no real MongoDB, full browser refresh resets mock records, development-only mock identities.
- **Stage B — Local MongoDB development:** real MongoDB on localhost (native or Docker), persistent development records, Mongoose repositories, real backend/API integration, appropriate local transaction testing, isolated test databases. A full browser refresh must not reset persistent MongoDB records.
- **Stage C — MongoDB Atlas Cloud:** managed cloud database, isolated staging/production, secure connections, approved deployment configuration, controlled migration, monitoring, backups/recovery.

Do not require production Atlas access during early frontend development. Do not require production Atlas provisioning for Phase 2. Controlled local MongoDB to Atlas migration is supported; refer to `database.md` and `deployment.md`. Do not automatically migrate synthetic local test data into production. Do not automatically import records from earlier Supabase production system.

---

## 7. Development Documentation Index

Exactly nine development Markdown documents:

| File | Description |
|---|---|
| [README.md](README.md) | Entry point, documentation navigation, approved development context, agent reading instructions |
| [architecture.md](architecture.md) | Complete system topology, modular-monolith design, application layers, panel organization, domain boundaries, API, infrastructure, future extensibility |
| [frontend.md](frontend.md) | Next.js App Router, React/TypeScript, UI design system, panel interfaces, state management, mock adapters, TanStack Query, accessibility, frontend conventions |
| [database.md](database.md) | Local MongoDB development, Mongoose, domain data modeling, MongoDB Atlas, official identifiers, transactions, import/export, migration, backups, data integrity |
| [backend.md](backend.md) | REST `/api/v1`, application services, validation, authentication, authorization, repositories, transactions, business workflows, security, backend integrations |
| [security.md](security.md) | Authentication, account lifecycle, session protection, RBAC, record-level access, Finance restrictions, customer privacy, API protection, audit security, infrastructure safeguards |
| [testing.md](testing.md) | Manual-first frontend testing, automated backend validation, security tests, financial integrity, local MongoDB integration, Atlas staging, migration verification, release acceptance |
| [implementation.md](implementation.md) | Phases 0–8, dependency-driven execution, acceptance criteria, risks, authorization boundaries |
| [deployment.md](deployment.md) | DigitalOcean Droplet, Docker Compose, Next.js production hosting, MongoDB Atlas, HTTPS, domain/DNS, monitoring, backups, recovery, CI/CD, operational maintenance |

Do not create additional development documents. The directory must remain exactly nine Markdown files.

---

## 8. Business Rules Index

Thirteen canonical business-rule documents under `docs/business-rules/`:

| # | Document | Primary responsibility |
|---|---|---|
| 01 | [01-roles-and-permissions.md](../business-rules/01-roles-and-permissions.md) | Organization, Staff, Roles and Permissions |
| 02 | [02-sales-network-and-genealogy.md](../business-rules/02-sales-network-and-genealogy.md) | Sales Network and Genealogy |
| 03 | [03-ist-ost-accreditation.md](../business-rules/03-ist-ost-accreditation.md) | IST/OST Accreditation |
| 04 | [04-customer-management.md](../business-rules/04-customer-management.md) | Customer Management |
| 05 | [05-vip-products-and-contracts.md](../business-rules/05-vip-products-and-contracts.md) | VIP Products, Contracts and Payment Schemes |
| 06 | [06-vip-card-issuance.md](../business-rules/06-vip-card-issuance.md) | VIP Card Issuance and Official Identifiers |
| 07 | [07-finance-and-payments.md](../business-rules/07-finance-and-payments.md) | Finance and Payments |
| 08 | [08-commission-management.md](../business-rules/08-commission-management.md) | Commission Management |
| 09 | [09-vip-membership-and-stay-points.md](../business-rules/09-vip-membership-and-stay-points.md) | VIP Membership and Stay Points |
| 10 | [10-redemption.md](../business-rules/10-redemption.md) | Redemption Management |
| 11 | [11-reports-and-analytics.md](../business-rules/11-reports-and-analytics.md) | Reports and Analytics |
| 12 | [12-audit-logs-and-governance.md](../business-rules/12-audit-logs-and-governance.md) | Audit Logs and Governance |
| 13 | [13-sales-performance-reporting.md](../business-rules/13-sales-performance-reporting.md) | Sales Performance Reporting |

Business rules are the authoritative business behavior. Implementation must follow the applicable business-rule document. Do not allow frontend, backend, or database agents to invent replacement business rules. Other documents must reference the authoritative source rather than creating independent competing definitions. (e.g., 11 references 13 for Confirmed Sales recognition; 10 references 09 for Stay Points balance rules; 12 references 07 for Finance verification authority.)

---

## 9. Platform Modules

Concise module-ownership summary (AFHomes is a connected business system):

- Organization and Roles control authorized operational access.
- Sales Network and Genealogy define organizational selling relationships.
- Accreditation governs applicable IST/OST eligibility.
- Customers manages canonical customer identity.
- VIP Products and Contracts govern commercial agreements.
- Sales records qualifying customer purchases and attribution.
- Finance verifies actual monetary payments.
- Commission Management controls approved commission obligations and payouts.
- VIP Membership manages official membership lifecycle.
- Stay Points records authorized earning and balance changes.
- Reporting consumes authoritative business records.
- Audit preserves significant business and security history.

Do not redefine all financial formulas; link to authoritative documents.

**Redemption: Preserved but disabled.** **Services: Preserved but disabled.** Disabled means no user-facing navigation, no unauthorized direct route access, no active backend processing, code and architectural support retained where present, future activation requires explicit approval. A hidden menu alone does not enforce a backend feature flag.

---

## 10. Application Panels

### 10.1 Admin and Operations Panel

Supports authorized operational roles: Super Admin, Admin, HR/Staff, Finance, SVD, SSM, SM, OST. These are permission-aware interfaces within the same Next.js application. Do not describe each designation as an independent deployed application.

### 10.2 Public Panel

Supports approved public-facing capabilities: company content, public accreditation verification, Public Customer Lookup, login entry, approved CMS integration. Actual feature implementation timing follows implementation.md.

### 10.3 Future Customer Panel

Planned as a future web panel. Do not claim it is implemented or automatically authorized for the initial frontend phase.

### 10.4 Future Mobile Application

React Native + Expo is a future technical direction. It may reuse the authorized versioned REST API. Do not create a mobile application or workspace framework merely because the README documents it.

---

## 11. Implementation Roadmap

Phases 0–8 (see implementation.md for details):

| Phase | Name | Primary responsibility |
|---|---|---|
| 0 | Documentation Foundation | Finalize authoritative documentation |
| 1 | Frontend Foundation | Next.js, UI, panels, typed mocks |
| 2 | Local MongoDB Database Foundation | Local persistent database and Mongoose |
| 3 | Backend Foundation | REST API, authentication, authorization |
| 4 | Core Business Modules | Implement approved domain workflows |
| 5 | Frontend/Backend Integration | Replace mocks with real APIs |
| 6 | Testing and System Validation | Verify correctness, security, integrity |
| 7 | Cloud Deployment and Production Readiness | Atlas, DigitalOcean, HTTPS, operations |
| 8 | Stabilization and Future Enhancements | Monitoring, maintenance, controlled changes |

A documented phase is not an authorized phase. Implementation begins only when the project owner explicitly authorizes the relevant task or phase. Do not claim an entire phase has passed acceptance merely because an AI agent completed its assigned work.

---

## 12. Required Reading Order for AI Agents

Before beginning implementation, AI coding agents must:

1. Read `docs/project.md`.
2. Read `docs/development/README.md`.
3. Read `docs/development/architecture.md`.
4. Read the relevant authoritative business-rule documents.
5. Read the development document governing the layer being changed.
6. Read `docs/development/security.md` for applicable security requirements.
7. Read `docs/development/testing.md` for applicable verification requirements.
8. Read `docs/development/implementation.md` to confirm phase dependencies.
9. Inspect the actual repository and existing code.
10. Verify the project owner's authorized scope.

For deployment tasks, also read `docs/development/deployment.md`. For MongoDB work, read `docs/development/database.md`. For frontend work, read `docs/development/frontend.md`. For backend/API work, read `docs/development/backend.md`.

Do not treat reading documentation as permission to edit every file. Only the explicitly authorized task scope may be changed.

---

## 13. Agent Development Rules

1. Follow the approved Next.js modular-monolith architecture.
2. Do not introduce separate frontend/backend applications.
3. Do not introduce unapproved frameworks.
4. Keep domain business rules outside UI components.
5. Keep MongoDB access server-only.
6. Follow the authoritative business-rule documents.
7. Do not invent missing commercial policies.
8. Do not bypass server-side RBAC.
9. Enforce record-level privacy.
10. Preserve historical genealogy attribution.
11. Preserve finalized contract snapshots.
12. Preserve official identifier rules.
13. Respect Finance verification authority.
14. Respect manual Finance commission approval.
15. Do not automatically mark Approved commissions Paid.
16. Do not confuse Confirmed Sale with Fully Paid settlement.
17. Do not activate VIP Membership outside the approved workflow.
18. Preserve Stay Points ledger integrity.
19. Do not create competing data stores or identifier allocators.
20. Do not expose secrets in client code.
21. Keep Redemption and Services disabled.
22. Do not automatically migrate legacy production data.
23. Do not deploy without authorization.
24. Do not commit or push without authorization.
25. Do not overwrite unrelated user work.
26. Run applicable authorized tests.
27. Report tests honestly.
28. Stop at the authorized task boundary.

Refer to `architecture.md`, `security.md`, and `implementation.md` for detailed requirements.

---

## 14. Critical Business Safeguards

- Customer creation is not VIP Membership activation.
- Contract finalization is not proof of Finance-verified payment.
- Payment submission is not payment verification.
- Confirmed Sale is not necessarily Fully Paid.
- Fully Paid does not automatically prove official activation has completed.
- Approved commission is not Paid commission.
- Annual Stay Points earning capacity is not available points balance.
- Current genealogy must not overwrite historical sales attribution.
- Development mock records are not production business records.

These are safeguards; full rules live in `business-rules/`.

---

## 15. Security and Privacy

- Authentication must be server-controlled.
- Authorization must be enforced server-side.
- UI visibility alone is not access control.
- Finance authority is protected.
- Record-level access is required.
- Customer information is private.
- Public search returns only approved information.
- Database credentials remain server-only.
- Production secrets are protected.
- Session handling must follow approved account status and permission rules.
- Audit logging is required for sensitive operations.
- Production demo identity switching must be disabled.

Refer to `security.md`. Do not attempt to reproduce the entire threat model in the README.

---

## 16. Verified Current Project Status

The repository is documentation-only: no application code, no package manifest, no database, no deployment. (Verify with `git status` and file inspection before each task; do not assume this remains true indefinitely.) Distinguish local repository evidence from external infrastructure verification — do not claim MongoDB Atlas or DigitalOcean account state has been verified solely by inspecting local files.

Status categories: Documentation status; Application source status; Local MongoDB configuration status; Atlas configuration status; Deployment configuration status; Testing status.

Do not mark features implemented merely because documents mention them.

---

## 17. Development and Approval Workflow

### 17.1 Development task

Each implementation task should specify: authorized phase, scope, source documents, target files, expected behavior, security requirements, tests, acceptance criteria, stop conditions.

### 17.2 Before editing

Inspect the actual repository, check Git status, verify branch, read relevant documents, preserve existing local changes.

### 17.3 During implementation

Follow the architecture, keep changes within scope, avoid unrelated refactoring, protect data, avoid unauthorized infrastructure actions.

### 17.4 After implementation

Review changes, run applicable tests, report actual results, report blockers, identify database implications, provide an implementation summary.

### 17.5 Project-owner approval

Require explicit authorization for: starting implementation phases, major architecture changes, production database changes, actual data migrations, production deployment, enabling disabled modules, sensitive policy changes, Git operations where not already authorized.

Do not invent blanket permission to commit/push.

---

## 18. Unresolved Decisions and Implementation Blockers

Material blockers are tracked in `docs/development/implementation.md`. Representative categories: contract price discrepancies, Non-Standard commercial rules, Move payment scheme terms, RA numbering uniqueness, accreditation eligibility/expiry interpretation, Better Auth/MongoDB compatibility, Atlas transaction support, audit retention policy. Verify which issues are actually unresolved in the current canonical documents; do not falsely repeat a resolved issue as still pending. Blockers affect relevant modules rather than automatically stopping all unrelated development (e.g., a contract-price conflict should not prevent the basic Next.js application scaffold; Atlas production sizing should not block local frontend development).

---

## 19. Documentation Change Governance

- Business-rule changes require authorized business decisions.
- Architecture changes require approval where they alter selected architecture.
- Development documentation changes must remain aligned with approved architecture and business rules.
- Historical documents: do not silently erase valid historical contract requirements.
- Source references: use relative links to canonical documents; avoid duplicate conflicting rule copies.
- AI agent behavior: when a document appears outdated, identify the conflict; do not use that conflict as permission to rewrite unrelated sources.

---

## 20. Git Safety

- Verify current branch before editing.
- Inspect working-tree changes.
- Preserve untracked files.
- Review diffs.
- Avoid destructive reset/clean commands.
- Do not overwrite coworker changes.
- Do not force-push without explicit approval.
- Do not commit or deploy outside authorized scope.

Do not assume the latest historical branch report is guaranteed to remain current. The actual checkout must be inspected for each task.

---

## 21. How to Use These Documents

### Example A — Implementing a frontend feature

Read `architecture.md`, `frontend.md`, relevant business rules, `security.md`, `testing.md`, `implementation.md`. Then inspect actual application code.

### Example B — Implementing Finance

Read `07-finance-and-payments.md`, `13-sales-performance-reporting.md` when sales recognition is involved, `backend.md`, `database.md`, `security.md`, `testing.md`, `architecture.md`. Apply required cross-module dependencies.

### Example C — Implementing IST/OST

Read `01-roles-and-permissions.md`, `02-sales-network-and-genealogy.md`, `03-ist-ost-accreditation.md`, `frontend.md`, `backend.md`, `security.md`.

### Example D — Setting up local MongoDB

Read `database.md`, `backend.md`, `security.md`, `testing.md`, `implementation.md`. Local database setup requires separately authorized implementation.

### Example E — Deploying to DigitalOcean

Read `deployment.md`, `architecture.md`, `database.md`, `security.md`, `testing.md`, `implementation.md`. Deployment requires explicit authorization.

Do not run deployment procedures merely because an example exists in README.

---

## 22. Quick Reference and Next Steps

- Documentation baseline complete (13 business rules + 9 dev docs).
- No application code exists yet.
- Next authorized work (when approved): Phase 1 Frontend Foundation.
- All changes require explicit project-owner authorization.
- STOP — await explicit authorization before implementation, Git operations, or deployment.

---

## Completion Report

- **File created/updated:** `docs/development/README.md` (rewritten/expanded).
- **Documentation navigation:** Nine development documents indexed; thirteen business-rule documents referenced; relative links valid; AI agent reading order defined.
- **Architecture alignment:** Next.js App Router, React/TypeScript, Ant Design/regular CSS, Zod, TanStack Query, REST `/api/v1`, Better Auth direction, Mongoose, Local MongoDB, MongoDB Atlas, DigitalOcean, Docker Compose, HTTPS.
- **Business scope:** Organization, Staff, Roles, Sales Network, Genealogy, Accreditation, Customers, VIP Products/Contracts, Sales, Finance, Commissions, Membership, Stay Points, Reports, Audit, Redemption disabled, Services disabled.
- **Implementation roadmap:** Phases 0–8 included; Phase 2 local MongoDB correction; Phase 7 cloud deployment.
- **Agent governance:** Required reading order, source-of-truth hierarchy, authorization boundaries, Git safety, historical data protection, security requirements.
- **Cross-document consistency:** Aligned with architecture.md, implementation.md, business rules 01–13. No material conflicts.
- **Validation:** Markdown formatting verified; relative links verified; document index completeness checked; architecture consistency checked; git diff scope verified.
- **Execution safety:** Application code modified: No. Next.js scaffold created: No. Dependencies installed: No. Database modified: No. MongoDB started: No. Atlas configured: No. Docker configuration modified: No. Other documentation modified: No. New Markdown files created: No. Git commit: No. Git push: No. Git merge: No. Deployment: No. Redemption enabled: No. Services enabled: No. Legacy production data migrated: No.

STOP — awaiting explicit project-owner authorization before starting implementation, database configuration, Git operations, or deployment.