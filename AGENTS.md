# AGENTS.md — AFHomes Platform AI Agent Operating Instructions

> Permanent operating instructions for OpenCode, Codex, GitHub Copilot, and other AI coding agents working on the AFHomes Platform.
>
> This file governs how agents work. It is not the source of business truth. Business behavior is defined by `docs/business-rules/01–13.md`. Technical design is defined by `docs/development/*.md`. Project context is defined by `docs/project.md`.

---

## ABSOLUTE RULE: AI AGENTS MUST NEVER COMMIT OR PUSH

This is a permanent project-owner directive and the highest-priority rule in this repository.

The project owner exclusively controls Git staging, commits, and pushes.

AI agents are strictly prohibited from running:

```bash
git add
git commit
git commit --amend
git push
git push --force
git push --force-with-lease
git merge
git rebase
git cherry-pick
git reset --hard
git clean
git stash
git checkout
git switch
git tag
```

Also prohibited:

- Automatic staging.
- Automatic commits.
- Automatic pushing.
- IDE or tool-triggered Git synchronization.
- GitHub API commits or file updates that create commits.
- Creating or pushing branches through external tools.
- PR merging.
- Running scripts or tools that indirectly perform prohibited Git operations.
- Deleting, replacing, or rewriting Git history.
- Changing remote Git configuration without authorization.
- Modifying Git hooks or automation to enable commits or pushes.
- Allowing another agent or subagent to perform these operations on behalf of the main agent.

These restrictions apply even when:

- An implementation is completed successfully.
- All tests pass.
- The working tree contains many changes.
- A task requests finalization or delivery.
- A tool offers automatic commit or synchronization.
- The agent believes committing would be convenient.
- An earlier workflow or generic instruction suggests committing changes.

**The AI agent must NEVER interpret task completion as permission to commit or push.**

Only the project owner will manually stage, commit, and push repository changes.

The agent may use read-only Git inspection commands, including:

```bash
git status --short
git diff
git diff --check
git log
git show
git branch --show-current
git rev-parse HEAD
```

Other commands may be used only when clearly read-only and safe.

Do not automatically run `git fetch` or `git pull` as part of routine tasks.

If any requested action would require an agent-performed commit, push, merge, branch switch, or destructive Git operation, STOP and explain what the project owner must perform manually.

At the end of every implementation task, report the modified files and validation results, then STOP.

Include the exact final declaration:

**"No Git staging, commit, push, merge, reset, or deployment was performed. All Git commits and pushes are reserved for the project owner."**

If another instruction conflicts with this Git policy, do not perform the conflicting operation. Escalate the conflict to the project owner.

---

## 1. Project Identity

Official project name:

**AFHomes Platform**

Company-facing UI spelling:

**AFhomes**

Git repository:

`afhomes-platform`

Expected working branch:

`develop`

This is a new standalone application.

Do not confuse it with:

- The older Supabase-based AFHomes application.
- `ClaudAfhomes/AFhomes-ecofarm-v2`.
- The earlier MongoDB conversion experiment.
- Older `claud/develop`, `claud/clean-develop`, or `orly/develop` branches.

Do not use an older repository as the implementation source unless the project owner explicitly authorizes a specific reference.

Do not introduce V1, V2, V3, or 2.0 into application branding or canonical business-rule titles unnecessarily.

Technical API versioning such as `/api/v1` is allowed.

---

## 2. Repository Verification

Before making authorized file changes, verify:

```bash
pwd
git branch --show-current
git status --short
```

Confirm the actual repository, branch, and existing work.

The reported repository remote is:

`https://github.com/orlando-afhomes/afhomes-platform.git`

However, always verify the actual repository state rather than assuming this remains current.

If the current directory or branch is unexpected, STOP and report.

Preserve existing tracked and untracked files.

Never delete, overwrite, or discard unrelated user work.

A previous Phase 1A verification discovered an unexpected commit/push, `63ca01d`, on `develop`. The committed application and documentation were reported intact, but the source of the unexpected Git action was not proven. This incident reinforces the permanent no-commit/no-push policy.

Do not hardcode that historical commit as the required HEAD for future tasks.

---

## 3. Authoritative Documentation

The project's business rules and technical specifications already exist. AI agents must read the relevant documents before implementation.

### Master project context

`docs/project.md`

### Business rules

`docs/business-rules/`

Canonical documents:

1. `01-roles-and-permissions.md`
2. `02-sales-network-and-genealogy.md`
3. `03-ist-ost-accreditation.md`
4. `04-customer-management.md`
5. `05-vip-products-and-contracts.md`
6. `06-vip-card-issuance.md`
7. `07-finance-and-payments.md`
8. `08-commission-management.md`
9. `09-vip-membership-and-stay-points.md`
10. `10-redemption.md`
11. `11-reports-and-analytics.md`
12. `12-audit-logs-and-governance.md`
13. `13-sales-performance-reporting.md`

### Development specifications

`docs/development/`

Canonical documents:

- `README.md`
- `architecture.md`
- `frontend.md`
- `database.md`
- `backend.md`
- `security.md`
- `testing.md`
- `implementation.md`
- `deployment.md`

### Documentation precedence

Use the following order:

1. Latest explicitly approved project-owner instructions, when verified.
2. Current canonical business-rule documents.
3. Approved architecture and development specifications.
4. Master project context.
5. Verified historical source material.

The permanent no-commit/no-push Git policy remains an overriding agent-operation restriction.

Business rules are authoritative for business behavior.

Development documentation defines the implementation approach.

`AGENTS.md` governs how AI agents work. It must not become a competing source of business truth.

Do not duplicate entire authoritative documents in `AGENTS.md`. Provide concise summaries and direct references.

If documents conflict, report:

- Exact conflicting files and sections.
- Conflicting requirements.
- Affected module.
- Severity.
- Whether the conflict blocks the current task.
- Recommended clarification.

Never invent missing financial, legal, or security policies.

---

## 4. Approved Application Architecture

AFHomes Platform uses a single Next.js application.

Architecture:

**Panel-Based + Feature-Based Modular Monolith**

Approved technologies:

| Layer | Technology |
|---|---|
| Framework | Next.js App Router |
| UI | React |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Additional styling | CSS Modules |
| Validation | Zod |
| Asynchronous frontend state | TanStack Query |
| REST API | `/api/v1` |
| Backend | Next.js Route Handlers |
| Authentication direction | Better Auth, subject to compatibility verification |
| Authorization | Centralized RBAC and record-level restrictions |
| ODM | Mongoose |
| Initial database | Local MongoDB |
| Cloud database | MongoDB Atlas |
| Production hosting | DigitalOcean Droplet |
| Deployment | Docker Compose |
| Transport | HTTPS |

Verify actual package versions and installed dependencies from the repository. The reported Phase 1A implementation uses Next.js 16.4.3, React 19.3, TypeScript 5, and Tailwind CSS 4.

Do not make assumptions about future package upgrades.

### Architecture restrictions

Do not introduce:

- Separate Express backend.
- Separate NestJS backend.
- Microservices.
- Independent frontend/backend repositories.
- Kubernetes.
- Turborepo by default.
- Unnecessary distributed infrastructure.
- DigitalOcean App Platform as the default hosting approach.

The frontend and backend belong to the same Next.js application.

Business logic must not be duplicated across panels.

---

## 5. Application Source Structure

Follow the documented architecture.

Conceptual structure:

```text
src/
├── app/
├── panels/
├── modules/
├── data/
├── server/
├── shared/
└── config/
```

Responsibilities:

- `src/app/`: App Router layouts, pages, and API entry points.
- `src/panels/`: Panel-specific UI, navigation, components, and presentation.
- `src/modules/`: Domain-specific contracts, validation, business rules, and use cases.
- `src/data/`: Typed frontend data access and mock/HTTP adapters.
- `src/server/`: Server-only authentication, services, database access, repositories, and integrations.
- `src/shared/`: Truly shared components, types, hooks, and utilities.
- `src/config/`: Configuration and feature boundaries.

Actual Phase 1A files already include:

- Public home route `/`.
- Admin route `/admin`.
- Login placeholder `/login`.
- Public and Admin layouts.
- Shared TanStack Query provider.
- Tailwind and shadcn/ui foundation.

Do not restructure these files unnecessarily.

Do not generate hundreds of empty files or directories in advance.

Create only the files necessary for the currently authorized implementation task.

---

## 6. Application Panels

The platform has logical panels within one application.

### Public Panel

Supports the approved scope for:

- Public AFhomes website.
- Public IST/OST accreditation verification.
- Public Customer Lookup.
- Login entry.
- Future authorized CMS capabilities.

### Admin and Operations Panel

Supports authorized interfaces for:

- Super Administrator.
- Administrator.
- HR.
- Finance.
- Authorized staff.
- Sales network personnel.

Role-specific interfaces may differ in navigation, dashboards, forms, available modules, allowed records, reports, and permitted business actions.

### Sales Network

The canonical genealogy terminology includes:

**SVD → SSM → SM → OST**

OST may have an eligible direct SVD, SSM, or SM sponsor according to current rules.

IST and OST interfaces should follow the documented permission and accreditation rules.

OST must not receive unrestricted team-wide access.

### Future interfaces

A Customer Portal and React Native/Expo mobile application are future capabilities.

Do not implement them without separate authorization.

---

## 7. Frontend-First Development Policy

Frontend-first development is approved.

During the mock development phase:

- Use centralized, typed, browser-scoped in-memory mock data.
- Use synthetic records only.
- Support consistent relationships.
- Use typed repository contracts.
- Support authorized mock CRUD and lifecycle transitions.
- Simulate asynchronous loading and errors.
- Keep development identity switching separate from production authentication.

### Critical mock persistence policy

Mock business data exists in browser-scoped memory only.

A full browser refresh must restore the original synthetic seed data.

Do NOT persist mock business records using:

- localStorage.
- IndexedDB.
- Persistent mock databases.
- Server-side singleton stores shared between unrelated users.

Use TanStack Query consistently.

Clear or isolate permission-sensitive query caches when changing development identities.

No customer or staff data belonging to a previous mock identity may appear under another identity.

Mock login is never a production authorization mechanism.

Frontend components must be designed to migrate from typed mock adapters to real HTTP adapters without complete rewrites.

---

## 8. Backend Architecture

The backend will use the same Next.js application.

Follow the approved development documents.

Requirements include:

- Thin API Route Handlers.
- Centralized domain services.
- Typed API contracts.
- Zod validation.
- Centralized authorization.
- Record-level filtering.
- Server-only Mongoose access.
- Appropriate service/repository separation.
- Structured safe errors.
- Idempotency where required.
- Concurrency control.
- Audit logging for sensitive operations.

Do not implement server functionality ahead of the authorized phase.

Frontend navigation restrictions never substitute for backend authorization.

---

## 9. Database Architecture

Initial real database:

**Local MongoDB**

Production database:

**MongoDB Atlas**

Application hosting:

**DigitalOcean Droplet**

Local MongoDB development should work without Atlas production credentials.

All MongoDB access must remain server-side.

Use Mongoose as specified in the approved architecture.

Transactions for critical multi-document business operations require an appropriate MongoDB deployment, such as a replica set.

Protect official identifier allocation, financial verification, commission payout, membership activation, and points ledger consistency.

Never run unauthorized database resets or migrations.

Do not automatically migrate data from the previous Supabase system.

Synthetic mock data is not automatically production data.

---

## 10. Critical Business Invariants

Include a concise summary of the following requirements, with references to their canonical documents.

### Roles and permissions

- Centralized RBAC.
- Multiple active role assignments where authorized.
- Module-level permissions.
- Record-level scopes.
- Protected Super Administrator privileges.
- Mandatory account-status restrictions.
- Auditable role and access changes.

Never assume module visibility grants authority to perform sensitive operations.

### Sales network and genealogy

- Follow canonical SVD/SSM/SM/OST hierarchy.
- Validate sponsor and parent relationships.
- Prevent genealogy cycles.
- Apply role-dependent upline/downline visibility.
- Preserve historical sale attribution when genealogy changes.

### Accreditation

- IST/OST accreditation follows document 03.
- AAI identifies IST accreditation.
- AAO identifies OST accreditation.
- Follow approved creation, sponsorship, approval, renewal, suspension, and expiration rules.
- Public verification uses the approved exact identifier search and restricted public fields.
- IST public verification does not show "Valid Until."
- OST public verification shows applicable "Valid Until."

### Customers

- Customer identity and RA identifiers are distinct concepts unless explicitly reconciled by canonical policy.
- Preserve draft versus submitted application distinctions.
- Follow authorized import validation and duplicate prevention.
- Public Customer Lookup must not expose unrestricted customer records.
- Only eligible Active VIP Membership records qualify for approved public lookup.

### VIP products and contracts

- Main tier codes include Bronze B1, Silver S1, and Gold G1.
- Product configuration changes must not retroactively rewrite finalized historical contracts.
- Do not activate unapproved tier codes or schemes.
- Do not fabricate missing contractual prices or terms.

### VIP Card issuance

- Follow official Card ID and RA allocation rules from document 06.
- Current documented identifier format: `YYMMDDNNNNNVTPMMS`.
- Use the approved numbering relationships.
- Prevent duplicate Card IDs.
- Preserve historically issued official numbers.
- Do not create a competing independent serial allocator.

### Finance

The following are distinct:

- Payment submitted.
- Payment Finance-verified.
- Contract finalized.
- Sale confirmed.
- Fully paid.
- VIP membership officially activated.

Only authorized Finance actors verify monetary receipts.

Do not automatically activate a VIP Membership merely because Finance verified a payment.

Financial reversals must preserve traceable historical records.

### Commissions

- Follow approved recipient eligibility and historical genealogy.
- Finance controls required percentage assignment, approvals, and payouts.
- Approved commission does not mean Paid.
- Only confirmed disbursement qualifies as Paid.
- Do not invent universal commission percentages.
- Prevent duplicate payouts.

### Membership and Stay Points

- Membership activation requires the approved lifecycle.
- Stay Points are ledger-controlled.
- The documented Spend-to-Earn model uses qualifying Finance-verified resort spending.
- Apply approved earning caps and conditions.
- Weekday/Weekend allocation follows the canonical 70%/30% principle.
- Preserve historical contractual benefits.
- Prevent duplicate or invalid ledger credits.

### Redemption and Services

**Both modules are currently disabled.**

Preserve their documented future architecture.

Do not activate their routes, APIs, backend operations, or navigation without separate authorization.

Hiding frontend navigation alone is insufficient once backend routes exist.

### Reporting

- Use authoritative source records.
- Use correct business event dates.
- Preserve historical attribution.
- Avoid double-counting sales.
- Follow role-based record access.
- Respect approved date filters.

### Audit and governance

- Use centralized, logically append-only audit history.
- Track sensitive business and security actions.
- Never log credentials or unnecessary sensitive data.
- Preserve historical corrections.
- Do not invent retention durations.

---

## 11. Important Unresolved Business Decisions

Do not silently resolve unresolved policies during development.

Known items include:

- Gold price discrepancy of ₱390,000 versus ₱780,000.
- Unfinished Silver contractual amount.
- Non-Standard contract authorization.
- Move A/B1/B2 commercial terms.
- RA numbering scope and uniqueness.
- Accreditation expiry/access cutoff interpretation.
- Card Claim Date versus Activation Date validity-start policy.
- Better Auth/MongoDB integration compatibility.
- Atlas transaction capability for target tier.
- Formal audit retention policy.
- Production domain, infrastructure sizing, and provider selections.

Verify the current canonical documents before treating any historical blocker as still open.

The previously reported architecture contradiction regarding automatic VIP activation was resolved during Phase 1A acceptance verification.

Unresolved commercial or infrastructure decisions do not automatically block independent frontend foundation work.

---

## 12. Financial, Date, and Privacy Safety

AFHomes operates in the Philippine business context.

Use appropriate Asia/Manila business-date semantics.

Avoid timezone shifts for date-only fields.

Do not use uncontrolled JavaScript floating-point calculations for authoritative monetary transactions.

Follow the approved exact-money and rounding specifications.

Sensitive documents and payment evidence must not be stored in unrestricted public locations.

Prevent unnecessary personal-information exposure.

Do not reveal:

- Database credentials.
- Authentication secrets.
- Private tokens.
- Government IDs.
- Private financial details.
- Unapproved customer information.

---

## 13. Implementation Roadmap

Follow `docs/development/implementation.md`.

Established sequence:

- Phase 0 — Documentation Foundation.
- Phase 1 — Frontend Foundation.
- Phase 2 — Local MongoDB Foundation.
- Phase 3 — Backend Foundation.
- Phase 4 — Core Business Modules.
- Phase 5 — Frontend/Backend Integration.
- Phase 6 — Testing and Validation.
- Phase 7 — Cloud Deployment.
- Phase 8 — Stabilization and Future Enhancements.

Current reported milestone:

**Phase 1A implemented and technically verified.**

Phase 1A included:

- Next.js scaffold.
- Public Panel shell.
- Admin/Operations shell.
- Login placeholder.
- Shared UI foundation.
- Responsive layouts.
- TanStack Query provider.

Phase 1B is the next proposed milestone. Every implementation milestone, including Phase 1B and all later phases, requires explicit project-owner authorization before work begins. Documentation, planning, or prior verification does not constitute authorization.

Do not begin any phase, subphase, or feature automatically.

---

## 14. Development Workflow

For every authorized implementation task:

1. Confirm repository and branch.
2. Inspect the existing working tree.
3. Read relevant authoritative documents.
4. Determine task boundaries.
5. Identify dependencies and blockers.
6. Implement only authorized changes.
7. Preserve existing behavior outside the task.
8. Run appropriate tests.
9. Inspect changed files and possible regressions.
10. Produce a final implementation report.
11. STOP.

Never silently implement additional features.

Never change approved business rules as a side effect of implementation.

Never substitute an unapproved architecture for the documented architecture.

When a requirement is ambiguous, distinguish between:

- An issue that blocks the current task.
- An issue that affects only a later module.
- A nonblocking improvement.

---

## 15. Testing Requirements

Use the testing standards from `docs/development/testing.md`.

Relevant categories include:

- TypeScript.
- ESLint.
- Production build.
- Component tests.
- Unit tests.
- Integration tests.
- API tests.
- Security tests.
- Database transaction tests.
- End-to-end browser tests.
- Accessibility tests.
- Regression tests.

Do not claim tests passed unless they actually ran.

Do not claim browser visual verification based only on successful compilation.

For financial operations, verify:

- Idempotency.
- Duplicate prevention.
- Concurrent operations.
- Reversal handling.
- Reconciliation.
- Audit integrity.

Use isolated testing data.

Never erase ordinary developer records during routine tests.

---

## 16. Required Agent Reporting Format

Every completed implementation task must report:

### A. Task Summary

What was implemented and why.

### B. Files Changed

List created, modified, and deleted files.

### C. Business-Rule Compliance

Relevant canonical documents and any unresolved differences.

### D. Technical Verification

Commands executed and actual results.

### E. Security and Data Safety

Confirm no unauthorized access, persistence, or secret exposure.

### F. Known Limitations

Unfinished work, blockers, or deferred improvements.

### G. Git Status

Current branch, initial HEAD, ending HEAD, and working-tree state.

### H. Unauthorized Operations Check

Confirm whether any Git or infrastructure operation occurred unexpectedly.

### I. Final STOP Declaration

End with:

**"Implementation completed within the authorized scope. No Git staging, commit, push, merge, reset, or deployment was performed. All Git commits and pushes are reserved for the project owner. STOP — awaiting further instructions."**

If any prohibited action occurred unexpectedly, explicitly disclose it instead of claiming compliance.

---

## 17. Authorization and Scope Policy

Every implementation milestone, task, phase, or feature requires explicit project-owner authorization before work begins.

Documentation completion, prior verification, or a proposed roadmap does not constitute authorization.

Authorized work must remain within the approved scope. Do not silently expand scope, implement later phases, activate disabled modules, provision infrastructure, or perform Git operations.

`AGENTS.md` may be updated only when the project owner authorizes that change.

---

## 18. Production UI Standards

Application-facing screens must not display developer notes, debug controls, temporary design-preview links, milestone labels, mock diagnostics, or internal implementation commentary. Development-only tooling must remain isolated from normal application experiences and unavailable in production builds. Every visible control must serve a legitimate purpose, and incomplete functionality must be represented honestly without misleading production behavior.

---

## 18.5 Official UI Component Standard — Ant Design First (Stage 1)

> Stage 5 (legacy removal) completed: Tailwind CSS, `@tailwindcss/turbopack`,
> `tw-animate-css`, shadcn/ui (`src/components/ui/`, `components.json`),
> `@base-ui/react`, `class-variance-authority`, and the `cn` package are
> removed. `src/lib/utils.ts` provides a local `cn()` joiner. Styling is
> Ant Design 6 + regular `.css` + descriptive class names only.

Ant Design is the official primary frontend component foundation for all AFHomes frontend work.

Legacy shadcn/ui primitives were removed in Stage 5. Do not reintroduce shadcn, Tailwind, Base UI, or CSS Modules.

1. Use Ant Design components for all UI; do not reintroduce shadcn/ui, Base UI, or Tailwind-based components.
2. Do not install shadcn/ui, Base UI, Tailwind, or CSS-Modules-based component packages.
3. Prefer composition of Ant Design primitives for complex business interfaces.
4. Build a custom primitive only when no Ant Design component or combination can satisfy the requirement, and document the reason.
5. Do not use raw custom interactive controls as shortcuts when suitable Ant Design components exist.
6. All components must follow the official AFHomes theme tokens defined in `src/theme/tokens.css` and `src/theme/antd-theme.ts`.
7. Accessibility and responsiveness are mandatory.
8. Existing business functionality must not be changed during UI standardization.
9. Future AI coding agents must follow these standards.

### 18.6 Mandatory Class Naming and Regular CSS (Stage 4 correction)

AFHomes uses Ant Design 6 and regular `.css` files for custom styling. `.module.css` is not permitted in new AFHomes code; existing modules were converted to namespaced regular CSS.

All developer-authored, non–Ant Design HTML/JSX elements must use descriptive kebab-case class names with feature namespacing (e.g. `account-page__toolbar`, `staff-profile__name`). Ant Design internal DOM is exempt; React Fragments are excluded.

1. Prefer plain string classes (e.g. `className="account-page__toolbar"`).
2. Never use numbered/random names (`div1`, `box2`) or bare generic names (`wrapper`, `container`, `title`).
3. Remove truly unnecessary wrappers instead of naming them.
4. Shared components forward `className` where call-site styling applies (`PageContainer`, `PageHeader`).
5. Do not target hashed Ant Design classes; use theme tokens, component props, or narrow documented overrides.
6. Feature CSS lives beside its feature and is imported at the narrowest server route/layout boundary; root CSS keeps tokens, resets, and base only. Global styles persist across navigation — namespace everything, avoid order-dependent overrides.
7. Verify class names in browser DevTools, not only source. No automated class-name lint (brittle for framework DOM); compliance is verified in code review + browser DOM.

## 19. Final Notes

- This file is an AI-agent governance document. It must not become a competing source of business truth.
- Use canonical documents for detailed business rules and technical specifications.
- If a discrepancy cannot be resolved from approved documentation, preserve the authoritative source and report the discrepancy.
- `AGENTS.md` itself is subject to the absolute Git policy above.

**ABSOLUTE FINAL RULE: Do not execute `git add`, `git commit`, or `git push` under any circumstances. The project owner exclusively performs these manually.**
