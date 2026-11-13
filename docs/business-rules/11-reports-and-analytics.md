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

Reports & Analytics must not implement application functionality, dashboards, APIs, or database views. This was a documentation-only specification when written; the frontend now builds against it, and building each report still needs owner authorization.

Scope notes (owner ruling R11, 2026-11-12): IGP sales are in scope and built together with VIP (rules in `docs/business-rules/14-igp-sales.md`). Redemption is planned in doc 10 and stays disabled until the owner authorizes its build. There is no public VIP card or customer lookup (section 21). The CMS (website page editor) is deferred.

---

## 2. Related Business-Rule Documents

- `01-roles-and-permissions.md` — roles and module permissions.
- `02-sales-network-and-genealogy.md` — hierarchy and attribution.
- `04-customer-management.md` — customer identity and search.
- `05-vip-products-and-contracts.md` — VIP tiers and contracts.
- `06-vip-card-issuance.md` — VIP Number, activation and Card Claim Date.
- `14-igp-sales.md` — IGP sales, Series Number, IGP thresholds and commission release.
- `07-finance-and-payments.md` — Finance verification, balances, holds.
- `08-commission-management.md` — commissions.
- `09-vip-membership-and-stay-points.md` — membership and points.
- `10-redemption.md` — redemption lifecycle.
- `13-sales-performance-reporting.md` — authoritative Sales Performance Reporting calculations.

---

## 3. Terminology and Definitions

- **Confirmed Sales Value** — full contract value counted once when a sale becomes Confirmed (Closed Deal: approved receipts reach 25% of the contract price once the Administrator approves the sale record, doc 13 §4).
- **Verified Collections** — amounts of approved receipts (approved by Finance, the Administrator or the Super Administrator, doc 07 §5.2).
- **Approved Commission** — released commission included in a month-end payout list approved by Finance, the Administrator or the Super Administrator, not yet paid (doc 08 §11).
- **Paid Commission** — commission with confirmed actual disbursement.
- **Released Points** — points of an Annual Welcome Gift tranche that has been released (doc 09 §12).
- **Available Points** — released points not reserved or redeemed (doc 09 §15.1).
- **Reserved Points** — points set aside for a confirmed booking, not yet consumed (doc 10).
- **Unreleased Tranche** — a scheduled tranche whose due date has not come or whose condition is not yet met; it is not a points balance.
- **Historical Genealogy Attribution** — sale-time selling team, preserved after transfers.
- **Policy Definition Version** — identifiable reporting definition for traceability.

---

## 4. Current Reporting Policy and Future Revisions

Reporting definitions follow the currently approved AFHomes documents. Authorized management may later approve changes to reporting periods, dashboard layouts, KPI definitions, user permissions, team reporting structures, commission programs, VIP tier configurations, financial presentation requirements, and historical comparison methods. Do not treat every current reporting configuration as a permanent technical limitation.

A reporting policy change must not silently alter original finalized contract amounts, historical confirmed-sale events, original selling-team attribution, verified payment records, paid commission history, previous Stay Points transactions, or original membership activation dates.

Document conceptual requirements for identifying and preserving changes to important report definitions. Where necessary, a report should be able to distinguish between historical business events and the current method of presenting or grouping those events. Do not prescribe a particular database schema or reporting engine.

---

## 5. Reporting Module Responsibilities

Reports & Analytics provides authorized business users with consolidated operational and historical information. It supports Sales performance, Sales Network performance, genealogy-based team reporting, Customer Management, Finance and collections, Commission Management, VIP contracts and memberships, Stay Points tranche releases and balances, Redemption activity (when authorized and active), Audit and operational activity, Historical comparisons, and Management dashboards.

Reports & Analytics is a consumer of authoritative business data and must not create independent financial truths. Finance owns verified payment information. Sales owns the applicable confirmed-sale lifecycle. Genealogy owns reporting relationships. Commission Management owns commission rates, releases, payouts, clawbacks and allowances. VIP Membership owns membership status. Stay Points owns tranche releases and points balances. Redemption owns completed points consumption events. Reporting must use those authoritative records. Do not create competing calculations that disagree with the originating modules.

---

## 6. Data Ownership and Source of Truth

| Data | Authoritative module |
|---|---|
| Customer identity | Customer Management |
| Sales and genealogy | Sales Network |
| Accreditation | IST/OST Accreditation |
| VIP products/contracts | VIP Products and Contracts |
| VIP Number/activation/Card Claim Date | VIP Card Issuance |
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
- **Finance:** may view all reports, including sales reports, view only (owner ruling, 2026-11-12; follow-up item 25). Financial reporting includes Verified Collections, Outstanding Balances, Overdue Payments, Reversals and Refunds, Approved Commissions, Paid Commissions, Financial Reconciliation Cases. Finance reporting access must still respect applicable internal security restrictions.
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
| Confirmed Sales | Closed Deal date: approved receipts first reach 25% of the contract price, once the Administrator approves the sale record (doc 13 §4.3) |
| Stage 1 / Full Payment | Dates approved receipts first reach 40% / 100% (doc 13 §4.4) |
| Verified Collections | Receipt approval; a late receipt for a closed month counts in the first open month (doc 07 §9.1) |
| Commission Releases | Month in which a release stage (VIP 40%; IGP 40% and full payment) is first reached (doc 08 §8.2) |
| Commission Approvals | Month-end payout list approval event |
| Commission Payouts | Confirmed actual disbursement event |
| Membership Activations | Official membership activation event |
| Membership Validity | Card Claim Date, actual or deemed (doc 06 §4.3) |
| Stay Points Releases | Tranche release date (doc 09 §12) |
| Completed Redemptions | Actual authorized consumption/completion event |

This table expresses conceptual event ownership. Reconcile exact date attribution with existing documents. Do not silently substitute customer submission dates for authoritative confirmation dates.

### Historical consistency

Filtering a historical period must not reassign old sales to a salesperson's current team.

### Closed months

The Administrator or the Super Administrator closes a month, and a closed month's figures never change (owner ruling R7 item 2; doc 13 §4.5). Later events that affect it are reported as dated adjustments in the open month in which they happen.

---

## 9. Sales Performance Integration

Use `docs/business-rules/13-sales-performance-reporting.md`. Do not redefine its existing approved financial recognition rules. Reference them.

### Confirmed Sale

A sale becomes Confirmed (Closed Deal) when approved receipts reach 25% of the contract price once the Administrator approves the sale record (owner ruling R7, 2026-11-12; doc 13 §4). A Confirmed Sale does not necessarily mean Fully Paid. Contract finalization is not required for the count (doc 07 follow-up item 1; doc 13 §4).

### Reporting amount

The approved rule recognizes the full contract value once when the sale becomes Confirmed. Subsequent installment collections must not count the same sale again as a new full-value sale.

Example: a VIP contract valued at ₱240,000; approved receipts reach ₱60,000 (25%); the sale becomes Confirmed; Sales reporting recognizes the applicable ₱240,000 contract value once. Future installment payments contribute to Finance collections and settlement reporting, not repeated full-value sales recognition.

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

Pay attribution is separate (owner ruling R9 item 2, 2026-11-12; doc 02 §6.3): team credit for leader allowances (BA, PA, PB) and team KPIs follows the current upline chain (AUG R23), and team KPIs include VIP and IGP sales (doc 14 §9). Sale-level team reports keep the sale-time attribution above.

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

Use `docs/business-rules/07-finance-and-payments.md`. The Finance and Payments module is authoritative for receipt approval. Reports & Analytics must provide accurate views of approved activity.

Reporting categories: Verified (approved) Collections; Pending Receipts; Rejected or Returned Receipts, including resent versions; Outstanding Contractual Balances; Due Installments; Overdue Installments; Fully Settled Contracts; Payment Reversals; Refunds; Net Verified Collections; Late Receipts admitted into an open month; Sales with no approved receipt for 90 days; Defaulted sales; Finance Reconciliation Cases; Membership Financial Holds.

### Financial Reporting Integrity

- An entered receipt is not an approved collection.
- Only an approved receipt counts. Finance, the Administrator or the Super Administrator approves receipts (owner ruling R6, 2026-11-12; doc 07 §5.2).
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

Use `docs/business-rules/08-commission-management.md` (owner rulings R8 and R9, 2026-11-12) and, for IGP, `docs/business-rules/14-igp-sales.md` §8. Reports consume the commission records of Commission Management; they never recompute rates or amounts independently.

### Commission basis

DSC = contract TCP × the closing seller's frozen DSC rate. DRI = contract TCP × the referrer's frozen DRI rate. Each person's rates are kept per product on their seller record, default to the standard for their position, and are frozen on the sale when its VIP Number (IGP: Series Number) is issued (doc 08 §8.1, §9, §10). Reports use the frozen rate and amount, never a person's current rate.

### Recipients

Per-sale commission goes only to the closing seller (DSC) and the referrer recorded on the sale (DRI), IST or OST. Leaders (SM, SSM, SVD) earn through the monthly allowances BA, PA and PB, not through per-sale commission (doc 08 Decision 4 and §15).

### Release and payout timing

VIP: 100% of the commission is released in the month approved collection reaches 40% of the contract TCP. IGP: 40% is released at Stage 1 (40%) and the rest at full payment. Each release is paid in that month's month-end payout, approved by Finance, the Administrator or the Super Administrator; there is no waiting period (doc 08 §8.2 and §11). The Closed Deal (VIP 25%, IGP 10%) drives sales counting and allowances, not the DSC and DRI release.

### Commission Reporting Categories

Document reporting for: Attached commissions; Released commissions by release month; Approved but unpaid commissions; Commissions On Hold; Payout initiated; Paid commissions; Cancelled releases; Adjusted commissions; Clawbacks owed, recovered and written off; BA, PA and PB by month and position; totals by recipient, by IST/OST, by sale, by team and by period; persons with non-standard rates; approval dates; confirmed payout dates; parallel-run differences against the company workbooks (doc 08 §16, §18).

Critical distinction: Approved commission is not equivalent to Paid commission. A commission becomes Paid only after Finance, the Administrator or the Super Administrator confirms actual disbursement.

Automatic Hold: when a sale event in doc 08 §14.1 occurs (cancellation, rescission after 90 days, downgrade, default over 90 days, returned cheque), affected released but unpaid commissions are placed On Hold (doc 08 §13).

Paid commissions and clawbacks: paid commissions remain historically recorded. A sale event raises a clawback owed by the person paid (DSC from the seller, DRI from the referrer). Until the IST Commission and Clawback Addendum is signed, the office collects it directly; after signing, recovery follows doc 08 §14.4. Reports show clawbacks as separate owed, recovered and written-off records, never as edits to paid history, and never invent a clawback that Commission Management did not record.

No duplicate aggregation: a sale can carry a DSC and a DRI, released in stages. Those commission records must not create additional underlying sales.

---

## 17. VIP Contract and Membership Analytics

### 17.1 VIP Product Reporting

Use `docs/business-rules/05-vip-products-and-contracts.md`. Document requirements for: VIP product distribution; Finalized contracts by tier; Contracts by approved payment scheme; Standard versus Non-Standard contracts; Contractual purchase values; Historical finalized product terms; Retired product references; Contract status distribution.

Historical contracts: use the actual finalized contractual price. Do not recalculate old contract values from current VIP product configurations.

Current standard tiers: Bronze ₱72,000 / 7 years; Silver ₱240,000 / 12 years; Gold ₱390,000 / 22 years. These are updated standard catalog baselines, not universal historical transaction values. Existing source-document conflicts must remain identified until formally resolved.

### 17.2 VIP Membership Reporting

Use `docs/business-rules/09-vip-membership-and-stay-points.md`. Document reporting for: Active Memberships; Pending Activation; Expired Memberships; Cancelled Memberships; Suspended Memberships; Membership Financial Holds; Membership Activations by period; Memberships by VIP tier; Contractual membership validity; Upcoming expirations; Historical memberships.

Important distinction: customer records and membership records are separate concepts. A customer may exist without an Active VIP Membership. Do not report all existing customers as Active members.

Activation reporting: use the actual official Membership Activation Date. Do not substitute reservation or contract dates. Validity and upcoming-expiration reporting start from the Card Claim Date, actual or deemed (doc 06 §4.3), never from the activation date.

Historical entitlements: preserve actual contract-specific validity and benefit terms.

---

## 18. Stay Points Reporting

Use `docs/business-rules/09-vip-membership-and-stay-points.md` (owner ruling R10, 2026-11-12). Points follow the signed Grant's Annual Welcome Gift: fixed annual tranches per tier, each released in full only when the cardholder's Qualifying Spend reaches the tier minimum in the tranche's measurement period, or by a Compassionate Waiver. The release schedule and measurement periods are anchored to the Points Activation Date (doc 09 §8, §9). The former Spend-to-Earn earning rule is removed.

Current tier terms (doc 09 §6): Bronze 5 tranches of 10,000 (7,000 weekday / 3,000 weekend), minimum ₱1,000; Silver 10 tranches of 20,000 (14,000 / 6,000), minimum ₱2,000; Gold 20 tranches of 25,000 (17,500 / 7,500), minimum ₱3,000.

Document reporting for: Qualifying Spend per measurement period and progress to the minimum; Points Activation Date (set by redemption or deemed); tranches due, released, released by waiver and Non-Activated; Released, Reserved, Redeemed, Available and Forfeited points per bucket; points not transferred on a card transfer; waivers requested, granted and refused; refunds of qualifying bills; memberships nearing expiry with unused points; imported historical balances (doc 09 §23).

### Points Reporting Integrity

Do not confuse unreleased or Non-Activated tranches (not a balance) with Released Points, Available Points (released less reserved and redeemed), Reserved Points (set aside for a confirmed booking) or Redeemed Points (consumed by a completed stay). There are no Pending points and no Points Hold; a refund lowers Qualifying Spend and never takes back a released tranche (doc 09 §13).

Example: a Bronze tranche of 10,000 points is released (7,000 weekday, 3,000 weekend), and the cardholder then redeems 2,000 weekday points through a completed stay. Released remains 10,000, Redeemed is 2,000, and Available is 8,000 (5,000 weekday, 3,000 weekend). A later tranche whose minimum was not met is reported as Non-Activated and never added to the balance unless a waiver is granted.

Gold supplementary holder: Gold primary and supplementary holders share one membership points pool. Do not double-count balances as two separate memberships.

Historical points: preserve valid imported balances without inventing historical earning transactions.

---

## 19. Redemption Reporting

Use `docs/business-rules/10-redemption.md` (owner ruling R12, 2026-11-12). Document future reporting for: bookings requested, confirmed, completed, cancelled and no-show; points reserved, consumed, returned and forfeited per bucket; nights by venue and night classification; bookings by tier; Points Activation Dates set by redemption; points plus money bookings and the approval status of their receipts; card transfers (doc 10 §18).

Important distinction: a confirmed booking is not a completed stay. Reserved points are not yet consumed. A booking can remain Pending Payment until its money part is approved (doc 07). The same points are never counted twice.

Redemption basis: points pay only for overnight accommodation at open AFhomes Direct Operations, using the Admin-maintained, versioned points-per-night Terms of Use table; each card uses the version in effect on its Card Claim Date (doc 10 §5, §8). Weekday and weekend points never convert.

---

## 20. Disabled Module Status

The planned standalone MongoDB system preserves Redemption and Services functionality but keeps these modules hidden and disabled for now. Redemption rules are being planned in doc 10 (owner ruling R11 item 3, 2026-11-12); the module stays disabled until the owner authorizes its build. Documentation must not authorize their reactivation. Historical authorized redemption information may remain relevant for reporting and audit purposes. However, defining Redemption reports must not automatically expose a disabled Redemption module, enable new redemption requests, enable blocked routes, re-enable Services, start points consumption processing, or turn on redemption feature flags. Actual reporting availability must respect the implementation's feature flags and authorization rules.

---

## 21. Customer Management Analytics

Use `docs/business-rules/04-customer-management.md`. Document authorized internal reporting for: Total customer master records; New customers by period; Customer creation source; Customer acquisition channels; Customer applications; Draft applications; Submitted applications; Customers with Active VIP Memberships; Customers without Active VIP Memberships; Customers with multiple authorized purchases; Customer transaction relationships; Customer status where actually defined; Customer acquisition and sales-attribution trends.

Customer identity: do not treat each VIP purchase as a separate customer identity. Do not merge unrelated people merely because they appear in multiple sales.

Privacy: there is no public VIP card or customer check (owner ruling R11 item 1, 2026-11-12). The former Public Customer Lookup (U08) is removed from scope; only authorized staff check cards, inside the staff application. Customer Management Analytics are internal only. Do not expose government IDs, private addresses, confidential contact information, payment proofs, internal financial details, or audit records. Public seller verification (doc 03) is a separate feature and is not affected.

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
- **Finance:** views all reports, including sales; in particular collections, outstanding balances, verified payments, commissions, payouts, and reconciliation cases.

Important boundary: an authorized sales manager may view team sales performance without obtaining unrestricted private customer contact information or payout evidence. Do not bypass privacy rules through dashboards.

---

## 24. Metric Definition Governance

The document must establish a consistent approach to defining metrics. For each important KPI, describe: business purpose; source module; relevant records; applicable eligibility rules; event date; aggregation method; role visibility; historical treatment; adjustment behavior; known unresolved assumptions.

Example — Confirmed Sales Value: Source Sales and Finance as governed by document 13; Recognition the Closed Deal date, when approved receipts reach 25% of the contract price; Aggregation full contract value counted once, subject to approved adjustments; Visibility according to the user's permitted Sales Network scope.

Do not invent business targets such as every SM must achieve ₱1 million monthly, OST must produce five sales per month, SVD commission should be 2%, or minimum customer conversion should be 20%. These values have not been approved.

---

## 25. Reporting Grain and Duplicate Prevention

Document the importance of preserving the correct reporting grain. Examples: Customer canonical customer identity; Sale unique sale identity; Payment authorized payment or settlement event; Commission per-sale DSC or DRI record and its stage releases; Membership canonical VIP membership; Points Release unique tranche release; Redemption authorized booking; Seller Performance sale attribution under applicable genealogy.

Duplicate prevention: do not multiply sales values merely because a customer has multiple payments, a sale has multiple commission recipients, a salesperson appears in multiple upline reports, a membership has a supplementary holder, or a tranche release has weekday and weekend parts. A report must preserve the intended unique business event count.

---

## 26. Historical Reporting and Reconciliation

Preserve historical business events. Examples: old contracts preserve old agreed prices; past sales remain assigned to the original applicable selling teams; original payment verification dates remain traceable; historical commission approvals remain recorded; completed commission payouts remain recorded; original VIP Membership activation dates remain unchanged; historical point balances remain traceable; redemption history remains preserved.

Policy changes: when reporting policies change, do not silently rewrite underlying historical financial facts.

History import (owner ruling R11 item 5, 2026-11-12; Rollout Guide v1.4 §6 and §8): every seller and every unfinished sale is imported with its full receipt history, each sale and receipt on its own date. Finished sales are not imported; they stay in the Excel archives, so platform reports for periods before go-live include only the imported records. A side-by-side parallel run follows: the workbook process keeps paying, the platform's results are compared each month, and the switch happens when a month closes with no unexplained differences.

Imported receipts are marked **Approved (imported)** and count in reports as approved receipts once an Administrator has signed off their import batch (owner follow-up ruling, 2026-11-12; doc 07 §20). Reports keep the import marking visible so imported and live-approved receipts can be told apart.

Restatements and corrections: if an authorized correction affects a historical report, preserve enough information to explain original value, corrected value, effective business event, adjustment date, reason, authorized actor. Do not invent unsupported historical transactions.

---

## 27. Historical Genealogy

Historical sales attribution must reflect the sales hierarchy applicable to the original sale. Example: an OST seller completes a sale under SM A, then transfers to SM B. The earlier sale remains attributed to the original branch under the governing historical attribution rule. New sales follow the new applicable branch. Reporting must not silently transfer the earlier sale to SM B.

Organizational totals: when producing authorized management totals, avoid double-counting the same sale across overlapping genealogy views.

---

## 28. Audit and Security Reporting

Audit Logs are an existing core module. Document authorized reporting for significant business events such as account status changes, Sales Network transfers, accreditation changes, contract approvals, payment verification, payment reversal or refund, commission release, approval and payout, clawbacks, membership activation, Card Claim Date, Financial Hold, tranche release and waivers, booking confirmation and completion, Admin reporting configuration changes.

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
| Commission Management | Rates, releases, payouts, clawbacks and allowances |
| VIP Membership | Actual membership states |
| Stay Points | Tranche releases, balances, reservations and consumption |
| Redemption | Confirmed, completed, cancelled and no-show bookings |
| Sales Performance Reporting | Confirmed sale recognition and adjustments |
| Audit Logs | Traceable business-state changes |

Explain that Reports & Analytics must not independently override the authoritative modules.

---

## 30. Required Business Scenarios

Scenarios A to Q are summarized here with expected outcomes.

- **Scenario A (Confirmed installment sale):** Confirmed Sales Value reflects qualifying ₱240,000 contract once; Finance collections reflect actual verified payments; outstanding balance separate; membership not automatically Active.
- **Scenario B (Additional installment):** verified collections update; outstanding balance changes; Confirmed Sales Value not counted again.
- **Scenario C (Sale reversal):** reporting follows document 13's approved negative adjustment treatment; historical confirmation traceable; affected unpaid commissions enter Hold.
- **Scenario D (Commission release and approval):** a VIP sale reaches 40% approved collection; its DSC and DRI are reported as released in that month at the frozen rates; the month-end payout list is approved; Paid commission reporting does not update until actual disbursement.
- **Scenario E (Commission payout):** Paid commission report updates; original sale count unchanged.
- **Scenario F (Seller transfer):** historical sales remain attributed to original applicable genealogy; new sales follow new team; no duplicate network-wide sales.
- **Scenario G (No-sales seller):** reporting applies established eligibility and no-sales definitions; do not count unrelated or ineligible members.
- **Scenario H (Membership activation):** Fully Paid reporting may include the transaction; Active Membership reporting excludes it until activation.
- **Scenario I (Tranche release):** a Bronze cardholder's approved Qualifying Spend reaches ₱1,000 in the measurement period; on the due date the full 10,000-point tranche is released (7,000 weekday, 3,000 weekend); a period below the minimum is reported as Non-Activated; unreleased tranches are not reported as a balance.
- **Scenario J (Points redemption):** 5,000 available; a booking reserves 2,000; available decreases and reserved increases; consumed does not increase until the stay is completed.
- **Scenario K (Gold supplementary member):** one shared membership balance; no duplicate total points in reporting.
- **Scenario L (Payment reversal and Financial Hold):** membership Financial Hold reflected; financial collection reporting updates; historical activation, VIP Number and Card Claim Date remain unchanged.
- **Scenario M (Refunded resort spending):** a refund lowers the period's Qualifying Spend; an unreleased tranche waits until spend qualifies again; a released tranche stays released; no Points Hold and no negative balances.
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
12. Commission amounts come from per-person rates frozen on the sale; payout approval is an explicit, audited action (doc 08).
13. Approved commissions are not automatically Paid.
14. Commission payouts require actual confirmed disbursement.
15. Commission Holds, clawbacks and recoveries follow doc 08 §13 and §14.
16. Unreleased and Non-Activated tranches are not a points balance.
17. Only released points are usable; there are no Pending points.
18. Reserved points are not yet Consumed points.
19. Gold supplementary holders share one membership points pool.
20. A refund lowers Qualifying Spend and never takes back a released tranche (doc 09 §13).
21. Historical contracts retain their original agreed terms.
22. Admin product changes do not retroactively alter finalized contracts.
23. Reporting permissions must respect record-level security.
24. There is no public card or customer lookup; reports are not exposed publicly (R11).
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

### 32.1 Dashboard KPI Comparison Policy (owner decision, 2026-11-10)

Status: **APPROVED** for dashboard KPI cards. This resolves dashboard period comparisons only; the other matters listed above, including formal growth-rate methods and other cross-period formulas, remain unresolved.

1. Percentage trend indicators appear only on period-based KPIs: Confirmed Sales Value, Verified Collections, and Confirmed Sales Count.
2. Comparisons are calculated dynamically from the authoritative business records. The selected reporting period is compared with the immediately preceding period of equal duration, using Asia/Manila business dates.
3. Each comparison follows the existing Sales and Finance rules for its KPI (Closed Deal dates and dated adjustments for sales under R7, 2026-11-12; approval dates for collections; reversals and historical adjustments) and never double-counts a transaction.
4. Snapshot KPIs, including Total Customers, Active Members, and Contracts Requiring Review, display a neutral "Current" label without a percentage trend.
5. An increase is shown in green and a decrease in red only where that interpretation fits the KPI. Neutral or unavailable comparisons must not imply improvement or decline.
6. When the previous period has no valid (positive) baseline, no percentage is calculated: the indicator reads "New" when the current period has activity, otherwise "No comparison available".
7. No hardcoded or illustrative trend percentages may be shown.
8. KPI values and comparisons recalculate whenever the reporting period, the underlying records, or the authorized record scope changes.
9. One centralized calculation and one reusable KPI presentation serve the Admin, Sales, and Finance dashboards.
10. Historical snapshots are never fabricated. Comparisons for snapshot KPIs may be introduced later only when reliable, effective-dated historical data exists.

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
- [ ] Frozen per-person DSC and DRI rates; contract TCP basis.
- [ ] Seller and referrer only; leader allowances reported separately.
- [ ] Release month per stage (VIP 40%; IGP 40% and full payment).
- [ ] Approved unpaid commissions.
- [ ] On-Hold commissions.
- [ ] Paid commissions.
- [ ] Actual disbursement requirement.
- [ ] Clawbacks owed, recovered and written off.
- [ ] Parallel-run differences.

### VIP Membership
- [ ] Active memberships.
- [ ] Pending activation.
- [ ] Expired memberships.
- [ ] Membership Financial Holds.
- [ ] VIP tier reporting.
- [ ] Contract-specific historical values.

### Stay Points
- [ ] Annual Welcome Gift tranches per tier.
- [ ] Qualifying Spend per measurement period and minimum.
- [ ] Points Activation Date.
- [ ] Released, Non-Activated and waiver tranches.
- [ ] Weekday and Weekend points.
- [ ] Available points.
- [ ] Reserved points.
- [ ] Redeemed and forfeited points.
- [ ] Historical points preservation.

### Redemption
- [ ] Booking requests.
- [ ] Points reservations.
- [ ] Pending Payment.
- [ ] Confirmed bookings.
- [ ] Completed stays.
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
- **Cross-module review:** Consistent with 01–10 and 13 (doc 14 added later; see the amendments). Document 13 preserved as authoritative for Sales Performance Reporting. No material contradictions.
- **Outstanding dependencies:** Listed in Section 32.
- **Acceptance results:** All checklist items covered. Documentation completeness does not prove implementation readiness.
- **Doc 14:** IGP (doc 14) was added later (R13, 2026-11-12) and is covered in the amendments below; this original report predates it.
- **Change scope:** Documentation only (at the time of writing). No application code, database, migrations, existing documentation files, Git commit/push/merge, or deployment. Only `docs/business-rules/11-reports-and-analytics.md` created. Redemption and Services remain disabled. No unauthorized implementation assumptions.

## Owner rulings amendment (2026-11-12, rounds R6, R7, R11)

These rulings are authoritative and take precedence over earlier text in this document where they differ. Ground rule: the company workbook wins by default; dated owner rulings outrank everything.

1. **Approved receipts (R6).** Collections count only from receipts approved by Finance, the Administrator or the Super Administrator (doc 07 §5.2). Reporting shows entered, returned, resent, approved and reversed receipts as distinct states. Sections 3 and 15.
2. **Confirmed Sales (R7 item 1).** A sale counts (Closed Deal) when approved receipts reach 25% of the contract price; its reporting date is the date 25% is reached. The 40% (Stage 1) and 100% (Full Payment) dates are tracked separately. Doc 13 §4 governs. Sections 3, 8, 9, 24 and 32.1.
3. **Month close (R7 item 2).** The Administrator or the Super Administrator closes a month; closed figures never change; a late receipt counts in the first open month. Section 8.
4. **Defaults (R7 item 3).** Reports list sales with no approved receipt for 90 days and Defaulted sales; the Administrator or the Super Administrator marks Defaulted; a payment returns the sale to Active. Doc 13 §4.6; clawbacks in doc 08. Section 15.
5. **No public lookup (R11 item 1).** There is no public VIP card check; Public Customer Lookup (U08) is removed from scope and only staff check cards. Sections 21 and 31.
6. **IGP in scope (R11 item 2).** IGP is built together with VIP; its rules are in `docs/business-rules/14-igp-sales.md`. Section 1.
7. **Redemption (R11 item 3).** Planned in doc 10; it stays disabled until the owner authorizes the build. Sections 1 and 20.
8. **History import (R11 item 5).** Every seller and every unfinished sale is imported with its full receipt history; a side-by-side parallel run follows; the switch happens when a month closes with no unexplained differences (Rollout Guide v1.4 §6 and §8). Finished sales stay in the Excel archives (U12). Section 26.
9. **CMS deferred (R11 item 6, U09).** Section 1.
10. ~~**Open, not decided here:** whether contract finalization is still required before the 25% count.~~ **Settled:** it is not required (doc 07 follow-up item 1; doc 13 §4).

## Consistency update (2026-11-12)

Wording aligned with the rewritten docs 06, 08, 09, 10 and 14. No new rule is introduced here.

1. **Commissions (doc 08, R8 and R9).** Sections 3, 5, 8, 16, 25, 28, 29, 30 (Scenario D), 31 and 33: the former Finance-typed percentage, upline recipients and manual recovery wording is replaced by per-person DSC and DRI rates frozen on the sale, seller and referrer as the only per-sale recipients, staged release paid at month-end, approval by Finance, the Administrator or the Super Administrator, and clawbacks under doc 08 §14.
2. **Team attribution (doc 02 §6.3, R9 item 2).** Section 12: team KPIs and allowance pay follow the current upline chain and include IGP; sale-level reports keep sale-time attribution.
3. **Stay Points (doc 09, R10).** Sections 3, 8, 18, 25, 30 (Scenarios I, J, M), 31 and 33: Spend-to-Earn, Pending points, Points Hold and earning caps are replaced by Annual Welcome Gift tranches released on Qualifying Spend.
4. **Validity (doc 06 §4.3, R2).** Sections 8 and 17.2: validity and expiry reporting start from the Card Claim Date.
5. **Redemption (doc 10, R12).** Sections 19, 29 and 33: monetary conversion and service pricing are replaced by the versioned points-per-night Terms of Use table for overnight stays.

## Owner rulings amendment (2026-11-12, follow-ups)

These rulings take precedence over earlier text in this document where they differ.

1. **Imported receipts.** History receipts come in marked "Approved (imported)". An Administrator signs off each import batch once (section 26; doc 07 §20).
2. **Finance view only (follow-up item 25).** Finance views all reports, including sales reports, view only (section 7).
3. **Closed Deal needs the approved sale record (follow-up item 3).** A sale counts at 25% once the Administrator approves the sale record; contract finalization is tracked separately (sections 3, 8 and 9).
4. **Referred by me (follow-up of 2026-11-12, owner answer A8).** Sales where a member is the referrer but not the closing seller appear in a separate "Referred by me" list. They are not part of that member's My Sales totals and carry no contract links. A sale appears once per person.
5. **IGP reporting.** IGP sales (doc 14) count in sales and team KPIs at their Closed Deal (10%); IGP stages and Series Number reporting follow doc 14 and doc 13.

Numbering note: item numbers in this document's amendments follow the master follow-up list in `docs/implementation/decisions-and-gaps.md`; existing numbers are not renumbered.
