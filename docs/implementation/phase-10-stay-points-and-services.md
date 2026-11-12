# FP10: Stay Points and Services

- Atlas journey: J11 Points, resorts and future booking (module: Stay Points and services)
- Objective: the points ledger and cycle, held-point handling, resort spend intake, and the disabled Redemption and Services.
- Business rules: `docs/business-rules/09-vip-membership-and-stay-points.md` sections 8 to 20; `10-redemption.md` sections 5 and 16. Workbook reference: GRANT sections I-B, III and IV.
- Depends on: FP9.
- Decision items (all decided on 2026-11-12. Still open: automatic clawback recovery waits for the signed IST addendum (G09, U07); see `decisions-and-gaps.md`): G10, G12.
- History: `src/modules/stay-points/engine.ts` changed in `fc060bb` (already inside the atlas baseline `0512a31`) (voided and held spend are excluded from verified minimum-spend totals, with historical bucket allocations preserved for reconciliation).

Routes (from the atlas):

| Route | Entry |
|---|---|
| `/admin/stay-points` | protected |

## F10.1 Ledger and annual cycle

| Field | Value |
|---|---|
| Journey | J11 |
| Current | Select a membership and cycle, inspect points and ledger entries. `src/modules/stay-points/engine.ts` still computes points as 1 verified peso = 1 point (Spend-to-Earn), which R10 removed. |
| Target | Per R10: ledger-controlled points under the signed Grant's Annual Welcome Gift (fixed yearly tranches, each split 70% weekday/non-holiday and 30% weekend/holiday: Bronze 7,000 + 3,000, Silver 14,000 + 6,000, Gold 17,500 + 7,500; released only when the yearly qualifying spend is met). Prevent duplicate or invalid credits. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | The ledger is append-only for credits. Cycle totals reconcile with entries. |
| Status | Partial. The ledger exists, but the earning model differs from R10. |

## F10.2 Release or void of held points

| Field | Value |
|---|---|
| Journey | J11 |
| Current | A Finance-authorized actor releases or voids held points with a reason. The held state and permitted actor are verified. |
| Target | Record hold, void or release, actor, reason and supporting evidence. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Only held entries can be released or voided. Reason is required. Non-Finance actors have a read-only view. |
| Status | Exists (per atlas) |

## F10.3 Resort spend intake

| Field | Value |
|---|---|
| Journey | J11 |
| Current | No intake workflow (U13). |
| Target | Per R10: the signed Grant's Annual Welcome Gift rule applies and Spend-to-Earn is removed. Office staff enter spending with a receipt number, and a tranche is released only when the yearly qualifying spend is met. |
| Layer | Owner decision |
| Blocked by | G10 (decided R10), U13 (decided R10) |
| Acceptance | After the decision: credits only from Finance-verified spend within approved caps. |
| Status | Missing |

## F10.4 Refunds, cap restoration and rounding

| Field | Value |
|---|---|
| Journey | J11 |
| Current | Cap restoration, refund treatment and past spend need separate review. |
| Target | Per R10: a refund delays a tranche that has not been released yet. An Administrator or the Super Administrator can approve a waiver. |
| Layer | Owner decision |
| Blocked by | G10 (decided R10) |
| Acceptance | To be defined after the decision. |
| Status | Missing |

## F10.5 Redemption and Services (disabled)

| Field | Value |
|---|---|
| Journey | J11 |
| Current | Disabled. There is no route under `src/app/` (verified). The documented future flow: request, Operations availability approval, reserve points, Finance verifies mixed cash, perform service, consume or resolve. |
| Target | Stays disabled. Preserve module boundaries. Reactivation needs separate authorization. Disabled-state protection must be validated before production. |
| Layer | Owner decision |
| Blocked by | G12 (decided R11 to R13), U11 (decided R12) |
| Acceptance | No routes, APIs or navigation. No points consumed through redemption. |
| Status | Disabled |

## Out of scope

Everything under F10.5 until separately authorized.
