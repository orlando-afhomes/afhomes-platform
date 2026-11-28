import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import type { Account } from "@/modules/accounts/types";
import type { StaffMember } from "@/modules/organization/types";
import { json, renderWithApi } from "@/test/api-harness";
import { StaffDialogs } from "./staff-dialogs";

const staff: StaffMember = {
  id: "staff-1",
  displayName: "Orlando Dela Cruz",
  position: "Super Administrator",
  departmentId: "dept-1",
  departmentRoleId: "role-1",
  status: "active",
  email: "orlandodelacruz@afhomes.com.ph",
  createdAt: "2026-01-01",
  avatarUrl: null,
  accountId: "acct-1",
};

const account: Account = {
  id: "acct-1",
  displayName: staff.displayName,
  email: staff.email,
  roleIds: ["super_admin"],
  status: "active",
  departmentId: "dept-1",
  createdAt: "2026-01-01",
};

function renderProfile() {
  return renderWithApi(
    <StaffDialogs
      open={false}
      editStaff={null}
      profileStaff={staff}
      profileAccount={account}
      onOpenEdit={() => undefined}
      onCloseForm={() => undefined}
      onCloseProfile={() => undefined}
    />,
    "dev-super-admin",
    (url) => {
      if (url.pathname === "/api/v1/departments") {
        return json({ items: [{ id: "dept-1", name: "Smart System Department", code: "SSD", description: "", headStaffId: null, status: "active" }] });
      }
      if (url.pathname === "/api/v1/roles/options") {
        return json({ items: [{ id: "role-1", name: "Super Admin", departmentId: "dept-1", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01", isProtected: true, manageable: true, assignable: true }] });
      }
      if (url.pathname === "/api/v1/staff/policies") {
        return json({
          policies: {
            [staff.id]: {
              canDelete: false,
              deleteRestriction: null,
              assignmentRestriction: null,
              identityRestriction: null,
              linkedAccount: { id: account.id, email: account.email, status: "active", isProtected: true, allowedStatuses: [] },
            },
          },
        });
      }
      return undefined;
    },
  );
}

describe("employee profile module access", () => {
  it("shows module access once, under Account Access, without a separate Authorized modules row", async () => {
    renderProfile();
    expect(await screen.findByText("Employee Profile")).toBeTruthy();
    expect(await screen.findByText("Effective module access")).toBeTruthy();
    expect(screen.queryByText("Authorized modules")).toBeNull();
  });
});
