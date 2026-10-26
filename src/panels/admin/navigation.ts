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
};

export const adminNavigation: AdminNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/admin", available: true },
  // Reserved for future authorized modules; intentionally unavailable until implemented.
  { id: "organization", label: "Organization", href: "/admin/organization", available: true },
  { id: "accounts", label: "Accounts and Permissions", href: "/admin/accounts", available: true },
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
    .filter((item) => item.available)
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

  const match = findNavItem(adminNavigation, current);
  if (match) {
    if (match.href !== "/admin") {
      items.push({ label: match.label });
    }
    return items;
  }

  items.push({ label: "Page not found" });
  return items;
}

export function getRoleAwareAdminNavigation(identity: import("@/modules/identity/types").DevIdentity) {
  const granted = getGrantedModuleIds(identity);
  return getAvailableAdminNavigation().filter((item) => granted.has(item.id));
}

export function getRoleAwareAdminBreadcrumbs(identity: import("@/modules/identity/types").DevIdentity, pathname: string) {
  const granted = getGrantedModuleIds(identity);
  return getAdminBreadcrumbs(pathname).filter((item) => {
    if (item.href === "/admin") return granted.has("dashboard");
    return true;
  });
}

function findNavItem(items: AdminNavItem[], pathname: string): AdminNavItem | null {
  for (const item of items) {
    if (normalizePath(item.href) === pathname) return item;
    if (item.children) {
      const child = findNavItem(item.children, pathname);
      if (child) return child;
    }
  }
  return null;
}
