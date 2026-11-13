# AFHomes Platform — Organization Management Business Rules

> Single source of truth for the **Departments**, **Staff / Employees**, and **Roles & Permissions** modules.
> Scope: Organization Management only. Does not redefine VIP, customer, accreditation, genealogy, or Finance rules.

---

## 1. Purpose and Scope

This document defines the approved Organization Management business rules for AFHomes Platform.

It governs three independently accessible modules:

1. **Departments**
2. **Staff / Employees**
3. **Roles & Permissions**

Super Admin and Admin have full access to Organization Management. Other authorized users may receive access to one or more of these modules. All authorization must eventually be enforced by the backend, not only by hiding frontend navigation or buttons.

---

## 2. Organization Management Modules

The three modules are independently accessible and independently assigned:

- **Departments** — manage organizational departments.
- **Staff / Employees** — manage employee accounts, roles, and departments.
- **Roles & Permissions** — manage roles and module-level access grants.

A user may be granted access to any subset of these modules. Module access is not all-or-nothing across Organization Management.

---

## 3. Roles and Permission Rules

### 3.1 Module Access and Action Permissions (owner ruling R4, 2026-11-12)

Authorization has two layers:

1. **Module access controls navigation and viewing.** Granting a module lets the user open its pages and view the records within their scope. Module access alone does not let the user change anything.
2. **Actions need a separate action permission.** Entering or editing records, and every important action, each need their own action permission. Important actions include approving, verifying a payment, recording a payout, approving a refund and importing data.

This replaces the earlier rule that granting a module automatically granted every function of that module, including full CRUD. Generic per-field read, create, update and delete checkboxes remain out of scope (section 10); action permissions are named business actions, not generic CRUD toggles.

Examples:

- A user with Departments access can view departments. Creating, editing or archiving a department needs the matching action permission.
- A user with Staff/Employees access can view employee records within their scope. Creating, editing, suspending or deactivating an employee needs the matching action permission, and remains subject to protected account and approval restrictions.
- A user without Roles & Permissions access cannot view or manage roles.
- The Administrator and the Super Administrator hold every action permission (section 3.7).

### 3.2 Dynamic Roles and Multiple Roles

- Roles are dynamically manageable; authorized users may create, edit, and archive ordinary roles.
- An employee may have multiple assigned roles.
- Effective module access is the **union** of permissions granted by all active assigned roles.
- An archived role grants no active permissions, even when historical assignments still reference it.

Example:

- Role A grants Departments access.
- Role B grants Staff/Employees access.
- An employee with both roles can access both modules.

### 3.3 Bounded Role Delegation

Role assignment and delegation must be bounded. A user may assign only roles they are authorized to delegate.

### 3.4 Super Admin Protection

The Super Admin role is protected. Only a Super Administrator may create, give (assign) or remove the Super Administrator role. An Administrator cannot, and no other user may create, assign, edit, archive, or otherwise obtain protected Super Admin privileges through role management. This restriction overrides ordinary module-level CRUD access (owner follow-up ruling 4, 2026-11-12).

### 3.5 Permission Example

| Role | Departments | Staff/Employees | Roles & Permissions |
|---|---|---|---|
| HR Manager | Yes | Yes | No |
| Dept Head | Yes | No | No |
| System Admin | Yes | Yes | Yes |

An employee assigned both "HR Manager" and "Dept Head" has Departments and Staff/Employees access (union). Neither can manage roles.

### 3.6 Super Admin Full Control (owner decision, 2026-11-10)

The Super Admin role holds the **union of every role's module and operation grants**, including all Finance work (payment verification, reversals and refunds, reconciliation, Finance reporting, commission approval and payout, membership activation). There are no module or operation blockers on Super Admin access.

Separation-of-duties blockers do not apply to Super Admin (owner decision, 2026-11-10): a Super Administrator may (a) verify a payment submission they made themselves, (b) both request and confirm/decline the same contract cancellation, and (c) modify their own account, roles, and status. Carve-out: last-Super-Admin lockout protection still applies to everyone, including Super Administrators. Other protected-account restrictions remain in force.

### 3.7 Overriding Authority Rule (owner ruling, 2026-11-12)

This rule outranks every other authority statement in the business-rule documents.

- **The Administrator can do everything in the system**, except create, give or remove the Super Administrator role, which only a Super Administrator may do (section 3.4).
- **The Super Administrator has full control and no blocks** (section 3.6).
- **Both may approve their own entries.** Where a record needs entry and approval, the Administrator or the Super Administrator may do both steps. The audit history records that the same person entered and approved it.
- **Clerks enter only.** A Clerk enters and edits information but never approves.
- **Sellers view only.** IST and OST sellers view records within their scope and change nothing. The only exceptions are that a seller may start a customer draft (doc 04 §5) and may upload a payment slip photo for their own customer as proof only (doc 07). Sellers do not prepare contracts.

Settled by owner follow-up ruling 4 (2026-11-12): only a Super Administrator may create, give or remove the Super Administrator role; an Administrator cannot (section 3.4). The last-Super-Admin lockout protection stays in force.

### 3.8 Role Mapping (owner ruling R4, 2026-11-12)

| Company job | Platform role | What the role does |
|---|---|---|
| Director | Super Administrator | Full control, no blocks (sections 3.6 and 3.7). |
| Supervisor | Administrator | Checks and approves what a Clerk entered; can do everything in the system and may approve their own entries (section 3.7). |
| Clerk | Clerk (new office staff job) | Enters information; cannot approve. |
| Finance | Finance | Verifies money and records payments out. Views all reports (sales, collections, pay), view only. |
| HR | HR | Creates, activates and reactivates office staff accounts. Cannot give the Administrator or Super Administrator role and cannot manage seller accounts. |
| SVD, SSM, SM (IST) | Sales roles by designation (doc 02) | View only: their own and their team's customers, sales and pay. |
| OST | Sales role (doc 02) | View only: their own customers, sales and pay. |

A seller (IST or OST) may start a customer draft; the Clerk checks and completes it, and the Administrator approves it (doc 04 §5). A seller may also upload a payment slip photo for their own customer; it is proof only and counts only after a Clerk enters the receipt and Finance, an Administrator or the Super Administrator approves it (doc 07). Sellers do not prepare contracts: the Clerk prepares and the Administrator approves (doc 05). Sellers hold no other action permission. Team scope follows the genealogy and the field limits in doc 02 §9 and §10.

---

## 4. Departments

Departments must support:

- Creation
- Viewing
- Editing
- Archiving

Departments are dynamic, not hardcoded to a fixed list.

Each employee has **one primary department**.

Archiving a department must preserve historical references and must not silently delete associated employees or business records.

---

## 5. Staff / Employees

Authorized users with Staff/Employees module access and the matching action permission (section 3.1) may perform supported employee management operations, including:

- Create employee records
- View employee records
- Edit employee information
- Assign permitted roles
- Change an employee's primary department
- Suspend accounts
- Deactivate accounts
- Archive employee records

Protected accounts remain subject to additional restrictions (see Section 9).

Employee roles and the primary department are selected during account creation and may be edited later by authorized users.

Changes to permitted roles of an already Active employee take effect immediately, without an additional approval step.

---

## 6. Account Lifecycle and Manual Approvals

### 6.1 Account Statuses

Use these four primary account statuses:

- `Pending`
- `Active`
- `Suspended`
- `Deactivated`

- `Pending` accounts cannot access protected modules.
- `Active` accounts may log in and access their authorized modules.
- `Suspended` accounts cannot access protected modules.
- `Deactivated` accounts cannot access protected modules.

Suspension and deactivation must invalidate effective access, including existing authenticated sessions.

Archiving is a record-retention operation and must not result in continued account access. Do not introduce an additional primary account status unless explicitly approved.

### 6.2 Employee Creation and Manual Approval

- All newly created employee accounts start as `Pending`.
- This applies even when the creator is an Admin or Super Admin.
- Employee creation must not automatically activate the account.
- Only an Admin or Super Admin may approve initial employee activation, except that HR may create, activate and reactivate office staff accounts (owner answer A4, 2026-11-12). HR cannot give the Administrator or Super Administrator role and cannot manage seller accounts (owner follow-up ruling, 2026-11-12).
- Admin and Super Admin are allowed to approve employee accounts that they created themselves.
- Approval must remain an explicit manual action.
- Approved accounts become `Active`.
- If an employee account request is rejected, return it to the creator for correction and resubmission.

Because `Rejected` is not a primary account status, represent rejection as an **approval decision or review state** associated with the Pending account.

Do not introduce additional approval levels or chains.

### 6.2.1 Forgotten Passwords (interim, owner ruling R5, 2026-11-12)

Until real authentication exists, a user who forgets their password asks the office. An Administrator (or the Super Administrator) issues a temporary password, and the reset is audited without recording the password itself (doc 12). A self-service email reset waits for real authentication.

### 6.3 Employee Lifecycle (Summary)

1. Authorized user creates employee account → status `Pending`.
2. Admin/Super Admin (or HR, for office staff accounts) reviews and either approves (→ `Active`) or rejects (returns to creator for correction/resubmission; rejection recorded as approval decision on the Pending account).
3. Active employee accesses authorized modules based on union of active assigned roles.
4. Authorized Staff/Employees user may suspend or deactivate a non-protected account → access invalidated immediately.
5. Reactivation requires explicit Admin/Super Admin approval, or HR approval for an office staff account → valid existing roles restored; archived/invalid roles do not restore permissions.
6. Archiving retains the record and removes active access; no cascade deletion of historical records.

---

## 7. Suspension, Deactivation, and Reactivation

- Any authorized user with Staff/Employees module access and the suspend or deactivate action permission may suspend or deactivate non-protected employee accounts.
- Suspension and deactivation must immediately remove access to protected operations.
- Reactivation requires explicit Admin or Super Admin approval. HR may also approve the activation and reactivation of an office staff account, never an Administrator or Super Administrator account and never a seller account (owner answer A4, 2026-11-12).
- Authorized users who can suspend or deactivate employees must not automatically gain reactivation approval authority (HR's authority over office staff accounts is explicit, not automatic).
- When reactivation is approved:
  - Restore valid existing role assignments.
  - Do not require unnecessary reassignment.
  - Archived or otherwise invalid roles must not restore permissions.
  - Effective access must be recalculated.
- Preserve audit history for all status changes.

---

## 8. Archiving and Historical Integrity

Use archival rather than destructive deletion for records with historical dependencies. This applies to departments, employees, and roles.

- Archiving a role must immediately disable permissions granted by that role.
- Historical role assignments should remain recorded for traceability.
- Archiving a department or employee must preserve relevant historical references.
- Archived employee accounts must not retain active access.
- Do not cascade-delete important historical records.

---

## 9. Protected Operations and Security

The following restrictions override ordinary module access and action permissions:

- Super Admin role protection
- Protected account restrictions
- Bounded role delegation
- Activation approval by the Admin/Super Admin, or by HR for office staff accounts
- Reactivation approval by the Admin/Super Admin, or by HR for office staff accounts
- Backend authorization enforcement
- Audit logging

Module access must not allow users to bypass these restrictions. Document these as system integrity and security constraints, not as separate CRUD permission toggles.

---

## 10. Deferred / Out-of-Scope Features

Do not introduce in v1.0:

- Individual Create/Read/Update/Delete permission checkboxes
- Advanced own/team/all visibility scope configuration
- Cross-department approval workflows
- Multi-level employee approval chains
- Complex policy builders
- Fine-grained per-field permission controls

These features are intentionally deferred. Do not reintroduce them through assumptions from the legacy platform.

---

## 11. Acceptance Criteria

The document establishes that:

- Organization Management has three modules.
- Module access controls navigation and viewing only; entering, editing and important actions need separate action permissions (owner ruling R4, 2026-11-12).
- No generic per-field CRUD permission toggles exist.
- The Administrator can do everything; the Super Administrator has no blocks; both may approve their own entries, and the audit history shows it (owner ruling, 2026-11-12).
- Clerks enter only; sellers view only, except that a seller may start a customer draft and upload a payment slip photo (proof only) for their own customer.
- Until real authentication exists, an Administrator issues a temporary password for a forgotten password.
- Multiple roles are supported.
- Role assignments are bounded.
- Super Admin is protected: only a Super Administrator may create, give or remove the Super Administrator role; an Administrator cannot.
- Super Admin holds the union of every role's module and operation grants, including all Finance work (owner decision, 2026-11-10).
- Every newly created employee account requires manual approval.
- Admin/Super Admin self-approval is allowed.
- Rejected accounts can be corrected and resubmitted.
- Authorized Staff/Employees users can suspend or deactivate non-protected accounts.
- Only Admin/Super Admin, or HR for office staff accounts, can approve reactivation.
- Existing valid roles are retained on reactivation.
- Archived roles immediately stop granting permissions.
- Historical records are preserved.
- Advanced authorization and approval workflows remain deferred.

---

## 12. Open Questions

- The exact list of action permissions per module, and which of them the Clerk and Finance roles hold, is tracked in `docs/development/role-module-permission-matrix-proposal.md`.

---

## Completion Report

- **File created/updated:** `docs/business-rules/01-roles-and-permissions.md`
- **Sections included:** Purpose and scope; Organization Management modules; Roles and permission rules; Departments; Staff/Employees; Account lifecycle and manual approvals; Suspension, deactivation, and reactivation; Archiving and historical integrity; Protected operations and security; Deferred/out-of-scope features; Acceptance criteria; Open questions.
- **Confirmation:** All approved business rules represented (module-level authorization, multiple roles, bounded delegation, Super Admin protection, manual approval with self-approval, rejection as review state, suspension/deactivation/reactivation rules, archival and historical integrity, deferred features).
- **Unresolved ambiguity:** None.
- **Changes made:** Documentation only. No code, database, Git, or deployment changes.
## Owner rulings amendment (2026-11-12, rounds R4–R5 and authority rule)

These rulings take precedence over earlier text in this document where they differ.

1. **Overriding authority rule.** The Administrator can do everything in the system. The Super Administrator has full control and no blocks. Both may approve their own entries, and the audit history shows that the same person entered and approved. Clerks enter only. Sellers view only (section 3.7). This supersedes the R4 answer that the Administrator never approves their own entry.
2. **Role mapping (R4).** Director = Super Administrator. Supervisor = Administrator. Clerk is a new office staff job that enters information but cannot approve. Finance verifies money and pays (section 3.8).
3. **Sellers view only (R4).** SVD, SSM and SM see their own and their team's customers, sales and pay. OST sees only their own. The single exception is the seller customer draft (doc 04 §5).
4. **Modules for viewing, action permissions for changes (R4).** Module access controls navigation and viewing. Entering, editing and important actions (approve, verify payment, payout, refund, import) each need a separate action permission (section 3.1). This replaces the former rule that a module grant gives every function of the module.
5. **Forgotten passwords (R5).** Until real authentication exists, an Administrator issues a temporary password; an email reset waits for real authentication (section 6.2.1).
6. ~~**Open.** (Superseded, owner ruling 2026-11-12: settled by follow-up item 1.) Whether the Administrator may assign or remove the Super Administrator role is not settled; section 3.4 stays in force until the owner decides.~~ **Settled 2026-11-12 (follow-ups, item 1 below).**

## Owner rulings amendment (2026-11-12, follow-ups)

These rulings take precedence over earlier text in this document where they differ. Item numbers follow the master follow-up list in `docs/implementation/decisions-and-gaps.md`; they are not renumbered here.

1. **Super Administrator role.** Only a Super Administrator can create, give or remove the Super Administrator role; an Administrator cannot. Otherwise the Administrator can do everything (sections 3.4 and 3.7). This closes the former open question in section 12.
2. **Seller payment slip.** A seller may upload a payment slip photo for their own customer. It is proof only and counts only after a Clerk enters the receipt and Finance, an Administrator or the Super Administrator approves it (sections 3.7 and 3.8; doc 07).
3. **Contracts.** Sellers do not prepare contracts. The office (Clerk) prepares the contract and the Administrator approves it (section 3.8; doc 05).
24. **HR.** HR can create, activate and reactivate office staff accounts (reactivation confirmed by owner answer A4, 2026-11-12), but cannot give the Administrator or Super Administrator role and cannot manage seller accounts (sections 3.8 and 6.2).
25. **Finance reports.** Finance can view all reports (sales, collections, pay), view only (section 3.8).
