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
  | "customers.viewDownline"
  | "sales-network.manage"
  | "sales-network.transfer"
  | "sales-network.status";

const BASE_MODULES: readonly AdminModuleId[] = ["dashboard"];

// Approved scoped module baseline. Organization management is split into
// Departments, Roles, and Staff submodules. Unresolved modules remain denied.
// HR manages departments and staff but does not delegate module grants (no
// "roles"), so department-role privilege assignment stays protected.
const ROLE_MODULE_GRANTS: Record<DevRole, readonly AdminModuleId[]> = {
  super_admin: [...BASE_MODULES, "departments", "roles", "staff", "accounts", "vip-products", "sales-network", "sales-network-members", "sales-network-genealogy", "accreditation-registrations", "accreditation-records", "accreditation-renewals"],
  admin: [...BASE_MODULES, "departments", "roles", "staff", "accounts", "vip-products", "sales-network", "sales-network-members", "sales-network-genealogy", "accreditation-registrations", "accreditation-records", "accreditation-renewals"],
  hr: [...BASE_MODULES, "departments", "staff"],
  finance: [...BASE_MODULES, "finance"],
  svd: [...BASE_MODULES, "sales-network", "sales-network-members", "sales-network-genealogy"],
  ssm: [...BASE_MODULES, "sales-network", "sales-network-members", "sales-network-genealogy"],
  sm: [...BASE_MODULES, "sales-network", "sales-network-members", "sales-network-genealogy"],
  ost: [...BASE_MODULES, "sales-network", "sales-network-members", "sales-network-genealogy"],
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
  svd: ["sales.viewTeam", "customers.viewDownline", "sales-network.manage", "sales-network.transfer", "sales-network.status"],
  ssm: ["sales.viewTeam", "customers.viewDownline", "sales-network.manage", "sales-network.transfer", "sales-network.status"],
  sm: ["sales.viewTeam", "customers.viewDownline", "sales-network.manage", "sales-network.transfer", "sales-network.status"],
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
