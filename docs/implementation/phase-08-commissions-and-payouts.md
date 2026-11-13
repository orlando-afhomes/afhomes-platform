# FP8: Commissions and Payouts

- Atlas journey: J09 Commission assignment, release and recovery (module: Commissions and payouts)
- Objective: commission assignment, the release rules, payout recording and confirmation, and recovery.
- Business rules: `docs/business-rules/08-commission-management.md` sections 7 to 15 and amendment. Workbook references: OPS sections 5 and 6, AUG R22, OCT R27, R30 to R34, O2 to O10.
- Depends on: FP6, FP7.
- Decision items (all decided on 2026-11-12. Still open: automatic clawback recovery waits for the signed IST addendum (G09, U07); see `decisions-and-gaps.md`): G08, G09. `AGENTS.md` section 5: no universal percentages may be invented. Per R8 each person has set rates, which an Administrator or the Super Administrator changes (future sales only); Finance, the Administrator or the Super Administrator approves and pays payouts.
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
| Current | From an eligible Confirmed Sale, select eligible genealogy recipients, enter a percentage, then approve. Rejected: missing or duplicate recipients, recipients outside the sale genealogy, an existing commission for that sale and recipient, invalid rates. (Self-approval is no longer a rejection under the authority rule; it is allowed and flagged.) Approved creates a payable record subject to release conditions. |
| Target | Per R8: only the closing seller (DSC) and the referrer (DRI) earn per-sale commission, at each person's set rate. A person's rates default to the standard for their position (AUG R17, OCT R30); an Administrator or the Super Administrator may change them for future sales only, logged. Rates are frozen on the sale when its VIP Number is issued. If a needed rate is missing, issuance pauses until it is set (doc 08). When one person is both closing seller and referrer, a dated referral reference is kept. No override to other genealogy members. Pay survives the person leaving. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Each rejection has a test or an existing test. A new person's rate defaults to the position standard. A frozen rate does not change after issuance (and never after release). A missing rate pauses issuance. A same-person closing seller and referrer keeps a dated referral reference. |
| Status | Implemented in mock for newly issued numbers; historical commission records are preserved |

## F8.2 Release policy by product and effective date

| Field | Value |
|---|---|
| Journey | J09 |
| Current | The platform requires Approved commission, Confirmed Sale, no existing payout, 40% net verified collections and a known qualifying verification date. A payout may be recorded from the first day of the month after the month in which 40% was verified. There is no waiting period. |
| Target | Per R8: each person has set DSC and DRI rates frozen on the sale, only the closing seller and the referrer earn per-sale commission, and VIP commission is paid 100% at the month-end of the month 40% is collected, with no 7-day wait. Owner decision D-A (2026-11-12): the payout may be recorded from the first day of the month after the month in which net verified collections first reached 40%; the next calendar month stands in for month close until a month-close feature exists. Owner decision D-B (2026-11-12): for now the month is set by the verification (approval) date of the payment that reached 40%; doc 13 (OCT O3) stamps Stage 1 by the receipt's own date, and that alignment is a separate task. |
| Layer | Frontend (mock) |
| Blocked by | none (G08 decided R8) |
| Acceptance | Rules live in `src/modules/commissions/` with tests, and effective dates drive which policy applies. VIP releases 100% at 40% collected with no waiting period. The IGP release (40% at 40% collected, the rest at full payment, doc 14 section 8) is not built. |
| Status | VIP and IGP release stages use counted receipt dates; monthly lists require close |

## F8.3 Payout recording and confirmation

| Field | Value |
|---|---|
| Journey | J09 |
| Current | Enter a valid payout date and reference to record the payout. The obligation stays distinct from Paid. Confirm disbursement records Paid if allowed. A ledger change between record and confirm is an explicit reconciliation case. |
| Target | Same. Only confirmed disbursement is Paid. Duplicate payouts are prevented. Finance, the Administrator or the Super Administrator may approve a payout list they prepared themselves; the history flags it, as for receipts (owner answer, 2026-11-12; doc 08 section 11.2). |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | A payout date before release is refused. A second payout for the same commission is refused. A self-approved payout list is allowed and flagged in the history. |
| Status | Exists (per atlas, updated in `fc060bb`) |

## F8.4 Post-initiation adjustment

| Field | Value |
|---|---|
| Journey | J09 |
| Current | The approver can adjust an eligible unrecorded commission with a reason, resolve a hold, or cancel where allowed. A recorded payout, duplicate, missing evidence, cancelled sale or no release date stops the action or routes to Finance review. Release dates follow the month-end rule: a payout opens on the first day of the month after 40% was verified (D-A). |
| Target | Per R8 item 6 and doc 08 section 11.6: Finance, an Administrator or the Super Administrator may void or confirm an initiated payout on a held commission, with history kept. Route any other adjustment after payout initiation to Finance review without hiding the recorded disbursement. |
| Layer | Frontend (mock) |
| Blocked by | none (G08 decided R8; the route is in doc 08 section 11.6) |
| Acceptance | An initiated payout on a held commission can be voided or confirmed by an authorized actor with a reason, and the history stays visible. A paid commission is never silently edited. A payout date before release is refused. |
| Status | Held initiated payouts can be confirmed or voided with history |

## F8.5 Paid-commission recovery

| Field | Value |
|---|---|
| Journey | J09 |
| Current | No recovery ledger. |
| Target | Per R9 and follow-up 2 (doc 08 section 14): a clawback is recorded as owed (five triggers of OCT R32), collected directly by the office, and written off by an Administrator or the Super Administrator; a Defaulted sale's clawback is written off on reinstatement, except a returned-cheque clawback. Only automatic deduction from future pay waits for the signed IST Commission and Clawback Addendum (and a signed OST agreement for OST sellers). History is never deleted. |
| Layer | Frontend (mock) |
| Blocked by | none for recording, direct collection and write-off. Automatic deduction waits for the signed addendum (open item). |
| Acceptance | A clawback can be raised, recorded as recovered and written off, with actor and reason. No automatic offset happens without signed authority. Reinstatement writes off the owed amount except for a returned cheque. |
| Status | Recovery ledger and direct collection implemented; automatic deductions await signed terms |

## F8.6 Allowance (BA, PA, PB) calculation review

| Field | Value |
|---|---|
| Journey | J09, J12 |
| Current | No payroll, engagement review or durable close. The Director runs BA, PA and PB in the workbook. |
| Target | Per R9: the system computes BA, PA and PB monthly (OPS section 6.2, AUG, OCT; doc 08 section 15), with team credit following the current upline. A parallel run beside Excel continues until a month closes with no unexplained differences. Built only when authorized. |
| Layer | Frontend (mock) |
| Blocked by | none (G09 decided R9). Engagement reviews (doc 08 open items) are not yet written into the rules. |
| Acceptance | Computed BA, PA and PB match the workbook figures in the parallel run, with differences listed. Policy version and approval are stored with the calculation. |
| Status | Workbook-input calculation and saved allowance reviews implemented; automatic assembly and official month comparison pending |

## Out of scope

Period close (F11.4).
