# AFHomes Platform — Finance and Payments Business Rules

> Single source of truth for the **Finance and Payments** module.
> Customer Management: `docs/business-rules/04-customer-management.md`.
> VIP Products and Contracts: `docs/business-rules/05-vip-products-and-contracts.md`.
> VIP Card Issuance: `docs/business-rules/06-vip-card-issuance.md`.
> Sales Network: `docs/business-rules/02-sales-network-and-genealogy.md`.
> Sales Performance Reporting: `docs/business-rules/13-sales-performance-reporting.md`.
> Organization Management: `docs/business-rules/01-roles-and-permissions.md`.

---

## 1. Purpose and Scope

This document defines the authoritative Finance and Payments business rules for AFHomes Platform.

A customer payment counts only when its receipt is approved by Finance, the Administrator or the Super Administrator (owner ruling R6, 2026-11-12; see section 5.2). The module manages receipt entry, approval, balances, collections, overdue tracking, reversals, refunds, reconciliation, fully paid determination, sales confirmation eligibility, and VIP membership activation eligibility.

A submitted payment claim is not proof that funds were received. An uploaded receipt does not mean money was received. A selected payment method does not establish payment verification.

This document does not define commission calculations, Stay Points rules, refund/cancellation penalty rules beyond approved Finance authority, or tax/accounting statutory formats.

---

## 2. Related Business-Rule Documents

- `01-roles-and-permissions.md` — modular roles and permissions.
- `02-sales-network-and-genealogy.md` — sales attribution and visibility.
- `04-customer-management.md` — customer identity.
- `05-vip-products-and-contracts.md` — VIP tiers, payment schemes, contract lifecycle.
- `06-vip-card-issuance.md` — activation and Card ID rules.
- `13-sales-performance-reporting.md` — Confirmed Sales and reporting adjustments.

---

## 3. Terms and Definitions

- **Payment Submission (receipt entry)** — a Clerk's entry of a receipt with its required OR number or bank reference number (section 5.1).
- **Payment Verification (receipt approval)** — approval of an entered receipt by Finance, the Administrator or the Super Administrator (section 5.2). In this document, "verified", "Finance-verified" and "Finance verification" mean an approved receipt under section 5.2; they do not limit approval to the Finance role.
- **OR / Reference Number** — the official receipt number or bank reference number of a receipt. It is required and unique across the whole system.
- **Closed Deal (Confirmed Sale) date, Stage 1 date, Full Payment date** — the dates on which approved receipts first reach 25%, 40% and 100% of the contract price (doc 13 §4).
- **Closed Month** — a month closed by the Administrator or the Super Administrator; its figures never change (doc 13 §4.5).
- **Payment Scheme** — contractual payment arrangement (Spot Cash, Move A, 4-Month Installment, Move B, plus Admin-configured). Move B1 and Move B2 were merged into Move B by doc 05 item 7.
- **Payment Type / Method** — how a payment is made (Cash, Bank Transfer, GCash, Maya, Card, Cheque).
- **Reservation / Down Payment / Installment / Full** — payment purposes.
- **Outstanding Balance** — remaining unpaid contractual amount based on verified payments.
- **Fully Paid** — Finance-verified complete settlement of the agreed contract price.
- **Financial Hold** — restriction on new VIP benefit usage when an Active membership loses fully settled position due to authorized reversal/refund.
- **Confirmed Sale** — separate from Fully Paid; a sale counts (Closed Deal) when approved receipts reach 25% of the contract price (owner ruling R7, 2026-11-12; doc 13 §4). Contract finalization is not required for the count (follow-up item 1; section 15).

---

## 4. Finance Module Responsibilities

Finance must support:

1. Customer payment submissions.
2. Payment evidence and supporting documents.
3. Reservation payments.
4. Down payments.
5. Installment payments.
6. Full payments.
7. Payment verification.
8. Payment rejection and correction workflows.
9. Contractual payment schedules.
10. Outstanding balances.
11. Automatic overdue tracking.
12. Collection monitoring.
13. Payment reversals.
14. Refund processing.
15. Payment reconciliation.
16. Fully Paid determination.
17. Sales confirmation eligibility.
18. VIP Membership activation eligibility.
19. Financial Hold conditions.
20. Finance reporting and audit history.

Receipt approval rests with Finance, the Administrator and the Super Administrator (section 5.2). Entering a receipt is distinct from approving it.

---

## 5. Roles, Authorization, and Data Visibility

### 5.1 Receipt Entry Authority (owner ruling R6, 2026-11-12)

A Clerk enters each receipt: date, sale (VIP Number), amount, payment method and a required OR number or bank reference number (workbook OPS §4.3). The Administrator and the Super Administrator may also enter receipts, because they can do everything in the system (overriding authority rule, 2026-11-12). Other office roles enter receipts only where doc 01 grants that action permission.

Sellers (IST and OST) view their permitted records only and do not enter receipts (owner ruling R4 item 5). Having an IST or OST account does not grant access to every customer's financial records.

**Seller payment slip (owner follow-up ruling 5, 2026-11-12).** A seller may upload a payment slip photo for their own customer. It is proof only: it is not a receipt and counts toward nothing until a Clerk enters the receipt from it (section 9.1) and Finance, the Administrator or the Super Administrator approves that receipt (section 5.2).

### 5.2 Receipt Approval Authority (owner ruling R6, 2026-11-12)

Finance, the Administrator or the Super Administrator approves a receipt. **Only an approved receipt counts** toward collections, balances, the Closed Deal, Stage 1 and Full Payment thresholds, and every dependent module. A Clerk enters only and cannot approve.

Self-approval is allowed: Finance, the Administrator or the Super Administrator may approve a receipt they entered themselves. The audit history records that the same person entered and approved it (doc 12 §14).

This replaces the earlier "Finance is the sole authority" rule, the general no-self-verification block, and the 2026-11-10 Super Administrator exceptions to that block. The prototype's self-verification block is a frontend backlog item; this document does not change code.

### 5.3 Reversal and Refund Authority

Finance, the Administrator or the Super Administrator may reverse an approved receipt, with a reason, as a dated reversal (section 14). Authorized Finance personnel may also approve and execute refunds without separate Admin or Super Admin approval; the Administrator and the Super Administrator hold the same authority under the overriding authority rule. This authority applies to the payment transaction workflow and does not automatically authorize amending finalized contracts, cancelling contracts outside existing rules, or bypassing other governed processes.

### 5.4 Record-Level Visibility

A module permission is not equivalent to unrestricted access to all financial transactions. Distinguish submitting payment evidence, viewing permitted payment history, accessing Finance verification queues, verifying/rejecting payments, approving/executing refunds or reversals, viewing complete Finance reports, and performing reconciliation.

Receipt entry authority does not grant approval authority. IST may view relevant own-customer and authorized team information. OST may view only financial information relevant to their own sales. Do not expose unrelated customer financial data or payment evidence to another sales branch. Finance access must be appropriately authorized and auditable. There is no public card or customer lookup (owner ruling R11, 2026-11-12; doc 11 §21); payment proofs, bank transaction information, receipts and internal Finance audit details are never exposed publicly.

---

## 6. Payment Schemes vs Payment Types

### 6.1 Payment Scheme (contractual arrangement)

Known source-documented options:

| Source label | Display label |
|---|---|
| Spot cash | Spot Cash |
| Move a | Move A |
| Installment 4_month | 4-Month Installment |
| Move b1 40 12 / Move b2 25 12 | Move B (one scheme, doc 05 item 7) |

Other officially documented approved schemes must also be preserved. Do not assume these five are necessarily exhaustive. Admin can configure applicable payment schemes, terms, and availability (per 05). Finance consumes the applicable finalized contractual terms and must not silently rewrite an approved payment scheme, final contract price, installment schedule, or negotiated agreement. Move A and Move B terms are those in doc 05 items 6 and 7; do not invent calculations for any scheme whose authoritative terms are unavailable.

### 6.2 Payment Type / Method (how a payment is made)

Cash, Bank Transfer, GCash, Maya, Card, Cheque. A customer can have an installment scheme while paying an individual installment via GCash or Bank Transfer. Payment method does not determine the contractual payment schedule.

---

## 7. Payment Purposes and Categories

### 7.1 Reservation

Initial reservation payment associated with an eligible customer transaction. Standard October 2026 VIP contracts identify a non-refundable reservation amount of ₱10,000, included within the purchase price. Do not treat the standard ₱10,000 as universal for every historical, non-standard, or future contract. Contractually approved exceptions remain possible.

### 7.2 Down Payment

A payment satisfying part of the agreed contractual amount or qualifying initial payment requirement, linked to the correct contractual obligation.

### 7.3 Installment

A scheduled payment against the finalized contract payment schedule. Verification updates the applicable outstanding balance and installment settlement position without inventing a new contractual schedule.

### 7.4 Full Payment

A payment that satisfies an applicable remaining contractual obligation or the entire agreed amount, depending on the transaction. Do not confuse a payment submitted with purpose `full` with a Finance-verified Fully Paid contract.

### 7.5 Existing Technical Values

Where the repository uses machine-readable purpose values `reservation`, `down_payment`, `installment`, `full`, preserve their exact implemented meaning and spelling. Explain how human-readable labels relate to verified existing technical values. Do not change technical enums as part of this documentation task.

---

## 8. Payment Record Information

Conceptual data contract for identifying and reconciling a payment:

- Canonical customer reference.
- Related VIP application, contract, sale, or payment obligation.
- Payment purpose.
- Payment amount.
- Currency.
- Payment method.
- Receipt date (the business date of the payment).
- OR number or bank reference number (required; unique across the whole system, section 9.2).
- Payment evidence, where attached.
- Entering user identity.
- Entry timestamp.
- Approval status.
- Approver identity (Finance, Administrator or Super Administrator) and whether the approver also entered the receipt.
- Approval timestamp.
- Counted month (the receipt's own month, or the first open month for a late receipt admitted after its month closed, section 9.1).
- Rejection or return reason, where applicable, and the link to any earlier version of a resent receipt.
- Reversal reference and reason, where applicable.
- Audit references.

Inspect existing repository models before prescribing precise database fields or mandatory form controls. Do not invent receipt numbers, bank transaction references, approval IDs, or other evidence. Uploaded receipts must be stored and accessed under appropriate privacy and authorization controls. Authorized staff may inspect payment evidence; it is never exposed publicly or through unrelated Sales Network views.

---

## 9. Payment Submission and Verification Workflow

### 9.1 Receipt Workflow (owner ruling R6, 2026-11-12; workbook OPS §4.3)

1. A Clerk selects the sale by its sale number (VIP Number) and enters the receipt with its required OR number or bank reference number (section 5.1).
2. The system blocks the entry if the reference number already exists anywhere in the system (section 9.2).
3. The Clerk attaches supporting evidence where required. A payment slip photo uploaded by the seller (section 5.1) may serve as that evidence; on its own it counts for nothing.
4. The receipt enters the approval queue.
5. Finance, the Administrator or the Super Administrator approves it, rejects it, or returns it for correction (section 5.2).
6. A returned receipt shows a **Fix and resend** control to the person who entered it. Resending creates a new version for approval; the old version stays in history and is never overwritten (U06).
7. Only an approved receipt counts. Approval adds the receipt to the sale's collected total and stamps, when first reached, the Closed Deal date (25%), the Stage 1 date (40%) and the Full Payment date (100%) (OPS §4.3; doc 13 §4).
8. A receipt dated in a closed month is not added to that month. It is admitted into the first open month and counts there (owner ruling R6 item 5 and R7 item 2; OPS §4.3). The closed month's figures do not change.
9. Any resulting balance, sales, or membership eligibility change follows approved cross-module rules.

### 9.2 Approval Rules

Receipt approval is the authoritative event establishing confirmed receipt of the applicable payment. Approval must never rely solely on a user-entered assertion. Payment evidence, entered amount, applicable contract, and reconciliation information must be consistent.

**Unique reference number.** The OR number or bank reference number is unique across the whole system. A duplicate is blocked at entry and at approval. A resent version of a returned receipt is the same receipt and keeps its reference number. Because receipts are never deleted, a reversed receipt's reference number also stays taken (OPS §8, "Prior Receipt Keys": the same OR can never be approved twice).

The same payment must not be financially recognized more than once. A rejected receipt must not increase recognized customer payments. A resent receipt preserves the original version and audit history. Duplicate entries must not produce duplicate approved payments.

Do not invent a particular bank API, payment gateway, automatic bank-matching mechanism, or external processor. If electronic verification integration does not exist, document the business requirement without claiming it is implemented.

### 9.3 Payment Statuses and State Transitions

Use existing repository status names where already defined; otherwise specify logical statuses without pretending implementation enums are approved. Logical states: Submitted (entered, not approved), Under Review, Verified (approved), Rejected, Returned for Correction, Resent (new version of a returned receipt), Reversed, Refunded. Transitions must preserve audit history and the original entry.

---

## 10. Contractual Payment Schedules

Finance consumes the applicable finalized contractual payment schedule. Due dates, installment amounts, and terms come from the finalized contract. Finance must not invent or rewrite schedules. Due-date grace periods, penalty thresholds, or contractual extensions are not invented here.

---

## 11. Outstanding Balance Management

Conceptually distinguish: finalized contractual purchase price; applicable reservation amount; approved down-payment obligation; scheduled installments; Finance-verified receipts; valid reversals and refunds; authorized contractual adjustments; remaining outstanding balance.

Only actual Finance-verified payment amounts may reduce the officially recognized outstanding balance. A submitted but unverified payment must not reduce that balance. A reversed verified payment must be reconciled so the previously recognized settlement no longer counts toward the relevant obligation.

Requirements: preserve the finalized contract's financial snapshot; do not calculate balances from the current public catalog price; do not apply new Admin-configured prices retroactively; do not double-count reservation payments already included in the total purchase price; maintain consistent financial precision appropriate to Philippine peso amounts; prevent duplicate or repeated verification events from creating excess recognized payments.

Document partial settlement, reconciliation discrepancies, excess or unidentified payment situations as controlled Finance concerns. Where treatment of excess amounts, credits, or allocations lacks approved rules, mark as unresolved rather than inventing refund or allocation policies.

---

## 12. Collection Monitoring

Authorized Finance personnel monitor: pending payment submissions; payments requiring verification; returned or rejected submissions; upcoming installment obligations; due installments; overdue installments; partially settled obligations; remaining balances; fully settled contracts; Financial Hold cases; reconciliation exceptions.

**No-payment list and Defaulted sales (owner ruling R7 item 3, 2026-11-12; OPS §4.4).** The system lists sales with no approved receipt for 90 days. The Administrator or the Super Administrator decides which listed sales to mark Defaulted. A Defaulted sale returns to Active if the buyer pays again (an approved receipt). Reporting effects are in doc 13 §4.6; clawback effects are in doc 08.

Distinguish a payment verification queue from a contractual collection queue. Avoid counting a completed fully paid transaction as collectible merely because a historical payment record exists. Document filtering/grouping requirements without inventing exact UI. Potential business dimensions: customer, VIP tier, contractual payment scheme, due date, payment status, verified amount, remaining balance, assigned authorized sales relationship. Respect record-level privacy rules.

---

## 13. Automatic Overdue Installment Tracking

The system automatically identifies overdue installments according to the finalized contractual payment schedule.

Required behavior:

1. An installment has a contractually established due date.
2. The system compares that obligation against applicable Finance-verified settlement information.
3. If the installment remains unpaid after its due date, the unpaid obligation becomes Overdue.
4. Finance can monitor and reconcile overdue obligations.
5. Verified settlement updates the relevant overdue position.
6. Corrections and reversals must be reflected accurately.
7. Historical audit records must remain available.

Where partial payment is recognized, distinguish the unpaid portion from the amount already verified. Do not classify unverified submitted payments as completed settlement.

No unauthorized penalties: do not automatically generate late penalties, interest, or charges unless specifically authorized by the applicable contract and approved policy. An Overdue status is not itself authorization to assess additional charges. Preserve contract-specific late-payment consequences instead of applying universal assumptions.

Time conventions: use the project's established date conventions. When determining a local business date for Philippine customer installments, reconcile with the existing Asia/Manila convention. Do not invent due-date grace periods, penalty thresholds, or contractual extensions.

---

## 14. Payment Reversals and Refunds

**Undoing an approved receipt (owner ruling R6 item 4, 2026-11-12).** Finance, the Administrator or the Super Administrator may undo an approved receipt, for a keying error or a bounced cheque, and must give a reason. The undo is a dated reversal linked to the original receipt; it is never a deletion. A closed month's figures do not change: the reversal's effect is recorded in the open month in which it is made (doc 13 §4.5 and §5.1). Workbook source: OPS §4.3 (DirectorReverseReceipt, DirectorReturnedCheck).

Refunds are approved and executed by authorized Finance personnel, the Administrator or the Super Administrator without a separate approval step. No additional approval step may be introduced merely because a payment is being reversed or refunded. This authority applies to the payment transaction workflow and does not automatically authorize amending finalized contractual terms, cancelling contracts outside existing authorization rules, or bypassing other independently governed business processes.

Required safeguards: authorized actor identity (Finance, Administrator or Super Administrator); reason for reversal or refund; reference to the original verified payment; reversal or refund amount; date and time; appropriate transaction status; complete audit history; reconciled financial impact; historical traceability.

Do not delete the original payment transaction. Do not silently overwrite a verified amount or verification event. Use linked reversal, refund, or adjustment events according to the existing architecture.

Idempotency: repeated requests for the same completed reversal or refund must not cause repeated financial deductions. A transaction must not be refunded or reversed beyond its applicable eligible amount without an explicitly authorized policy.

Refund vs Reversal: Reversal corrects or negates previously recognized payment effects. Refund returns funds to the customer under an applicable authorized basis. The two may have different financial and operational consequences. Do not assume every reversal necessarily sends money to the customer. Do not invent external fund-transfer automation or disbursement providers.

Reservation non-refundable rule: respect the applicable contractual non-refundable reservation provision. Finance authority to process approved refunds does not automatically cancel an existing contractual restriction on refund eligibility. If a commercial exception or waiver is required, follow the applicable approved policy or identify the missing authorization rule.

---

## 15. Confirmed Sale Integration

**Owner ruling R7, 2026-11-12 (doc 13 §4).** A sale counts as sold (Closed Deal / Confirmed Sale) when approved receipts reach 25% of the contract price (workbook OPS §4.3). The full purchase price does not need to be settled for the sale to count. This replaces the earlier rule "finalized contract plus Finance-verified required payment".

A sale counts at 25% once the Administrator has approved the sale record; receipts cannot be approved before the sale itself is approved (OPS §4.2). Formal contract finalization (doc 05) is tracked separately and is not required for the count (owner follow-up ruling 3, 2026-11-12).

Reporting recognition: the full contract value is counted once, on the date approved receipts first reach 25% (the Closed Deal date), rather than on any unapproved payment claim. The Stage 1 date (40%) and the Full Payment date (100%) are stamped and tracked separately. Avoid duplicate recognition when later installments are paid.

Sales reversals: a reversal affecting a previously confirmed sale must be reconciled with the rules in `docs/business-rules/13-sales-performance-reporting.md`. Approved reporting principles include: a previously confirmed sale reversal may require a negative adjustment in the applicable reversal period; the affected sale returns to the appropriate pending or reconsideration workflow under existing rules; valid reconfirmation produces the corresponding positive adjustment in its new confirmation period; authorized price adjustments are reported through appropriate deltas; previously reported historical periods must remain auditable. Reconcile the precise trigger and consequences with document 13. Do not invent commission clawback calculations; those belong to future Commission Management business rules.

---

## 16. Fully Paid Determination

A contract is considered Fully Paid for activation eligibility only when approved receipts (section 5.2) settle the entire applicable finalized contractual price. The date this is first reached is the Full Payment date (section 9.1). The calculation must consider valid prior verified payments and any applicable reversal or correction events.

Do not assume a single payment with type `full` proves complete settlement. Do not equate customer record creation, contract submission, contract finalization, payment submission, Confirmed Sale, Fully Paid, and VIP Membership activation. These are separate lifecycle concepts.

---

## 17. VIP Membership Activation Eligibility

An Active VIP Membership requires: (1) Admin-finalized VIP contract; (2) full settlement of the agreed purchase price; (3) approval of the settling receipts by Finance, the Administrator or the Super Administrator (section 5.2); (4) successful official membership activation.

Fully Paid does not automatically mean that the membership activation event has already occurred. Finance provides the verified settlement information needed for activation eligibility. The VIP Card Issuance and Membership workflows remain responsible for their respective authorized activation processes. Do not bypass the existing VIP Card Issuance rules.

---

## 18. VIP Card ID Integration

Preserve the latest approved official VIP Card ID rules documented in `docs/business-rules/06-vip-card-issuance.md`. The approved format is `YYMMDDNNNNNVTPMMS` (exactly 17 characters), one VIP Number for the Reservation Agreement, Grant and card (owner ruling R2, 2026-11-12). Segments: YYMMDD = Reservation Agreement recording date; NNNNN = monthly company-wide sequence; VT = VIP tier code; P+MM = payment category and duration snapshot; S/N = contract classification. Example: `27032000001G1C01S`.

Required safeguards: one company-wide monthly allocator only; a payment correction never reissues the number; no card release merely because payment was submitted; no activation eligibility before Finance-verified full payment; no newly generated official ID when a historical payment is corrected; preserve the original assigned VIP Number and its history; never recycle official issued identifiers.

Do not modify the VIP Card ID format or numbering allocator. If the actual VIP Number implementation conflicts with the documented policy, identify the conflict rather than inventing a new serial strategy.

---

## 19. Automatic Financial Hold

When an Active VIP Membership has a previously verified payment reversed or refunded, and the resulting reconciliation creates an outstanding balance, the system must automatically place the membership on Financial Hold.

Required behavior:

1. A membership is officially Active.
2. A previously verified payment is reversed or refunded through authorized Finance operations.
3. The contractual outstanding balance is recalculated.
4. The reconciliation identifies an outstanding amount.
5. The membership becomes subject to Financial Hold.
6. New VIP benefit usage is restricted while the Financial Hold remains applicable.
7. Original membership data and historical entitlements are preserved.
8. Finance monitors and reconciles the outstanding financial obligation.
9. Once verified settlement and the required reconciliation conditions are satisfied, membership eligibility may be restored through the authorized workflow.

Financial Hold must not delete the customer, delete the membership, create a replacement membership, generate a new VIP Number, replace the original activation date, restart the original validity duration, erase past benefit usage, rewrite existing finalized contract terms, or erase previously verified payment or refund records.

Membership state modeling: inspect existing membership status conventions. If `Financial Hold` is not an existing status, describe it as a required business condition or controlled hold state. Do not assume it must be added to the same enum as Active, Expired, Suspended, or Cancelled. The future implementation must distinguish the underlying membership lifecycle from a temporary financial restriction.

Restoration: Finance reconciliation may restore benefit eligibility when the applicable financial requirements are satisfied. Restoration must depend on verified settlement, respect independently applicable membership conditions, preserve historical activation and expiry dates, and preserve audit history. Financial settlement must not revive a membership that has independently expired or become ineligible for another reason. Do not invent an additional Admin approval step for Finance reconciliation.

Stay Points and other benefits: new benefit usage is restricted during Financial Hold. Do not automatically confiscate existing balances, permanently forfeit future contractual entitlements, or rewrite historical Stay Points entries. Those consequences require the governing Membership and Stay Points business rules.

---

## 20. Historical Payments and Imports

**History import scope (owner ruling R11 item 5, 2026-11-12; Rollout Guide v1.4 §6 and §8).** Every seller and every unfinished sale is imported with its full receipt history. Finished sales are not imported; they stay in the Excel archives. A side-by-side parallel run follows, and the system takes over when a month closes with no unexplained differences. Details are in doc 11 (owner rulings amendment, 2026-11-12).

The platform may support historical customer and financial records. Preserve existing original identities and verified financial facts. Historical financial records must not be treated as new unverified customer submissions when a documented and authorized certified-import process already governs them.

**Imported receipts (owner follow-up ruling 8, 2026-11-12).** Receipts brought in by the history import are marked **Approved (imported)**. An Administrator signs off each import batch once; the receipts in a signed-off batch count as approved receipts without approving each one again. The sign-off is audited (doc 12) and the import marking stays visible on every imported receipt (doc 11 §26).

Important distinctions:

- **Historical Fully Paid and Active:** an eligible historical transaction may already have completed membership activation. Do not recreate activation or overwrite an existing membership merely because its record is imported or reconciled.
- **Fully Paid but awaiting activation:** a Finance-verified fully settled transaction may still be awaiting official membership activation. It must not automatically be treated as an Active VIP Membership.
- **Partially paid:** maintain the remaining contractual balance and appropriate pending/collection workflow.
- **Conflicting financial information:** records with inconsistent contractual amounts, verified payments, remaining balances, or contradictory lifecycle states require reconciliation. Do not fabricate missing receipts, settlement events, consent, or historical activation dates.

Source precedence: inspect the actual Customer Management, Finance, Import, and Membership code or documents before asserting that any particular historical import mechanism is implemented in the current repository. Document required business invariants separately from implementation claims. Preserve issued historical VIP numbers and original commercial terms. Do not automatically renumber older memberships into the new VIP Card ID format.

---

## 21. Finance Permission Boundaries (Reconciliation with Org Management)

The platform uses modular role permissions and record-level visibility rules. The existing planning approach includes module-based page access that allows viewing, with sensitive actions needing separate operation permissions (owner ruling R4, doc 01 §3.1), subject to business restrictions.

A module permission is not equivalent to unrestricted access to all financial transactions. Define the difference between submitting payment evidence through an authorized transaction workflow; viewing a customer's permitted payment history; accessing Finance verification queues; verifying or rejecting payments; approving and executing refunds or reversals; viewing complete Finance reports; and performing reconciliation.

Receipt entry authorization (Clerk) must not grant approval privileges. Approval belongs to Finance, the Administrator and the Super Administrator (section 5.2).

Sales Network record visibility: follow actual genealogy and customer access rules. Sellers view only. IST members may view relevant own-customer and authorized team information. OST members may view only financial information relevant to their own sales. Do not expose unrelated customer financial data or payment evidence to another sales branch. Finance access must be appropriately authorized and auditable. There is no public card or customer lookup (owner ruling R11); payment proofs, bank transaction information, receipts and internal Finance audit details are never exposed publicly.

---

## 22. Finance Reporting

Define business requirements for Finance monitoring and reporting. Include conceptual reporting dimensions: total Finance-verified payments; verified collections by reporting period; collections by payment purpose; collections by payment method; outstanding contractual balances; overdue installments; upcoming payment obligations; refunds; reversals; net recognized collections; fully settled contracts; contracts eligible for activation; active Financial Holds; payment reconciliation exceptions.

Clearly distinguish gross verified collections from refunds, reversals, and net collection figures. Avoid counting the same amount twice across reservation, installment, and full-payment categories.

Reporting periods: use the project's established date and reporting conventions. Recognized payment reporting must use verified financial events according to the applicable business rule, not unverified submission dates. If a report recognizes reversals or corrections, preserve the appropriate adjustment period rather than silently rewriting historical transactions. Do not invent tax, accounting-ledger, or official statutory financial-report formats that have not been authorized.

---

## 23. Mandatory Audit History

All significant Finance operations must be auditable. Document audit requirements for: receipt entry; blocked duplicate reference numbers; proof upload or replacement; receipt approval, flagging when the approver also entered the receipt; receipt rejection; return for correction; Fix and resend with the earlier version kept; late-receipt admission into the first open month; month close; Defaulted marking and restoration to Active; refund approval and execution; reversal approval and execution; payment reconciliation; balance-impacting adjustments; automatic overdue state changes; Financial Hold activation; Financial Hold resolution; resulting Sale or Membership eligibility changes.

Audit information should preserve: acting user or system identity; authorized role or permission context; relevant customer and transaction identifiers; previous and resulting business state; timestamp; reason or supporting reference where applicable; correlation to the triggering financial event.

Do not delete audit history when a payment changes status. Do not invent immutable-ledger technology or a specific audit-table implementation unless supported by the repository.

---

## 24. Cross-Module Invariants

The Finance document explains its relationship with existing and planned modules:

| Module | Finance integration |
|---|---|
| Customer Management | Canonical customer identity and authorized customer transactions |
| VIP Products | Approved product configuration and commercial terms |
| VIP Contracts | Finalized contractual amount and payment obligations |
| Sales | Finance verification supports Confirmed Sale eligibility |
| Sales Performance Reporting | Confirmation recognition, reversals, and adjustment periods |
| VIP Card Issuance | Full-payment eligibility before official activation (the VIP Number is issued earlier, when the signed Reservation Agreement is recorded; doc 06) |
| VIP Membership | Full settlement, activation eligibility, and Financial Hold |
| IST/OST Sales Network | Payment submission and scoped visibility |
| Commission Management | Future verified-sale and reversal integration; detailed commission policy remains separate |
| Stay Points and Redemption | Financial Hold restrictions and preserved benefit history |
| Reports and Analytics | Verified and reconciled financial figures |
| Audit Logs | Traceable financial and membership changes |

Do not duplicate business authority across modules. Receipt approval (Finance, Administrator or Super Administrator) and reconciliation stay in this module. VIP Card Issuance must not develop a separate payment verification process. Sales Reporting must not independently accept unverified payments as confirmed revenue or sales qualification. The future Commission module must consume authorized verified sales events rather than invent an independent receipt-verification process.

---

## 25. Contractual Restrictions and Known Conflicts

Existing source-documented standard VIP terms include:

| Item | Bronze | Silver | Gold |
|---|---:|---:|---:|
| Standard price | ₱72,000 | ₱240,000 | ₱390,000 |
| Membership validity | 7 years | 12 years | 22 years |
| VIP discount | 15% | 20% | 25% |
| Standard reservation | ₱10,000 | ₱10,000 | ₱10,000 |

These values describe the updated standard-contract baselines and do not authorize retroactive changes to historical sales. Preserve the actual terms from finalized customer agreements.

Known source-document concerns:

1. A discrepancy between ₱390,000 and ₱780,000 in different sections of the Gold contract (Gold portion resolved by owner ruling 2026-11-10, doc 05 item 11).
2. Unfinished payment amount wording in an earlier Silver contract version (resolved by owner ruling 2026-11-12, doc 05 item 13: Php 240,000).
3. Card Claim Date versus activation date as the validity start (resolved by owner ruling R2, 2026-11-12: the signed Grant's Card Claim Date applies, doc 06 §4.3).
4. ~~Missing definitive commercial details for some Move payment schemes.~~ Resolved (doc 05 items 6, 7, 14).
5. Non-Standard commercial exceptions (resolved by doc 05 §10.2, 2026-11-12: Finance confirms the price and schedule after the Administrator or the Super Administrator approves; only the Super Administrator may do both).

Do not silently resolve these legal or contractual issues through assumptions. Document them as requiring authoritative confirmation where they materially affect Finance requirements. Do not overwrite a finalized contractual amount merely to match a catalog price.

---

## 26. Non-Negotiable Invariants

The finished Finance documentation must explicitly preserve these rules:

1. Customer identity is separate from VIP contractual and financial records.
2. Payment Scheme and Payment Type are separate concepts.
3. Submitted payments are not verified payments.
4. A Clerk enters receipts with a required, system-wide unique OR or bank reference number; sellers view only (R6, R4).
5. Finance, the Administrator or the Super Administrator approves receipts; self-approval is allowed and audited; only approved receipts count (R6).
6. Finance, the Administrator or the Super Administrator may reverse an approved receipt with a reason, as a dated reversal and never a deletion (R6).
7. All financial corrections, refunds, and reversals require audit history.
8. Original verified payment records remain traceable.
9. Contract balances depend on verified financial activity.
10. Reservation payments included in a purchase price must not be counted twice.
11. Overdue installments are tracked automatically from approved contractual schedules.
12. No unauthorized automatic penalties.
13. Finalized contracts retain their agreed payment terms.
14. Confirmed Sale is separate from Fully Paid.
15. Full payment does not automatically mean activation has occurred.
16. Active VIP Membership requires official activation after verified full settlement.
17. The VIP Number follows doc 06 (issued at Reservation Agreement recording; Finance actions never reissue it).
18. No independent VIP serial generator.
19. Payment reversal that creates an outstanding balance on an Active membership triggers Financial Hold.
20. Financial Hold restricts new VIP benefit usage.
21. Financial Hold does not erase the customer, membership, original VIP Number, activation date, or history.
22. Finance reconciliation may restore eligibility after valid verified settlement, subject to other eligibility requirements.
23. Historical IDs and signed contract terms remain preserved.
24. Sales and Finance reporting must not double-count transactions.
25. Financial records and sensitive payment evidence are protected by authorization rules.
26. Every state-changing financial event must be auditable.
27. Future Commission and Stay Points rules must not be invented inside this document.

---

## 27. Required Business Scenarios

### Scenario A — Staff Submits Reservation Payment

Staff submits reservation payment details and supporting proof. Finance has not yet verified the transaction. The payment remains unverified and does not reduce the recognized balance.

### Scenario B — Finance Verifies Down Payment

An approved installment contract receives an initial payment. Finance, the Administrator or the Super Administrator approves the receipt. If approved receipts now reach 25% of the contract price, the sale counts as a Closed Deal on that date (doc 13 §4). The membership is not automatically Active.

### Scenario C — Installment Becomes Overdue

The contractual installment due date passes without sufficient verified settlement. The remaining unpaid obligation becomes Overdue. Finance can monitor it without the system inventing penalties.

### Scenario D — Finance Reverses Verified Payment

An authorized Finance user performs an approved reversal. The original transaction remains traceable. Outstanding balances and dependent reporting states are reconciled.

### Scenario E — Active VIP Enters Financial Hold

An Active VIP Membership loses its fully settled position due to an authorized verified-payment reversal. The system places it on Financial Hold. The original VIP Number and activation date remain unchanged.

### Scenario F — Financial Hold Resolution

The customer settles the outstanding obligation. Finance verifies the new payment and reconciles the account. The membership may regain eligibility through the authorized restoration process, provided no independent expiry or other restriction applies.

### Scenario G — Fully Paid, Awaiting Activation

The contract is finalized and fully settled with Finance verification. The actual membership activation has not occurred. The record remains distinct from an Active VIP Membership.

### Scenario H — Duplicate Payment Submission

The same payment claim or verification operation is repeated. The system must not recognize the same funds multiple times.

### Scenario I — Historical Fully Paid Record

A historical transaction has appropriately established certified settlement information. The system preserves the original financial and membership history and does not invent a new payment receipt or activation event.

### Scenario J — Verified Payment Corrected After Reporting

A previously verified payment affects a reported Confirmed Sale. The correction follows established reporting adjustment rules rather than silently duplicating or rewriting financial recognition.

---

## 28. Unresolved Dependencies

- Exact commercial formulas for Move A and Move B: resolved (doc 05 items 6, 7, 14).
- Overpayment handling and customer-credit allocation.
- Contract-specific refund exceptions.
- Detailed Non-Standard commercial authorization: resolved (doc 05 §10.2).
- Exact grace periods where none are established.
- External payment-gateway or banking integrations.
- Membership benefit treatment beyond the approved Financial Hold restriction.
- Detailed Commission reversal and payout consequences.
- Tax/accounting/reporting procedures not established by source documentation.
- Gold/Silver contract source discrepancies: resolved (doc 05 items 11 and 13).
- ~~RA numbering scope uniqueness verification.~~ Resolved (doc 06, owner ruling R2: one VIP Number with a monthly sequence).

---

## 29. Documentation Acceptance Checklist

### Authorization
- [x] Clerk receipt entry with required, unique reference number (R6).
- [x] Approval by Finance, Administrator or Super Administrator; audited self-approval (R6).
- [x] Reversal by Finance, Administrator or Super Administrator with a reason; refunds.
- [x] Record-level visibility and privacy.
- [x] Protection against unauthorized financial changes.

### Payments
- [x] Reservation.
- [x] Down payment.
- [x] Installment.
- [x] Full payment.
- [x] Payment Scheme versus Payment Type.
- [x] Submission and verification lifecycle.
- [x] Rejection and correction workflows.
- [x] Duplicate prevention.

### Collections
- [x] Outstanding balance determination.
- [x] Automatic overdue tracking.
- [x] Contract-specific due dates.
- [x] No unauthorized penalties.
- [x] Finance collection monitoring.
- [x] Reconciliation rules.

### Reversals
- [x] Finance-controlled reversal/refund authority.
- [x] Original financial history preserved.
- [x] Audit logging.
- [x] Balance reconciliation.
- [x] Dependent Sales and Membership effects.

### Sales
- [x] Contract finalization not required for the 25% count (section 15; follow-up ruling 3).
- [x] 25% approved-collection Closed Deal trigger (R7).
- [x] Confirmed Sale versus Fully Paid.
- [x] Single full-value confirmation recognition.
- [x] Reversal and reconfirmation adjustments.
- [x] No double-counting.

### VIP Membership
- [x] Verified full-payment eligibility.
- [x] Separate official activation event.
- [x] Correct Card ID dependencies.
- [x] Automatic Financial Hold.
- [x] Benefit restrictions.
- [x] Original identity and validity preservation.
- [x] Controlled hold resolution.

### Integration
- [x] Customer Management consistency.
- [x] VIP Contract consistency.
- [x] Sales Network consistency.
- [x] Sales Performance Reporting consistency.
- [x] VIP Card Issuance consistency.
- [x] Historical record preservation.
- [x] Future Commission and Stay Points boundaries.
- [x] Audit and reporting consistency.

---

## Completion Report

- **File created/updated:** `docs/business-rules/07-finance-and-payments.md`
- **Major Finance sections completed:** Purpose and scope; responsibilities; roles/authorization/visibility; payment schemes vs types; payment purposes; payment record info; submission/verification workflow; schedules; balances; collection monitoring; overdue tracking; reversals/refunds; Confirmed Sale integration; Fully Paid; activation eligibility; Card ID integration; Financial Hold; historical payments; permission boundaries; reporting; audit; cross-module invariants; contractual restrictions; invariants; scenarios; unresolved dependencies; acceptance checklist.
- **Payment authorization rules (original text, superseded by the 2026-11-12 amendment):** Staff/IST/OST may submit; only Finance verifies; Finance may reverse/refund without Admin approval.
- **Verification workflow (original text, superseded by the 2026-11-12 amendment):** submission, Finance review, verify/reject/return, verified payment counts; no self-verification; duplicate prevention.
- **Overdue tracking:** automatic from contractual schedules; no unauthorized penalties.
- **Refund/reversal rules:** Finance authority, audit, idempotency, refund vs reversal distinction, reservation non-refundable.
- **Financial Hold:** automatic on Active membership when verified payment reversed/refunded creating outstanding balance; restricts new benefit usage; preserves identity/history; restoration via verified settlement.
- **Sales and Membership integration:** Confirmed Sale vs Fully Paid; full payment does not auto-activate; activation requires official activation event; Card ID dependencies preserved.
- **Audit and reporting requirements:** all state-changing financial events auditable; reporting uses verified events; no double-counting.
- **Cross-document reconciliation:** Confirmed alignments with 01, 02, 04, 05, 06, 13. Discovered conflicts documented (Gold/Silver prices, Card Claim Date vs activation date, Move scheme details, Non-Standard). Outstanding dependencies listed.
- **Outstanding dependencies:** Listed in Section 28.
- **Limitations of documentation-only verification:** No implementation tested; no DB or code changes.
- **Change scope:** Documentation only. No application code, database, migrations, Git commit/push/merge, or deployment. Other documentation files unchanged. Only `docs/business-rules/07-finance-and-payments.md` created.
## Owner rulings amendment (2026-11-09)

These rulings are authoritative and take precedence over earlier text in this document where they differ.

1. **Super Administrator** keeps Finance operations and counts as authorized Finance personnel.
2. **Membership activation** may be performed by Finance, Admin and Super Administrator. Activation remains a separate event from Finance verification and from Fully Paid; none of them triggers the next automatically.
3. **Payment allocation:** verified money is applied in order to the reservation fee, then the down payment, then installments. The reservation fee is part of the contract total, never added on top. One full payment with no separate reservation-fee payment therefore satisfies the reservation fee and every later line.
4. **Reservation fee** is non-refundable. A reversal to correct an error is still allowed.
5. **Contract cancellation with verified money** is two-step: Admin requests, Finance confirms or declines, and the requester cannot decide. Exception (owner decision, 2026-11-10): a Super Administrator bypasses this requester-cannot-decide separation-of-duties blocker and may both request and confirm/decline the same cancellation. Confirmed forfeiture preserves history and holds unpaid commissions. *(Amended 2026-11-12, item 8 below: under the overriding authority rule the Administrator, like the Super Administrator, may request and decide the same cancellation; the audit history shows it.)*
6. **Imported payment claims** are claims, not money. Each must be verified by Finance in the normal queue. Records already verified outside the system need a separate Historical import, which is not yet defined (open decision OD-8). *(Amended 2026-11-12, item 9 below: the history import scope is now set; the approval treatment of imported receipts is still open.)*

7. **Spot Cash, Move A and Move B (2026-11-09)** are released with the terms recorded in the doc 05 amendment. Finance consumes the finalized contract schedule: the Spot Cash balance is due 7 days after the reservation, Move B has a 40% down payment line that includes the reservation fee, and all lines follow the allocation order in item 3. ~~A Move contract cannot be finalized until a Super Administrator records its written approval.~~ Superseded by doc 05 item 12 (effective 2026-11-09): Move A and Move B are standard approved schemes and need no per-contract written approval.
8. **Due dates** derive from the reservation date (doc 05 amendment, item 9). The Move B down payment has no documented due date, so it is undated and is not overdue until a date is entered.
9. **Collection views** show, per contract, a ledger of verified payments and adjustments with running net and balance, and the separate milestones: payment recorded, payment verified, sale confirmed, commission release threshold, fully paid, membership activated, VIP Number issued (at Reservation Agreement recording, doc 06). Overdue days are whole calendar days in Asia/Manila. No penalty, interest or grace period is computed.

## Owner rulings amendment (2026-11-12, rounds R6, R7, R11)

These rulings are authoritative and take precedence over earlier text in this document, including the 2026-11-09 and 2026-11-10 rulings, where they differ. Ground rule: the company workbook wins by default; dated owner rulings outrank everything. Workbook source: Commission System User Manual v2.3 (OPS) §4.3, §4.4 and §5.

1. **Receipt entry (R6 item 1).** A Clerk enters each receipt with a required OR number or bank reference number (OPS §4.3). The Administrator and the Super Administrator may also enter receipts. Sellers view only. Sections 5.1 and 9.1.
2. **Receipt approval (R6 item 1; overriding authority rule).** Finance, the Administrator or the Super Administrator approves a receipt. Only an approved receipt counts. Self-approval is allowed and the audit history shows that the same person entered and approved. This replaces "Finance is the sole authority", the no-self-verification block, and the 2026-11-10 Super Administrator exceptions. Section 5.2.
3. **Unique reference number (R6 item 2).** The OR or bank reference number is unique across the whole system; a duplicate is blocked. Section 9.2.
4. **Fix and resend (R6 item 3, U06).** A returned receipt has a "Fix and resend" control for the person who entered it. Resending creates a new version; the old version stays in history. Section 9.1.
5. **Undoing an approved receipt (R6 item 4).** Finance, the Administrator or the Super Administrator may undo an approved receipt (keying error or bounced cheque) with a reason. It is a dated reversal, never a deletion; closed-month figures are not rewritten. Section 14. Note: OPS §4.3 limits a keying-error reversal to the open month and allows a returned cheque in any month; the owner ruling states no month limit, so none is added here.
6. **Late receipts (R6 item 5, R7 item 2).** A receipt dated in a closed month counts in the first open month (OPS §4.3). Section 9.1.
7. **Sales counting, month close and defaults (R7).** A sale counts (Closed Deal / Confirmed Sale) when approved receipts reach 25% of the contract price, dated on the day 25% is reached; the 40% (Stage 1) and 100% (Full Payment) dates are tracked separately. The Administrator or the Super Administrator closes a month, and closed figures never change. Sales with no approved receipt for 90 days are listed; the Administrator or the Super Administrator marks a sale Defaulted, and it returns to Active if the buyer pays again. Doc 13 §4 to §4.6 govern; clawback effects are in doc 08. Sections 12 and 15.
8. **Cancellation decision (overriding authority rule).** 2026-11-09 item 5 is amended: the Administrator, like the Super Administrator, may both request and decide the same cancellation; the audit history shows it.
9. **History import (R11 item 5).** Every seller and every unfinished sale is imported with its full receipt history; finished sales stay in the Excel archives; a side-by-side parallel run follows and the switch happens when a month closes with no unexplained differences (Rollout Guide v1.4 §6 and §8). This sets the scope of OD-8. Section 20. *Imported receipt approval settled 2026-11-12 (follow-ups, item 3 below).*
10. **No public lookup (R11 item 1).** There is no public card or customer check; payment information is never exposed publicly. Sections 5.4 and 21.
11. ~~**Open, not decided here:**~~ **Settled by follow-up item 1 below:** whether contract finalization is still required before the 25% count. Doc 05 §13 still requires a finalized contract; the workbook has no separate finalization step (OPS §4.2 only requires the sale itself to be approved before its receipts). Section 15.

## Owner rulings amendment (2026-11-12, follow-ups)

These rulings take precedence over earlier text in this document where they differ.

1. **Counting at 25% (owner ruling).** A sale counts at 25% once the Administrator has approved the sale record. Formal contract finalization is tracked separately and is not required for the count (workbook OPS §4.2). Section 15; the former open question and the section 28 item are closed.
2. **Seller payment slip.** A seller may upload a payment slip photo for their own customer. It is proof only and counts only after a Clerk enters the receipt and Finance, the Administrator or the Super Administrator approves it. Sections 5.1 and 9.1.
3. **Imported receipts.** History receipts come in marked "Approved (imported)". An Administrator signs off each import batch once. Section 20; the section 28 item is closed.
