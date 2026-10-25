# AFHomes Platform — Testing and Quality Assurance

> Authoritative testing and quality assurance specification for the AFHomes Platform.
> Read `docs/development/architecture.md` for system architecture and `docs/business-rules/` (01–13) for authoritative business behavior.
> This document is documentation only; no tests are implemented or executed here.

---

## 1. Purpose and Authority

This document defines the complete testing and quality assurance strategy for the AFHomes Platform, covering what must be tested, which testing level is appropriate, which business rules apply, which environments are required, how to prepare representative test data, what constitutes a passing result, which failures block a release, how to prevent financial and authorization regressions, how to test local MongoDB and MongoDB Atlas, how to test imports, migrations, backups, and production deployment, and how testing evolves through implementation Phases 0–8.

---

## 2. Current Versus Target Testing State

- **Verified current implementation:** documentation-only repository; no application code, test infrastructure, or databases.
- **Approved target testing architecture:** manual-first frontend development, automated verification before production, local MongoDB integration testing, Atlas staging validation.
- **Planned testing work:** all test implementation requires separate authorization.

---

## 3. Approved Testing Philosophy

AFHomes uses a staged testing approach.

### 3.1 Frontend-first development

During the initial frontend foundation phase, manual-first UI testing is approved: layout verification, forms, navigation, role-aware presentation, responsive design, mock data behavior, dashboard presentation, workflow simulation. Automated tests may be introduced incrementally where practical. Do not require an entire production-level testing infrastructure before basic frontend development can begin.

### 3.2 Database and backend development

As real backend services are implemented, introduce automated unit tests, service tests, API contract tests, database integration tests, transaction tests, authorization tests.

### 3.3 Business module implementation

Every high-risk business workflow must have meaningful automated validation, especially Finance, Commissions, VIP Membership activation, official identifiers, Stay Points, historical genealogy, audit history, record-level authorization.

### 3.4 Production readiness

Manual-only testing is not sufficient for production deployment. Production approval requires successful critical automated verification, security review, data integrity checks, operational validation and authorized acceptance. Do not invent a universal code-coverage percentage or release deadline unless approved.

---

## 4. Test Strategy

Comprehensive testing across unit, integration, E2E, security, performance, accessibility, migration, and release validation. Financial transaction correctness is the highest priority.

---

## 5. Testing Layers

```mermaid
flowchart TB
    E2E["End-to-End Business Workflows"]
    API["API and Service Integration Tests"]
    DB["Database and Transaction Tests"]
    UNIT["Domain and Unit Tests"]

    E2E --> API
    API --> DB
    DB --> UNIT
```

The diagram represents testing coverage and dependency, not a requirement that tests execute in a fixed visual order.

Define responsibilities for static analysis, type checking, unit testing, component testing, API contract testing, service integration testing, database integration testing, end-to-end testing, security testing, performance testing, accessibility testing, migration and recovery testing, release acceptance testing. Avoid unnecessary E2E duplication when behavior can be tested more reliably at a lower level.

---

## 6. Tooling Direction

The existing repository may not contain any testing infrastructure. Document a proposed approach compatible with the approved Next.js/TypeScript architecture. Evaluate appropriate tooling categories: TypeScript type checking, static code analysis, domain unit testing, React component testing, browser E2E testing, API integration testing, MongoDB integration testing, security testing, accessibility testing, performance testing, CI execution. Potential candidates include Vitest for TypeScript unit/integration tests, React Testing Library for React component behavior, Playwright for browser E2E tests, HTTP-level API testing utilities, appropriate isolated MongoDB test environments, automated accessibility checking tools. These are engineering candidates unless an authoritative document already approves a specific testing framework. Do not claim packages are installed. Do not add dependencies. Do not create testing configuration files. Document selection criteria: compatibility, maintenance, reliability, integration with approved Next.js application.

---

## 7. Test Directory and File Organization

Representative future structure:

```text
tests/
├── unit/
├── integration/
├── api/
├── database/
├── e2e/
├── security/
├── performance/
├── accessibility/
├── fixtures/
└── helpers/
```

Also acknowledge colocated tests where appropriate. Define conventions for test naming, test isolation, shared fixtures, test factories, mock dependencies, integration database setup, cleanup, reporting, traceability. Do not require every folder to be created immediately. Do not build the folders now. Avoid a testing structure that duplicates the entire application unnecessarily.

---

## 8. Test Environments

### Environment A — Frontend Mock Testing

Used during initial frontend development. Characteristics: in-memory synthetic records; no real MongoDB connection; mock role switching; UI workflow simulations; reset on full browser refresh.

### Environment B — Local MongoDB Development and Testing

Used for real database integration. Characteristics: local MongoDB on localhost; isolated test database; Mongoose repositories; real API calls; persistent local development data; transaction testing with appropriate replica-set support.

### Environment C — MongoDB Atlas Staging

Used for cloud integration and deployment rehearsal. Characteristics: nonproduction cloud database; controlled synthetic or otherwise authorized test data; production-like configuration where feasible; secure access; migration rehearsals; end-to-end validation.

### Environment D — Production

Used only for carefully controlled deployment verification and operational checks. Do not execute destructive tests against real customer or financial records. Do not reuse local development credentials in production. Do not seed production with fake financial transactions.

---

## 9. Test Environment Isolation

Testing must not corrupt development or production data. Document separate test database names, separate credentials, explicit environment checks, protected production configuration, safe cleanup, repeatable initialization, authorized database resets, prevention of cross-environment writes.

### 9.1 Local MongoDB

Local development data is persistent. Tests requiring destructive reset must use a separately isolated test database, not the developer's ordinary working database.

### 9.2 MongoDB Atlas

Staging and production must be separated according to the approved infrastructure policy.

### 9.3 Production protection

Test runners must not silently accept production connection strings when attempting destructive integration tests. Describe fail-closed safeguards.

---

## 10. Synthetic Test Data

All ordinary test fixtures must use synthetic data. Document realistic AFHomes fixture relationships for Super Admin, Admin, HR, Finance, SVD, SSM, SM, OST, Customers, VIP tiers, Contracts, Sales, Payments, Commissions, Memberships, Stay Points, Accreditations, Audit records. Do not copy real customer information into tests without a separately authorized and privacy-compliant process.

### 10.1 Fixture consistency

Fixtures must preserve valid relationships (e.g., SSM has required SVD parent; SM has required SSM parent; OST has eligible selected sponsor; Sale references correct customer and contract; Payment references correct sale or obligation; Commission references correct underlying sale; Membership references correct finalized contract; Points entries reference correct membership).

### 10.2 Fixture factories

Document the value of typed factories/builders for producing valid and intentionally invalid records.

### 10.3 Reproducibility

Tests must be repeatable without relying on uncontrolled existing database contents.

### 10.4 Sensitive data

Do not embed real credentials, government ID images, bank data or production records in fixtures.

---

## 11. Test Case Design Standard

Define a consistent format for test scenarios. Each important test case should specify: Test identifier; Related business-rule document; Business requirement; Preconditions; Actor/permission context; Input; Action; Expected state; Expected response; Related audit outcome; Negative scenario where applicable; Testing level; Test priority. Use a small number of meaningful examples in `testing.md`. Do not create hundreds of redundant prose test cases. The document should define reusable testing patterns and a practical acceptance matrix.

---

## 12. Unit Testing

Unit tests focus on isolated business logic. Examples: domain validation, identifier formatting, eligibility checks, state transitions, date calculations, authorized relationship checks, monetary calculations, commission calculations, points allocation, business-rule evaluation. Do not test core domain logic only through browser E2E tests. Where a calculation depends on unresolved business policy, do not invent expected financial results. Document how to test deterministic time-dependent behavior using controlled clocks and fixed dates.

---

## 13. React Component Testing

Document testing requirements for buttons and actions, forms, validation feedback, dialogs, tables, status badges, navigation, loading states, empty states, error states, responsive controls, accessible labels, focus management.

### 13.1 Permission-aware UI

Verify that presentation changes appropriately across permitted roles and account states. However, a hidden button is not proof of backend authorization. Backend authorization tests must independently verify restricted operations.

### 13.2 State-dependent presentation

Examples: Submitted Payment versus Verified Payment; Pending Commission versus Paid Commission; Pending Membership versus Active Membership; Available Stay Points versus Held Points. Status labels must reflect authoritative state.

---

## 14. Frontend Mock Testing

Document tests for the approved frontend-first mock architecture.

### 14.1 Centralized mock store

Verify: one canonical mock source; correct synthetic relationships; consistent CRUD simulations; no direct mutation of seed data in components; no duplicate independent feature stores.

### 14.2 Browser refresh

Verify: full browser refresh resets mock data to the original seed state. Do not confuse this with persistent MongoDB behavior.

### 14.3 Demo identity switching

Verify: correct module visibility; correct record visibility; cache invalidation; no previously selected user's private data remains exposed; no unrestricted production mock-login behavior.

### 14.4 Mock versus real API parity

Document how selected contract tests can verify that mock adapters and real API adapters expose compatible expected behavior where practical.

---

## 15. API Contract Testing

The approved API uses `/api/v1`. Document tests for valid requests, invalid requests, missing required fields, invalid status values, unexpected payloads, unauthorized requests, forbidden actions, missing resources, duplicate identifiers, invalid lifecycle transitions, pagination, search, sorting, safe errors, idempotency. Validate request schemas, response schemas, status codes, error formats, sensitive-field omission. Do not invent already implemented endpoint paths. Use representative examples and conventions from `backend.md`.

---

## 16. Backend Service Integration Tests

Test backend use cases and dependencies, including application services, repository contracts, authorization integration, database writes, audit-event generation, cross-module orchestration, error handling, rollback, idempotency. Distinguish service tests using fake repositories from integration tests using real MongoDB. For business-critical operations, mock-only service tests are insufficient to prove transaction correctness.

---

## 17. Local MongoDB Database Tests

The database-first real integration environment is local MongoDB. Document test database initialization, Mongoose connection, schema validation, unique indexes, relationships, queries, transaction behavior, concurrency, idempotency, failure recovery, cleanup.

### 17.1 Transaction prerequisites

MongoDB multi-document transactions require a supported deployment such as a replica set. Use an appropriate local replica-set configuration for transaction integration testing. A standalone MongoDB server must not be assumed to support identical transaction behavior.

### 17.2 Persistent development versus disposable tests

Ordinary local development records may persist. Automated integration test records must be isolated and safely disposable. Do not automatically delete the normal developer database after a test run.

---

## 18. Transaction and Concurrency Testing

Financial and membership operations are high priority. Document tests covering atomic state transitions, conflicting concurrent requests, transaction failure, retry, duplicate requests, unique-index conflicts, rollback, audit consistency, partial failure prevention.

Representative scenarios: concurrent Finance verification (two authorized requests attempt to verify the same payment → not verified twice, no duplicate balance effect, no duplicate Confirmed Sale, consistent authoritative outcome); concurrent VIP activation (two requests attempt to activate same eligible membership → one official membership identity, one valid assigned VIP Card ID, no duplicate activation effect); concurrent points operations (two operations attempt to use same available points → no unauthorized overspending, no inconsistent ledger, no duplicate consumption); transaction failure (a required write fails during a multi-document operation → no partially completed business transaction reported as successful, state remains recoverable and reconcilable).

Do not prescribe unsupported database behavior beyond verified transaction capabilities.

---

## 19. Authentication Testing

Use the approved Better Auth direction, subject to actual compatibility verification. Document tests for successful login, invalid credentials, logout, expired session, revoked session, deactivated account, suspended account, password reset if implemented, role change during an active session, account eligibility changes, protected API access, session isolation. Do not claim Better Auth integration is already implemented. Do not use frontend demo identity switching as a substitute for authentication integration tests.

---

## 20. Role and Permission Testing

Use `01-roles-and-permissions.md`. Test effective active-role permissions, multiple-role assignments, inactive/archived role effects, module visibility, module API access, record-level scopes, unauthorized privilege escalation, Super Administrator protections, sensitive operation restrictions.

### 20.1 Module-level policy

Preserve the approved permission model. Do not invent per-action CRUD toggles if the actual business rules use module-level permissions with separate mandatory operation restrictions.

### 20.2 Record-level tests

Verify `own`, `team`, `all` where applicable, plus more specific business-policy restrictions.

### 20.3 Negative security cases

A user must not gain access by changing `customerId`, `staffId`, `saleId`, `paymentId`, `membershipId`, `commissionId` or similar request parameters. Test direct API requests independently from UI navigation.

---

## 21. Staff Lifecycle Testing

Use documents 01 and 03. Test applicable states and transitions: registration, creation, Pending approval, approval, rejection, activation, suspension, deactivation, reactivation, archival. Distinguish ordinary staff approval from applicable Sales Network account creation exceptions. Do not assume every account follows one identical approval flow. Test session invalidation after suspension/deactivation. Test unauthorized approval attempts. Where self-created account approval is authorized, verify its exact permitted boundaries.

---

## 22. Sales Network and Genealogy Testing

Use document 02. Hierarchy: SVD → SSM → SM → OST; OST may report directly to authorized SVD/SSM/SM. Test correct parent assignment, required hierarchy levels, valid direct OST sponsorship, missing parent rejection, invalid parent rejection, circular relationship prevention, unauthorized genealogy changes, descendant queries, upline presentation, team visibility, account transfer, IST/OST conversion, historical attribution.

### 22.1 Historical sale attribution

Create a sale with an established genealogy snapshot. Then change the seller's current genealogy under an authorized transfer. Expected: current hierarchy reflects authorized transfer; historical sale attribution remains correct; prior commissions not silently reassigned; historical reports remain reconcilable.

### 22.2 Privacy tests

Verify restricted roles cannot open unrelated seller or upline private profiles.

---

## 23. IST/OST Accreditation Testing

Use document 03. Test accreditation creation, official AA number allocation, AAI/AAO distinction, unique-number enforcement, approval, renewal, expiration, suspension, deactivation, reactivation, conversion, sponsor approval when applicable, login eligibility, public verification.

### 23.1 Registration approval

An OST registration that requires sponsor approval must not gain unauthorized active access before the required decision. Do not apply the immediate-activation exception incorrectly.

### 23.2 Expiration boundaries

Test valid date, expiration date, date after expiration, timezone interpretation, reinstatement where authorized. Use canonical accreditation rules for exact boundary semantics.

### 23.3 Public result privacy

Verify only authorized fields are displayed. Preserve applicable IST/AAI versus OST/AAO validity presentation differences.

---

## 24. Customer Lifecycle Testing

Use document 04. Test customer creation, blank or partial Draft saving where approved, draft update, draft submission, required submission validation, canonical Customer ID, duplicate identity detection, contact validation, authorized profile changes, application lifecycle, public lookup, customer import/export.

### 24.1 Draft versus submission

An authorized incomplete draft should not be rejected solely because final submission requirements are incomplete. A final submission must enforce its actual required fields.

### 24.2 Customer identity

Do not create duplicate canonical customer identities for repeated purchases.

### 24.3 Public Customer Lookup

Verify only eligible Active memberships are publicly verifiable. Verify inactive/ineligible records are not exposed as active. Check exact search and disclosure restrictions in the authoritative document rather than inventing a lookup policy.

---

## 25. VIP Product and Contract Testing

Use document 05. Test product configuration, payment scheme selection, Standard/Non-Standard classification, contract creation, approval, finalization, contract price snapshot, contract validity, authorized edits, historical preservation.

### 25.1 Historical contract snapshots

Create a finalized contract using applicable product terms. Change current product configuration through authorized administrative action. Expected: future applicable contracts can use new approved configuration; historical finalized contract retains original agreed terms; historical financial reporting is not silently rewritten.

### 25.2 Unresolved pricing

If current source documents contain unresolved Gold/Silver price discrepancies or other contractual conflicts, do not invent expected prices. Document the test dependency pending authorized correction.

---

## 26. Official VIP Identifiers Testing

Use document 06. Current approved format: `YYMMDDNNNNNVTPMMS`. Cover exact format validation, component positions, actual activation-date source, tier code, payment scheme component, contract classification, RA-derived sequence, unique allocation, collision prevention, repeated activation, historical preservation.

### 26.1 Format

The documented current structure is 17 characters. Verify against the authoritative business-rule definition. Do not silently reinterpret legacy identifier formats.

### 26.2 Concurrency

Two simultaneous eligible activations must not produce the same official identifier.

### 26.3 Repeated requests

An already completed activation must not receive a second official VIP Card ID.

### 26.4 Date correctness

Use the applicable actual official activation date. Do not backdate merely to match the sale or payment date.

### 26.5 RA uniqueness dependency

If RA numbering reuse or uniqueness scope is not fully resolved, explicitly flag the affected uniqueness tests as dependent on that decision. Do not invent a new VIP serial allocator to make the tests pass.

---

## 27. Sales Confirmation Testing

Use document 13 as the authoritative definition. Test contract finalization, Finance-verified qualifying payment, Confirmed Sale eligibility, recognition exactly once, correct contract face-value recognition, subsequent collections, reversals, reconfirmation where applicable, reporting-period adjustments, seller attribution.

### 27.1 Important distinctions

Confirmed Sale is not necessarily Fully Paid. Finance collections are not identical to Confirmed Sales value. VIP activation is not the same event as Sales confirmation.

### 27.2 Duplicate prevention

Repeated Finance payment verification or retries must not create duplicate Confirmed Sales.

### 27.3 Reporting

Test that a sale is not double-counted when visible across multiple authorized reporting levels.

---

## 28. Finance Verification Testing

Use document 07. This is one of the highest-priority testing domains. Test payment submission, reservation payment, down payment, installment, full payment, payment evidence, Finance review, verification, rejection, correct remaining balance, overdue status, refund, reversal, reconciliation, Financial Hold.

### 28.1 Submission versus verification

Submitting a payment must not automatically mark it Finance-verified.

### 28.2 Authorization

Only authorized Finance personnel may verify monetary receipt.

### 28.3 Exact monetary arithmetic

Verify the approved exact-money representation and rounding rules. Do not use unreliable floating-point expected results.

### 28.4 Duplicate payment verification

Repeat the same verification request. Expected: no duplicate monetary collection, no duplicate payment effect, no duplicate sale confirmation, correct audit result.

### 28.5 Failure cases

Test invalid amount, wrong sale reference, already verified payment, reversed payment, unauthorized Finance action, database transaction failure, concurrent verification.

---

## 29. Payment Reversal and Financial Hold Tests

Test the interaction among original payment, reversal, outstanding balance, sale state, commission Holds, VIP Membership Financial Hold, audit history. Expected behavior must follow canonical business rules. Important requirements: original verified payment history preserved; reversal recorded separately; no duplicate reversal effect; balances reconcile correctly; applicable unpaid commissions are Held; relevant membership restrictions apply when approved conditions are met. Do not automatically confiscate already paid commissions. Do not invent unauthorized negative balances.

---

## 30. Commission Management Tests

Use document 08. Test eligible recipient, direct seller, historical upline, manual Finance percentage, contract-value calculation basis, Finance approval, commission amount, Approved status, Unpaid status, Held status, Payout, confirmed disbursement, recovery history, unauthorized modifications.

### 30.1 No automatic approval

A Confirmed Sale must not automatically create an approved commission without the approved Finance action.

### 30.2 Correct calculation

Use the applicable finalized contract value and actual approved percentage. Do not invent universal percentages.

### 30.3 Approved versus Paid

Commission approval must not automatically mark the commission Paid.

### 30.4 Reversal

Test automatic Hold behavior for unpaid affected commissions where prescribed. Already-paid recovery follows the approved manual process.

### 30.5 Repeated payout

The same confirmed disbursement must not mark or pay a commission multiple times.

---

## 31. VIP Membership Activation Tests

Use documents 06, 07 and 09. Test the distinctions among customer creation, contract finalization, payment submission, Finance verification, Confirmed Sale, Fully Paid settlement, official VIP Membership activation.

### 31.1 Full settlement

Verify the applicable approved full-payment eligibility requirements.

### 31.2 Official activation

Verify that activation occurs only through the actual approved activation workflow. Do not assume any Finance-approved installment automatically activates the VIP Membership.

### 31.3 Membership validity

Verify validity is calculated from the correct authoritative date and governing contract terms.

### 31.4 Historical membership

Preserve actual historical activation dates and contract snapshots.

### 31.5 Duplicate prevention

Repeated activation attempts must not produce duplicate memberships, duplicate VIP Card IDs, or duplicate activation audit events representing separate successful activations.

### 31.6 Financial Hold

Test applicable restrictions when an Active Membership develops a qualifying outstanding financial balance after a reversal.

---

## 32. Stay Points Ledger Testing

Use document 09. Testing must distinguish Earned points, Pending points, Unlocked points, Available points, Reserved points, Held points, Consumed points, Expired or forfeited points.

### 32.1 Earning

Test approved eligible verified resort spending. Under the approved current earning direction: ₱1 eligible verified spending = 1 earned Stay Point. Verify the actual governing rule and any applicable rounding.

### 32.2 Annual capacity

Test Bronze/Silver/Gold eligibility, annual caps, minimum qualifying spending, membership cycles. Do not award the entire annual maximum merely because the minimum spending condition was met.

### 32.3 Weekday/Weekend allocation

Test the approved 70% Weekday and 30% Weekend allocation. Include rounding and precision boundary tests based on the authoritative calculation policy.

### 32.4 Pending and unlocking

Points that have not met unlocking requirements must not be treated as spendable.

### 32.5 Ledger integrity

Test duplicate earning attempts, refund adjustments, Holds, reconciliation, no unsupported negative available balances, consistent projections.

### 32.6 Gold supplementary holders

Verify shared membership points access and prevention of duplicate independent balances.

### 32.7 Contract welcome gifts

Where applicable, distinguish historical or contractual Annual Welcome Gift entitlements from earned transactional points. Do not silently treat them as equivalent if the governing source defines separate mechanisms.

---

## 33. Redemption Testing for Future Activation

Redemption is currently disabled. The testing architecture must preserve the future acceptance criteria without activating the module. Use document 10. Future relevant scenarios include eligibility, available balance, Weekday/Weekend selection, scheduled stay/service date, manual approval, points reservation, mixed Points + Cash, Finance verification, service completion, final points consumption, cancellation, restoration or forfeiture under approved rules, duplicate-consumption prevention.

### 33.1 Current disabled-state tests

Before future authorization, test that: Redemption navigation is hidden; Direct page access does not enable restricted workflows; API calls cannot execute disabled redemption operations; No points can be consumed through disabled redemption functionality. Do not create working redemption tests that require the module to be activated during this documentation task.

---

## 34. Services Module Disabled-State Tests

Services is also preserved but disabled. Document tests ensuring: No active Services navigation; No unauthorized direct route access; No active Services API workflow; No unintended business processing; Existing code and architectural support remain preserved. Future module-specific functional tests should be developed only when implementation or reactivation is separately authorized.

---

## 35. Reports and Analytics Testing

Use documents 11 and 13. Test Confirmed Sales values, Confirmed Sales counts, Finance collections, outstanding balances, overdue installments, commission totals, actual Paid commissions, active memberships, VIP tier distribution, Stay Points liabilities and balances, seller/team performance, historical attribution, date filters, reversal periods.

### 35.1 Date filters

Verify the approved filters: Today, Past 7 Days, Past 28 Days, Past 6 Months, Custom Start Date, Custom End Date. Use the correct underlying business-event timestamps.

### 35.2 Timezone

Use the appropriate Asia/Manila business-date semantics. Test midnight and period boundaries.

### 35.3 Double-counting

A sale visible to a seller and authorized uplines must not be recognized multiple times in consolidated company totals.

### 35.4 Reconciliation

Financial reports must reconcile to their actual authoritative source records. Do not validate a report only by comparing it to another independently calculated UI total.

---

## 36. Audit Log Testing

Use document 12. Test audit coverage for sensitive actions: staff approval, role assignment, permission change, accreditation approval, genealogy transfer, contract finalization, Finance verification, refund/reversal, commission approval, payout, VIP activation, points adjustment, business configuration change.

### 36.1 Audit fields

Verify the approved actor, event, target, timestamp, outcome, related transaction, relevant before/after context, correlation.

### 36.2 Append-only behavior

Test that ordinary application actions cannot silently rewrite earlier audit history.

### 36.3 Privacy

Audit records must not expose passwords, tokens, secrets or unnecessary sensitive customer information.

### 36.4 Access control

Unauthorized users must not access restricted audit events or exports.

---

## 37. Historical Data Integrity Testing

This is a cross-module priority. Test preservation of Customer IDs, RA references, VIP Card IDs, Accreditation IDs, Contract snapshots, Original sale attribution, Verified payment history, Commission history, Membership activation dates, Stay Points ledgers, Audit records.

### 37.1 Policy changes

Changing current authorized settings must not silently mutate historical finalized transactions.

### 37.2 Genealogy transfers

Current hierarchy changes must not rewrite historical sale snapshots.

### 37.3 Import reconciliation

Historical imports must not fabricate missing financial evidence or activation dates.

### 37.4 Corrections

Authorized corrections should preserve the original event and record the adjustment.

---

## 38. Customer Import Testing

The platform supports future authorized customer and historical data imports. Document testing for workbook parsing, required sheets/columns where applicable, template identification, metadata validation, field types, invalid dates, invalid amounts, missing references, duplicate customers, duplicate sales, duplicate payments, incorrect payment balances, contract classification, activation eligibility, points eligibility, preview, rejection/Hold, authorized confirmation, retry, audit.

### 38.1 XLSX

Test application-level workbook parsing and validation. Do not assume raw MongoDB import tools can enforce complex multi-sheet business rules.

### 38.2 Formula and external link safety

Where applicable, validate the workbook security requirements established by the current import specification.

### 38.3 Idempotency

Repeating an imported batch must not duplicate certified financial settlements or spendable points.

### 38.4 Contradictory source data

Do not silently convert contradictory historical records into Active memberships.

---

## 39. Local MongoDB to Atlas Migration Testing

This is required by the project owner's local-first database strategy. Document future tests for local source inventory, backup creation, BSON restore, Database Tools compatibility, collection counts, official identifier uniqueness, relationship integrity, index validation, financial reconciliation, membership reconciliation, points ledger reconciliation, audit history, application compatibility, cutover readiness, rollback conditions.

### 39.1 Staging rehearsal

Migration must be rehearsed against an isolated nonproduction Atlas destination before production cutover.

### 39.2 Synthetic data protection

Do not automatically transfer ordinary local test records into production.

### 39.3 Source-write handling

Test the approved cutover strategy for writes occurring during migration.

### 39.4 Post-migration acceptance

A successful restore command alone does not prove business correctness. Validate business invariants.

---

## 40. Legacy Supabase Migration Boundary

The current project does not authorize automatic migration from the earlier Supabase production system. Document testing requirements only if a future migration is separately approved. Potential checks: historical identity mapping, identifier preservation, contract snapshots, finance reconciliation, genealogy attribution, membership eligibility, Stay Points history, privacy, duplicate prevention. Do not connect to, copy, reset or modify the earlier Supabase production database.

---

## 41. Security Testing

Use `security.md`. Required categories: authentication, session revocation, privilege escalation, horizontal authorization, vertical authorization, IDOR/BOLA, public lookup enumeration, input validation, NoSQL injection, XSS, CSRF, CORS, SSRF where applicable, rate limiting, file upload abuse, secret exposure, sensitive log exposure, backup access, disabled feature bypass, security-sensitive race conditions. Testing must verify actual backend controls, not only hidden UI elements.

---

## 42. Performance Testing

Document a realistic performance verification approach for customer search, accreditation verification, large operational tables, genealogy queries, Finance queues, reporting filters, MongoDB indexes, pagination, API throughput, concurrent mutations, startup time, memory usage. Do not invent mandatory latency or throughput numbers without an approved performance target. Define how baselines will be measured and reviewed. Use staging or isolated performance environments. Avoid uncontrolled load tests against production.

---

## 43. Accessibility Testing

Document testing for keyboard navigation, focus order, focus management, screen reader labels, form errors, table headings, modal dialogs, color contrast, reduced motion, mobile zoom, responsive operation. Use appropriate WCAG guidance. Accessibility testing should include both automated checks and manual verification. Do not assume automated scanners detect every accessibility issue.

---

## 44. End-to-End Testing

Define a small, risk-focused set of representative E2E journeys (see scenarios in task prompt Part 45): Staff onboarding; OST registration; Customer and contract; Sales and Finance; Membership activation; Commission lifecycle; Stay Points; Authorization; Financial reversal; Public lookup. The exact flow must follow approved business rules, including any currently unresolved dependencies. Avoid fabricating successful outcomes for business decisions that are not finalized.

---

## 45. Negative and Adversarial Testing

The testing document must not cover only successful workflows. Include negative cases such as missing fields, invalid identifiers, wrong actor, wrong customer, wrong Sales Network branch, expired accreditation, suspended account, invalid parent hierarchy, duplicate Finance verification, duplicate payout, duplicate VIP allocation, insufficient points, invalid status transition, conflicting historical data, database outage, file upload abuse, network interruption, transaction rollback, unauthorized export, disabled module access. Define expected safe behavior.

---

## 46. Fault Injection and Recovery Testing

Document controlled failure simulations where justified: database connection loss, application restart during an operation, transaction conflict, duplicate HTTP request, external notification failure, retry after timeout, backup restore failure, deployment rollback. Important: an HTTP timeout does not prove a transaction was not completed. Idempotent operations must handle retry and result reconciliation safely. Do not execute fault injection against live production records without separately approved operational safeguards.

---

## 47. Database Backup and Restore Testing

Document backup verification, restore to an isolated destination, collection completeness, index restoration, record counts, official identifier integrity, payment reconciliation, membership consistency, points ledger integrity, audit preservation, application compatibility. Do not invent backup retention periods or recovery guarantees. Testing must respect the selected Atlas tier's actual capabilities.

---

## 48. Deployment Validation

The target deployment is DigitalOcean Droplet + Docker Compose + HTTPS + MongoDB Atlas. Testing must cover production build, configuration validation, container startup, health checks, HTTPS, reverse proxy, secure Atlas connectivity, session behavior, environment-specific feature flags, required database indexes, application readiness, logs, monitoring, rollback readiness. Do not claim any deployment tests have already been performed.

---

## 49. CI/CD Testing Strategy

Document a proposed future verification pipeline. Potential stages: Markdown/documentation checks, static analysis, type checking, unit tests, component tests, API/service integration tests, database integration tests, security checks, build verification, selected E2E tests, staging validation, authorized production release checks. Do not automatically require every expensive test on every small documentation edit. Define risk-based execution policies. Do not claim CI/CD is already implemented. Do not create GitHub Actions workflows in this task.

---

## 50. Test Priority and Risk Classification

Define practical priorities.

**Critical:** authentication bypass, privilege escalation, exposure of private customer records, duplicate verified payments, duplicate commission payout, duplicate VIP identifiers, incorrect membership activation, corrupted points ledger, destructive historical data corruption, unreconciled production migration, critical database transaction inconsistency, unauthorized activation of disabled modules.

**High:** genealogy attribution, contract snapshot integrity, customer identity reconciliation, import idempotency, reporting correctness, accreditation access gates, backup/restore integrity.

**Standard:** UI layout regressions, noncritical display formatting, cosmetic inconsistencies, routine component behavior.

Use actual business impact to determine priority. Do not classify all tests as equally critical.

---

## 51. Regression Testing

Document how future changes should be reviewed against existing business behavior. Examples: role changes must not weaken authorization; genealogy changes must not affect historical sales; contract configuration changes must not mutate signed contracts; Finance changes must not duplicate confirmed sales; Commission changes must not bypass manual approval; Membership changes must not issue duplicate VIP IDs; Points changes must not restore spent balances; Import changes must not create duplicate certified settlements; Public search changes must not expose private data; Disabled feature changes must not reactivate Redemption or Services. Test coverage should evolve as modules are implemented.

---

## 52. Test Traceability Matrix

| Business-rule document | Critical test coverage | Primary testing level |
|---|---|---|
| 01 Roles and Permissions | Account/role authorization and privilege boundaries | Unit, API, E2E |
| 02 Sales Network and Genealogy | Parent validation, transfers, historical attribution | Unit, integration |
| 03 Accreditation | Issuance, approvals, expiry, public lookup | Unit, API, E2E |
| 04 Customers | Drafts, identity, lookup, imports | Unit, integration, E2E |
| 05 VIP Products and Contracts | Contract lifecycle and historical snapshots | Unit, integration |
| 06 VIP Card Issuance | Official format, concurrency, uniqueness | Unit, database |
| 07 Finance and Payments | Verification, balances, reversals | Integration, transactions |
| 08 Commission Management | Manual approval, payout, Holds | Unit, integration |
| 09 Membership and Stay Points | Activation, earning, ledger integrity | Unit, transactions |
| 10 Redemption | Disabled-state protection, future reservation logic | Security, future integration |
| 11 Reports and Analytics | Permissions, accurate totals and filters | Integration |
| 12 Audit Logs and Governance | Traceability, privacy, history protection | Integration, security |
| 13 Sales Performance Reporting | Confirmed Sales recognition and adjustments | Unit, integration |

Expand or correct based on the actual documents. Do not fabricate unsupported expected outcomes.

---

## 53. Test Acceptance Criteria

### 53.1 Unit-level acceptance

The applicable domain behavior matches the approved rules.

### 53.2 Service-level acceptance

The operation has the correct authorized state effects.

### 53.3 API-level acceptance

The request, response, security and errors follow the published contract.

### 53.4 Database-level acceptance

Persistence and transaction integrity are correct.

### 53.5 E2E acceptance

The authorized user can complete the relevant workflow through the actual interface.

### 53.6 Security acceptance

Critical authentication, authorization, privacy and financial controls do not have unresolved release-blocking failures.

### 53.7 Migration acceptance

Relevant data is reconciled and the cutover is approved.

### 53.8 Production acceptance

Critical testing, security review, deployment checks and recovery readiness have been completed and authorized. Do not invent numerical acceptance thresholds where none have been approved.

---

## 54. Release Quality Gates

A production release must not proceed when there is an unresolved critical defect involving unauthorized financial actions, authentication bypass, privilege escalation, exposure of private customer records, duplicate verified payments, duplicate commission payout, duplicate VIP identifiers, incorrect membership activation, corrupted points ledger, destructive historical data corruption, unreconciled production migration, critical database transaction inconsistency, unauthorized activation of disabled modules.

Define how exceptions require explicit approval and risk assessment. Do not allow ordinary developers or AI agents to waive critical requirements without authority.

---

## 55. Test Reporting and Defect Management

Document a standard test-result report including test scope, environment, application/build revision, test data type, executed tests, passed, failed, skipped, blocked, unverified areas, known defects, severity, reproduction steps, evidence, release impact. Do not mark unexecuted tests as passed. Distinguish Documented, Implemented, Executed, Passed as separate statuses.

---

## 56. Implementation Phase Alignment

Align with `docs/development/implementation.md`: Phase 0 Documentation; Phase 1 Frontend Foundation (manual-first frontend review, incremental component/unit checks where justified); Phase 2 Local MongoDB (database integration infrastructure, schema/index testing, local transaction verification); Phase 3 Backend Foundation (API contract, authentication, RBAC, repository and service tests); Phase 4 Business Modules (module-specific automated test coverage, prioritizing high-risk workflows); Phase 5 Frontend/Backend Integration (end-to-end integration and replacement of mock adapters); Phase 6 System Validation (regression, security, financial reconciliation, performance, accessibility and release-gate evaluation); Phase 7 Production Deployment (staging validation, migration rehearsal, infrastructure checks, backup/restore, production readiness); Phase 8 Stabilization (operational monitoring, defect regression suites and controlled enhancement testing). These are future implementation responsibilities, not authorization to implement or execute tests now.

---

## 57. Critical Testing Invariants

1. Tests must follow authoritative business rules.
2. No invented commercial rates or prices.
3. No real production customer data in ordinary test fixtures.
4. Frontend mocks and local MongoDB are distinct testing modes.
5. Frontend mock data resets on full browser refresh.
6. Local MongoDB development data is persistent.
7. Automated destructive tests use isolated databases.
8. MongoDB multi-document transaction testing requires an appropriate deployment.
9. Production Atlas must not be used as the default test database.
10. Payment submission is not Finance verification.
11. Contract finalization is not payment verification.
12. Confirmed Sale is not necessarily Fully Paid.
13. Fully Paid is not automatically a completed official activation.
14. Sales recognition must not double-count.
15. Finance verification remains Finance-controlled.
16. Refunds and reversals preserve historical records.
17. Commission approval remains manual under Finance authority.
18. Approved commission is not Paid commission.
19. Commission payout must not be duplicated.
20. VIP Card IDs must follow official allocation requirements.
21. RA-derived identifier constraints must be respected.
22. Historical identifiers remain unchanged.
23. Genealogy transfers preserve historical attribution.
24. IST/OST authorization must respect actual hierarchy.
25. OST sponsor approval must not be bypassed where required.
26. Customer Draft and final submission are different workflows.
27. Customer Lookup must preserve privacy.
28. Public accreditation verification must preserve privacy.
29. Stay Points earning must follow eligible spending.
30. Annual capacity is not available balance.
31. Weekday/Weekend balances remain distinct.
32. Gold supplementary holders share one membership points pool.
33. Points must not be double-consumed.
34. Reports must reconcile to authoritative sources.
35. Role changes must not leak cached user data.
36. Direct API requests must not bypass authorization.
37. Audit history must remain traceable.
38. Imports must not create duplicate business records.
39. Database migration requires reconciliation.
40. No automatic legacy Supabase production migration.
41. Redemption remains disabled.
42. Services remains disabled.
43. Production release requires automated critical verification.
44. Manual frontend testing remains permitted during the early phase.
45. No testing implementation is authorized by this document alone.

---

## 58. Critical Unresolved Dependencies

Only genuine blockers. Do not invent decisions. Examples: unresolved Gold/Silver contract price discrepancies; RA numbering scope uniqueness; accreditation active-status/expiry evaluation rules; Better Auth + MongoDB compatibility; local replica-set configuration; selected Atlas tier transaction support; formal audit retention policy; financial rounding policies; selected object-storage provider; selected reverse proxy; exact mandatory-field matrix for customer submission; exact mandatory certification conditions; complete payment scheme canonical register from approved docs; tier-code format expansion if needed; partial stay/completion rules for redemption; mixed weekday/weekend multi-day booking calculations; policy-version applicability when a booking spans a configuration change.

---

## 59. References

- `docs/development/architecture.md`
- `docs/development/frontend.md`
- `docs/development/database.md`
- `docs/development/backend.md`
- `docs/development/security.md`
- `docs/development/implementation.md`
- `docs/development/deployment.md`
- `docs/business-rules/01–13`

---

## Completion Report

- **File created/updated:** `docs/development/testing.md` (comprehensively rewritten/expanded).
- **Testing architecture coverage:** testing layers, tooling direction, manual-first frontend development, automated production readiness, test isolation, synthetic data, test case design, unit/component/mock/API/service/DB/transaction/authentication/RBAC/staff/genealogy/accreditation/customer/VIP/finance/reversal/commission/membership/Stay Points/redemption (disabled)/services (disabled)/reporting/audit/historical/import/migration/security/performance/accessibility/E2E/negative/fault-injection/backup/deployment/CI-CD/priority/regression/traceability/acceptance/release-gates/reporting/phases/invariants.
- **Database testing:** local MongoDB, replica-set transactions, Mongoose, Atlas staging, migration, import, backup/recovery.
- **Business module testing:** all 13 business-rule docs represented in traceability matrix.
- **Critical financial and security tests:** payment verification, reversals, sales recognition, commission payouts, membership activation, identifier uniqueness, points integrity, RBAC, customer privacy, idempotency, concurrency.
- **Release acceptance:** risk-based priorities, release-blocking conditions, test reporting standards, production validation, backup/recovery testing.
- **Cross-document consistency:** aligned with architecture, frontend, database, backend, security, implementation, deployment, business-rules 01–13. No material inconsistencies.
- **Unresolved critical dependencies:** listed in Section 58.
- **Validation results:** Markdown structure validated; relative links verified; architecture and business-rule consistency checked; git diff inspection performed.
- **Execution safety:** Application code modified: No. Test suite created: No. Test configuration created: No. Dependencies installed: No. Tests executed: No. Local MongoDB modified: No. MongoDB Atlas modified: No. Database migration executed: No. Data import executed: No. Other documentation modified: No. Git commit: No. Git push: No. Git merge: No. Deployment: No. Redemption enabled: No. Services enabled: No. Production data migrated: No.

STOP — awaiting explicit project-owner authorization before creating tests, changing application code, starting databases, modifying Git or deploying.