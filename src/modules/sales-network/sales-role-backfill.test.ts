import { describe, expect, it } from "vitest";
import type { Account } from "@/modules/accounts/types";
import type { OrgMember } from "@/modules/organization/types";
import { planSalesRoleBackfill } from "./sales-role-backfill";

function member(id: string, designation: OrgMember["designation"], accountId: string | null): OrgMember {
  return {
    id,
    displayName: id,
    designation,
    branchId: "branch-1",
    parentId: null,
    status: "active",
    departmentId: null,
    accountId,
    teamName: null,
    referralCode: null,
    aaNumber: null,
    mockAccreditationEligible: true,
    parentHistory: [],
  };
}

function account(id: string, roleIds: string[] = []): Account {
  return {
    id,
    displayName: id,
    email: `${id}@example.com`,
    roleIds: roleIds as Account["roleIds"],
    status: "pending",
    departmentId: null,
    createdAt: "2026-11-27",
    createdBy: undefined,
  };
}

describe("planSalesRoleBackfill", () => {
  it("plans missing roles and skips accounts that already have them", () => {
    const members = [member("m1", "SM", "a1"), member("m2", "OST", "a2"), member("m3", "SSM", null)];
    const accounts = [account("a1"), account("a2", ["ost"])];
    expect(planSalesRoleBackfill(members, accounts)).toEqual([
      { accountId: "a1", role: "sm", memberId: "m1", displayName: "m1" },
    ]);
  });

  it("does not plan duplicate roles for members sharing one account", () => {
    const members = [member("m1", "SVD", "a1"), member("m2", "SVD", "a1")];
    const accounts = [account("a1")];
    expect(planSalesRoleBackfill(members, accounts)).toHaveLength(1);
  });
});
