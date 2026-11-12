# FP10: Stay Points and Services

- Atlas journey: J11 Points, resorts and future booking (module: Stay Points and services)
- Objective: the points ledger and cycle, held-point handling, resort spend intake, and the disabled Redemption and Services.
- Business rules: `docs/business-rules/09-vip-membership-and-stay-points.md` sections 8 to 20; `10-redemption.md` sections 5 and 16. Workbook reference: GRANT sections I-B, III and IV.
- Depends on: FP9.
- Open decisions: G10, G12.
- Changed since the atlas baseline: `src/modules/stay-points/engine.ts` changed in `fc060bb` (voided and held spend are excluded from verified minimum-spend totals, with historical bucket allocations preserved for reconciliation).

Routes (from the atlas):

| Route | Entry |
|---|---|
| `/admin/stay-points` | protected |

## F10.1 Ledger and annual cycle

| Field | Value |
|---|---|
| Journey | J11 |
| Current | Select a membership and cycle, inspect points and ledger entries. |
| Target | Ledger-controlled points. Prevent duplicate or invalid credits. The 70% weekday and 30% weekend principle applies. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | The ledger is append-only for credits. Cycle totals reconcile with entries. |
| Status | Exists (per atlas) |

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
| Target | The resort records qualifying spend with linked evidence, Finance verifies, and the system calculates approved points and caps. Unlock, hold or expire as the signed contract and prospective policy say. |
| Layer | Owner decision |
| Blocked by | G10, U13 |
| Acceptance | After the decision: credits only from Finance-verified spend within approved caps. |
| Status | Missing |

## F10.4 Refunds, cap restoration and rounding

| Field | Value |
|---|---|
| Journey | J11 |
| Current | Cap restoration, refund treatment and past spend need separate review. |
| Target | Resolve refunds, cap restoration, rounded amounts and historical gifts. Waivers are never auto-approved. |
| Layer | Owner decision |
| Blocked by | G10 |
| Acceptance | To be defined after the decision. |
| Status | Missing |

## F10.5 Redemption and Services (disabled)

| Field | Value |
|---|---|
| Journey | J11 |
| Current | Disabled. There is no route under `src/app/` (verified). The documented future flow: request, Operations availability approval, reserve points, Finance verifies mixed cash, perform service, consume or resolve. |
| Target | Stays disabled. Preserve module boundaries. Reactivation needs separate authorization. Disabled-state protection must be validated before production. |
| Layer | Owner decision |
| Blocked by | G12, U11 |
| Acceptance | No routes, APIs or navigation. No points consumed through redemption. |
| Status | Disabled |

## Out of scope

Everything under F10.5 until separately authorized.
