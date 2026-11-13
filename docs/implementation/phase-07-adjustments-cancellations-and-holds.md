# FP7: Adjustments, Cancellations and Holds

- Atlas journey: J08 Reversal, refund, cancellation and holds (module: Finance and collections)
- Objective: corrections to verified money, cancellation with a recorded decision, and holds, with every linked effect reconciled.
- Business rules: `docs/business-rules/07-finance-and-payments.md` sections 14, 19 and 20; `08-commission-management.md`. Workbook references: OPS section 4.4, OCT R32 to R34 and O6 to O9.
- Depends on: FP6.
- Decision items (all decided on 2026-11-12. Still open: automatic clawback recovery waits for the signed IST addendum (G09, U07); see `decisions-and-gaps.md`): G07, G08, G09.

Routes (from the atlas):

| Route | Entry |
|---|---|
| `/admin/finance/holds` | protected (also J10) |
| `/admin/finance/cancellations` | protected |
| `/admin/finance/cancellations/[id]` | protected |
| `/admin/finance/payments` and `/admin/finance/collections/[id]` | shared with FP6 |
| `/admin/sales/contracts/[id]` | shared with FP5 |

## F7.1 Reversal and refund

| Field | Value |
|---|---|
| Journey | J08 |
| Current | From Payment History or Finance detail, choose reversal or refund, amount and reason. Checks: an eligible original receipt, an available adjustable amount, no duplicate adjustment, and non-refundable reservation restrictions. The original receipt is preserved and the linked balance updates. A reservation correction may be a reversal. |
| Target | Same. Reversals keep a traceable history. |
| Layer | Frontend (mock) |
| Blocked by | none. Overpayment and refund timing are not covered by any ruling in `decisions-and-gaps.md`; treat them as an unrecorded question for the owner, not a blocker for the control. |
| Acceptance | An adjustment above the adjustable amount is refused. The original receipt is never edited. |
| Status | Exists (per atlas) |

## F7.2 Cancellation request and decision

| Field | Value |
|---|---|
| Journey | J08 |
| Current | An authorized Admin requests with grounds. Finance opens the request and confirms or declines. The requester may also decide (authority rule, doc 07 R6/R7 amendment item 8, "Cancellation decision"); the history flags a self-decision. Confirmation applies contract, sale, membership and unpaid commission effects. Decline keeps the record and decision history. |
| Target | Record approve or decline, link the signature, and do not invent forfeiture or recovery rights. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | A self-decision succeeds and is flagged in the history. A declined request leaves the record unchanged. |
| Status | Exists (per atlas) |

## F7.3 Holds

| Field | Value |
|---|---|
| Journey | J08, J10 |
| Current | An underpaid previously active membership can be placed on Financial Hold. Affected unpaid commission can be held. `/admin/finance/holds` links to the related contract. |
| Target | Same. Holds are visible and resolvable by authorized actors. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Holds are resolved with a reason. The hold list links to the contract. |
| Status | Exists (per atlas) |

## F7.4 Reconciliation of linked effects

| Field | Value |
|---|---|
| Journey | J08 |
| Current | A loss of required verified payment can return a Confirmed Sale to Pending, and a later qualifying payment can reconfirm. A payout already recorded stays visible for Finance review. |
| Target | Reconcile balance, sale, commission and card effects. Paid and pending obligations stay separate. Escalate post-disbursement and closed-period exceptions. |
| Layer | Frontend (mock) |
| Blocked by | G08 for the post-disbursement route |
| Acceptance | Tests cover sale re-confirmation and a payout that already exists. |
| Status | Partial |

## F7.5 Default, cure and late admission

| Field | Value |
|---|---|
| Journey | J08 |
| Current | Not implemented. The workbook documents returned checks, default, cure, late admission, closed periods, replacement and rescission (OCT R32 to R34, O6 to O9). Per R7 a sale with no approved receipt for 90 days is listed and an Administrator or the Super Administrator marks it Defaulted (doc 07 section 15, doc 13 section 4.6). |
| Target | Keep these paths distinct. The 90-day no-payment list, then Defaulted marked by the Administrator or Super Administrator; a Defaulted sale loses its Closed Deal at once (OCT R33) and returns to Active if the buyer pays again. Reinstatement follows doc 08 (R9 item 4): the clawback still owed is written off, anything recovered is reported for refund, a returned-cheque clawback is never written off. Automatic recovery of paid commission waits for the signed addendum. |
| Layer | Frontend (mock) |
| Blocked by | none (G07 and G09 decided); automatic recovery waits for the signed IST addendum (see F8.5) |
| Acceptance | A sale with no approved receipt for 90 days appears on the list. Only an Administrator or Super Administrator can mark it Defaulted. A Defaulted sale leaves the Confirmed count and shows its own status. A new approved receipt returns it to Active. Reinstatement writes off the owed clawback. |
| Status | Missing |

## Out of scope

Commission recovery ledger (F8.5).
