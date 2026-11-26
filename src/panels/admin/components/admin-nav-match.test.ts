import { describe, expect, it } from "vitest";
import { findOpenKeys, findSelectedKeys } from "./admin-nav-match";
import { getRoleAwareAdminNavigation } from "../navigation";
import { getDevIdentity } from "@/data/seed/dev-identities";

describe("admin navigation matching", () => {
  it("lists the authorized areas as a flat list without a separate Accounts entry", () => {
    const items = getRoleAwareAdminNavigation(getDevIdentity("dev-admin"));
    expect(items.map((item) => item.id)).toEqual(["dashboard", "customers", "customer-lookup", "sales", "finance", "commissions", "membership", "stay-points", "vip-products", "sales-network", "organization", "reports", "audit-logs"]);
    expect(items.some((item) => item.id === ("accreditation" as string))).toBe(false);
    expect(items.some((item) => item.id === ("insights-group" as string))).toBe(false);
  });

  it("highlights the area for its nested, detail and former routes", () => {
    const items = getRoleAwareAdminNavigation(getDevIdentity("dev-admin"));
    expect(findSelectedKeys(items, "/admin/customers")).toEqual(["customers"]);
    expect(findSelectedKeys(items, "/admin/customers/import-export")).toEqual(["customers"]);
    expect(findSelectedKeys(items, "/admin/sales")).toEqual(["sales"]);
    expect(findSelectedKeys(items, "/admin/sales/contract-review/c1")).toEqual(["sales"]);
    expect(findSelectedKeys(items, "/admin/vip-products/schemes")).toEqual(["vip-products"]);
    expect(findSelectedKeys(items, "/admin/commissions/payouts")).toEqual(["commissions"]);
    expect(findSelectedKeys(items, "/admin/stay-points")).toEqual(["stay-points"]);
    expect(findSelectedKeys(items, "/admin/settings/lists")).toEqual(["vip-products"]);
    expect(findSelectedKeys(items, "/admin/reports/stay-points")).toEqual(["reports"]);
    // Former Reports pages that moved to Finance (or Settings) highlight their new area, not Reports.
    expect(findSelectedKeys(items, "/admin/reports/period-close")).toEqual(["finance"]);
    expect(findSelectedKeys(items, "/admin/reports/reconciliation")).toEqual(["finance"]);
    expect(findSelectedKeys(items, "/admin/reports/historical-import")).toEqual(["vip-products"]);
    expect(findSelectedKeys(items, "/admin/sales-network/members/m1")).toEqual(["sales-network"]);
    expect(findSelectedKeys(items, "/admin/audit-logs")).toEqual(["audit-logs"]);
    expect(findOpenKeys(items, "/admin/customers")).toEqual([]);
    const finance = getRoleAwareAdminNavigation(getDevIdentity("dev-finance"));
    expect(findSelectedKeys(finance, "/admin/finance/collections/c1")).toEqual(["finance"]);
    expect(getRoleAwareAdminNavigation(getDevIdentity("dev-hr")).some((item) => item.id === "finance")).toBe(false);
  });

  it("passes no items for inactive identities", () => {
    expect(getRoleAwareAdminNavigation(getDevIdentity("dev-inactive"))).toEqual([]);
  });

  it("selects the active route", () => {
    const items = getRoleAwareAdminNavigation(getDevIdentity("dev-admin"));
    expect(findSelectedKeys(items, "/admin")).toContain("dashboard");
  });

  it("selects Organization for Staff & Access for Admin and HR and never lists /admin/accounts", () => {
    for (const identityId of ["dev-admin", "dev-super-admin", "dev-hr"]) {
      const items = getRoleAwareAdminNavigation(getDevIdentity(identityId));
      expect(items.some((item) => item.id === "accounts")).toBe(false);
      expect(findSelectedKeys(items, "/admin/organization/staff")).toEqual(["organization"]);
      expect(findSelectedKeys(items, "/admin/accounts")).toEqual([]);
    }
  });

  it("selects nothing for unknown routes", () => {
    const items = getRoleAwareAdminNavigation(getDevIdentity("dev-admin"));
    expect(findSelectedKeys(items, "/admin/unknown")).toEqual([]);
    expect(findSelectedKeys(items, "/admin/unknown/details")).toEqual([]);
    expect(findOpenKeys(items, "/admin/unknown")).toEqual([]);
  });

  it("matches nested organization routes", () => {
    const items = getRoleAwareAdminNavigation(getDevIdentity("dev-admin"));
    expect(findSelectedKeys(items, "/admin/organization")).toEqual(["organization"]);
    expect(findSelectedKeys(items, "/admin/organization/departments")).toEqual(["organization"]);
    expect(findOpenKeys(items, "/admin/organization/staff")).toEqual([]);
    expect(findSelectedKeys(items, "/admin/accounts-extra")).toEqual([]);
    expect(findSelectedKeys(items, null)).toEqual([]);
  });

  it("never selects unauthorized modules", () => {
    const finance = getRoleAwareAdminNavigation(getDevIdentity("dev-finance"));
    expect(findSelectedKeys(finance, "/admin/organization")).toEqual([]);
    expect(findSelectedKeys(finance, "/admin")).toEqual(["dashboard"]);
    expect(findSelectedKeys(finance, "/admin/customers")).toEqual([]);
    expect(findSelectedKeys(finance, "/admin/customer-lookup")).toEqual(["customer-lookup"]);
    expect(findSelectedKeys(finance, "/admin/vip-products")).toEqual([]);
    const inactive = getRoleAwareAdminNavigation(getDevIdentity("dev-inactive"));
    expect(findSelectedKeys(inactive, "/admin")).toEqual([]);
    expect(findSelectedKeys(finance, "/admin/finance")).toEqual(["finance"]);
  });

  it("opens parent groups for nested routes", () => {
    const nested = [
      {
        id: "dashboard" as const,
        label: "Dashboard",
        href: "/admin",
        available: true,
        children: [
          { id: "accounts" as const, label: "Accounts", href: "/admin/accounts", available: true },
        ],
      },
    ];
    expect(findOpenKeys(nested, "/admin/accounts")).toEqual(["dashboard"]);
    expect(findOpenKeys(nested, "/admin")).toEqual([]);
  });
});
