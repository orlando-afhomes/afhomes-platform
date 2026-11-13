# FP4: Customer Applications

- Atlas journey: J05 Customer draft, application, correction and import (module: Customer applications)
- Objective: draft and submit customer applications, correct submitted records, import and export, and attribute the sale to the right seller.
- Business rules: `docs/business-rules/04-customer-management.md` sections 5, 7, 9, 10, 13 and 14. Workbook references: NUM section 9, OPS section 4.2.
- Depends on: FP1, FP3.
- Decision items (all decided on 2026-11-12. Still open: automatic clawback recovery waits for the signed IST addendum (G09, U07); see `decisions-and-gaps.md`): G03, G06. Doc 04 section 7.8 was rewritten under R5 and is current. The Customer ID question was ruled by the owner (A2, 2026-11-12): keep `YYYY-NNNN`, assigned at submission, identifying the person only; it is never the VIP Number (doc 04 section 7.7, doc 06).

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
| Current | VIP Card, Payment Plan, Customer identity and contact, Sales and Consent, Reservation and proof, Review. Field formatting, duplicate and eligibility checks and acknowledgments apply. ID image preview is temporary. Customer ID `YYYY-NNNN` is assigned at submit; drafts are saved through the repository (`saveAsDraft`), and only a legacy `sessionStorage` key is cleared. |
| Target | Same. Keep draft and submitted states distinct. Per R5 and follow-up 23: a seller (IST or OST) may start a draft of their own customers; the Clerk completes and submits; the Administrator or Super Administrator approves, sends it back to the Clerk with a reason, or rejects it with a reason (nothing is deleted). The actual closing seller is required at approval; a blank draft may omit it. The Customer ID `YYYY-NNNN` is assigned at submission and identifies the person only (doc 04 section 7.7). |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | A submitted customer is never duplicated by a second submit. A seller, including an OST, can start and save a draft of their own customer but cannot submit, approve or enter a Customer ID (doc 04 section 18, items 3 to 5 and 13). Approval is refused without a closing seller. Send back and reject each require a reason and delete nothing. Blank drafts consume no Customer ID. |
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
| Target | Same. History import is decided (R11, follow-up 8): historical receipts are imported as "Approved (imported)", and an Administrator signs off each import batch once (docs 07, 11, 12). Other imported payment claims follow normal approval. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Invalid rows never commit. Duplicates are prevented. Imported historical receipts show "Approved (imported)" and are not placed in the normal approval queue. A batch is not final until an Administrator signs it off, and the sign-off is audited. Imported customers keep an existing Customer ID only if it is unique; otherwise the row is Invalid. |
| Status | Exists (per atlas) |

## F4.4 Closing seller and referrer attribution

| Field | Value |
|---|---|
| Journey | J05, J06 |
| Current | Two UI selectors, matching doc 04 section 7.8 (closing seller plus optional referrer). |
| Target | Closing seller (IST or OST) and optional referrer (IST or OST, possibly a different person) stay separate (NUM section 9, R5). The closing seller is linked to the VIP Number; the referrer is not. Where one person is both, a Clerk records a short reference to an existing dated referral and the approving Administrator or Super Administrator verifies it before referral commission attaches. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Both roles are recorded separately. Recommender contact and email follow the selected referrer. A referrer is optional and never invented. The closing seller is required at approval. Past attribution is preserved after team transfers (doc 04 section 12). |
| Status | Decided (R5); verify against the code before building further |

## F4.5 OST referral lead and SM handoff

| Field | Value |
|---|---|
| Journey | J05 |
| Current | The OST operation list has no customer create or prepare grant. SM designation does not authorize contract finalization (U04). |
| Target | Per R5 and follow-up 23: a seller (IST or OST) starts the customer draft for their own customer, the Clerk completes it and the Administrator or Super Administrator approves, sends back with a reason, or rejects with a reason. The closing seller is credited, plus an optional referrer. OST sees only its own records (R4). Starting a draft grants no access to other customers. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | An OST can start and save a draft for their own customer, and the office sees it for completion. An OST cannot submit, approve, enter a Customer ID or view another OST's customers (doc 04 section 18, items 4, 5, 13 and 26). SM designation does not authorize contract finalization. No automatic grants to OST beyond starting a draft. |
| Status | Partial; verify against the code |

## Out of scope

Contract preparation and reservation payments (FP5, FP6).
