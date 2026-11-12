# FP8: Commissions and Payouts

- Atlas journey: J09 Commission assignment, release and recovery (module: Commissions and payouts)
- Objective: commission assignment, the release rules, payout recording and confirmation, and recovery.
- Business rules: `docs/business-rules/08-commission-management.md` sections 7 to 15 and amendment. Workbook references: OPS sections 5 and 6, AUG R22, OCT R27, R30 to R34, O2 to O10.
- Depends on: FP6, FP7.
- Decision items (all decided on 2026-11-12. Still open: automatic clawback recovery waits for the signed IST addendum (G09, U07); see `decisions-and-gaps.md`): G08, G09. `AGENTS.md` section 5: no universal percentages may be invented. Finance controls percentages, approvals and payouts.
- History: `src/modules/commissions/rules.ts` and `src/data/mock/commission-repository.ts` changed in `fc060bb` (already inside the atlas baseline `0512a31`). Missing crossing date and payout dates before release are now rejected. On 2026-11-12 the 7-day payout wait (`PAYOUT_RELEASE_WAIT_DAYS`) was removed from `src/modules/commissions/rules.ts` to match R8.

Routes (from the atlas):

| Route | Entry |
|---|---|
| `/admin/commissions` | protected |
| `/admin/commissions/assignment` | protected |
| `/admin/commissions/payouts` | protected |

## F8.1 Commission assignment

| Field | Value |
|---|---|
| Journey | J09 |
| Current | From an eligible Confirmed Sale, select eligible genealogy recipients, enter a percentage, then approve. Rejected: missing or duplicate recipients, recipients outside the sale genealogy, an existing commission for that sale and recipient, invalid rates, self-approval. Approved creates a payable record subject to release conditions. |
| Target | Per R8: only the closing seller (DSC) and the referrer (DRI) earn per-sale commission, at each person's set rate frozen on the sale. No override to other genealogy members. Pay survives the person leaving. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Each rejection has a test or an existing test. No default rate is supplied. |
| Status | Partial. The code lets any genealogy recipient receive any percentage, which differs from R8. |

## F8.2 Release policy by product and effective date

| Field | Value |
|---|---|
| Journey | J09 |
| Current | The platform requires Approved commission, Confirmed Sale, no existing payout, 40% net verified collections and a known qualifying verification date. A payout may be recorded from the first day of the month after the month in which 40% was verified. There is no waiting period. |
| Target | Per R8: each person has set DSC and DRI rates frozen on the sale, only the closing seller and the referrer earn per-sale commission, and VIP commission is paid 100% at the month-end of the month 40% is collected, with no 7-day wait. Owner decision D-A (2026-11-12): the payout may be recorded from the first day of the month after the month in which net verified collections first reached 40%; the next calendar month stands in for month close until a month-close feature exists. Owner decision D-B (2026-11-12): for now the month is set by the verification (approval) date of the payment that reached 40%; doc 13 (OCT O3) stamps Stage 1 by the receipt's own date, and that alignment is a separate task. |
| Layer | Frontend (mock) |
| Blocked by | none (G08 decided R8) |
| Acceptance | After the decision: rules live in `src/modules/commissions/` with tests, and effective dates drive which policy applies. |
| Status | Exists (month-end release, D-A); receipt-date stamping per doc 13 is a known gap (D-B) |

## F8.3 Payout recording and confirmation

| Field | Value |
|---|---|
| Journey | J09 |
| Current | Enter a valid payout date and reference to record the payout. The obligation stays distinct from Paid. Confirm disbursement records Paid if allowed. A ledger change between record and confirm is an explicit reconciliation case. |
| Target | Same. Only confirmed disbursement is Paid. Duplicate payouts are prevented. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | A payout date before release is refused. A second payout for the same commission is refused. |
| Status | Exists (per atlas, updated in `fc060bb`) |

## F8.4 Post-initiation adjustment

| Field | Value |
|---|---|
| Journey | J09 |
| Current | The approver can adjust an eligible unrecorded commission with a reason, resolve a hold, or cancel where allowed. A recorded payout, duplicate, missing evidence, cancelled sale or no release date stops the action or routes to Finance review. Release dates follow the month-end rule: a payout opens on the first day of the month after 40% was verified (D-A). |
| Target | Route an adjustment after payout initiation to Finance review without hiding the recorded disbursement. |
| Layer | Owner decision |
| Blocked by | G08 (release policy decided in R8; the post-initiation adjustment route is not decided by R8) |
| Acceptance | To be defined after the decision. |
| Status | Partial |

## F8.5 Paid-commission recovery

| Field | Value |
|---|---|
| Journey | J09 |
| Current | No recovery ledger. The live Finance process is unverified (U07). |
| Target | Recovery of paid commission needs a signed recovery basis. Earlier paid-stage and clawback history survive closing. |
| Layer | Owner decision |
| Blocked by | G09, U07 |
| Acceptance | No offset or retroactive application without the applicable signed authority. |
| Status | Missing |

## F8.6 Allowance (BA, PA, PB) calculation review

| Field | Value |
|---|---|
| Journey | J09, J12 |
| Current | No payroll, engagement review or durable close. The Director runs BA, PA and PB in the workbook. |
| Target | Calculation review and shadow reconciliation, built only when authorized. |
| Layer | Owner decision |
| Blocked by | G09 |
| Acceptance | To be defined after the decision. Policy version and approval are stored with the calculation. |
| Status | Missing |

## Out of scope

Period close (F11.4).
