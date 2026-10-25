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

### 3.1 Module-Level Authorization

Authorization uses a **simple module-level model**.

**Granting access to a module automatically grants all functions supported by that module, including full CRUD when available.**

There are **no** separate permission toggles such as:

- `canRead`
- `canCreate`
- `canUpdate`
- `canDelete`

Examples:

- A user with Departments access can use all supported Department functions.
- A user with Staff/Employees access can use all supported Staff/Employees functions, subject to protected account and approval restrictions.
- A user without Roles & Permissions access cannot manage roles.

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

The Super Admin role is protected. Ordinary managers must never create, assign, edit, archive, or otherwise obtain protected Super Admin privileges through role management. This restriction overrides ordinary module-level CRUD access.

### 3.5 Permission Example

| Role | Departments | Staff/Employees | Roles & Permissions |
|---|---|---|---|
| HR Manager | Yes | Yes | No |
| Dept Head | Yes | No | No |
| System Admin | Yes | Yes | Yes |

An employee assigned both "HR Manager" and "Dept Head" has Departments and Staff/Employees access (union). Neither can manage roles.

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

Authorized users with Staff/Employees module access may perform supported employee management operations, including:

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
- Only an Admin or Super Admin may approve initial employee activation.
- Admin and Super Admin are allowed to approve employee accounts that they created themselves.
- Approval must remain an explicit manual action.
- Approved accounts become `Active`.
- If an employee account request is rejected, return it to the creator for correction and resubmission.

Because `Rejected` is not a primary account status, represent rejection as an **approval decision or review state** associated with the Pending account.

Do not introduce additional approval levels or chains.

### 6.3 Employee Lifecycle (Summary)

1. Authorized user creates employee account → status `Pending`.
2. Admin/Super Admin reviews and either approves (→ `Active`) or rejects (returns to creator for correction/resubmission; rejection recorded as approval decision on the Pending account).
3. Active employee accesses authorized modules based on union of active assigned roles.
4. Authorized Staff/Employees user may suspend or deactivate a non-protected account → access invalidated immediately.
5. Reactivation requires explicit Admin/Super Admin approval → valid existing roles restored; archived/invalid roles do not restore permissions.
6. Archiving retains the record and removes active access; no cascade deletion of historical records.

---

## 7. Suspension, Deactivation, and Reactivation

- Any authorized user with Staff/Employees module access may suspend or deactivate non-protected employee accounts.
- Suspension and deactivation must immediately remove access to protected operations.
- Reactivation requires explicit Admin or Super Admin approval.
- Authorized users who can suspend or deactivate employees must not automatically gain reactivation approval authority.
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

The following restrictions override ordinary module-level CRUD access:

- Super Admin role protection
- Protected account restrictions
- Bounded role delegation
- Admin/Super Admin-only activation approval
- Admin/Super Admin-only reactivation approval
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
- Module access includes all supported CRUD functions.
- No per-action CRUD permission toggles exist.
- Multiple roles are supported.
- Role assignments are bounded.
- Super Admin is protected.
- Every newly created employee account requires manual approval.
- Admin/Super Admin self-approval is allowed.
- Rejected accounts can be corrected and resubmitted.
- Authorized Staff/Employees users can suspend or deactivate non-protected accounts.
- Only Admin/Super Admin can approve reactivation.
- Existing valid roles are retained on reactivation.
- Archived roles immediately stop granting permissions.
- Historical records are preserved.
- Advanced authorization and approval workflows remain deferred.

---

## 12. Open Questions

None identified. All approved rules in this task are represented without additional ambiguity.

---

## Completion Report

- **File created/updated:** `docs/business-rules/01-roles-and-permissions.md`
- **Sections included:** Purpose and scope; Organization Management modules; Roles and permission rules; Departments; Staff/Employees; Account lifecycle and manual approvals; Suspension, deactivation, and reactivation; Archiving and historical integrity; Protected operations and security; Deferred/out-of-scope features; Acceptance criteria; Open questions.
- **Confirmation:** All approved business rules represented (module-level authorization, multiple roles, bounded delegation, Super Admin protection, manual approval with self-approval, rejection as review state, suspension/deactivation/reactivation rules, archival and historical integrity, deferred features).
- **Unresolved ambiguity:** None.
- **Changes made:** Documentation only. No code, database, Git, or deployment changes.