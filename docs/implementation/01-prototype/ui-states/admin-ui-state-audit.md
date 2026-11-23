# Admin UI State Audit

- Phase: FP15 (audit only; no admin source changes).
- Status: Complete.
- Scope: every `src/app/admin/**/page.tsx` route, its rendering panel, and the shared state primitives.
- Depends on: FP12 shared state contract and components.
- Authorizes: nothing. Every fix listed here needs a separate approved Phase 2 plan.

## Purpose

Record, with code evidence, how each admin route handles four states: loading, empty, error and pending (busy). The owner chose an audit-first approach so that dozens of screens are not changed blindly. This document produces evidence, not code.

## Method

Routes were enumerated read-only:

```powershell
Get-ChildItem -Path src/app/admin -Recurse -Filter page.tsx |
  ForEach-Object { $_.FullName.Replace((Get-Location).Path + '\src\app\', '').Replace('\page.tsx', '') }
```

Result: **62 admin page files**. Every page file is a thin route shell. Each one either renders a panel from `src/panels/admin/pages/` or performs a server redirect. Redirect pages were traced to their target tab, and the target panel was inspected, because the target owns the four states.

States were checked in the actual source of the page, panel, dialog and shared component, not inferred from a wrapper's existence.

## Verdict legend

| Verdict | Meaning |
|---|---|
| Complete | All four states are covered by code. A read-only surface with no mutating action counts as busy-covered (nothing can be submitted twice). |
| Partial | At least one state is missing. The Gap column names it and the Notes column names the risk. |
| Redirect | Server redirect only. It renders no data and owns no states; the target route or tab does. |
| Static | Transitional or explanatory screen without a data query. |

## Shared primitives (checked before any page was marked Complete)

| Primitive | Evidence in code | What it provides |
|---|---|---|
| `DataTable` (`src/shared/components/modern/data-table.tsx`) | `loading` renders 5 skeleton rows and sets `aria-busy` on the table (lines 131, 152-166); no rows renders one `colSpan` row with `emptyText` (lines 167-172). | Loading skeleton, empty row, accessible busy flag. It has no error branch. |
| `QueryState` (`src/shared/components/modern/query-state.tsx`) | Loading returns `role="status"` + `aria-busy` + `TableSkeleton` (or a caller skeleton); error delegates to `ErrorState` and forwards `onRetry` when retrying is safe (lines 24-35). | Page-level loading and load-error, any skeleton shape, optional retry. |
| `ErrorState` (`src/shared/components/modern/error-state.tsx`) | `role="alert"`, a title and text, and a Retry button only when `onRetry` is passed (lines 25-47). | Accessible failed-load block. |
| `EmptyState` (`src/shared/components/modern/empty-state.tsx`) | Title, optional text, icon and action; distinguishes "nothing yet" from "no matches" by wording (lines 9-43). | Rich empty block. Available but not used by any admin panel; admin relies on `DataTable`'s empty row. |
| `Button loading` (`src/shared/ui/button.tsx`) | `loading` sets `disabled`, `focusableWhenDisabled`, `aria-busy`, and renders `Spinner` while keeping the label (lines 88-99). | Pending state with no label jump. |
| `Spinner` (`src/shared/ui/spinner.tsx`) | `tw:animate-spin tw:motion-reduce:animate-none` (line 12). | Reduced-motion safe. |
| `Skeleton` (`src/shared/ui/skeleton.tsx`, `src/app/globals.css`) | `.ui-skeleton` shimmer; the global `prefers-reduced-motion` block collapses all animations to 0.01 ms (globals.css lines 86-96). | Reduced-motion safe shimmer. |
| `FormDialog` (`src/shared/components/modern/form-dialog.tsx`) | `pending` disables Cancel, shows the submit spinner, and blocks closing while pending (lines 44, 73-78). Inline `role="alert"` for the error (lines 67-71). | Dialog busy and inline error. |
| `useActionRunner` (`src/shared/components/modern/use-action-runner.tsx`) | Success and error toasts, returns a boolean. | Action feedback only. A toast is not a page error state. Not used by any admin panel today. |
| `useConfirmRun` (`src/shared/components/modern/use-confirm-run.tsx`) | Passes `pending` to `ConfirmDialog` while the action runs (lines 38-65). | Busy state for confirmation flows. |
| `RowActionsMenu` (`src/shared/components/modern/row-actions-menu.tsx`) | Delete confirmation carries its own `pending` (lines 137-150, 225). | Busy state for row deletes. |
| `AdminShellSkeleton` (`src/shared/components/modern/skeletons.tsx`, `src/app/admin/layout.tsx`) | Used as the `Suspense` fallback for the whole admin section (layout lines 14-21): `role="status"`, sidebar, header, cards, table. | First paint is never blank. |
| `ReportExport` (`src/panels/admin/components/report-shell.tsx`) | `disabled={busy}` while the audited export runs (line 126). | Disabled only; no spinner. |
| `AdminStatCard` | Accepts `loading` and `error` and renders its own skeleton/error in KPI rows. | Dashboard and report headline states. |

## Route matrix

Row count must equal the route count: **62**.

| # | Route | Surface | Loading | Empty | Error | Busy | Gap | Priority | Verdict | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `/admin` | Dashboard | KPI and chart skeletons (`DashboardKpiCard`, `DashboardTrendChart`) | `DashboardEmptyState`, card `emptyText`, "No Dashboard Metrics" note | `DashboardError` through each card's `error` | N/A (read-only) | None | High | Complete | Resolves Admin, Finance, Sales or Clerk layout by identity; restricted identity sees an access header, not data. |
| 2 | `/admin/account` | Form | `FormSkeleton` | "No linked staff or account record" card | None (`useMyProfile().error` ignored; save failures toast) | `Button loading` + `ConfirmDialog pending` | No in-page error when the profile query fails, so a failure looks like a profile that never arrives. | Medium | Partial | Self-service only; department, role and status are read-only. |
| 3 | `/admin/accounts` | Static | None (heading while `router.replace` runs) | N/A | N/A | N/A | None: transitional compatibility screen, not a data surface. | Low | Static | Forwards to `/admin/organization?tab=staff&view=account`; non-holders see Access Restricted. |
| 4 | `/admin/audit-logs` | Table | `QueryState` | "No audit events match." | `QueryState` alert | N/A (append-only, read-only) | None | Medium | Complete | Server pagination; every filter change resets to page 1. |
| 5 | `/admin/commissions` | Table (tabs) | `QueryState` | "No commissions yet." / "No commissions match the filters." | `QueryState` | `FormDialog` and `ReasonDialog` pending; `confirmRun` pending | None | High | Complete | Tabs: commissions, recovery, rates, allowances. Payout bar buttons only open dialogs. |
| 6 | `/admin/commissions/allowances` | Form + table | `QueryState` on saved reviews | "No reviews saved." | `QueryState` for history; form errors inline `role="alert"` | `Save Review` is `disabled` only, with no spinner and no `aria-busy` | Save Review gives no busy signal while the allowance is being written. | High | Partial | Money calculation; allowance terms depend on the leader's position. |
| 7 | `/admin/commissions/assignment` | Table + dialog | `QueryState` | "No approved rates recorded." / "No rates match the filters." | `QueryState` + `FormDialog` inline error | `FormDialog pending` | None | High | Complete | Deep link `?tab=rates&sale=&role=`; a saved rate applies to future issuances only. |
| 8 | `/admin/commissions/payouts` | Redirect | Target | Target | Target | Target | None: server redirect, no UI of its own. | High | Redirect | To `/admin/commissions?tab=commissions` (payout bar merged into the tab). |
| 9 | `/admin/customer-lookup` | Detail (search) | `TextLinesSkeleton` inside `role="status"` | "No active VIP customer found." | Inline `role="alert"` ("Customer Look Up is unavailable right now.") | Debounced search; the action dialogs carry their own pending | None | Medium | Complete | Staff-only. Stay Points and Promo Points sub-blocks each show their own loading/error text. |
| 10 | `/admin/customers` | Table (tabs) | `AdminStatCard loading` + `QueryState` | "No customers match." | `QueryState` | `ConfirmDialog`, `ReasonDialog`, `PrepareContractDialog` and row delete all pending | None | High | Complete | `?tab=lookup` redirects to `/admin/customer-lookup`. One empty text ("No customers match.") does not separate "no customers" from "no filter match"; quality note only. |
| 11 | `/admin/customers/[id]` | Detail | `DetailSkeleton` | Not-found `InfoNote` | None (`customers.error` ignored) | `ConfirmDialog` and `ReasonDialog` pending | A failed customer query is rendered as "Customer Not Found". | High | Partial | Restricted records mask PII; the audit tab silently hides when its query errors. |
| 12 | `/admin/customers/[id]/edit` | Wizard | `FormSkeleton` | Not-found `InfoNote` | None for the initial load (field errors and submit errors exist later) | Save and Submit use `Button loading` and disable while busy | No error branch before the wizard mounts. | Medium | Partial | Correcting a submitted customer requires a reason. |
| 13 | `/admin/customers/import-export` | Wizard (import) | Dropzone `reading`, export card `loading`, `QueryState` for job history | "No imports yet." / "The file has no data rows." | `QueryState`; inline file error; action failures toast | Import and Export use `Button loading` | None | Medium | Complete | Administrator-only (`customers.import`); import creates drafts. |
| 14 | `/admin/customers/new` | Wizard | None needed (no initial query) | N/A (blank form) | Field errors plus the review-step error list | Save and Submit use `Button loading` and disable while busy | None | Medium | Complete | Product cards have their own skeleton while the catalog loads. |
| 15 | `/admin/finance` | Table (tabs) | `AdminStatCard loading` + `QueryState` | Four filter-specific texts (all, waiting, exceptions) | `QueryState` | `FormDialog` and `ReasonDialog` pending; row delete pending | None | High | Complete | Receipt verification; queue is sorted oldest first. |
| 16 | `/admin/finance/cancellations` | Table (tabs) | `QueryState` | "No cancellation is awaiting confirmation." / "No requests match the filters." | `QueryState` | N/A (a row opens the detail page) | None | High | Complete | Finance decides on the detail page, never in the list. |
| 17 | `/admin/finance/cancellations/[id]` | Detail | `DetailSkeleton` via `ContractPageFrame` | "No Cancellation Request" note | None (`ContractPageFrame` has no error branch) | Dialog `pending` | A failed contract query is presented as "Contract Not Found". | High | Partial | Forfeiture amounts; the requester cannot decide their own request. |
| 18 | `/admin/finance/collections` | Table (tabs) | `QueryState` | "No contracts match." | `QueryState` | N/A (Open Contract navigates) | None | High | Complete | Receivables; includes Non-Standard terms waiting for Finance. |
| 19 | `/admin/finance/collections/[id]` | Detail | `DetailSkeleton` via `ContractPageFrame` | "Contract Not Found" note | None | `FormDialog` and `confirmRun` pending | A failed contract query is presented as "Contract Not Found". | High | Partial | Confirm Non-Standard Terms and Send Back live here. |
| 20 | `/admin/finance/contracts/[id]` | Redirect | — | — | — | — | None: server redirect. | Medium | Redirect | To `/admin/finance/collections/{id}`. |
| 21 | `/admin/finance/holds` | Redirect | — | — | — | — | None: server redirect. | Medium | Redirect | To `/admin/finance?tab=collections`. |
| 22 | `/admin/finance/payments` | Redirect | — | — | — | — | None: server redirect. | High | Redirect | To `/admin/finance?tab=verification&show=all`. |
| 23 | `/admin/membership` | Table (tabs) | `QueryState` | "No memberships are available." | `QueryState` | Activate runs `mutateAsync` with no pending state | Activate can be double-clicked and shows no spinner. | High | Partial | Activation changes contractual status and is audited. |
| 24 | `/admin/membership/activation` | Table (tabs) | `QueryState` | "No memberships are waiting for activation." | `QueryState` | Same Activate gap | Activate can be double-clicked and shows no spinner. | High | Partial | Pending-only queue; blockers are listed in the details sheet. |
| 25 | `/admin/organization` | Table (tabs) | `DataTable loading` | "No staff or accounts found." / "No pending accounts." | None (five queries' errors are ignored) | Dialogs pending; `confirmRun` pending | No error state; a failed directory query is indistinguishable from an empty table. | Medium | Partial | Default tab is Staff & Access. |
| 26 | `/admin/organization/departments` | Table (tabs) | `DataTable loading` | "No departments found." | None | Form dialog pending; delete pending | No error state. | Medium | Partial | Counts are hidden on narrow screens. |
| 27 | `/admin/organization/roles` | Table (tabs) | `DataTable loading` | "No roles found." | None | Form dialog pending; delete pending | No error state. | Medium | Partial | Protected roles show a badge and no actions. |
| 28 | `/admin/organization/staff` | Table (tabs) | `DataTable loading` | "No staff or accounts found." | None | Dialogs and `confirmRun` pending | No error state. | Medium | Partial | Account columns appear only with the accounts grant. |
| 29 | `/admin/promos` | Table (redirect to `/admin/stay-points?tab=promos`) | `DataTable loading` | "No promos found." | None (`promos` and `outlets` errors ignored) | `FormDialog` and `confirmRun` pending | No error state. | Medium | Partial | Points-earning rule; ending a promo keeps points already earned. |
| 30 | `/admin/promos/points` | Table (redirect to `/admin/stay-points?tab=promo-points`) | `DataTable loading` | "No Promo Points entries yet." | None | `ReasonDialog` and `confirmRun` pending | No error state. | Medium | Partial | Voiding a use returns the points to the member. |
| 31 | `/admin/redemption` | Table (tabs) | `QueryState` | "No bookings yet." / "No activated memberships." | `QueryState` | `FormDialog` pending; `confirmRun` pending | None | High | Complete | The staff Redemption prototype is authorized (2026-11-17); live Redemption and customer submissions remain separately unauthorized. Do not remove the route without owner instruction. |
| 32 | `/admin/redemption/points-table` | Table (redirect to `/admin/vip-products?tab=points-table`) | `QueryState` | "No points tables yet." / "No rows." | `QueryState` | Config dialogs and `ReasonDialog` pending | None | Medium | Complete | A new table applies only to cards claimed on or after its start date. |
| 33 | `/admin/reports` | Dashboard hub | Per-card `Skeleton` | Per-card "No comparison available" | Per-card error text | N/A | None | Medium | Complete | One shared date range across report tabs. |
| 34 | `/admin/reports/collections` | Report | `AdminStatCard loading` + `ReportTable` `QueryState` | "No collections match." | `QueryState` | Export is `disabled` while busy | None (Export is disabled while busy; no spinner) | Medium | Complete | Needs `finance.reports.view`. |
| 35 | `/admin/reports/commissions` | Report | Same report shell | "No commissions match." | `QueryState` | Export is `disabled` while busy | None (Export is disabled while busy; no spinner) | Medium | Complete | Approved is not Paid; paid uses confirmed disbursement only. |
| 36 | `/admin/reports/customer-growth` | Report | Same report shell | "No customers match." | `QueryState` | Export is `disabled` while busy | None (Export is disabled while busy; no spinner) | Low | Complete | Counts customers created in the range. |
| 37 | `/admin/reports/historical-import` | Wizard + table (redirect to `/admin/vip-products?tab=historical-import`) | `QueryState`; dropzone `reading` | "No import batch yet." | `QueryState`; inline file error; action failures toast | Create Batch `Button loading`; dialog pending; `confirmRun` | None | High | Complete | Administrator-only; a batch counts only after sign-off. |
| 38 | `/admin/reports/membership` | Report | Same report shell | "No memberships match." | `QueryState` | Export is `disabled` while busy | None (Export is disabled while busy; no spinner) | Medium | Complete | Activation dates drive the period. |
| 39 | `/admin/reports/period-close` | Table (redirect to `/admin/finance?tab=month-end-close`) | `QueryState` | "No months have been closed." | `QueryState` | Close Month is `disabled` only | Closing a month shows no spinner and no `aria-busy`. | High | Partial | Irreversible lock of monthly totals; month already closed is also disabled. |
| 40 | `/admin/reports/promo-points` | Report | Same report shell | "No Promo Points entries match." | `QueryState` | Export is `disabled` while busy | None (Export is disabled while busy; no spinner) | Low | Complete | Ledger-based; voids restored. |
| 41 | `/admin/reports/reconciliation` | Table (redirect to `/admin/finance?tab=reconciliation`) | `QueryState` | "Nothing to check for this month." / "No decision has been recorded for this month." | `QueryState` | `FormDialog pending` | None | High | Complete | Differences must be explained, never hidden; decisions go stale when totals move. |
| 42 | `/admin/reports/sales-performance` | Report | Same report shell | "No sales match." | `QueryState` | Export is `disabled` while busy | None (Export is disabled while busy; no spinner) | Medium | Complete | VIP and IGP sales combined; period uses closed-deal dates. |
| 43 | `/admin/reports/stay-points` | Report | Same report shell | "No point entries match." | `QueryState` | Export is `disabled` while busy | None (Export is disabled while busy; no spinner) | Medium | Complete | Gift ledger and balances are separate queries. |
| 44 | `/admin/sales` | Table (tabs) | `QueryState` | "No sales match." | `QueryState` | `confirmRun`; correction dialog pending | None | High | Complete | Scope selector; commission correction is audited and reason-based. |
| 45 | `/admin/sales/contract-review` | Redirect | — | — | — | — | None: server redirect. | High | Redirect | To `/admin/sales?tab=contracts&status=needs-review`. |
| 46 | `/admin/sales/contract-review/[id]` | Redirect | — | — | — | — | None: server redirect. | Medium | Redirect | To `/admin/sales/contracts/{id}`. |
| 47 | `/admin/sales/contracts` | Table (tabs) | `QueryState` | "No contracts match." | `QueryState` | Dialogs and `confirmRun` pending | None | High | Complete | Needs-review and waiting-finance filters; Non-Standard approval path. |
| 48 | `/admin/sales/contracts/[id]` | Detail | `DetailSkeleton` via `ContractPageFrame` | "Contract Not Found" note | None | Dialogs and `confirmRun` pending | A failed contract query is presented as "Contract Not Found". | High | Partial | VIP Number, commission rates and cancellation decisions converge here. |
| 49 | `/admin/sales/igp` | Table (tabs) | `QueryState` | "No property sales (IGP) are available." / no-match text | `QueryState`; the receipts block has its own loading and error text | Dialogs and `confirmRun` pending | None | High | Complete | Separate Series Number allocator; numbers are never reused. |
| 50 | `/admin/sales-network` | Table (tabs) | `DataTable loading` | "No members found." | None | `ConfirmDialog` pending; member dialogs pending | No error state. | High | Partial | Add IST and Add OST create accreditation records. |
| 51 | `/admin/sales-network/genealogy` | Detail (tree) | `TextLinesSkeleton` | "No members to show." | None | N/A (read-only) | No error state. | Medium | Partial | Shows only authorized ancestors and downlines. |
| 52 | `/admin/sales-network/members` | Table (tabs) | `DataTable loading` | "No members found." | None | `ConfirmDialog` and member dialogs pending | No error state. | High | Partial | Renewal issues a new AA number and keeps the old one in history. |
| 53 | `/admin/sales-network/members/[id]` | Detail | `DetailSkeleton` | "Member not found or restricted." | None | `ConfirmDialog` and member dialogs pending | No error state; an accreditation query failure reads as "no record". | High | Partial | Parent history and AA number history; PII is masked for IDs. |
| 54 | `/admin/sales-network/registrations` | Table (tabs) | `DataTable loading` | "No applications found." | None | `FormDialog` and `ReasonDialog` pending | No error state. | High | Partial | Approval creates the seller record and issues the AA number. |
| 55 | `/admin/settings/lists` | Table (redirect to `/admin/vip-products?tab=lists`) | `DataTable loading` | "No {list} found." | None | Form dialog pending; `confirmRun`; delete pending | No error state. | Medium | Partial | Entries in use cannot be deleted, only deactivated. |
| 56 | `/admin/stay-points` | Table (tabs) | `QueryState` on the membership picker | Per-table `emptyText`; "No memberships with a VIP Number are visible." | `QueryState` for points; Promos and Promo Points tabs surface none | `FormDialog` pending; `confirmRun`; `ConfirmDialog` pending | Promos and Promo Points tabs inherit the missing error state. | High | Partial | Welcome Gift tranches are contractual; releases follow the signed Grant. |
| 57 | `/admin/vip-products` | Table (tabs) | `QueryState` per tab | Per-tab texts ("No products.", "No card levels.", and so on) | `QueryState` per tab except the Lists tab | Dialogs pending; `confirmRun` | The Lists tab has no error state. | Medium | Partial | Settings area with nine tabs; each tab keeps the access rule of its former page. |
| 58 | `/admin/vip-products/contracts` | Redirect | — | — | — | — | None: server redirect. | Medium | Redirect | To `/admin/sales?tab=contracts&status=needs-review`. |
| 59 | `/admin/vip-products/contracts/[id]` | Redirect | — | — | — | — | None: server redirect. | Medium | Redirect | To `/admin/sales/contracts/{id}`. |
| 60 | `/admin/vip-products/scheme-guide` | Static (read-only) | `QueryState` with `CardGridSkeleton` | None | `QueryState` | N/A (Print only) | No empty state when no payment plans are configured, so the page can render blank below the range line. | Low | Partial | Shows only approved terms; pending schemes state why they cannot be offered. |
| 61 | `/admin/vip-products/schemes` | Table (tabs) | `QueryState` | "No payment plans." / "No payment plans match the filters." | `QueryState` | Dialog pending | None | Medium | Complete | A plan with incomplete terms stays unavailable and never gets figures. |
| 62 | `/admin/vip-products/tier-codes` | Table (tabs) | `QueryState` | "No card levels." | `QueryState` | Dialog and `confirmRun` pending | None | Low | Complete | Non-active codes are listed read-only underneath. |

## Summary

| Verdict | Routes |
|---|---|
| Complete | 28 |
| Partial | 25 |
| Redirect | 8 |
| Static | 1 |
| **Total** | **62** |

Redirect taxonomy: 16 admin `page.tsx` files call a redirect helper. Eight are counted as `Redirect` rows (a server redirect only); the other eight are listed as `Table (redirect to …)` and audited through their target tab.

### Shared gaps

1. **Missing query-error state on bare `DataTable` pages.** These screens pass `loading` to `DataTable` but never render `QueryState` or any other error branch: organization (area, staff, departments, roles), sales network (area, members, genealogy, member detail, registrations), promos, promo-points, Settings Lists, and the Stay Points area that hosts the promo tabs. A failed request looks like an empty table. This is the largest gap: 14 routes.
2. **`ContractPageFrame` has loading and not-found but no error branch.** Three detail routes therefore report a load failure as "Contract Not Found": `/admin/finance/cancellations/[id]`, `/admin/finance/collections/[id]` and `/admin/sales/contracts/[id]`. The customer and member detail pages use the same pattern of ignoring the query error, with their own not-found wording. That wording is truthful only when the query succeeded.
3. **Pending state is `disabled` only, without a spinner or `aria-busy`, in four places:** Allowance `Save Review`, Period Close `Close Month`, membership `Activate` (row menu and details footer), and the report `Export` trigger. The first three can also be re-clicked after the mutation settles while a refresh is still in flight.
4. **`useActionRunner` is unused in admin.** Panels either use `useConfirmRun` with toasts or ad-hoc try/catch plus `toast`. The shared helper is available but not the convention here; any Phase 2 cleanup should either adopt it or say explicitly that it is not the admin pattern.
5. **No admin page passes `QueryState onRetry`.** The retry path added to the shared error state is never offered on an admin route, so a failed load can only be retried by reloading the page.
6. **Single empty text for filtered tables.** `/admin/customers`, `/admin/sales/contracts` and `/admin/finance/collections` show one message whether the register is empty or the filters excluded everything. Minor, but it makes "is this system empty?" ambiguous during support calls.
7. **Business-rule status, not a UI gap.** The staff Redemption prototype is authorized (2026-11-17); live Redemption and customer submissions remain separately unauthorized. Doc 10 now carries the same status. Do not remove the route or enable live use without owner instruction.

### Phase 2 batch order (highest risk first)

**Batch 1 — Finance, payments, commissions and membership (money and status changes)**

| Route | Work |
|---|---|
| `/admin/commissions/allowances` | Add `Button loading` / `aria-busy` to Save Review. |
| `/admin/membership` | Give Activate a pending state (row menu and details footer). |
| `/admin/membership/activation` | Same Activate fix through the shared membership table. |
| `/admin/finance/cancellations/[id]` | Add an error branch to `ContractPageFrame` (shared with the other detail routes). |
| `/admin/finance/collections/[id]` | Same shared fix. |
| `/admin/reports/reconciliation` | Already complete; re-verify after the shared frame change. |
| `/admin/finance`, `/admin/finance/collections`, `/admin/finance/cancellations` | Already complete; regression-check only. |

**Batch 2 — Customer and sales records (PII and attribution)**

| Route | Work |
|---|---|
| `/admin/customers/[id]` | Surface `customers.error`; do not present a failed query as not found. |
| `/admin/customers/[id]/edit` | Add an error branch before the wizard mounts. |
| `/admin/sales/contracts/[id]` | Shared `ContractPageFrame` error branch. |
| `/admin/sales-network` | Add `QueryState` around the members table. |
| `/admin/sales-network/members` | Same. |
| `/admin/sales-network/members/[id]` | Surface member and accreditation query errors. |
| `/admin/sales-network/registrations` | Add `QueryState`; approval issues an AA number. |
| `/admin/sales-network/genealogy` | Add an error branch beside the tree skeleton. |
| `/admin/customers` | Split "no customers" from "no match". |

**Batch 3 — Reports, audit logs and period close (read-only, high volume)**

| Route | Work |
|---|---|
| `/admin/reports/period-close` | Add `Button loading` to Close Month and keep the double-submit guard. Highest-risk item of this batch; pull it into Batch 1 only with owner approval. |
| `/admin/reports` and every `/admin/reports/*` | Give Export a spinner (or keep it disabled and document that choice). |
| `/admin/audit-logs` | Already complete; regression-check after shared changes. |
| `/admin/reports/historical-import` | Already complete; verify batch sign-off busy state after shared dialog changes. |

**Batch 4 — Organization, staff and settings**

| Route | Work |
|---|---|
| `/admin/organization` | Add `QueryState` around the staff directory. |
| `/admin/organization/staff` | Same. |
| `/admin/organization/departments` | Add `QueryState`. |
| `/admin/organization/roles` | Add `QueryState`. |
| `/admin/settings/lists` | Add `QueryState`; it is also the missing branch inside the Settings area. |
| `/admin/vip-products` | Add the Lists tab error state (fixed once in `ListsPage`). |
| `/admin/vip-products/scheme-guide` | Add an empty state for "no payment plans configured". |
| `/admin/account` | Surface the profile query error. |
| `/admin/promos`, `/admin/promos/points` | Add `QueryState`; inherited by the Stay Points tabs. |

Each batch needs its own approved plan. Do not mix batches in one change set, and do not treat this audit as authorization.

Shared work every batch should reuse: adopt `Button loading` for every submit that mutates, and pass `QueryState onRetry` only where a retry is safe (a rejected repository call, not a validation failure).

## How to verify a page

Run these five checks in the browser (Chrome DevTools) before calling any page fixed. All five must pass.

1. **Slow network loading.** In DevTools, set Network to "Slow 3G" (or throttle 6x). Reload the route. The page must show a skeleton that matches the content shape (table, detail, form) and an `aria-busy`/`role="status"` region. A blank content area is a failure.
2. **Empty list or filter.** Open a page whose register is empty, or type a search that matches nothing. The table must show a clear row with `emptyText`, and where the page distinguishes "none exist" from "none match", the wording must differ.
3. **Forced query error.** Make the repository reject (DevTools Network "Block request URL", or stop the mock handler). The page must show an in-page `role="alert"` with a retry path where retrying is safe. A toast alone is a failure; a "Not Found" card is a failure when the record exists.
4. **Double-click a pending action.** Click the primary action twice quickly (Submit, Save, Activate, Close Month). Exactly one request must be sent, the button must show the spinner, be disabled and expose `aria-busy="true"`, and the label must not jump.
5. **Reduced motion.** Enable "Emulate CSS media feature prefers-reduced-motion: reduce". Skeletons must not shimmer and spinners must not rotate; the page must still show that it is loading.

Also confirm the shared dialog rule: while a dialog is pending, Cancel is disabled and the dialog cannot be dismissed.

## Verification record

| Check | Result |
|---|---|
| Admin page files | 62 (`Get-ChildItem -Path src/app/admin -Recurse -Filter page.tsx` count) |
| Audit rows | 62 |
| Duplicate routes | None (every route appears once) |
| Complete claims with named code path | Yes; each Complete row names the component or prop that provides the state |
| Files created | `docs/implementation/01-prototype/ui-states/admin-ui-state-audit.md` only |
| Source, test, config and other docs written by this task | None |
| Concurrent shared-primitive change | During this audit, `QueryState` began delegating its error state to a new `ErrorState` and gained `onRetry` (files timestamped 15:24, after the admin evidence was read). The audit reflects the code read after that change. No admin page passes `onRetry`. |
| Git commands run | None |

## Risks carried forward

- Marking a page complete because a shared wrapper exists, without checking that the page uses it. This audit checked each call site; Phase 2 must keep doing that.
- Nested dynamic routes are easy to miss. They are included here: `/admin/customers/[id]`, `/admin/customers/[id]/edit`, `/admin/finance/cancellations/[id]`, `/admin/finance/collections/[id]`, `/admin/finance/contracts/[id]`, `/admin/sales/contracts/[id]`, `/admin/sales/contract-review/[id]`, `/admin/sales-network/members/[id]`, `/admin/vip-products/contracts/[id]`.
- A toast is feedback after an action, not a load error. Every Partial row above was judged by the in-page state, not by its toasts.
- Redirect routes inherit the target tab's gaps. When a target is fixed, re-check the redirect route's row and this document's verdict.
