# FP9: Membership and Cards

- Atlas journey: J10 Membership and card (module: Membership and cards)
- Objective: activation of finalized, fully settled contracts, Card ID issuance, and card servicing.
- Business rules: `docs/business-rules/06-vip-card-issuance.md` sections 4 and 6 to 9; `07-finance-and-payments.md` amendment; `09-vip-membership-and-stay-points.md`. Workbook references: NUM sections 2 to 6, GRANT section I-B.
- Depends on: FP5, FP6.
- Decision items (all decided on 2026-11-12 except G08, G09 and U07; see `decisions-and-gaps.md`): G05 (Conflicting), G10. `AGENTS.md` section 5: Card Claim Date versus Activation Date validity start.

Routes (from the atlas):

| Route | Entry |
|---|---|
| `/admin/membership` | protected |
| `/admin/membership/activation` | protected |
| `/admin/finance/holds` | shared with FP7 |

## F9.1 Activation queue

| Field | Value |
|---|---|
| Journey | J10 |
| Current | Authorized Admin, Finance or Super Admin opens the Activation Queue. Checks: finalized contract, verified full settlement, required identifiers, valid mapping. Activate generates the prototype Card ID from the recorded RA and the activation date and records Active. Missing data, an ineligible balance or a collision stops activation with feedback. |
| Target | Pending and fully settled records stay distinct from active memberships. Finance verification never activates a membership by itself. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Activation is refused for each missing prerequisite. A duplicate Card ID is refused. |
| Status | Exists (per atlas) |

## F9.2 Card ID issuance and numbering

| Field | Value |
|---|---|
| Journey | J10, J06 |
| Current | Card ID is activation-based and separate from the RA. |
| Target | Per R2 (NUM v6.2): one VIP Number for the Reservation Agreement, the Grant and the Card, issued when the signed Reservation Agreement is recorded, with a monthly sequence. Validity starts on the Card Claim Date. Numbers are never reused or renumbered. |
| Layer | Owner decision |
| Blocked by | G05 (decided R2) |
| Acceptance | After the decision: no duplicates, issued numbers preserved. |
| Status | Decided, awaiting build authorization |

## F9.3 Claim date versus activation date validity

| Field | Value |
|---|---|
| Journey | J10 |
| Current | The prototype computes validity from activation. The company Grant starts validity at Card Claim under the applicable signed terms. |
| Target | Follow the signed terms. Keep claim history. Escalate signed claim and activation conflicts. |
| Layer | Owner decision |
| Blocked by | G05 (decided R2) |
| Acceptance | To be defined after the decision. |
| Status | Decided, awaiting build authorization |

## F9.4 Entitlement version and card servicing

| Field | Value |
|---|---|
| Journey | J10 |
| Current | The membership list is read and inspect only. Full custody, replacement, holder-change and signed-version servicing have gaps (U13). NUM sections 5 and 6 include card void or recall on applicable replacements. |
| Target | Record the applicable entitlement version and servicing evidence. Preserve Gold supplementary shared benefits where applicable. |
| Layer | Owner decision |
| Blocked by | G10 (decided R10), U13 (decided R10) |
| Acceptance | To be defined after the decision. No invented contractual terms. |
| Status | Missing |

## Out of scope

Stay-points ledger (FP10).
