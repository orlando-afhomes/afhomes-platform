# FP6: Payments and Verification

- Atlas journey: J07 Receipt submission, verification and milestone calculation (module: Finance and collections)
- Objective: payment claims, Finance verification, correction, and the ledger and milestones that follow.
- Business rules: `docs/business-rules/07-finance-and-payments.md` sections 5 and 8 to 14; `13-sales-performance-reporting.md` sections 3 to 6. Workbook references: OPS section 4.3, OCT O2, O6 to O9.
- Depends on: FP5.
- Decision items (all decided on 2026-11-12. Still open: automatic clawback recovery waits for the signed IST addendum (G09, U07); see `decisions-and-gaps.md`): G06, G07.

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
| Current | An authorized submitter opens a scoped contract or the reservation step, then enters purpose, method, amount, receipt date, reference and evidence. Per R6 a Clerk enters each receipt with a required OR or bank reference number; a seller may only upload a payment slip photo for their own customer as proof (follow-up 5), and it counts only after a Clerk enters the receipt and it is approved. The repository checks positive amount, valid purpose and method, date, remaining balance, contract eligibility and duplicates. Valid becomes Submitted. |
| Target | Clerk entry with a required, system-unique OR or reference number; seller slip upload as proof only (never a receipt by itself); durable evidence storage later (Backend). |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Each failed check returns correction feedback and leaves no record. A missing or duplicate OR/reference number is refused. A seller slip never counts toward the balance. Evidence is not placed in an unrestricted public location. |
| Status | Exists (per atlas) |

## F6.2 Finance verification

| Field | Value |
|---|---|
| Journey | J07 |
| Current | Finance queue: review, verify, reject or return. Reject and return need a reason. Verification checks state, scope, duplicate verified receipt, price cap and flags a self-approval in the history (R6: Finance, the Administrator or the Super Administrator may approve a receipt they entered). |
| Target | Per R6: a Clerk enters the receipt, and Finance, the Administrator or the Super Administrator approves it. Finance, the Administrator and the Super Administrator may each approve their own entries, with the audit trail flagging it (doc 07 section 5.2). Human approval stays. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Verification never activates membership. A rejected payment never counts toward the balance. |
| Status | Exists (per atlas) |

## F6.3 Suggested match and duplicate check

| Field | Value |
|---|---|
| Journey | J07 |
| Current | Duplicate checks exist. Workbook matching uses the sale number, or the buyer as a fallback (OPS section 4.3). The workbook's Supervisor approval is the Administrator under R4. |
| Target | Per R6: a Clerk enters each receipt with an OR or reference number, and Finance, the Administrator or the Super Administrator approves it. Reference numbers are unique across the system. Suggest a match and flag duplicates. |
| Layer | Frontend (mock) |
| Blocked by | none (G06 decided R6) |
| Acceptance | A suggestion never auto-approves a receipt. A duplicate OR or reference number is blocked system-wide. A suggested match is only a hint for the approver. |
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
| Blocked by | none (G06 decided R6) |
| Acceptance | Unmatched, duplicate and disputed receipts are listed for Finance, the Administrator or the Super Administrator. Resolving one needs a human approval or rejection with a reason. Nothing is deleted. |
| Status | Missing |

## F6.6 Ledger allocation and milestone recalculation

| Field | Value |
|---|---|
| Journey | J07 |
| Current | A verified receipt enters the ledger and is allocated in reservation, down-payment, installment order. The mock still moves the sale from Pending to Confirmed on a finalized contract plus an interim required initial amount from the payment schedule. This differs from the ruling and is a known gap. A full verified balance is a separate milestone. `src/modules/finance/milestones.ts` changed in `fc060bb`. |
| Target | Update only after authorized approval, and retain audit, status and related records. Per R7 and follow-up 3, a sale counts (Closed Deal) at 25% of the contract price in approved receipts once the Administrator has approved the sale record; contract finalization is tracked separately and is not required. The 40% (Stage 1) and 100% (Full Payment) dates are stamped separately, each as the later of the triggering receipt's date and the latest counted receipt (OCT O3, doc 13 section 4). |
| Layer | Frontend (mock) |
| Blocked by | none (G06 and G07 decided; not blocked by them) |
| Acceptance | Milestone tests pass, including the 25% count with no finalized contract and the O3 stamp rule. A receipt in a closed month counts in the first open month. No floating-point money. Date-only fields use Asia/Manila semantics. |
| Status | Partial |

## Out of scope

Reversals and refunds (FP7), commission release (FP8).

Imported history receipts arrive as "Approved (imported)" and an Administrator signs off each import batch once (doc 07 section 20 and follow-up 3; doc 12). The batch sign-off is covered by the history import work (card F11.5), not by this phase's queue.
