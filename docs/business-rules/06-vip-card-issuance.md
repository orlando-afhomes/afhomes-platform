# AFHomes Platform — VIP Card Issuance Business Rules

> Single source of truth for **the unified VIP Number (one number for the Reservation Agreement, the Grant and the Card), issuance, card lifecycle, membership activation and validity, upgrades, historical identifier preservation, and audit requirements**.
>
> **Owner ruling R2 (2026-11-12):** this document follows the company numbering guideline `AFhomes_VIP_numbering_guidelines-v6.2` (NUM, effective 4 October 2026) and the signed VIP Grant validity clause. Sections 1 to 9 and 16 to 20 were rewritten on 2026-11-12. The earlier rule (a separate RA No. plus an activation-dated Card ID) is withdrawn; see amendment items 4 to 8.
> VIP Products and Contracts: `docs/business-rules/05-vip-products-and-contracts.md`.
> Customer Management: `docs/business-rules/04-customer-management.md`.
> Sales Network: `docs/business-rules/02-sales-network-and-genealogy.md`.
> Sales Performance: `docs/business-rules/13-sales-performance-reporting.md`.
> IGP Sales: `docs/business-rules/14-igp-sales.md`.

---

## 1. Purpose and Scope

This document defines the approved VIP Card Issuance and Membership Activation business rules for AFHomes Platform.

It governs the VIP Number, its issuance and statuses, card claim and lifecycle, membership activation, membership validity, membership expiration, upgrades, historical identifier preservation, and the related audit requirements.

It does not define Finance verification internals, Stay Points calculation, commission calculations, or refund/cancellation penalty rules.

---

## 2. Module Boundaries

- **VIP Numbering** owns the single monthly VIP Number allocator, number statuses (ACTIVE, UPGRADED, CANCELLED), the "Replaces" chain, and issuance audit.
- **VIP Membership** owns activation, the Card Claim Date, validity and benefits evaluation.
- **Finance** owns the full-settlement verification prerequisite.
- **Customer** owns the customer record and its internal customer id (doc 05 item 4). The VIP Number identifies the transaction, not the person.
- **VIP Products/Contracts** owns finalized contract terms and product configuration.

---

## 3. One Number, Three Documents (NUM §§1, 2, 6)

A single 17-character **VIP Number** is the document control number of the VIP Reservation Agreement, the number of the VIP Grant, and the number printed on the physical VIP Card. There is no separate RA No. and no separately generated Card ID.

- **Issuance trigger.** The number is issued when the signed Reservation Agreement is recorded (NUM §6; owner ruling R2). It is not issued for a Draft, a submitted application or a prepared contract. Before issuance, the tier, the payment scheme (for P and MM), the classification (S/N) and the closing salesperson must be recorded.
- **Issuance is a separate event from activation.** A number exists from reservation onward. Membership activation (section 4) does not create or change the number.
- **One transaction, one number.** Each VIP transaction gets exactly one number. An upgrade is a new transaction with a new number (section 9.3).
- **IGP is separate.** IGP sales never use the VIP Number. They use a separate 16-character IGP Series Number with its own monthly sequence, and carry the seller's JA&D accreditation number (doc 14; owner ruling R13, 2026-11-12). VIP sales use only the AFhomes AA number (section 7).

Separate concepts: (1) customer record, (2) VIP Number and its status, (3) VIP contract, (4) membership activation, (5) Card Claim Date and the physical card.

---

## 4. VIP Membership Activation and Validity

### 4.1 Approved Activation Conditions

Membership activation requires:

1. Finalized contract approved by authorized Admin.
2. Full payment of the entire agreed VIP contract price.
3. Approval of the settling receipts by Finance, an Administrator or the Super Administrator (doc 07 §5.2).
4. Successful official membership activation.

Partial payments and installments do not activate VIP membership.

### 4.2 Actual Activation Date

Use the actual official Membership Activation Date, recorded in Philippine local time (Asia/Manila). Do not assume the activation date is always identical to the original payment date. Do not automatically backdate the official activation date to the date of the final installment if verification or actual activation occurred later.

### 4.3 Membership Validity (signed Grant §I-B(a); owner ruling R2)

The Validity Period starts on the **Card Claim Date**, the date the cardholder actually claims the card.

- The card may be claimed at any time within one year after full settlement of the total purchase price, as evidenced by the company's official acknowledgment of receipt (Finance verification).
- If the card is not claimed within that year, the Card Claim Date is deemed to occur on the first anniversary of full settlement, and validity starts on that date.
- Full settlement means the date of the payment that completes the total price, once Finance has verified it.
- Validity does not start at reservation, number issuance, contract finalization, an installment, unverified full payment or activation.

Validity length follows the signed contract (Bronze 7, Silver 12, Gold 22 years).

Example: Gold, full settlement verified for a payment dated 2027-03-20, card claimed 2027-05-02. Validity runs from 2027-05-02 for 22 years. If the card is never claimed, the deemed Card Claim Date is 2028-03-20.

### 4.4 Contract Version

Each contract keeps the validity clause of the template it was signed on. The Card Claim Date rule above is the clause of the current signed Grant templates. A future template with a different rule applies only to contracts signed on it.

---

## 5. VIP Membership Status

Customer identity and VIP membership status are separate. Document the distinction between No membership yet, Pending / Not Activated, Active (activated, card not yet claimed or claimed), Expired, Upgraded, and Cancelled.

Number status (NUM §6) is kept beside the number, never inside it: ACTIVE, UPGRADED or CANCELLED.

A customer whose membership expires remains a customer. Preserve the customer record, the VIP Number and its status, the contract, membership history, Finance history, historical benefits, and audit trail. Do not automatically delete or replace expired membership records. Do not invent automatic membership renewal or extension rules.

---

## 6. VIP Number Format (NUM §3)

**YYMMDD NNNNN VT P MM S**, 17 characters, no dash. Example: `26020300001B1C01S`.

| Segment | Length | Source |
|---|---:|---|
| YYMMDD | 6 | Date the signed Reservation Agreement is recorded (Asia/Manila) |
| NNNNN | 5 | Monthly running sequence, 00001 to 99999, resets on the 1st of each month |
| VT | 2 | Tier code (B1, S1, G1 active; B2, S2, P1, R1 and others reserved) |
| P | 1 | C = Cash, T = Terms/Installment (snapshot at issuance) |
| MM | 2 | Months, 01 to 36; Cash uses 01 (snapshot at issuance) |
| S | 1 | S = Standard, N = Non-Standard |

### 6.1 Monthly Sequence

- One company-wide allocator issues NNNNN in order of issuance within the month. Numbers are never composed by hand.
- Because the date prefix and the monthly sequence are allocated together, a full VIP Number is unique.
- Confidentiality: the reset each month means a number never reveals more than one month's volume (NUM §6).

### 6.2 Snapshot Rule

The tier, payment and classification segments are a snapshot at issuance and are never edited during the number's life. Later schedule changes are reconciled by Finance; they do not reissue the number (NUM §2). Any change to an issued number requires management approval, recorded by the Super Administrator with a reason, and is audited.

### 6.3 Payment Codes (P + MM)

Spot Cash: C01 (C = Cash; 01 = fixed cash duration code; the 01 is not a one-month installment obligation).

Installments: T + two-digit installment duration (e.g., T04 four-month, T12 twelve-month).

Move A, Move B (B1 and B2 merged by doc 05 item 7), and other company payment offers may have distinct names and terms. The approved Move mappings are in amendment item 3 below. Validate how each approved payment scheme maps to the official card identifier's payment category and term segments. Do not guess the duration from a marketing label. Do not assign arbitrary installment codes. The finalized contract must preserve the selected verified payment terms used for official issuance.

### 6.4 Contract Classification (S/N)

S = Standard, N = Non-Standard. See `05-vip-products-and-contracts.md`.

---

## 7. Salesperson Link (NUM §9)

Only the closing salesperson's AFhomes accreditation number is linked to a VIP Number, written as `VIPNUMBER - AANUMBER` (for example `26020100045S1T12N - AAI26020001`). This applies to IST and OST alike. A referrer is recorded separately on the sale and is not part of this link (doc 04; round R5). A JA&D accreditation number is never linked to a VIP Number.

### 7.1 Cancelled Transactions

A cancelled transaction keeps its number with status CANCELLED. The number is never deleted and never issued again.

---

## 8. Process

1. A seller starts the customer draft, the Clerk completes it, and the Administrator approves it (doc 04 §5); the approved customer is then selected.
2. The tier, classification, payment scheme and closing salesperson are recorded.
3. The signed Reservation Agreement is recorded. The VIP Number is issued once, at this moment, with status ACTIVE.
4. The contract (Grant) is prepared and finalized under the same number (doc 05).
5. The customer pays under the selected scheme. Finance verifies each payment.
6. Finance verifies full settlement. The membership is activated (section 4.1).
7. The card bearing the same number is claimed. The Card Claim Date is recorded and validity starts (section 4.3). If the card is not claimed within one year, the deemed Card Claim Date applies.

### 8.1 Integrity Requirement

Issuance must not run twice for the same transaction. A repeated request returns the existing number. Activation and card claim never create another number.

### 8.2 Important Distinction

A number may exist without a finalized contract, without full payment, and without activation. A Confirmed Sale may exist without an Active Membership.

---

## 9. Issued Number Preservation, Upgrades and Legacy Data

Once issued, a number is never regenerated, never reused (also after cancellation or upgrade), and its segments are never changed without the management approval in section 6.2.

### 9.1 Historical Records

Numbers already issued by the company workbook under NUM keep their exact value and status. A later history import keeps them unchanged. Numbers issued under older rules keep their original form and provenance; they are never reformatted.

### 9.2 Legacy Reconciliation

Old and new numbers coexist without renumbering. Each record keeps the rule it was issued under.

### 9.3 Upgrades (NUM §5; adopted 2026-11-12, flow to be built later)

- An upgrade (for example S1 to S2) is a new transaction. It gets a new number with the next monthly sequence, the new tier code and the upgrade's own payment snapshot.
- The old number becomes UPGRADED. The new record carries "Replaces: old number".
- The old card is recalled and voided, and a new card with the new number is issued.
- The upgrade has its own payment collection, commission and documents, credited to the salesperson who closed the upgrade.
- The upgrade flow is not yet built. It is a later feature card.

---

## 10. Benefits and Membership Entitlements

See `05-vip-products-and-contracts.md` Section 14. VIP Product module owns contractual entitlement definitions and version snapshots; Stay Points module owns actual entitlement evaluation, release, balance accounting, and redemption.

---

## 11. Customer, VIP Number, Contract, Card Claim, and Membership Relationships

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

Record for card issuance and activation: authorized actor, time of change, previous value, new value, relevant configuration version, effective date where applicable, reason or supporting approval where required. Historical finalized contract terms remain traceable. The audit must capture number issuance (date, sequence, segments), every status change (ACTIVE, UPGRADED, CANCELLED), any approved number correction, activation, and the Card Claim Date (actual or deemed).

---

## 17. Examples

### Example VIP Number

Reservation Agreement signed and recorded on 2027-03-20, the first VIP transaction of March 2027, Gold, Spot Cash, Standard: **27032000001G1C01S** (17 characters).

Breakdown: YYMMDD 270320; NNNNN 00001; VT G1; P+MM C01; S.

The next transaction in March 2027 gets 00002. The first transaction in April 2027 starts again at 00001.

### Validity Example

Gold, 22 years. Full settlement verified (final payment dated 2027-06-10), card claimed 2027-07-01: validity runs from 2027-07-01. If the card is never claimed: deemed Card Claim Date 2028-06-10.

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
11. The Clerk prepares a contract (sellers do not prepare contracts; doc 01 §3.7, doc 05 §11).
12. Authorized Admin approves contract finalization.
13. Unauthorized users cannot finalize contracts.
14. Returned contracts can be corrected and resubmitted.
15. Contract finalization preserves approved commercial terms.
16. A Draft or a submitted application has no VIP Number; recording the signed Reservation Agreement issues exactly one.
17. Partial payment does not activate membership.
18. Full payment without Finance verification does not activate membership.
19. Finance-verified full settlement satisfies the financial activation prerequisite.
20. The date segment is the Reservation Agreement recording date (Asia/Manila).
21. The monthly sequence restarts at 00001 on the 1st of each month and never repeats within a month.
22. The Reservation Agreement, the Grant and the card show the same number.
23. Activation and card claim never create or change a number.
24. The number is exactly 17 characters and unique.
25. A cancelled number keeps status CANCELLED and is never issued again.
26. Changing an issued number's segments requires recorded management approval.
27. Spot Cash uses C01; installment codes use the actual approved months.
28. Payment schedule changes after issuance do not change the number.
29. Validity starts on the Card Claim Date, or on the first anniversary of full settlement if the card is not claimed within a year.
30. Numbers already issued by the workbook are imported unchanged.
31. An upgrade issues a new number, marks the old one UPGRADED and links them with "Replaces" (when the upgrade flow is built).
32. Only the closing salesperson's accreditation number is linked to the VIP Number.
33. Repeated issuance requests do not create a second number.
34. Previously issued historical numbers are never renumbered.
35. Each contract keeps the validity clause of the template it was signed on.
36. Confirmed Sales and Active VIP Membership remain separate.
37. Gold supplementary holder uses the shared membership pool.
38. The deemed Card Claim Date is computed from the full-settlement date, not from activation.
39. Gold and Silver prices follow doc 05 items 11 and 13; contracts signed on earlier templates keep their executed text.
40. A Non-Standard contract cannot be finalized without both doc 05 §10.2 approvals (the Administrator or the Super Administrator approves, then Finance confirms; only the Super Administrator may do both).

---

## 19. Reconciliation Report (Summary)

See `05-vip-products-and-contracts.md` Section 19. Card-specific conflicts resolved by owner ruling R2 (2026-11-12): the platform follows NUM v6.2 (one number for the RA, Grant and Card, issued at Reservation Agreement signing, monthly sequence) and the signed Grant validity clause (Card Claim Date). The earlier activation-date Card ID and the separate RA No. are withdrawn.

---

## 20. Outstanding Approval Dependencies

- Gold/Silver contract price corrections: resolved (doc 05 items 11 and 13).
- Non-Standard commercial rules: resolved (doc 05 §10.2, item 15).
- Complete payment scheme canonical register from approved docs.
- Tier-code format expansion if needed.
- RA numbering scope uniqueness: resolved (one company-wide monthly allocator, section 6.1).
- Legacy ID reconciliation: resolved (section 9.1, workbook numbers imported unchanged).
- Upgrade flow: rule adopted (section 9.3); building it is a later feature card.

---

## Completion Report

- **Files created/updated:** `docs/business-rules/06-vip-card-issuance.md`
- **Approved rules covered:** VIP Card ID generation, RA No. relationship, activation-date-based numbering, issuance eligibility, card lifecycle, membership activation and validity, historical identifier preservation, audit requirements.
- **VIP Number (2026-11-12):** YYMMDD = Reservation Agreement recording date; NNNNN = monthly sequence; VT = tier; P+MM = payment snapshot; S/N = classification. Example: first transaction of March 2027, recorded 2027-03-20, G1, Spot Cash, Standard → **27032000001G1C01S**.
- **Outstanding approval dependencies:** Listed above.
- **Validation:** All required sections included; no invented rules; documentation only. No code, database, Git, or deployment changes.


## Owner rulings amendment (2026-11-09)

These rulings are authoritative and take precedence over earlier text in this document where they differ.

1. **Move A and Move B payment codes are unresolved (superseded by item 3).** Their commercial terms are approved (doc 05 amendment), but no Card ID payment-code mapping is authorized for them. C01 applies only to Spot Cash and TXX only to installments, where XX is the actual approved number of months; neither is assigned automatically to a Move arrangement. Move contracts may be prepared, approved, finalized and paid, but membership activation and Card ID issuance stay blocked for them until the owner authorizes the mapping. Existing finalized contracts and issued Card IDs are unchanged. Move B1 and Move B2 are removed (see doc 05 amendment).
2. ~~**Card ID date.** The Card ID uses the official Membership Activation Date, as stated in section 6; the transaction date is not used.~~ Superseded by item 4 below (owner ruling R2): one VIP Number is issued when the signed Reservation Agreement is recorded.
3. **Move A / Move B Card ID payment-code mapping approved.** Effective date: 2026-11-09 (confirmed by the owner on 2026-11-12, doc 05 item 14). Approved mapping (companion to doc 05 amendment item 12; T = installment category plus monthly count; no promotional names appear in IDs):

    | Scheme | Tier | Card ID payment code (P + MM) |
    |---|---|---|
    | Spot Cash | B1, S1, G1 | C01 |
    | 4-Month Installment | B1, S1, G1 | T04 |
    | Move A | B1, S1, G1 | T04 |
    | Move B | B1 | T04 |
    | Move B | S1 | T08 |
    | Move B | G1 | T12 |

    T-category semantics: C01 applies only to Spot Cash; TXX applies to installment-category schemes, where XX is the actual approved number of monthly payments for that scheme and tier. Standard Move contracts proceed to activation and issuance once all prerequisites are met (finalized contract, full settlement, Finance verification, successful activation). Finalized contracts keep their snapshot protection — this mapping does not rewrite finalized terms or previously issued IDs. The unresolved-code block in item 1 now applies only to schemes without an approved mapping. Existing IDs are unchanged. This item supersedes item 1's block for Move A and Move B; item 1 is retained as history.
## Owner rulings amendment (2026-11-12, round R2)

These rulings take precedence over earlier text in this document where they differ.

4. **Unified VIP Number adopted.** The platform follows NUM v6.2: one 17-character number for the Reservation Agreement, the Grant and the Card. The separate RA No. (`YYYY-NNNN`) and the activation-dated Card ID are withdrawn. The date segment is the Reservation Agreement recording date, and the sequence is monthly. The payment-code mapping in item 3 still applies to the P and MM segments.
5. **Issuance trigger.** The number is issued when the signed Reservation Agreement is recorded (NUM §6). NUM §2 ("first valid payment or formal grant execution") is read together with §6; the platform uses the Reservation Agreement event.
6. **Validity start.** Validity starts on the Card Claim Date under the signed Grant §I-B(a). If the card is not claimed within one year after full settlement, the claim is deemed to occur on the first anniversary of full settlement. Activation still requires full settlement verified by Finance.
7. **Upgrades.** The NUM §5 upgrade rule is adopted (new number, old number UPGRADED, "Replaces" link, old card voided). Building the flow is a later feature card.
8. **Numbers are never reused.** A CANCELLED or UPGRADED number is kept and never issued again.
