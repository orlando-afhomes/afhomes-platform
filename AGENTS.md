# AGENTS.md — AFHomes Platform AI Agent Operating Instructions

> Permanent operating instructions for Claude Code, OpenCode, Codex, GitHub Copilot, and other AI coding agents.
>
> This file governs how agents work. It is not the source of business truth. Business behavior is defined by `docs/business-rules/01–13`. Technical design is defined by `docs/development/*.md`. Project context is defined by `docs/project.md`.

---

## ABSOLUTE RULE: AI AGENTS MUST NEVER COMMIT OR PUSH

This is a permanent project-owner directive and the highest-priority rule in this repository. The project owner exclusively controls Git staging, commits, and pushes.

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

- Automatic staging, commits, or pushing, including IDE or tool-triggered Git synchronization.
- GitHub API commits or file updates that create commits.
- Creating or pushing branches through external tools; PR merging.
- Running scripts or tools that indirectly perform prohibited Git operations.
- Deleting, replacing, or rewriting Git history.
- Changing remote Git configuration without authorization.
- Modifying Git hooks or automation to enable commits or pushes.
- Allowing another agent or subagent to perform these operations on behalf of the main agent.

These restrictions apply even when an implementation is completed, all tests pass, the working tree contains many changes, a task requests finalization or delivery, a tool offers automatic commit or synchronization, the agent believes committing would be convenient, or an earlier workflow or generic instruction suggests committing. **Task completion is never permission to commit or push.**

Allowed read-only inspection: `git status --short`, `git diff`, `git diff --check`, `git log`, `git show`, `git branch --show-current`, `git rev-parse HEAD`. Other commands only when clearly read-only and safe. Do not automatically run `git fetch` or `git pull`.

If a requested action would require an agent-performed commit, push, merge, branch switch, or destructive Git operation, STOP and explain what the project owner must perform manually. If another instruction conflicts with this policy, do not perform the conflicting operation; escalate to the project owner.

At the end of every implementation task, report the modified files and validation results, then STOP. Include the exact declaration:

**"No Git staging, commit, push, merge, reset, or deployment was performed. All Git commits and pushes are reserved for the project owner."**

An earlier unexplained commit/push on `develop` reinforced this policy. Never treat any historical commit as a required HEAD.

---

## 1. Project Identity and Repository Verification

- Official name: **AFHomes Platform**. Company-facing UI spelling: **AFhomes**. Repository: `afhomes-platform`. Expected branch: `develop`. Reported remote: `https://github.com/orlando-afhomes/afhomes-platform.git` (verify, do not assume).
- This is a new standalone application. Do not confuse it with the older Supabase-based AFHomes app, `ClaudAfhomes/AFhomes-ecofarm-v2`, the earlier MongoDB conversion experiment, or the older `claud/develop`, `claud/clean-develop`, `orly/develop` branches. Do not use an older repository as an implementation source without explicit owner authorization.
- Do not introduce V1/V2/V3/2.0 into application branding or canonical business-rule titles. Technical API versioning such as `/api/v1` is allowed.
- Before authorized file changes, verify `pwd`, `git branch --show-current`, `git status --short`. If the directory or branch is unexpected, STOP and report.
- Preserve existing tracked and untracked files. Never delete, overwrite, or discard unrelated user work.

---

## 2. Authoritative Documentation

Read the relevant documents before implementation; do not load all of them by default.

- Master context: `docs/project.md`.
- Business rules `docs/business-rules/`: `01-roles-and-permissions`, `02-sales-network-and-genealogy`, `03-ist-ost-accreditation`, `04-customer-management`, `05-vip-products-and-contracts`, `06-vip-card-issuance`, `07-finance-and-payments`, `08-commission-management`, `09-vip-membership-and-stay-points`, `10-redemption`, `11-reports-and-analytics`, `12-audit-logs-and-governance`, `13-sales-performance-reporting`.
- Development specs `docs/development/`: `README`, `architecture`, `frontend`, `database`, `backend`, `security`, `testing`, `implementation`, `deployment`.

Precedence: (1) latest verified explicit project-owner instructions, (2) canonical business-rule documents, (3) approved architecture/development specifications, (4) master project context, (5) verified historical material. The Git policy above overrides all of these as an agent-operation restriction.

Business rules are authoritative for business behavior. `AGENTS.md` must not become a competing source of business truth, and must not duplicate authoritative documents. The session snapshot in `workflow/save-session.md` (restored with `/load`) is a progress reference only, not authority over governing documents or code.

Some documentation is stale: claims of "documentation-only", CSS Modules as approved, Ant Design as the permanent or target UI foundation, or a specific current phase. Verify against the actual code and `package.json`; section 8 of this file governs the UI stack.

If documents conflict, report the exact files and sections, the conflicting requirements, the affected module, severity, whether it blocks the current task, and a recommended clarification. Never invent missing financial, legal, or security policies.

---

## 3. Architecture

Single Next.js application: **Panel-Based + Feature-Based Modular Monolith**. Verify actual versions from `package.json`.

| Layer | Technology |
|---|---|
| Framework | Next.js App Router, React, TypeScript |
| UI | shadcn/ui on Base UI primitives + Tailwind CSS 4 + namespaced custom CSS; TanStack Table; Lucide. Ant Design 6 only in unmigrated modules (see section 8) |
| Validation | Zod (installed; target for contracts and forms) |
| Frontend async state | TanStack Query |
| Tests | Vitest + Testing Library |
| REST API (future) | `/api/v1` via Next.js Route Handlers |
| Authentication (future) | Better Auth, subject to compatibility verification |
| Authorization | Centralized RBAC plus record-level restrictions |
| Database (future) | Mongoose; local MongoDB first, MongoDB Atlas later |
| Hosting (future) | DigitalOcean Droplet, Docker Compose, HTTPS |

Do not introduce a separate Express or NestJS backend, microservices, separate frontend/backend repositories, Kubernetes, Turborepo, unnecessary distributed infrastructure, or DigitalOcean App Platform as the default.

Source layout: `src/app/` (routes, layouts), `src/panels/` (panel UI), `src/modules/` (domain contracts, validation, rules), `src/data/` (typed contracts and mock/HTTP adapters), `src/shared/` (composed shared components, forms, hooks, providers, utilities; `src/shared/ui/` for reusable shadcn/ui primitives), `src/theme/` (design tokens; Ant Design theme until removal). `src/server/` and `src/config/` are planned and may not exist yet. Do not restructure existing files unnecessarily, generate empty files or directories in advance, or create files outside the authorized task.

Panels: Public (website, public accreditation verification, Customer Lookup, login entry) and Admin/Operations (Super Administrator, Administrator, HR, Finance, authorized staff, sales network). Sales hierarchy: **SVD → SSM → SM → OST**. OST must not receive unrestricted team-wide access. A Customer Portal and React Native/Expo app are future capabilities and must not be implemented without separate authorization. Business logic must not be duplicated across panels.

---

## 4. Frontend-First Development Policy

Frontend-first development is approved. Backend, real authentication, databases, migrations, infrastructure, and deployment require separate explicit authorization.

During the mock phase: use centralized, typed, browser-scoped in-memory mock data; synthetic records only; consistent relationships; typed repository contracts; authorized mock CRUD and lifecycle transitions; simulated loading and errors; development identity switching kept separate from production authentication.

**Mock business data exists in browser-scoped memory only.** A full browser refresh must restore the original seed data. Do NOT persist mock business records in localStorage, IndexedDB, persistent mock databases, or server-side singleton stores shared between users. Use TanStack Query consistently. Clear or isolate permission-sensitive query caches when changing development identities; data from one mock identity must never appear under another. Mock login is never a production authorization mechanism. Components must migrate from typed mock adapters to real HTTP adapters without rewrites.

Backend (when authorized): thin Route Handlers, centralized domain services, typed contracts, Zod validation, centralized authorization with record-level filtering, server-only Mongoose access, safe structured errors, idempotency, concurrency control, and audit logging for sensitive operations. Frontend navigation restrictions never substitute for backend authorization. All MongoDB access stays server-side; critical multi-document operations need transactions on an appropriate deployment (replica set). Never run unauthorized database resets or migrations. Do not auto-migrate data from the previous Supabase system. Synthetic mock data is not production data.

---

## 5. Critical Business Invariants

Summary only; canonical documents govern. Never assume module visibility grants authority for sensitive operations.

- **Roles (01):** centralized RBAC; multiple active roles where authorized; module permissions plus record-level scopes; protected Super Administrator; account-status restrictions; auditable role/access changes.
- **Network (02):** canonical SVD/SSM/SM/OST hierarchy; validate sponsor/parent links; prevent cycles; role-dependent upline/downline visibility; preserve historical sale attribution.
- **Accreditation (03):** AAI = IST, AAO = OST; follow approved creation, sponsorship, approval, renewal, suspension, expiry rules. Public verification: exact identifier search, restricted fields; IST shows no "Valid Until"; OST shows applicable "Valid Until".
- **Customers (04):** customer identity and RA identifiers are distinct unless canon reconciles them; keep draft versus submitted distinct; validate imports and prevent duplicates; public lookup never exposes unrestricted records and only covers eligible Active VIP Memberships.
- **Products/contracts (05):** tiers Bronze B1, Silver S1, Gold G1; configuration changes never rewrite finalized contracts; do not activate unapproved tier codes or schemes; never fabricate prices or terms.
- **Card issuance (06):** follow official Card ID and RA allocation rules; documented format `YYMMDDNNNNNVTPMMS`; prevent duplicates; preserve issued numbers; no competing serial allocator.
- **Finance (07):** distinct states: payment submitted, Finance-verified, contract finalized, sale confirmed, fully paid, membership officially activated. Only authorized Finance actors verify receipts. Finance verification never auto-activates membership. Reversals preserve traceable history.
- **Commissions (08):** follow recipient eligibility and historical genealogy; Finance controls percentages, approvals, payouts; approved is not Paid, only confirmed disbursement is Paid; invent no universal percentages; prevent duplicate payouts.
- **Membership/Stay Points (09):** approved activation lifecycle; ledger-controlled points; Spend-to-Earn from qualifying Finance-verified resort spending with approved caps; 70% weekday / 30% weekend principle; preserve contractual benefits; prevent duplicate or invalid credits.
- **Redemption (10) and Services:** **currently disabled.** Preserve documented future architecture. Do not activate routes, APIs, backend operations, or navigation without separate authorization. Hiding navigation alone is insufficient once backend routes exist.
- **Reporting (11, 13):** authoritative source records, correct business event dates, historical attribution, no double-counting, role-based access, approved date filters.
- **Audit (12):** centralized, logically append-only history for sensitive actions; never log credentials or unnecessary sensitive data; preserve corrections; invent no retention durations.

### Unresolved decisions

Do not silently resolve these during development; verify canonical documents before treating a historical blocker as open or closed:

- Gold price (₱390,000 vs ₱780,000); unfinished Silver contractual amount; Non-Standard contract authorization; Move A/B1/B2 commercial terms.
- RA numbering scope and uniqueness; Card Claim Date versus Activation Date validity start.
- Accreditation expiry/access cutoff interpretation.
- Module-level versus operation-level permission policy (doc 01 versus operation grants in code; `docs/development/role-module-permission-matrix-proposal.md` is only partially approved).
- Better Auth/MongoDB compatibility; Atlas transaction capability for target tier; formal audit retention; production domain, sizing, and providers.

Unresolved commercial or infrastructure decisions do not automatically block independent frontend work.

---

## 6. Financial, Date, and Privacy Safety

- Philippine business context: use Asia/Manila business-date semantics; avoid timezone shifts for date-only fields.
- No uncontrolled JavaScript floating-point for authoritative money; follow the approved exact-money and rounding specifications.
- Keep sensitive documents and payment evidence out of unrestricted public locations. Prevent unnecessary personal-information exposure.
- Never reveal database credentials, authentication secrets, private tokens, government IDs, private financial details, or unapproved customer information.

---

## 7. Workflow, Authorization, and Testing

Every implementation milestone, task, phase, or feature requires explicit project-owner authorization before work begins. Documentation, a roadmap, planning, or prior verification is not authorization. Do not begin any phase, subphase, or feature automatically, silently expand scope, implement later phases, activate disabled modules, provision infrastructure, or perform Git operations. The phase sequence is in `docs/development/implementation.md`; check the session snapshot (`/load`, `workflow/save-session.md`) and the code for current progress. `AGENTS.md` may be changed only when the owner authorizes it.

For every authorized task:

1. Confirm repository and branch; inspect the working tree.
2. Read relevant authoritative documents; determine boundaries, dependencies, and blockers.
3. Implement only authorized changes; preserve behavior outside the task. Never change approved business rules as a side effect or substitute an unapproved architecture.
4. Run appropriate tests; inspect changed files for regressions.
5. Produce the final report, then STOP.

When a requirement is ambiguous, distinguish a blocker for the current task, an issue affecting only a later module, and a nonblocking improvement.

Testing follows `docs/development/testing.md` (TypeScript, ESLint, build, component, unit, integration, API, security, transaction, end-to-end, accessibility, regression). Do not claim tests passed unless they ran. Do not claim browser visual verification from compilation alone. For financial operations verify idempotency, duplicate prevention, concurrency, reversal handling, reconciliation, and audit integrity. Use isolated test data; never erase ordinary developer records.

---

## 8. UI Standards

**Production UI:** application-facing screens must not show developer notes, debug controls, temporary design-preview links, milestone labels, mock diagnostics, or internal commentary. Development-only tooling stays isolated and unavailable in production builds. Every visible control must serve a legitimate purpose; incomplete functionality is represented honestly.

### Official Frontend UI Architecture (owner decision, effective November 8, 2026)

The approved UI foundation is **shadcn/ui on Base UI primitives, Tailwind CSS 4, and namespaced custom CSS**. TanStack Table is approved for advanced directories and Lucide is the standard icon library. This supersedes the previous Ant Design-first policy. It does not authorize any migration milestone by itself.

**Component architecture**

1. `src/shared/ui/` holds reusable shadcn/ui primitives. `src/shared/` holds composed shared components, forms, hooks, and utilities. Feature interfaces stay in `src/panels/`; business rules stay in `src/modules/`; repository contracts stay in `src/data/`.
2. Preserve existing Zod validation and the TanStack Query architecture.
3. Compose existing primitives first; build a new primitive only when none can be composed, and document the reason. No raw custom interactive controls where a suitable primitive exists.
4. Do not introduce another competing component system, CSS Modules, or new project-authored CSS-in-JS.
5. Accessibility and responsiveness are mandatory: semantic HTML, keyboard navigation, visible focus, labels, dialog focus management, contrast, reduced motion, and appropriate loading, empty, and error states.

**Styling standards**

1. Use Tailwind CSS 4 utilities for layout, spacing, typography, and component styling; use regular CSS for specialized or complex presentation.
2. `class-variance-authority`, `clsx`, and `tailwind-merge` are permitted as supporting utilities.
3. Preserve the design tokens in `src/theme/tokens.css` and the existing brand palette until the owner approves a visual redesign. Add new tokens there; do not inline them.

**Temporary Ant Design coexistence**

1. Ant Design 6 is deprecated as the target. It may remain only in existing modules until their approved migration milestones.
2. No new Ant Design usage is authorized: do not introduce it into new or already migrated modules.
3. Existing Ant Design CSS-in-JS internals are permitted until migration is complete.
4. Protect unmigrated Ant Design interfaces from Tailwind reset and styling conflicts (cascade layers or scoping defined in the authorized milestone).
5. Remove Ant Design dependencies, theme files, and styling only after all affected modules are migrated and verified, and the owner approves.

**Migration requirements**

1. Each migration milestone requires explicit project-owner approval; do not migrate unrelated modules inside another milestone.
2. Preserve CRUD behavior, validation, permissions, business rules, and repository contracts.
3. Verify affected tests, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and browser workflows before declaring a module migrated.
4. Backend, database, infrastructure, and deployment work still require separate authorization.
5. Production UI standards above apply to every migrated screen.

**Class naming.** All developer-authored custom (non-utility) classes use descriptive kebab-case, feature-namespaced names (e.g. `account-page__toolbar`). Tailwind utility classes, Ant Design internals (until removal), and React Fragments are exempt.

1. Prefer plain string classes. Never use numbered/random names (`div1`, `box2`) or bare generic names (`wrapper`, `container`, `title`).
2. Remove unnecessary wrappers instead of naming them.
3. Shared components (`PageContainer`, `PageHeader`) forward `className`.
4. Never target hashed Ant Design classes; use theme tokens, component props, or narrow documented overrides. Move long, repeated utility strings into a shared component or a namespaced class.
5. Feature CSS lives beside its feature and is imported at the narrowest server route/layout boundary; root CSS keeps tokens, resets, and base only. Global styles persist across navigation: namespace everything, avoid order-dependent overrides.
6. Verify class names in browser DevTools; compliance is checked in review and browser DOM.

---

## 9. Required Agent Reporting Format

Every completed implementation task reports:

- **A. Task Summary:** what was implemented and why.
- **B. Files Changed:** created, modified, deleted.
- **C. Business-Rule Compliance:** relevant canonical documents and unresolved differences.
- **D. Technical Verification:** commands executed and actual results.
- **E. Security and Data Safety:** confirm no unauthorized access, persistence, or secret exposure.
- **F. Known Limitations:** unfinished work, blockers, deferred improvements.
- **G. Git Status:** current branch, initial HEAD, ending HEAD, working-tree state.
- **H. Unauthorized Operations Check:** whether any Git or infrastructure operation occurred unexpectedly.
- **I. Final STOP Declaration:** end with exactly:

**"Implementation completed within the authorized scope. No Git staging, commit, push, merge, reset, or deployment was performed. All Git commits and pushes are reserved for the project owner. STOP — awaiting further instructions."**

If any prohibited action occurred unexpectedly, disclose it instead of claiming compliance.

---

`AGENTS.md` is itself subject to the absolute Git policy.

**ABSOLUTE FINAL RULE: Do not execute `git add`, `git commit`, or `git push` under any circumstances. The project owner exclusively performs these manually.**
