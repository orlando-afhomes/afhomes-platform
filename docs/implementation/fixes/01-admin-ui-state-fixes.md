# 01 Admin UI State Fixes

Source: `docs/implementation/prototype/admin-ui-state-audit.md` (route matrix and "Phase 2 batch order"). 25 routes are Partial. Each batch needs its own approved plan. Do not mix batches in one change set.

## Shared fixes (do once, reuse everywhere)

| ID | Problem | Fix | Where |
|---|---|---|---|
| S1 | 14 `DataTable` pages show a failed request as an empty table | Wrap in `QueryState` (loading, error, empty) and pass `onRetry` | Each panel under `src/panels/admin/pages/` |
| S2 | `ContractPageFrame` has no error branch, so a failed load reads "Contract Not Found" | Add an error branch with a retry button; keep not-found only for a successful query with no record | The shared `ContractPageFrame` component (find with `Grep ContractPageFrame`) |
| S3 | Four buttons are `disabled` only: Save Review, Close Month, Activate, Export | Use `Button loading`, set `aria-busy`, and keep the double-submit guard | Allowances page, period-close tab, membership table, report export trigger |
| S4 | No admin page passes `QueryState onRetry` | Pass it only where a retry is safe (a rejected repository call, not a validation failure) | All S1 pages |
| S5 | One empty text for "no records" and "no match" | Two wordings | `/admin/customers`, `/admin/sales/contracts`, `/admin/finance/collections` |
| S6 | `useActionRunner` unused in admin | Decide: adopt it or document that admin uses `useConfirmRun` | Record the decision in `docs/development/frontend.md` |

## Batch 1: Finance, payments, commissions, membership (money and status)

| Route | Work |
|---|---|
| `/admin/commissions/allowances` | S3: Save Review busy state |
| `/admin/membership`, `/admin/membership/activation` | S3: Activate pending state in the row menu and details footer; block double-click |
| `/admin/finance/cancellations/[id]`, `/admin/finance/collections/[id]` | S2 |
| Regression check only | `/admin/reports/reconciliation`, `/admin/finance`, `/admin/finance/collections`, `/admin/finance/cancellations` |

Tests: `membership-area-page.test.tsx`, `contract-detail-pages.test.tsx`, `business-pages.test.tsx`. Add a case per fix: forced rejection shows `role="alert"` and a retry; double-click sends one request.

## Batch 2: Customer and sales records (PII, attribution)

| Route | Work |
|---|---|
| `/admin/customers/[id]` | Surface `customers.error`; never show a failed query as not found |
| `/admin/customers/[id]/edit` | Error branch before the wizard mounts |
| `/admin/sales/contracts/[id]` | S2 |
| `/admin/sales-network`, `/members`, `/registrations` | S1 |
| `/admin/sales-network/members/[id]` | Surface member and accreditation query errors |
| `/admin/sales-network/genealogy` | Error branch beside the tree skeleton |
| `/admin/customers` | S5 |

Tests: `customer-review-pages.test.tsx`, `sales-network-pages.test.tsx`, `sales-network-member-detail-page.test.tsx`, `registration-applications-page.test.tsx`.

## Batch 3: Reports, audit logs, period close

| Route | Work |
|---|---|
| `/admin/reports/period-close` | S3: Close Month busy state and guard. Highest risk (irreversible); pull into Batch 1 only with owner approval |
| `/admin/reports` and every `/admin/reports/*` | S3: Export spinner, or keep it disabled and record that choice |
| `/admin/audit-logs`, `/admin/reports/historical-import` | Regression check after shared changes |

Tests: `reports-pages.test.tsx`, `audit-logs-page.test.tsx`, `reconciliation-import-pages.test.tsx`.

## Batch 4: Organization, staff, settings

| Route | Work |
|---|---|
| `/admin/organization`, `/staff`, `/departments`, `/roles` | S1 |
| `/admin/settings/lists`, `/admin/vip-products` (Lists tab) | S1; fix once in `ListsPage` |
| `/admin/vip-products/scheme-guide` | Empty state for "no payment plans configured" |
| `/admin/account` | Surface the profile query error |
| `/admin/promos`, `/admin/promos/points` (and Stay Points tabs) | S1 |

Tests: `staff-page.test.tsx`, `departments-page.test.tsx`, `roles-page.test.tsx`, `lists-page.test.tsx`, `my-account-page.test.tsx`, `promo-pages.test.tsx`.

## Acceptance (every batch)

The five browser checks in the audit: slow network skeleton, empty state, forced query error with retry, double-click sends one request, reduced motion. Dialogs keep Cancel disabled while pending. No new Ant Design, CSS Modules or other component system (AGENTS.md section 8).
