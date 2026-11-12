# FP6: Payments and Verification

- Atlas journey: J07 Receipt submission, verification and milestone calculation (module: Finance and collections)
- Objective: payment claims, Finance verification, correction, and the ledger and milestones that follow.
- Business rules: `docs/business-rules/07-finance-and-payments.md` sections 5 and 8 to 14; `13-sales-performance-reporting.md` sections 3 to 6. Workbook references: OPS section 4.3, OCT O2, O6 to O9.
- Depends on: FP5.
- Decision items (all decided on 2026-11-12 except G08, G09 and U07; see `decisions-and-gaps.md`): G06, G07.

Routes (from the atlas):

| Route | Entry |
|---|---|
| `/admin/finance` | protected |
| `/admin/finance/payments` | protected (also J08) |
| `/admin/finance/collections` | protected |
| `/admin/finance/collections/[id]` | protected (also J08) |
| `/admin/finance/contracts/[id]` | alias |

## F6.1 Payment claim with evidence

| Field | Value |
|---|---|
| Journey | J07 |
| Current | An authorized submitter opens a scoped contract or the reservation step, then enters purpose, method, amount, receipt date, reference and evidence. The repository checks positive amount, valid purpose and method, date, remaining balance, contract eligibility and duplicates. Valid becomes Submitted. |
| Target | Same, with durable evidence storage later (Backend). |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Each failed check returns correction feedback and leaves no record. Evidence is not placed in an unrestricted public location. |
| Status | Exists (per atlas) |

## F6.2 Finance verification

| Field | Value |
|---|---|
| Journey | J07 |
| Current | Finance queue: review, verify, reject or return. Reject and return need a reason. Verification checks state, scope, duplicate verified receipt, price cap and the self-verification restriction (documented Super Admin exception). |
| Target | Same. Human verification stays. Only authorized Finance actors verify receipts. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Verification never activates membership. A rejected payment never counts toward the balance. |
| Status | Exists (per atlas) |

## F6.3 Suggested match and duplicate check

| Field | Value |
|---|---|
| Journey | J07 |
| Current | Duplicate checks exist. Workbook matching uses the sale number, or the buyer as a fallback, and Supervisor approval (OPS section 4.3). |
| Target | Per R6: a Clerk enters each receipt with an OR or reference number, and Finance, the Administrator or the Super Administrator approves it. Reference numbers are unique across the system. Suggest a match and flag duplicates. |
| Layer | Owner decision |
| Blocked by | G06 (decided R6) |
| Acceptance | After the decision: a suggestion never auto-verifies. |
| Status | Partial |

## F6.4 Returned-receipt correction and resubmit (U06)

| Field | Value |
|---|---|
| Journey | J07 |
| Current | The repository (`src/data/mock/payment-repository.ts`) supports resubmitting a Returned payment. The UI has no submitter control: `src/panels/admin/components/payment-actions.tsx` only says the submitter can correct and resubmit. The journey stops at Returned. |
| Target | Per R6: a returned receipt can be fixed and resent by the authorized submitter. The original submission stays in history. |
| Layer | Frontend (mock) |
| Blocked by | none for the control itself. G06 (decided R6) covers what counts as a valid correction. |
| Acceptance | Only the submitter of a Returned receipt sees the control. Resubmission keeps the original in history. One test for the happy path and one for an unauthorized actor. |
| Status | Missing UI. The clearest feature that can be built now. |

## F6.5 Exception queue

| Field | Value |
|---|---|
| Journey | J07 |
| Current | Not described in the atlas as existing. |
| Target | A queue for unmatched, duplicate or disputed receipts, with retained human verification. |
| Layer | Frontend (mock) |
| Blocked by | G06 (decided R6) |
| Acceptance | To be defined after the decision. |
| Status | Missing |

## F6.6 Ledger allocation and milestone recalculation

| Field | Value |
|---|---|
| Journey | J07 |
| Current | A verified receipt enters the ledger and is allocated in reservation, down-payment, installment order. A finalized contract plus the required verified payment moves the sale from Pending to Confirmed. A full verified balance is a separate milestone. The mock uses an interim required initial amount derived from the payment schedule. `src/modules/finance/milestones.ts` changed in `fc060bb`. |
| Target | Update only after authorized verification, and retain audit, status and related records. Governing required amounts per scheme remain a decision. |
| Layer | Frontend (mock), Owner decision for amounts |
| Blocked by | G06 (decided R6), G07 (decided R7) |
| Acceptance | Milestone tests pass. No floating-point money. Date-only fields use Asia/Manila semantics. |
| Status | Partial |

## Out of scope

Reversals and refunds (FP7), commission release (FP8).
