# FP4: Customer Applications

- Atlas journey: J05 Customer draft, application, correction and import (module: Customer applications)
- Objective: draft and submit customer applications, correct submitted records, import and export, and attribute the sale to the right seller.
- Business rules: `docs/business-rules/04-customer-management.md` sections 5, 7, 9, 10, 13 and 14. Workbook references: NUM section 9, OPS section 4.2.
- Depends on: FP1, FP3.
- Open decisions: G03, G06. Doc 04 section 7.8 and Customer ID decision D2 are stale (see [decisions-and-gaps.md](decisions-and-gaps.md)).

Routes (from the atlas):

| Route | Entry |
|---|---|
| `/admin/customers` | protected |
| `/admin/customers/new` | protected (also J06, J07) |
| `/admin/customers/[id]` | protected |
| `/admin/customers/[id]/edit` | protected |
| `/admin/customers/import-export` | protected |

## F4.1 Draft and application wizard

| Field | Value |
|---|---|
| Journey | J05 |
| Current | VIP Card, Payment Plan, Customer identity and contact, Sales and Consent, Reservation and proof, Review. Field formatting, duplicate and eligibility checks and acknowledgments apply. ID image preview is temporary. Customer ID `YYYY-NNNN` is assigned at submit; the wizard draft lives in `sessionStorage`. |
| Target | Same. Keep draft and submitted states distinct. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | A submitted customer is never duplicated by a second submit. OST registration is barred from this flow. |
| Status | Exists (per atlas) |

## F4.2 Exit protection and returning to the failing step

| Field | Value |
|---|---|
| Journey | J05 |
| Current | Dirty in-app exit or Cancel offers Save Draft, Discard all Changes or Stay. An invalid customer keeps the draft and highlights errors. Reservation evidence may need re-entry on reopening. Browser history navigation coverage is unverified. |
| Target | Return to the exact failing step. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Back and forward browser navigation behave as defined. A fresh New Customer starts blank. |
| Status | Exists (per atlas), history navigation unverified |

## F4.3 Import and export

| Field | Value |
|---|---|
| Journey | J05, J12 |
| Current | Upload, parse, mark rows Ready, Needs review or Invalid, inspect, acknowledge a declaration, then import eligible rows as drafts. Rows are revalidated before commit. Export respects permissions, format and filters. |
| Target | Same. Imported payment claims follow normal verification. Verified historical money needs an independently approved history procedure. |
| Layer | Frontend (mock) |
| Blocked by | none for drafts, G09 for historical money |
| Acceptance | Invalid rows never commit. Duplicates are prevented. |
| Status | Exists (per atlas) |

## F4.4 Closing seller and referrer attribution

| Field | Value |
|---|---|
| Journey | J05, J06 |
| Current | Two UI selectors. The documented same-OST rule in doc 04 section 7.8 differs. |
| Target | Closing seller and optional referrer stay separate (NUM section 9). Attribution is verified. |
| Layer | Owner decision |
| Blocked by | G03 |
| Acceptance | After the decision: attribution matches the rule and past attribution is preserved. |
| Status | Blocked |

## F4.5 OST referral lead and SM handoff

| Field | Value |
|---|---|
| Journey | J05 |
| Current | The OST operation list has no customer create or prepare grant. SM designation does not authorize contract finalization (U04). |
| Target | Candidate: a draft-only referral record that stops at the SM's scoped review and hands off to the authorized finalizer. A true customer draft or SM finalization needs explicit policy changes. |
| Layer | Owner decision |
| Blocked by | G03, U04 |
| Acceptance | To be defined after the decision. No automatic grants to OST. |
| Status | Missing |

## Out of scope

Contract preparation and reservation payments (FP5, FP6).
