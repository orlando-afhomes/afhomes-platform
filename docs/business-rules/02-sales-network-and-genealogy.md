# AFHomes Platform — Sales Network and Genealogy Business Rules

> Single source of truth for **Sales Network structure, genealogy, account creation, transfers, conversions, and designation changes**.
> Accreditation rules: `docs/business-rules/03-ist-ost-accreditation.md`.
> Sales performance reporting: `docs/business-rules/13-sales-performance-reporting.md`.
> Organization Management rules: `docs/business-rules/01-roles-and-permissions.md`.

---

## 1. Purpose and Scope

This document defines the approved Sales Network and Genealogy business rules for AFHomes Platform.

It governs:

- IST and OST classifications
- Sales Network hierarchy and genealogy
- Account creation and immediate activation
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

Sales Network accounts are created through authorized CRUD functionality.

Authorized creators include Super Admin, Admin, and Sales Network personnel with properly delegated module permissions. Creation authority must respect the existing Roles & Permissions framework.

### 4.1 Parent Selection

During creation, authorized personnel search for and select an existing eligible parent.

The system validates:

- Parent designation
- Parent account status
- Parent accreditation validity
- Genealogy compatibility

Do not infer the parent from the account creator. Do not create intermediate parents automatically.

### 4.2 Account Activation

New Sales Network accounts become **Active immediately after successful authorized creation**.

This is an explicit Sales Network-specific exception to the Organization Management employee approval workflow. Do not introduce OST self-registration, referral-code registration, OST registration approval queues, automatic creator-based genealogy assignment, or mandatory Admin approval after authorized Sales Network creation.

Keep the separate Organization Management manual employee approval rule unchanged.

---

## 5. Sales Network Status and Eligibility

Account status and accreditation validity are independent conditions.

Account statuses include Pending (where applicable to other account workflows), Active, Suspended, and Deactivated.

A Sales Network member may log in and sell only when:

1. The account is Active.
2. The member's accreditation is valid.

If accreditation expires, login and personal sales activity are blocked. If an account is Suspended or Deactivated, login and personal sales activity remain blocked even when accreditation is valid.

### 5.1 Independent Downline Operation

If an IST manager is expired, suspended, or deactivated, their otherwise Active and accredited downline members may continue selling independently. Do not disable an entire team because one ancestor becomes ineligible. Existing genealogy remains preserved. No automatic reassignment occurs merely because an upline becomes expired, suspended, or deactivated.

### 5.2 Receiving Manager Eligibility

A manager receiving new or transferred members must have an Active account, valid IST accreditation, and an eligible SVD, SSM, or SM designation. An inactive or expired direct receiving manager is ineligible. However, an eligible direct manager may receive members even if one of their own ancestors is inactive or has expired accreditation.

---

## 6. Team Transfers

Sales Network members may transfer teams at any time. There is no one-year waiting requirement. Supporting letters, discussions, and organizational decisions are handled outside the system. The application does not need a transfer-request or additional approval workflow. Authorized personnel execute the transfer directly.

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

### 6.3 Historical Ownership

Sales recorded before a team transfer remain associated with their original Sales Network team. Sales recorded after the transfer belong to the new team. Historical ownership does not change merely because Finance confirms a previously recorded sale after the transfer.

---

## 7. IST / OST Conversion

IST and OST conversion is bidirectional (OST → IST, IST → OST). Conversion may occur anytime. No separate request or approval workflow is required. Authorized personnel execute conversions based on decisions handled outside the system.

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

IST members may change designations among SVD, SSM, and SM. These are designation changes, not new accounts. Preserve member identity, existing account, AA number, accreditation history, historical sales, historical commissions, and historical genealogy. Automatically update Sales Network-specific permissions and visibility according to the new designation. Other module permissions remain governed by Organization Management.

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

These rules apply to authenticated, authorized Sales Network views. Do not confuse them with separate public customer-search privacy rules.

---

## 11. Reconciliation with Organization Management

Organization Management governs employee account approval workflow, modular access control, roles and permissions, administrative account management, protected account rules, and reactivation authorization. Sales Network governs IST/OST accounts created through authorized CRUD, immediate activation after successful creation, designation-based Sales Network visibility, genealogy assignments, accreditation-based login eligibility, and personal and downline sales access.

These policies coexist. Do not replace modular access controls with an entirely separate unrestricted role system. Enforce both whether the authenticated person has permission to access the module, and whether that person is entitled to access the specific genealogy, member, customer, or sale. A full module CRUD permission is not automatic ownership of unrelated customer or Sales Network data where business-scoped visibility restrictions apply.

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
- No invented referral-code registration or OST self-registration workflow.
- Sales Network account creation activates immediately.
- Transfers and conversions can happen anytime; no one-year waiting.
- Transfer effective dates are not backdated.
- Required reassignment operations are atomic.
- Promotions and demotions preserve identity and history.
- IST designation changes automatically update Sales Network access.
- Sales ownership follows the original team at sale recording.
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