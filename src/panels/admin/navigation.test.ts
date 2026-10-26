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

  it("excludes unimplemented module routes", () => {
    const hrefs = getAvailableAdminNavigation().map((item) => item.href);
    expect(hrefs).not.toContain("/admin/customers");
    expect(hrefs).not.toContain("/admin/finance");
    expect(hrefs).not.toContain("/admin/audit-logs");
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

  it("returns a not-found breadcrumb for unknown routes", () => {
    expect(getAdminBreadcrumbs("/admin/unknown")).toEqual([
      { label: "Dashboard", href: "/admin" },
      { label: "Page not found" },
    ]);
  });
});
