import { describe, expect, it } from "vitest";
import { createSeedStore } from "@/data/mock/seed";
import type { AccountActionPolicy, AccountPolicies } from "@/modules/accounts/types";
import type { StaffActionPolicy } from "@/modules/organization/types";
import { buildAccessRows, countPendingRows, filterAccessRows, parseAccessChip, type AccessFilters } from "./staff-access-rows";

const store = createSeedStore();
const linkedIds = new Set(store.staff.map((member) => member.accountId).filter(Boolean));

function policy(linkedToStaff: boolean): AccountActionPolicy {
  return { canEdit: true, canManageRoles: true, canResetPassword: false, assignableRoles: [], revocableRoles: [], allowedStatuses: [], restriction: null, linkedToStaff, canDelete: true, deleteRestriction: null };
}

const accountPolicies: AccountPolicies = {
  creatableRoles: [],
  accounts: Object.fromEntries(store.accounts.map((account) => [account.id, policy(linkedIds.has(account.id))])),
};

const staffPolicies: Record<string, StaffActionPolicy> = {
  "staff-1": {
    canDelete: true,
    deleteRestriction: null,
    assignmentRestriction: null,
    identityRestriction: null,
    linkedAccount: { id: "acct-hr", email: "hr@afhomes.local", status: "pending", isProtected: false, allowedStatuses: [] },
  },
};

const noFilters: AccessFilters = { chip: "all", search: "", departmentId: "all", roleId: "all", status: "all" };
const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

describe("staff access rows", () => {
  it("lists each linked account once, as its employee row", () => {
    const rows = buildAccessRows(store.staff, store.accounts, accountPolicies, staffPolicies, true);
    expect(rows.filter((row) => row.kind === "employee")).toHaveLength(store.staff.length);
    expect(rows.filter((row) => row.kind === "account").map((row) => row.id)).toEqual(
      store.accounts.filter((account) => !linkedIds.has(account.id)).map((account) => account.id),
    );
    const hrRow = rows.find((row) => row.id === "staff-1");
    expect(hrRow?.kind === "employee" && hrRow.account?.id).toBe("acct-hr");
  });

  it("gives identities without the Accounts module employee rows only", () => {
    const rows = buildAccessRows(store.staff, store.accounts, accountPolicies, staffPolicies, false);
    expect(rows.every((row) => row.kind === "employee" && row.account === null)).toBe(true);
  });

  it("adds no account-only rows before account policies load", () => {
    const rows = buildAccessRows(store.staff, store.accounts, undefined, staffPolicies, true);
    expect(rows.some((row) => row.kind === "account")).toBe(false);
  });

  it("filters by chip and counts pending accounts from either source", () => {
    const rows = buildAccessRows(store.staff, store.accounts, accountPolicies, staffPolicies, true);
    expect(filterAccessRows(rows, { ...noFilters, chip: "account" }, true).every((row) => row.kind === "account")).toBe(true);
    expect(filterAccessRows(rows, { ...noFilters, chip: "employees" }, true).every((row) => row.kind === "employee")).toBe(true);
    // Seed: acct-pending is the only pending account record.
    expect(ids(filterAccessRows(rows, { ...noFilters, chip: "pending" }, true))).toEqual(["acct-pending"]);
    expect(countPendingRows(rows)).toBe(1);
    // Without the full account record, the linked summary status is used.
    const hrRows = buildAccessRows(store.staff, store.accounts, undefined, staffPolicies, false);
    expect(ids(filterAccessRows(hrRows, { ...noFilters, chip: "pending" }, true))).toEqual(["staff-1"]);
  });

  it("applies search, department, role, and employment filters", () => {
    const rows = buildAccessRows(store.staff, store.accounts, accountPolicies, staffPolicies, true);
    expect(ids(filterAccessRows(rows, { ...noFilters, search: "pending@" }, true))).toEqual(["acct-pending"]);
    expect(ids(filterAccessRows(rows, { ...noFilters, search: "analyst" }, true))).toEqual(["staff-2"]);
    expect(ids(filterAccessRows(rows, { ...noFilters, departmentId: "dept-finance" }, true))).toEqual(["staff-2"]);
    const byRole = filterAccessRows(rows, { ...noFilters, roleId: "role-ops-staff" }, true);
    expect(ids(byRole)).toEqual(["staff-clerk", "staff-3", "staff-records"]);
    expect(filterAccessRows(rows, { ...noFilters, status: "active" }, true).some((row) => row.kind === "account")).toBe(false);
  });

  it("sorts by display name in either direction", () => {
    const rows = buildAccessRows(store.staff, store.accounts, accountPolicies, staffPolicies, true);
    const asc = filterAccessRows(rows, noFilters, true);
    const desc = filterAccessRows(rows, noFilters, false);
    expect(ids(desc)).toEqual(ids(asc).reverse());
  });
});

describe("parseAccessChip", () => {
  it("accepts the four directory views and falls back to all", () => {
    for (const value of ["all", "employees", "account", "pending"] as const) expect(parseAccessChip(value)).toBe(value);
    for (const value of [null, "", "accounts", "ACCOUNT", "pending ", "x"]) expect(parseAccessChip(value)).toBe("all");
  });
});
