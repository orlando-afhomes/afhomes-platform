# FP11: Reports, Audit and Close

- Atlas journey: J12 Reporting, audit, close, allowances and transition (module: Reports, audit and close)
- Objective: scoped dashboards and reports, the audit log, and the period close, reconciliation and transition from the company workbook.
- Business rules: `docs/business-rules/11-reports-and-analytics.md` sections 6 to 8 and 24 to 27; `12-audit-logs-and-governance.md` sections 5 to 8; `13-sales-performance-reporting.md` sections 3 to 7. Workbook references: OPS sections 5 to 8, OCT section 5A, ROLL sections 6 to 8, DESIGN D9.
- Depends on: FP6 to FP10 (reports read their records).
- Decision items (all decided on 2026-11-12 except G08, G09 and U07; see `decisions-and-gaps.md`): G04, G09, G11.

Routes (from the atlas):

| Route | Entry |
|---|---|
| `/admin` | dashboard (shell and gate are in FP2) |
| `/admin/reports/customer-growth` | protected |
| `/admin/reports/sales-performance` | protected |
| `/admin/reports/collections` | protected |
| `/admin/reports/commissions` | protected |
| `/admin/reports/membership` | protected |
| `/admin/reports/stay-points` | protected |
| `/admin/audit-logs` | protected |
| `/admin/customers/import-export` | shared with FP4 |

## F11.1 Dashboard and six reports

| Field | Value |
|---|---|
| Journey | J12 |
| Current | A role-appropriate dashboard and six report routes. Date range and role scope select the records. Active snapshots and dated measures use their documented definitions. Empty states are shown. Reading a report never changes records. The explanatory notes were removed from these pages in the last session. |
| Target | Same. Authoritative source records, correct business event dates, historical attribution, no double-counting (docs 11 and 13). |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Report tests pass. The two failing tests listed in the session snapshot (`dashboard-page.test.tsx` and `pagination.test.tsx`) are investigated first. |
| Status | Exists (per atlas) |

## F11.2 Audit log

| Field | Value |
|---|---|
| Journey | J12 |
| Current | `/admin/audit-logs` filters and shows scoped details. Access is restricted without the audit grant. `audit-logs-page.tsx` changed in `fc060bb`. |
| Target | One scoped event trail. Logically append-only. No credentials or unnecessary sensitive data. Corrections are preserved. No invented retention periods. |
| Layer | Frontend (mock), Backend later |
| Blocked by | none (formal retention is an open owner decision) |
| Acceptance | A user without the grant sees "Access restricted". |
| Status | Exists (per atlas) |

## F11.3 Source-total reconciliation

| Field | Value |
|---|---|
| Journey | J12 |
| Current | Not implemented. Finance compares figures with the present payment process during a parallel run (documented in the workbook plan). |
| Target | Check that source totals, prior pay and scopes reconcile. Investigate discrepancies and apply an authorized linked correction. |
| Layer | Frontend (mock) first |
| Blocked by | G11 (decided R11) |
| Acceptance | To be defined. The live Finance walkthrough must be verified first (U07). |
| Status | Missing |

## F11.4 Period close snapshot

| Field | Value |
|---|---|
| Journey | J12 |
| Current | No durable payroll, period close or historical import in the web prototype (U12). The Director closes the month in the workbook. |
| Target | An approved close snapshot with a review queue and a controlled reopen or adjustment path. Store policy version and approval with each calculation. |
| Layer | Owner decision |
| Blocked by | G09, U12 (decided R7, R9, R11) |
| Acceptance | To be defined after the decision. |
| Status | Missing |

## F11.5 Historical import and transition

| Field | Value |
|---|---|
| Journey | J12 |
| Current | Not implemented. The workbook plan carries unfinished-sale history, preserves original dates and prevents pre-2027 amounts from being paid again. |
| Target | Import history and reconcile before replacing the workbook. Vacancy roll-up is respected. The Director decides the switch after no unexplained differences. |
| Layer | Owner decision, then Backend |
| Blocked by | G04 (decided R3), G09, G11 (decided R11) |
| Acceptance | To be defined after the decision. |
| Status | Missing |

## F11.6 Public Customer Lookup and Customer Portal (removed from scope)

| Field | Value |
|---|---|
| Journey | J02, J12 |
| Current | No verified route (U08). |
| Target | None. Public Customer Lookup is removed from scope by owner ruling R11 (2026-11-12; doc 11 §21): there is no public card or customer check, and only authorized staff check cards. A Customer Portal is a deferred future capability. |
| Layer | Owner decision |
| Blocked by | G11 (decided R11), U08 (decided R11) |
| Acceptance | To be defined after the decision. |
| Status | Removed from scope (R11) |

## Out of scope

Any change to business records through a report.
