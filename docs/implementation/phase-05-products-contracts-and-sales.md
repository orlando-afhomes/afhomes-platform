# FP5: Products, Contracts and Sales

- Atlas journey: J06 Catalog, contract, reservation and sales (module: Products, contracts and sales)
- Objective: the controlled product catalog, contract preparation, review and finalization, and the sales milestones.
- Business rules: `docs/business-rules/05-vip-products-and-contracts.md` sections 10 to 13 and amendment; `06-vip-card-issuance.md` sections 4 and 6 to 9; `13-sales-performance-reporting.md` sections 3 to 6; `14-igp-sales.md` for F5.7. Workbook references: NUM sections 2 to 6 and 9, OCT R31, R38, O2, OPS section 4.2.
- Depends on: FP4.
- Decision items (all decided on 2026-11-12. Still open: automatic clawback recovery waits for the signed IST addendum (G09, U07); see `decisions-and-gaps.md`): G03, G05, G06, G07, G12. The Gold installment price, the Silver amount and Non-Standard authorization were decided in R1.

Routes (from the atlas):

| Route | Entry |
|---|---|
| `/admin/sales` | protected |
| `/admin/sales/contracts` | protected |
| `/admin/sales/contracts/[id]` | protected |
| `/admin/sales/contract-review` | protected |
| `/admin/sales/contract-review/[id]` | protected |
| `/admin/vip-products` | protected |
| `/admin/vip-products/schemes` | protected |
| `/admin/vip-products/scheme-guide` | protected |
| `/admin/vip-products/tier-codes` | protected |
| `/admin/vip-products/contracts` | alias |
| `/admin/vip-products/contracts/[id]` | alias |

## F5.1 Versioned catalog and schemes

| Field | Value |
|---|---|
| Journey | J06 |
| Current | An authorized administrator edits approved product terms and configuration. Values are validated. Finalized contracts keep their terms. Standard Move A and Move B terms and VIP Number payment-code mappings are recorded in docs 05 and 06. |
| Target | Choose versioned product terms and the applicable contract template. (The Move approval wording conflict was fixed in R1; Move A and Move B take effect on 2026-11-09.) |
| Layer | Frontend (mock) |
| Blocked by | none for the current catalog. The Move effective date is decided (R1: 2026-11-09). |
| Acceptance | A configuration change never rewrites a finalized contract. Unapproved tier codes are not activated (only Bronze B1, Silver S1, Gold G1). No prices are invented. |
| Status | Exists (per atlas) |

## F5.2 Contract preparation

| Field | Value |
|---|---|
| Journey | J06 |
| Current | For a submitted customer with an active plan and available scheme: no open or finalized duplicate contract. Prepare creates a Draft. The preparer can edit Draft or Returned, capture the accepted schedule and submit. Submit records a linked Pending Sale. |
| Target | Same, with the approved template. Sellers do not prepare contracts (follow-up 6; doc 05 section 11): the Clerk prepares and the Administrator approves. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Duplicate contracts are refused. A seller (IST or OST) cannot prepare, edit or submit a contract. The seeded contract list test currently fails (see the session snapshot, "CTR-4"); investigate before relying on it. |
| Status | Exists (per atlas) |

## F5.3 Contract review and finalization

| Field | Value |
|---|---|
| Journey | J06 |
| Current | Start Review is a review action. Return requires a reason. Finalization checks authority, configured terms, an approved arrangement if one applies, a nonempty schedule, acceptance and classification. A verified reservation is not a finalization gate in the current mock. Finalize creates a Pending membership if needed and reconciles the sale with already-verified money. Non-Standard finalization is blocked in the current mock until the two-step approval of doc 05 section 10.2 is built. |
| Target | Finalize and hand off the approved contract. Keep the sale, settlement, payout and membership milestones separate. Non-Standard is decided (R1, doc 05 section 10.2, items 15, 17 and 20): only price and schedule may differ, a written justification is recorded, the Administrator or Super Administrator approves, then Finance confirms (only the Super Administrator may do both), there is no price floor, and commission uses the actual TCP. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Each prerequisite, when missing, blocks finalization with a specific message. A finalized contract is immutable. A Non-Standard contract cannot be finalized without both approvals; a rejection at either step returns it to Returned with a reason; a later price or schedule change returns it to approval; each step is audited separately (doc 05 section 20, item 30). |
| Status | Exists (per atlas) |

## F5.4 Reservation

| Field | Value |
|---|---|
| Journey | J06, J05 |
| Current | Reservation date and proof are captured in the customer wizard. Submission is a payment claim (see FP6). |
| Target | Same. Reservation submission can succeed or fail independently of customer submission. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | A failed reservation claim leaves the saved customer and contract intact and can be retried separately. |
| Status | Exists (per atlas) |

## F5.5 Sales milestones

| Field | Value |
|---|---|
| Journey | J06, J07 |
| Current | The platform has Confirmed Sale. There is no complete Closed Deal, late-period, replacement or cure workflow. `src/modules/finance/milestones.ts` changed in `fc060bb`. |
| Target | Per R7: a sale counts at 25% collected (Closed Deal), replacing the D25 rule. Months are closed and late receipts go into the first open month. A sale with no payment for 90 days is listed and an Administrator marks it Defaulted. Keep the platform Confirmed Sale and derive all measures from one verified ledger with linked reversals. Follow-up 3: the sale counts at 25% once the Administrator approves the sale record; contract finalization is tracked separately and is not required (doc 05 item 18). The Stage 1 stamp date is the later of the triggering receipt's date and the latest counted receipt (OCT O3; follow-up 17). A sale that is not Active loses its Closed Deal (OCT R33). |
| Layer | Frontend (mock) |
| Blocked by | none (the code still stamps by approval date; aligning it with OCT O3 is a separate task, decision D-B) |
| Acceptance | One ledger source, no double-counting (doc 13). A sale reaches 25% counted only after the Administrator approves the sale record, without waiting for contract finalization. The stamp date follows the OCT O3 rule once aligned. A non-Active sale loses its Closed Deal. A sale with no payment for 90 days is listed and an Administrator marks it Defaulted. |
| Status | Partial |

## F5.6 Unified VIP number and RA

| Field | Value |
|---|---|
| Journey | J06 |
| Current | Verify against the code. Format `YYMMDDNNNNNVTPMMS` per doc 06. |
| Target | Per R2 (NUM v6.2): one VIP Number for the Reservation Agreement, the Grant and the Card, issued when the signed Reservation Agreement is recorded, with a monthly sequence. Validity starts on the Card Claim Date (or the first anniversary of full settlement if unclaimed). Issuance pauses while an applicable approved DSC or DRI rate is missing; an explicitly approved zero is a rate (doc 06 section 3, doc 08 section 9.1). The Customer ID `YYYY-NNNN` identifies the person only and is never the VIP Number. Preserve historical identifiers and never reuse a number. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | No duplicates. No competing serial allocator. Issued numbers are preserved. A repeated request returns the existing number; activation and card claim never create one. Issuance is refused (paused) when the closing seller's DSC rate or a recorded referrer's DRI rate is missing, resumes when an Administrator or Super Administrator records it, and is not paused by an approved zero rate (doc 06 section 18, item 41). Validity starts on the Card Claim Date (doc 06 section 4.3). |
| Status | Decided (R2); verify against the code |

## F5.7 IGP flow

| Field | Value |
|---|---|
| Journey | J06 |
| Current | No IGP page exists. The workbook IGP process is documented (U10). |
| Target | Per R13 (doc 14): IGP is in scope and built together with VIP, for AFhomes-channel sales only, with a 16-character Series Number. The build needs authorization. |
| Layer | Frontend (mock) |
| Blocked by | none for the flow; the band code above PHP 9M and the signed Grant terms are open (decisions-and-gaps "Still open") |
| Acceptance | See doc 14 sections 5 to 9: 16-character Series Number with its own monthly sequence, JA&D ID stored separately, a TCP over PHP 9M blocked until a band code exists, a seller without a JA&D accreditation number cannot be salesperson or referrer, and commission released 40% at 40% collected and the rest at full payment. Grant paperwork is tracked as a checklist only. |
| Status | Decided (R13), missing in code; needs build authorization |

## Out of scope

Payment verification (FP6), commissions (FP8), card activation (FP9).
