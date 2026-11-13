# FP11: Reports, Audit and Close

- Atlas journey: J12 Reporting, audit, close, allowances and transition (module: Reports, audit and close)
- Objective: scoped dashboards and reports (including the Referred by me sales list, F11.7), the audit log, and the period close, reconciliation and transition from the company workbook.
- Business rules: `docs/business-rules/11-reports-and-analytics.md` sections 6 to 8 and 24 to 27; `12-audit-logs-and-governance.md` sections 5 to 8; `13-sales-performance-reporting.md` sections 3 to 7; `14-igp-sales.md` (IGP sales appear in sales and team reports at their Closed Deal; IGP stages follow doc 14 and doc 13). Workbook references: OPS sections 5 to 8, OCT section 5A, ROLL sections 6 to 8, DESIGN D9.
- Depends on: FP6 to FP10 (reports read their records).
- Decision items (all decided on 2026-11-12. Still open: automatic clawback recovery waits for the signed IST addendum (G09, U07); see `decisions-and-gaps.md`): G04, G09, G11.

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
| Current | A role-appropriate dashboard and six report routes. Date range and role scope select the records. Finance views all reports, view only (owner ruling, follow-up 25). Active snapshots and dated measures use their documented definitions. Empty states are shown. Reading a report never changes records. The explanatory notes were removed from these pages in the last session. |
| Target | Same. Authoritative source records, correct business event dates, historical attribution, no double-counting (docs 11 and 13). |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Report tests pass. Finance sees every report and cannot change any record from it. |
| Status | Exists (per atlas) |

## F11.2 Audit log

| Field | Value |
|---|---|
| Journey | J12 |
| Current | `/admin/audit-logs` filters and shows scoped details. Access is restricted without the audit grant. `audit-logs-page.tsx` changed in `fc060bb`. |
| Target | One scoped event trail. Logically append-only. No credentials or unnecessary sensitive data. Corrections are preserved. Interim retention rule (owner ruling R11, 2026-11-12): records are kept forever and nothing is deleted automatically. Only the legal retention schedule is still open, and no period is invented. Self-approvals are flagged on every approval type (doc 12). |
| Layer | Frontend (mock), Backend later |
| Blocked by | none (only the written legal retention schedule is open; the interim rule stands) |
| Acceptance | A user without the grant sees "Access restricted". |
| Status | Exists (per atlas) |

## F11.3 Source-total reconciliation

| Field | Value |
|---|---|
| Journey | J12 |
| Current | Finance and administrators can compare platform figures with entered workbook totals and record an explained difference. The official parallel-run totals still need validation. |
| Target | Check that source totals, prior pay and scopes reconcile. Investigate discrepancies and apply an authorized linked correction. The monthly comparison runs side by side with the workbook (R9, R11). |
| Layer | Frontend (mock) first |
| Blocked by | none (G11 decided R11; G09 decided R9) |
| Acceptance | A month's platform totals can be compared with the workbook figures, and each difference is listed with its explanation or linked correction. |
| Status | Implemented in mock; workbook comparison pending |

## F11.4 Period close snapshot

| Field | Value |
|---|---|
| Journey | J12 |
| Current | The Period Close screen captures sales, collections, commissions and saved allowance reviews in a browser-memory snapshot. The latest saved review per person contributes to the allowance subtotal; an empty review set is shown as missing. |
| Target | The Administrator or the Super Administrator closes a month (R7; docs 11 and 13). A closed month never changes and is never reopened. A late receipt or event is a dated adjustment in the first open month. Store policy version and approval with each calculation. |
| Layer | Frontend (mock) first |
| Blocked by | none (G09, U12 decided R7, R9, R11) |
| Acceptance | After a month is closed, its figures stay the same; a late receipt appears in the first open month with its original date and an adjustment marker. |
| Status | Implemented in mock; Chrome close action verified |

## F11.5 Historical import and transition

| Field | Value |
|---|---|
| Journey | J12 |
| Current | The prototype previews unfinished-sale receipt batches, blocks duplicate references, and shows signed-off historical receipts separately from live collections. |
| Target | Import history and reconcile before replacing the workbook. Vacancy roll-up is respected. The switch happens when a month closes with no unexplained differences, decided by the Super Administrator (R4; doc 11 §26). Only unfinished sales are imported; finished sales stay in the Excel archives. Imported receipts are marked "Approved (imported)" and count once an Administrator signs off the import batch (follow-up 8; doc 07 §20). |
| Layer | Frontend (mock) first, then Backend |
| Blocked by | none (G04 decided R3, G09 decided R9, G11 decided R11) |
| Acceptance | An import batch shows its receipts as "Approved (imported)" only after one Admin sign-off, imported and live receipts can be told apart in reports, and no finished sale is imported. |
| Status | Receipt batch prototype implemented; transition still pending |

## F11.6 Public Customer Lookup and Customer Portal (removed from scope)

| Field | Value |
|---|---|
| Journey | J02, J12 |
| Current | No verified route (U08). |
| Target | None. Public Customer Lookup is removed from scope by owner ruling R11 (2026-11-12; doc 11 §21): there is no public card or customer check, and only authorized staff check cards. A Customer Portal is a deferred future capability. |
| Layer | None (out of scope) |
| Blocked by | none (G11 and U08 decided R11) |
| Acceptance | No public card or customer check exists; only authorized staff check cards. |
| Status | Removed from scope (R11) |

## F11.7 Referred by me sales list

| Field | Value |
|---|---|
| Journey | J12 |
| Current | The Sales page has a "Referred by me" tab listing sales where the member is the referrer but not the closing seller. It is separate from My Sales totals and shows no contract links. |
| Target | Same (owner answer A8, 2026-11-12; doc 11 amendment item 4). |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | A sale appears once per person. My Sales totals exclude referred sales. A referrer outside the member's team sees only the referred sale. |
| Status | Exists |

## Out of scope

Any change to business records through a report.
