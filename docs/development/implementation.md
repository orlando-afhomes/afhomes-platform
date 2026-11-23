# AFHomes Platform — Implementation Roadmap

> Authoritative implementation roadmap for the AFHomes Platform.
> Read `docs/development/architecture.md` for system architecture and `docs/business-rules/` (01–14) for authoritative business behavior.
> For numbered work instructions, start at the [Full-stack implementation roadmap](../implementation/02-full-stack/README.md). Each phase requires separate project-owner authorization.

---

## 1. Purpose and Authority

This document defines the complete implementation roadmap for the AFHomes Platform, covering what must be implemented, in what order, with what dependencies, which documents govern each task, which business rules must be preserved, expected deliverables, required tests, security controls, acceptance criteria, blockers, approval gates, progress reporting, and production release boundaries.

---

## 2. Current Project Status

The repository contains a frontend prototype with typed browser-memory records, mock sign-in, and Vitest tests. Backend handlers, a database schema, real sign-in, and hosted environments are planned. The [feature index](../implementation/README.md) and its FP1–FP16 records give the current per-feature evidence and dependencies. Recheck the code before reporting any implementation status.

---

## 3. Approved Technical Architecture

Use a single Next.js App Router application with React, TypeScript, shadcn/ui on Base UI, Tailwind CSS 4, TanStack Query, and existing UI conventions. The planned stack uses REST `/api/v1`, Zod, Firebase Auth, centralized authorization, server-only SQL Connect, and PostgreSQL. Use private Firebase Storage in production. Vercel is the approved demo direction. Validate Firebase App Hosting in staging before relying on it, with Cloud Run as fallback. The authorized staff Redemption prototype stays within its separate boundaries. Live Redemption, Services, Customer Portal, and mobile work require their own approvals.

---

## 4. Implementation Governance

Implementation is governed by: documentation authority (business-rules own business behavior; dev docs own technical design), source-of-truth hierarchy, change control (business/architectural/technical/security/production/data changes require appropriate authorization), explicit authorization (roadmap is plan only; each phase requires explicit project-owner authorization), scope control (no unapproved features, no microservices, no separate backend apps, no Turborepo, no premature Customer Portal/mobile activation, no Redemption/Services enablement).

---

## 5. Source-of-Truth Documents

- `docs/project.md` — product purpose and approved project context.
- `docs/business-rules/01–14` — authoritative business behavior.
- `docs/development/architecture.md` — complete system architecture.
- `docs/development/frontend.md` — frontend design and implementation conventions.
- [Database guide](database.md) — emulators, PostgreSQL, SQL Connect, and data integrity.
- `docs/development/backend.md` — backend services, API and persistence integration.
- `docs/development/security.md` — authentication, authorization and security controls.
- `docs/development/testing.md` — quality assurance and release verification.
- [Full-stack environment guides](../implementation/02-full-stack/README.md) — executable phase order and acceptance requirements.
- `docs/development/deployment.md` — production infrastructure, operations and recovery.

---

## 6. Development Principles

1. Dependency-driven execution: develop features in dependency order.
2. Vertical validation: complete representative end-to-end slices where practical.
3. Architecture compliance: follow approved architecture; do not independently redesign.
4. Business correctness: do not invent business states, rates, identifiers, financial formulas, authorization rules.
5. Security by design: auth, authorization, privacy, audit integrated throughout.
6. Incremental testing: manual-first UI early; automated mandatory for backend/financial/authorization/production workflows.
7. Explicit authorization: roadmap is plan only; each phase requires explicit project-owner authorization.

---

## 7. Phase Status Model

Statuses: Not Started, Ready for Authorization, Authorized, In Progress, Blocked, Implemented, Verified, Accepted.

Distinguish Implemented (authorized technical work exists), Verified (required tests/checks performed), Accepted (project owner accepts phase outcome). Do not mark a task complete solely because source files were generated. Do not mark a test passed if not executed. Do not mark production deployed if infrastructure was only documented.

---

## 8. Phase Dependency Map

| Technical phase | Environment guide | What carries forward |
| --- | --- | --- |
| 0 Documentation | [Stack alignment](../implementation/02-full-stack/00-documentation-transition.md) | Agreed architecture and working documentation |
| 1 Frontend foundation | [Prototype checklist](../implementation/README.md) and [optional Vercel preview](../implementation/02-full-stack/02-staging/00-vercel-prototype-demo.md) | Working sample-data build |
| 2 Database foundation | [Localhost database](../implementation/02-full-stack/01-localhost/01-database-and-emulators.md) | Schema, typed connector, and reproducible test data |
| 3 Backend foundation | [Localhost backend and API](../implementation/02-full-stack/01-localhost/README.md) | Auth, authorization, audit, and first integrated workflow |
| 4 Business modules | [Module order](../implementation/02-full-stack/01-localhost/05-approved-business-modules.md) | All approved business operations and tests |
| 5 Frontend and backend integration | [Localhost integration](../implementation/02-full-stack/01-localhost/04-frontend-and-file-storage.md) | Working screens and typed HTTP adapters with private files |
| 6 System validation | [Local verification](../implementation/02-full-stack/01-localhost/06-local-verification.md) and [Staging](../implementation/02-full-stack/02-staging/README.md) | Tested release candidate, hosted transaction proof, rehearsal evidence |
| 7 Cloud deployment | [Production](../implementation/02-full-stack/03-production/README.md) | Approved and verified launch of all approved modules together |
| 8 Stabilization | [Production operations](../implementation/02-full-stack/03-production/06-monitoring-backups-and-recovery.md) | Monitoring and recovery runbook |

The phase numbers map to existing technical references. The environment guides carry the step sequence. Within a module, finish its schema, backend, API, and frontend together. The optional mock demo can happen early. After the first local workflow passes, run the hosted SQL Connect pilot before expanding financial workflows. Full staging sign-off remains the gate before production.

---

## 9. Required Specification for Every Phase

Each environment guide documents prerequisites, approvals, implementation sequence, tooling, security and verification, exit conditions, and recorded evidence. The feature checklists and canonical rules provide module-specific acceptance requirements.

---

## 10. Phase 0: Documentation Foundation

Align the active technical guides, project context, and agent instructions with the [Full-stack roadmap](../implementation/02-full-stack/README.md). Preserve the business rules and existing prototype evidence. Verify references and clearly label prior stack decisions as historical.

---

## 11. Phase 1: Frontend Foundation

Historical Phase 1 established Next.js, panel shells, domain contracts, a centralized browser-memory mock store, and TanStack Query. Use the current UI rules in AGENTS.md section 8 and the [prototype checklists](../implementation/README.md) to verify role-aware navigation, loading and error states, forms, responsive layouts, and refresh reset. Real sessions, database writes, and deployments require authorization in later milestones.

---

## 12. Phase 2: Local SQL Connect Database Foundation

Follow the numbered [localhost database guide](../implementation/02-full-stack/01-localhost/01-database-and-emulators.md). Set up the SQL Connect Emulator only after owner approval. Use an explicit demo project, reviewed schema, server-side connector, and repeatable synthetic seed. Verify relationships, indexes, business identifier uniqueness, exact money round trips, Manila dates, and local transaction behavior. Hosted PostgreSQL is used in the subsequent staged pilot to prove concurrent writes and failure rollback.

The local task ends with reproducible data, passing schema and seed checks, and isolated credentials. Cloud provisioning, legacy imports, schema deployment to production, and resets of ordinary developer data each follow the separate approval gates.

---

## 13. Phase 3: Backend Foundation

Use the [localhost backend and authentication guide](../implementation/02-full-stack/01-localhost/02-backend-authentication-and-permissions.md) and [API guide](../implementation/02-full-stack/01-localhost/03-api.md). Establish Firebase Auth session verification, account status, centralized authorization, Zod contracts, typed SQL Connect repositories, a safe error contract, protected transactions, and audit persistence. Verify the first authorized operation and invalid, unauthorized, retry, and rollback cases.

---

## 14. Phase 4: Core Business Modules

### Objective

Implement approved workflows with real server services and the local SQL Connect integration. Respect the module dependencies in the [ordered module guide](../implementation/02-full-stack/01-localhost/05-approved-business-modules.md). Verify the hosted pilot before expanding financial workflows.

### Required documents

Business-rule docs 01–14 and the architecture, frontend, backend, database, security, and testing guides.

### Recommended implementation sequence (subphases 4A–4L)

4A Organization/Staff/Roles → 4B Sales Network/Genealogy → 4C IST/OST Accreditation → 4D Customers → 4E VIP Products/Schemes/Contracts → 4F Sales and IGP → 4G Finance and Payments → 4H Commissions → 4I Membership and Cards → 4J Stay Points → 4K Reports and Analytics → 4L Audit and Cross-Module Completion. Build audit coverage into each group.

Each approved subphase delivers its complete tested flow through data, service, API, and UI, using the current feature checklist and canonical business rules.

### Phase 4 module dependency matrix

See [module-by-module order and feature checklists](../implementation/02-full-stack/01-localhost/05-approved-business-modules.md).

### Disabled and deferred modules

The staff Redemption prototype is authorized (2026-11-17) with synthetic data and sample points-per-night values; live Redemption and customer submissions require separate authorization. Services remains disabled. Do not delete retained code. Hide disabled navigation. Block disabled backend workflows. Preserve future module boundaries. Do not enable live redemption or Services. Require separate authorization before live activation. Document future activation as a separately approved enhancement. Do not make live Redemption or Services implementation a Phase 4 acceptance requirement. However, disabled-state protection must be validated before production.

### Phase 4 acceptance

All approved modules operate against the local SQL Connect-backed API with verification of authorization, financial consistency where applicable, and audit. The production scope still needs the staging release walkthrough.

---

## 15. Phase 5: Frontend and Backend Integration

### Objective

Replace frontend mock integrations with real authenticated API integrations.

### Dependencies

Phase 1 frontend foundation, Phase 2 local database, Phase 3 backend foundation, and the applicable Phase 4 module contracts. Integrate and verify each group during implementation.

### Required documents

frontend.md, backend.md, database.md, security.md, testing.md, relevant business rules.

### Scope

- API adapter integration: connect frontend features to `/api/v1`.
- Authentication integration: replace development mock authentication with real server-controlled authentication.
- Authorization integration: enforce role, module and record-level authorization in all protected workflows.
- Data mapping: ensure frontend contracts match actual API/domain responses.
- Query state: configure TanStack Query for auth transitions, permission-sensitive caching, mutations, invalidation, error handling, pagination.
- Forms: integrate server-side validation, safe submission, loading states, business errors, duplicate-request protection.
- Business workflows: validate the real backend services and SQL Connect repositories using the local emulator and then hosted staging.
- Audit: ensure relevant business events produce required authoritative audit records.

### Out of scope

Automatic production deployment; automatic legacy data migration; disabled feature activation; mobile implementation.

### Testing

API integration, frontend/backend contract compatibility, authentication, RBAC, record privacy, financial workflows, membership activation, points balances, imports, error handling, end-to-end scenarios.

### Acceptance criteria

Authorized screens use the typed API adapters. Authentication, authorization, database state, audit, and error behavior agree. Critical workflows function end to end with no duplicate financial effects or unauthorized data exposure.

### Exit

Integrated local full-stack application verified and accepted.

---

## 16. Phase 6: Testing and System Validation

### Objective

Establish sufficient evidence that AFHomes is safe and correct for controlled cloud deployment preparation.

### Dependencies

Approved modules, integrated frontend and backend, local database verification, and the owner-authorized staging environment for cloud-specific checks.

### Required documents

testing.md, security.md, database.md, backend.md, frontend.md, all relevant business rules.

### Scope

- Automated tests: unit, integration, API contract, database, end-to-end, regression.
- Financial integrity: payment verification, correct balances, Confirmed Sales, reversals, commission approval, payout, membership activation, VIP identifier uniqueness, points reconciliation.
- Security: authentication, session revocation, RBAC, record-level access, IDOR/BOLA protection, public data privacy, direct API access, disabled feature protection, sensitive file handling.
- Database: SQL Connect transactions, hosted concurrent writes and rollback, indexes, exact money handling, Manila-date behavior, validation, and data consistency.
- Frontend: usability, responsive layout, accessibility, errors, loading states, permission-sensitive navigation.
- Performance: query performance, pagination, reporting, application resource usage, selected realistic load testing.
- Approved imports: validate supported inputs, duplicates, historical identifiers, reconciliation, and failure handling. Rehearse the production procedure in isolated staging.

### Staging sequencing clarification

Start the SQL Connect Spark pilot after the first local workflow passes. Prove hosted transactions before expanding financial workflows. Complete local acceptance for the full scope before the full hosting and staging rehearsal. Paid staging setup and production cutover each need owner approval.

### Acceptance criteria

Critical automated tests pass; authorization boundaries verified; financial state transitions reconcile; data integrity verified; no critical known security failures; disabled modules remain inaccessible; production-readiness blockers identified; release candidate documented.

### Exit

Local system validated and approved for controlled staging and deployment preparation. Do not claim production is ready solely because local tests pass.

---

## 17. Phase 7: Cloud Deployment and Production Readiness

### Objective

Prepare, validate and release AFHomes into its approved cloud infrastructure.

### Approved production architecture

One Next.js application on Firebase App Hosting if verified in staging, or Cloud Run in the same Google project. Use Firebase Auth, SQL Connect with Cloud SQL for PostgreSQL, private Firebase Storage, and managed HTTPS. Production uses its own company-owned Blaze project.

### Required documents

deployment.md, database.md, security.md, testing.md, architecture.md, backend.md, implementation.md.

### Core deliverables

- [Qualify the host and runtime in staging](../implementation/02-full-stack/02-staging/04-hosting-and-deployment.md). Identify the build, approved location, domain, SQL Connect service, secrets, hosted logs, and recovery setup.
- [Provision the production project and PostgreSQL](../implementation/02-full-stack/03-production/01-firebase-project-and-database.md) only after owner authorization. Apply reviewed schema changes and verify backups.
- Configure real staff access, least-privilege runtime identity, private files, approved feature exposure, and the validated Next.js production release.
- [Rehearse and then execute approved imports](../implementation/02-full-stack/03-production/04-approved-imports-and-readiness.md) under owner control. Reconcile before opening the release.
- [Launch all approved modules together](../implementation/02-full-stack/03-production/05-deployment-and-launch.md) after the full review and production approval.

### Security

Verify HTTPS, least-privilege cloud identity, protected server credentials, isolated environments, current sessions and record permissions, private files, and safe logs.

### Testing

Build validation, staging acceptance, smoke tests, security tests, backup/restore validation, database compatibility, rollback rehearsal where appropriate.

### Acceptance criteria

Approved infrastructure provisioned; cloud database secure and functional; correct application image deployed; HTTPS operational; authentication/authorization operational; required cloud tests pass; backups and recovery verified; monitoring enabled; disabled modules protected; no unresolved critical release blockers; production release explicitly authorized and verified.

### Exit

The owner accepts the complete release after required verification. Provisioning a cloud service or passing a single pilot does not complete this phase.

---

## 18. Phase 8: Stabilization and Operations

### Objective

Operate the deployed AFHomes Platform safely and improve reliability through controlled maintenance.

### Dependencies

Accepted production deployment.

### Scope

- Monitor app health, errors, database and runtime usage, security events, cost, and backup state.
- Detect, contain, and recover from incidents using the [production recovery guide](../implementation/02-full-stack/03-production/06-monitoring-backups-and-recovery.md).
- Validate performance changes against real staging measurements and approved needs.
- Review supported runtime and dependency updates, session security, credentials, access, and vulnerabilities.
- Business-rule changes: future approved changes may require updated canonical documents, domain changes, database migration, backward compatibility, regression testing, release approval.
- Future modules: potential future additions Customer Portal, mobile application, Redemption reactivation, Services reactivation, public website/CMS expansion where not already included in an earlier authorized scope, future integrations. Do not automatically activate these merely because Phase 8 exists.

### Testing

Regression, security monitoring, backup/restore rehearsal, production health validation, change-specific acceptance.

### Acceptance

Stable, monitored production operation under approved business and operational policies. Do not invent fixed stabilization duration or availability guarantees.

---

## 19. Business Module Coverage Matrix

Use the [FP1–FP16 implementation index](../implementation/README.md) to map modules to feature records and canonical business rules.

---

## 20. Business Workflow Implementation Map

Use the [module sequence](../implementation/02-full-stack/01-localhost/05-approved-business-modules.md) and the associated feature checklists for dependent workflows and acceptance criteria.

---

## 21. Implementation Task Standard for AI Agents

For each authorized task, identify source rules, current state, dependencies, implementation boundary, tests, and evidence. Follow AGENTS.md for permission and Git constraints.

---

## 22. Definition of Ready

A task is ready when the owner authorizes the scope, applicable rules and inputs are confirmed, prerequisites are verified, and a test method is defined.

---

## 23. Definition of Done

A task is done when approved behavior works through its normal entry point, required tests and review are complete, and actual results and remaining limitations are recorded.

---

## 24. Code Quality and Development Standards

Follow [architecture.md](architecture.md), [frontend.md](frontend.md), and AGENTS.md. Reuse typed boundaries and existing code and keep changes focused.

---

## 25. Security Requirements Throughout Implementation

Apply the [security guide](security.md) throughout the work. Protect sessions, server credentials, record access, private files, and audit history.

---

## 26. Testing Throughout Implementation

Use the [testing guide](testing.md) and local, staging, and production acceptance checks. Report executed checks separately from planned tests.

---

## 27. Data Safety and Migration Control

Keep environments distinct. Use only approved import sources, validate and rehearse, record rejections, prevent duplicate effects, and reconcile before cutover.

---

## 28. Critical Business and Technical Blockers

Check the [decision register](../implementation/decisions-and-gaps.md) for business gaps and the Firebase phase guides for hosting, billing, data, and access prerequisites. Report only a specific blocker and the workflows it affects.

---

## 29. Decision and Change Control

Record owner decisions in the decision register. Reconcile affected documents and tests before acting on an approved change.

---

## 30. Git and Branch Workflow

Follow [AGENTS.md](../../AGENTS.md). The project owner controls Git staging, commits, pushes, and releases.

---

## 31. Release Management and Version Compatibility

Pin and record the reviewed build, Node.js and Next.js versions, host configuration, schema/connector version, and rollback compatibility. Verify the exact release in staging.

---

## 32. CI/CD Implementation Roadmap

Use the [deployment guide](deployment.md) for owner-approved build checks and releases. Production release settings must preserve the owner's control.

---

## 33. Implementation Progress Reporting

Record phase, environment, revision, approvals, checks run, actual results, blockers, and the next gate in the applicable phase guide or linked evidence.

---

## 34. Delivery Order and Milestone Gates

Use the [numbered Firebase phase indexes](../implementation/02-full-stack/README.md) to move from Localhost to Staging to Production. Complete approved module and import sign-off before the single production launch.

---

## 35. Scope Control and Non-Goals

Keep the approved runtime and module boundaries. Mobile, Customer Portal, Live Redemption, Services, and unapproved legacy data migration require separate approval.

---

## 36. Phase Acceptance Test Examples

Use the acceptance cases in [testing.md](testing.md) and the step-specific checks in the Firebase guides.

---

## 37. Risk Management

Track SQL Connect guarantees, hosted compatibility, data quality, permissions, operating cost, and recovery as testable risks. Stop an affected phase if its critical guarantees fail.

---

## 38. Production Release Blockers

Incomplete approved functionality, unverified authorization or financial guarantees, unresolved import reconciliation, missing recovery evidence, unresolved hosting compatibility, or absent release approval blocks opening production.

---

## 39. Operations and Post-Launch Governance

Follow the [production operations guide](../implementation/02-full-stack/03-production/06-monitoring-backups-and-recovery.md) for monitoring, access, rollback, backup verification, and recovery.

---

## 40. Critical Implementation Invariants

Use AGENTS.md and the canonical business rules for binding invariants. A plan cannot change business behavior or authorize implementation.

---

## 41. Required Final implementation.md Structure

Maintain the phase-to-environment mapping here and detailed instructions under the [Full-stack roadmap](../implementation/02-full-stack/README.md).

---

## 42. Cross-Document Consistency

Keep this mapping, the technical guides, and the Firebase environment sequence consistent. Canonical business rules govern business behavior.

---

## 43. Acceptance Checklist

Use each phase index's exit checks and the [staging sign-off guide](../implementation/02-full-stack/02-staging/05-release-rehearsal-and-sign-off.md).

---

## 44. Strict Execution Scope

This roadmap authorizes planning only. Follow AGENTS.md for approvals of code, database changes, data, environment configuration, billing, and releases. The owner controls Git.

---

## 45. Final Verification

Verify phase dependencies, approvals, prototype boundaries, technical and feature cross-references, documentation links, and actual evidence. Treat historic reports as evidence of their own tasks and dates.

---

## 46. Historical Completion Report

> The earlier documentation work below used the superseded stack and original phase text. The current sequence is the Firebase roadmap.

### A. Repository Verification

- Actual repository: `afhomes-platform`; branch: `develop`; initial working tree untracked docs/workflow files preserved. Documentation-only repository.

### B. Implementation Document Finalization

- `docs/development/implementation.md` (comprehensively rewritten/expanded).

### C. Roadmap Coverage

Phases 0–8 with primary deliverables: Phase 0 documentation baseline; Phase 1 frontend foundation; Phase 2 local MongoDB foundation; Phase 3 backend foundation; Phase 4 core business modules (4A–4L); Phase 5 frontend/backend integration; Phase 6 system validation; Phase 7 cloud deployment; Phase 8 stabilization.

### D. Phase 2 Correction

Explicitly confirmed: **Local MongoDB is the Phase 2 target.** MongoDB Atlas provisioning belongs to later authorized cloud deployment preparation.

### E. Phase 4 Business Modules

Dependency-driven module sequence: 4A Organization/Staff/Roles → 4B Sales Network/Genealogy → 4C Accreditation → 4D Customers → 4E VIP Products/Contracts → 4F Sales → 4G Finance → 4H Commissions → 4I Membership/VIP Card Issuance → 4J Stay Points → 4K Reports → 4L Audit.

### F. Technical Architecture Alignment

Next.js, React/TypeScript, REST `/api/v1`, Better Auth direction, Mongoose, Local MongoDB, Atlas, DigitalOcean, Docker Compose, HTTPS.

### G. Business Integrity

Roadmap protects customer identity, historical genealogy, Finance verification, Confirmed Sales, Commissions, Membership activation, VIP Numbers, Stay Points, Reporting, Audit.

### H. Development Governance

Phase authorization, task execution requirements, Definition of Ready, Definition of Done, risk controls, Git safety, status reporting, production approval.

### I. Critical Blockers

Verified blocker table with classification: full blocker, partial blocker, technical verification, deferred future decision.

### J. Cross-Document Consistency

Aligned with architecture, frontend, database, backend, security, testing, deployment, business-rules 01–14. No material inconsistencies.

### K. Validation

Markdown validation, link validation, Mermaid validation, phase consistency, dependency consistency, module coverage, git scope performed.

### L. Execution Safety

- Application code modified: No.
- Next.js scaffold created: No.
- Dependencies installed: No.
- Backend APIs created: No.
- Authentication implemented: No.
- Database created: No.
- MongoDB started: No.
- Atlas configured: No.
- Test files created: No.
- Migrations executed: No.
- Customer data imported: No.
- Docker files modified: No.
- DigitalOcean provisioned: No.
- Other documentation modified: No.
- Git commit: No.
- Git push: No.
- Git merge: No.
- Deployment: No.
- Redemption live use enabled: No; staff prototype authorized 2026-11-17.
- Services enabled: No.

Historical note: this stop point applied before the frontend prototype. Implementation phases, database operations and deployment still require authorization.