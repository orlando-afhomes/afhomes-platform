# AFHomes Platform — Master Project Context

> Authoritative master project context for AI coding agents and contributors.
> Detailed specs live under `docs/business-rules/` and `docs/development/`.
> This file provides orientation and references; it does not duplicate field schemas, permission matrices, or low-level implementation instructions.

---

## Part I — Project Overview

### 1. Project Identity

| Attribute | Value |
|---|---|
| Project Name | AFHomes Platform |
| Repository / Root Directory | `afhomes-platform` |
| Project Type | Full-Stack Web-Based Business Management Platform |
| Architecture | Modular Monolith (single Next.js application) |
| Development Methodology | Incremental, phase-based Agile development |
| Development Strategy | Frontend-First, Mock-Data-Driven |
| Development Execution | AI-Assisted Development |
| Current Phase | Planning and Documentation |
| Primary Deliverable | Functional Web-Based Platform |
| Initial Development Environment | Local Development |
| Local Persistent Database | MongoDB (localhost) |
| Cloud Database | MongoDB Atlas |
| Application Hosting | DigitalOcean Droplet |
| Deployment | Docker Compose + HTTPS |
| Authentication Direction | Better Auth (subject to compatibility verification) |

AFHomes Platform is a new implementation built from scratch. An earlier AFHomes system exists, but its architecture must not dictate the new project's structure. The previous system may be consulted only as a reference for verified business rules, operational workflows, and domain knowledge. Do not automatically copy legacy architecture, implementation patterns, or unverified behavior.

### 2. Project Background

AFHomes requires a centralized platform for managing business operations, organizational users, customers, VIP membership cards, IST/OST accreditation, sales genealogy, and related administrative processes. The new platform aims for a cleaner, more organized, modular, secure, and scalable foundation. The initial work focuses on documentation and architecture; implementation follows the phased roadmap in `docs/development/implementation.md`.

### 3. Project Objectives

**Primary objective:** Build a secure, maintainable, modular, and production-capable AFHomes business management platform using the approved architecture and phased implementation process.

**Specific objectives:**

1. Establish a unified Next.js application.
2. Implement reusable frontend design foundations.
3. Provide a centralized authentication system.
4. Enforce role-based and record-level authorization.
5. Support Organization Management.
6. Support Staff and account lifecycle.
7. Support Sales Network and genealogy.
8. Support IST/OST accreditation.
9. Support Customer Management.
10. Support public customer and accreditation verification.
11. Support VIP products and contracts.
12. Support authorized Sales Management.
13. Support Finance and Payments.
14. Support Finance-controlled commissions.
15. Support official VIP Card issuance.
16. Support VIP Membership lifecycle.
17. Support Stay Points accounting.
18. Support reporting and analytics.
19. Preserve audit history.
20. Enable local database-backed development.
21. Support controlled MongoDB Atlas migration.
22. Prepare secure DigitalOcean deployment.
23. Preserve architectural support for future Customer and Mobile interfaces.
24. Preserve Redemption and Services for separately authorized future activation.

Do not imply all objectives are Phase 1 deliverables.

---

## Part II — Business and Application Scope

### 4. Core Business Domains

AFHomes operates interconnected workflows involving company organization, personnel and access permissions, Sales Network, genealogy, accreditation, customers, VIP products and contracts, sales, finance, commissions, VIP Membership, Stay Points, public verification, reporting, audit and governance. The platform establishes a centralized, maintainable operating system for these processes, minimizing duplicate business records, maintaining clear sources of truth, enforcing authorized access, preserving important historical information, supporting accurate financial operations, providing auditable business transitions, and remaining extensible without unnecessary complexity.

### 5. Application Interfaces

AFHomes has a single Next.js application with logical presentation panels.

- **Admin and Operations Panel:** supports authorized operational roles (Super Admin, Admin, HR, Finance, Staff, SVD, SSM, SM, OST, etc.) with shared panel architecture exposing different navigation, dashboards, and data access according to role. Do not create an independent application deployment per role.
- **Public Panel:** supports approved public-facing capabilities: company branding and navigation, public website, public accreditation verification, Public Customer Lookup, login entry, approved public content/CMS capabilities. Part of the same Next.js application. Do not permanently restrict the target architecture to a minimal three-page MVP; do not automatically implement the full CMS during Phase 1 without authorization.
- **Future Customer Panel:** planned future web panel (customer profile, membership info, VIP Card details, benefits, transactions, Stay Points, authorized self-service). Not automatically included in initial implementation.
- **Future Mobile Application:** React Native + Expo may consume versioned backend APIs. Do not create the mobile app during this task.

### 6. Disabled Modules

- **Redemption:** Preserved but disabled. Future activation requires separate authorization.
- **Services:** Preserved but disabled. Future activation requires separate authorization.

Disabled means no user-facing navigation, no unauthorized direct route access, no active backend processing, code and architectural support retained where present, future activation requires explicit approval. A hidden menu alone does not enforce a backend feature flag. Do not delete their source code or documented architecture.

### 7. Target Users and Roles

Relevant users may include: Super Administrator, Administrator, HR, Finance, Staff, Vice Director / applicable official designation, Senior Sales Manager, Sales Manager, Outside Sales Team, Internal Sales Team, Customer, Public Visitor.

This high-level role description is not the definitive permission matrix. See `docs/business-rules/01-roles-and-permissions.md`. The company requires centralized permission enforcement, applicable multiple-role assignments, protected Super Administrator authority, module permissions, record-level data scopes, business-operation restrictions, auditable permission changes. Do not invent per-action CRUD permission toggles if the canonical policy defines module-level permissions with separate mandatory sensitive-operation restrictions.

---

## Part III — Approved Technical Architecture

### 8. Single Next.js Modular Monolith

Primary logical layers: App Router; Panels and presentation; Shared UI; Domain modules; Typed repository contracts; API adapters; Server-side authentication and authorization; Application services; Mongoose persistence; MongoDB. See `docs/development/architecture.md` for complete technical design.

### 9. Approved Technology Stack

| Area | Approved technology |
|---|---|
| Full-stack application | Next.js |
| Router | Next.js App Router |
| UI framework | React |
| Programming language | TypeScript |
| Styling | Tailwind CSS |
| UI components | shadcn/ui |
| Additional styling | CSS Modules |
| Validation | Zod |
| Client asynchronous state | TanStack Query |
| API architecture | REST `/api/v1` |
| Backend architecture | Domain services inside Next.js |
| Authentication | Better Auth direction (subject to compatibility verification) |
| Authorization | Centralized RBAC and record-level policies |
| ODM | Mongoose |
| Development database | Local MongoDB |
| Production database | MongoDB Atlas |
| Application hosting | DigitalOcean Droplet |
| Container deployment | Docker Compose |
| Production transport | HTTPS |
| Reverse proxy | Appropriate approved HTTPS reverse proxy |
| Future Customer Portal | Planned, separately authorized |
| Future mobile application | React Native + Expo direction |

Better Auth is the target authentication solution; compatibility with selected Next.js, Node.js, MongoDB, and integration packages must be verified before implementation. Do not claim compatibility has been tested or deployment configured without evidence.

If `testing.md` names preferred testing tools, summarize them as approved or candidate tools according to that document. Do not falsely report that Vitest, Playwright, or any other package is already installed.

### 10. Frontend-First Development

The project begins with frontend-first development after documentation approval. Stages: (1) Documentation; (2) Application foundation; (3) Centralized mock repositories; (4) UI implementation and review; (5) Local database foundation; (6) Backend services; (7) Full-stack integration; (8) System testing; (9) Cloud deployment. These are conceptual development steps. The official Phase 0–8 mapping remains in `implementation.md`. Do not create a separate competing implementation roadmap inside `project.md`.

### 11. Centralized Mock Data Requirements

Required behavior: one centralized in-memory mock business data store; synthetic records; shared domain identifiers; consistent relationships; mock repository adapters; development-only simulated identities; mock business workflows; appropriate loading/errors; full browser refresh resets mock data. The mock store is not a production database. Do not persist mock business records in localStorage or IndexedDB. Do not allow every feature to maintain conflicting copies of the same business records. Do not present mock approval as real financial verification.

### 12. Local MongoDB Development

This is a major approved project decision. Before the cloud database, AFHomes will use real MongoDB running locally.

- **Local development:** Next.js backend connects to local MongoDB (Docker-hosted or native).
- **Data persistence:** local MongoDB development records persist across browser refreshes and application restarts.
- **Transaction support:** appropriate replica-set configuration required for realistic MongoDB multi-document transaction integration tests.
- **Data isolation:** local development must not accidentally connect to production Atlas.
- **Detailed reference:** `docs/development/database.md`

Do not include full Docker configuration or database commands in the master project document.

### 13. Cloud and Deployment Strategy

Approved production architecture: DigitalOcean Droplet + Docker Compose + Next.js Application + HTTPS Reverse Proxy + MongoDB Atlas Cloud.

- **DigitalOcean responsibilities:** hosts the Next.js application (frontend rendering, backend REST API, authentication integration, domain services).
- **MongoDB Atlas responsibilities:** hosts the managed production database. Do not deploy a second standalone production MongoDB server on the Droplet by default.
- **Production architecture:** one Next.js application container as standard application runtime; reverse proxy manages HTTPS access; optional background worker may be justified separately.
- **Deployment security:** production requires firewall, restricted SSH, HTTPS, secrets, Atlas network access control, monitoring, backups, recovery planning, release approval.
- **Hosting details that may remain open:** final Droplet region, Droplet size, domain, reverse proxy choice, Atlas tier, Atlas region, object storage, monitoring provider. Do not confuse those remaining implementation choices with an undecided overall hosting architecture.

### 14. Data Import and Migration Policy

Distinguish two different data movement requirements.

- **Local MongoDB to Atlas:** approved planned technical capability. A future authorized process may use source backup, migration rehearsal, database compatibility checks, index validation, business reconciliation, controlled cutover, rollback planning. Do not automatically migrate synthetic local records into production.
- **Historical or legacy data import:** future application-level imports may be supported. However, **no automatic migration of the earlier Supabase production records is authorized.** Any future legacy import requires separate project-owner approval. The old production database must remain untouched unless specifically authorized.
- **Historical data integrity:** preserve customer identity, official identifiers, historical contracts, sales attribution, verified financial history, membership dates, Stay Points ledger, audit history. Do not fabricate missing historical payments or membership activation facts. See `docs/development/database.md`.

---

## Part IV — Critical Business Principles

### 15. Business-Rule Authority

`docs/business-rules/` (01–13) defines authoritative business behavior. Implementation must follow the applicable business-rule document. Do not allow frontend, backend, or database agents to invent replacement business rules. Other documents must reference the authoritative source rather than creating independent competing definitions.

### 16. Sales Network and Genealogy

Manages the official seller hierarchy and reporting relationships. Use canonical designation rules. The hierarchy includes Vice Director / applicable official designation → SSM → SM → OST. OST direct sponsorship relationships must follow the authoritative business rules. Transfers must preserve historical sale attribution.

### 17. Customer and VIP Contract Identity

Manages canonical customer identity, profiles, applications, drafts, and authorized searches. Customer creation is not the same as VIP Membership activation. VIP Products and Contracts govern company VIP tiers, payment schemes, benefits, and contracts. Current product configuration and finalized historical contract terms must remain distinguishable.

### 18. Sales and Finance

Sales records qualifying customer purchases, seller attribution, sale state, and reporting recognition. Confirmed Sale follows the authoritative Sales Performance Reporting rules. Finance manages payment submissions, monetary verification, balances, refunds, reversals, and reconciliation. Only authorized Finance personnel verify actual monetary payments. Payment submission is not Finance verification. Contract finalization is not verified payment. Confirmed Sale is not necessarily Fully Paid. Finance collections and Confirmed Sales are different reporting measures. Fully Paid settlement and official VIP Membership activation are separate states. Reversals must be traceable and must not erase original valid transaction history. Sensitive Finance state changes must be attributable to authorized actors.

### 19. Commissions

Manages authorized commission obligations, Finance approval, Holds, and actual payout confirmation. Commission eligibility depends on authorized Sales and historical attribution. Applicable percentages follow approved Finance-controlled processes. Approval is an explicit authorized state. A commission may be Approved but still Unpaid. Paid means actual confirmed payout. Reversals and Holds follow approved rules. Do not assume genealogy automatically distributes Finance-approved commissions. Do not invent a universal commission percentage. See `docs/business-rules/08-commission-management.md`.

### 20. VIP Membership and Stay Points

VIP Membership manages official membership activation, issued VIP Card identity, validity, and contractual entitlements. Activation follows authorized eligibility rules. Stay Points manages transactional points earning, eligibility, balances, holds, reservations, consumption where enabled, and auditable ledger history. The available balance must not be confused with a contractual annual entitlement cap. Weekday and Weekend balances are separate. Gold primary and supplementary holders share the applicable membership entitlement pool. Redemption is preserved but disabled.

### 21. Official Identifiers

The master document identifies distinct categories: MongoDB internal identity, Customer ID, RA number/reference, VIP Card ID, AAI/AAO accreditation number, Sale reference, Payment or financial transaction reference.

- **Customer identity:** use the authoritative Customer Management definition. Do not automatically use RA numbers as Customer IDs.
- **RA reference:** preserve approved RA scope and uniqueness rules. If RA uniqueness remains unresolved, flag the exact dependency.
- **VIP Card ID:** established target format `YYMMDDNNNNNVTPMMS`. Verify exact component definitions from document 06. Preserve the authoritative RA-derived sequence relationship where specified. Do not create a competing standalone card serial allocator.
- **Accreditation:** use the authoritative AAI/AAO numbering rules from document 03.
- **Identifier governance:** official identifiers must be system-controlled, appropriate to their domain, unique according to approved scope, concurrency-safe, historically preserved, auditable. Do not reproduce the full allocator algorithms in `project.md`.

### 22. Public Verification and Privacy

Two distinct public discovery functions.

- **Public accreditation verification:** uses approved AAI/AAO identity rules. Current established requirements: exact official accreditation number; no unrestricted public name discovery; only qualifying active/eligible results; approved public disclosure; safe generic failures; rate limiting when integrated. Approved display distinction: IST/AAI does not display the same "Valid Until" field as OST; OST/AAO displays the applicable validity date where required. Verify against document 03 before retaining details.
- **Public Customer Lookup:** not the same feature. Follow document 04. Only approved active and eligible membership records may be publicly verifiable. Respect approved identity masking, exact lookup identifiers, and restricted disclosure.

Do not expose: government ID images; private customer contacts outside authorized disclosure; residential addresses; unrelated financial information; private account details. Do not duplicate the complete public result field schemas here.

### 23. Historical Data Integrity

Preserve customer identity, official identifiers, historical contracts, sales attribution, verified financial history, membership dates, Stay Points ledger, audit history. Do not fabricate missing historical payments or membership activation facts.

---

## Part V — Project Delivery and Governance

### 24. Phase 0–8 Roadmap

| Phase | Name | Purpose |
|---|---|---|
| 0 | Documentation Foundation | Complete and reconcile authoritative documentation |
| 1 | Frontend Foundation | Next.js, UI foundations, panels, mock data |
| 2 | Local MongoDB Database Foundation | Persistent development database, modeling and indexes |
| 3 | Backend Foundation | API, authentication, authorization and repositories |
| 4 | Core Business Modules | Implement domain workflows in dependency order |
| 5 | Frontend/Backend Integration | Replace mocks with real services |
| 6 | Testing and System Validation | Verify correctness, security, and financial integrity |
| 7 | Cloud Deployment and Production Readiness | Atlas, DigitalOcean, HTTPS, monitoring and recovery |
| 8 | Stabilization and Future Enhancements | Maintain and improve the accepted system |

No phase is automatically authorized by documentation. AI agent implementation completion is not the same as project-owner acceptance. Phase 1 does not automatically authorize every business module. Phase 2 does not require Atlas production provisioning. Phase 7 requires separate cloud and deployment approvals. Use `docs/development/implementation.md` as the authoritative roadmap. Do not duplicate its full subphase matrix in `project.md`.

### 25. Approved Decisions

| Area | Current decision |
|---|---|
| Application topology | Single Next.js modular monolith |
| Frontend | React/TypeScript |
| Frontend development | Frontend-first |
| Initial mock data | Browser-scoped in-memory |
| Real development database | Local MongoDB |
| Cloud database | MongoDB Atlas |
| ORM/ODM | Mongoose |
| API | REST `/api/v1` |
| Authentication | Better Auth target, verify compatibility |
| Authorization | Centralized RBAC and record-level access |
| Production hosting | DigitalOcean Droplet |
| Deployment | Docker Compose |
| HTTPS | Required |
| Core modules | Included in phased roadmap |
| Redemption | Preserved but disabled |
| Services | Preserved but disabled |
| Customer Portal | Future authorized phase |
| Mobile | Future authorized phase |
| Local-to-Atlas migration | Planned capability |
| Legacy Supabase migration | Not automatically authorized |
| Production release | Explicit approval required |

Do not repeat the old "hosting selection deferred" decision.

### 26. Critical Dependencies

Review `implementation.md` and the actual business documents. Potential examples: conflicting Gold contract price; incomplete Silver contract amount; Non-Standard commercial rules; Move A/B1/B2 payment scheme details; RA numbering scope and uniqueness; accreditation expiry/account eligibility interpretation; Better Auth/MongoDB compatibility; Atlas tier capabilities; formal audit retention; production domain and infrastructure sizing; backup and recovery objectives. Do not declare all of these unresolved without verification. If the canonical business documents now contain an approved resolution, update the master context accordingly. Scope-specific blocking: a pricing discrepancy does not necessarily block frontend scaffolding; an Atlas tier decision does not block local MongoDB development; a card ID allocation conflict may block final issuance logic without blocking unrelated Customer Management. No invented approvals: do not resolve commercial, financial, or security-sensitive conflicts by guessing.

### 27. Business-Policy Change Governance

AFHomes policies may evolve. Future authorized changes can affect product terms, payment schemes, commission rules, membership eligibility, accreditation, account approval, Stay Points rules, reporting, privacy, retention. Changes must follow: (1) Authorized decision; (2) Canonical document update; (3) Impact analysis; (4) Required implementation changes; (5) Migration consideration; (6) Testing; (7) Approval; (8) Controlled release. Historical finalized contracts and monetary transactions must remain protected. Do not silently reinterpret historical records according to a later configuration.

### 28. Data Import and Migration Policy

Distinguish two different data movement requirements.

- **Local MongoDB to Atlas:** approved planned technical capability. A future authorized process may use source backup, migration rehearsal, database compatibility checks, index validation, business reconciliation, controlled cutover, rollback planning. Do not automatically migrate synthetic local records into production.
- **Historical or legacy data import:** future application-level imports may be supported. However, **no automatic migration of the earlier Supabase production records is authorized.** Any future legacy import requires separate project-owner approval. The old production database must remain untouched unless specifically authorized.
- **Historical data integrity:** preserve customer identity, official identifiers, historical contracts, sales attribution, verified financial history, membership dates, Stay Points ledger, audit history. Do not fabricate missing historical payments or membership activation facts. See `docs/development/database.md`.

### 29. Quality and Release Readiness

The master context must briefly explain the approved quality strategy.

- **Early frontend work:** manual-first UI testing is permitted during initial frontend development.
- **Backend development:** introduce appropriate automated unit, integration, API, and database tests.
- **Financial workflows:** critical financial and membership behavior requires automated validation.
- **Production:** production release requires authentication verification, authorization verification, financial consistency tests, identifier uniqueness tests, points ledger checks, data privacy tests, relevant E2E tests, backup and recovery readiness, release authorization. Do not claim manual UI review alone is sufficient for production readiness. See `docs/development/testing.md`.

### 30. Project-Owner Approval

No phase is automatically authorized by documentation. Every implementation phase, major architecture change, production database change, actual data migration, production deployment, enabling disabled modules, sensitive policy change, or Git operation requires explicit project-owner authorization. Do not invent blanket permission to commit/push.

---

## Part VI — Documentation and AI Agents

### 31. Documentation Authority

`docs/project.md` is the master project context. Detailed specs live under `docs/business-rules/` and `docs/development/`. The master document must not duplicate detailed field schemas, permission matrices, or low-level implementation instructions. Link to relevant documentation as those files become available.

**Documentation precedence:** When resolving conflicting information: (1) Latest explicitly approved business decisions; (2) Approved business-rule specifications; (3) Approved architecture and development specifications; (4) Master project context; (5) Verified legacy references. AI assumptions are not authoritative requirements. If two approved sources conflict, flag the contradiction and request clarification. Do not silently invent a resolution.

### 32. Development Documents

| File | Purpose |
|---|---|
| `docs/development/README.md` | Documentation entry point |
| `docs/development/architecture.md` | Full technical architecture |
| `docs/development/frontend.md` | Frontend design |
| `docs/development/database.md` | MongoDB architecture |
| `docs/development/backend.md` | Backend/API architecture |
| `docs/development/security.md` | Security |
| `docs/development/testing.md` | Quality assurance |
| `docs/development/implementation.md` | Phased roadmap |
| `docs/development/deployment.md` | Hosting and operations |

### 33. Business-Rule References

| # | Document | Primary responsibility |
|---|---|---|
| 01 | `docs/business-rules/01-roles-and-permissions.md` | Organization, Staff, Roles and Permissions |
| 02 | `docs/business-rules/02-sales-network-and-genealogy.md` | Sales Network and Genealogy |
| 03 | `docs/business-rules/03-ist-ost-accreditation.md` | IST/OST Accreditation |
| 04 | `docs/business-rules/04-customer-management.md` | Customer Management |
| 05 | `docs/business-rules/05-vip-products-and-contracts.md` | VIP Products, Contracts and Payment Schemes |
| 06 | `docs/business-rules/06-vip-card-issuance.md` | VIP Card Issuance and Official Identifiers |
| 07 | `docs/business-rules/07-finance-and-payments.md` | Finance and Payments |
| 08 | `docs/business-rules/08-commission-management.md` | Commission Management |
| 09 | `docs/business-rules/09-vip-membership-and-stay-points.md` | VIP Membership and Stay Points |
| 10 | `docs/business-rules/10-redemption.md` | Redemption Management |
| 11 | `docs/business-rules/11-reports-and-analytics.md` | Reports and Analytics |
| 12 | `docs/business-rules/12-audit-logs-and-governance.md` | Audit Logs and Governance |
| 13 | `docs/business-rules/13-sales-performance-reporting.md` | Sales Performance Reporting |

### 34. Agent Reading Order

Before making changes, AI coding agents must:

1. Inspect the repository.
2. Verify the current branch.
3. Inspect existing changes.
4. Read the master project context.
5. Read `docs/development/README.md`.
6. Read `docs/development/architecture.md`.
7. Read the relevant authoritative business-rule documents.
8. Read the development document governing the layer being changed.
9. Confirm authorization.
10. Identify dependencies.

For deployment tasks, also read `docs/development/deployment.md`. For MongoDB work, read `docs/development/database.md`. For frontend work, read `docs/development/frontend.md`. For backend/API work, read `docs/development/backend.md`.

Do not treat reading documentation as permission to edit every file. Only the explicitly authorized task scope may be changed.

### 35. AI Development Restrictions

Agents must:

- Follow the approved Next.js modular-monolith architecture.
- Do not introduce separate frontend/backend applications.
- Do not introduce unapproved frameworks.
- Keep domain business rules outside UI components.
- Keep MongoDB access server-only.
- Follow the authoritative business-rule documents.
- Do not invent missing commercial policies.
- Do not bypass server-side RBAC.
- Enforce record-level privacy.
- Preserve historical genealogy attribution.
- Preserve finalized contract snapshots.
- Preserve official identifier rules.
- Respect Finance verification authority.
- Respect manual Finance commission approval.
- Do not automatically mark Approved commissions Paid.
- Do not confuse Confirmed Sale with Fully Paid settlement.
- Do not activate VIP Membership outside the approved workflow.
- Preserve Stay Points ledger integrity.
- Do not create competing data stores or identifier allocators.
- Do not expose secrets in client code.
- Keep Redemption and Services disabled.
- Do not automatically migrate legacy production data.
- Do not deploy without authorization.
- Do not commit or push without authorization.
- Do not overwrite unrelated user work.
- Run applicable authorized tests.
- Report tests honestly.
- Stop at the authorized task boundary.

### 36. Definition of Ready and Done

Briefly define these terms and link to `implementation.md`.

- **Definition of Ready:** A task has approved scope, relevant documents, known dependencies, clear acceptance criteria, appropriate authorization, no unresolved blocker affecting the planned behavior.
- **Mock-Complete:** A frontend feature has been verified using the approved centralized mock architecture. Mock-Complete is not Production-Ready.
- **Implemented:** The required authorized code exists.
- **Verified:** Applicable checks and tests have actually run successfully.
- **Accepted:** The project owner has accepted the result.
- **Production-Ready:** A feature has appropriate real backend integration, secure persistence, authorization, testing, and required operational readiness.

Do not use these statuses interchangeably.

---

## Part VII — Execution Safety

### 37. Repository Protection

- No destructive Git commands without approval.
- Preserve untracked work.
- Do not overwrite coworker changes.
- No unauthorized force-push.
- No unauthorized merges.

### 38. Database Protection

- No accidental production database reset.
- No unapproved migrations.
- No automatic legacy Supabase import.
- No development test data automatically promoted to production.

### 39. Security Protection

- No production credentials in source control.
- No client-side database secrets.
- No bypass of RBAC or Finance verification.
- No activation of disabled workflows.

### 40. Deployment Protection

- Production release requires explicit project-owner authorization.
- Docker configuration changes and cloud provisioning require appropriate task scope.

### 41. Historical Integrity

- Preserve contract snapshots.
- Preserve identifiers.
- Preserve payment records.
- Preserve genealogy history.
- Preserve audit records.

---

## Part VIII — What Does Not Belong in project.md

The master project document is not the correct place for complete database schemas, every customer field definition, full role permission matrix, detailed commission percentages, complex VIP contract clauses, MongoDB connection commands, Docker Compose configuration, API endpoint implementation examples, large test-case catalogs, complete daily developer schedules, previous coding-agent completion reports, or one-time task execution instructions. Those belong in the appropriate business-rule, technical, implementation, or operational documents. The project context must provide accurate orientation and references. Do not make this file another duplicate 1,000-line technical specification merely to preserve its historical length.

---

## Part IX — Critical Project Invariants

1. AFHomes Platform is a standalone project.
2. It uses one Next.js application.
3. It follows a modular-monolith architecture.
4. React and TypeScript are approved.
5. Next.js App Router is approved.
6. Tailwind and shadcn/ui are approved.
7. Zod is the selected validation approach.
8. TanStack Query is the client asynchronous-state solution.
9. REST APIs use `/api/v1`.
10. Backend domain services are inside the Next.js project.
11. Better Auth is the target authentication solution subject to verification.
12. RBAC is centralized.
13. Record-level authorization is required.
14. Frontend-first development is approved.
15. Mock business data is in-memory and resets on refresh.
16. Local MongoDB is the first real persistent database.
17. Local MongoDB development data persists across refreshes.
18. Mongoose is server-only.
19. MongoDB Atlas is the target managed production database.
20. DigitalOcean Droplet is the application host.
21. Docker Compose is the selected deployment method.
22. HTTPS is required for production.
23. No separate backend application by default.
24. Sales Network relationships follow approved genealogy.
25. Historical sales attribution is preserved.
26. Customer identity and RA references must not be improperly conflated.
27. Official identifiers follow the authoritative generators.
28. Payment submission is not Finance verification.
29. Confirmed Sale is not necessarily Fully Paid.
30. Finance verifies monetary payments.
31. Commission approval follows authorized Finance procedures.
32. Approved commission is not automatically Paid.
33. Membership activation follows official eligibility and activation rules.
34. VIP Card issuance must not duplicate official identifiers.
35. Stay Points are ledger-controlled.
36. Annual points caps are not immediately spendable balances.
37. Customer privacy is enforced.
38. Public accreditation and customer lookup follow separate approved policies.
39. Reports consume authoritative data.
40. Audit history remains traceable.
41. Redemption remains disabled.
42. Services remains disabled.
43. Future Customer Portal remains separately authorized.
44. Future mobile application remains separately authorized.
45. Local-to-Atlas migration is a planned capability.
46. Synthetic development data is not automatically production data.
47. Legacy Supabase production migration is not automatically authorized.
48. Commercial policies may change through authorized decisions.
49. Historical signed contracts remain protected.
50. The project follows Phases 0–8 rather than a mandatory seven-day schedule.
51. Every implementation phase requires authorization.
52. Production deployment requires explicit authorization.
53. The master project context must not duplicate low-level specifications.
54. Documentation completion does not imply application implementation.

---

## Part X — Completion Report

- **File created/updated:** `docs/project.md`
- **Major sections included:** Part I Project Overview; Part II Business and Application Scope; Part III Approved Technical Architecture; Part IV Critical Business Principles; Part V Project Delivery and Governance; Part VI Documentation and AI Agents; Part VII Execution Safety; Part VIII What Does Not Belong in project.md; Part IX Critical Project Invariants; Part X Completion Report.
- **Confirmed project and architectural decisions:** Modular monolith on Next.js/React/TypeScript/Tailwind/shadcn; MongoDB + Mongoose; Better Auth; frontend-first mock-data-driven; local MongoDB first then Atlas; DigitalOcean Droplet + Docker Compose + HTTPS; protected system roles with configurable built-in/custom roles and `own`/`team`/`all` scopes; VIP cards remain Pending until Finance verification with minimum Finance workflow in MVP; latest approved 2026 VIP contracts with versioned snapshots; exact-AA-number-only public accreditation search (active only); IST hides "Valid Until", OST shows it; import compatibility now, migration after MVP; soft archival preserving history; centralized mock data via services/repositories.
- **Remaining unresolved dependencies:** Better Auth + MongoDB compatibility; exact role-permission matrix; Finance payment/settlement eligibility rules; complete VIP contract clauses/benefit calculations; official identifier generation and import mappings; accreditation active-status/expiry evaluation rules; final hosting provider and deployment approval; audit retention policy.
- **Contradictions identified:** None in this final pass; conflicts flagged in earlier tasks (Finance activation auto vs separate step; mock persistence in-memory-only vs optional localStorage; architecture label refinement) remain documented for reconciliation where applicable.
- **Documentation validation result:** Structure is internally consistent with the approved scope; no application code, frameworks, dependencies, databases, or unrelated files were modified. Document distinguishes approved decisions, deferred features, and unresolved dependencies.

STOP — awaiting explicit project-owner authorization before beginning application implementation, database setup, Git changes, cloud configuration, or deployment.