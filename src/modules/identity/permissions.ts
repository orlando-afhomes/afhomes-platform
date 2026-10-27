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
  | "accreditation"
  | "customers"
  | "vip-products"
  | "sales"
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
  | "sales.viewOwn"
  | "sales.viewTeam"
  | "customers.viewOwn"
  | "customers.viewDownline";

const BASE_MODULES: readonly AdminModuleId[] = ["dashboard"];

// Approved scoped module baseline. Organization management is split into
// Departments, Roles, and Staff submodules. Unresolved modules remain denied.
// HR manages departments and staff but does not delegate module grants (no
// "roles"), so department-role privilege assignment stays protected.
const ROLE_MODULE_GRANTS: Record<DevRole, readonly AdminModuleId[]> = {
  super_admin: [...BASE_MODULES, "departments", "roles", "staff", "accounts", "vip-products"],
  admin: [...BASE_MODULES, "departments", "roles", "staff", "accounts", "vip-products"],
  hr: [...BASE_MODULES, "departments", "staff"],
  finance: [...BASE_MODULES, "finance"],
  svd: [...BASE_MODULES, "sales-network"],
  ssm: [...BASE_MODULES, "sales-network"],
  sm: [...BASE_MODULES, "sales-network"],
  ost: [...BASE_MODULES, "sales-network"],
};

// Modules a department role may grant. Only implemented, separately
// authorized pages are delegable: no disabled modules, no Finance-controlled
// operations, and no protected Super Administrator equivalence exist here.
export const DELEGABLE_MODULES: readonly AdminModuleId[] = [
  "dashboard",
  "accounts",
  "departments",
  "roles",
  "staff",
] as const;

export const MODULE_CATALOG: ReadonlyArray<{ id: AdminModuleId; label: string }> = [
  { id: "dashboard", label: "Dashboard" },
  { id: "accounts", label: "Accounts and Permissions" },
  { id: "departments", label: "Departments" },
  { id: "roles", label: "Roles" },
  { id: "staff", label: "Staff" },
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
  ],
  admin: [
    "organization.departments.manage",
    "organization.staff.manage",
    "organization.roles.manage",
    "vip-products.manage",
    "contracts.approve",
  ],
  hr: ["organization.departments.manage", "organization.staff.manage"],
  finance: [
    "finance.verify",
    "finance.refund",
    "finance.reconcile",
    "finance.reports.view",
    "commission.approve",
    "commission.payout",
  ],
  svd: ["sales.viewTeam", "customers.viewDownline"],
  ssm: ["sales.viewTeam", "customers.viewDownline"],
  sm: ["sales.viewTeam", "customers.viewDownline"],
  ost: ["sales.viewOwn", "customers.viewOwn", "commission.viewOwn"],
};

export function getEffectiveRoles(identity: DevIdentity) {
  return activeRoles(identity);
}

export function getGrantedModuleIds(identity: DevIdentity): Set<AdminModuleId> {
  if (identity.status !== "active") return new Set();

  const granted = new Set<AdminModuleId>();
  for (const role of getEffectiveRoles(identity)) {
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
  for (const role of getEffectiveRoles(identity)) {
    for (const operation of ROLE_OPERATION_GRANTS[role] ?? []) {
      granted.add(operation);
    }
  }
  return granted;
}

export function hasOperationPermission(identity: DevIdentity, operation: AdminOperation) {
  return getGrantedOperations(identity).has(operation);
}
