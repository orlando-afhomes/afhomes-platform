import type { ComponentType } from "react";
import type { AdminModuleId, AdminOperation } from "@/modules/identity/permissions";
import { getGrantedModuleIds, getGrantedOperations } from "@/modules/identity/permissions";

/** Sidebar keys: one per area page, plus the hidden /admin/accounts compatibility entry. */
export type AdminNavKey =
  | "dashboard"
  | "customers"
  | "customer-lookup"
  | "sales"
  | "finance"
  | "commissions"
  | "membership"
  | "stay-points"
  | "redemption"
  | "vip-products"
  | "experiences"
  | "sales-network"
  | "organization"
  | "reports"
  | "audit-logs"
  | "accounts";

/** One access rule: any of `grants` must be held and, when set, `operation` too. */
export type NavAccessRule = {
  grants: readonly AdminModuleId[];
  operation?: AdminOperation;
};

export type AdminNavItem = {
  id: AdminNavKey;
  label: string;
  href: string;
  available: boolean;
  icon?: ComponentType<{ className?: string }>;
  children?: AdminNavItem[];
  /** Any-of module grants; defaults to [id]. Ignored for access when `access` is set. */
  grants?: AdminModuleId[];
  /** Additional operation grant required to see the item (with `grants`). */
  operation?: AdminOperation;
  /** Area items: shown while ANY rule passes (one rule per tab). */
  access?: readonly NavAccessRule[];
  /** Former routes outside `href` that still belong to this item (sidebar highlight). */
  matchPaths?: readonly string[];
  /**
   * Presentation-only: hidden from the sidebar and mobile Drawer, while the
   * route, permission grants, and breadcrumbs stay intact.
   */
  hideFromNav?: boolean;
};

/** A tab of an area page and the access rule of the former page it replaces. */
export type AdminAreaTabRule = {
  /** The `?tab=` value. */
  value: string;
  label: string;
  /** The former route (now a redirect to `area?tab=value`, or the area itself). */
  formerHref: string;
  rule: NavAccessRule;
};

/**
 * Tab access per area (owner ruling 2026-11-15: one page per area, with tabs).
 * Each rule is copied unchanged from the sidebar item the tab replaces, so hub
 * pages must gate every tab with its rule (use `useAdminAreaTabAccess` from
 * `use-role-aware-navigation.ts`) to keep today's visibility. The page body may
 * still apply its own `allowed` checks (for example the Commissions tab shows
 * its payout bar only to payout staff); keep those inside the tab panel.
 *
 * Former sidebar rules (grants default to the item id):
 * - Customers: customers [customers]; Customer Import [customers] + customers.import (was hidden).
 * - Sales: Sales Records [sales]; Contracts (including review) [sales, vip-products];
 *   IGP Sales [sales, finance]; Scheme Guide [vip-products, sales] (moved from VIP Products).
 * - Finance: Payment Verification [finance, sales] + finance.verify; Collections (Financial Holds is
 *   now its "On financial hold" filter), Payment History, Cancellation Requests [finance]; Period Close
 *   [reports] + finance.verify; Reconciliation [reports] + reconciliation.manage.
 * - Commissions: Commissions [commissions] (also hosts the clawback ledger, now Recovery, and
 *   the month-end payout bar; the former Payouts tab and its route
 *   /admin/commissions/payouts now open this tab); Commission Rates
 *   [commissions] + commission.rates.manage; Allowance Review [commissions] + commission.approve.
 * - Membership: VIP Memberships [membership]; Activation Queue [membership] + membership.activate.
 * - Stay Points: Stay Points, Promos, Promo Points [stay-points].
 * - Redemption: Bookings [redemption] (also cardholder points).
 * - Settings (key "vip-products"): Product Catalog, Payment Schemes, Tier Codes [vip-products]; Points
 *   Table, Holidays and Venues [redemption] + redemption.configure (hidden from Finance and other
 *   read-only holders); Lists [departments] + settings.lists.manage; Historical Import [reports] +
 *   history-import.manage; IGP Projects [sales, finance] + igp.manage.
 * - Sales Network: the group itself [sales-network]; Members [sales-network-members]; Genealogy
 *   [sales-network-genealogy]; OST Applications [accreditation-registrations]. Every role holding
 *   "sales-network" also holds the Members grant, so the union is unchanged.
 * - Organization: Departments [departments]; Roles [roles]; Staff [staff].
 * - Reports: every report [reports]; Collections Report also + finance.reports.view. Period
 *   Close and Reconciliation moved to Finance with their rules.
 */
export const ADMIN_AREA_TABS = {
  customers: [
    { value: "customers", label: "Customers", formerHref: "/admin/customers", rule: { grants: ["customers"] } },
    { value: "import", label: "Import", formerHref: "/admin/customers/import-export", rule: { grants: ["customers"], operation: "customers.import" } },
    { value: "export", label: "Export", formerHref: "/admin/customers/import-export", rule: { grants: ["customers"], operation: "customers.import" } },
  ],
  sales: [
    { value: "sales", label: "Sales", formerHref: "/admin/sales", rule: { grants: ["sales"] } },
    { value: "contracts", label: "Contracts", formerHref: "/admin/sales/contracts", rule: { grants: ["sales", "vip-products"] } },
    { value: "igp", label: "Property Sales (IGP)", formerHref: "/admin/sales/igp", rule: { grants: ["sales", "finance"] } },
    // Moved from VIP Products so sellers and the Clerk reach it without the Settings area.
    { value: "scheme-guide", label: "Payment Plan Guide", formerHref: "/admin/sales", rule: { grants: ["vip-products", "sales"] } },
  ],
  finance: [
    { value: "verification", label: "Receipts", formerHref: "/admin/finance", rule: { grants: ["finance", "sales"], operation: "finance.verify" } },
    { value: "collections", label: "Collections", formerHref: "/admin/finance/collections", rule: { grants: ["finance"] } },
    { value: "cancellations", label: "Cancellations", formerHref: "/admin/finance/cancellations", rule: { grants: ["finance"] } },
    { value: "month-end-close", label: "Close the Month", formerHref: "/admin/reports/period-close", rule: { grants: ["reports"], operation: "finance.verify" } },
    { value: "reconciliation", label: "Compare with Spreadsheet", formerHref: "/admin/reports/reconciliation", rule: { grants: ["reports"], operation: "reconciliation.manage" } },
  ],
  commissions: [
    { value: "commissions", label: "Commissions", formerHref: "/admin/commissions", rule: { grants: ["commissions"] } },
    { value: "recovery", label: "Commission Paybacks", formerHref: "/admin/commissions", rule: { grants: ["commissions"] } },
    { value: "rates", label: "Rates", formerHref: "/admin/commissions/assignment", rule: { grants: ["commissions"], operation: "commission.rates.manage" } },
    { value: "allowances", label: "Leader Allowances", formerHref: "/admin/commissions/allowances", rule: { grants: ["commissions"], operation: "commission.approve" } },
  ],
  membership: [
    { value: "memberships", label: "Memberships", formerHref: "/admin/membership", rule: { grants: ["membership"] } },
    { value: "activation", label: "Ready to Activate", formerHref: "/admin/membership/activation", rule: { grants: ["membership"], operation: "membership.activate" } },
  ],
  "stay-points": [
    { value: "welcome-gift", label: "Welcome Gift", formerHref: "/admin/stay-points", rule: { grants: ["stay-points"] } },
    { value: "resort-bills", label: "Resort Bills", formerHref: "/admin/stay-points", rule: { grants: ["stay-points"] } },
    { value: "waivers", label: "Gift Exceptions", formerHref: "/admin/stay-points", rule: { grants: ["stay-points"] } },
    { value: "promos", label: "Promos", formerHref: "/admin/promos", rule: { grants: ["stay-points"] } },
    { value: "promo-points", label: "Promo Points", formerHref: "/admin/promos/points", rule: { grants: ["stay-points"] } },
    { value: "gsd-points", label: "GSD Point Service", formerHref: "/admin/stay-points", rule: { grants: ["stay-points"], operation: "promo-points.use" } },
  ],
  redemption: [
    { value: "bookings", label: "Bookings", formerHref: "/admin/redemption", rule: { grants: ["redemption"] } },
    { value: "cardholder-points", label: "Card Points", formerHref: "/admin/redemption", rule: { grants: ["redemption"] } },
  ],
  // Settings: product setup plus the setup tabs moved from Redemption, Organization, Finance and Sales.
  "vip-products": [
    { value: "products", label: "Products", formerHref: "/admin/vip-products", rule: { grants: ["vip-products"] } },
    { value: "schemes", label: "Payment Plans", formerHref: "/admin/vip-products/schemes", rule: { grants: ["vip-products"] } },
    { value: "tier-codes", label: "Card Levels", formerHref: "/admin/vip-products/tier-codes", rule: { grants: ["vip-products"] } },
    { value: "points-table", label: "Points per Night", formerHref: "/admin/redemption/points-table", rule: { grants: ["redemption"], operation: "redemption.configure" } },
    { value: "holidays", label: "Holidays", formerHref: "/admin/redemption/points-table", rule: { grants: ["redemption"], operation: "redemption.configure" } },
    { value: "venues", label: "Venues", formerHref: "/admin/redemption/points-table", rule: { grants: ["redemption"], operation: "redemption.configure" } },
    { value: "lists", label: "Dropdown Choices", formerHref: "/admin/settings/lists", rule: { grants: ["departments"], operation: "settings.lists.manage" } },
    { value: "historical-import", label: "Import Old Records", formerHref: "/admin/reports/historical-import", rule: { grants: ["reports"], operation: "history-import.manage" } },
    { value: "igp-projects", label: "Property Projects (IGP)", formerHref: "/admin/vip-products", rule: { grants: ["sales", "finance"], operation: "igp.manage" } },
  ],
  // One-tab area: the Experiences page is a single view; the entry gives its audit events a notification destination.
  experiences: [
    { value: "experiences", label: "Experiences", formerHref: "/admin/experiences", rule: { grants: ["experiences"] } },
  ],
  "sales-network": [
    { value: "members", label: "Members", formerHref: "/admin/sales-network/members", rule: { grants: ["sales-network-members"] } },
    { value: "genealogy", label: "Team Tree", formerHref: "/admin/sales-network/genealogy", rule: { grants: ["sales-network-genealogy"] } },
    { value: "registrations", label: "Seller Applications", formerHref: "/admin/sales-network/registrations", rule: { grants: ["accreditation-registrations"] } },
  ],
  organization: [
    { value: "staff", label: "Staff", formerHref: "/admin/organization/staff", rule: { grants: ["staff"] } },
    { value: "departments", label: "Departments", formerHref: "/admin/organization/departments", rule: { grants: ["departments"] } },
    { value: "roles", label: "Roles", formerHref: "/admin/organization/roles", rule: { grants: ["roles"] } },
  ],
  reports: [
    { value: "summary", label: "Summary", formerHref: "/admin/reports", rule: { grants: ["reports"] } },
    { value: "sales", label: "Sales", formerHref: "/admin/reports/sales-performance", rule: { grants: ["reports"] } },
    { value: "customers", label: "Customers", formerHref: "/admin/reports/customer-growth", rule: { grants: ["reports"] } },
    { value: "collections", label: "Collections", formerHref: "/admin/reports/collections", rule: { grants: ["reports"], operation: "finance.reports.view" } },
    { value: "commissions", label: "Commissions", formerHref: "/admin/reports/commissions", rule: { grants: ["reports"] } },
    { value: "membership", label: "Membership", formerHref: "/admin/reports/membership", rule: { grants: ["reports"] } },
    { value: "stay-points", label: "Stay Points", formerHref: "/admin/reports/stay-points", rule: { grants: ["reports"] } },
    { value: "promo-points", label: "Promo Points", formerHref: "/admin/reports/promo-points", rule: { grants: ["reports"] } },
  ],
} as const satisfies Record<string, readonly AdminAreaTabRule[]>;

/** Areas whose page is a tab hub. */
export type AdminAreaKey = keyof typeof ADMIN_AREA_TABS;
/** The `?tab=` values of one area. */
export type AdminAreaTabValue<A extends AdminAreaKey> = (typeof ADMIN_AREA_TABS)[A][number]["value"];

/** Area route: `/admin/<area>`. */
export function adminAreaHref(area: AdminAreaKey): string {
  return `/admin/${area}`;
}

function areaItem(id: AdminAreaKey, label: string): AdminNavItem {
  const href = adminAreaHref(id);
  const tabs: readonly AdminAreaTabRule[] = ADMIN_AREA_TABS[id];
  const grants = [...new Set(tabs.flatMap((tab) => tab.rule.grants))];
  const formerOutside = tabs.map((tab) => tab.formerHref).filter((path) => path !== href && !path.startsWith(`${href}/`));
  return {
    id,
    label,
    href,
    available: true,
    // Union of the module grants (used by fail-open consumers such as the notifications menu).
    grants,
    access: tabs.map((tab) => tab.rule),
    matchPaths: formerOutside.length > 0 ? [...new Set(formerOutside)] : undefined,
  };
}

// Keep the area registry flat for access checks and breadcrumbs. AdminNavList
// groups the visible links for display. Each area shows while any of its tabs is allowed.
export const CUSTOMER_LOOKUP_HREF = "/admin/customer-lookup";
export const CUSTOMER_LOOKUP_GRANTS: AdminModuleId[] = ["customers", "membership", "stay-points"];

export const adminNavigation: AdminNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/admin", available: true },
  areaItem("customers", "Customers"),
  { id: "customer-lookup", label: "Customer Look Up", href: CUSTOMER_LOOKUP_HREF, available: true, grants: CUSTOMER_LOOKUP_GRANTS, operation: "customers.lookup" },
  areaItem("sales", "Sales"),
  areaItem("finance", "Finance"),
  areaItem("commissions", "Commissions"),
  areaItem("membership", "Membership"),
  areaItem("stay-points", "Stay Points"),
  areaItem("redemption", "Redemption"),
  areaItem("vip-products", "Settings"),
  areaItem("experiences", "Experiences"),
  areaItem("sales-network", "Sales Network"),
  areaItem("organization", "Organization"),
  // Compatibility entry point only: /admin/accounts forwards authorized users to
  // the Account-only view of Staff & Access. Never listed in the sidebar or Drawer.
  { id: "accounts", label: "Accounts and Permissions", href: "/admin/accounts", available: true, hideFromNav: true },
  areaItem("reports", "Reports"),
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

/** The item's own route plus its former routes, normalized. */
export function navItemPaths(item: AdminNavItem): string[] {
  return [item.href, ...(item.matchPaths ?? [])].map(normalizePath);
}

export function isAdminNavItemActive(item: AdminNavItem, pathname: string | null) {
  const current = normalizePath(pathname);
  const paths = navItemPaths(item);

  if (paths.includes(current)) return true;

  if (item.children?.some((child) => isAdminNavItemActive(child, current))) {
    return true;
  }

  return paths.some((href) => href !== "/" && current.startsWith(`${href}/`));
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
    // Ancestor entries render as plain text; only Dashboard and the final
    // destination link where a route exists.
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

/** True when any of the rule's module grants is held and its operation (if any) is held too. */
export function isNavRuleAllowed(
  rule: NavAccessRule,
  grantedModules: ReadonlySet<AdminModuleId>,
  grantedOperations: ReadonlySet<AdminOperation>,
): boolean {
  return rule.grants.some((moduleId) => grantedModules.has(moduleId)) && (!rule.operation || grantedOperations.has(rule.operation));
}

/** `{ [tabValue]: allowed }` for one area, using the same rules as the sidebar. */
export function getAdminAreaTabAccess<A extends AdminAreaKey>(
  area: A,
  grantedModules: ReadonlySet<AdminModuleId>,
  grantedOperations: ReadonlySet<AdminOperation>,
): Record<AdminAreaTabValue<A>, boolean> {
  const access = {} as Record<string, boolean>;
  for (const tab of ADMIN_AREA_TABS[area] as readonly AdminAreaTabRule[]) {
    access[tab.value] = isNavRuleAllowed(tab.rule, grantedModules, grantedOperations);
  }
  return access as Record<AdminAreaTabValue<A>, boolean>;
}

/**
 * Single access filter for the sidebar and Drawer. An area item (with
 * `access`) is shown while any of its tab rules passes. Other items are shown
 * when any of their module grants (default: their own id) is held and, if they
 * name an operation, that operation is held too. Parents with no grant of
 * their own stay visible while at least one child is.
 */
export function filterNavForAccess(
  items: AdminNavItem[],
  grantedModules: ReadonlySet<AdminModuleId>,
  grantedOperations: ReadonlySet<AdminOperation>,
): AdminNavItem[] {
  const result: AdminNavItem[] = [];
  for (const item of items) {
    const children = item.children ? filterNavForAccess(item.children, grantedModules, grantedOperations) : undefined;
    const allowed = item.access
      ? item.access.some((rule) => isNavRuleAllowed(rule, grantedModules, grantedOperations))
      : isNavRuleAllowed({ grants: item.grants ?? [item.id as AdminModuleId], operation: item.operation }, grantedModules, grantedOperations);
    if (allowed || (children && children.length > 0)) {
      result.push({ ...item, children });
    }
  }
  return result;
}

function findNavTrail(items: AdminNavItem[], pathname: string, trail: AdminNavItem[] = []): AdminNavItem[] {
  for (const item of items) {
    if (navItemPaths(item).includes(pathname)) return [...trail, item];
    if (item.children) {
      const childTrail = findNavTrail(item.children, pathname, [...trail, item]);
      if (childTrail.length > 0) return childTrail;
    }
  }
  return [];
}
