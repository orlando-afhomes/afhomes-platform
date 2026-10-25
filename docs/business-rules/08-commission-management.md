# AFHomes Platform — Commission Management Business Rules

> Single source of truth for the **Commission Management** module.
> Finance and Payments: `docs/business-rules/07-finance-and-payments.md`.
> Sales Network and Genealogy: `docs/business-rules/02-sales-network-and-genealogy.md`.
> Sales Performance Reporting: `docs/business-rules/13-sales-performance-reporting.md`.
> Organization Management: `docs/business-rules/01-roles-and-permissions.md`.
> VIP Products and Contracts: `docs/business-rules/05-vip-products-and-contracts.md`.

---

## 1. Purpose and Scope

This document defines the authoritative Commission Management business rules for AFHomes Platform.

Commission Management manually determines, approves, monitors, adjusts, and pays authorized commissions related to AFHomes sales. It covers commission eligibility review, Confirmed Sale references, direct seller and eligible upline identification, manual percentage assignment, commission calculation, recipient records, manual Finance approval, approved unpaid commissions, automatic holds on affected unpaid commissions, Finance-controlled cancellation and adjustment, paid commission tracking, manual payout processing, recovery tracking where authorized, commission reporting, and audit history.

Sales performance, commission eligibility, commission approval, and actual payout are separate concepts.

This document does not define commission percentage maximums, aggregate caps, payout frequency, partial payouts, minimum thresholds, tax withholding, or recovery offsets. Those are unresolved and must not be invented.

---

## 2. Related Business-Rule Documents

- `01-roles-and-permissions.md` — modular roles and permissions.
- `02-sales-network-and-genealogy.md` — genealogy and historical attribution.
- `03-ist-ost-accreditation.md` — accreditation identity.
- `04-customer-management.md` — customer identity.
- `05-vip-products-and-contracts.md` — finalized contract values.
- `06-vip-card-issuance.md` — activation and Card ID.
- `07-finance-and-payments.md` — Finance authority, verification, reversals, refunds.
- `13-sales-performance-reporting.md` — Confirmed Sale, reversals, reconfirmation, adjustments.

---

## 3. Terminology and Definitions

- **Commission** — a manually approved financial obligation to an eligible recipient for an eligible sale.
- **Commission Eligibility** — a sale has reached Confirmed status; eligibility does not equal entitlement.
- **Confirmed Sale** — requires Admin-finalized contract plus Finance-verified qualifying payment.
- **Direct Seller** — the IST or OST who made the sale.
- **Eligible Upline** — SM, SSM, SVD in the applicable historical genealogy.
- **Commission Approval** — explicit authorized Finance decision.
- **Approved Unpaid Commission** — approved but not yet paid.
- **On Hold** — approved unpaid commission temporarily restricted from payout.
- **Paid** — actual disbursement confirmed by Finance.
- **Financial Recovery** — manual Finance decision regarding already-paid commissions after a sale reversal.

---

## 4. Approved Commission Decisions

The following seven decisions are final and authoritative.

### Decision 1 — Finance Controls Commissions Manually

Commission Management is manually controlled by authorized Finance personnel. The system must not automatically grant or approve commissions when a customer is created, a contract is submitted, a contract is finalized, a payment is submitted, Finance verifies a qualifying payment, a sale becomes Confirmed, a customer becomes Fully Paid, or a VIP Membership becomes Active. These events may provide information for commission eligibility, but must not automatically create an approved commission obligation. Commission approval requires an explicit authorized Finance decision.

### Decision 2 — Finance Manually Assigns Percentages

Authorized Finance personnel manually determine commission percentages. The percentage may differ among eligible IST and OST members. There is no universally fixed percentage based solely on account designation. The system may calculate the corresponding peso amount from the percentage manually entered by Finance. This calculation is not an automatic commission award.

### Decision 3 — Commission Basis Is the Total Finalized Contract Value

The commission percentage is applied to the total finalized VIP contract value, not installments collected to date.

Formula: **Commission Amount = Finalized Contract Value × (Finance-Assigned Percentage ÷ 100)**

Example: Finalized contract value ₱390,000; Finance-assigned commission 5%; Calculated commission ₱19,500. The example is illustrative, not a mandatory rate.

### Decision 4 — Direct Seller and Eligible Uplines

Finance may manually assign separate commission percentages to the direct IST or OST seller, eligible upline SM members, eligible upline SSM members, and eligible upline SVD members. These recipients must correspond to the actual applicable sales genealogy. The system must not automatically distribute commissions through the hierarchy. Each recipient's commission is a separate Finance-controlled decision.

### Decision 5 — Commission Approval After Confirmed Sale

Finance may manually approve commissions after the underlying sale becomes Confirmed. A Confirmed Sale requires an Admin-finalized VIP contract and Finance verification of the qualifying payment required by the contractual payment scheme. Full payment is not required if the contractual payment scheme permits sale confirmation after a qualifying initial payment. A Confirmed Sale makes manual commission approval possible, but does not require Finance to award a commission.

### Decision 6 — Automatic Hold and Manual Recovery

When the underlying sale loses its Confirmed status: the system automatically places affected unpaid commissions on Hold; Finance manually determines cancellation, adjustment, or restoration; already paid commissions remain historically recorded; Finance manually decides whether recovery of already paid commissions is necessary; no automatic recovery deductions or clawbacks are permitted.

### Decision 7 — Finance Controls Payouts

Authorized Finance personnel manually process and record commission payouts. The commission becomes Paid only after actual disbursement is confirmed. The system must preserve payout details, amount, date, supporting evidence, and audit information. No automatic commission payout or transfer of funds.

---

## 5. Module Responsibilities

Commission Management manually determines, approves, monitors, adjusts, and pays authorized commissions related to AFHomes sales. It covers commission eligibility review, Confirmed Sale references, direct seller identification, eligible upline identification, manual percentage assignment, commission calculation, commission recipient records, manual Finance approval, approved unpaid commissions, automatic holds on affected unpaid commissions, Finance-controlled cancellation and adjustment, paid commission tracking, manual payout processing, recovery tracking where authorized, commission reporting, and audit history.

Sales performance, commission eligibility, commission approval, and actual payout are separate concepts.

---

## 6. IST and OST Commission Participants and Genealogy

The established hierarchy is SVD → SSM → SM → OST. IST means Internal Sales Team with designations SVD (Vice Director), SSM (Senior Sales Manager), SM (Sales Manager). OST means Outsourcing Sales Team.

An OST may belong directly to SVD, SSM, or SM. Do not create artificial intermediate managers. Valid genealogy examples include SVD → OST, SVD → SSM → OST, SVD → SSM → SM → OST.

IST members may make direct personal sales and may be eligible for commission when manually approved by Finance. Do not assume every IST sale requires an OST seller. OST members may make their own authorized sales; Finance may manually assign commission to the direct OST member and eligible historical uplines.

Commission Management consumes existing genealogy information. It does not own or redefine the organizational hierarchy. Do not change the existing genealogy structure, parent selection rules, Sales Network permissions, or account-creation processes.

---

## 7. Historical Genealogy and Commission Attribution

Transfers and designation changes must not retroactively rewrite historical sales relationships. A salesperson may transfer teams, change IST designation, convert between IST and OST, or move under another authorized parent. Historical sales must retain their original selling-team attribution.

When Finance processes a commission for an existing sale, the eligible genealogy must be based on the authorized sales relationship applicable to that sale. Do not automatically use the salesperson's current manager if the historical sale belonged to another branch.

Example: OST Seller A originally belonged to SM B and completed a sale while under SM B; later transferred to SM C. Finance reviews the earlier sale. The historical sale relationship must not be silently reassigned to SM C. Preserve historical attribution and existing sale-time relationships.

Inspect the actual genealogy document for existing attribution and effective-date conventions. If exact historical genealogy reconstruction is unavailable, identify the required reconciliation dependency instead of fabricating an upline. Commission approval must never modify the genealogy itself.

---

## 8. Commission Eligibility

### 8.1 Confirmed Sale Requirement

A sale is eligible for Finance commission approval only after reaching Confirmed Sale status. A sale must not be treated as Confirmed merely because the customer signed an application, a reservation exists, a payment claim was submitted, a customer uploaded a receipt, a contract was submitted for approval, or a payment method was selected.

The approved sales-confirmation process requires Contract Finalization and Finance verification of the qualifying contractual payment.

### 8.2 Eligibility Does Not Equal Entitlement

Even after the sale becomes Confirmed, Finance may approve a commission, decline to assign a commission, or assign different percentages to eligible recipients. Finance determines the actual commission decision. Do not create an automatic rule requiring every Confirmed Sale to receive a commission. Do not invent a universal deadline by which Finance must assign commissions.

### 8.3 IST and OST Eligibility

Both IST and OST may receive commissions. Do not implement or document OST-only commission eligibility, a blanket rule prohibiting IST commissions, an automatic exclusion of SVD/SSM/SM, fixed role-based commission percentages, or automatic percentage inheritance from the hierarchy.

Eligibility to be considered for manual commission assignment remains subject to existing authorization, identity, accreditation, and applicable business restrictions. Inspect the existing documentation to distinguish account status from sales-attribution history. Do not invent new eligibility forfeiture rules when an account is transferred, converted, expired, suspended, or deactivated. Any unresolved consequences should be documented for future authoritative clarification.

---

## 9. Manual Commission Percentages

Finance must be able to manually assign a commission percentage to an eligible recipient for a specific eligible sale. Conceptually, a commission decision references sale, finalized contract, direct seller or upline recipient, applicable sales genealogy, finalized contract amount, Finance-assigned percentage, calculated commission amount, Finance decision, decision timestamp, decision-maker identity, and relevant audit information. This is a business information contract, not authorization to create or modify a database schema. Inspect existing data structures before specifying implementation fields.

### 9.1 Percentage Values

The system must support manually entered percentages. Do not hardcode rates such as OST always 5%, SM always 2%, SSM always 1%, SVD always 1%. These are not approved rules. No fixed percentage table is currently required. The precise permitted percentage range, exception authority, and any aggregate cap are not yet established as commercial policies. Do not invent a company-specific limit. Future implementation should validate numeric correctness and prevent invalid or nonsensical entries, subject to an approved percentage policy.

---

## 10. Commission Calculation

Use the finalized contractual amount as the calculation basis.

**Commission = Finalized Contract Value × Assigned Percentage / 100**

Example (illustrative, not approved standard rates):

| Recipient | Percentage | Contract value | Calculated commission |
|---|---:|---:|---:|
| Direct OST seller | 5% | ₱390,000 | ₱19,500 |
| SM | 2% | ₱390,000 | ₱7,800 |
| SSM | 1% | ₱390,000 | ₱3,900 |
| SVD | 1% | ₱390,000 | ₱3,900 |

### 10.1 Independent Recipient Calculations

Each recipient's amount is calculated independently using the same finalized contract value. Do not automatically deduct the direct seller's percentage when calculating an upline's percentage. Do not calculate an upline's percentage from the direct seller's commission unless a separate approved business rule explicitly requires it.

### 10.2 Commercial Amount Source

Use the actual finalized contract snapshot. Do not use current VIP catalog prices, current promotional prices, a later Admin product update, a claimed or unpaid installment amount, or total receipts collected instead of finalized contract value. Historical contracts may have different legitimate finalized values. Preserve their original contractual basis.

### 10.3 Monetary Precision

Document the requirement for consistent monetary calculation and rounding. Inspect existing project conventions before prescribing exact decimal or rounding implementation. Do not silently alter finalized or approved commission amounts if product settings change.

---

## 11. Manual Commission Workflow

### 11.1 Commission Review and Preparation

1. A sale reaches Confirmed status.
2. The sale becomes available for authorized Finance commission review.
3. Finance selects the eligible sale.
4. Finance examines the finalized contract value.
5. Finance reviews the direct seller and actual sale-time genealogy.
6. Finance selects the intended commission recipients.
7. Finance manually assigns a percentage for each selected recipient.
8. The system calculates the corresponding peso amounts.
9. Finance reviews the calculations.
10. Finance explicitly approves the appropriate commission records.
11. Approved commissions remain unpaid until Finance performs the payout workflow.

The system may identify potential eligible sales and display their genealogy. It must not automatically create an approved commission merely because the sale is eligible. The Finance action must be explicit and auditable.

### 11.2 Commission Approval

Only authorized Finance personnel may approve commissions. Approval must establish commission recipient, associated sale, finalized contractual calculation basis, assigned commission percentage, approved commission amount, approving Finance user, approval date and time, approval status, and relevant audit references.

Do not allow a direct seller or upline member to approve their own commission through their Sales Network account permissions. Do not equate viewing a commission with approving it. Do not allow ordinary Staff, IST, or OST payment-submission authorization to become commission approval authority.

---

## 12. Commission Status Lifecycle

Use existing repository enums where verified; otherwise describe logical states without claiming they are already implemented.

Logical states:

- **Under Review / Draft** — Finance is evaluating or preparing a potential commission. No approved obligation has yet been established.
- **Approved** — Finance has manually approved the commission. The commission has not necessarily been paid.
- **On Hold** — An unpaid commission is temporarily restricted from payout because the associated sale has lost its Confirmed status or another separately authorized hold condition applies.
- **Paid** — Finance has confirmed that the actual commission disbursement occurred.
- **Cancelled / Reversed / Adjusted** — Represent authorized manual Finance decisions affecting the original commission. Preserve audit and financial history.

Recommended logical flow: Confirmed Sale → Finance Review → Manual Approval → Manual Payout → Paid. Exception: Approved and Unpaid → Sale Loses Confirmed Status → Automatic Hold → Finance Review → Authorized Resolution.

Do not automatically grant, approve, restore, or pay commissions. Do not invent technical enum names without verifying the repository.

---

## 13. Automatic Commission Hold

When a sale loses Confirmed status, the system must automatically place affected unpaid commissions on Hold. Potential triggering conditions include underlying sale cancellation or a verified-payment reversal that causes the sale to lose Confirmed status. The trigger is the loss of applicable Confirmed Sale status, not every unrelated financial event.

Required behavior:

1. The underlying sale was Confirmed.
2. Finance manually approved one or more commissions.
3. Some approved commissions remain unpaid.
4. The underlying sale loses Confirmed status.
5. Affected unpaid commissions become On Hold.
6. Finance is able to review the affected records.
7. Finance manually resolves the affected commissions' eventual treatment.

Required safeguards: do not delete the original approved commission; do not erase its approved percentage; do not erase approval history; do not automatically release payout; do not automatically cancel paid commissions; do not automatically deduct money from an IST or OST account; do not rewrite historical sale attribution; preserve the cause of the Hold.

Reconfirmation: if the sale later becomes Confirmed again, the system must not silently create another commission or automatically release previously held commissions. Finance must review the appropriate resolution. Preserve existing commission identity and audit history.

---

## 14. Commission Cancellation, Adjustments, and Recovery

Finance retains manual authority over the treatment of commissions affected by sales reversals. Finance may determine whether an affected commission should be kept On Hold, cancelled, adjusted, restored for payout eligibility, or subject to an appropriate recovery process if already paid. These operations must be traceable.

### 14.1 Already Paid Commissions

If a commission was previously paid, a later sale reversal must not delete its payout history. The system must preserve original commission approval, original percentage, original approved amount, original disbursement, payout confirmation, reason for subsequent recovery consideration, Finance decision, and any actual recovery transaction when applicable.

### 14.2 No Automatic Clawbacks

The system must not automatically deduct from future commissions, generate an employee debt, deduct from salary or compensation, reverse a bank transfer, reclaim previously disbursed cash, or create negative payable balances. Any recovery action requires a separate authorized Finance decision and must comply with applicable contractual and legal requirements. Do not invent rules permitting payroll deductions or involuntary recovery.

### 14.3 Commission Adjustments

Where Finance changes an approved commission, preserve the original decision and document the adjustment. Do not overwrite financial history in a way that prevents reconstruction of the original and revised amounts. If the finalized contract itself receives an authorized price adjustment, reconcile the resulting commission treatment with the existing contract and Sales Performance Reporting rules. Do not automatically recalculate or replace an already approved commission without an authorized Finance decision.

---

## 15. Commission Payout Management

Only authorized Finance personnel manually process commission payouts under the approved workflow. Approval and payout are separate actions. An approved commission is not automatically Paid.

### 15.1 Payout Process

1. Finance reviews an approved unpaid commission.
2. Finance verifies that the commission is eligible for payout and is not On Hold.
3. Finance determines the amount authorized for disbursement.
4. Finance performs or arranges the actual payout through the company's authorized payment process.
5. Finance records the payout information and supporting evidence.
6. Finance confirms that disbursement actually occurred.
7. Only then does the commission become Paid.

### 15.2 Required Payout Information

Conceptually preserve commission record, recipient identity, authorized payout amount, payment or disbursement method, relevant payment reference, actual payout date, supporting proof where applicable, Finance processor, confirmation timestamp, payout status, and audit history.

Do not invent bank account details or recipient financial information. Do not assume all customer payment methods are automatically valid commission payout methods. The applicable payout methods must follow the existing company financial process.

### 15.3 No Automatic Disbursement

Do not implement or prescribe automatic GCash payouts, automatic Maya payouts, automatic bank transfers, scheduled automatic payroll-like transfers, automatic commission disbursement on approval, or automatic commission withdrawal by sellers. The approved policy is manual Finance processing.

### 15.4 Payout Confirmation

A commission must not become Paid solely because Finance initiated a transfer. It becomes Paid only when actual disbursement has been confirmed. Keep initiated or unconfirmed payments separate from completed payouts.

### 15.5 Duplicate Payout Protection

Repeated processing of the same payout instruction must not result in duplicate recorded settlements. The document must require appropriate duplicate-detection and reconciliation safeguards.

Exact partial-payout policy, payout frequencies, withholding rules, and minimum thresholds have not been approved. Identify them as unresolved if relevant; do not invent them.

---

## 16. Roles, Permissions, and Visibility

Align with `docs/business-rules/01-roles-and-permissions.md`. AFHomes Platform uses modular role-based permissions and record-level visibility.

### 16.1 Finance

Authorized Finance personnel may review eligible sales, review relevant seller and upline information, manually determine recipient percentages, calculate commission amounts, approve commissions, review commission holds, perform authorized adjustments, process payouts, confirm actual disbursement, maintain commission financial records, and view authorized commission reports. These financial operations require the appropriate Finance authorization.

### 16.2 IST

An authorized IST member may view commission information permitted by the role and existing visibility rules. IST members may earn commissions from their own direct sales and receive manually approved upline commissions where applicable. Do not assume an IST member can approve commissions or inspect every unrelated seller's private payout data.

### 16.3 OST

An OST member may view their own authorized commission information. OST members must not gain unrestricted access to other OST sellers' commissions or private financial records.

### 16.4 Admin and Super Admin

Preserve existing role and module authorization policies. Do not introduce an additional Admin approval requirement for individual commission awards or payouts. Manual commission decisions are controlled by authorized Finance personnel. Administrative visibility or management permissions must be reconciled with the existing role model, not treated as an automatic replacement for Finance authorization.

### 16.5 Important Distinction

Commission visibility is separate from commission financial authority. A user may be allowed to view an approved commission without being authorized to change it.

---

## 17. IST and OST Commission Monitoring

Document business-level visibility requirements without creating UI designs or application code.

### 17.1 Direct Seller

An IST or OST seller should be able to view their own permitted commission records, including relevant statuses.

### 17.2 IST Upline

An authorized IST manager may view relevant commission information for their applicable sales structure, subject to role permissions and privacy boundaries. Do not infer unrestricted access to downline banking details or payout evidence.

### 17.3 OST Portal

OST visibility must remain limited to their own authorized sales and related commission information. Do not expand OST access to unrelated Sales Network branches.

### 17.4 Required Distinction

Separate personal sales, team sales, personally approved commissions, authorized downline commission summaries if permitted, approved unpaid commissions, On-Hold commissions, and Paid commissions. A manager viewing team sales does not automatically become entitled to a commission on every team sale. A manager viewing a team's sales performance also does not automatically gain permission to modify a downline member's commission. Preserve the current genealogy, Members, and Sales Network workflows.

---

## 18. Commission Reporting

The Finance module should support accurate manual commission management reporting. Required conceptual information includes commissions under review, approved commissions, approved unpaid commissions, On-Hold commissions, Paid commissions, cancelled commissions, adjustments, manual recoveries, outstanding approved commission obligations, commission totals by recipient, by IST/OST category, by source sale, by applicable genealogy branch, and by relevant reporting period.

### 18.1 Reporting Integrity

A commission must not appear as Paid merely because it is Approved. A sale must not be counted multiple times as sales revenue merely because multiple commission recipients exist. Where several recipients receive commissions on one sale, commission liability may include their separate approved amounts, but the original sale remains one sale.

### 18.2 Reporting Dates

Distinguish sale confirmation date, commission approval date, hold date, payout confirmation date, reversal or adjustment date, and recovery date if any. Do not collapse these into a single transaction timestamp.

### 18.3 Reporting Adjustments

Follow `docs/business-rules/13-sales-performance-reporting.md`. Maintain historical reporting integrity when underlying sales are reversed or reconfirmed. Avoid retroactively replacing previously approved commission history.

---

## 19. Cross-Module Integration

| Module | Commission Management relationship |
|---|---|
| Roles and Permissions | Authorization for viewing, approval, adjustment, and payouts |
| Sales Network | Eligible seller and upline identities |
| Genealogy | Historical parent relationships and eligible upline context |
| IST/OST Accreditation | Actual account identity, current designation, and applicable authorization |
| Customer Management | Restricted customer and transaction references |
| VIP Products and Contracts | Finalized contractual calculation basis |
| Finance and Payments | Verified qualifying payments and manual commission operations |
| Sales | Confirmed Sale eligibility |
| Sales Performance Reporting | Confirmation, reversals, reconfirmation, and historical attribution |
| VIP Membership | Separate membership lifecycle, not automatic commission authorization |
| Reports and Analytics | Commission status, obligations, payouts, and adjustments |
| Audit Logs | Traceability of financial decisions |

Commission Management must not modify customer master identities, change finalized contract terms, reassign sales genealogy, verify customer payments independently, change Confirmed Sale status independently, activate VIP memberships, generate VIP Card IDs, automatically create Stay Points, automatically distribute upline commissions, or automatically execute financial payouts. The commission module consumes authoritative information from the relevant existing modules.

---

## 20. Historical Record Preservation

Approved commissions and recorded payouts must remain traceable. Do not overwrite or recreate records when a seller transfers teams, an IST changes designation, an IST converts to OST, an OST converts to IST, a product's current catalog price changes, a payment schedule changes for a different contract, a sale is reversed, a sale is later reconfirmed, a commission is adjusted, or a paid commission becomes subject to Finance recovery review.

The commission recipient must remain linked to the original authorized person/account identity. Do not create a new person merely because a member's IST/OST designation changes. Historical sales remain attributed to the original applicable selling team. Any commission assignment must respect that historical attribution.

If the repository already contains historical commission data, inspect the existing model before documenting reconciliation requirements. Do not assume historical commissions were calculated using the newly approved manual process. Preserve original verified facts and amounts. Do not fabricate old approvals, missing percentages, or payout confirmations.

---

## 21. Audit and Security

All commission-related financial decisions must have an audit trail. Required business events include commission review initiation, recipient selection, percentage assignment, manual Finance approval, commission amount adjustment, automatic Hold application, Finance Hold resolution, commission cancellation, payout initiation or recording, disbursement confirmation, commission becoming Paid, recovery review, manual recovery decision, actual recovery recording, and correction of a financial record.

Audit details should preserve acting Finance user or system identity, timestamp, referenced sale, referenced finalized contract, recipient, applicable historical genealogy, original percentage and amount, revised percentage and amount where applicable, previous and new state, action reason, supporting evidence or reference, and related reversal or adjustment event.

Do not allow ordinary record editing to erase the historical decision trail. Commission payout evidence and recipient financial data must remain protected. Do not expose bank account information or financial evidence through public Customer Lookup, public IST/OST verification, or unrelated Sales Network views. Do not invent database encryption, authentication, or storage implementations without inspecting the existing architecture. Document the business security requirements, not an unapproved technical stack.

---

## 22. Required Business Scenarios

### Scenario A — Confirmed Sale Without Commission

A VIP contract is finalized and Finance verifies the qualifying payment. The sale becomes Confirmed. Finance has not approved any commission. Expected: No commission is automatically awarded.

### Scenario B — Finance Approves Direct Seller Commission

An OST seller has an eligible Confirmed Sale with a finalized contract value of ₱390,000. Finance manually assigns 5%. Calculated commission: ₱19,500. Expected: The amount becomes an approved unpaid commission only after Finance explicitly approves it.

### Scenario C — Finance Assigns Separate Upline Commissions

Using the same eligible sale, Finance selects the eligible historical uplines and enters independent percentages. Expected: Each selected recipient receives a separate calculated commission record, subject to manual approval. No automatic genealogy-based distribution occurs.

### Scenario D — IST Makes a Direct Sale

An IST member directly makes a qualifying sale without an OST recommender. Finance reviews the Confirmed Sale. Expected: Finance may manually approve a direct IST commission according to the authorized workflow.

### Scenario E — Seller Transfers Teams

An OST seller makes a sale under one manager and later transfers to another. Finance reviews the historical sale. Expected: The applicable historical genealogy is preserved. Current team membership does not silently replace historical attribution.

### Scenario F — Approved Commission Remains Unpaid

Finance approves a commission but has not processed any disbursement. Expected: The commission remains approved and unpaid. It must not display as Paid.

### Scenario G — Sale Loses Confirmed Status

A Confirmed Sale with an approved unpaid commission is reversed and loses Confirmed status. Expected: The affected unpaid commission automatically enters Hold. Finance must manually resolve its eventual treatment.

### Scenario H — Paid Commission Affected by Reversal

A commission was already paid. The original sale later loses Confirmed status. Expected: Preserve the Paid history and flag the issue for Finance's manual recovery decision. No automatic deductions or fund recovery.

### Scenario I — Sale Reconfirmed

A reversed sale later becomes Confirmed again after valid Finance verification. Expected: Do not automatically generate another commission or release old held commissions. Finance reviews the appropriate resolution.

### Scenario J — Actual Payout

Finance approves a commission, processes an authorized payment, and confirms actual disbursement. Expected: The commission becomes Paid only after confirmation. Preserve payout evidence and audit details.

### Scenario K — Duplicate Payout Attempt

An already completed payout operation is accidentally submitted again. Expected: The system must prevent duplicate financial settlement or recording.

### Scenario L — Contract Value Changes

An authorized contract adjustment occurs after a commission has been manually approved. Expected: The system does not silently rewrite the original approved commission. Finance reviews the applicable adjustment while preserving original financial history.

For every scenario, describe authorization, state changes, expected records, and audit requirements. These are business acceptance scenarios, not claims of executed application tests.

---

## 23. Non-Negotiable Invariants

The final document must explicitly preserve the following:

1. IST and OST may receive commissions.
2. Finance manually controls commission decisions.
3. No automatic commission award on sale confirmation.
4. Commission amounts are based on manually assigned percentages.
5. The calculation basis is the total finalized contractual amount.
6. Percentage assignment is independent per recipient.
7. Direct sellers and eligible uplines may receive separate commissions.
8. No automatic genealogy-based commission distribution.
9. Historical genealogy determines applicable historical sales relationships.
10. Transfers do not retroactively change original sales attribution.
11. Commission approval requires Confirmed Sale eligibility.
12. Confirmed Sale does not require full settlement when an approved payment scheme qualifies earlier.
13. Confirmed Sale does not automatically create commission entitlement.
14. Finance explicitly approves commissions.
15. Commission approval is separate from payout.
16. Paid status requires confirmation of actual disbursement.
17. No automatic commission payout.
18. An affected unpaid commission automatically enters Hold when its sale loses Confirmed status.
19. Finance manually resolves held commissions.
20. Paid commission history is preserved even after sale reversal.
21. Recovery of paid commissions requires a manual Finance decision.
22. No automatic clawbacks, deductions, or negative payable creation.
23. Contract catalog changes do not retroactively rewrite approved commission amounts.
24. Original commission and payout financial history must remain auditable.
25. Commission records must not duplicate sale recognition.
26. Role permission and record visibility are separate.
27. IST/OST accounts cannot approve or pay their own commissions through ordinary Sales Network permissions.
28. Finance payout authority must be protected.
29. The module must not interfere with Customer, Sales, Finance, Membership, or VIP Card identities.
30. Future automatic commission functionality must not be introduced without separate business approval.

---

## 24. Outstanding Dependencies

- Commission percentage maximums.
- Aggregate percentage caps across recipients.
- Commission approval deadlines.
- Scheduled payout frequency.
- Partial commission payouts.
- Minimum payout thresholds.
- Tax withholding and statutory deductions.
- Recovery offsets against future commissions.
- Exact commission dispute procedures.
- Special promotional commission schemes.
- Accreditation status consequences for commissions already approved.
- Manual percentage changes after payout.
- Eligibility of exceptional or Non-Standard contract arrangements.

Record only unresolved issues that materially affect correct implementation. Do not turn them into blocking questions when the seven approved decisions already establish the core workflow.

---

## 25. Implementation Acceptance Criteria

### Commission Authority
- [ ] Finance exclusively controls manual commission approvals.
- [ ] Both IST and OST can be eligible.
- [ ] No automatic commission award.
- [ ] No automatic percentage assignment.
- [ ] No universal fixed role-based rate.
- [ ] Finance may choose not to award commission.

### Calculation
- [ ] Finance manually enters percentage.
- [ ] Amount uses finalized contract value.
- [ ] Collected installments are not the commission calculation basis.
- [ ] Each recipient has an independently calculated amount.
- [ ] Contract price snapshots are preserved.
- [ ] Historical contracts use their actual finalized value.

### Genealogy
- [ ] Direct seller eligibility.
- [ ] SM upline eligibility.
- [ ] SSM upline eligibility.
- [ ] SVD upline eligibility.
- [ ] IST direct-sale eligibility.
- [ ] Direct OST-to-SVD/SSM/SM relationships supported.
- [ ] No fabricated intermediate managers.
- [ ] Historical genealogy preserved.
- [ ] No automatic commission distribution.

### Approval
- [ ] Confirmed Sale prerequisite.
- [ ] Contract finalization prerequisite.
- [ ] Finance-verified qualifying payment prerequisite.
- [ ] Full payment not universally required.
- [ ] Explicit Finance approval.
- [ ] Approval audit history.
- [ ] No automatic payout on approval.

### Holds and Recovery
- [ ] Automatic Hold when sale loses Confirmed status.
- [ ] Hold affects unpaid commissions.
- [ ] Finance-controlled Hold resolution.
- [ ] Paid history preserved.
- [ ] Manual cancellation and adjustments.
- [ ] Manual recovery decision.
- [ ] No automatic clawbacks.
- [ ] Reconfirmation does not automatically create duplicate commissions.

### Payout
- [ ] Manual Finance payout processing.
- [ ] Amount and recipient recorded.
- [ ] Disbursement details recorded.
- [ ] Supporting evidence tracked.
- [ ] Paid only after actual disbursement confirmation.
- [ ] Duplicate payout protection.
- [ ] Full audit history.

### Reporting and Security
- [ ] Correct unpaid commission reporting.
- [ ] Correct Paid reporting.
- [ ] On-Hold monitoring.
- [ ] Separate personal and authorized team visibility.
- [ ] No unrestricted OST access.
- [ ] Finance-only financial operation authority.
- [ ] No duplicate sales recognition.
- [ ] Protected payout information.
- [ ] Complete audit requirements.

### Cross-Module Consistency
- [ ] Roles and Permissions.
- [ ] Sales Network and Genealogy.
- [ ] IST/OST Accreditation.
- [ ] Customer Management.
- [ ] VIP Products and Contracts.
- [ ] Finance and Payments.
- [ ] Sales Performance Reporting.
- [ ] Historical identity preservation.
- [ ] Existing application behavior distinguished from planned requirements.

---

## Completion Report

- **File created/updated:** `docs/business-rules/08-commission-management.md`
- **Approved rules coverage:** Finance manual control; manual commission percentages; finalized contract calculation basis; direct seller and eligible upline recipients; Finance approval after Confirmed Sale; automatic unpaid commission Hold with manual resolution; manual Finance payout and actual disbursement confirmation.
- **Cross-module review:** Consistent with 01, 02, 03, 04, 05, 06, 07, 13. No material contradictions identified.
- **Outstanding dependencies:** Listed in Section 24.
- **Acceptance results:** All checklist items covered in the document. Documentation completeness does not prove implementation readiness.
- **Change scope:** Documentation only. No application code, database, migrations, other documentation files, Git commit/push/merge, or deployment. Only `docs/business-rules/08-commission-management.md` created.