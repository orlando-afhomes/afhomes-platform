import { describe, expect, it } from "vitest";
import { findOpenKeys, findSelectedKeys } from "./admin-nav-match";
import { getRoleAwareAdminNavigation } from "../navigation";
import { getDevIdentity } from "@/data/mock/dev-identities";

describe("admin navigation matching", () => {
  it("lists authorized top-level items without a separate Accounts entry", () => {
    const items = getRoleAwareAdminNavigation(getDevIdentity("dev-admin"));
    expect(items.map((item) => item.id)).toEqual(["dashboard", "sales-group", "finance-group", "membership-group", "redemption-group", "vip-products-group", "sales-network", "organization", "reports-group", "audit-logs"]);
    expect(items.some((item) => item.id === "accreditation")).toBe(false);
  });

  it("groups processes under parent scopes that are never granted", () => {
    const items = getRoleAwareAdminNavigation(getDevIdentity("dev-admin"));
    const childIds = (id: string) => items.find((item) => item.id === id)?.children?.map((child) => child.id);
    expect(childIds("finance-group")).toEqual(["finance", "commission-assignment", "commissions", "commission-payouts", "allowance-review"]);
    expect(childIds("membership-group")).toEqual(["membership-activation", "membership", "stay-points", "promos", "promo-points"]);
    expect(childIds("reports-group")).toEqual(["customer-growth", "sales-performance", "commission-report", "membership-report", "stay-points-report", "promo-points-report", "reconciliation", "historical-import", "period-close"]);
    expect(childIds("sales-group")).toEqual(["customers", "sales-contracts", "contract-review", "sales", "igp-sales"]);
    expect(childIds("vip-products-group")).toEqual(["vip-products", "payment-schemes", "scheme-guide", "tier-codes"]);
    expect(items.some((item) => item.id === ("insights-group" as string))).toBe(false);
    expect(findOpenKeys(items, "/admin/customers")).toEqual(["sales-group"]);
    expect(findOpenKeys(items, "/admin/sales/contract-review/c1")).toEqual(["sales-group"]);
    expect(findSelectedKeys(items, "/admin/sales/contract-review/c1")).toEqual(["contract-review"]);
    expect(findSelectedKeys(items, "/admin/sales")).toEqual(["sales"]);
    expect(findSelectedKeys(items, "/admin/customers/import-export")).toEqual(["customers"]);
    expect(findOpenKeys(items, "/admin/vip-products/schemes")).toEqual(["vip-products-group"]);
    expect(findOpenKeys(items, "/admin/commissions")).toEqual(["finance-group"]);
    expect(findSelectedKeys(items, "/admin/stay-points")).toEqual(["stay-points"]);
    expect(findSelectedKeys(items, "/admin/reports/stay-points")).toEqual(["stay-points-report"]);
    expect(findOpenKeys(items, "/admin/reports/stay-points")).toEqual(["reports-group"]);
    expect(findSelectedKeys(items, "/admin/audit-logs")).toEqual(["audit-logs"]);
    const finance = getRoleAwareAdminNavigation(getDevIdentity("dev-finance"));
    expect(finance.find((item) => item.id === "finance-group")?.children?.map((child) => child.id)).toContain("finance");
    expect(findSelectedKeys(finance, "/admin/finance/collections/c1")).toEqual(["collections"]);
    expect(getRoleAwareAdminNavigation(getDevIdentity("dev-hr")).some((item) => item.id === "finance-group")).toBe(false);
  });

  it("passes no items for inactive identities", () => {
    expect(getRoleAwareAdminNavigation(getDevIdentity("dev-inactive"))).toEqual([]);
  });

  it("selects the active route", () => {
    const items = getRoleAwareAdminNavigation(getDevIdentity("dev-admin"));
    expect(findSelectedKeys(items, "/admin")).toContain("dashboard");
  });

  it("selects Staff & Access for Admin and HR and never lists /admin/accounts", () => {
    for (const identityId of ["dev-admin", "dev-super-admin", "dev-hr"]) {
      const items = getRoleAwareAdminNavigation(getDevIdentity(identityId));
      expect(items.some((item) => item.id === "accounts")).toBe(false);
      expect(findSelectedKeys(items, "/admin/organization/staff")).toEqual(["staff"]);
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
    expect(findSelectedKeys(items, "/admin/organization/departments")).toEqual(["departments"]);
    expect(findSelectedKeys(items, "/admin/organization/staff")).toEqual(["staff"]);
    expect(findOpenKeys(items, "/admin/organization/staff")).toEqual(["organization"]);
    expect(findSelectedKeys(items, "/admin/accounts-extra")).toEqual([]);
    expect(findSelectedKeys(items, null)).toEqual([]);
  });

  it("never selects unauthorized modules", () => {
    const finance = getRoleAwareAdminNavigation(getDevIdentity("dev-finance"));
    expect(findSelectedKeys(finance, "/admin/organization")).toEqual([]);
    expect(findSelectedKeys(finance, "/admin")).toEqual(["dashboard"]);
    expect(findSelectedKeys(finance, "/admin/customers")).toEqual([]);
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
