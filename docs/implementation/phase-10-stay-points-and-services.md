# FP10: Stay Points and Services

- Atlas journey: J11 Points, resorts and future booking (module: Stay Points and services)
- Objective: the points ledger and cycle, the tranche waiting during a Financial Hold, resort spend intake, and the disabled Redemption and Services.
- Business rules: `docs/business-rules/09-vip-membership-and-stay-points.md` sections 8 to 20; `10-redemption.md` section 17 (feature status). Workbook reference: GRANT sections I-B, III and IV.
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
| Current | Select a membership and cycle, inspect points and ledger entries. `src/modules/stay-points/engine.ts` still computes points as 1 verified peso = 1 point (Spend-to-Earn), which R10 removed and which must be reworked. |
| Target | Per R10: ledger-controlled points under the signed Grant's Annual Welcome Gift (fixed yearly tranches, each split 70% weekday/non-holiday and 30% weekend/holiday: Bronze 7,000 + 3,000, Silver 14,000 + 6,000, Gold 17,500 + 7,500; released only when the yearly qualifying spend is met). Prevent duplicate or invalid credits. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | The ledger is append-only for credits. Cycle totals reconcile with entries. Points Activation Date is the earlier of the first redemption (first stay with points used at check-in) or the second anniversary of the Card Claim Date, and is fixed once set. Year 1 measurement runs from Full Settlement to the PAD, capped at 24 months. A released tranche is never taken back. Missed tranches never carry over. No Spend-to-Earn (1 peso = 1 point) path remains. A Gold supplementary holder's spend counts toward the shared minimum. |
| Status | Fixed Annual Welcome Gift tranches implemented and tested in mock |

## F10.2 Tranche waiting during a Financial Hold

| Field | Value |
|---|---|
| Journey | J11 |
| Status | Removed from scope (no Points Hold, R10). The former held-points release or void feature no longer exists in the rules. |
| Current | The prototype can release or void held points. R10 withdrew the Points Hold (doc 09 section 13). |
| Target | The only remaining hold is a tranche falling due during a Membership Financial Hold (doc 09 section 17.2). It is not released while the hold lasts and is released when the hold ends, if its period still qualifies (or a waiver was granted) and the card is still valid; otherwise it is forfeited at expiry. Tranche due dates keep running. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | A tranche due during a hold stays unreleased and shows why. It is released once when the hold ends if it still qualifies and the card is valid. It is forfeited if the card expired first. A released tranche is never held or taken back. No release or void of held points exists. |

## F10.3 Resort spend intake

| Field | Value |
|---|---|
| Journey | J11 |
| Current | No intake workflow (U13). |
| Target | Per R10: the signed Grant's Annual Welcome Gift rule applies and Spend-to-Earn is removed. Finance or office staff enter each resort bill with its OR number. Resort bills entered by a Clerk are approved by Finance, the Administrator or the Super Administrator, like receipts (doc 09 section 11). A tranche is released only when the yearly qualifying spend is met. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | OR numbers are unique system-wide. Qualifying Spend is the gross pre-discount value of eligible paid transactions at AFhomes Direct Operations, excluding free items, points redemptions, third-party purchases, taxes and tips; VIP membership payments never count. Only approved bills count. Admin and Super Admin self-approval is audited. A bill entered late but dated inside a period counts for that period. A tranche releases once, in full, at the tier minimum (Bronze 1,000, Silver 2,000, Gold 3,000 pesos), with no partial or extra release. No caps, cap restoration or rounding exist. |
| Status | Resort bill entry and approval implemented and tested in mock |

## F10.4 Refunds and waivers

| Field | Value |
|---|---|
| Journey | J11 |
| Current | Refund treatment and past spend need review. The earlier cap restoration and rounding rules were removed by R10. |
| Target | Per R10: a refund lowers the Qualifying Spend of the original bill's period and delays a tranche that is not released yet. A released tranche is never taken back. A Compassionate Waiver can be granted by an Administrator or the Super Administrator (doc 09 sections 13 and 14). |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | A refund is a dated reversal entry and the original bill stays in history. A refund before release delays the tranche; after release it changes nothing. A waiver needs a written request within 60 days after the affected year, a documented ground and a written reason, is audited for both outcomes, releases that year's tranche, never creates a tranche beyond the tier count and never extends validity. |
| Status | Dated refunds and Compassionate Waiver implemented and tested in mock |

## F10.5 Redemption and Services (disabled)

| Field | Value |
|---|---|
| Journey | J11 |
| Current | Disabled. There is no route under `src/app/` (verified). Documented future flow (doc 10): front-desk or office staff with the Bookings permission book room stays with no separate approval step, points are reserved on confirmation and consumed after the completed stay, and Finance verifies any money part. Points pay for room stays only at open AFhomes Direct Operations overnight venues, not for services. |
| Target | Stays disabled. Preserve module boundaries. Reactivation needs separate authorization. Disabled-state protection must be validated before production. |
| Layer | Disabled |
| Blocked by | Owner authorization to build (G12 and U11 are decided) |
| Acceptance | No routes, APIs or navigation. No points consumed through redemption. When later authorized, the decided rules apply: no redemption before the card is claimed; the first redemption is the first stay with points used at check-in, and a booking cancelled in time does not count; a provisional first-stay room hold reserves no points; cancellation before the cut-off returns points and a no-show or late cancellation after the cut-off forfeits them; points plus cash is split by whole nights (A1); the points-per-night table version is fixed at the Card Claim Date and later versions apply only to cards claimed on or after their effective date; a card transfer or the cardholder's death forfeits the old holder's unused points and cancels the old holder's future points bookings after staff inform the old holder (A7). If Year 1 is not met when the first redemption sets the PAD, tranche 1 is not released and not carried over, a late bill dated inside the period still counts and an Admin waiver is possible (A7). |
| Status | Redemption exists in the prototype with sample configuration. Services remains outside scope. Canonical documentation still carries the earlier disabled status. |

## Out of scope

Everything under F10.5 until separately authorized.
