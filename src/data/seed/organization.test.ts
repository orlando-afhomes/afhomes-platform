import { describe, expect, it } from "vitest";
import { DELEGABLE_MODULES } from "@/modules/identity/permissions";
import { buildAccounts, buildDepartments, buildRoles, buildStaff } from "./organization";

describe("Super Admin seed organization", () => {
  it("places the Super Admin in Smart System Department with the Super Admin department role", () => {
    const departments = buildDepartments();
    const roles = buildRoles();
    const staff = buildStaff();
    const accounts = buildAccounts();

    const department = departments.find((item) => item.name === "Smart System Department");
    expect(department).toBeTruthy();

    const role = roles.find((item) => item.id === "role-super-admin");
    expect(role?.departmentId).toBe(department!.id);

    const superStaff = staff.find((item) => item.accountId === "acct-super-admin");
    expect(superStaff).toMatchObject({
      departmentId: department!.id,
      departmentRoleId: "role-super-admin",
    });

    const superAccount = accounts.find((item) => item.id === "acct-super-admin");
    expect(superAccount?.departmentId).toBe(department!.id);
  });

  it("gives the Super Admin department role every delegable module", () => {
    const role = buildRoles().find((item) => item.id === "role-super-admin");
    expect(new Set(role?.moduleIds)).toEqual(new Set(DELEGABLE_MODULES));
  });
});
