# FP7: Adjustments, Cancellations and Holds

- Atlas journey: J08 Reversal, refund, cancellation and holds (module: Finance and collections)
- Objective: corrections to verified money, cancellation with an independent decision, and holds, with every linked effect reconciled.
- Business rules: `docs/business-rules/07-finance-and-payments.md` sections 14, 19 and 20; `08-commission-management.md`. Workbook references: OPS section 4.4, OCT R32 to R34 and O6 to O9.
- Depends on: FP6.
- Open decisions: G07, G08, G09.

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
| Blocked by | none (overpayment and refund timing are open owner decisions) |
| Acceptance | An adjustment above the adjustable amount is refused. The original receipt is never edited. |
| Status | Exists (per atlas) |

## F7.2 Cancellation with an independent decision

| Field | Value |
|---|---|
| Journey | J08 |
| Current | An authorized Admin requests with grounds. Finance opens the request and confirms or declines. The requester and decider must differ, with the documented Super Admin exception. Confirmation applies contract, sale, membership and unpaid commission effects. Decline keeps the record and decision history. |
| Target | Record approve or decline, link the signature, and do not invent forfeiture or recovery rights. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Self-decision is refused. A declined request leaves the record unchanged. |
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
| Current | Not implemented. The workbook documents returned checks, default, cure, late admission, closed periods, replacement and rescission (OCT R32 to R34, O6 to O9). Default flagging is a prompt for authorized confirmation. |
| Target | Keep these paths distinct. Recovery of paid commission and legally permitted offsets need the applicable signed basis. |
| Layer | Owner decision |
| Blocked by | G07, G09 |
| Acceptance | To be defined after the decision. |
| Status | Missing |

## Out of scope

Commission recovery ledger (F8.5).
