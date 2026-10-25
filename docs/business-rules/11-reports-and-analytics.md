# AFHomes Platform — Reports & Analytics Business Rules

> Single source of truth for the **Reports & Analytics** module.
> Sales Performance Reporting: `docs/business-rules/13-sales-performance-reporting.md`.
> Finance and Payments: `docs/business-rules/07-finance-and-payments.md`.
> Commission Management: `docs/business-rules/08-commission-management.md`.
> VIP Membership and Stay Points: `docs/business-rules/09-vip-membership-and-stay-points.md`.
> Redemption Management: `docs/business-rules/10-redemption.md`.
> Organization Management: `docs/business-rules/01-roles-and-permissions.md`.
> Customer Management: `docs/business-rules/04-customer-management.md`.
> VIP Products and Contracts: `docs/business-rules/05-vip-products-and-contracts.md`.
> VIP Card Issuance: `docs/business-rules/06-vip-card-issuance.md`.
> Sales Network and Genealogy: `docs/business-rules/02-sales-network-and-genealogy.md`.

---

## 1. Purpose and Scope

Reports & Analytics provides authorized business users with consolidated operational and historical information across AFHomes. It is a consumer of authoritative business data and must not create independent financial truths. It must support reporting for Sales performance, Sales Network performance, genealogy-based team reporting, Customer Management, Finance and collections, Commission Management, VIP contracts and memberships, Stay Points earning and balances, Redemption activity (when authorized and active), Audit and operational activity, Historical comparisons, and Management dashboards.

Reports & Analytics must not implement application functionality, dashboards, APIs, or database views. This is documentation only.

---

## 2. Related Business-Rule Documents

- `01-roles-and-permissions.md` — roles and module permissions.
- `02-sales-network-and-genealogy.md` — hierarchy and attribution.
- `04-customer-management.md` — customer identity and search.
- `05-vip-products-and-contracts.md` — VIP tiers and contracts.
- `06-vip-card-issuance.md` — activation and Card ID.
- `07-finance-and-payments.md` — Finance verification, balances, holds.
- `08-commission-management.md` — commissions.
- `09-vip-membership-and-stay-points.md` — membership and points.
- `10-redemption.md` — redemption lifecycle.
- `13-sales-performance-reporting.md` — authoritative Sales Performance Reporting calculations.

---

## 3. Terminology and Definitions

- **Confirmed Sales Value** — full qualifying finalized contract value counted once when a sale becomes Confirmed.
- **Verified Collections** — Finance-verified payment amounts.
- **Approved Commission** — Finance-approved commission not yet paid.
- **Paid Commission** — commission with confirmed actual disbursement.
- **Available Points** — unlocked, spendable points.
- **Reserved Points** — points committed to approved redemption requests.
- **Annual Earning Capacity** — maximum points earnable per cycle, not a wallet balance.
- **Historical Genealogy Attribution** — sale-time selling team, preserved after transfers.
- **Policy Definition Version** — identifiable reporting definition for traceability.

---

## 4. Current Reporting Policy and Future Revisions

Reporting definitions follow the currently approved AFHomes documents. Authorized management may later approve changes to reporting periods, dashboard layouts, KPI definitions, user permissions, team reporting structures, commission programs, VIP tier configurations, financial presentation requirements, and historical comparison methods. Do not treat every current reporting configuration as a permanent technical limitation.

A reporting policy change must not silently alter original finalized contract amounts, historical confirmed-sale events, original selling-team attribution, verified payment records, paid commission history, previous Stay Points transactions, or original membership activation dates.

Document conceptual requirements for identifying and preserving changes to important report definitions. Where necessary, a report should be able to distinguish between historical business events and the current method of presenting or grouping those events. Do not prescribe a particular database schema or reporting engine.

---

## 5. Reporting Module Responsibilities

Reports & Analytics provides authorized business users with consolidated operational and historical information. It supports Sales performance, Sales Network performance, genealogy-based team reporting, Customer Management, Finance and collections, Commission Management, VIP contracts and memberships, Stay Points earning and balances, Redemption activity (when authorized and active), Audit and operational activity, Historical comparisons, and Management dashboards.

Reports & Analytics is a consumer of authoritative business data and must not create independent financial truths. Finance owns verified payment information. Sales owns the applicable confirmed-sale lifecycle. Genealogy owns reporting relationships. Commission Management owns Finance-approved commission records. VIP Membership owns membership status. Stay Points owns points balances and earning events. Redemption owns completed points consumption events. Reporting must use those authoritative records. Do not create competing calculations that disagree with the originating modules.

---

## 6. Data Ownership and Source of Truth

| Data | Authoritative module |
|---|---|
| Customer identity | Customer Management |
| Sales and genealogy | Sales Network |
| Accreditation | IST/OST Accreditation |
| VIP products/contracts | VIP Products and Contracts |
| VIP Card ID/activation | VIP Card Issuance |
| Payments/balances | Finance and Payments |
| Commissions | Commission Management |
| Membership/points | VIP Membership and Stay Points |
| Redemption | Redemption Management |
| Confirmed Sales | Sales Performance Reporting |
| Audit | Audit Logs |

Reports & Analytics consumes these sources and must not override them.

---

## 7. Roles, Permissions, and Visibility

Use `docs/business-rules/01-roles-and-permissions.md`. AFHomes supports module-based permissions and record-level authorization. These are separate concepts. Having access to a reporting module does not automatically authorize viewing every customer, financial record, or Sales Network branch.

- **Super Admin:** may access all reporting information permitted by the established Super Admin role and security model.
- **Admin:** may view management reporting according to assigned permissions; where existing authorization permits, Admin may access organization-wide reports and select particular Sales Network teams.
- **Finance:** may access authorized financial reporting including Verified Collections, Outstanding Balances, Overdue Payments, Reversals and Refunds, Approved Commissions, Paid Commissions, Financial Reconciliation Cases. Finance reporting access must still respect applicable internal security restrictions.
- **IST — SVD:** may access authorized personal and descendant-team performance information within the relevant SVD branch.
- **IST — SSM:** may access authorized personal and downline reporting within the applicable SSM branch. The SVD upline may be shown as appropriate contextual information, but displaying an upline does not automatically grant access to their private reporting records.
- **IST — SM:** may access authorized personal reporting and relevant OST downline performance. Do not expose unrelated branches.
- **OST:** may access reporting for their own authorized sales and personally permitted commission information. OST access must not automatically include unrelated sellers or team-wide financial records.
- **Customer-facing reporting:** customer-facing interfaces may show appropriately authorized membership, points, and transaction summaries. Do not expose internal Finance operations, unrelated customers, or confidential organizational analytics.

Critical privacy rule: record-level reporting visibility must be enforced through the underlying authorization model. Hiding a table column or sidebar item is not sufficient protection.

---

## 8. Reporting Date Filters

Established reporting-period choices: Today, Past 7 Days, Past 28 Days, Past 6 Months. The system may also support optional Start Date and End Date. The older "Period preset" control label was removed from the approved interface direction; do not reintroduce it as a mandatory UI requirement.

### Date filtering requirements

Document conceptual rules for preset date ranges, custom start and end dates, consistent date boundaries, reporting timezone, start/end validation, relevant business-event date, historical comparisons.

### Timezone

Use the established Asia/Manila business-date convention where applicable. Do not assume UTC calendar boundaries are interchangeable with local business dates.

### Different business events use different dates

A reporting range must apply to the correct event:

| Report | Relevant business date |
|---|---|
| Confirmed Sales | Finance confirmation/recognition event |
| Verified Collections | Finance-verified financial event |
| Commission Approvals | Finance commission approval event |
| Commission Payouts | Confirmed actual disbursement event |
| Membership Activations | Official membership activation event |
| Stay Points Earnings | Authorized verified earning event |
| Completed Redemptions | Actual authorized consumption/completion event |

This table expresses conceptual event ownership. Reconcile exact date attribution with existing documents. Do not silently substitute customer submission dates for authoritative confirmation dates.

### Historical consistency

Filtering a historical period must not reassign old sales to a salesperson's current team.

---

## 9. Sales Performance Integration

Use `docs/business-rules/13-sales-performance-reporting.md`. Do not redefine its existing approved financial recognition rules. Reference them.

### Confirmed Sale

A sale becomes Confirmed when: (1) the customer contract has been finalized by authorized Admin; and (2) Finance verifies the qualifying payment required by the selected contractual payment scheme. A Confirmed Sale does not necessarily mean Fully Paid.

### Reporting amount

The existing approved rule recognizes the full qualifying finalized contract value once when the sale becomes Confirmed. Subsequent installment collections must not count the same sale again as a new full-value sale.

Example: a finalized VIP contract valued at ₱240,000; Finance verifies the qualifying initial payment; the sale becomes Confirmed; Sales reporting recognizes the applicable ₱240,000 contract value once. Future installment payments contribute to Finance collections and settlement reporting, not repeated full-value sales recognition.

Important: do not conflate the Sales Performance Reporting measure with statutory accounting revenue recognition. Do not invent an accounting policy saying that the full contract amount is immediately recognized as accounting revenue. Use the approved business term Confirmed Sales Value where appropriate.

---

## 10. Sales Reporting Categories

Document the reporting distinctions already supported by approved rules: personal/direct sales; downline/team sales; Pending sales; Confirmed sales; Reversed or adjusted sales; Sales grouped by relevant period; Sales grouped by authorized network scope; Sales grouped by finalized VIP product; Sales grouped by permitted acquisition or sales attribution category. Do not invent additional revenue-recognition methods.

### No double counting

One underlying sale must not become multiple distinct sales because it appears in a direct seller report, SM report, SSM report, SVD report, or Admin dashboard. These may be different authorized reporting perspectives on the same sale. The underlying sale identity must remain unique. When aggregating the network as a whole, count the qualifying sale only once.

---

## 11. Sales Reversals and Reconfirmation

Preserve the existing Sales Performance Reporting behavior. A previously confirmed sale reversal creates the corresponding negative adjustment in the authorized reversal period. A later valid reconfirmation creates the applicable positive adjustment in the new confirmation period. Authorized contract-price changes use appropriate reporting deltas under the existing approved rules. Historical integrity: do not erase original confirmation history; do not silently rewrite earlier sales attribution; do not count the same confirmation multiple times through repeated processing.

Commission impact: a sale reversal may trigger an automatic Hold on affected unpaid commissions. Commission reporting must use the authoritative Commission Management state rather than invent independent commission adjustments.

---

## 12. Sales Network Genealogy Reporting

Preserve the established Sales Network hierarchy: SVD → SSM → SM → OST. However, an OST may report directly to SVD, SSM, or SM. Do not fabricate intermediate managers.

Clearly distinguish Personal Performance (sales personally attributed to the member) and Team Performance (authorized sales activity attributable to the relevant historical genealogy branch).

Historical transfers: if an OST transfers from one SM to another, historical sales remain attributed to the appropriate team at the time of each sale. New sales follow the new valid genealogy relationship. Do not calculate historical team performance solely from current parent relationships. Preserve sale-time attribution.

---

## 13. Sales Network Analytics

Previous approved AFHomes analytics discussions established these reporting concepts: Total Sales, Eligible Sellers, With Sales, No Sales. These metrics must be reconciled with the actual existing business documents and implementation definitions.

- **Total Sales:** use the authoritative Sales Reporting rules. Determine whether the existing source defines this as value, count, or both. Do not invent a new metric meaning.
- **Eligible Sellers:** use the established accreditation and account-eligibility rules. Do not assume that every existing account was eligible throughout every historical period.
- **With Sales:** identify eligible sellers who had applicable qualifying sales in the selected reporting period. The exact qualifying sale state must follow the established reporting definition.
- **No Sales:** identify eligible sellers without qualifying sales in the selected period. Do not count unrelated, inactive, or otherwise ineligible accounts as eligible sellers unless the approved definition specifically includes them.

These metrics should support the approved date filters. Document the current approved direction for Admin organization-wide reporting, Admin selection of a particular team where authorized, SVD downline reporting, SSM downline reporting, SM downline reporting, OST personal reporting. Do not expand any role's visibility without authorization.

---

## 14. Most Active and No-Sales Teams

The project previously requested straightforward analytics for most active sellers, sellers with no sales, and team activity. Document the business-level requirement without inventing a scoring system. Do not assume "most active" means highest contract value, most transactions, most confirmed sales, highest commission, or most customer referrals. These are different possible definitions. Use the actual verified existing source definition if one is established. Otherwise record the precise metric definition as a remaining dependency. Do not fabricate a company-approved ranking formula.

---

## 15. Finance Reporting

Use `docs/business-rules/07-finance-and-payments.md`. The Finance module is authoritative for payment verification. Reports & Analytics must provide accurate views of Finance-verified activity.

Reporting categories: Verified Collections; Pending Payment Submissions; Rejected or Returned Payment Submissions; Outstanding Contractual Balances; Due Installments; Overdue Installments; Fully Settled Contracts; Payment Reversals; Refunds; Net Verified Collections; Finance Reconciliation Cases; Membership Financial Holds.

### Financial Reporting Integrity

- A submitted receipt is not an officially verified collection.
- Only authorized Finance verification establishes recognized payment receipt under the approved operational workflow.
- Balances must follow actual finalized contractual terms, verified receipts, and valid reconciliation events.
- A payment reversal must not be displayed as though the original payment never existed. Preserve original transaction history and the relevant correction event.
- Refunds must be distinguishable from ordinary payments and reversals.
- Fully Paid requires verified settlement of the applicable finalized contractual amount.
- Fully Paid does not automatically mean the VIP Membership is Active.
- Reservation payments included in the total purchase price must not be counted twice.
- A historical correction must preserve the applicable event chronology and period-adjustment rules.
- Do not invent tax recognition or financial-statement accounting rules.

---

## 16. Commission Analytics

Use `docs/business-rules/08-commission-management.md`. Commission Management is currently a manually controlled Finance workflow. A Confirmed Sale does not automatically create an approved commission.

### Approved commission basis

Finance manually assigns a commission percentage calculated from the total finalized contract value.

### Recipients

Finance may independently assign commissions to Direct IST seller, Direct OST seller, Eligible historical SM upline, Eligible historical SSM upline, Eligible historical SVD upline. No automatic genealogy-based commission distribution.

### Approval timing

Finance may manually approve commissions after the underlying sale becomes Confirmed. Full contractual settlement is not universally required.

### Commission Reporting Categories

Document reporting for: Under Review commissions; Approved commissions; Approved but Unpaid commissions; Commissions On Hold; Paid commissions; Cancelled commissions; Adjusted commissions; Manual recoveries; Approved commission obligations; Commission totals by recipient; Commission totals by authorized genealogy branch; Commission approval dates; Confirmed payout dates.

Critical distinction: Approved commission is not equivalent to Paid commission. A commission becomes Paid only after Finance confirms actual disbursement.

Automatic Hold: when an underlying sale loses Confirmed status, affected unpaid commissions automatically enter Hold.

Paid commissions: previously paid commissions remain historically recorded even if the original sale is later reversed. Any recovery is manually determined by Finance.

No automatic deductions: reports must not fabricate clawbacks or negative balances.

No duplicate aggregation: a sale can generate several separately approved commissions. Those commission records must not create additional underlying sales.

---

## 17. VIP Contract and Membership Analytics

### 17.1 VIP Product Reporting

Use `docs/business-rules/05-vip-products-and-contracts.md`. Document requirements for: VIP product distribution; Finalized contracts by tier; Contracts by approved payment scheme; Standard versus Non-Standard contracts; Contractual purchase values; Historical finalized product terms; Retired product references; Contract status distribution.

Historical contracts: use the actual finalized contractual price. Do not recalculate old contract values from current VIP product configurations.

Current standard tiers: Bronze ₱72,000 / 7 years; Silver ₱240,000 / 12 years; Gold ₱390,000 / 22 years. These are updated standard catalog baselines, not universal historical transaction values. Existing source-document conflicts must remain identified until formally resolved.

### 17.2 VIP Membership Reporting

Use `docs/business-rules/09-vip-membership-and-stay-points.md`. Document reporting for: Active Memberships; Pending Activation; Expired Memberships; Cancelled Memberships; Suspended Memberships; Membership Financial Holds; Membership Activations by period; Memberships by VIP tier; Contractual membership validity; Upcoming expirations; Historical memberships.

Important distinction: customer records and membership records are separate concepts. A customer may exist without an Active VIP Membership. Do not report all existing customers as Active members.

Activation reporting: use the actual official Membership Activation Date. Do not substitute reservation or contract dates.

Historical entitlements: preserve actual contract-specific validity and benefit terms.

---

## 18. Stay Points Reporting

Use `docs/business-rules/09-vip-membership-and-stay-points.md`. The current approved earning policy is ₱1 verified eligible direct resort spending = 1 Stay Point. The full annual points allowance is not automatically released when the minimum spend is reached. Points are earned through individual eligible verified resort transactions.

Current tier limits: Bronze minimum ₱1,000 / cap 10,000; Silver minimum ₱2,000 / cap 20,000; Gold minimum ₱3,000 / cap 25,000. Allocation: 70% Weekday, 30% Weekend.

Document reporting for: Verified Eligible Resort Spending; Minimum Spending Progress; Pending Points; Earned Points; Unlocked Points; Available Points; Reserved Points; Held Points; Redeemed Points; Forfeited Points; Expired Points; Remaining Annual Earning Capacity; Annual Earning Cap Usage; Points Reconciliation Cases.

### Points Reporting Integrity

Do not confuse Annual Earning Capacity (maximum points that can be earned during a cycle) with Actual Earned Points (points already supported by eligible verified transactions), Pending Points (earned but not yet unlocked), Available Points (unlocked points currently eligible for use), Reserved Points (points committed to approved redemption requests), Held Points (points temporarily restricted from use), or Redeemed Points (points consumed through authorized completed services).

Example: A Bronze member earns 6,000 points, then redeems 2,000 through an authorized completed redemption. The annual earned total remains 6,000. The remaining annual earning capacity is still 4,000. It must not increase to 6,000 merely because points were spent.

Gold supplementary holder: Gold primary and supplementary holders share one membership points pool. Do not double-count balances as two separate memberships.

Historical points: preserve valid imported balances without inventing historical earning transactions.

---

## 19. Redemption Reporting

Use `docs/business-rules/10-redemption.md`. Document future reporting for: Submitted Redemption Requests; Requests Under Review; Approved Redemptions; Reserved Points; Pending Payment Bookings; Confirmed Bookings; Completed Services; Final Points Consumption; Cancelled Bookings; Released Reserved Points; Forfeited Points; No-Shows; Points + Cash Transactions; Finance-Verified Monetary Portions; Policy Exceptions; Redemption Reconciliation Cases.

Important distinction: Approved redemption is not the same as completed redemption. Reserved points are not yet finally consumed. A booking can remain Pending Payment after the points component has been approved. A Confirmed booking does not necessarily mean the service has been completed.

Redemption pricing may use Admin-configured monetary conversion or Admin-configured service-specific points prices. Do not assume the points earning conversion is the same as redemption monetary value.

---

## 20. Disabled Module Status

The planned standalone MongoDB system preserves Redemption and Services functionality but keeps these modules hidden and disabled for now. Documentation must not authorize their reactivation. Historical authorized redemption information may remain relevant for reporting and audit purposes. However, defining Redemption reports must not automatically expose a disabled Redemption module, enable new redemption requests, enable blocked routes, re-enable Services, start points consumption processing, or turn on redemption feature flags. Actual reporting availability must respect the implementation's feature flags and authorization rules.

---

## 21. Customer Management Analytics

Use `docs/business-rules/04-customer-management.md`. Document authorized internal reporting for: Total customer master records; New customers by period; Customer creation source; Customer acquisition channels; Customer applications; Draft applications; Submitted applications; Customers with Active VIP Memberships; Customers without Active VIP Memberships; Customers with multiple authorized purchases; Customer transaction relationships; Customer status where actually defined; Customer acquisition and sales-attribution trends.

Customer identity: do not treat each VIP purchase as a separate customer identity. Do not merge unrelated people merely because they appear in multiple sales.

Privacy: Public Customer Lookup must remain separate from internal Customer Management Analytics. Existing public verification rules limit disclosure to eligible Active membership records and approved fields. Do not expose government IDs, private addresses, confidential contact information, payment proofs, internal financial details, or audit records.

Acquisition channels: use source-documented acquisition channel options where supported. Do not invent extra labels or silently merge distinct source categories.

---

## 22. Management Dashboard Requirements

Dashboard reporting should present accurate business information without becoming an independent authority for changing records. Conceptually document dashboard areas for Sales Performance, Finance and Collections, Commission Obligations, Membership Distribution, Stay Points, Customer Growth, Sales Network Activity, and Operational Exceptions. These areas are documentation subjects, not an authorization to implement a dashboard design. Do not prescribe an arbitrary visual layout. Do not create frontend components. Do not invent fixed colors, chart libraries, or UI frameworks. Follow the actual project architecture and existing design conventions.

---

## 23. Role-Specific Dashboards

Document how report visibility should correspond to the user's actual role and applicable data scope.

- **Admin:** may view authorized organizational reports. Where permitted, Admin may select a target Sales Network team.
- **SVD:** views applicable branch-level and personal performance.
- **SSM:** views authorized SSM branch performance and personal information.
- **SM:** views authorized SM branch and OST downline performance.
- **OST:** views their own relevant sales and permitted commission information.
- **Finance:** views authorized collections, outstanding balances, verified payments, commissions, payouts, and reconciliation cases.

Important boundary: an authorized sales manager may view team sales performance without obtaining unrestricted private customer contact information or payout evidence. Do not bypass privacy rules through dashboards.

---

## 24. Metric Definition Governance

The document must establish a consistent approach to defining metrics. For each important KPI, describe: business purpose; source module; relevant records; applicable eligibility rules; event date; aggregation method; role visibility; historical treatment; adjustment behavior; known unresolved assumptions.

Example — Confirmed Sales Value: Source Sales and Finance as governed by document 13; Recognition applicable Confirmed Sale event after finalized contract and verified qualifying payment; Aggregation full qualifying finalized contract value counted once, subject to approved adjustments; Visibility according to the user's permitted Sales Network scope.

Do not invent business targets such as every SM must achieve ₱1 million monthly, OST must produce five sales per month, SVD commission should be 2%, or minimum customer conversion should be 20%. These values have not been approved.

---

## 25. Reporting Grain and Duplicate Prevention

Document the importance of preserving the correct reporting grain. Examples: Customer canonical customer identity; Sale unique sale identity; Payment authorized payment or settlement event; Commission approved recipient-specific commission record; Membership canonical VIP membership; Points Earning unique authorized earning event; Redemption authorized redemption transaction; Seller Performance sale attribution under applicable genealogy.

Duplicate prevention: do not multiply sales values merely because a customer has multiple payments, a sale has multiple commission recipients, a salesperson appears in multiple upline reports, a membership has a supplementary holder, or a points transaction has Weekday and Weekend allocations. A report must preserve the intended unique business event count.

---

## 26. Historical Reporting and Reconciliation

Preserve historical business events. Examples: old contracts preserve old agreed prices; past sales remain assigned to the original applicable selling teams; original payment verification dates remain traceable; historical commission approvals remain recorded; completed commission payouts remain recorded; original VIP Membership activation dates remain unchanged; historical point balances remain traceable; redemption history remains preserved.

Policy changes: when reporting policies change, do not silently rewrite underlying historical financial facts.

Restatements and corrections: if an authorized correction affects a historical report, preserve enough information to explain original value, corrected value, effective business event, adjustment date, reason, authorized actor. Do not invent unsupported historical transactions.

---

## 27. Historical Genealogy

Historical sales attribution must reflect the sales hierarchy applicable to the original sale. Example: an OST seller completes a sale under SM A, then transfers to SM B. The earlier sale remains attributed to the original branch under the governing historical attribution rule. New sales follow the new applicable branch. Reporting must not silently transfer the earlier sale to SM B.

Organizational totals: when producing authorized management totals, avoid double-counting the same sale across overlapping genealogy views.

---

## 28. Audit and Security Reporting

Audit Logs are an existing core module. Document authorized reporting for significant business events such as account status changes, Sales Network transfers, accreditation changes, contract approvals, payment verification, payment reversal or refund, commission approval, commission payout, membership activation, Financial Hold, Points Hold, points reconciliation, redemption approval and completion, Admin reporting configuration changes.

Audit requirements: preserve meaningful information about acting identity, authorized action, timestamp, affected entity, previous and resulting state, supporting reason or reference, relevant business-event correlation. Privacy: audit reporting must not expose unnecessary private data to unauthorized users. Do not create a public audit-reporting capability.

---

## 29. Cross-Module Integration Matrix

| Module | Reporting responsibility |
|---|---|
| Roles and Permissions | Determines access to reports and underlying records |
| Sales Network | Seller identities and reporting scope |
| Genealogy | Historical team attribution |
| IST/OST Accreditation | Authorized member context and eligibility |
| Customer Management | Canonical customer information |
| VIP Products and Contracts | Finalized contractual snapshots |
| VIP Card Issuance | Official card and activation references |
| Finance and Payments | Verified collections and balances |
| Commission Management | Approved commissions and payouts |
| VIP Membership | Actual membership states |
| Stay Points | Earning, unlocking, reservations, holds, and consumption |
| Redemption | Approved, reserved, completed, and cancelled redemption activity |
| Sales Performance Reporting | Confirmed sale recognition and adjustments |
| Audit Logs | Traceable business-state changes |

Explain that Reports & Analytics must not independently override the authoritative modules.

---

## 30. Required Business Scenarios

(See Part XX of the task prompt for scenarios A–Q; summarized here with expected outcomes.)

- **Scenario A (Confirmed installment sale):** Confirmed Sales Value reflects qualifying ₱240,000 contract once; Finance collections reflect actual verified payments; outstanding balance separate; membership not automatically Active.
- **Scenario B (Additional installment):** verified collections update; outstanding balance changes; Confirmed Sales Value not counted again.
- **Scenario C (Sale reversal):** reporting follows document 13's approved negative adjustment treatment; historical confirmation traceable; affected unpaid commissions enter Hold.
- **Scenario D (Commission approval):** approved commission reporting updates; Paid commission reporting does not update until actual disbursement.
- **Scenario E (Commission payout):** Paid commission report updates; original sale count unchanged.
- **Scenario F (Seller transfer):** historical sales remain attributed to original applicable genealogy; new sales follow new team; no duplicate network-wide sales.
- **Scenario G (No-sales seller):** reporting applies established eligibility and no-sales definitions; do not count unrelated or ineligible members.
- **Scenario H (Membership activation):** Fully Paid reporting may include the transaction; Active Membership reporting excludes it until activation.
- **Scenario I (Stay Points earning):** Bronze ₱1,000 eligible verified spend earns 1,000 points; no automatic 10,000-point grant; correct Weekday/Weekend allocation; reporting distinguishes earned points from remaining annual capacity.
- **Scenario J (Points redemption):** 5,000 available, reserve 2,000 → available decreases, reserved increases, consumed does not increase until authorized completion.
- **Scenario K (Gold supplementary member):** one shared membership balance; no duplicate total points in reporting.
- **Scenario L (Payment reversal and Financial Hold):** membership Financial Hold reflected; financial collection reporting updates; historical activation and Card ID remain unchanged.
- **Scenario M (Refunded resort spending):** source points ledger reflects authorized hold and Finance reconciliation; reporting distinguishes Held from Available points; no invented negative balances.
- **Scenario N (Reporting date filter):** Admin selects Past 28 Days; each report uses applicable authoritative event date; date boundaries follow established project conventions; totals consistent with underlying module reports.
- **Scenario O (Privacy):** OST user attempts to view unrelated seller or customer financial data → unauthorized records unavailable; reporting access does not bypass record-level permissions.
- **Scenario P (Disabled Redemption):** Redemption disabled in planned MongoDB system → no new Redemption workflow activated; existing relevant historical records preserved; documentation does not enable hidden functionality.
- **Scenario Q (Policy revision):** management authorizes future change to a reporting definition → new reporting behavior follows authorized policy; historical source records preserved; material metric-definition changes identifiable.

For every scenario, describe preconditions, relevant source data, applicable reporting event, expected calculation or classification, authorized visibility, historical/audit implications. Do not claim executable tests passed.

---

## 31. Business-Rule Invariants

The document must preserve these current approved principles:

1. Reporting does not create new business transactions.
2. Reports use authoritative module data.
3. Customer records and VIP Memberships are separate.
4. Confirmed Sales and Finance collections are separate measures.
5. Confirmed Sale does not necessarily mean Fully Paid.
6. Fully Paid does not automatically mean Active Membership.
7. Full qualifying contract value is counted once for Confirmed Sales under the existing reporting rule.
8. Subsequent installments must not duplicate the original full-value sale.
9. Sales reversal adjustments must follow document 13.
10. Historical genealogy attribution must be preserved.
11. Team totals must not double-count underlying sales.
12. Commission approval is manual.
13. Approved commissions are not automatically Paid.
14. Commission payouts require actual confirmed disbursement.
15. Commission Holds and recoveries follow existing Finance-controlled rules.
16. Annual Stay Points earning capacity is not an actual points balance.
17. Pending points are not Spendable points.
18. Reserved points are not yet Consumed points.
19. Gold supplementary holders share one membership points pool.
20. Refund-related Points Holds must be represented accurately.
21. Historical contracts retain their original agreed terms.
22. Admin product changes do not retroactively alter finalized contracts.
23. Reporting permissions must respect record-level security.
24. Public Customer Lookup is not unrestricted internal analytics.
25. Different financial and operational events may use different reporting dates.
26. Reporting definition changes must not silently corrupt historical data.
27. Audit history must remain traceable.
28. Hidden or disabled modules must not be reactivated by reporting work.
29. Current business rules may be revised through authorized decisions.
30. Documentation does not authorize application implementation.

---

## 32. Unresolved Business Definitions

Some reporting details may require future authorization. Potential unresolved matters include: exact definition of "Most Active Seller"; whether Total Sales means value, count, or both in each dashboard; precise historical seller-eligibility denominator; sales conversion-rate calculations; customer retention metrics; revenue accounting treatment; commission liability accounting classification; Stay Points financial liability valuation; formal growth-rate measurement methods; organization-wide KPI targets; dashboard refresh frequency; reporting cache requirements; export permissions and formats; detailed cross-period comparative formulas; formal financial accounting statements; historical policy restatement requirements.

Do not introduce assumptions as approved business rules. For every material unresolved issue: describe the missing definition; explain why it matters; identify the governing source where possible; keep it marked as unresolved; avoid inventing numerical targets. Minor implementation choices should not become unnecessary business questions.

---

## 33. Implementation Acceptance Checklist

### Documentation and Governance
- [ ] Existing documentation inspected.
- [ ] Numbering checked.
- [ ] Document 13 preserved.
- [ ] Current versus future policy distinction documented.
- [ ] Reporting definition changes supported conceptually.
- [ ] Historical integrity addressed.

### Authorization
- [ ] Super Admin scope.
- [ ] Admin scope.
- [ ] Finance scope.
- [ ] SVD scope.
- [ ] SSM scope.
- [ ] SM scope.
- [ ] OST scope.
- [ ] Customer privacy.
- [ ] Record-level restrictions.

### Date Filtering
- [ ] Today.
- [ ] Past 7 Days.
- [ ] Past 28 Days.
- [ ] Past 6 Months.
- [ ] Optional Start Date.
- [ ] Optional End Date.
- [ ] Relevant business-event dates.
- [ ] Asia/Manila date conventions.

### Sales
- [ ] Confirmed Sales definition.
- [ ] Full contract-value recognition once.
- [ ] Personal versus team reporting.
- [ ] Historical genealogy preservation.
- [ ] Reversal adjustments.
- [ ] Reconfirmation adjustments.
- [ ] No double-counting.
- [ ] Document 13 integration.

### Sales Network
- [ ] Actual SVD/SSM/SM/OST hierarchy.
- [ ] Direct OST parent relationships.
- [ ] Eligible Sellers.
- [ ] With Sales.
- [ ] No Sales.
- [ ] Authorized team analytics.
- [ ] Most Active definition dependency identified.

### Finance
- [ ] Verified collections.
- [ ] Pending payment submissions.
- [ ] Outstanding balances.
- [ ] Due and overdue payments.
- [ ] Refunds and reversals.
- [ ] Fully Paid reporting.
- [ ] Financial Holds.

### Commissions
- [ ] Manual Finance approval.
- [ ] Finalized contract calculation basis.
- [ ] Independent recipient records.
- [ ] Approved unpaid commissions.
- [ ] On-Hold commissions.
- [ ] Paid commissions.
- [ ] Actual disbursement requirement.
- [ ] Manual recoveries.
- [ ] No automatic commissions.

### VIP Membership
- [ ] Active memberships.
- [ ] Pending activation.
- [ ] Expired memberships.
- [ ] Membership Financial Holds.
- [ ] VIP tier reporting.
- [ ] Contract-specific historical values.

### Stay Points
- [ ] Transaction-based earning.
- [ ] Annual minimum qualifying spend.
- [ ] Annual earning caps.
- [ ] Weekday and Weekend points.
- [ ] Pending points.
- [ ] Unlocked points.
- [ ] Available points.
- [ ] Held points.
- [ ] Reserved points.
- [ ] Redeemed points.
- [ ] Historical points preservation.

### Redemption
- [ ] Requests.
- [ ] Approvals.
- [ ] Points reservations.
- [ ] Pending Payment.
- [ ] Confirmed bookings.
- [ ] Completed services.
- [ ] Final points consumption.
- [ ] Cancellations and no-shows.
- [ ] Disabled module requirements preserved.

### Reporting Integrity
- [ ] Source-of-truth ownership.
- [ ] Duplicate prevention.
- [ ] Historical reconciliation.
- [ ] Confidentiality.
- [ ] Audit history.
- [ ] No unsupported metric formulas.

---

## Completion Report

- **File created/updated:** `docs/business-rules/11-reports-and-analytics.md`
- **Business rule coverage:** Reporting governance and flexibility; role-based visibility; date filters; Sales reporting; genealogy reporting; seller analytics; Finance reporting; Commission reporting; VIP reporting; Stay Points reporting; Redemption reporting; Customer analytics; Audit and security.
- **Cross-module review:** Consistent with 01–10 and 13. Document 13 preserved as authoritative for Sales Performance Reporting. No material contradictions.
- **Outstanding dependencies:** Listed in Section 32.
- **Acceptance results:** All checklist items covered. Documentation completeness does not prove implementation readiness.
- **Change scope:** Documentation only. No application code, database, migrations, existing documentation files, Git commit/push/merge, or deployment. Only `docs/business-rules/11-reports-and-analytics.md` created. Redemption and Services remain disabled. No unauthorized implementation assumptions.