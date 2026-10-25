# AFHomes Platform — VIP Card Issuance Business Rules

> Single source of truth for **Official VIP Card ID generation, RA No. relationship, activation-date-based numbering, issuance eligibility, card lifecycle, membership activation and validity, historical identifier preservation, and audit requirements**.
> VIP Products and Contracts: `docs/business-rules/05-vip-products-and-contracts.md`.
> Customer Management: `docs/business-rules/04-customer-management.md`.
> Sales Network: `docs/business-rules/02-sales-network-and-genealogy.md`.
> Sales Performance: `docs/business-rules/13-sales-performance-reporting.md`.

---

## 1. Purpose and Scope

This document defines the approved VIP Card Issuance and Membership Activation business rules for AFHomes Platform.

It governs official VIP Card ID generation, RA Number and VIP sequence relationship, activation-date-based numbering, issuance eligibility, card lifecycle, membership activation, membership validity, membership expiration, historical identifier preservation, and card issuance and activation audit requirements.

It does not define Finance verification internals, Stay Points calculation, commission calculations, or refund/cancellation penalty rules.

---

## 2. Module Boundaries

- **VIP Card Issuance** owns final official VIP Card ID assignment upon successful membership activation, permanent identifier preservation, and issuance audit.
- **VIP Membership** owns membership status, validity, and benefits evaluation.
- **Finance** owns full-payment verification prerequisite.
- **Customer/RA** owns RA No. and its sequence.
- **VIP Products/Contracts** owns finalized contract terms and product configuration.

---

## 3. VIP Card Record vs Official VIP Card ID

The customer may have a prepared VIP card record or pending card issuance eligibility after Admin contract finalization. However, the **FINAL OFFICIAL VIP CARD ID must not be generated before actual official Membership Activation**.

Reason: the official VIP Card ID contains YYMMDD = Actual Membership Activation Date. The correct date is not known before activation.

Separate: (1) Customer record, (2) RA No., (3) VIP contract, (4) Prepared/pending VIP card record, (5) Official VIP membership activation, (6) Final official VIP Card ID.

A prepared card record is not the same as an officially activated VIP Card ID. Do not place a guessed future activation date in an official Card ID. Do not generate an official Card ID using contract approval, reservation, first payment, or card preparation date. The earlier proposal allowing a final Card ID immediately after Admin contract approval is superseded by this revised date-based numbering rule.

---

## 4. VIP Membership Activation and Validity

### 4.1 Approved Activation Conditions

Membership activation requires:

1. Finalized contract approved by authorized Admin.
2. Full payment of the entire agreed VIP contract price.
3. Verification of full payment by Finance.
4. Successful official membership activation.

Partial payments and installments do not activate VIP membership.

### 4.2 Actual Activation Date

Use the actual official Membership Activation Date, recorded in Philippine local time (Asia/Manila). Do not assume the activation date is always identical to the original payment date. Do not automatically backdate the official activation date to the date of the final installment if verification or actual activation occurred later.

### 4.3 Membership Validity

Membership validity begins on the actual Membership Activation Date. It does not begin merely because a reservation was created, an RA No. was assigned, a contract was prepared/finalized, a customer paid an installment, full payment was claimed but not verified, or a pending card record was prepared.

Example: Gold VIP validity entitlement 22 years. Actual membership activation March 20, 2027. Scheduled expiration anniversary March 20, 2049, subject to applicable approved expiration boundary convention. The VIP Card ID must encode 270320 as its first six characters.

### 4.4 Important Legacy Contract Conflict

The October 2026 standard contracts describe a different validity-start rule based on Card Claim Date. This differs from the approved AFHomes Platform Membership Activation Date rule. Document both and require appropriate revised, management-approved contract language before using the new rule in legally operative agreements. Preserve historical signed contracts and their original validity provisions.

---

## 5. VIP Membership Status

Customer identity and VIP membership status are separate. Document the distinction between No membership yet, Pending / Not Activated, Active, Expired, and Cancelled (where applicable).

A customer whose membership expires remains a customer. Preserve Customer ID, RA No., contract, official VIP Card ID, membership history, Finance history, historical benefits, and audit trail. Do not automatically delete or replace expired membership records. Do not invent automatic membership renewal or extension rules.

---

## 6. Official VIP Card ID Format — Revised

Retain the structured 17-character official VIP Card ID:

**YYMMDDNNNNNVTPMMS**

Revised segment definitions:

| Segment | Length | APPROVED SOURCE |
|---|---:|---|
| YYMMDD | 6 | Actual official VIP Membership Activation Date |
| NNNNN | 5 | Existing RA No. NNNN sequence converted to five digits |
| VT | 2 | Approved VIP tier code |
| P | 1 | Payment category |
| MM | 2 | Approved payment-term code |
| S/N | 1 | Contract classification |

### 6.1 YYMMDD

YYMMDD is no longer reservation date, transaction date, contract signing date, contract approval date, first payment date, or card preparation date. It is the actual official Membership Activation Date after finalized contract and Finance-verified full payment.

Format: YY = last two digits of activation year; MM = activation month; DD = activation day. Use Philippine local date, Asia/Manila. Never use an estimated or planned activation date.

### 6.2 NNNNN MUST FOLLOW THE RA NO. SEQUENCE

The five-digit VIP sequence is no longer an independently generated counter. It must come from the corresponding customer's official RA No. sequence. The source RA No. sequence uses four digits (NNNN). The VIP Card ID uses five digits (NNNNN). Convert by left-padding the same numeric sequence with one leading zero.

Examples:

| Official RA No. sequence | VIP Card sequence |
|---|---|
| 0001 | 00001 |
| 0002 | 00002 |
| 0010 | 00010 |
| 0123 | 00123 |
| 1000 | 01000 |
| 9999 | 09999 |

If the official RA No. is 2027-0001, the RA sequence component is 0001, and the VIP Card ID sequence component becomes 00001. Do not use the full formatted RA No. inside the VIP Card ID. Use only its official four-digit sequence component. Do not assign another unrelated VIP sequence.

**The RA No. sequence is the source of the VIP Card ID sequence.** Do not create a separate VIP sequence counter, an unrelated VIP yearly counter, a second VIP sequential allocator, a manually assigned VIP sequence, or an independently incremented VIP Card ID number. The system must reuse the existing official RA sequence and convert it to the required five-character representation.

### 6.3 Payment Codes (P + MM)

Spot Cash: C01 (C = Cash; 01 = fixed cash duration code; the 01 is not a one-month installment obligation).

Installments: T + two-digit installment duration (e.g., T04 four-month, T12 twelve-month).

Move A, Move B1, Move B2, and other company payment offers may have distinct names and terms. Validate how each approved payment scheme maps to the official card identifier's payment category and term segments. Do not guess the duration from a marketing label. Do not assign arbitrary installment codes. The finalized contract must preserve the selected verified payment terms used for official issuance.

### 6.4 Contract Classification (S/N)

S = Standard, N = Non-Standard. See `05-vip-products-and-contracts.md`.

---

## 7. RA No. and VIP Card ID Relationship

The RA No. is an existing official customer/reservation agreement reference according to applicable RA numbering business rules. It must retain its own official format and lifecycle. The VIP Card ID is a distinct official identifier that reuses the RA No.'s four-digit sequence as its numerical component, with additional segments for actual membership activation date, VIP tier, payment category, payment duration, and contract classification.

Relationship rules:

1. Preserve the original RA No.
2. Do not replace the RA No. with the VIP Card ID.
3. Preserve the relationship between RA No., contract, customer, sale, and membership.
4. Do not create a second RA No. for the same transaction merely to allocate a VIP Card ID.
5. Do not alter the RA No. sequence when creating the VIP Card ID.
6. Do not fabricate an RA sequence when no official RA No. exists.
7. Do not independently increment the five-digit VIP sequence.

### 7.1 Missing RA No.

If there is no valid official RA No. or its sequence cannot be reliably extracted, do not fabricate a VIP number. Document the applicable prerequisite or required resolution before official issuance.

### 7.2 Uniqueness and Collision Protection

Inspect the existing RA generator to determine its actual uniqueness scope. Do not assume the four-digit RA sequence is globally unique across all years or all transactions. The complete official VIP Card ID must remain unique. If two distinct memberships would produce the same complete 17-character ID, the system must not silently issue duplicate identifiers, change the RA sequence, or add an unauthorized suffix. Flag the collision for an authorized resolution under the approved numbering policy. If the current RA numbering scope cannot guarantee unique official VIP IDs, report this as a material numbering-design dependency requiring approval before implementation. Do not invent an alternative sequence policy.

---

## 8. Official VIP Card ID Issuance Process — Revised

1. Authorized Staff or IST registers or selects the customer.
2. Customer is associated with an official RA No. through the approved RA workflow.
3. Customer selects an eligible VIP product.
4. Customer selects Contract Classification.
5. Customer selects an approved Payment Scheme.
6. Authorized Staff or IST prepares the VIP contract.
7. Authorized Admin approves the contract.
8. The finalized contract preserves its terms.
9. Customer completes payments under the selected scheme.
10. Finance verifies the entire contract price as fully paid.
11. The membership becomes eligible for official activation.
12. The official membership activation event is completed.
13. The system records the actual Activation Date in Asia/Manila.
14. The official VIP Card ID is composed using Activation Date → YYMMDD; Existing RA No. sequence → NNNNN; VIP Tier → VT; Payment Category → P; Payment Term → MM; Contract Classification → S/N.
15. The official VIP Card ID is permanently linked to the activated membership, customer, RA No., and finalized contract.
16. VIP membership benefits become available according to the finalized contract and applicable benefits rules.

### 8.1 Integrity Requirement

The successful official activation event and final VIP Card ID assignment must be treated as a consistent, nonduplicating operation in the future implementation design. Repeated requests must not create multiple official IDs for the same membership. Do not invent a separate VIP serial allocator.

### 8.2 Important Distinction

A finalized contract may exist without an officially activated VIP Card ID. A partially paid sale may exist without an officially activated VIP Card ID. A Confirmed Sale may exist without an Active Membership. The official activation date and official VIP Card ID must correspond.

---

## 9. Issued Number Preservation and Legacy Data

Once officially issued: do not silently regenerate the VIP Card ID; do not recycle its identifier after cancellation; do not modify the original activation-date segment; do not change the RA-derived sequence segment; do not change the originally encoded tier/payment/classification segments; do not generate another ID because current product configurations changed.

### 9.1 Historical Records

Existing historical issued VIP Card IDs must remain preserved exactly as originally issued. The revised AFHomes Platform numbering policy applies to new eligible issuance under the approved new workflow. Do not automatically rewrite legacy IDs that used transaction dates or independent sequences. Do not alter historical signed agreements. Do not fabricate activation dates for older memberships whose source evidence is incomplete.

### 9.2 Legacy Reconciliation

Document how new and historical identifiers can coexist without mass renumbering. Preserve their provenance, original issuance rules, and canonical business-record relationships. A historical identifier must not be silently reformatted to match the new policy.

---

## 10. Benefits and Membership Entitlements

See `05-vip-products-and-contracts.md` Section 14. VIP Product module owns contractual entitlement definitions and version snapshots; Stay Points module owns actual entitlement evaluation, release, balance accounting, and redemption.

---

## 11. Customer, RA No., Contract, Card, and Membership Relationships

See `05-vip-products-and-contracts.md` Section 15.

---

## 12. Finance Integration

See `05-vip-products-and-contracts.md` Section 16.

---

## 13. Sales Network Integration

See `05-vip-products-and-contracts.md` Section 17.

---

## 14. Admin Product Management Permissions

See `05-vip-products-and-contracts.md` Section 18.

---

## 15. Customer Creation Form Reconciliation

See `05-vip-products-and-contracts.md` Section 7 and `04-customer-management.md`. Customer Creation includes VIP Plan, Contract Classification, and Payment Scheme dropdowns. Blank Draft behavior preserved.

---

## 16. Audit Requirements

Record for card issuance and activation: authorized actor, time of change, previous value, new value, relevant configuration version, effective date where applicable, reason or supporting approval where required. Historical finalized contract terms remain traceable. Card issuance/activation audit must capture activation date, RA sequence source, and final VIP Card ID.

---

## 17. Examples

### Example Official VIP Card ID

RA No.: `2027-0001`; Official Activation Date: `2027-03-20`; VIP Tier: `G1`; Payment Scheme: `C01`; Classification: `S`.

Expected VIP Card ID: **27032000001G1C01S** (17 characters).

Breakdown: YYMMDD 270320; NNNNN 00001; VT G1; P+MM C01; S/N S.

### RA Sequence Conversion Examples

0001 → 00001; 0010 → 00010; 0123 → 00123; 1000 → 01000; 9999 → 09999.

### Validity Example

Gold VIP 22 years; activation March 20, 2027; expiration anniversary March 20, 2049.

---

## 18. Acceptance Criteria

Given / When / Then for core scenarios. Key:

1. Admin creates a VIP tier.
2. Admin edits product pricing for future purchases; existing finalized contract price remains unchanged.
3. Admin updates benefit configurations; historical benefit terms preserved.
4. Admin manages payment schemes per VIP tier.
5. Customer selects VIP Plan.
6. Customer selects Standard classification.
7. Customer selects Non-Standard classification.
8. Customer selects a documented payment scheme.
9. Completely blank Customer Draft is saveable.
10. Authorized Staff prepares a contract.
11. IST prepares a contract.
12. Authorized Admin approves contract finalization.
13. Unauthorized users cannot finalize contracts.
14. Returned contracts can be corrected and resubmitted.
15. Contract finalization preserves approved commercial terms.
16. Contract finalization alone does not issue a final activated VIP Card ID.
17. Partial payment does not activate membership.
18. Full payment without Finance verification does not activate membership.
19. Finance-verified full settlement satisfies the financial activation prerequisite.
20. Actual successful activation date becomes the date source for YYMMDD.
21. The VIP ID's date segment cannot use reservation or contract signing date under revised policy.
22. RA sequence 0001 maps to VIP sequence 00001.
23. RA sequence 0123 maps to VIP sequence 00123.
24. RA sequence 9999 maps to VIP sequence 09999.
25. No independently incremented VIP sequence is used.
26. VIP Card ID cannot be officially generated without a valid associated RA sequence.
27. Complete official VIP Card ID remains exactly 17 characters.
28. Complete official VIP Card ID is unique.
29. An RA sequence collision or ambiguous mapping cannot silently produce a duplicate Card ID.
30. Spot Cash uses C01 where applicable.
31. Installment codes use actual approved term values.
32. Generated VIP ID remains associated with the correct customer, RA No., contract, and membership.
33. Repeated activation processing does not generate multiple VIP IDs.
34. Previously issued historical IDs are never silently renumbered.
35. New activation-date numbering does not retroactively rewrite legacy IDs.
36. Confirmed Sales and Active VIP Membership remain separate.
37. Gold supplementary holder uses the shared membership pool.
38. Conflicting older Card Claim Date clauses are explicitly documented.
39. Gold/Silver contract source discrepancies are reported rather than silently corrected.
40. Unsupported Non-Standard finalization cannot bypass applicable authorization.

---

## 19. Reconciliation Report (Summary)

See `05-vip-products-and-contracts.md` Section 19. Additional card-specific conflicts: activation-date-based numbering vs legacy transaction-date numbering; RA-derived sequence vs independent legacy counter; final ID upon activation vs earlier contract-stage issuance proposal; current vs historical validity-date policies. All resolved per approved AFHomes Platform decisions; historical records preserved.

---

## 20. Outstanding Approval Dependencies

- Gold/Silver contract price corrections.
- Non-Standard commercial rules.
- Complete payment scheme canonical register from approved docs.
- Tier-code format expansion if needed.
- RA numbering scope uniqueness verification.
- Legacy ID reconciliation policy.

---

## Completion Report

- **Files created/updated:** `docs/business-rules/06-vip-card-issuance.md`
- **Approved rules covered:** VIP Card ID generation, RA No. relationship, activation-date-based numbering, issuance eligibility, card lifecycle, membership activation and validity, historical identifier preservation, audit requirements.
- **VIP Card ID generator verification:** YYMMDD = Actual official Membership Activation Date; NNNNN = RA No. four-digit sequence padded to five digits; VT = Approved VIP Tier; P+MM = Approved Payment Category and Term; S/N = Contract Classification. Example: RA No. 2027-0001, Activation Date 2027-03-20, Tier G1, Payment C01, Classification S → **27032000001G1C01S**.
- **Outstanding approval dependencies:** Listed above.
- **Validation:** All required sections included; no invented rules; documentation only. No code, database, Git, or deployment changes.