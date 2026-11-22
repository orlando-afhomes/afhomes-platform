# 03 Mock Feature Gaps

Frontend (mock) work with no outside blocker. Each item needs owner approval before work starts.

| ID | Feature | Gap | Build outline | Rule |
|---|---|---|---|---|
| G1 | F6.5 Exception queue | Unmatched receipt intake is missing | A Clerk can record a receipt with no matching payment; it lands in the exceptions tab with a reason; Finance matches or rejects it; duplicate OR numbers are refused | Doc 07 |
| G2 | F7.4 Linked effects | Exceptions found after disbursement or in a closed month have no route | A reason-based exception that opens the first open month, keeps history, and raises a clawback if money was paid | Docs 07, 08, 13 (G08) |
| G3 | F8.6 Allowances | Allowance inputs are not assembled automatically; no official comparison against the workbook | Build the BA/PA/PB inputs from closed-month data and compare with the workbook figures; saved reviews keep their totals | Doc 08 section 15 |
| G4 | F11.5 Historical import | Switch off the workbook is not recorded | A Super Administrator sign-off after a month closes with no unexplained differences | Doc 11 |
| G5 | Customer portal plan | `prototype/customer-portal-plan.md` lists tasks 1 to 7 unticked, but the routes exist (`/portal`, `/offers`, experiences, product drafts) | Audit each task against code and tick or list what is missing; no rebuild | Plan file |

Each item: a typed repository method, a panel, a test per rule, an audit event for sensitive actions, `npx tsc --noEmit`, lint, targeted tests, build.
