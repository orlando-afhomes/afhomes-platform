# FP5: Products, Contracts and Sales

- Atlas journey: J06 Catalog, contract, reservation and sales (module: Products, contracts and sales)
- Objective: the controlled product catalog, contract preparation, review and finalization, and the sales milestones.
- Business rules: `docs/business-rules/05-vip-products-and-contracts.md` sections 10 to 13 and amendment; `06-vip-card-issuance.md` sections 4 and 6 to 9; `13-sales-performance-reporting.md` sections 3 to 6. Workbook references: NUM sections 2 to 6 and 9, OCT R31, R38, O2, OPS section 4.2.
- Depends on: FP4.
- Decision items (all decided on 2026-11-12 except G08, G09 and U07; see `decisions-and-gaps.md`): G03, G05 (Conflicting), G06, G07, G12. From `AGENTS.md` section 5: Gold installment price, unfinished Silver amount, Non-Standard contract authorization.

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
| Current | An authorized administrator edits approved product terms and configuration. Values are validated. Finalized contracts keep their terms. Standard Move A and Move B terms and Card ID mappings are recorded in docs 05 and 06. |
| Target | Choose versioned product terms and the applicable contract template. Show the conflict between the doc 07 amendment item 7 and doc 05 item 12 on per-contract Move approval. |
| Layer | Frontend (mock) |
| Blocked by | none for the current catalog. The Move effective date and template are a separate decision (G06 (decided R6)). |
| Acceptance | A configuration change never rewrites a finalized contract. Unapproved tier codes are not activated (only Bronze B1, Silver S1, Gold G1). No prices are invented. |
| Status | Exists (per atlas) |

## F5.2 Contract preparation

| Field | Value |
|---|---|
| Journey | J06 |
| Current | For a submitted customer with an active plan and available scheme: no open or finalized duplicate contract. Prepare creates a Draft. The preparer can edit Draft or Returned, capture the accepted schedule and submit. Submit records a linked Pending Sale. |
| Target | Same, with the approved template. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Duplicate contracts are refused. The seeded contract list test currently fails (see the session snapshot, "CTR-4"); investigate before relying on it. |
| Status | Exists (per atlas) |

## F5.3 Contract review and finalization

| Field | Value |
|---|---|
| Journey | J06 |
| Current | Start Review is a review action. Return requires a reason. Finalization checks authority, configured terms, an approved arrangement if one applies, a nonempty schedule, acceptance and classification. A verified reservation is not a finalization gate in the current mock. Finalize creates a Pending membership if needed and reconciles the sale with already-verified money. Non-Standard authorization stays blocked. |
| Target | Finalize and hand off the approved contract. Keep the sale, settlement, payout and membership milestones separate. |
| Layer | Frontend (mock) |
| Blocked by | Non-Standard authorization (owner decision) |
| Acceptance | Each prerequisite, when missing, blocks finalization with a specific message. A finalized contract is immutable. |
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
| Target | Per R7: a sale counts at 25% collected (Closed Deal), replacing the D25 rule. Months are closed and late receipts go into the first open month. A sale with no payment for 90 days is listed and an Administrator marks it Defaulted. Keep the platform Confirmed Sale and derive all measures from one verified ledger with linked reversals. |
| Layer | Owner decision |
| Blocked by | G07 (decided R7) |
| Acceptance | After the decision: one ledger source, no double-counting (doc 13). |
| Status | Partial |

## F5.6 Unified VIP number and RA

| Field | Value |
|---|---|
| Journey | J06 |
| Current | Separate RA and an activation-based Card ID. Format `YYMMDDNNNNNVTPMMS` per doc 06. |
| Target | Preserve historical identifiers. Approve the issuance trigger and namespace before new real numbers. |
| Layer | Owner decision |
| Blocked by | G05 (decided R2) |
| Acceptance | No duplicates. No competing serial allocator. Issued numbers are preserved. |
| Status | Decided, awaiting build authorization |

## F5.7 IGP flow

| Field | Value |
|---|---|
| Journey | J06 |
| Current | No IGP page exists. The workbook IGP process is documented (U10). |
| Target | Scope decision first. If included, show it in the manual view and add a flow after approval. |
| Layer | Owner decision |
| Blocked by | G12 (decided R11 to R13), U10 (decided R13) |
| Acceptance | To be defined after the decision. |
| Status | Missing |

## Out of scope

Payment verification (FP6), commissions (FP8), card activation (FP9).
