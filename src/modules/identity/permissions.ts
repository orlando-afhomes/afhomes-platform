import type { AccountStatus } from "@/modules/accounts/types";
import type { DevIdentity, DevRole } from "@/modules/identity/types";
import { activeRoles } from "@/modules/identity/active-roles";

export type AdminModuleId =
  | "dashboard"
  // Parent navigation scope only; never granted to any role (deny by default).
  // The standalone Organization page was replaced by Departments/Roles/Staff.
  | "organization"
  | "departments"
  | "roles"
  | "staff"
  | "accounts"
  | "sales-network"
  | "sales-network-members"
  | "sales-network-genealogy"
  | "accreditation-registrations"
  | "accreditation-records"
  | "accreditation-renewals"
  | "accreditation"
  | "customers"
  | "vip-products"
  | "experiences"
  | "sales"
  // Parent navigation scopes only; never granted to any role (deny by default).
  | "sales-group"
  | "finance-group"
  | "membership-group"
  | "insights-group"
  | "finance"
  | "commissions"
  | "membership"
  | "stay-points"
  | "redemption"
  | "reports"
  | "audit-logs";

// Approved operation-level permissions. Presentation/contract boundaries only;
// backend authorization remains authoritative.
export type AdminOperation =
  | "organization.departments.manage"
  | "organization.staff.manage"
  | "organization.roles.manage"
  /** Maintain the admin-managed lists: program categories, government ID types, banks and outlets (Administrator, Super Administrator). */
  | "settings.lists.manage"
  | "admin.protected"
  | "vip-products.manage"
  /** Approve and activate a complete Draft VIP product (Super Administrator only). */
  | "vip-products.approve"
  /** Create, edit, archive and restore public website Experiences content (Administrator, Super Administrator). */
  | "experiences.manage"
  | "contracts.approve"
  | "finance.verify"
  | "finance.refund"
  | "finance.reconcile"
  | "finance.reports.view"
  /** Compare platform source totals with the workbook, sign off or explain differences (docs 11 and 12; Administrator, Super Administrator, Finance). */
  | "reconciliation.manage"
  /** Prepare a historical receipt import batch and reject it (Administrator, Super Administrator). */
  | "history-import.manage"
  /** Sign off a historical import batch so its receipts count (Administrator, Super Administrator; doc 07 section 20). */
  | "history-import.signoff"
  | "commission.approve"
  | "commission.payout"
  | "commission.payout.prepare"
  | "commission.rates.manage"
  | "commission.clawback.collect"
  | "commission.clawback.writeOff"
  | "commission.viewOwn"
  | "commission.viewTeam"
  /** Complete, edit and submit customer registrations (Clerk, Administrator, Super Administrator). */
  | "customers.manage"
  /** Start and edit one's OWN customer draft only; never submit it (sellers, doc 04 section 5). */
  | "customers.draft"
  /** Approve, send back or reject a submitted customer registration (Administrator, Super Administrator; doc 04 section 5). */
  | "customers.approve"
  /** Customer import and export (personal data in bulk): Admin and Super Administrator only. */
  | "customers.import"
  /** Staff Customer Search of active VIP cards (Super Administrator, Administrator, Clerk, Finance; UI21). Never public (R11). */
  | "customers.lookup"
  | "contracts.prepare"
  | "payments.submit"
  | "igp.enter"
  | "igp.manage"
  | "membership.activate"
  | "stay-points.enter"
  | "stay-points.approve"
  | "stay-points.refund"
  | "stay-points.waiver"
  /** Create, edit and end Promo Points promos (Administrator, Super Administrator; owner ruling 2026-11-13). */
  | "promos.manage"
  /** Record and void Promo Points use (Clerk, Administrator, Super Administrator). */
  | "promo-points.use"
  /** Record, cancel, complete and mark no-show on points bookings (office staff, Administrator, Super Administrator; doc 10 section 9.2). */
  | "redemption.book"
  /** Maintain the points-per-night table, holiday calendar, venues and cut-offs (Administrator, Super Administrator; doc 10 section 16). */
  | "redemption.configure"
  | "audit.read"
  | "sales.viewOwn"
  | "sales.viewTeam"
  | "customers.viewOwn"
  | "customers.viewDownline"
  | "sales-network.manage"
  | "sales-network.transfer"
  | "sales-network.status";

const BASE_MODULES: readonly AdminModuleId[] = ["dashboard"];

// Business modules (interim grants pending the D-series decisions). Record-level scope and
// operation grants below decide what each role can actually do inside a module.
const BUSINESS_ADMIN_MODULES: readonly AdminModuleId[] = ["customers", "sales", "commissions", "membership", "stay-points", "redemption", "reports", "audit-logs"];
const SELLER_BUSINESS_MODULES: readonly AdminModuleId[] = ["customers", "sales", "commissions", "membership", "stay-points", "reports"];
const OST_BUSINESS_MODULES: readonly AdminModuleId[] = ["customers", "sales", "commissions", "membership", "stay-points", "reports"];

// Approved scoped module baseline. Organization management is split into
// Departments, Roles, and Staff submodules. Unresolved modules remain denied.
// HR manages departments and staff but does not delegate module grants (no
// "roles"), so department-role privilege assignment stays protected.
const ROLE_MODULE_GRANTS: Record<DevRole, readonly AdminModuleId[]> = {
  super_admin: [...BASE_MODULES, "departments", "roles", "staff", "accounts", "vip-products", "experiences", "sales-network", "sales-network-members", "sales-network-genealogy", "accreditation-registrations", "accreditation-records", "accreditation-renewals", ...BUSINESS_ADMIN_MODULES],
  admin: [...BASE_MODULES, "departments", "roles", "staff", "accounts", "vip-products", "experiences", "sales-network", "sales-network-members", "sales-network-genealogy", "accreditation-registrations", "accreditation-records", "accreditation-renewals", ...BUSINESS_ADMIN_MODULES],
  hr: [...BASE_MODULES, "departments", "staff"],
  // Prototype-only General Service Department counter identity: scan and Promo Points use, no broad access.
  gsd: [...BASE_MODULES, "stay-points"],
  // Interim baseline (doc 01 §3.2: module set per role stays open): the Clerk enters customers, contracts and receipts.
  clerk: [...BASE_MODULES, "customers", "sales", "accreditation-registrations", "stay-points"],
  finance: [...BASE_MODULES, "finance", "commissions", "membership", "stay-points", "redemption", "reports"],
  svd: [...BASE_MODULES, "sales-network", "sales-network-members", "sales-network-genealogy", ...SELLER_BUSINESS_MODULES],
  ssm: [...BASE_MODULES, "sales-network", "sales-network-members", "sales-network-genealogy", ...SELLER_BUSINESS_MODULES],
  sm: [...BASE_MODULES, "sales-network", "sales-network-members", "sales-network-genealogy", ...SELLER_BUSINESS_MODULES],
  ost: [...BASE_MODULES, "sales-network", "sales-network-members", "sales-network-genealogy", ...OST_BUSINESS_MODULES],
};

/** Every assignable system role, in display order. The prototype GSD counter role is dev-only. */
export const SYSTEM_ROLES = (Object.keys(ROLE_MODULE_GRANTS) as DevRole[]).filter((role) => role !== "gsd");

/** Module grants of a system role (static mock baseline). */
export function getRoleModuleGrants(role: DevRole): readonly AdminModuleId[] {
  return ROLE_MODULE_GRANTS[role] ?? [];
}

// Modules a department role may grant: every real module (owner decision 2026-11-24,
// replacing the earlier four-module limit and S3-01). Parent navigation scopes and the
// legacy "accreditation" id are never granted. A module only opens its page; sensitive
// actions still need their operation permission from a system role, and protected
// Super Administrator equivalence does not exist here.
export const DELEGABLE_MODULES: readonly AdminModuleId[] = [
  "dashboard",
  "departments",
  "roles",
  "staff",
  "accounts",
  "sales-network",
  "sales-network-members",
  "sales-network-genealogy",
  "accreditation-registrations",
  "accreditation-records",
  "accreditation-renewals",
  "customers",
  "vip-products",
  "experiences",
  "sales",
  "finance",
  "commissions",
  "membership",
  "stay-points",
  "redemption",
  "reports",
  "audit-logs",
] as const;

/**
 * Grants a department role can actually confer: delegable modules only,
 * deduplicated. Non-delegable ids stored on a role (legacy "accounts",
 * "finance", unknown ids) are inert and never become effective access.
 */
export function getDelegableGrants(moduleIds: readonly string[]): AdminModuleId[] {
  const delegable: readonly string[] = DELEGABLE_MODULES;
  return [...new Set(moduleIds.filter((moduleId) => delegable.includes(moduleId)))] as AdminModuleId[];
}

/**
 * A department role confers access only while the employee, the role, and the
 * role's department are all present and active.
 */
export function departmentRoleConfersAccess(chain: {
  staffStatus: string | null | undefined;
  roleStatus: string | null | undefined;
  departmentStatus: string | null | undefined;
}): boolean {
  return chain.staffStatus === "active" && chain.roleStatus === "active" && chain.departmentStatus === "active";
}

/** Display groups for the module checklist, in order. */
export const MODULE_GROUPS = ["Organization", "Sales Network", "Customers and Sales", "Finance", "Member Programs", "Reports and Audit"] as const;
export type ModuleGroup = (typeof MODULE_GROUPS)[number];

export const MODULE_CATALOG: ReadonlyArray<{ id: AdminModuleId; label: string; group: ModuleGroup }> = [
  { id: "dashboard", label: "Dashboard", group: "Organization" },
  { id: "departments", label: "Departments", group: "Organization" },
  { id: "roles", label: "Roles & Permissions", group: "Organization" },
  { id: "staff", label: "Staff & Access", group: "Organization" },
  { id: "accounts", label: "Staff Access", group: "Organization" },
  { id: "sales-network", label: "Sales Network", group: "Sales Network" },
  { id: "sales-network-members", label: "Sales Network Members", group: "Sales Network" },
  { id: "sales-network-genealogy", label: "Sales Network Genealogy", group: "Sales Network" },
  { id: "accreditation-registrations", label: "Accreditation Registrations", group: "Sales Network" },
  { id: "accreditation-records", label: "Accreditation Records", group: "Sales Network" },
  { id: "accreditation-renewals", label: "Accreditation Renewals", group: "Sales Network" },
  { id: "customers", label: "Customers", group: "Customers and Sales" },
  { id: "sales", label: "Sales", group: "Customers and Sales" },
  { id: "vip-products", label: "VIP Products and Contracts", group: "Customers and Sales" },
  { id: "experiences", label: "Experiences", group: "Customers and Sales" },
  { id: "finance", label: "Finance", group: "Finance" },
  { id: "commissions", label: "Commissions", group: "Finance" },
  { id: "membership", label: "Membership", group: "Member Programs" },
  { id: "stay-points", label: "Stay Points", group: "Member Programs" },
  { id: "redemption", label: "Redemption", group: "Member Programs" },
  { id: "reports", label: "Reports", group: "Reports and Audit" },
  { id: "audit-logs", label: "Audit Logs", group: "Reports and Audit" },
];

// Runtime mirror of the AdminModuleId union for validating persisted grants.
export const ALL_MODULE_IDS: ReadonlySet<AdminModuleId> = new Set([
  "dashboard",
  "organization",
  "departments",
  "roles",
  "staff",
  "accounts",
  "sales-network",
  "sales-network-members",
  "sales-network-genealogy",
  "accreditation-registrations",
  "accreditation-records",
  "accreditation-renewals",
  "accreditation",
  "customers",
  "vip-products",
  "experiences",
  "sales",
  "finance",
  "commissions",
  "membership",
  "stay-points",
  "redemption",
  "reports",
  "audit-logs",
]);

const ROLE_OPERATION_GRANTS: Record<DevRole, readonly AdminOperation[]> = {
  // Owner decisions OD-1 (2026-11-09) and full-control rule (2026-11-10):
  // Super Admin is authorized Finance personnel and holds the union of every
  // role's operations; docs 07 section 5.2 and 08 section 11.2 record this.
  super_admin: [
    "organization.departments.manage",
    "organization.staff.manage",
    "organization.roles.manage",
    "settings.lists.manage",
    "promos.manage",
    "promo-points.use",
    "admin.protected",
    "vip-products.manage",
    "vip-products.approve",
    "experiences.manage",
    "contracts.approve",
    "finance.verify",
    "finance.refund",
    "finance.reconcile",
    "finance.reports.view",
    "reconciliation.manage",
    "history-import.manage",
    "history-import.signoff",
    "commission.approve",
    "commission.payout",
    "commission.payout.prepare",
    "commission.rates.manage",
    "commission.clawback.collect",
    "commission.clawback.writeOff",
    "sales-network.manage",
    "sales-network.transfer",
    "sales-network.status",
    "customers.manage",
    "customers.draft",
    "customers.approve",
    "customers.import",
    "customers.lookup",
    "contracts.prepare",
    "payments.submit",
    "igp.enter",
    "igp.manage",
    "membership.activate",
    "stay-points.enter",
    "stay-points.approve",
    "stay-points.refund",
    "stay-points.waiver",
    "redemption.book",
    "redemption.configure",
    "audit.read",
  ],
  admin: [
    "organization.departments.manage",
    "organization.staff.manage",
    "organization.roles.manage",
    "settings.lists.manage",
    "promos.manage",
    "promo-points.use",
    "vip-products.manage",
    "experiences.manage",
    "contracts.approve",
    // Owner ruling R6 (2026-11-12): the Administrator approves receipts alongside Finance and the Super Administrator.
    "finance.verify",
    "commission.approve",
    "commission.payout",
    "commission.payout.prepare",
    "commission.rates.manage",
    "commission.clawback.collect",
    "commission.clawback.writeOff",
    "reconciliation.manage",
    "history-import.manage",
    "history-import.signoff",
    "sales-network.manage",
    "sales-network.transfer",
    "sales-network.status",
    "customers.manage",
    "customers.draft",
    "customers.approve",
    "customers.import",
    "customers.lookup",
    "contracts.prepare",
    "payments.submit",
    "igp.enter",
    "igp.manage",
    "membership.activate",
    "stay-points.enter",
    "stay-points.approve",
    "stay-points.refund",
    "stay-points.waiver",
    "redemption.book",
    "redemption.configure",
    "audit.read",
  ],
  hr: ["organization.departments.manage", "organization.staff.manage"],
  // Prototype counter actions are scoped to a scanned cardholder in the repositories.
  gsd: ["customers.lookup", "stay-points.enter", "promo-points.use", "redemption.book"],
  // Doc 01 §3.7/§3.8: the Clerk enters and completes; never approves (no finance.verify, contracts.approve, membership.activate).
  clerk: ["customers.manage", "customers.draft", "customers.lookup", "contracts.prepare", "payments.submit", "stay-points.enter", "commission.payout.prepare", "igp.enter", "promo-points.use"],
  finance: [
    "customers.lookup",
    "finance.verify",
    "finance.refund",
    "finance.reconcile",
    "finance.reports.view",
    "reconciliation.manage",
    "commission.approve",
    "commission.payout",
    "commission.payout.prepare",
    "commission.clawback.collect",
    // Owner ruling 2026-11-09: Finance activates memberships alongside Admin and Super Administrator.
    "membership.activate",
    "stay-points.enter",
    "stay-points.approve",
    "stay-points.refund",
  ],
  svd: ["sales.viewTeam", "customers.viewDownline", "commission.viewOwn", "commission.viewTeam", "customers.draft", "sales-network.manage", "sales-network.transfer", "sales-network.status"],
  ssm: ["sales.viewTeam", "customers.viewDownline", "commission.viewOwn", "commission.viewTeam", "customers.draft", "sales-network.manage", "sales-network.transfer", "sales-network.status"],
  sm: ["sales.viewTeam", "customers.viewDownline", "commission.viewOwn", "commission.viewTeam", "customers.draft", "sales-network.manage", "sales-network.transfer", "sales-network.status"],
  ost: ["sales.viewOwn", "customers.viewOwn", "customers.draft", "commission.viewOwn"],
};

export function getEffectiveRoles(identity: DevIdentity) {
  return activeRoles(identity);
}

/**
 * Owner rule (2026-11-10): a Super Administrator has full control with no
 * blockers. Whenever super_admin is among the identity's active roles, the
 * identity holds the union of every role's grants, so it can do everything
 * any other role can do (including all Finance work). Separation-of-duties
 * rules enforced inside the repositories (own-submission verification ban,
 * requester-cannot-decide, self-modification and last-Super-Admin
 * protections) are unaffected: they restrict actions, not access.
 */
function grantsSourceRoles(roles: readonly DevRole[]): readonly DevRole[] {
  return roles.includes("super_admin") ? SYSTEM_ROLES : roles;
}

export function getGrantedModuleIds(identity: DevIdentity): Set<AdminModuleId> {
  if (identity.status !== "active") return new Set();

  const granted = new Set<AdminModuleId>();
  for (const role of grantsSourceRoles(getEffectiveRoles(identity))) {
    for (const moduleId of ROLE_MODULE_GRANTS[role] ?? []) {
      granted.add(moduleId);
    }
  }
  return granted;
}

export function isModuleGranted(identity: DevIdentity, moduleId: AdminModuleId) {
  return getGrantedModuleIds(identity).has(moduleId);
}

export function getGrantedOperations(identity: DevIdentity): Set<AdminOperation> {
  if (identity.status !== "active") return new Set();

  const granted = new Set<AdminOperation>();
  for (const role of grantsSourceRoles(getEffectiveRoles(identity))) {
    for (const operation of ROLE_OPERATION_GRANTS[role] ?? []) {
      granted.add(operation);
    }
  }
  return granted;
}

export function hasOperationPermission(identity: DevIdentity, operation: AdminOperation) {
  return getGrantedOperations(identity).has(operation);
}

/**
 * Read-only display of what a linked account can reach: system-role grants plus
 * the delegable grants of the employee's department role. It mirrors the
 * session rule in resolveEffectiveModules (data/mock/authorization.ts) for a
 * record other than the actor's own, and never authorizes anything. No linked
 * account, or one that is not Active, means no access. The department role
 * counts only when `departmentRoleModuleIds` is given, which the caller does
 * only when the employee, role, and department are all active.
 */
export function resolveEmployeeEffectiveModules(input: {
  accountStatus: AccountStatus | null;
  systemRoles: readonly DevRole[];
  departmentRoleModuleIds: readonly string[] | null;
}): AdminModuleId[] {
  if (input.accountStatus !== "active") return [];
  const granted = new Set<AdminModuleId>();
  const source: readonly DevRole[] = input.systemRoles.includes("super_admin") ? SYSTEM_ROLES : input.systemRoles;
  for (const role of source) {
    for (const moduleId of ROLE_MODULE_GRANTS[role] ?? []) granted.add(moduleId);
  }
  for (const moduleId of getDelegableGrants(input.departmentRoleModuleIds ?? [])) granted.add(moduleId);
  return [...granted];
}
