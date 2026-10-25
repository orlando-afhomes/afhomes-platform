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

Finance is the sole authority for confirming receipt of customer payments. It manages payment submission, verification, balances, collections, overdue tracking, reversals, refunds, reconciliation, fully paid determination, sales confirmation eligibility, and VIP membership activation eligibility.

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

- **Payment Submission** — recording of payment details/evidence by an authorized user.
- **Payment Verification** — Finance's authoritative confirmation of receipt.
- **Payment Scheme** — contractual payment arrangement (Spot Cash, Move A, 4-Month Installment, Move B1, Move B2, plus Admin-configured).
- **Payment Type / Method** — how a payment is made (Cash, Bank Transfer, GCash, Maya, Card, Cheque).
- **Reservation / Down Payment / Installment / Full** — payment purposes.
- **Outstanding Balance** — remaining unpaid contractual amount based on verified payments.
- **Fully Paid** — Finance-verified complete settlement of the agreed contract price.
- **Financial Hold** — restriction on new VIP benefit usage when an Active membership loses fully settled position due to authorized reversal/refund.
- **Confirmed Sale** — separate from Fully Paid; requires finalized contract + Finance-verified qualifying payment.

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

Finance is the sole authority for confirming receipt of customer payments. Financial transaction recording is distinct from official verification.

---

## 5. Roles, Authorization, and Data Visibility

### 5.1 Payment Submission Authority

Authorized users in these categories may submit payment details and supporting evidence, subject to module permissions and record-level authorization:

- Staff
- IST (SVD, SSM, SM)
- OST

Having an IST/OST account does not automatically grant unrestricted access to every customer's financial records.

### 5.2 Payment Verification Authority

**Only authorized Finance personnel may verify and confirm payment receipt.** Submitting users must never self-verify.

### 5.3 Finance Authority

Authorized Finance personnel may approve and execute payment reversals and refunds without separate Admin or Super Admin approval. This authority applies to the Finance payment transaction workflow and does not automatically authorize amending finalized contracts, cancelling contracts outside existing rules, or bypassing other governed processes.

### 5.4 Record-Level Visibility

A module permission is not equivalent to unrestricted access to all financial transactions. Distinguish submitting payment evidence, viewing permitted payment history, accessing Finance verification queues, verifying/rejecting payments, approving/executing refunds or reversals, viewing complete Finance reports, and performing reconciliation.

Staff/IST/OST submission authorization does not grant Finance verification privileges. IST may access relevant own-customer and authorized team information. OST may access only financial submission information relevant to their permitted customers and own sales. Do not expose unrelated customer financial data or payment evidence to another sales branch. Finance access must be appropriately authorized and auditable. Public Customer Lookup must never expose payment proofs, bank transaction information, receipts, or internal Finance audit details.

---

## 6. Payment Schemes vs Payment Types

### 6.1 Payment Scheme (contractual arrangement)

Known source-documented options:

| Source label | Display label |
|---|---|
| Spot cash | Spot Cash |
| Move a | Move A |
| Installment 4_month | 4-Month Installment |
| Move b1 40 12 | Move B1 |
| Move b2 25 12 | Move B2 |

Other officially documented approved schemes must also be preserved. Do not assume these five are necessarily exhaustive. Admin can configure applicable payment schemes, terms, and availability (per 05). Finance consumes the applicable finalized contractual terms and must not silently rewrite an approved payment scheme, final contract price, installment schedule, or negotiated agreement. Do not invent exact Move A, Move B1, or Move B2 calculations when authoritative terms are unavailable.

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
- Submitted payment date and time.
- Payment evidence or receipt reference.
- Submitting user identity.
- Submission timestamp.
- Verification status.
- Finance verifier identity.
- Verification timestamp.
- Rejection or correction reason, where applicable.
- Audit references.

Inspect existing repository models before prescribing precise database fields or mandatory form controls. Do not invent receipt numbers, bank transaction references, approval IDs, or other evidence. Uploaded receipts must be stored and accessed under appropriate privacy and authorization controls. Document how authorized personnel may inspect payment evidence without exposing it through public Customer Lookup or unrelated Sales Network views.

---

## 9. Payment Submission and Verification Workflow

### 9.1 Submission Workflow

1. An authorized user selects an eligible customer transaction or contractual payment obligation.
2. The user records the payment details.
3. The user attaches supporting evidence where required.
4. The submission enters the Finance verification workflow.
5. Finance reviews the submission.
6. Finance either verifies the payment, rejects the submission, or returns/flags it for correction.
7. Only a verified payment may be counted toward officially received funds.
8. Any resulting balance, sales, or membership eligibility change follows approved cross-module rules.

### 9.2 Verification Rules

Finance verification is the authoritative event establishing confirmed receipt of the applicable payment. Verification must never rely solely on a user-entered assertion. Payment evidence, submitted amount, applicable contract, and reconciliation information must be consistent. The same payment must not be financially recognized more than once. A rejected payment must not increase recognized customer payments. Any corrected payment must preserve the original submission and audit history. Duplicate submissions must not produce duplicate verified payments.

Do not invent a particular bank API, payment gateway, automatic bank-matching mechanism, or external processor. If electronic verification integration does not exist, document the business requirement without claiming it is implemented.

### 9.3 Payment Statuses and State Transitions

Use existing repository status names where already defined; otherwise specify logical statuses without pretending implementation enums are approved. Logical states: Submitted (unverified), Under Review, Verified, Rejected, Returned for Correction, Reversed, Refunded. Transitions must preserve audit history and original submission.

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

Authorized Finance personnel may approve and execute payment reversals and refunds without separate Admin or Super Admin approval. No additional Admin approval step may be introduced merely because a payment is being reversed or refunded. This authority applies to the Finance payment transaction workflow and does not automatically authorize amending finalized contractual terms, cancelling contracts outside existing authorization rules, or bypassing other independently governed business processes.

Required safeguards: authorized Finance identity; reason for reversal or refund; reference to the original verified payment; reversal or refund amount; date and time; appropriate transaction status; complete audit history; reconciled financial impact; historical traceability.

Do not delete the original payment transaction. Do not silently overwrite a verified amount or verification event. Use linked reversal, refund, or adjustment events according to the existing architecture.

Idempotency: repeated requests for the same completed reversal or refund must not cause repeated financial deductions. A transaction must not be refunded or reversed beyond its applicable eligible amount without an explicitly authorized policy.

Refund vs Reversal: Reversal corrects or negates previously recognized payment effects. Refund returns funds to the customer under an applicable authorized basis. The two may have different financial and operational consequences. Do not assume every reversal necessarily sends money to the customer. Do not invent external fund-transfer automation or disbursement providers.

Reservation non-refundable rule: respect the applicable contractual non-refundable reservation provision. Finance authority to process approved refunds does not automatically cancel an existing contractual restriction on refund eligibility. If a commercial exception or waiver is required, follow the applicable approved policy or identify the missing authorization rule.

---

## 15. Confirmed Sale Integration

A sale becomes Confirmed only when: (1) the corresponding customer contract is Finalized, and (2) Finance has verified the payment required by the selected contractual payment scheme. A qualifying initial payment may be sufficient for Confirmed Sale under an approved installment scheme. The full purchase price does not necessarily need to have been settled for the sale to be Confirmed.

Reporting recognition: preserve existing Sales Performance Reporting rules. The full qualifying finalized contract value is counted once when the sale becomes Confirmed. The recognition date follows the relevant Finance confirmation event rather than an unverified payment claim. Avoid duplicate recognition when later installments are paid.

Sales reversals: a reversal affecting a previously confirmed sale must be reconciled with the rules in `docs/business-rules/13-sales-performance-reporting.md`. Approved reporting principles include: a previously confirmed sale reversal may require a negative adjustment in the applicable reversal period; the affected sale returns to the appropriate pending or reconsideration workflow under existing rules; valid reconfirmation produces the corresponding positive adjustment in its new confirmation period; authorized price adjustments are reported through appropriate deltas; previously reported historical periods must remain auditable. Reconcile the precise trigger and consequences with document 13. Do not invent commission clawback calculations; those belong to future Commission Management business rules.

---

## 16. Fully Paid Determination

A contract is considered Fully Paid for activation eligibility only when Finance has verified that the entire applicable finalized contractual price is settled. The calculation must consider valid prior verified payments and any applicable reversal or correction events.

Do not assume a single payment with type `full` proves complete settlement. Do not equate customer record creation, contract submission, contract finalization, payment submission, Confirmed Sale, Fully Paid, and VIP Membership activation. These are separate lifecycle concepts.

---

## 17. VIP Membership Activation Eligibility

An Active VIP Membership requires: (1) Admin-finalized VIP contract; (2) full settlement of the agreed purchase price; (3) Finance verification; (4) successful official membership activation.

Fully Paid does not automatically mean that the membership activation event has already occurred. Finance provides the verified settlement information needed for activation eligibility. The VIP Card Issuance and Membership workflows remain responsible for their respective authorized activation processes. Do not bypass the existing VIP Card Issuance rules.

---

## 18. VIP Card ID Integration

Preserve the latest approved official VIP Card ID rules documented in `docs/business-rules/06-vip-card-issuance.md`. The approved format is `YYMMDDNNNNNVTPMMS` (exactly 17 characters). Segments: YYMMDD = Actual official VIP Membership Activation Date; NNNNN = Existing official RA No. four-digit sequence padded to five digits; VT = VIP tier code; P+MM = Approved payment category and duration; S/N = Contract classification. Example: `27032000001G1C01S`.

Required safeguards: no independent VIP serial generator; no official activation-date segment before actual activation; no card issuance merely because payment was submitted; no activation eligibility before Finance-verified full payment; no newly generated official ID when a historical payment is corrected; preserve the original assigned Card ID and its history; never recycle official issued identifiers.

Do not modify the VIP Card ID format or numbering allocator. If the actual RA numbering implementation conflicts with the documented policy, identify the conflict rather than inventing a new serial strategy.

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

Financial Hold must not delete the customer, delete the membership, create a replacement membership, generate a new VIP Card ID, replace the original activation date, restart the original validity duration, erase past benefit usage, rewrite existing finalized contract terms, or erase previously verified payment or refund records.

Membership state modeling: inspect existing membership status conventions. If `Financial Hold` is not an existing status, describe it as a required business condition or controlled hold state. Do not assume it must be added to the same enum as Active, Expired, Suspended, or Cancelled. The future implementation must distinguish the underlying membership lifecycle from a temporary financial restriction.

Restoration: Finance reconciliation may restore benefit eligibility when the applicable financial requirements are satisfied. Restoration must depend on verified settlement, respect independently applicable membership conditions, preserve historical activation and expiry dates, and preserve audit history. Financial settlement must not revive a membership that has independently expired or become ineligible for another reason. Do not invent an additional Admin approval step for Finance reconciliation.

Stay Points and other benefits: new benefit usage is restricted during Financial Hold. Do not automatically confiscate existing balances, permanently forfeit future contractual entitlements, or rewrite historical Stay Points entries. Those consequences require the governing Membership and Stay Points business rules.

---

## 20. Historical Payments and Imports

The platform may support historical customer and financial records. Preserve existing original identities and verified financial facts. Historical financial records must not be treated as new unverified customer submissions when a documented and authorized certified-import process already governs them.

Important distinctions:

- **Historical Fully Paid and Active:** an eligible historical transaction may already have completed membership activation. Do not recreate activation or overwrite an existing membership merely because its record is imported or reconciled.
- **Fully Paid but awaiting activation:** a Finance-verified fully settled transaction may still be awaiting official membership activation. It must not automatically be treated as an Active VIP Membership.
- **Partially paid:** maintain the remaining contractual balance and appropriate pending/collection workflow.
- **Conflicting financial information:** records with inconsistent contractual amounts, verified payments, remaining balances, or contradictory lifecycle states require reconciliation. Do not fabricate missing receipts, settlement events, consent, or historical activation dates.

Source precedence: inspect the actual Customer Management, Finance, Import, and Membership code or documents before asserting that any particular historical import mechanism is implemented in the current repository. Document required business invariants separately from implementation claims. Preserve issued historical VIP numbers and original commercial terms. Do not automatically renumber older memberships into the new VIP Card ID format.

---

## 21. Finance Permission Boundaries (Reconciliation with Org Management)

The platform uses modular role permissions and record-level visibility rules. The existing planning approach includes module-based Full CRUD access, subject to business restrictions.

A module permission is not equivalent to unrestricted access to all financial transactions. Define the difference between submitting payment evidence through an authorized transaction workflow; viewing a customer's permitted payment history; accessing Finance verification queues; verifying or rejecting payments; approving and executing refunds or reversals; viewing complete Finance reports; and performing reconciliation.

Staff, IST, and OST payment submission authorization must not grant Finance verification privileges.

Sales Network record visibility: follow actual genealogy and customer access rules. IST members may have access to relevant own-customer and authorized team information. OST members may access only financial submission information relevant to their permitted customers and own sales. Do not expose unrelated customer financial data or payment evidence to another sales branch. Finance access must be appropriately authorized and auditable. Public Customer Lookup must never expose payment proofs, bank transaction information, receipts, or internal Finance audit details.

---

## 22. Finance Reporting

Define business requirements for Finance monitoring and reporting. Include conceptual reporting dimensions: total Finance-verified payments; verified collections by reporting period; collections by payment purpose; collections by payment method; outstanding contractual balances; overdue installments; upcoming payment obligations; refunds; reversals; net recognized collections; fully settled contracts; contracts eligible for activation; active Financial Holds; payment reconciliation exceptions.

Clearly distinguish gross verified collections from refunds, reversals, and net collection figures. Avoid counting the same amount twice across reservation, installment, and full-payment categories.

Reporting periods: use the project's established date and reporting conventions. Recognized payment reporting must use verified financial events according to the applicable business rule, not unverified submission dates. If a report recognizes reversals or corrections, preserve the appropriate adjustment period rather than silently rewriting historical transactions. Do not invent tax, accounting-ledger, or official statutory financial-report formats that have not been authorized.

---

## 23. Mandatory Audit History

All significant Finance operations must be auditable. Document audit requirements for: payment submission; proof upload or replacement; payment verification; payment rejection; return for correction; payment correction or resubmission; refund approval and execution; reversal approval and execution; payment reconciliation; balance-impacting adjustments; automatic overdue state changes; Financial Hold activation; Financial Hold resolution; resulting Sale or Membership eligibility changes.

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
| VIP Card Issuance | Full-payment eligibility before official activation and Card ID assignment |
| VIP Membership | Full settlement, activation eligibility, and Financial Hold |
| IST/OST Sales Network | Payment submission and scoped visibility |
| Commission Management | Future verified-sale and reversal integration; detailed commission policy remains separate |
| Stay Points and Redemption | Financial Hold restrictions and preserved benefit history |
| Reports and Analytics | Verified and reconciled financial figures |
| Audit Logs | Traceable financial and membership changes |

Do not duplicate business authority across modules. Finance remains responsible for payment verification and reconciliation. VIP Card Issuance must not develop a separate payment verification process. Sales Reporting must not independently accept unverified payments as confirmed revenue or sales qualification. The future Commission module must consume authorized verified sales events rather than invent an independent receipt-verification process.

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

1. A discrepancy between ₱390,000 and ₱780,000 in different sections of the Gold contract.
2. Unfinished payment amount wording in the Silver contract.
3. Differences between historical Card Claim Date language and the newer official Membership Activation Date policy.
4. Missing definitive commercial details for some Move payment schemes.
5. Unresolved details concerning Non-Standard commercial exceptions.

Do not silently resolve these legal or contractual issues through assumptions. Document them as requiring authoritative confirmation where they materially affect Finance requirements. Do not overwrite a finalized contractual amount merely to match a catalog price.

---

## 26. Non-Negotiable Invariants

The finished Finance documentation must explicitly preserve these rules:

1. Customer identity is separate from VIP contractual and financial records.
2. Payment Scheme and Payment Type are separate concepts.
3. Submitted payments are not verified payments.
4. Authorized Staff, IST, and OST may submit permitted payment details and proof.
5. Only authorized Finance personnel may verify and confirm receipt.
6. Finance may approve and execute reversals and refunds without separate Admin approval.
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
17. The final VIP Card ID is generated according to the approved activation-date and RA-derived numbering policy.
18. No independent VIP serial generator.
19. Payment reversal that creates an outstanding balance on an Active membership triggers Financial Hold.
20. Financial Hold restricts new VIP benefit usage.
21. Financial Hold does not erase the customer, membership, original Card ID, activation date, or history.
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

An approved installment contract receives a qualifying initial payment. Finance verifies receipt. The sale may become Confirmed if all contractual sale-confirmation conditions are satisfied. The membership is not automatically Active.

### Scenario C — Installment Becomes Overdue

The contractual installment due date passes without sufficient verified settlement. The remaining unpaid obligation becomes Overdue. Finance can monitor it without the system inventing penalties.

### Scenario D — Finance Reverses Verified Payment

An authorized Finance user performs an approved reversal. The original transaction remains traceable. Outstanding balances and dependent reporting states are reconciled.

### Scenario E — Active VIP Enters Financial Hold

An Active VIP Membership loses its fully settled position due to an authorized verified-payment reversal. The system places it on Financial Hold. The original Card ID and activation date remain unchanged.

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

- Exact commercial formulas for Move A, Move B1, and Move B2.
- Overpayment handling and customer-credit allocation.
- Contract-specific refund exceptions.
- Detailed Non-Standard commercial authorization.
- Exact grace periods where none are established.
- External payment-gateway or banking integrations.
- Membership benefit treatment beyond the approved Financial Hold restriction.
- Detailed Commission reversal and payout consequences.
- Tax/accounting/reporting procedures not established by source documentation.
- Gold/Silver contract source discrepancies.
- RA numbering scope uniqueness verification.

---

## 29. Documentation Acceptance Checklist

### Authorization
- [x] Staff, IST, and OST payment submission.
- [x] Exclusive Finance verification authority.
- [x] Finance refund/reversal authority.
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
- [x] Contract finalization dependency.
- [x] Finance verification dependency.
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
- **Payment authorization rules:** Staff/IST/OST may submit (subject to permissions); only Finance verifies; Finance may reverse/refund without Admin approval.
- **Verification workflow:** submission → Finance review → verify/reject/return → verified payment counts; no self-verification; duplicate prevention.
- **Overdue tracking:** automatic from contractual schedules; no unauthorized penalties.
- **Refund/reversal rules:** Finance authority, audit, idempotency, refund vs reversal distinction, reservation non-refundable.
- **Financial Hold:** automatic on Active membership when verified payment reversed/refunded creating outstanding balance; restricts new benefit usage; preserves identity/history; restoration via verified settlement.
- **Sales and Membership integration:** Confirmed Sale vs Fully Paid; full payment does not auto-activate; activation requires official activation event; Card ID dependencies preserved.
- **Audit and reporting requirements:** all state-changing financial events auditable; reporting uses verified events; no double-counting.
- **Cross-document reconciliation:** Confirmed alignments with 01, 02, 04, 05, 06, 13. Discovered conflicts documented (Gold/Silver prices, Card Claim Date vs activation date, Move scheme details, Non-Standard). Outstanding dependencies listed.
- **Outstanding dependencies:** Listed in Section 28.
- **Limitations of documentation-only verification:** No implementation tested; no DB or code changes.
- **Change scope:** Documentation only. No application code, database, migrations, Git commit/push/merge, or deployment. Other documentation files unchanged. Only `docs/business-rules/07-finance-and-payments.md` created.