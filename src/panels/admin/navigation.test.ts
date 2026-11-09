import { describe, expect, it } from "vitest";
import type { AdminNavItem } from "./navigation";
import {
  getAvailableAdminNavigation,
  isAdminNavItemActive,
  normalizePath,
  getAdminBreadcrumbs,
} from "./navigation";

describe("admin navigation", () => {
  it("includes the dashboard destination", () => {
    expect(getAvailableAdminNavigation().some((item) => item.href === "/admin")).toBe(true);
  });

  it("lists the business modules and keeps Redemption and Services out of navigation", () => {
    const items = getAvailableAdminNavigation();
    const hrefs = items.map((item) => item.href);
    for (const href of ["/admin/customers", "/admin/vip-products", "/admin/sales", "/admin/finance", "/admin/commissions", "/admin/membership", "/admin/stay-points", "/admin/reports", "/admin/audit-logs"]) {
      expect(hrefs).toContain(href);
    }
    expect(JSON.stringify(items).toLowerCase()).not.toMatch(/redemption|services/);
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
      { label: "Staff & Access" },
    ]);
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
