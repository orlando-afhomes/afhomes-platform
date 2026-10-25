# AFHomes Platform — VIP Products and Contracts Business Rules

> Single source of truth for **VIP product management, payment schemes, contract classification, contract creation/approval, and contract lifecycle**.
> VIP Card Issuance: `docs/business-rules/06-vip-card-issuance.md`.
> Customer Management: `docs/business-rules/04-customer-management.md`.
> Sales Network: `docs/business-rules/02-sales-network-and-genealogy.md`.
> Sales Performance: `docs/business-rules/13-sales-performance-reporting.md`.

---

## 1. Purpose and Scope

This document defines the approved VIP Product and Contract business rules for AFHomes Platform.

It governs VIP tier management, product configurations, pricing and benefits, payment schemes, contract classification, customer VIP selection, contract creation and approval, contract lifecycle, product configuration versioning, and cross-module responsibilities.

It does not define Finance verification internals, Stay Points calculation, commission calculations, or refund/cancellation penalty rules. Those belong to their respective modules.

---

## 2. Module Boundaries

- **VIP Product Management** owns catalog offerings, pricing, benefits, payment scheme associations, availability, and configuration versions.
- **Customer Management** captures VIP Plan, Contract Classification, and Payment Scheme selections without inventing commercial rules.
- **Sales Network** preserves original salesperson, recommender, and team attribution.
- **Finance** owns payment verification, collections, balances, reversals.
- **VIP Membership** owns membership status, validity, and benefits evaluation.
- **Stay Points** owns entitlement evaluation, release, balance accounting, and redemption.

---

## 3. Approved VIP Product Management

VIP product configurations must be Admin-manageable. Authorized Admin personnel may create new VIP tiers, edit existing configurations, configure official tier codes, pricing, validity periods, benefits, available payment schemes, required payment amounts and terms, and control availability for new purchases.

All administrative modifications require audit history.

### 3.1 Historical Contract Protection

Administrative changes must not retroactively alter an existing finalized or signed contract. Every finalized contract must preserve its original agreed terms: VIP tier and product code, product configuration version, agreed purchase price, approved discount/promotion if applicable, payment scheme, payment schedule, contract classification, validity entitlement, contract-specific benefits, and applicable terms and conditions.

New pricing or benefits apply only to transactions eligible under the new configuration. Do not overwrite prior contract terms when Admin updates the current catalog.

### 3.2 Product Retirement

A tier may be made unavailable for future sales without deleting its historical identity. Existing contracts, memberships, card identifiers, and sales remain preserved. Do not destructively delete products referenced by existing records.

---

## 4. Official and Historical VIP Tier Catalog

Established AFHomes Platform VIP tiers:

| VIP Tier | Code |
|---|---|
| Bronze | B1 |
| Silver | S1 |
| Gold | G1 |

Historical ID Generator also references:

| Product | Code |
|---|---|
| Standard Bronze | B1 |
| Super Bronze | B2 |
| Standard Silver | S1 |
| Super Silver | S2 |
| Gold | G1 |
| Elite Prime | P1 |
| Elite Royale | R1 |

Reserved identifiers: G2, P2, R2.

A product code appearing in a historical workbook does not automatically mean the product is approved for sale. Distinguish active/approved products, configurable future products, historical products, reserved product codes, and products requiring additional commercial approval. Do not automatically activate B2, S2, P1, R1, G2, P2, or R2 merely because they appear in the historical reference.

### 4.1 Dynamic Tiers

AFHomes Platform explicitly allows Admin to create additional VIP tiers. Each new tier requires unique product identity, unique approved product code, defined price, defined validity entitlement, defined benefits, available payment schemes, appropriate configuration status, and audit history.

Validate compatibility with the existing VIP Card ID structure, which contains a two-character product-code segment. Do not silently redesign or expand this code segment without approval. If future tier-code requirements exceed the existing format, document as a versioned numbering decision requiring explicit approval.

---

## 5. Standard VIP Product Reference

October 2026 standard-pricing contracts describe these baseline terms:

| Contract Term | Bronze | Silver | Gold |
|---|---:|---:|---:|
| Standard price (Section II / Annex A) | ₱72,000 | ₱240,000 | ₱390,000 |
| Total validity | 7 years | 12 years | 22 years |
| Base + extension | 5 + 2 years | 10 + 2 years | 20 + 2 years |
| VIP discount | 15% | 20% | 25% |
| Annual gift cycles | 5 | 10 | 20 |
| Potential lifetime Stay Points | 50,000 | 200,000 | 500,000 |
| Points per qualifying cycle | 10,000 | 20,000 | 25,000 |
| Weekday points per cycle | 7,000 | 14,000 | 17,500 |
| Weekend points per cycle | 3,000 | 6,000 | 7,500 |
| Qualifying spend per cycle | ₱1,000 | ₱2,000 | ₱3,000 |
| Primary cardholders | 1 | 1 | 1 |
| Supplementary cardholders | 0 | 0 | 1 |

Gold supplementary holder must be an eligible immediate-family member and shares the same membership benefits and points pool. Do not double the Gold Stay Points allocation.

These figures are values stated in referenced standard-pricing contract sections. They are not permission to silently correct contradictory contract text or overwrite historical transactions. Distinguish contract-stated values, current approved catalog values, promotional prices, historical purchase prices, and future Admin-edited configurations.

Stay Points and related benefits remain subject to approved conditions in governing contracts. Do not equate maximum potential points with immediately available, redeemable points. Do not invent a fixed points-to-peso conversion. Do not automatically treat a new VIP product as having the same benefits as Bronze, Silver, or Gold.

---

## 6. Contract Source Conflicts — Mandatory Review

The October 2026 contract reference identifies critical inconsistencies.

### 6.1 Gold Contract Price

The Gold standard contract records ₱390,000 in Section II and Annex A, and ₱780,000 in Section IV. This is a contractual inconsistency.

### 6.2 Silver Contract

The referenced Silver contract contains an unfinished amount placeholder in Section IV.

Do not silently rewrite these provisions. Do not publish an inconsistent document as a finalized legal agreement. Document the exact discrepancy, source revision, affected tier, and required management-approved correction. Historical signed contracts must retain their actual executed terms.

### 6.3 Contract Versioning

Future approved contract masters must have contract type, revision/version, effective date, approved source document, applicable product configuration, and recorded approval authority. A change to an active contract master must not silently rewrite an existing executed agreement.

---

## 7. Customer Creation — VIP Information

Customer Management business rules must recognize three separate configurable selections:

1. VIP Plan (dropdown sourced from eligible Admin-configured VIP tiers)
2. Contract Classification (dropdown: Standard — S; Non-Standard — N)
3. Payment Scheme (dropdown sourced from official company payment scheme definitions and approved Admin configurations)

Do not replace these dropdowns with uncontrolled free-text entries.

All three selections may remain blank when saving a completely empty or partially completed Draft. Do not make them required for Save as Draft. Submission and contract-finalization validation are separate concerns.

---

## 8. Official Payment Scheme Source Values

The supplied membership workbook includes:

| Source Option | Payment Scheme |
|---|---|
| Spot cash | Spot Cash |
| Move a | Move A |
| Installment 4_month | 4-Month Installment |
| Move b1 40 12 | Move B1 |
| Move b2 25 12 | Move B2 |

These values must not be omitted merely because a previous interface included only Spot Cash and Installment. Extract the complete list of approved company payment schemes from available business-rule documents. Do not assume the five values above are necessarily the only options across all source documents.

Produce a canonical option register containing: official display label, stable machine identifier, documented historical label, applicable VIP tier, payment category, required initial payment, down payment, installment duration, installment schedule, commercial status, relevant source document. Only populate commercial terms and applicability when supported by actual approved documents or configurations. Do not infer the financial meaning of Move A, Move B1, or Move B2 from their labels alone. Do not invent percentages, deposit requirements, or amortization formulas.

### 8.1 Admin-Configurable Payment Schemes

Authorized Admin may create payment schemes, manage availability, associate schemes with selected VIP tiers, configure required initial payment, down payment, installment terms, and applicable amounts or percentages according to company policy. Existing finalized contracts retain the agreed payment schedule. Do not retroactively replace historical contract schedules with newly configured values.

---

## 9. Payment Scheme vs Payment Type

These must be distinct fields.

**Payment Scheme** defines the customer's contractual payment arrangement (e.g., Spot Cash, Move A, 4-Month Installment, Move B1, Move B2).

**Payment Type / Method** represents how a payment is made. Historical membership workbook includes: Cash, Bank Transfer, GCash, Maya, Card, Cheque. Payment Type does not automatically define the customer's contractual installment schedule. Preserve the payment-type list from official company documentation. Finance remains responsible for verifying actual payment transactions. A selected payment method must never be treated as proof that a payment was received.

---

## 10. Standard and Non-Standard Contracts

AFHomes Platform Customer Creation must expose Standard — S and Non-Standard — N.

**Standard contract** uses an applicable company-approved contract offering and approved terms. An Admin-configured product or payment scheme does not become Non-Standard merely because it differs from an earlier product configuration.

**Non-Standard contract** represents a contract that requires individually applicable special or non-standard terms according to company policy. Do not invent approval thresholds, special discount limits, authorized exceptions, Non-Standard pricing formulas, Non-Standard commission formulas, or special Finance exemptions.

### 10.1 Historical Limitation

Older ID Generator rules reserve N but state that Non-Standard issuance was disabled pending a separately reviewed operational workflow. The business owner now requires Standard/Non-Standard to appear as selectable classifications. Reconcile: UI specification must include both; draft selection of either is allowed; classification must be recorded accurately; selecting Non-Standard does not automatically authorize contract finalization; Non-Standard issuance remains subject to approved commercial rules; if those rules have not been approved, document the finalization and issuance hold. Do not silently enable unsupported commercial exceptions.

---

## 11. VIP Contract Creation and Approval

Approved workflow:

1. Authorized Staff or IST prepares the VIP contract.
2. Required customer and purchase information is completed.
3. Applicable product and payment terms are selected.
4. The contract is submitted for approval.
5. Authorized Admin reviews the contract.
6. Authorized Admin approves finalization or returns it for correction.
7. An approved contract becomes Finalized.

**Authority:** Authorized Staff and IST may prepare contracts, submit contracts, correct returned contracts, and resubmit contracts. Only authorized Admin may approve final contract finalization. IST Sales Network designation alone does not grant contract approval authority.

**Required contract validations:** A contract cannot be finalized without valid customer reference, valid eligible VIP product, applicable product configuration, valid contract classification, approved payment scheme and terms, required contract information, appropriate customer acceptance, and authorized Admin approval. Do not invent additional signed-document requirements if the official contract workflow does not specify them.

**Immutable terms:** Once finalized, preserve the agreed contract snapshot. Subsequent changes to product pricing, benefits, payment schemes, or tier validity must not silently mutate finalized contract terms.

---

## 12. VIP Contract Lifecycle

Conceptual states:

- Draft
- Submitted
- Under Admin Review
- Returned for Correction
- Finalized
- Cancelled, where authorized

Draft contracts may be incomplete. Submitted contracts require appropriate information for Admin review. Returned contracts may be corrected and resubmitted. Finalized contracts preserve agreed commercial terms and approval history. Cancelled contracts retain historical references. Do not invent refund or cancellation penalty rules. Reconcile exact system enums with existing documentation before establishing implementation requirements.

---

## 13. Sales Confirmation vs Contract Finalization

A Finalized contract does not automatically mean Finance verified payment, customer fully paid, VIP membership activated, VIP benefits usable, or official activated VIP Card ID generated.

Confirmed Sales requires BOTH: (1) a finalized VIP contract, and (2) Finance verification of the payment required by the selected payment scheme. For installment contracts, Confirmed Sales may occur before full settlement if the required initial contractual payment has been verified.

Sales Network reporting measures the full confirmed contract value under its approved rules. Finance separately manages actual collections and outstanding balances. Do not collapse Confirmed Sales into Active VIP Membership.

---

## 14. Benefits and Membership Entitlements

Every VIP tier must have a defined benefits configuration. Existing Bronze, Silver, and Gold contracts provide reference values for discount percentage, priority reservation privileges, eligible venue scope, entrance privileges, cardholder limitations, supplementary holder eligibility, membership validity, annual Welcome Gift cycles, Stay Points allocation, and qualifying spend requirements.

Do not duplicate the full Stay Points calculation engine inside VIP Product Management. The VIP Product module owns contractual entitlement definitions and version snapshots. The Stay Points module owns actual entitlement evaluation, release, balance accounting, and redemption.

Restrictions: do not claim points are guaranteed immediately on activation, are automatically available in the full lifetime amount, can universally be converted into cash, can be redeemed at unauthorized third-party venues, or can bypass contractual qualifying-spend requirements. Preserve finalized contract benefit terms even when Admin edits a VIP tier.

---

## 15. Customer, RA No., Contract, Card, and Membership Relationships

These are distinct business concepts:

- **Customer** — permanent customer identity.
- **RA No.** — applicable official RA reference and its numeric sequence.
- **VIP Product** — configurable catalog offering.
- **VIP Application / Purchase** — customer's intended or actual VIP transaction.
- **VIP Contract** — finalized legal and commercial terms.
- **Pending VIP Card Record** — membership/card record before official activation; not an issued final VIP Card ID.
- **Official VIP Card ID** — final 17-character identifier created using actual activation date and RA-derived sequence.
- **VIP Membership** — membership status, validity, and benefits.
- **Finance Payments** — separately verified financial events.

Do not merge all of these into a single status or identifier. A customer may have multiple VIP-related transactions without requiring a new customer identity for each purchase. Preserve the proper RA-to-purchase-to-contract-to-membership relationship.

---

## 16. Finance Integration

Finance owns receipt recording, payment verification, installment collections, outstanding balances, full-payment confirmation, payment reversals, and financial reconciliation.

Membership activation must not rely only on user-submitted payment claims. Activation requires verified full settlement of the agreed contract price. The actual membership activation date must be recorded independently from the original payment claim or collection date.

Confirmed Sales may occur before membership activation per approved Sales Network rules. Do not redefine Confirmed Sales as Fully Paid VIP Membership. Do not invent refund percentages, cancellation penalties, or commission clawback rules.

---

## 17. Sales Network Integration

Approved AFHomes Sales Network: IST SVD → SSM → SM; OST members may report directly to SVD, SSM, or SM. Only Authorized Staff and IST may register new customers. OST may be selected as actual Referrer / VIP Recommender. For direct IST sales, an OST recommender is optional.

VIP Contract workflows must preserve original salesperson, actual recommender, original selling team, applicable genealogy attribution, and historical team relationship. Sales Network transfers must not retroactively reassign historical sales ownership. Commission calculation remains in its own business-rule document.

---

## 18. Admin Product Management Permissions

Product configuration management is restricted to authorized administrative personnel. The module must respect the approved Organization Management role system. Administrative privileges include permitted management of VIP tiers, tier availability, product prices, product benefits, payment schemes, and contract configuration templates. Administrative access must not be inferred merely from IST designation. Configuration management, contract preparation, contract approval, and membership activation must have clearly distinguished authorities.

Audit requirements: record authorized actor, time of change, previous value, new value, relevant configuration version, effective date where applicable, and reason or supporting approval where required. Historical finalized contract terms must remain traceable.

---

## 19. Reconciliation Report (Summary)

| Subject | Sources to reconcile | Approved AFHomes Platform decision / status |
|---|---|---|
| VIP products | Current approved tiers vs historical catalog | B1/S1/G1 active; B2/S2/P1/R1/G2/P2/R2 not auto-activated |
| Dynamic tiers | New business decision vs two-character tier codes | Admin can create tiers; validate compatibility with VT segment |
| Payment schemes | Official workbook options vs Admin-configurable offers | Recognize all five; complete canonical register from approved docs |
| Contract classification | S/N selection vs legacy Non-Standard restriction | Both selectable; Non-Standard finalization subject to approved commercial rules |
| Contract prices | Gold and Silver source inconsistencies | Reported, not silently corrected; management-approved correction required |
| VIP Card ID | Revised activation-based format vs legacy transaction-date format | Use actual activation date for YYMMDD |
| VIP sequence | RA No. NNNN → VIP NNNNN vs independent legacy counter | RA-derived, no independent counter |
| RA scope | RA uniqueness and possible collision scenarios | Flag collisions; do not fabricate |
| Card issuance | Final activated ID vs earlier contract-stage issuance proposal | Final ID only upon successful activation |
| VIP activation | Full Finance-verified payment prerequisite | Required |
| Validity start | New activation-date policy vs old Card Claim Date rule | Use activation date; document conflict |
| Customer form | VIP dropdowns and blank Draft behavior | Three dropdowns; blank Draft preserved |
| Sales recognition | Confirmed Sales vs Active VIP Membership | Remain separate |

---

## 20. Acceptance Criteria

Given / When / Then for core scenarios (see Section 28 of the master prompt for full list). Key:

1. Admin creates a VIP tier.
2. Admin edits product pricing for future purchases; existing finalized contract price remains unchanged.
3. Admin updates benefit configurations; historical benefit terms preserved.
4. Admin manages payment schemes per VIP tier.
5. Customer selects VIP Plan, Standard/Non-Standard, and documented payment scheme.
6. Completely blank Customer Draft is saveable.
7. Authorized Staff/IST prepares contract; Authorized Admin approves finalization.
8. Unauthorized users cannot finalize contracts.
9. Returned contracts can be corrected and resubmitted.
10. Contract finalization preserves approved commercial terms.
11. Contract finalization alone does not issue a final activated VIP Card ID.
12. Partial payment does not activate membership.
13. Full payment without Finance verification does not activate membership.
14. Finance-verified full settlement satisfies financial activation prerequisite.
15. Actual successful activation date becomes date source for YYMMDD.
16. RA sequence 0001 maps to VIP sequence 00001; 0123→00123; 9999→09999.
17. No independently incremented VIP sequence is used.
18. VIP Card ID cannot be officially generated without valid associated RA sequence.
19. Complete official VIP Card ID remains exactly 17 characters and unique.
20. RA sequence collision/ambiguous mapping cannot silently produce duplicate Card ID.
21. Spot Cash uses C01 where applicable; installment codes use actual approved term values.
22. Generated VIP ID remains associated with correct customer, RA No., contract, membership.
23. Repeated activation processing does not generate multiple VIP IDs.
24. Previously issued historical IDs are never silently renumbered.
25. New activation-date numbering does not retroactively rewrite legacy IDs.
26. Confirmed Sales and Active VIP Membership remain separate.
27. Gold supplementary holder uses shared membership pool.
28. Conflicting older Card Claim Date clauses explicitly documented.
29. Gold/Silver contract source discrepancies reported rather than silently corrected.
30. Unsupported Non-Standard finalization cannot bypass applicable authorization.

---

## Completion Report

- **Files created/updated:** `docs/business-rules/05-vip-products-and-contracts.md`
- **Approved rules covered:** VIP product management, payment schemes, contract classification, contract approval, RA-derived numbering (cross-ref), membership activation (cross-ref), card ID issuance (cross-ref), VIP validity.
- **Official dropdown source mapping:** VIP tiers B1/S1/G1 (plus historical/reserved); payment schemes Spot Cash, Move A, 4-Month Installment, Move B1, Move B2 (plus Admin-configurable); payment types Cash, Bank Transfer, GCash, Maya, Card, Cheque; contract classifications Standard (S), Non-Standard (N).
- **Outstanding approval dependencies:** Gold/Silver contract price corrections, Non-Standard commercial rules, complete payment scheme canonical register from approved docs, tier-code format expansion if needed.
- **Validation:** All required sections included; no invented commercial terms; documentation only. No code, database, Git, or deployment changes.