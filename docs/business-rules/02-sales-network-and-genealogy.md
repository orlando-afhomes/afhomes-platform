# AFHomes Platform — Sales Network and Genealogy Business Rules

> Single source of truth for **Sales Network structure, genealogy, account creation, transfers, conversions, and designation changes**.
> Accreditation rules: `docs/business-rules/03-ist-ost-accreditation.md`.
> Sales performance reporting: `docs/business-rules/13-sales-performance-reporting.md`.
> Organization Management rules: `docs/business-rules/01-roles-and-permissions.md`.
> IGP sales: `docs/business-rules/14-igp-sales.md`.

---

## 1. Purpose and Scope

This document defines the approved Sales Network and Genealogy business rules for AFHomes Platform.

It governs:

- IST and OST classifications
- Sales Network hierarchy and genealogy
- Account creation and activation on approval
- Account status and accreditation-based eligibility
- Team transfers
- IST/OST conversions
- IST promotion and demotion
- Sales Network permissions and visibility
- Customer information visibility in sales views

It does not define commission calculations, VIP activation requirements, refund rules, payment schedules, or contract cancellation authorization. Those belong to their respective modules.

---

## 2. Official Sales Team Definitions

AFHomes recognizes two official sales team classifications.

### 2.1 IST — Internal Sales Team

IST refers to sales personnel operating within the company.

Every IST member must have exactly one of these Sales Network designations:

- SVD
- SSM
- SM

There is no ordinary IST salesperson without a designation. SVD, SSM, and SM are IST designations, not separate accreditation classifications.

All IST members:

- Use accreditation numbers beginning with `AAI`.
- Require annual accreditation renewal.
- May personally sell VIP products.
- May earn commissions, subject to separately defined Commission Business Rules.
- Have Sales Network permissions corresponding to their current designation.

### 2.2 OST — Outsourcing Sales Team

OST refers to sales personnel operating outside the company.

All OST members:

- Use accreditation numbers beginning with `AAO`.
- Require annual accreditation renewal.
- May personally sell VIP products.
- May earn commissions, subject to separately defined Commission Business Rules.
- Have access to their own sales and authorized customer records.
- Belong to an eligible Sales Network manager.

Do not treat OST as an IST management designation.

---

## 3. Official Sales Network Hierarchy

The official hierarchy is:

**SVD → SSM → SM → OST**

OST members may attach directly to SVD, SSM, or SM. Do not invent intermediate management members.

Valid relationships:

- SVD → SSM
- SSM → SM
- SVD → OST
- SSM → OST
- SM → OST

Parent rules:

- SVD has no Sales Network parent.
- SSM requires an eligible SVD parent.
- SM requires an eligible SSM parent and inherits the SVD ancestor.
- OST requires an eligible SVD, SSM, or SM parent.

The genealogy must prevent:

- Circular relationships
- Self-parenting
- Invalid designation relationships
- Orphaned active assignments
- Duplicate active parent assignments
- Changes that silently rewrite historical genealogy

Preserve the existing account and genealogy history.

---

## 4. Sales Network Account Creation

Sales Network accounts are created through the two-step seller entry in doc 03 §9.1 (owner authority rule, 2026-11-12).

A Clerk, the Administrator or the Super Administrator enters the seller, and the Administrator or the Super Administrator approves the record. Sellers view only and cannot create seller records (doc 01 §3.7). A person may also apply to become an OST seller through the public application form, which the office reviews (doc 03 §9.2).

### 4.1 Parent Selection

During creation, authorized personnel search for and select an existing eligible parent.

The system validates:

- Parent designation
- Parent account status
- Parent standing: an expired accreditation does not make a parent ineligible (a reminder is shown); a suspended, resigned or terminated parent is ineligible (doc 03 §9, §5.2 below)
- Genealogy compatibility

Do not infer the parent from the account creator. Do not create intermediate parents automatically.

### 4.2 Account Activation

A new Sales Network account becomes **Active when its seller record is approved** under the two-step entry (doc 03 §9.1; owner rulings R3 and R5, 2026-11-12). An entered but unapproved seller has no login and no final AA number.

Public OST applications follow the office review in doc 03 §9.2 (approve, return to fix, or reject). Do not introduce referral-code registration or automatic creator-based genealogy assignment.

Keep the separate Organization Management manual employee approval rule unchanged.

---

## 5. Sales Network Status and Eligibility

Account status and accreditation validity are independent conditions.

Account statuses include Pending (an entered seller not yet approved, with no login), Active, Suspended, and Deactivated. "Deactivated" is an account status; it does not mean resigned or terminated.

What each status allows is defined in doc 03 section 9 (owner ruling R3, 2026-11-12).
- An **expired** accreditation does not block login, selling, referring or sponsoring; a reminder is shown and recorded.
- A **suspended or deactivated** account, or a resigned or terminated seller, cannot log in, take new sales or sponsor (OCT R28).

### 5.1 Independent Downline Operation

If an IST manager is expired, suspended, or deactivated, their otherwise Active and accredited downline members may continue selling independently. Do not disable an entire team because one ancestor becomes ineligible. Existing genealogy remains preserved. No automatic reassignment occurs merely because an upline becomes expired, suspended, or deactivated.

### 5.1.1 Vacant Seat (AUG R1, R3, R23; owner ruling R3, 2026-11-12)

When a leader seat (SM, SSM or SVD) becomes vacant because the holder left and has not been replaced:
1. The vacancy is recorded with its effective date (the day after the holder's end date). The team stays where it is in the genealogy; nobody is moved.
2. The vacant seat earns nothing for the vacancy period: no allowances. (AFhomes leaders earn no override; doc 08 §6.)
3. The vacant seat's downline sales and collections count toward the next active level above, for pay and reports, until the seat is filled. If the vacant seat is at the top of the tree, that stream earns nothing for the vacancy period.
4. Accounts the departed holder managed (assumed accounts) pass upward to the first active level above.
5. When a new holder fills the seat, the roll-up ends from the fill date.

There is no Acting or temporary leader role, ever (owner answer A5, 2026-11-12; final, no longer "not now"). A vacant seat is filled only by promotion (section 8) or by a team transfer (section 6), both made by the Administrator or the Super Administrator.

### 5.2 Receiving Manager Eligibility

A manager receiving new or transferred members must have an Active account and an eligible SVD, SSM, or SM designation, and must not be suspended, resigned or terminated. An expired accreditation does not make them ineligible; a reminder is shown (owner ruling R3). An eligible direct manager may receive members even if one of their own ancestors is inactive or expired.

---

## 6. Team Transfers

Sales Network members may transfer teams at any time. There is no one-year waiting requirement. Supporting letters, discussions, and organizational decisions are handled outside the system. A transfer changes an approved seller's upline, so the Administrator (the company's Supervisor) or the Super Administrator (the company's Director) executes it, and it is audited (owner ruling R3 and the owner authority rule, 2026-11-12; doc 03 §9.1). No separate request workflow is needed.

### 6.1 Transfer Requirements

- Validate the receiving parent.
- Validate the final genealogy.
- Preserve the member account.
- Preserve historical sales ownership.
- Preserve historical genealogy.
- Record the authorized actor and timestamp.

Transfers take effect **immediately upon successful save**. Backdated transfer effective dates are prohibited. Use an authoritative timestamp and display dates in Philippine time (`Asia/Manila`).

### 6.2 Branch Transfers

When a manager changes teams, move the manager's entire downline branch together. Preserve descendant direct-parent relationships. Update inherited upline relationships as appropriate. Do not automatically flatten the genealogy.

### 6.3 Historical Ownership and Pay Attribution (owner ruling R9, 2026-11-12)

Two attributions are kept separate:

1. **Sale attribution (history).** A sale stays with its original seller and the team at the time of the sale, for sale-level reports. Sales recorded before a team transfer remain associated with their original Sales Network team. Sales recorded after the transfer belong to the new team. Historical ownership does not change merely because Finance confirms a previously recorded sale after the transfer.
2. **Team allowance pay and team KPIs.** Team credit for leader allowances (BA, PA, PB) and for team KPIs follows the current upline chain (AUG R23). After a transfer, the seller's collections count toward their current leaders, not their former ones. Team KPIs include both VIP and IGP sales (doc 14 §9). Allowance rules are in doc 08.

---

## 7. IST / OST Conversion

IST and OST conversion is bidirectional (OST → IST, IST → OST). Conversion may occur anytime. No separate request or approval workflow is required. A conversion changes an approved seller record, so the Administrator or the Super Administrator executes it (doc 03 §9.1), based on decisions handled outside the system.

### 7.1 Identity Preservation

Conversion must preserve the same member account, member identity, original accreditation date, current accreditation expiration date, renewal schedule, accreditation history, historical sales, historical commissions, previous genealogy relationships, and audit history. Conversion itself is not a new accreditation issuance and does not automatically reset the accreditation anniversary.

### 7.2 OST → IST

1. Remove the OST's previous active genealogy assignment.
2. Require selection of an IST designation: SVD, SSM, or SM.
3. Apply the parent requirements of the selected designation.
4. Preserve historical OST genealogy.
5. Apply the corresponding IST Sales Network permissions.
6. Change the AA prefix from `AAO` to `AAI`, according to the official numbering rules.

An IST without an SVD, SSM, or SM designation is invalid.

### 7.3 IST → OST

1. Remove the IST management designation.
2. Require selection of an eligible OST receiving manager.
3. Reassign all existing management downline first.
4. Preserve historical management relationships.
5. Apply OST permissions and visibility.
6. Change the AA prefix from `AAI` to `AAO`, according to the official numbering rules.

### 7.4 Existing Downline During Conversion

An IST manager cannot complete conversion to OST while their management downline remains incompatibly assigned. Reassign the downline as part of the conversion.

- For managerial branches: transfer the entire branch, preserve its internal genealogy, and different branches may be transferred to different eligible managers.
- For OST members directly attached to the converting IST: allow individual receiving-parent selection; different direct OST members may transfer to different eligible SVD, SSM, or SM managers.

### 7.5 Atomic Transactions

Conversion and all required downline reassignments must be atomic. Either every validated change succeeds, or no change is committed. No partial conversion, partial genealogy reassignment, or partially changed accreditation number is allowed.

---

## 8. IST Promotion and Demotion

IST members may change designations among SVD, SSM, and SM. These are designation changes, not new accounts, and are made by the Administrator or the Super Administrator (doc 03 §9.1). Preserve member identity, existing account, AA number, accreditation history, historical sales, historical commissions, and historical genealogy. Automatically update Sales Network-specific permissions and visibility according to the new designation. Other module permissions remain governed by Organization Management.

### 8.1 Genealogy Validation

Promotions and demotions must result in a valid hierarchy. If a designation change makes existing relationships invalid, perform the necessary genealogy reassignment within the same atomic transaction.

Example: An SSM being demoted to SM cannot retain SM members directly underneath them. Those SM branches must be transferred to eligible SSM managers. Each transferred SM retains their existing OST downline. Direct OST members may remain under the demoted member if the resulting assignment is valid. The demoted member must also receive an appropriate parent for their new designation.

Never silently delete descendants or change historical sales ownership.

---

## 9. Sales Network Permissions and Genealogy Visibility

Sales Network permissions are derived automatically from the member's current IST designation or OST classification. This must coexist with the modular Organization Management permissions framework. Do not introduce unrestricted access to other business modules.

### 9.1 SVD

Can view the entire authorized Sales Network branch, own personal sales, authorized descendant sales, and full genealogy within their branch. SVD has no upline Sales Network manager.

### 9.2 SSM

Can view own personal sales, own SM and OST descendants, parent SVD as view-only, and authorized downline sales. SSM cannot manage their SVD merely because the SVD is visible.

### 9.3 SM

Can view own personal sales, own OST descendants, parent SSM as view-only, inherited SVD as view-only, and authorized downline sales.

### 9.4 OST

Can view own sales, own customer records as authorized, and their complete actual upline chain as view-only. OST cannot view unrelated OST members or other OST members' sales and customers. For OST directly attached to SVD or SSM, show only the actual existing upline chain. Do not invent intermediate nodes.

### 9.5 Automatic Designation Changes

When IST designation changes, recalculate Sales Network access and genealogy visibility automatically, remove designation-specific access no longer applicable, and add new designation-specific access as appropriate. Preserve other module permissions under approved Organization Management role assignments.

### 9.6 Sellers View Only (owner ruling R4, 2026-11-12)

Sellers can look but never change. SVD, SSM and SM see their own and their team's customers, sales and pay; OST sees only their own. The customer-information limits in section 10 still apply to team views. The only changes a seller may make are to start a customer draft (doc 04 §5) and to upload a payment slip photo for their own customer as proof only (follow-up 5; doc 07). Every change to seller records, genealogy, sales and pay is made by office roles (doc 01 §3.7).

---

## 10. Customer Information Visibility

Differentiate personal sales ownership from downline visibility.

### 10.1 IST Personal Customers

For personally acquired customers, allow access to full customer name, phone number, email address, and own sales information.

### 10.2 IST Downline Sales

For customers of their authorized downline, allow full customer name (without masking), VIP tier, sale amount, sale date, and sale status. Do not expose through ordinary Team Sales visibility: customer contact details, complete customer profile, or detailed Finance payment records.

### 10.3 OST Personal Customers

For customers belonging to their own sales, allow full customer name (without masking), phone number, email address, and sales information. OST access remains restricted to their own customer and sales records.

### 10.4 Team Transfer

An OST retains visibility of their personally acquired historical customers after moving to another team, including historical customer contact information and own sales records. The new manager does not automatically inherit access to historical customer contact information.

### 10.5 OST → IST Conversion

When an OST converts to IST, retain access to personally acquired historical customer records, including phone and email. However, apply the limited IST manager visibility rules to customers belonging to the new IST manager's downline.

### 10.6 Historical Manager Visibility

Former managers retain read-only visibility of sales recorded during their management period. New managers see the transferred member's sales recorded from the transfer onward. Do not retroactively broaden the new manager's access to historical sales merely because the member joined their team.

### 10.7 Privacy Boundary

These rules apply to authenticated, authorized Sales Network views. There is no public customer or card lookup (owner ruling R11), so no public customer-search rules exist to confuse them with.

---

## 11. Reconciliation with Organization Management

Organization Management governs employee account approval workflow, modular access control, roles and permissions, administrative account management, protected account rules, and reactivation authorization. Sales Network governs IST/OST accounts created through the two-step seller entry, activation on approval, designation-based Sales Network visibility, genealogy assignments, login eligibility by account status and seller standing (an expired accreditation never blocks login, doc 03 §9), and personal and downline sales access.

These policies coexist. Do not replace modular access controls with an entirely separate unrestricted role system. Enforce both whether the authenticated person has permission to access the module, and whether that person is entitled to access the specific genealogy, member, customer, or sale. A module permission is not automatic ownership of unrelated customer or Sales Network data where business-scoped visibility restrictions apply.

---

## 12. Examples

### Valid Genealogy

- SVD "A" → SSM "B" → SM "C" → OST "D"
- SVD "A" → OST "E" (direct)
- SSM "B" → OST "F" (direct)

### Invalid Genealogy

- SM "C" → SSM "B" (invalid direction)
- SVD "A" → SVD "B" (self-designation parent)
- OST "D" → OST "E" (OST cannot be parent)
- Any circular chain

### Conversion Example

OST "X" with AA `AAO26100005` converts to SM. Remove OST genealogy, select eligible SSM parent, preserve history, prefix changes to `AAI26100005`.

---

## 13. Acceptance Criteria

- SVD is used consistently (not VD).
- IST means Internal Sales Team; OST means Outsourcing Sales Team.
- SVD/SSM/SM are IST designations; every IST has a required designation.
- OST may be directly attached to SVD, SSM, or SM.
- No referral-code registration. A public OST application is reviewed by the office before any seller record exists (doc 03 §9.2).
- A Sales Network account activates when its seller record is approved (doc 03 §9.1).
- Changes to approved sellers (transfers, conversions, designation changes) are made by the Administrator or the Super Administrator.
- Sellers view only; SVD, SSM and SM see their own and their team's customers, sales and pay; OST sees only their own.
- Transfers and conversions can happen anytime; no one-year waiting.
- Transfer effective dates are not backdated.
- Required reassignment operations are atomic.
- Promotions and demotions preserve identity and history.
- IST designation changes automatically update Sales Network access.
- Sales ownership follows the original team at sale recording; team allowance pay and team KPIs follow the current upline chain (section 6.3).
- Team Sales combines own and authorized downline sales without double counting.
- Customer contact visibility differs between own customers and downline customers.

---

## 14. Deferred / Requires Business Approval

- Commission calculation formulas (separate Commission Business Rules).
- VIP activation requirements, refund entitlement rules, payment installment schedules, contract cancellation authorization (respective modules).

---

## Completion Report

- **File created/updated:** `docs/business-rules/02-sales-network-and-genealogy.md`
- **Sections:** Purpose and scope; definitions; hierarchy; account creation; status and eligibility; transfers; conversions; promotion/demotion; permissions and visibility; customer information visibility; reconciliation; examples; acceptance criteria; deferred.
- **Confirmation:** All approved Sales Network and genealogy rules represented.
- **Unresolved ambiguity:** None for approved rules; commission/Finance policies deferred.
- **Changes made:** Documentation only. No code, database, Git, or deployment changes.
## Owner rulings amendment (2026-11-12, round R3)

These rulings take precedence over earlier text in this document where they differ.

1. **Status effects** follow doc 03 section 9. An expired accreditation blocks nothing. A suspension, resignation or termination blocks new sales and sponsoring.
2. **Vacant seat** (section 5.1.1). The team stays in place, the seat earns nothing, and its downline counts toward the next active level until the seat is filled. No Acting leader role (final, owner answer A5).
3. **Transfers and other changes to an approved seller** are made by the Administrator or the Super Administrator (corrected by the owner authority rule, 2026-11-12; the earlier wording "by the Super Administrator only" is superseded, see the amendment below).
4. **Superseded (owner ruling, 2026-11-12): settled in R9 item 2 of the later amendment.** Formerly open for round R8: the workbook credits receipts to the current upline chain (AUG R23), while section 6.3 keeps sales with the team at the time of the sale. The pay and report attribution rule is decided with commissions.

## Owner rulings amendment (2026-11-12, rounds R4–R5 and authority rule)

These rulings take precedence over earlier text in this document, including the R3 amendment above, where they differ.

1. **Authority rule.** The Administrator can do everything in the system and the Super Administrator has no blocks. Both may approve their own entries, and the audit history shows that the same person entered and approved. Clerks enter only; sellers view only (doc 01 §3.7).
2. **Correction to R3 item 3.** Transfers and other changes to an approved seller (including conversions and designation changes) are made by the Administrator or the Super Administrator, not by the Super Administrator only (sections 6, 7 and 8).
3. **Seller creation (R3 and R5).** New sellers follow the two-step entry in doc 03 §9.1 and become Active on approval. This replaces the former rule that a Sales Network account is Active immediately after creation. The public OST application is kept and reviewed by the office (doc 03 §9.2); this replaces the former ban on OST self-registration and registration review queues. Referral-code registration stays excluded (section 4).
4. **Sellers view only (R4).** SVD, SSM and SM see their own and their team's customers, sales and pay; OST sees only their own (section 9.6).
5. **R3 item 4 settled (R9 item 2).** Sale attribution keeps the original seller and team at the time of the sale for sale-level reports. Team allowance pay and team KPIs follow the current upline chain (AUG R23). The two are kept separate (section 6.3).

## Consistency update (2026-11-12)

1. **IGP cross-reference (owner ruling R13).** Added a header link to `docs/business-rules/14-igp-sales.md` and, in section 6.3 item 2, that team KPIs include VIP and IGP sales (doc 14 §9). No rule changed.

## Owner rulings amendment (2026-11-12, follow-ups)

These rulings take precedence over earlier text in this document where they differ.

1. **No override for AFhomes leaders.** Per-sale pay goes only to the closing seller (DSC) and the referrer (DRI); leaders earn BA, PA and PB. "Override" is a JA&D pay item only (doc 08 §6). Section 5.1.1 item 2 no longer lists an override as something a vacant seat forgoes.

## Owner answers to the audit questions (2026-11-12)

Item numbers in the amendments of this document follow the master follow-up list in `docs/implementation/decisions-and-gaps.md`; they are not renumbered here.

- **A5, no Acting leader.** Final: there is no Acting or temporary leader, ever (not "deferred"). The vacant seat rule (section 5.1.1) stays. A seat is filled only by promotion (section 8) or team transfer (section 6) by the Administrator or the Super Administrator. Scenario gap U05 is removed from scope.
- **A4, HR.** HR may activate and reactivate office staff accounts only (doc 01). HR never manages seller accounts or Administrator and Super Administrator accounts.
- **Follow-up 5.** Sellers may upload a payment slip photo for their own customer, as proof only (section 9.6; docs 07, 01).
