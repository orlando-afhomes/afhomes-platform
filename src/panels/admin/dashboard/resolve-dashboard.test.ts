import { describe, expect, it } from "vitest";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { primarySalesRole, resolveDashboard } from "./resolve-dashboard";

describe("resolveDashboard", () => {
  it.each([
    ["dev-super-admin", "admin"],
    ["dev-admin", "admin"],
    ["dev-finance", "finance"],
    ["dev-hr", "none"],
    ["dev-svd-a", "sales"],
    ["dev-ssm-a", "sales"],
    ["dev-sm-a", "sales"],
    ["dev-ost-a1", "sales"],
    ["dev-inactive", "restricted"],
    // The inactive admin assignment must not lift a seller into the Admin dashboard.
    ["dev-multi-role", "sales"],
  ])("%s gets the %s dashboard", (identityId, expected) => {
    expect(resolveDashboard(getDevIdentity(identityId))).toBe(expected);
  });

  it("uses the highest active sales designation for the heading", () => {
    expect(primarySalesRole(getDevIdentity("dev-multi-role"))).toBe("sm");
    expect(primarySalesRole(getDevIdentity("dev-ost-a1"))).toBe("ost");
    expect(primarySalesRole(getDevIdentity("dev-finance"))).toBeNull();
  });
});
