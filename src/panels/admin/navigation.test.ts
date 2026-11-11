import { describe, expect, it } from "vitest";
import type { AdminNavItem } from "./navigation";
import {
  adminNavigation,
  filterNavForAccess,
  getAvailableAdminNavigation,
  getRoleAwareAdminNavigation,
  isAdminNavItemActive,
  normalizePath,
  getAdminBreadcrumbs,
} from "./navigation";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { ADMIN_NAV_ICONS } from "./components/admin-nav-icons";

function visibleTree(identityId: string) {
  return Object.fromEntries(
    getRoleAwareAdminNavigation(getDevIdentity(identityId)).map((item) => [item.id, item.children?.map((child) => child.id) ?? null]),
  );
}

const SALES_ALL = ["customers", "sales-contracts", "contract-review", "sales"];
const VIP_ALL = ["vip-products", "payment-schemes", "scheme-guide", "tier-codes"];
const SELLER_TREE = {
  dashboard: null,
  "sales-network": ["sales-network-members", "sales-network-genealogy"],
  "sales-group": ["customers", "sales-contracts", "sales"],
  "vip-products-group": ["scheme-guide"],
  "finance-group": ["commission-assignment", "commissions"],
  "membership-group": ["membership", "stay-points"],
  "reports-group": ["customer-growth", "sales-performance", "commission-report", "membership-report", "stay-points-report"],
};

describe("admin navigation", () => {
  it("includes the dashboard destination", () => {
    expect(getAvailableAdminNavigation().some((item) => item.href === "/admin")).toBe(true);
  });

  it("lists the business modules and keeps Redemption and Services out of navigation", () => {
    const items = getAvailableAdminNavigation();
    const hrefs = items.flatMap((item) => [item.href, ...(item.children ?? []).map((child) => child.href)]);
    for (const href of ["/admin/customers", "/admin/vip-products", "/admin/sales", "/admin/finance", "/admin/commissions", "/admin/membership", "/admin/stay-points", "/admin/audit-logs"]) {
      expect(hrefs).toContain(href);
    }
    expect(hrefs).not.toContain("/admin/reports");
    expect(JSON.stringify(items).toLowerCase()).not.toMatch(/redemption|services/);
  });

  it("uses one unique key and href per navigation item", () => {
    const flat = adminNavigation.flatMap((item) => [item, ...(item.children ?? [])]);
    expect(new Set(flat.map((item) => item.id)).size).toBe(flat.length);
    expect(new Set(flat.map((item) => item.href)).size).toBe(flat.length);
  });

  it("gives every visible navigation item, parents and children, a unique label and icon", () => {
    const flat = getAvailableAdminNavigation().flatMap((item) => [item, ...(item.children ?? [])]);
    const labels = flat.map((item) => item.label.toLowerCase());
    expect(new Set(labels).size).toBe(labels.length);
    const icons = flat.map((item) => ADMIN_NAV_ICONS[item.id]);
    expect(icons.every(Boolean)).toBe(true);
    expect(new Set(icons).size).toBe(icons.length);
  });

  it("shows the Super Administrator tree, with operation-gated items", () => {
    expect(visibleTree("dev-super-admin")).toEqual({
      dashboard: null,
      organization: ["departments", "roles", "staff"],
      "sales-network": ["sales-network-members", "sales-network-genealogy"],
      "sales-group": SALES_ALL,
      "vip-products-group": VIP_ALL,
      "finance-group": ["finance", "collections", "commission-assignment", "commissions", "commission-payouts", "payment-history", "financial-holds", "cancellation-requests"],
      "membership-group": ["membership-activation", "membership", "stay-points"],
      "reports-group": ["customer-growth", "sales-performance", "collections-report", "commission-report", "membership-report", "stay-points-report"],
      "audit-logs": null,
    });
  });

  it("shows the Administrator tree without Finance operations", () => {
    expect(visibleTree("dev-admin")).toEqual({
      dashboard: null,
      organization: ["departments", "roles", "staff"],
      "sales-network": ["sales-network-members", "sales-network-genealogy"],
      "sales-group": SALES_ALL,
      "vip-products-group": VIP_ALL,
      "finance-group": ["commission-assignment", "commissions"],
      "membership-group": ["membership-activation", "membership", "stay-points"],
      "reports-group": ["customer-growth", "sales-performance", "commission-report", "membership-report", "stay-points-report"],
      "audit-logs": null,
    });
  });

  it("shows Finance its own processes, all reports, and no Sales, VIP Products or Contract Review", () => {
    expect(visibleTree("dev-finance")).toEqual({
      dashboard: null,
      "finance-group": ["finance", "collections", "commission-assignment", "commissions", "commission-payouts", "payment-history", "financial-holds", "cancellation-requests"],
      "membership-group": ["membership-activation", "membership", "stay-points"],
      "reports-group": ["customer-growth", "sales-performance", "collections-report", "commission-report", "membership-report", "stay-points-report"],
    });
  });

  it("shows sellers no review, import, payout, activation or finance pages", () => {
    for (const identityId of ["dev-svd-a", "dev-ost-a1"]) {
      expect(visibleTree(identityId)).toEqual(SELLER_TREE);
    }
  });

  it("requires the operation grant as well as the module grant", () => {
    const modules = new Set(["customers", "commissions", "membership", "reports"] as const);
    const ids = (ops: string[]) =>
      filterNavForAccess(getAvailableAdminNavigation(), modules, new Set(ops as never[])).flatMap((item) => (item.children ?? []).map((child) => child.id));
    expect(ids([])).not.toEqual(expect.arrayContaining(["commission-payouts", "membership-activation", "collections-report"]));
    expect(ids(["customers.import", "commission.payout", "membership.activate", "finance.reports.view"])).toEqual(
      expect.arrayContaining(["commission-payouts", "membership-activation", "collections-report"]),
    );
  });

  it("grants Contracts to sales or vip-products holders and Scheme Guide to either", () => {
    const ids = (modules: string[]) =>
      filterNavForAccess(getAvailableAdminNavigation(), new Set(modules as never[]), new Set()).flatMap((item) => (item.children ?? []).map((child) => child.id));
    expect(ids(["vip-products"])).toEqual(expect.arrayContaining(["sales-contracts", "contract-review", "scheme-guide"]));
    expect(ids(["sales"])).toEqual(expect.arrayContaining(["sales-contracts", "scheme-guide"]));
    expect(ids(["sales"])).not.toContain("contract-review");
  });

  it("normalizes trailing slashes", () => {
    expect(normalizePath("/admin/customers/")).toBe("/admin/customers");
    expect(normalizePath("/")).toBe("/");
  });

  it("matches exact and descendant routes without false prefix matches", () => {
    const item = { id: "sales", label: "Sales", href: "/admin/sales", available: true } as AdminNavItem;
    expect(isAdminNavItemActive(item, "/admin/sales")).toBe(true);
    expect(isAdminNavItemActive(item, "/admin/sales/123")).toBe(true);
    expect(isAdminNavItemActive(item, "/admin/sales-reports")).toBe(false);
    expect(isAdminNavItemActive(item, "/admin")).toBe(false);
  });

  it("marks a parent group active when a child is active", () => {
    const item = {
      id: "dashboard",
      label: "Group",
      href: "/admin/group",
      available: true,
      children: [{ id: "sales", label: "Child", href: "/admin/group/child", available: true }],
    } as AdminNavItem;
    expect(isAdminNavItemActive(item, "/admin/group/child")).toBe(true);
  });

  it("returns dashboard breadcrumbs for the dashboard", () => {
    expect(getAdminBreadcrumbs("/admin")).toEqual([{ label: "Dashboard" }]);
  });

  it("returns nested breadcrumbs for organization children", () => {
    expect(getAdminBreadcrumbs("/admin/organization/departments")).toEqual([
      { label: "Dashboard", href: "/admin" },
      { label: "Organization" },
      { label: "Departments" },
    ]);
  });

  it("serves account administration from Staff & Access, keeping /admin/accounts as a hidden compatibility route", () => {
    const hrefs = getAvailableAdminNavigation().flatMap((item) => [item.href, ...(item.children ?? []).map((child) => child.href)]);
    expect(hrefs).not.toContain("/admin/accounts");
    expect(hrefs).toContain("/admin/organization/staff");
    expect(getAdminBreadcrumbs("/admin/organization/staff")).toEqual([
      { label: "Dashboard", href: "/admin" },
      { label: "Organization" },
      { label: "Staff" },
    ]);
    expect(getAdminBreadcrumbs("/admin/accounts")).toEqual([
      { label: "Dashboard", href: "/admin" },
      { label: "Accounts and Permissions" },
    ]);
  });

  it("hides the Customer Import sidebar link while keeping its route and breadcrumbs", () => {
    const hrefs = getAvailableAdminNavigation().flatMap((item) => [item.href, ...(item.children ?? []).map((child) => child.href)]);
    expect(hrefs).not.toContain("/admin/customers/import-export");
    expect(adminNavigation.flatMap((item) => item.children ?? []).find((item) => item.id === "customer-import")?.hideFromNav).toBe(true);
    expect(getAdminBreadcrumbs("/admin/customers/import-export")).toEqual([
      { label: "Dashboard", href: "/admin" },
      { label: "Sales" },
      { label: "Customer Import" },
    ]);
  });

  it("returns a not-found breadcrumb for unknown routes", () => {
    expect(getAdminBreadcrumbs("/admin/unknown")).toEqual([
      { label: "Dashboard", href: "/admin" },
      { label: "Page not found" },
    ]);
  });
});
