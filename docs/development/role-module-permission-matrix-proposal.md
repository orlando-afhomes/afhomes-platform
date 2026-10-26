# AFHomes Platform — Role, Module, Operation, and Record-Scope Permission Matrix (PROPOSAL)

**Status: PARTIALLY APPROVED — SCOPED BASELINE; REMAINING DECISIONS PENDING**

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
- R3-07: Public Customer Lookup and Public IST/OST Verification are active public boundaries, not disabled modules.
- R3-08: Confirmed Deny is used only for source-backed restrictions; undocumented grants are Unresolved.
- R3-09: Module inventory counts operational modules, public boundaries, and disabled modules separately.
- R3-10: SVD/SSM/SM are IST designations; no new genealogy relationships are introduced.
- R3-11: Super Admin and Admin share approved Organization Management; protected Super Admin operations remain distinct.
- R3-12: VIP customer self-service is documented separately from sales roles.

Approved module baseline: Super Admin/Admin = Dashboard, Organization, Accounts, VIP Products; HR = Dashboard, Organization; Finance = Dashboard, Finance; SVD/SSM/SM/IST/OST = Dashboard, Sales Network. All other modules remain Unresolved/denied.

## 2. Canonical Role Inventory

| Role | Source | Notes |
|---|---|---|
| Super Administrator | `01` §3.4, §6.2, §7, §9 | Protected role; manual approval authority |
| Administrator | `01` §3.5, §6.2, §7 | Organization Management full access |
| HR | `01` §3.5 | Departments + Staff/Employees; no Roles & Permissions |
| Finance | `07` §4, §5.3, §21 | Payment verification, refunds, reversals, reconciliation |
| Authorized Staff | `01` §3.1–3.2 | Explicitly assigned module access only |
| SVD | `02` §2.1, §9.1 | IST designation; top Sales Network node |
| SSM | `02` §2.1, §9.2 | IST designation; reports to SVD |
| SM | `02` §2.1, §9.3 | IST designation; reports to SSM |
| IST | `02` §2.1 | Internal Sales Team with SVD/SSM/SM designation |
| OST | `02` §2.2, §9.4 | Outsourcing Sales Team |

---

## 3. Active and Disabled Module Inventory

Active areas: Dashboard (neutral landing), Organization Management (Departments, Staff/Employees, Roles & Permissions), Sales Network, IST/OST Accreditation, Customer Management, Customer Import/Export, VIP Products, Payment Schemes & Contracts, Sales Management, Finance & Payments, Commission Management, VIP Membership, VIP Card Issuance, Stay Points, Reports & Analytics, Sales Performance, Audit Logs & Governance, Public Customer Lookup, Public IST/OST Verification, Public Website CMS.

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
| Sales Network | U | U | D | D | U | A | A | A | A | A |
| IST Accreditation | U | U | D | D | U | U | U | U | U | U |
| OST Accreditation | U | U | D | D | U | U | U | U | U | U |
| Customer Management | U | U | D | U | U | U | U | U | U | U |
| Customer Import/Export | U | U | D | U | U | U | U | U | U | U |
| VIP Products | U | U | D | U | U | D | D | D | D | D |
| Payment Schemes & Contracts | U | U | D | U | U | D | D | D | D | D |
| Sales Management | U | U | D | U | U | U | U | U | U | U |
| Finance & Payments | U | U | D | A | U | D | D | D | D | D |
| Commission Management | U | U | D | A | U | D | D | D | D | D |
| VIP Membership | U | U | D | U | U | D | D | D | D | D |
| VIP Card Issuance | U | U | D | U | U | D | D | D | D | D |
| Stay Points | U | U | D | U | U | D | D | D | D | D |
| Reports & Analytics | U | U | D | A | U | U | U | U | U | U |
| Sales Performance | U | U | D | U | U | U | U | U | U | U |
| Audit Logs & Governance | U | U | D | U | U | D | D | D | D | D |
| Public Customer Lookup | X (internal) | X | X | X | X | X | X | X | X | X |
| Public IST/OST Verification | X (internal) | X | X | X | X | X | X | X | X | X |
| Public Website CMS | U | U | D | D | U | D | D | D | D | D |
| Redemption | X | X | X | X | X | X | X | X | X | X |
| Services | X | X | X | X | X | X | X | X | X | X |

Sources: `01` §2, §3, §9; `02` §9, §10; `07` §4, §5.3, §21; `08` §§5–8; `11` §8, §15; `12` §10; `10` §19; `09` §343–350.

---

## 6. Operation-Level Permissions

### Finance & Payments (`07`)
- Submit payment evidence: Staff/IST/OST for permitted customers (U for IST/OST scope).
- Upload/replace payment proof: submitting actor (U).
- Review submitted payments: Finance (A).
- Verify payment: Finance only (A, `07` §5.3).
- Reject/return for correction: Finance (A).
- Approve/execute refunds: Finance (A, `07` §5.3).
- Execute reversals: Finance (A).
- Reconciliation: Finance (A).
- View complete Finance reports: Finance (A, `07` §22).
- View permitted payment history: Staff/IST/OST for own/authorized customers (U scope).

### Commission Management (`08`)
- View personal commissions: IST/OST (A, `08` §6, §8.3).
- View team commissions: SVD/SSM/SM (U, record-scoped).
- Set commission percentages: Finance (A, `08` §5, Decision 2).
- Review eligibility: Finance (A).
- Approve commissions: Finance (A, `08` Decision 1).
- Apply holds: system automatic; Finance manual resolution (A).
- Record payout: Finance (A, Decision 7).
- View payout history: Finance (A).

### Sales Network (`02`)
- View own sales: SVD/SSM/SM/IST/OST (A, §9).
- View team/downline sales: SVD/SSM/SM (A, §9.1–9.3).
- Create Sales Network account: Super Admin/Admin/Sales Network with delegated permission (A, §4).
- Transfer team: authorized personnel (A, §6).
- Convert IST/OST: authorized personnel (A, §7).
- Promote/demote IST: authorized personnel (A, §8).

### Organization Management (`01`)
- Departments CRUD: Super Admin/Admin (A); HR (A, §3.5); Dept Head view only (U).
- Staff/Employees CRUD: Super Admin/Admin (A); HR (A, §3.5).
- Role assignment: Super Admin/Admin (A); bounded delegation (§3.3).
- Account activation: Admin/Super Admin only (A, §6.2).
- Suspension/deactivation: Staff/Employees access (A, §7).
- Reactivation approval: Admin/Super Admin (A, §7).

### Accreditation (`03`)
- Manage accreditation: authorized personnel with module access (U which roles).
- Renew: authorized personnel (A, §77).
- View own accreditation: IST/OST (A).

### Customer Management (`04`)
- Create/edit/submit customers: authorized sales/admin (U exact roles).
- View own customers: IST/OST (A, `02` §10).
- View downline customer names (limited): SVD/SSM/SM (A, `02` §10.2).
- Public lookup: only eligible Active VIP Membership records (A, `04`).

### VIP Products/Contracts (`05`)
- Manage products: Admin (A, §10).
- Prepare contracts: Authorized Staff/IST (A, §10).
- Approve finalization: Admin (A, §10).

### VIP Membership/Stay Points (`09`)
- View own membership/points: customer (A).
- Manage products/entitlements: Admin (A, §345).
- Finance reconciliation: Finance (A, §347).
- Points earning: system (A).

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
- Admin: full Organization Management (`01` §3.5); does not automatically inherit protected Super Admin privileges (§3.4).
- Distinction: Organization administration vs domain-specific approvals (Finance verification, commission payouts) remain separate (`07`, `08`).
- Admin status alone does not grant silent audit modification (`12` §9).

---

## 9. HR and Staff Permission Boundaries

- HR: Departments + Staff/Employees; no Roles & Permissions (`01` §3.5).
- Dept Head: Departments only (`01` §3.5).
- Staff: explicit assigned module access only; no universal access (`01` §3.1–3.2).
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

---

## 11. Finance and Commission Approval Controls

- Finance sole authority for payment verification (`07` §5.3).
- Finance controls refunds/reversals without Admin approval (`07` §5.3, §252).
- Finance manually assigns/approves/pays commissions (`08` Decisions 1–7).
- Approved ≠ Paid (`08`).
- No automatic commission on Confirmed Sale (`08`).
- Payout only after disbursement confirmation (`08` Decision 7).
- Financial Hold on Active membership when verified payment reversed (`07` §309, `09` §17.2).

---

## 12. Public Verification and CMS Boundaries

- Customer Lookup: only eligible Active VIP Membership records, masked identity (`04`, `11`).
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
| D1 | Super Admin/Admin | Accreditation Management | `03` §77 (authorized personnel) | Which roles are "authorized personnel" | Accreditation nav hidden | Keep denied until specified | B05/B06 |
| D2 | Super Admin/Admin | Customer Management | `04` (no role matrix) | Which roles manage customers | Customer nav hidden | Keep denied | B06 |
| D3 | HR | Staff account management | `01` §3.5, §6.2 | HR vs Admin activation authority | Accounts nav hidden for HR | Grant only Departments to HR | B06 |
| D4 | Finance | Finance module scope | `07` §4, §21 | Finance role → module mapping | Finance nav visible (provisional) | Confirm finance role grant | B06 |
| D5 | Finance | Reports access | `07` §22, `11` §98 | Whether Finance gets Reports nav | Reports nav hidden | Keep denied | B06 |
| D6 | SVD/SSM/SM/IST/OST | Accreditation module | `03` (no role matrix) | Whether sales roles manage accreditation | Accreditation nav hidden | Keep denied | B06 |
| D7 | SVD/SSM/SM | Customer downline access | `02` §10.2 | Exact scope already documented | Nav not affected (no route) | Implement in backend later | B06 |
| D8 | Admin | CMS management | `11` (authorized business users) | Which roles publish content | CMS nav hidden | Keep denied | future |
| D9 | All | Audit Logs visibility | `12` §9, §224 | Which roles view audit logs | Audit nav hidden | Keep denied | B06 |
| D10 | Super Admin vs Admin | Protected privileges | `01` §3.4 | Exact Super Admin-only operations | Nav treats them same | Document protected ops | B05 |

---

## 18. Implementation Dependencies

- B05 (Role-Specific Panel Shells) can begin using confirmed grants (dashboard, organization, accounts, finance, sales-network) if owner accepts current matrix.
- Business modules (B06+) require D1–D10 resolution for full nav.
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
- D1–D10 must be resolved before full module navigation.
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
EOF