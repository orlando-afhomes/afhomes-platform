import { describe, expect, it } from "vitest";
import { findOpenKeys, findSelectedKeys, toAntdMenuItems } from "./admin-menu-items";
import { getRoleAwareAdminNavigation } from "../navigation";
import { getDevIdentity } from "@/data/mock/dev-identities";

describe("admin menu adapter", () => {
  it("maps authorized items to keyed menu entries without hidden Accounts", () => {
    const items = getRoleAwareAdminNavigation(getDevIdentity("dev-admin"));
    const menu = toAntdMenuItems(items) ?? [];
    expect(menu.map((entry) => (entry as { key: string }).key)).toEqual([
      "dashboard",
      "organization",
    ]);
  });

  it("passes no items for inactive identities", () => {
    const items = getRoleAwareAdminNavigation(getDevIdentity("dev-inactive"));
    expect(toAntdMenuItems(items)).toEqual([]);
  });

  it("selects the active route", () => {
    const items = getRoleAwareAdminNavigation(getDevIdentity("dev-admin"));
    expect(findSelectedKeys(items, "/admin")).toContain("dashboard");
  });

  it("never selects the hidden Accounts route in navigation", () => {
    const items = getRoleAwareAdminNavigation(getDevIdentity("dev-admin"));
    expect(items.some((item) => item.id === "accounts")).toBe(false);
    expect(findSelectedKeys(items, "/admin/accounts")).toEqual([]);
    expect(findOpenKeys(items, "/admin/accounts")).toEqual([]);
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
    const inactive = getRoleAwareAdminNavigation(getDevIdentity("dev-inactive"));
    expect(findSelectedKeys(inactive, "/admin")).toEqual([]);
    expect(findSelectedKeys(finance, "/admin/finance")).toEqual([]);
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
