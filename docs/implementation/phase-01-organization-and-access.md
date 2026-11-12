# FP1: Organization and Access

- Atlas journey: J03 Staff and access (module: Organization and staff)
- Objective: directory of departments, roles and staff, and scoped access, with protected guards.
- Business rules: `docs/business-rules/01-roles-and-permissions.md` sections 3 to 9. Workbook reference: OPS section 2.
- Depends on: nothing. Every later phase relies on its roles and scopes.
- Open decisions: none in the atlas. The module-level versus operation-level permission policy in `AGENTS.md` section 5 still applies.

Routes (from the atlas):

| Route | Entry |
|---|---|
| `/admin/organization` | alias |
| `/admin/organization/departments` | protected |
| `/admin/organization/roles` | protected |
| `/admin/organization/staff` | protected |
| `/admin/account` | protected |
| `/admin/accounts` | alias (needs the accounts grant) |

## F1.1 Departments directory

| Field | Value |
|---|---|
| Journey | J03, TO-BE "Named staff onboarding" |
| Current | HR or Admin adds and edits departments in a dialog. Scope, valid fields and in-use references are checked before saving. Route `/admin/organization/departments`. |
| Target | Same, with changes recorded in the audit trail. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Invalid data and in-use references block the change with a message. Unauthorized actors see no edit controls. Test per rule. |
| Status | Exists (per atlas) |

## F1.2 Roles directory

| Field | Value |
|---|---|
| Journey | J03 |
| Current | Role dialogs change the directory subject to scope and references. Route `/admin/organization/roles`. |
| Target | Same. Roles stay separate from account status. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Roles in use cannot be removed. Protected roles stay protected. |
| Status | Exists (per atlas) |

## F1.3 Staff onboarding with a department role

| Field | Value |
|---|---|
| Journey | J03 |
| Current | The Staff dialog captures identity, contact, address, employment, department and a compatible department role. Access options appear only if granted. Lists support search, filter, sort and inspection. Route `/admin/organization/staff`. |
| Target | Capture the employee and department role within the allowed scope. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | A role incompatible with the department is rejected. Staff record, department role and account status stay separate fields. |
| Status | Exists (per atlas) |

## F1.4 Scoped approval before access is active

| Field | Value |
|---|---|
| Journey | J03, TO-BE "Scoped approval and protected guards" |
| Current | A pending linked account needs an allowed activation action. Role and status changes check the actor's grants. The account-only path needs the accounts grant (`/admin/accounts`). |
| Target | Review before assigning or activating access, enforced by scope. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Without the grant, the action is hidden and the mutation is refused. A pending account cannot sign in. |
| Status | Exists (per atlas) |

## F1.5 Revocation and last-Super-Admin guard

| Field | Value |
|---|---|
| Journey | J03 |
| Current | Protected operations stop the mutation. The last-Super-Admin guard is documented as remaining in place. |
| Target | Revocation takes effect immediately for the actor's scope. The last Super Admin cannot be removed or disabled. |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | One test for the last-Super-Admin guard and one for revocation. |
| Status | Exists (per atlas), verify when picked up |

## F1.5a My Account

| Field | Value |
|---|---|
| Journey | J03 |
| Current | `/admin/account` lets a user change supported personal profile fields. Department and role fields are read-only. Sales users see their referral code where eligible. |
| Target | Same. Password provisioning is real-auth work (see F2.5). |
| Layer | Frontend (mock) |
| Blocked by | none |
| Acceptance | Read-only fields cannot be edited. Field errors stay on the screen. |
| Status | Exists (per atlas). The session snapshot lists My Account browser QA as not done. |

## F1.6 Access-change audit trail

| Field | Value |
|---|---|
| Journey | J03, TO-BE "Record approved access and audit" |
| Current | The atlas says history is recorded "where implemented". |
| Target | Persist actor, scope, timestamps and change evidence for every access change. |
| Layer | Frontend (mock) first, Backend later |
| Blocked by | none |
| Acceptance | Each access change appears in `/admin/audit-logs` with actor and time. Credentials are never logged. |
| Status | Partial |

## Out of scope

Production password provisioning and recovery (F2.4, F2.5). Real roles enforced on a server (Backend).
