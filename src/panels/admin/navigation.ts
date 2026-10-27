import type { ComponentType } from "react";
import type { AdminModuleId } from "@/modules/identity/permissions";
import { getGrantedModuleIds } from "@/modules/identity/permissions";

export type AdminNavItem = {
  id: AdminModuleId;
  label: string;
  href: string;
  available: boolean;
  icon?: ComponentType<{ className?: string }>;
  children?: AdminNavItem[];
  /**
   * Presentation-only: hidden from the sidebar and mobile Drawer, while the
   * route, permission grants, and breadcrumbs stay intact (e.g. Accounts).
   */
  hideFromNav?: boolean;
};

export const adminNavigation: AdminNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/admin", available: true },
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
      { id: "staff", label: "Staff", href: "/admin/organization/staff", available: true },
    ],
  },
  // Accounts stays implemented and permission-guarded at /admin/accounts,
  // but the owner-approved primary navigation no longer lists it.
  { id: "accounts", label: "Accounts and Permissions", href: "/admin/accounts", available: true, hideFromNav: true },
  { id: "sales-network", label: "Sales Network", href: "/admin/sales-network", available: false },
  { id: "accreditation", label: "Accreditation", href: "/admin/accreditation", available: false },
  { id: "customers", label: "Customers", href: "/admin/customers", available: false },
  { id: "vip-products", label: "VIP Products and Contracts", href: "/admin/vip-products", available: false },
  { id: "sales", label: "Sales", href: "/admin/sales", available: false },
  { id: "finance", label: "Finance", href: "/admin/finance", available: false },
  { id: "commissions", label: "Commissions", href: "/admin/commissions", available: false },
  { id: "membership", label: "Membership", href: "/admin/membership", available: false },
  { id: "stay-points", label: "Stay Points", href: "/admin/stay-points", available: false },
  { id: "reports", label: "Reports", href: "/admin/reports", available: false },
  { id: "audit-logs", label: "Audit Logs", href: "/admin/audit-logs", available: false },
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
  return filterNavByGrants(getAvailableAdminNavigation(), granted);
}

export function getRoleAwareAdminBreadcrumbs(identity: import("@/modules/identity/types").DevIdentity, pathname: string) {
  const granted = getGrantedModuleIds(identity);
  return getAdminBreadcrumbs(pathname).filter((item) => {
    if (item.href === "/admin") return granted.has("dashboard");
    return true;
  });
}

function filterNavByGrants(items: AdminNavItem[], granted: Set<AdminModuleId>): AdminNavItem[] {
  const result: AdminNavItem[] = [];
  for (const item of items) {
    const children = item.children ? filterNavByGrants(item.children, granted) : undefined;
    if (granted.has(item.id) || (children && children.length > 0)) {
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
