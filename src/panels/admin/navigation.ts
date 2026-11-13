import type { ComponentType } from "react";
import type { AdminModuleId, AdminOperation } from "@/modules/identity/permissions";
import { getGrantedModuleIds, getGrantedOperations } from "@/modules/identity/permissions";

/** Module ids plus one unique key per navigation page that shares a module grant. */
export type AdminNavKey =
  | AdminModuleId
  | "customer-import"
  | "sales-contracts"
  | "contract-review"
  | "sales-performance"
  | "customer-growth"
  | "reports-group"
  | "vip-products-group"
  | "payment-schemes"
  | "scheme-guide"
  | "tier-codes"
  | "collections"
  | "payment-history"
  | "financial-holds"
  | "cancellation-requests"
  | "collections-report"
  | "commission-assignment"
  | "commission-payouts"
  | "commission-report"
  | "membership-activation"
  | "membership-report"
  | "stay-points-report"
  | "redemption-group"
  | "redemption-table"
  | "reconciliation"
  | "historical-import";

export type AdminNavItem = {
  id: AdminNavKey;
  label: string;
  href: string;
  available: boolean;
  icon?: ComponentType<{ className?: string }>;
  children?: AdminNavItem[];
  /** Any-of module grants; defaults to [id]. */
  grants?: AdminModuleId[];
  /** Additional operation grant required to see the item. */
  operation?: AdminOperation;
  /**
   * Presentation-only: hidden from the sidebar and mobile Drawer, while the
   * route, permission grants, and breadcrumbs stay intact.
   */
  hideFromNav?: boolean;
};

export const adminNavigation: AdminNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/admin", available: true },
  // Sidebar order follows the business process from top to bottom: Sales first,
  // then Finance (verify, collect, commissions), then membership activation and
  // points. Setup and administration follow: products, sales network,
  // organization. Reports sit directly above the audit log, which is last.
  // Children follow the same order inside each group. Groups are parent scopes
  // like Organization: shown when a child is visible, never granted themselves
  // (deny by default). One page per process; pages sharing a module grant have
  // their own key and href.
  {
    id: "sales-group",
    label: "Sales",
    href: "/admin/sales-group",
    available: true,
    children: [
      { id: "customers", label: "Customers", href: "/admin/customers", available: true },
      // Entered from the Customers page; kept out of the sidebar and Drawer
      // while the route, permission grant, and breadcrumbs stay intact.
      { id: "customer-import", label: "Customer Import", href: "/admin/customers/import-export", available: true, grants: ["customers"], operation: "customers.import", hideFromNav: true },
      { id: "sales-contracts", label: "Contracts", href: "/admin/sales/contracts", available: true, grants: ["sales", "vip-products"] },
      { id: "contract-review", label: "Contract Review", href: "/admin/sales/contract-review", available: true, grants: ["vip-products"] },
      { id: "sales", label: "Sales Records", href: "/admin/sales", available: true },
    ],
  },
  {
    id: "finance-group",
    label: "Finance",
    href: "/admin/finance-group",
    available: true,
    children: [
      { id: "finance", label: "Payment Verification", href: "/admin/finance", available: true },
      { id: "collections", label: "Collections", href: "/admin/finance/collections", available: true, grants: ["finance"] },
      { id: "commission-assignment", label: "Commission Assignment", href: "/admin/commissions/assignment", available: true, grants: ["commissions"] },
      { id: "commissions", label: "Commissions", href: "/admin/commissions", available: true },
      { id: "commission-payouts", label: "Commission Payouts", href: "/admin/commissions/payouts", available: true, grants: ["commissions"], operation: "commission.payout" },
      { id: "payment-history", label: "Payment History", href: "/admin/finance/payments", available: true, grants: ["finance"] },
      { id: "financial-holds", label: "Financial Holds", href: "/admin/finance/holds", available: true, grants: ["finance"] },
      { id: "cancellation-requests", label: "Cancellation Requests", href: "/admin/finance/cancellations", available: true, grants: ["finance"] },
    ],
  },
  {
    id: "membership-group",
    label: "Membership",
    href: "/admin/membership-group",
    available: true,
    children: [
      { id: "membership-activation", label: "Activation Queue", href: "/admin/membership/activation", available: true, grants: ["membership"], operation: "membership.activate" },
      { id: "membership", label: "VIP Memberships", href: "/admin/membership", available: true },
      { id: "stay-points", label: "Stay Points", href: "/admin/stay-points", available: true },
    ],
  },
  {
    id: "redemption-group",
    label: "Redemption",
    href: "/admin/redemption-group",
    available: true,
    children: [
      { id: "redemption", label: "Bookings", href: "/admin/redemption", available: true },
      { id: "redemption-table", label: "Points Table", href: "/admin/redemption/points-table", available: true, grants: ["redemption"], operation: "redemption.configure" },
    ],
  },
  {
    id: "vip-products-group",
    label: "VIP Products",
    href: "/admin/vip-products-group",
    available: true,
    children: [
      { id: "vip-products", label: "Product Catalog", href: "/admin/vip-products", available: true },
      { id: "payment-schemes", label: "Payment Schemes", href: "/admin/vip-products/schemes", available: true, grants: ["vip-products"] },
      { id: "scheme-guide", label: "Scheme Guide", href: "/admin/vip-products/scheme-guide", available: true, grants: ["vip-products", "sales"] },
      { id: "tier-codes", label: "Tier Codes", href: "/admin/vip-products/tier-codes", available: true, grants: ["vip-products"] },
    ],
  },
  { id: "sales-network", label: "Sales Network", href: "/admin/sales-network", available: true, children: [
    { id: "sales-network-members", label: "Members", href: "/admin/sales-network/members", available: true },
    { id: "sales-network-genealogy", label: "Genealogy", href: "/admin/sales-network/genealogy", available: true },
    { id: "accreditation-registrations", label: "OST Applications", href: "/admin/sales-network/registrations", available: true },
  ] },
  // Organization is a parent scope: visible when at least one child module
  // is granted. "organization" itself is never granted (deny by default).
  {
    id: "organization",
    label: "Organization",
    href: "/admin/organization",
    available: true,
    children: [
      { id: "departments", label: "Departments", href: "/admin/organization/departments", available: true },
      { id: "roles", label: "Roles", href: "/admin/organization/roles", available: true },
      // Staff & Access also hosts account administration; its account
      // columns and actions are gated by the non-delegable "accounts" grant.
      { id: "staff", label: "Staff", href: "/admin/organization/staff", available: true },
    ],
  },
  // Compatibility entry point only: /admin/accounts forwards authorized users to
  // the Account-only view of Staff & Access. Never listed in the sidebar or Drawer.
  { id: "accounts", label: "Accounts and Permissions", href: "/admin/accounts", available: true, hideFromNav: true },
  {
    id: "reports-group",
    label: "Reports",
    href: "/admin/reports-group",
    available: true,
    children: [
      { id: "customer-growth", label: "Customer Growth", href: "/admin/reports/customer-growth", available: true, grants: ["reports"] },
      { id: "sales-performance", label: "Sales Performance", href: "/admin/reports/sales-performance", available: true, grants: ["reports"] },
      { id: "collections-report", label: "Collections Report", href: "/admin/reports/collections", available: true, grants: ["reports"], operation: "finance.reports.view" },
      { id: "commission-report", label: "Commission Report", href: "/admin/reports/commissions", available: true, grants: ["reports"] },
      { id: "membership-report", label: "Membership Report", href: "/admin/reports/membership", available: true, grants: ["reports"] },
      { id: "stay-points-report", label: "Stay Points Report", href: "/admin/reports/stay-points", available: true, grants: ["reports"] },
      { id: "reconciliation", label: "Reconciliation", href: "/admin/reports/reconciliation", available: true, grants: ["reports"], operation: "reconciliation.manage" },
      { id: "historical-import", label: "Historical Import", href: "/admin/reports/historical-import", available: true, grants: ["reports"], operation: "history-import.manage" },
    ],
  },
  { id: "audit-logs", label: "Audit Logs", href: "/admin/audit-logs", available: true },
];

export function normalizePath(path: string | null) {
  if (!path) return "/";
  const trimmed = path.trim();
  if (trimmed === "/" || trimmed === "") return "/";
  return trimmed.replace(/\/+$/, "");
}

export function getAvailableAdminNavigation(items: AdminNavItem[] = adminNavigation): AdminNavItem[] {
  return items
    .filter((item) => item.available && !item.hideFromNav)
    .map((item) => ({
      ...item,
      children: item.children ? getAvailableAdminNavigation(item.children) : undefined,
    }))
    .filter((item) => item.available || (item.children?.length ?? 0) > 0);
}

export function isAdminNavItemActive(item: AdminNavItem, pathname: string | null) {
  const current = normalizePath(pathname);
  const href = normalizePath(item.href);

  if (current === href) return true;

  if (item.children?.some((child) => isAdminNavItemActive(child, current))) {
    return true;
  }

  if (href === "/") return false;
  return current.startsWith(`${href}/`);
}

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function getAdminBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const current = normalizePath(pathname);
  const items: BreadcrumbItem[] = [{ label: "Dashboard", href: "/admin" }];

  if (current === "/admin") {
    items[0] = { label: "Dashboard" };
    return items;
  }

  const trail = findNavTrail(adminNavigation, current);
  if (trail.length > 0) {
    // Ancestor entries (e.g. the Organization group) render as plain text;
    // only Dashboard and the final destination link where a route exists.
    for (const ancestor of trail.slice(0, -1)) {
      if (normalizePath(ancestor.href) === "/admin") continue;
      items.push({ label: ancestor.label });
    }
    const leaf = trail[trail.length - 1];
    if (normalizePath(leaf.href) !== "/admin") {
      items.push({ label: leaf.label });
    }
    return items;
  }

  items.push({ label: "Page not found" });
  return items;
}

export function getRoleAwareAdminNavigation(
  identity: import("@/modules/identity/types").DevIdentity,
  extraModuleIds: Iterable<AdminModuleId> = [],
) {
  const granted = new Set<AdminModuleId>([...getGrantedModuleIds(identity), ...extraModuleIds]);
  return filterNavForAccess(getAvailableAdminNavigation(), granted, getGrantedOperations(identity));
}

export function getRoleAwareAdminBreadcrumbs(identity: import("@/modules/identity/types").DevIdentity, pathname: string) {
  const granted = getGrantedModuleIds(identity);
  return getAdminBreadcrumbs(pathname).filter((item) => {
    if (item.href === "/admin") return granted.has("dashboard");
    return true;
  });
}

/**
 * Single access filter for the sidebar and Drawer. An item is shown when any of
 * its module grants (default: its own id) is held and, if it names an operation,
 * that operation is held too. Parents with no grant of their own stay visible
 * while at least one child is.
 */
export function filterNavForAccess(
  items: AdminNavItem[],
  grantedModules: ReadonlySet<AdminModuleId>,
  grantedOperations: ReadonlySet<AdminOperation>,
): AdminNavItem[] {
  const result: AdminNavItem[] = [];
  for (const item of items) {
    const children = item.children ? filterNavForAccess(item.children, grantedModules, grantedOperations) : undefined;
    const grants = item.grants ?? [item.id as AdminModuleId];
    const allowed = grants.some((moduleId) => grantedModules.has(moduleId)) && (!item.operation || grantedOperations.has(item.operation));
    if (allowed || (children && children.length > 0)) {
      result.push({ ...item, children });
    }
  }
  return result;
}

function findNavTrail(items: AdminNavItem[], pathname: string, trail: AdminNavItem[] = []): AdminNavItem[] {
  for (const item of items) {
    if (normalizePath(item.href) === pathname) return [...trail, item];
    if (item.children) {
      const childTrail = findNavTrail(item.children, pathname, [...trail, item]);
      if (childTrail.length > 0) return childTrail;
    }
  }
  return [];
}
