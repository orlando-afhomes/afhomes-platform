import type { AccountStatus } from "@/modules/accounts/types";
import type { DevIdentity, DevRole } from "@/modules/identity/types";
import { activeRoles } from "@/data/mock/dev-identities";

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
  | "reports"
  | "audit-logs";

// Approved operation-level permissions. Presentation/contract boundaries only;
// backend authorization remains authoritative.
export type AdminOperation =
  | "organization.departments.manage"
  | "organization.staff.manage"
  | "organization.roles.manage"
  | "admin.protected"
  | "vip-products.manage"
  | "contracts.approve"
  | "finance.verify"
  | "finance.refund"
  | "finance.reconcile"
  | "finance.reports.view"
  | "commission.approve"
  | "commission.payout"
  | "commission.viewOwn"
  | "commission.viewTeam"
  | "customers.manage"
  /** Customer import and export (personal data in bulk): Admin and Super Administrator only. */
  | "customers.import"
  | "contracts.prepare"
  | "payments.submit"
  | "membership.activate"
  | "stay-points.reconcile"
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
const BUSINESS_ADMIN_MODULES: readonly AdminModuleId[] = ["customers", "sales", "commissions", "membership", "stay-points", "reports", "audit-logs"];
const SELLER_BUSINESS_MODULES: readonly AdminModuleId[] = ["customers", "sales", "commissions", "membership", "stay-points", "reports"];
const OST_BUSINESS_MODULES: readonly AdminModuleId[] = ["customers", "sales", "commissions", "membership", "stay-points", "reports"];

// Approved scoped module baseline. Organization management is split into
// Departments, Roles, and Staff submodules. Unresolved modules remain denied.
// HR manages departments and staff but does not delegate module grants (no
// "roles"), so department-role privilege assignment stays protected.
const ROLE_MODULE_GRANTS: Record<DevRole, readonly AdminModuleId[]> = {
  super_admin: [...BASE_MODULES, "departments", "roles", "staff", "accounts", "vip-products", "sales-network", "sales-network-members", "sales-network-genealogy", "accreditation-registrations", "accreditation-records", "accreditation-renewals", ...BUSINESS_ADMIN_MODULES],
  admin: [...BASE_MODULES, "departments", "roles", "staff", "accounts", "vip-products", "sales-network", "sales-network-members", "sales-network-genealogy", "accreditation-registrations", "accreditation-records", "accreditation-renewals", ...BUSINESS_ADMIN_MODULES],
  hr: [...BASE_MODULES, "departments", "staff"],
  finance: [...BASE_MODULES, "finance", "commissions", "membership", "stay-points", "reports"],
  svd: [...BASE_MODULES, "sales-network", "sales-network-members", "sales-network-genealogy", ...SELLER_BUSINESS_MODULES],
  ssm: [...BASE_MODULES, "sales-network", "sales-network-members", "sales-network-genealogy", ...SELLER_BUSINESS_MODULES],
  sm: [...BASE_MODULES, "sales-network", "sales-network-members", "sales-network-genealogy", ...SELLER_BUSINESS_MODULES],
  ost: [...BASE_MODULES, "sales-network", "sales-network-members", "sales-network-genealogy", ...OST_BUSINESS_MODULES],
};

/** Every system role, in display order. */
export const SYSTEM_ROLES = Object.keys(ROLE_MODULE_GRANTS) as DevRole[];

/** Module grants of a system role (static mock baseline). */
export function getRoleModuleGrants(role: DevRole): readonly AdminModuleId[] {
  return ROLE_MODULE_GRANTS[role] ?? [];
}

// Modules a department role may grant. Only implemented, separately
// authorized pages are delegable: no disabled modules, no Finance-controlled
// operations, and no protected Super Administrator equivalence exist here.
// Accounts management is restricted to Admin/Super Admin (owner decision S3-01)
// and is therefore not delegable.
export const DELEGABLE_MODULES: readonly AdminModuleId[] = [
  "dashboard",
  "departments",
  "roles",
  "staff",
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

export const MODULE_CATALOG: ReadonlyArray<{ id: AdminModuleId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "accounts", label: "Accounts and Permissions" },
  { id: "departments", label: "Departments" },
  { id: "roles", label: "Roles & Permissions" },
  { id: "staff", label: "Staff & Access" },
  { id: "vip-products", label: "VIP Products and Contracts" },
  { id: "sales-network", label: "Sales Network" },
  { id: "sales-network-members", label: "Sales Network Members" },
  { id: "sales-network-genealogy", label: "Sales Network Genealogy" },
  { id: "accreditation-registrations", label: "Accreditation Registrations" },
  { id: "accreditation-records", label: "Accreditation Records" },
  { id: "accreditation-renewals", label: "Accreditation Renewals" },
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
  "sales",
  "finance",
  "commissions",
  "membership",
  "stay-points",
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
    "admin.protected",
    "vip-products.manage",
    "contracts.approve",
    "finance.verify",
    "finance.refund",
    "finance.reconcile",
    "finance.reports.view",
    "commission.approve",
    "commission.payout",
    "sales-network.manage",
    "sales-network.transfer",
    "sales-network.status",
    "customers.manage",
    "customers.import",
    "contracts.prepare",
    "payments.submit",
    "membership.activate",
    "stay-points.reconcile",
    "audit.read",
  ],
  admin: [
    "organization.departments.manage",
    "organization.staff.manage",
    "organization.roles.manage",
    "vip-products.manage",
    "contracts.approve",
    "sales-network.manage",
    "sales-network.transfer",
    "sales-network.status",
    "customers.manage",
    "customers.import",
    "contracts.prepare",
    "payments.submit",
    "membership.activate",
    "audit.read",
  ],
  hr: ["organization.departments.manage", "organization.staff.manage"],
  finance: [
    "finance.verify",
    "finance.refund",
    "finance.reconcile",
    "finance.reports.view",
    "commission.approve",
    "commission.payout",
    // Owner ruling 2026-11-09: Finance activates memberships alongside Admin and Super Administrator.
    "membership.activate",
    "stay-points.reconcile",
  ],
  svd: ["sales.viewTeam", "customers.viewDownline", "commission.viewOwn", "commission.viewTeam", "customers.manage", "contracts.prepare", "payments.submit", "sales-network.manage", "sales-network.transfer", "sales-network.status"],
  ssm: ["sales.viewTeam", "customers.viewDownline", "commission.viewOwn", "commission.viewTeam", "customers.manage", "contracts.prepare", "payments.submit", "sales-network.manage", "sales-network.transfer", "sales-network.status"],
  sm: ["sales.viewTeam", "customers.viewDownline", "commission.viewOwn", "commission.viewTeam", "customers.manage", "contracts.prepare", "payments.submit", "sales-network.manage", "sales-network.transfer", "sales-network.status"],
  ost: ["sales.viewOwn", "customers.viewOwn", "commission.viewOwn", "payments.submit"],
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
