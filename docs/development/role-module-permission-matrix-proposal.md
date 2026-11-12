# AFHomes Platform — Role, Module, Operation, and Record-Scope Permission Matrix (PROPOSAL)

**Status: PARTIALLY APPROVED — SCOPED BASELINE; OWNER DECISIONS OF 2026-11-12 APPLIED (section 1.2); REMAINING DECISIONS PENDING (section 17)**

This is an internal engineering specification. It is not an approved business policy and must not be rendered in the application UI. No code changes are included.

---

## 1. Purpose and Current Approval Status

This document proposes a complete access-control specification for the AFHomes Platform based on the canonical business-rule documents. It is intended for project-owner review before any permission implementation or B05 panel-shell work begins. Existing implementation grants remain provisional until this proposal is approved and reflected in code.

---

## 1.1 R3 Approved Baseline and Corrections

R3 reconciles the matrix with the approved scoped baseline. Key corrections:

- R3-01: Personal commission viewing (IST/OST) is separate from Finance commission administration.
- R3-02: Sales Management view scopes (own/team) are distinct from create/approve/cancel/confirm.
- R3-03: Customer own/downline viewing is distinct from global Customer Management.
- R3-04: HR has Departments and Staff/Employees; protected account/role operations remain separate.
- R3-05: Finance reporting is limited to Finance-specific reporting.
- R3-06: Admin product/contract operations are limited to documented product/contract administration.
- R3-07: ~~Public Customer Lookup and~~ Public IST/OST Verification ~~are~~ is an active public boundary, not a disabled module. *Public Customer Lookup was removed from scope by owner ruling R11 (2026-11-12; doc 11 §21).*
- R3-08: Confirmed Deny is used only for source-backed restrictions; undocumented grants are Unresolved.
- R3-09: Module inventory counts operational modules, public boundaries, and disabled modules separately.
- R3-10: SVD/SSM/SM are IST designations; no new genealogy relationships are introduced.
- R3-11: Super Admin and Admin share approved Organization Management; protected Super Admin operations remain distinct.
- R3-12: VIP customer self-service is documented separately from sales roles.

Approved module baseline (R3): Super Admin/Admin = Dashboard, Organization, Accounts, VIP Products; HR = Dashboard, Organization; Finance = Dashboard, Finance; SVD/SSM/SM/IST/OST = Dashboard, Sales Network. Extended by the owner decisions of 2026-11-12 (section 1.2). All other modules remain Unresolved/denied.

## 1.2 Owner Decisions (2026-11-12, round R4, round R5 and the overriding authority rule)

Recorded in `docs/business-rules/01-roles-and-permissions.md` §3.1, §3.7 and §3.8. They take precedence over earlier text in this proposal.

- **Authority rule.** The Administrator can do everything in the system. The Super Administrator has full control and no blocks. Both may approve their own entries; the audit history shows the same person entered and approved. Clerks enter only. Sellers view only.
- **Role mapping.** Director = Super Administrator. Supervisor = Administrator. Clerk = new office staff job that enters but cannot approve. Finance = Finance (verifies money, pays).
- **Sellers view only.** SVD, SSM and SM see their own and their team's customers, sales and pay; OST sees only their own. Exception: a seller (IST or OST) may start a customer draft, which the Clerk completes and the Administrator approves (`04` §5).
- **Modules for viewing, action permissions for changes.** Module access controls navigation and viewing. Entering, editing and important actions (approve, verify payment, payout, refund, import) each need a separate action permission. This replaces `01` §3.1's former rule that a module grant gives every function.
- **Every operation in section 6** is also allowed to the Administrator and the Super Administrator, whatever role the line names.

## 2. Canonical Role Inventory

| Role | Source | Notes |
|---|---|---|
| Super Administrator | `01` §3.4, §3.6, §3.7, §3.8, §6.2, §7, §9 | The company's Director. Protected role; full control, no blocks; may approve own entries (audited) |
| Administrator | `01` §3.5, §3.7, §3.8, §6.2, §7 | The company's Supervisor. Can do everything in the system; may approve own entries (audited) |
| Clerk | `01` §3.7, §3.8 | Office staff job (2026-11-12). Enters information; never approves |
| HR | `01` §3.5 | Departments + Staff/Employees; no Roles & Permissions |
| Finance | `07` §4, §5.3, §21 | Payment verification, refunds, reversals, reconciliation |
| Authorized Staff | `01` §3.1–3.2 | Explicitly assigned module access only |
| SVD | `02` §2.1, §9.1, §9.6 | IST designation; top Sales Network node; view only (own and team) |
| SSM | `02` §2.1, §9.2, §9.6 | IST designation; reports to SVD; view only (own and team) |
| SM | `02` §2.1, §9.3, §9.6 | IST designation; reports to SSM; view only (own and team) |
| IST | `02` §2.1 | Internal Sales Team with SVD/SSM/SM designation |
| OST | `02` §2.2, §9.4, §9.6 | Outsourcing Sales Team; view only (own) |

---

## 3. Active and Disabled Module Inventory

Active areas: Dashboard (neutral landing), Organization Management (Departments, Staff/Employees, Roles & Permissions), Sales Network, IST/OST Accreditation, Customer Management, Customer Import/Export, VIP Products, Payment Schemes & Contracts, Sales Management, Finance & Payments, Commission Management, VIP Membership, VIP Card Issuance, Stay Points, Reports & Analytics, Sales Performance, Audit Logs & Governance, Public IST/OST Verification, Public Website CMS. Public Customer Lookup is removed from scope (owner ruling R11, 2026-11-12; doc 11 §21).

Disabled: Redemption, Services (`10` §19, `09` §333; preserved but hidden).

---

## 4. Permission Status Legend

- **A** — Confirmed Allow (source-backed)
- **D** — Confirmed Deny (source-backed restriction)
- **U** — Unresolved (insufficient/conflicting evidence)
- **X** — Disabled (module inactive regardless of role)

Runtime behavior must fail closed for U.

---

## 5. Module-Level Role Matrix

| Module | Super Admin | Admin | HR | Finance | Staff | SVD | SSM | SM | IST | OST |
|---|---|---|---|---|---|---|---|---|---|---|
| Dashboard (landing) | A | A | A | A | A | A | A | A | A | A |
| Organization – Departments | A | A | A | D | U | D | D | D | D | D |
| Organization – Staff/Employees | A | A | A | D | U | D | D | D | D | D |
| Organization – Roles & Permissions | A | A | D | D | U | D | D | D | D | D |
| Sales Network | A | A | D | D | U | A | A | A | A | A |
| IST Accreditation | A | A | D | D | U | D | D | D | D | D |
| OST Accreditation | A | A | D | D | U | D | D | D | D | D |
| Customer Management | A | A | D | U | U | A | A | A | A | A |
| Customer Import/Export | A | A | D | U | U | D | D | D | D | D |
| VIP Products | A | A | D | U | U | D | D | D | D | D |
| Payment Schemes & Contracts | A | A | D | U | U | D | D | D | D | D |
| Sales Management | A | A | D | U | U | A | A | A | A | A |
| Finance & Payments | A | A | D | A | U | D | D | D | D | D |
| Commission Management | A | A | D | A | U | A | A | A | A | A |
| VIP Membership | A | A | D | U | U | D | D | D | D | D |
| VIP Card Issuance | A | A | D | U | U | D | D | D | D | D |
| Stay Points | A | A | D | U | U | D | D | D | D | D |
| Reports & Analytics | A | A | D | A | U | U | U | U | U | U |
| Sales Performance | A | A | D | U | U | U | U | U | U | U |
| Audit Logs & Governance | A | A | D | U | U | D | D | D | D | D |
| Public Customer Lookup (removed, owner ruling R11) | X | X | X | X | X | X | X | X | X | X |
| Public IST/OST Verification | X (internal) | X | X | X | X | X | X | X | X | X |
| Public Website CMS | U | U | D | D | U | D | D | D | D | D |
| Redemption | X | X | X | X | X | X | X | X | X | X |
| Services | X | X | X | X | X | X | X | X | X | X |

Owner decisions of 2026-11-12 applied to this table (doc 01 §3.1, §3.7, §3.8):

- Super Admin and Admin: A for every active module (overriding authority rule). Public Website CMS stays U (D8).
- Sales roles (SVD, SSM, SM, IST, OST): module access is view only. Customer Management, Sales Management and Commission Management are A for viewing within record scope (own for OST; own and team for SVD, SSM, SM), plus starting a customer draft (doc 04 §5). Accreditation management is D; a seller sees their own accreditation status on the dashboard (doc 03 §5.5, §9.1).
- Staff column: the Clerk is an office staff job that enters but never approves. Which modules a Clerk holds is assigned by role (doc 01 §3.2) and stays U here.

Sources: `01` §2, §3, §9; `02` §9, §10; `07` §4, §5.3, §21; `08` §§5–8; `11` §8, §15; `12` §10; `10` §19; `09` §343–350.

---

## 6. Operation-Level Permissions

Every operation below is also allowed to the Administrator and the Super Administrator (owner authority rule, 2026-11-12), except that only a Super Administrator may create, give or remove the Super Administrator role (`01` §3.4). Sellers hold no change operation except starting a customer draft and uploading a payment slip photo (proof only) for their own customer. Clerks hold entry operations only, never approvals.

### Finance & Payments (`07`)
- Upload a payment slip photo (proof only): IST/OST for their own customers (A, `07` §5.1, owner follow-up ruling 2026-11-12). It counts only after a Clerk enters the receipt and Finance, Admin or Super Admin approves it.
- Enter a receipt: Clerk, Admin, Super Admin (A, `07` §5.1). Sellers: D.
- Upload/replace payment proof: submitting actor (U).
- Review submitted payments: Finance (A).
- Verify (approve) a receipt: Finance, Administrator, Super Administrator (A, `07` §5.2).
- Sign off a history import batch (receipts marked "Approved (imported)"): Admin or Super Admin, once per batch (A, `07` §20).
- Reject/return for correction: Finance (A).
- Approve/execute refunds: Finance (A, `07` §5.3).
- Execute reversals: Finance (A).
- Reconciliation: Finance (A).
- View complete Finance reports: Finance (A, `07` §22).
- View permitted payment history: Staff/IST/OST for own/authorized customers (U scope).

### Commission Management (`08`)
- View personal commissions: IST/OST (A, `08` §6, §8.3).
- View team commissions: SVD/SSM/SM (A, record-scoped; owner ruling R4, 2026-11-12: leaders see their team's pay).
- Set a person's DSC/DRI rates: Admin or Super Admin, future sales only, logged (A, `08` §9). Rates default to the position standard and are frozen on the sale at VIP Number issuance; Finance does not type percentages.
- Review eligibility: Finance (A).
- Approve commissions: Finance (A, `08` Decision 1).
- Apply holds: system automatic; Finance manual resolution (A).
- Record payout: Finance (A, Decision 7).
- View payout history: Finance (A).

### Sales Network (`02`)
- View own sales: SVD/SSM/SM/IST/OST (A, §9).
- View team/downline sales: SVD/SSM/SM (A, §9.1–9.3).
- Enter a new seller: Clerk, Admin, Super Admin (A, §4, `03` §9.1). Sellers: D.
- Approve a new seller: Admin or Super Admin, including their own entry (A, `03` §9.1).
- Review public OST applications (approve, return to fix, reject): Admin or Super Admin; Clerk may check and complete (A, `03` §9.2).
- Transfer team: Admin or Super Admin (A, §6).
- Convert IST/OST: Admin or Super Admin (A, §7).
- Promote/demote IST: Admin or Super Admin (A, §8).

### Organization Management (`01`)
- Departments CRUD: Super Admin/Admin (A); HR (A, §3.5); Dept Head view only (U).
- Staff/Employees CRUD: Super Admin/Admin (A); HR (A, §3.5).
- Role assignment: Super Admin/Admin (A); bounded delegation (§3.3). Create, give or remove the Super Administrator role: Super Admin only; Admin D (§3.4).
- Account activation: Admin/Super Admin (A, §6.2); HR for office staff accounts only, never sellers and never with the Admin or Super Admin role (A, follow-up ruling 2026-11-12).
- Suspension/deactivation: Staff/Employees access plus the matching action permission (A, §3.1, §7).
- Issue a temporary password (interim, until real authentication): Admin or Super Admin (A, §6.2.1).
- Reactivation approval: Admin/Super Admin (A, §7).

### Accreditation (`03`)
- Enter accreditation records: Clerk, Admin, Super Admin (A, §9.1).
- Approve and change approved seller records (renewal, date correction, status): Admin or Super Admin (A, §5.3, §6, §9.1).
- View own accreditation: IST/OST (A).

### Customer Management (`04`)
- Start a customer draft: IST/OST for own customers; Clerk, Admin, Super Admin (A, §5).
- Complete and submit a registration: Clerk, Admin, Super Admin (A, §5, §10).
- Approve a registration: Admin or Super Admin, including their own entry (A, §5).
- View own customers: IST/OST (A, `02` §10).
- View downline customer names (limited): SVD/SSM/SM (A, `02` §10.2).

### VIP Products/Contracts (`05`)
- Manage products: Admin (A, §10).
- Prepare contracts: Clerk (office), Admin, Super Admin (A, `05` §11). Sellers (IST/OST): D (owner follow-up ruling 2026-11-12).
- Approve finalization: Admin (A, §10).
- Approve Non-Standard terms: Admin approves, then Finance confirms; only the Super Admin may do both steps alone (A, `05` §10.2).

### VIP Membership/Stay Points (`09`)
- View own membership/points: customer (A).
- Manage products/entitlements: Admin (A, §345).
- Finance reconciliation: Finance (A, §347).
- Tranche release (Annual Welcome Gift): system, on the tranche due date when the period's Qualifying Spend meets the tier minimum (A, `09` §12).
- Enter resort bills: Clerk, Finance, Admin, Super Admin; approve: Finance, Admin, Super Admin (A, `09` §11).

### Audit Logs (`12`)
- View audit: appropriately authorized personnel (U exact roles).
- Modify audit history: D for all ordinary roles (A, §9).

### Public CMS (`11`/project)
- Content management: U (no canonical role assignment found).

---

## 7. Record-Level Scopes

- Own records: IST/OST personal sales and customers (A, `02` §9.4, §10.1/10.3).
- Direct downline: SVD/SSM/SM authorized descendants (A, `02` §9.1–9.3).
- Genealogy branch: SVD entire branch; SSM/SM scoped (A, `02` §9).
- Upline view-only: SSM/SM/OST see actual upline chain (A, `02` §9.2–9.4).
- Department records: HR/Dept Head scoped (U exact).
- Financial records: Finance appropriately authorized (U scope details).
- Audit records: authorized personnel only (U).
- Public lookup: only eligible Active VIP Membership, masked (A, `04`).
- Public accreditation: exact AA number, active only, IST omits Valid Until, OST shows it (A, `03`).

Historical attribution must be preserved on transfers/conversions (`02` §6.3, §7.1).

---

## 8. Administrative Role Separation

- Super Admin: protected role; full Organization Management (`01` §3.4, §9); manual approval authority (`01` §6.2, §7).
- Admin: can do everything in the system (`01` §3.7, owner ruling 2026-11-12). Only a Super Admin may create, give or remove the Super Admin role; the Admin cannot (`01` §3.4, owner follow-up ruling 2026-11-12; D10).
- Domain approvals (Finance verification, commission payouts) are held by Finance and also by the Admin and the Super Admin (authority rule); both may approve their own entries, and the audit history shows it.
- Admin status alone does not grant silent audit modification (`12` §9).

---

## 9. HR and Staff Permission Boundaries

- HR: Departments + Staff/Employees; no Roles & Permissions (`01` §3.5).
- Dept Head: Departments only (`01` §3.5).
- Staff: explicit assigned module access only; no universal access (`01` §3.1–3.2). Module access is view only; changes need action permissions (`01` §3.1).
- Clerk: enters information; never approves (`01` §3.7, §3.8).
- Sensitive personnel info restricted (`01` §9).
- Account approval/reactivation: Admin/Super Admin only (`01` §6.2, §7).

---

## 10. Sales Network Permissions

- SVD: entire authorized branch, own sales, descendant sales, full branch genealogy (`02` §9.1).
- SSM: own + SM/OST descendants, parent SVD view-only (`02` §9.2).
- SM: own + OST descendants, parent SSM/SVD view-only (`02` §9.3).
- IST: Sales Network permissions by designation; not automatically in OST genealogy (`02` §2.1).
- OST: own sales, own customers, actual upline chain view-only; no unrelated sellers (`02` §9.4).
- Designation changes auto-recalculate access (`02` §9.5).
- Genealogy visibility ≠ module access (`02` §9, §11).
- All sellers view only; SVD/SSM/SM see own and team customers, sales and pay; OST sees only own; the only seller change is starting a customer draft (`02` §9.6, `04` §5; owner ruling R4, 2026-11-12).

---

## 11. Finance and Commission Approval Controls

- Payment verification: Finance, and also the Admin and the Super Admin under the authority rule (`07` §5.2 as amended by round R6, 2026-11-12).
- Refunds/reversals: Finance, and also the Admin and the Super Admin under the authority rule (`07` §5.3, §252, as amended by round R6).
- Commission approval and payout: Finance, and also the Admin and the Super Admin under the authority rule (`08` Decision 7, rewritten for rounds R8–R9).
- Approved ≠ Paid (`08`).
- No automatic commission on Confirmed Sale (`08`).
- Payout only after disbursement confirmation (`08` Decision 7).
- Financial Hold on Active membership when verified payment reversed (`07` §309, `09` §17.2).

---

## 12. Public Verification and CMS Boundaries

- Customer Lookup: removed from scope; there is no public card or customer lookup (owner ruling R11, 2026-11-12; `11` §21).
- IST/OST verification: exact AA number, active only; IST omits Valid Until, OST shows it (`03`, `11`).
- No unrestricted public name discovery (`03`, `11`).
- CMS: content management roles unresolved (`11` mentions authorized business users).

---

## 13. Multiple Roles and Account States

- Effective access = union of active assigned roles (`01` §3.2).
- Inactive role grants nothing (`01` §3.2, §6.1).
- Inactive account grants no protected access (`01` §6.1).
- Suspended/deactivated accounts blocked (`01` §6.1, `02` §5).
- Unknown role → deny by default (this proposal).
- Disabled modules remain unavailable regardless of role.
- Multiple active roles must not duplicate navigation entries (implementation requirement).

---

## 14. Disabled-Module Restrictions

Redemption and Services:
- Status: DISABLED (`10` §19, `09` §333).
- No navigation, routes, APIs, or workflows.
- Preserve future architecture.
- Reactivation requires separate authorization.

---

## 15. Canonical Sources and Evidence

Primary sources:
- `docs/business-rules/01-roles-and-permissions.md`
- `docs/business-rules/02-sales-network-and-genealogy.md`
- `docs/business-rules/03-ist-ost-accreditation.md`
- `docs/business-rules/04-customer-management.md`
- `docs/business-rules/05-vip-products-and-contracts.md`
- `docs/business-rules/06-vip-card-issuance.md`
- `docs/business-rules/07-finance-and-payments.md`
- `docs/business-rules/08-commission-management.md`
- `docs/business-rules/09-vip-membership-and-stay-points.md`
- `docs/business-rules/10-redemption.md`
- `docs/business-rules/11-reports-and-analytics.md`
- `docs/business-rules/12-audit-logs-and-governance.md`
- `docs/business-rules/13-sales-performance-reporting.md`
- `docs/project.md`, `docs/development/*.md`

---

## 16. Existing Implementation Gap Analysis

**Already implemented correctly:**
- Centralized navigation config and availability filtering (`src/panels/admin/navigation.ts`).
- Role-aware resolver with deny-by-default (`src/modules/identity/permissions.ts`).
- Inactive account/role handling (`activeRoles`, `getGrantedModuleIds`).
- Multiple-role union (tested).
- Component rendering tests (`admin-nav-list.test.tsx`).

**Implemented provisionally:**
- `ROLE_MODULE_GRANTS` reduced to documented modules in R1, but many modules remain unresolved and denied.
- Dashboard treated as neutral landing (not a business module grant).
- Admin/Super Admin granted identical Organization Management access; protected Super Admin privileges not modeled in nav.

**Missing but approved:**
- Operation-level permission enforcement (backend, future).
- Record-level authorization backend (future).
- Real authentication (future).

**Unresolved business decision:**
- Full role/module permission matrix for accreditation, customers, VIP products, sales, commissions, membership, stay points, reports, audit logs, CMS.

**Deferred technical implementation:**
- B05 panel shells, B06+ business modules, backend RBAC.

---

## 17. Unresolved Permission Decisions

| ID | Role | Module/Operation | Existing Doc | Missing Requirement | Impact | Recommendation | Blocks |
|---|---|---|---|---|---|---|---|
| D1 | Super Admin/Admin | Accreditation Management | `03` §5.3, §9.1 | **DECIDED 2026-11-12** (authority rule, R4): Admin and Super Admin have full accreditation access; Clerk enters; sellers view own status only | Accreditation nav for Admin/Super Admin | Grant (section 5) | — |
| D2 | Super Admin/Admin | Customer Management | `04` §5 | **DECIDED 2026-11-12** (authority rule, R5): sellers start drafts; Clerk completes and submits; Admin or Super Admin approves | Customer nav for Admin/Super Admin and sellers (view + draft) | Grant (section 5) | — |
| D3 | HR | Staff account management | `01` §3.8, §6.2 | **DECIDED 2026-11-12** (follow-ups): HR creates and activates office staff accounts; cannot give the Admin or Super Admin role; cannot manage seller accounts | Accounts nav for HR, scoped to office staff | Grant with role and account-type limits | B06 |
| D4 | Finance | Finance module scope | `07` §4, §21; `01` §3.8 | **DECIDED 2026-11-12** (R4): Finance = Finance (verifies money, pays) | Finance nav visible | Finance grant confirmed | — |
| D5 | Finance | Reports access | `07` §22, `01` §3.8 | **DECIDED 2026-11-12** (follow-ups): Finance views all reports (sales, collections, pay), view only | Reports nav for Finance | Grant view only | B06 |
| D6 | SVD/SSM/SM/IST/OST | Accreditation module | `03` §9.1; `01` §3.7 | **DECIDED 2026-11-12** (R4, sellers view only): sales roles do not manage accreditation; they see their own status on the dashboard | Accreditation nav hidden for sellers | Deny (section 5) | — |
| D7 | SVD/SSM/SM | Customer downline access | `02` §9.6, §10.2 | **DECIDED 2026-11-12** (R4): leaders see own and team customers, sales and pay, within the `02` §10.2 field limits | Customer and commission views scoped to team | Implement record scope in backend later | B06 (backend scope only) |
| D8 | Admin | CMS management | `11` (authorized business users) | **DEFERRED 2026-11-12** (owner, R11): website content editing is deferred | CMS nav hidden | Keep denied | future |
| D9 | All | Audit Logs visibility | `12` §9, §224 | **PARTLY DECIDED 2026-11-12:** Admin and Super Admin view (authority rule). Open: which other roles view audit logs | Audit nav for Admin/Super Admin only | Keep other roles denied | B06 |
| D10 | Super Admin vs Admin | Protected privileges | `01` §3.4, §3.7 | **DECIDED 2026-11-12:** Admin can do everything; both may approve own entries. Only the Super Admin may create, give or remove the Super Admin role (`01` §3.4). Only the Super Admin may do both Non-Standard approval steps alone (`05` §10.2) | Nav treats them same | Model the two Super Admin-only exceptions | B05 |

---

## 18. Implementation Dependencies

- B05 (Role-Specific Panel Shells) can begin using confirmed grants (dashboard, organization, accounts, finance, sales-network) if owner accepts current matrix.
- Business modules (B06+) require the open D-series items (the open part of D9; D8 deferred) to be resolved for full nav.
- Backend RBAC enforcement deferred to Phase 3.

---

## 19. Acceptance Criteria for Later Implementation

1. Every retained grant has a canonical source.
2. Unresolved grants remain denied.
3. Disabled modules remain hidden.
4. Multiple-role union preserved.
5. Inactive accounts denied.
6. Record-level scopes enforced in backend later.
7. No developer UI.
8. No business-rule changes without authorization.

---

## 20. Implementation Readiness

- B05 can begin with confirmed grants (dashboard, organization, accounts, finance, sales-network).
- The open D-series items (the open part of D9; D8 deferred) must be resolved before full module navigation.
- Backend security requirements remain separate.

---

## 21. Safety Confirmation

- Documentation-only changes.
- No source code changes.
- No permission resolver modifications.
- No test modifications.
- No business-rule changes.
- No MongoDB or backend work.
- No developer-facing UI.
- No deployment.
- No prohibited Git operations.

---

## 22. Final Verdict

**PASS WITH FINDINGS — Ready for owner review with clearly documented gaps.**

## Owner rulings amendment (2026-11-12, rounds R4–R5 and authority rule)

These rulings take precedence over earlier text in this proposal where they differ. Details are in section 1.2 and in `docs/business-rules/01-roles-and-permissions.md` §3.1, §3.7 and §3.8.

1. **Authority rule.** The Administrator can do everything; the Super Administrator has no blocks; both may approve their own entries, and the audit history shows it. Clerks enter only; sellers view only.
2. **Role mapping (R4).** Director = Super Administrator; Supervisor = Administrator; Clerk is a new office job (enter only); Finance = Finance.
3. **Modules for viewing, action permissions for changes (R4).** Section 5 module grants are view grants; section 6 lists action permissions.
4. **Sellers (R4, R5).** SVD, SSM and SM see their own and their team's customers, sales and pay; OST sees only their own. A seller may start a customer draft.
5. **D-series status.** D1, D2, D4, D6 and D7 are decided. D9 is partly decided; D3, D5 and D10 are decided and D8 is deferred by the follow-up rulings below. D3, D5 and D8 remain open (section 17).

## Owner rulings amendment (2026-11-12, follow-ups)

These rulings take precedence over earlier text in this proposal where they differ.

1. **Super Administrator role.** Only a Super Administrator can create, give or remove the Super Administrator role; an Administrator cannot. Otherwise the Administrator can do everything (`01` §3.4, §3.7). D10 is decided.
2. **Seller payment slip.** Sellers may upload a payment slip photo for their own customer. It is proof only and counts only after a Clerk enters the receipt and Finance, Admin or Super Admin approves it (section 6; `07` §5.1).
3. **Contracts.** Sellers do not prepare contracts; the Clerk prepares and the Admin approves (section 6; `05` §11).
4. **Non-Standard.** The Admin approves and Finance confirms; only the Super Admin may do both steps alone (section 6; `05` §10.2).
5. **Imported receipts.** Marked "Approved (imported)"; the Admin signs off each import batch once (section 6; `07` §20).
6. **Resort bills.** Clerk-entered resort bills are approved by Finance, Admin or Super Admin (section 6; `09` §11).
18. **Bookings.** Front-desk or office staff with the Bookings operation permission make room bookings with points; no separate approval step; every booking audited; Admins can cancel or correct any booking (`10` §9.2).
24. **HR (D3).** HR creates and activates office staff accounts; cannot give the Admin or Super Admin role; cannot manage seller accounts (`01` §3.8, §6.2).
25. **Finance reports (D5).** Finance views all reports (sales, collections, pay), view only (`01` §3.8).
26. **CMS (D8).** Website content editing is deferred (CMS deferred by owner, R11).

## Consistency update (2026-11-12)

1. Public Customer Lookup is marked removed from scope (owner ruling R11; `11` §21) in sections 1.1, 3, 5 and 12.
2. Commission rates are per-person DSC/DRI rates set by Admin or Super Admin and frozen on the sale (`08` §9), replacing Finance-set percentages; Stay Points earning is replaced by Annual Welcome Gift tranche release (`09`); receipt approval cites `07` §5.2 (Finance, Admin or Super Admin).
