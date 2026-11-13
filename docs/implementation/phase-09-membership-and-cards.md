# FP9: Membership and Cards

- Atlas journey: J10 Membership and card (module: Membership and cards)
- Objective: activation of finalized, fully settled contracts (activation never creates a number), VIP Number and Card Claim Date handling, and card servicing.
- Business rules: `docs/business-rules/06-vip-card-issuance.md` sections 4 and 6 to 9; `07-finance-and-payments.md` amendment; `09-vip-membership-and-stay-points.md`. Workbook references: NUM sections 2 to 6, GRANT section I-B.
- Depends on: FP5, FP6.
- Decision items (all decided on 2026-11-12. Still open: automatic clawback recovery waits for the signed IST addendum (G09, U07); see `decisions-and-gaps.md`): G05, G10. Validity starts on the Card Claim Date (R2).

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
| Current | Authorized Admin, Finance or Super Admin opens the Activation Queue. Checks: finalized contract, verified full settlement, required identifiers, valid mapping. Activate records Active. The prototype currently also generates a Card ID from the recorded RA and the activation date; that behavior is superseded (doc 06: activation never creates a number). Missing data or an ineligible balance stops activation with feedback. |
| Target | Pending and fully settled records stay distinct from active memberships. Finance verification never activates a membership by itself. Activation never creates or changes the VIP Number, which is issued when the signed Reservation Agreement is recorded (doc 06). |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Activation is refused for each missing prerequisite (finalized contract, verified full settlement, required identifiers, valid mapping). Activation creates no number and leaves the VIP Number unchanged. Receipt approval alone never activates. |
| Status | Exists (per atlas) |

## F9.2 VIP Number issuance and numbering

| Field | Value |
|---|---|
| Journey | J10, J06 |
| Current | The prototype issues a Card ID at activation, separate from the RA. This differs from R2. |
| Target | Per R2 (NUM v6.2): one VIP Number for the Reservation Agreement, the Grant and the Card, issued when the signed Reservation Agreement is recorded, with a monthly sequence. Validity starts on the Card Claim Date. Numbers are never reused or renumbered. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | One VIP Number per Reservation Agreement, Grant and Card, in the form `YYMMDDNNNNNVTPMMS`, issued when the signed RA is recorded. Monthly sequence with no duplicates from one company-wide allocator. Issued numbers are never reused or renumbered. Activation creates no number. |
| Status | Implemented in mock; activation reuses the VIP Number |

## F9.3 Validity from the Card Claim Date

| Field | Value |
|---|---|
| Journey | J10 |
| Current | The prototype computes validity from activation. R2 decided that validity starts on the Card Claim Date. |
| Target | Validity starts on the Card Claim Date (actual or deemed). Keep claim history. Cardholders can claim up to one year after full settlement; the deemed claim date follows doc 06. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Validity start equals the recorded or deemed Card Claim Date, not the activation date. Claim history is kept. The Card Claim Date feeds the redemption basis version, the Points Activation Date and the 24-month Year 1 rule (docs 06, 09, 10). |
| Status | Implemented in mock; actual and deemed Card Claim Dates |

## F9.4 Entitlement version and card servicing

| Field | Value |
|---|---|
| Journey | J10 |
| Current | The membership list is read and inspect only. Full custody, replacement, holder-change and signed-version servicing have gaps (U13). NUM sections 5 and 6 include card void or recall on applicable replacements. |
| Target | Record the applicable entitlement version and servicing evidence. Preserve Gold supplementary shared benefits where applicable. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Replacement, holder change and transfer record the applicable entitlement version and evidence. A transfer needs a written request and written management approval; the old holder's unused points are forfeited and cannot be used by anyone, the new holder gets only future tranches, and the old holder's future points bookings are cancelled after staff inform the old holder before the transfer is finalized (docs 09, 10, A7). On the cardholder's death the heirs request a written transfer with the same rules. Gold supplementary shared benefits are preserved. No invented contractual terms. |
| Status | Replacement and transfer recorded in mock; full servicing walkthrough pending |

## Rules carried by this phase

Decided rules (docs 06, 09, 10) that FP9 screens must respect:

- No redemption before the card is claimed (doc 09 section 21).
- The points-per-night table version is fixed at the Card Claim Date (doc 10 section 8).
- Transfer and death forfeits and the cancellation of the former holder's future points bookings (F9.4).
- A Gold supplementary holder's qualifying spend counts toward the shared yearly minimum (doc 09 section 16).

## Out of scope

Stay-points ledger (FP10).
