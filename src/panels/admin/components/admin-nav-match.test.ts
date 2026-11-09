import { describe, expect, it } from "vitest";
import { findOpenKeys, findSelectedKeys } from "./admin-nav-match";
import { getRoleAwareAdminNavigation } from "../navigation";
import { getDevIdentity } from "@/data/mock/dev-identities";

describe("admin navigation matching", () => {
  it("lists authorized top-level items without a separate Accounts entry", () => {
    const items = getRoleAwareAdminNavigation(getDevIdentity("dev-admin"));
    expect(items.map((item) => item.id)).toEqual(["dashboard", "organization", "sales-network", "customers", "vip-products", "sales", "commissions", "membership", "stay-points", "reports", "audit-logs"]);
    expect(items.some((item) => item.id === "accreditation")).toBe(false);
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
