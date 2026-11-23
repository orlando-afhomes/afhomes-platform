# FP15: Admin State Audit

- Status: Complete on 2026-11-18. Audit only; no admin source changed.
- The task boxes below are the original plan; they are retained as history and are not a live checklist. See Status and Verification for the recorded result.
- Layer: Documentation only. No admin page changes in this phase.
- Business rules: none changed.
- Depends on: FP12 (shared state contract and components).
- Authorizes: nothing. Phase 2 needs a separate approved plan.

## Objective

Audit every admin route against the loading, empty, error and busy-state contract, record the gaps in one document, and recommend a Phase 2 build order.

The owner chose an audit-first approach so that a large number of admin pages are not changed blindly. This phase produces evidence, not code.

## Scope

- Enumerate every `src/app/admin/**/page.tsx`.
- Record the current loading, empty, error and pending-button coverage.
- Check the shared primitives: `DataTable`, `QueryState`, `Button loading`, `useActionRunner`, `FormDialog`.
- Write `docs/implementation/01-prototype/ui-states/admin-ui-state-audit.md`.
- Recommend Phase 2 batches by risk.

## Out of scope

- Editing any admin page, component, test or style.
- Changing permissions, business rules or data.
- Fixing the gaps found. Those fixes belong to Phase 2.

## F15.1 Route inventory and state matrix

| Field | Value |
|---|---|
| Current | Admin has a shell skeleton, `DataTable` loading and empty rows, `QueryState`, and `Button loading`. Coverage is not known page by page. |
| Target | One table lists every admin route and its state coverage. |
| Layer | Documentation |
| Blocked by | none |
| Acceptance | The number of rows equals the number of admin page files; every row has a route, surface type, four state columns, a gap and a priority. |
| Status | Complete on 2026-11-18; audit document written |

**File:** Create `docs/implementation/01-prototype/ui-states/admin-ui-state-audit.md`.

**Method**

- [ ] Enumerate routes with:

```powershell
Get-ChildItem -Path src/app/admin -Recurse -Filter page.tsx |
  ForEach-Object { $_.FullName.Replace((Get-Location).Path + '\src\app\', '').Replace('\page.tsx', '') }
```

- [ ] For each route, record:

| Column | Values |
|---|---|
| Route | Exact URL path, for example `/admin/finance/payments` |
| Surface | Dashboard, table, detail, form, wizard, static |
| Loading | `DataTable`, `QueryState`, page Suspense, none |
| Empty | `DataTable` empty text, custom `EmptyState`, none |
| Error | `QueryState`, inline alert, route error boundary, none |
| Busy | `Button loading`, disabled only, none |
| Gap | One sentence naming the missing state |
| Priority | High, medium, low |
| Notes | Risk or business context |

- [ ] Check these shared components before marking any page complete:
  - `DataTable` loading skeleton and empty row.
  - `QueryState` skeleton and error.
  - `Button loading` spinner and `aria-busy`.
  - `useActionRunner` success/error toast.
  - `FormDialog` pending state.
  - `AdminShellSkeleton` first paint.
- [ ] Mark a page complete only when all four states are covered by code, not by assumption.
- [ ] Group the gaps into Phase 2 batches, highest risk first:
  1. Finance, payments, commissions and membership (money and status changes).
  2. Customer and sales records (PII and attribution).
  3. Reports, audit logs and period close (read-only but high volume).
  4. Organization, staff and settings.
- [ ] Add a short "How to verify a page" checklist:
  - Slow the network and load the page: skeleton, not blank.
  - Empty the list/filter: `EmptyState` or a clear table row.
  - Force a query error: `ErrorState` with retry where safe.
  - Double-click a pending action: one request, spinner, disabled.
  - Reduced motion: no shimmer or spinner animation.
- [ ] Do not edit any admin source file.
- [ ] Do not stage or commit.

## Verification

- [ ] Count of audit rows equals:

```powershell
(Get-ChildItem -Path src/app/admin -Recurse -Filter page.tsx).Count
```

- [ ] Every route in the route table appears exactly once.
- [ ] Every "complete" claim names the component or code path that provides the state.
- [ ] No file under `src/panels/admin` or `src/app/admin` changed (`git status --short` check).

## Risks

- Marking a page complete because a shared wrapper exists, without checking that the page uses it.
- Missing routes with nested dynamic segments such as `/admin/customers/[id]` and `/admin/finance/collections/[id]`.
- Treating a toast as an error state. A toast is feedback after an action; a failed load still needs an in-page error.

## Next phase

FP16 verifies everything delivered by FP12 to FP15. Admin fixes start only after the owner reviews the audit and approves a separate Phase 2 plan.
