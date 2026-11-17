import { describe, expect, it } from "vitest";
import type { AdminNavItem } from "./navigation";
import {
  ADMIN_AREA_TABS,
  adminNavigation,
  filterNavForAccess,
  getAdminAreaTabAccess,
  getAvailableAdminNavigation,
  getRoleAwareAdminNavigation,
  isAdminNavItemActive,
  normalizePath,
  getAdminBreadcrumbs,
} from "./navigation";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { getGrantedModuleIds, getGrantedOperations } from "@/modules/identity/permissions";
import { ADMIN_NAV_ICONS } from "./components/admin-nav-icons";

function visibleIds(identityId: string) {
  return getRoleAwareAdminNavigation(getDevIdentity(identityId)).map((item) => item.id);
}

function tabAccess(identityId: string, area: keyof typeof ADMIN_AREA_TABS) {
  const identity = getDevIdentity(identityId);
  const access: Record<string, boolean> = getAdminAreaTabAccess(area, getGrantedModuleIds(identity), getGrantedOperations(identity));
  return Object.keys(access).filter((tab) => access[tab]);
}

const ALL_AREAS = ["dashboard", "customers", "customer-lookup", "sales", "finance", "commissions", "membership", "stay-points", "redemption", "vip-products", "sales-network", "organization", "reports", "audit-logs"];
const SELLER_AREAS = ["dashboard", "customers", "sales", "commissions", "membership", "stay-points", "sales-network", "reports"];

describe("admin navigation", () => {
  it("is a flat list of 14 pages with no groups", () => {
    const items = getAvailableAdminNavigation();
    expect(items.map((item) => item.href)).toEqual([
      "/admin",
      "/admin/customers",
      "/admin/customer-lookup",
      "/admin/sales",
      "/admin/finance",
      "/admin/commissions",
      "/admin/membership",
      "/admin/stay-points",
      "/admin/redemption",
      "/admin/vip-products",
      "/admin/sales-network",
      "/admin/organization",
      "/admin/reports",
      "/admin/audit-logs",
    ]);
    expect(items.every((item) => !item.children?.length)).toBe(true);
    // Owner authorized Redemption on 2026-11-13; doc 10 defines no separate Services workflow, so none is listed.
    expect(JSON.stringify(items).toLowerCase()).not.toMatch(/services/);
  });

  it("uses one unique key and href per navigation item", () => {
    expect(new Set(adminNavigation.map((item) => item.id)).size).toBe(adminNavigation.length);
    expect(new Set(adminNavigation.map((item) => item.href)).size).toBe(adminNavigation.length);
  });

  it("gives every visible navigation item a unique label and icon", () => {
    const flat = getAvailableAdminNavigation();
    const labels = flat.map((item) => item.label.toLowerCase());
    expect(new Set(labels).size).toBe(labels.length);
    const icons = flat.map((item) => ADMIN_NAV_ICONS[item.id]);
    expect(icons.every(Boolean)).toBe(true);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("uses unique tab values per area", () => {
    for (const tabs of Object.values(ADMIN_AREA_TABS)) {
      const values = tabs.map((tab) => tab.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("shows every area to the Super Administrator and the Administrator", () => {
    expect(visibleIds("dev-super-admin")).toEqual(ALL_AREAS);
    expect(visibleIds("dev-admin")).toEqual(ALL_AREAS);
  });

  it("shows Finance its own areas, property sales (IGP) and reports", () => {
    expect(visibleIds("dev-finance")).toEqual(["dashboard", "customer-lookup", "sales", "finance", "commissions", "membership", "stay-points", "redemption", "reports"]);
    expect(tabAccess("dev-finance", "customers")).toEqual([]);
    expect(tabAccess("dev-finance", "sales")).toEqual(["igp"]);
    expect(tabAccess("dev-finance", "finance")).toEqual(["verification", "collections", "cancellations", "month-end-close", "reconciliation"]);
    // Payouts joined the Commissions tab as its month-end payout bar.
    expect(tabAccess("dev-finance", "commissions")).toEqual(["commissions", "recovery", "allowances"]);
    expect(tabAccess("dev-finance", "redemption")).toEqual(["bookings", "cardholder-points"]);
    expect(tabAccess("dev-finance", "reports")).toContain("collections");
  });

  it("shows the staff Customer Look Up to office roles only, never to sellers", () => {
    for (const identityId of ["dev-super-admin", "dev-admin", "dev-clerk", "dev-finance"]) expect(visibleIds(identityId), identityId).toContain("customer-lookup");
    for (const identityId of ["dev-svd-a", "dev-ost-a1", "dev-hr"]) expect(visibleIds(identityId), identityId).not.toContain("customer-lookup");
    expect(tabAccess("dev-super-admin", "customers")).toEqual(["customers", "import-export"]);
  });

  it("keeps the former per-page rules for the Administrator", () => {
    expect(tabAccess("dev-admin", "finance")).toEqual(["verification", "month-end-close", "reconciliation"]);
    expect(tabAccess("dev-admin", "organization")).toEqual(["staff", "departments", "roles"]);
    expect(tabAccess("dev-admin", "reports")).not.toContain("collections");
    expect(tabAccess("dev-super-admin", "reports")).toContain("collections");
  });

  it("shows the property projects (IGP) setup tab only to holders of igp.manage", () => {
    expect(tabAccess("dev-admin", "vip-products")).toContain("igp-projects");
    expect(tabAccess("dev-super-admin", "vip-products")).toContain("igp-projects");
    for (const identityId of ["dev-finance", "dev-clerk", "dev-svd-a", "dev-ost-a1"]) expect(tabAccess(identityId, "vip-products")).not.toContain("igp-projects");
  });

  it("shows Settings only to roles with a setup tab and keeps the Payment Plan Guide in Sales for sellers and the Clerk", () => {
    const SETTINGS_TABS = ["products", "schemes", "tier-codes", "points-table", "holidays", "venues", "lists", "historical-import", "igp-projects"];
    expect(tabAccess("dev-admin", "vip-products")).toEqual(SETTINGS_TABS);
    expect(tabAccess("dev-super-admin", "vip-products")).toEqual(SETTINGS_TABS);
    for (const identityId of ["dev-svd-a", "dev-ost-a1", "dev-clerk", "dev-finance", "dev-hr"]) {
      expect(visibleIds(identityId), identityId).not.toContain("vip-products");
    }
    for (const identityId of ["dev-svd-a", "dev-ost-a1", "dev-clerk"]) expect(tabAccess(identityId, "sales")).toContain("scheme-guide");
    expect(adminNavigation.find((item) => item.id === "vip-products")?.label).toBe("Settings");
  });

  it("shows sellers no review, import, payout, activation or finance tabs", () => {
    for (const identityId of ["dev-svd-a", "dev-ost-a1"]) {
      expect(visibleIds(identityId)).toEqual(SELLER_AREAS);
      expect(tabAccess(identityId, "customers")).toEqual(["customers"]);
      expect(tabAccess(identityId, "sales")).toEqual(["sales", "contracts", "igp", "scheme-guide"]);
      expect(tabAccess(identityId, "commissions")).toEqual(["commissions", "recovery"]);
      expect(tabAccess(identityId, "membership")).toEqual(["memberships"]);
      expect(tabAccess(identityId, "sales-network")).toEqual(["members", "genealogy"]);
      expect(tabAccess(identityId, "reports")).not.toContain("collections");
    }
  });

  it("shows HR only the Organization tabs it holds", () => {
    expect(visibleIds("dev-hr")).toEqual(["dashboard", "organization"]);
    expect(tabAccess("dev-hr", "organization")).toEqual(["staff", "departments"]);
  });

  it("requires the operation grant as well as the module grant", () => {
    const modules = new Set(["customers", "commissions", "membership", "reports"] as const);
    const access = (ops: string[]) => getAdminAreaTabAccess("commissions", modules, new Set(ops as never[]));
    expect(access([]).allowances).toBe(false);
    expect(access(["commission.approve"]).allowances).toBe(true);
    expect(Object.keys(access(["commission.payout.prepare"]))).not.toContain("payouts");
    // Finance is shown only through its operation-gated tabs for a reports holder.
    const ids = (ops: string[]) => filterNavForAccess(getAvailableAdminNavigation(), modules, new Set(ops as never[])).map((item) => item.id);
    expect(ids([])).not.toContain("finance");
    expect(ids(["reconciliation.manage"])).toContain("finance");
  });

  it("shows the Settings table tabs (moved from Redemption) only with redemption.configure", () => {
    // Finance holds the redemption module but not the configure operation (owner ruling: permissions unchanged).
    expect(tabAccess("dev-finance", "redemption")).toEqual(["bookings", "cardholder-points"]);
    expect(tabAccess("dev-admin", "redemption")).toEqual(["bookings", "cardholder-points"]);
    const modules = new Set(["redemption"] as const);
    const access = (ops: string[]) => getAdminAreaTabAccess("vip-products", modules, new Set(ops as never[]));
    expect(access([])).toMatchObject({ "points-table": false, holidays: false, venues: false });
    expect(access(["redemption.configure"])).toMatchObject({ "points-table": true, holidays: true, venues: true });
  });

  it("grants Contracts to sales or vip-products holders and the Payment Plan Guide to either", () => {
    expect(getAdminAreaTabAccess("sales", new Set(["vip-products"] as const), new Set())).toMatchObject({ contracts: true, sales: false });
    expect(getAdminAreaTabAccess("sales", new Set(["sales"] as const), new Set())).toMatchObject({ contracts: true, sales: true });
    expect(getAdminAreaTabAccess("sales", new Set(["vip-products"] as const), new Set())).toMatchObject({ "scheme-guide": true });
    expect(getAdminAreaTabAccess("sales", new Set(["sales"] as const), new Set())).toMatchObject({ "scheme-guide": true });
  });

  it("normalizes trailing slashes", () => {
    expect(normalizePath("/admin/customers/")).toBe("/admin/customers");
    expect(normalizePath("/")).toBe("/");
  });

  it("matches exact, descendant and former routes without false prefix matches", () => {
    const item = { id: "sales", label: "Sales", href: "/admin/sales", available: true } as AdminNavItem;
    expect(isAdminNavItemActive(item, "/admin/sales")).toBe(true);
    expect(isAdminNavItemActive(item, "/admin/sales/123")).toBe(true);
    expect(isAdminNavItemActive(item, "/admin/sales-reports")).toBe(false);
    expect(isAdminNavItemActive(item, "/admin")).toBe(false);
    const stayPoints = adminNavigation.find((entry) => entry.id === "stay-points")!;
    expect(isAdminNavItemActive(stayPoints, "/admin/promos/points")).toBe(true);
    const finance = adminNavigation.find((entry) => entry.id === "finance")!;
    expect(finance.matchPaths).toEqual(["/admin/reports/period-close", "/admin/reports/reconciliation"]);
  });

  it("returns dashboard breadcrumbs for the dashboard", () => {
    expect(getAdminBreadcrumbs("/admin")).toEqual([{ label: "Dashboard" }]);
  });

  it("returns area breadcrumbs for area and former routes", () => {
    expect(getAdminBreadcrumbs("/admin/organization")).toEqual([{ label: "Dashboard", href: "/admin" }, { label: "Organization" }]);
    expect(getAdminBreadcrumbs("/admin/settings/lists")).toEqual([{ label: "Dashboard", href: "/admin" }, { label: "Settings" }]);
  });

  it("keeps /admin/accounts as a hidden compatibility route", () => {
    const hrefs = getAvailableAdminNavigation().map((item) => item.href);
    expect(hrefs).not.toContain("/admin/accounts");
    expect(getAdminBreadcrumbs("/admin/accounts")).toEqual([
      { label: "Dashboard", href: "/admin" },
      { label: "Accounts and Permissions" },
    ]);
  });

  it("returns a not-found breadcrumb for unknown routes", () => {
    expect(getAdminBreadcrumbs("/admin/unknown")).toEqual([
      { label: "Dashboard", href: "/admin" },
      { label: "Page not found" },
    ]);
  });
});
