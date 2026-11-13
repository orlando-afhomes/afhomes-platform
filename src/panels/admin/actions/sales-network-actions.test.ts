import { describe, expect, it, vi } from "vitest";
import type { Designation, MemberStatus, OrgMember } from "@/modules/organization/types";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import {
  buildMemberMenuProps,
  resolveRenewTarget,
  transferLabelFor,
  type MemberMenuCallbacks,
  type MemberMenuPerms,
} from "./sales-network-actions";

type Member = Pick<OrgMember, "displayName" | "designation" | "status">;

function member(designation: Designation, status: MemberStatus): Member {
  return { displayName: "Maria Santos", designation, status };
}

const FULL_PERMS: MemberMenuPerms = {
  canManage: true,
  canTransfer: true,
  canChangeStatus: true,
  canReactivate: true,
  canEditAccreditation: true,
  canRenew: true,
  accreditationNone: false,
  renewalAllowed: false,
};

const NO_PERMS: MemberMenuPerms = {
  canManage: false,
  canTransfer: false,
  canChangeStatus: false,
  canReactivate: false,
  canEditAccreditation: false,
  canRenew: false,
  accreditationNone: false,
  renewalAllowed: false,
};

function rowCb(): MemberMenuCallbacks {
  return {
    onView: vi.fn(),
    onEdit: vi.fn(),
    onTransfer: vi.fn(),
    onChangeStatus: vi.fn(),
    onSetAccreditation: vi.fn(),
    onRenew: vi.fn(),
  };
}

function detailCb(): MemberMenuCallbacks {
  return {
    onEdit: vi.fn(),
    onTransfer: vi.fn(),
    onChangeStatus: vi.fn(),
    onSetAccreditation: vi.fn(),
    onRenew: vi.fn(),
  };
}

function keysOf(props: { extraItems: { key: string }[] }): string[] {
  return props.extraItems.map((item) => item.key);
}

function record(overrides: Partial<AccreditationRecord> = {}): AccreditationRecord {
  return {
    id: "acc-1",
    memberId: "mem-1",
    classification: "IST",
    adminStatus: "active",
    originalAccreditationDate: "2025-11-01",
    effectiveDate: "2025-11-01",
    expiryDate: "2026-11-30",
    aaNumber: "AAI26110001",
    history: [],
    ...overrides,
  };
}

describe("transferLabelFor", () => {
  it("sends OST to IST and everything else to OST", () => {
    expect(transferLabelFor("OST")).toBe("Transfer to IST");
    expect(transferLabelFor("SSM")).toBe("Transfer to OST");
    expect(transferLabelFor("SM")).toBe("Transfer to OST");
    expect(transferLabelFor("SVD")).toBe("Transfer to OST");
  });
});

describe("buildMemberMenuProps", () => {
  it("exposes view and edit for an active SSM with full rights", () => {
    const menu = buildMemberMenuProps(member("SSM", "active"), FULL_PERMS, rowCb());
    expect(menu.itemName).toBe("Maria Santos");
    expect(menu.onView).toBeDefined();
    expect(menu.onEdit).toBeDefined();
    expect(keysOf(menu)).toEqual(["transfer", "deactivate"]);
    expect(menu.extraItems.map((item) => item.label)).toEqual(["Transfer to OST", "Deactivate"]);
    expect(menu.extraItems.find((item) => item.key === "deactivate")?.danger).toBe(true);
  });

  it("offers reactivate (not danger) for inactive members when reactivation is allowed", () => {
    const menu = buildMemberMenuProps(member("SM", "inactive"), FULL_PERMS, rowCb());
    expect(keysOf(menu)).toEqual(["transfer", "reactivate"]);
    expect(menu.extraItems.find((item) => item.key === "reactivate")?.danger ?? false).toBe(false);
  });

  it("hides the status toggle for inactive members without the reactivate right", () => {
    const menu = buildMemberMenuProps(member("SM", "inactive"), { ...FULL_PERMS, canReactivate: false }, rowCb());
    expect(keysOf(menu)).toEqual(["transfer"]);
  });

  it("hides the status toggle without the status right, even for active members", () => {
    const menu = buildMemberMenuProps(member("SM", "active"), { ...FULL_PERMS, canChangeStatus: false }, rowCb());
    expect(keysOf(menu)).toEqual(["transfer"]);
  });

  it("never offers transfer for SVD roots", () => {
    const menu = buildMemberMenuProps(member("SVD", "active"), FULL_PERMS, rowCb());
    expect(keysOf(menu)).toEqual(["deactivate"]);
  });

  it("hides transfer without the transfer right, with the OST label otherwise", () => {
    const noRight = buildMemberMenuProps(member("OST", "active"), { ...FULL_PERMS, canTransfer: false }, rowCb());
    expect(keysOf(noRight)).not.toContain("transfer");
    const ost = buildMemberMenuProps(member("OST", "active"), FULL_PERMS, rowCb());
    expect(ost.extraItems.find((item) => item.key === "transfer")?.label).toBe("Transfer to IST");
  });

  it("gates edit on the manage right", () => {
    expect(buildMemberMenuProps(member("SM", "active"), FULL_PERMS, rowCb()).onEdit).toBeDefined();
    expect(buildMemberMenuProps(member("SM", "active"), { ...FULL_PERMS, canManage: false }, rowCb()).onEdit).toBeUndefined();
  });

  it("offers set accreditation only with the edit right on a member with no record", () => {
    const menu = buildMemberMenuProps(member("OST", "active"), { ...FULL_PERMS, accreditationNone: true }, rowCb());
    expect(keysOf(menu)).toContain("set-accreditation");
    const hasRecord = buildMemberMenuProps(member("OST", "active"), FULL_PERMS, rowCb());
    expect(keysOf(hasRecord)).not.toContain("set-accreditation");
    const noRight = buildMemberMenuProps(member("OST", "active"), { ...FULL_PERMS, accreditationNone: true, canEditAccreditation: false }, rowCb());
    expect(keysOf(noRight)).not.toContain("set-accreditation");
  });

  it("offers renew only with the renew right and an open window", () => {
    const open = buildMemberMenuProps(member("SSM", "active"), { ...FULL_PERMS, renewalAllowed: true }, rowCb());
    expect(keysOf(open)).toContain("renew-accreditation");
    expect(keysOf(buildMemberMenuProps(member("SSM", "active"), FULL_PERMS, rowCb()))).not.toContain("renew-accreditation");
    const noRight = buildMemberMenuProps(member("SSM", "active"), { ...FULL_PERMS, renewalAllowed: true, canRenew: false }, rowCb());
    expect(keysOf(noRight)).not.toContain("renew-accreditation");
  });

  it("omits slots whose callbacks are not wired", () => {
    const menu = buildMemberMenuProps(member("SSM", "active"), FULL_PERMS, {});
    expect(menu.onView).toBeUndefined();
    expect(menu.onEdit).toBeUndefined();
    expect(menu.extraItems).toEqual([]);
  });

  it("exposes an identical action set to table and detail usages per status and role combo", () => {
    const designations: Designation[] = ["SVD", "SSM", "SM", "OST"];
    const statuses: MemberStatus[] = ["active", "inactive", "suspended"];
    const permSets: MemberMenuPerms[] = [
      // Super admin: every gate open, renewal window open, no accreditation record.
      { ...FULL_PERMS, accreditationNone: true, renewalAllowed: true },
      // Super admin with an existing record and an open renewal window.
      { ...FULL_PERMS, accreditationNone: false, renewalAllowed: true },
      // Administrator: reactivates and renews but cannot set accreditation.
      { ...FULL_PERMS, canEditAccreditation: false, accreditationNone: true, renewalAllowed: true },
      // Manager: manage and transfer only.
      { ...NO_PERMS, canManage: true, canTransfer: true },
      // Status officer: status changes with reactivation.
      { ...NO_PERMS, canChangeStatus: true, canReactivate: true },
      // Status officer without reactivation.
      { ...NO_PERMS, canChangeStatus: true, canReactivate: false },
      // No rights at all.
      { ...NO_PERMS },
      // Full rights but renewal window closed.
      { ...FULL_PERMS, accreditationNone: false, renewalAllowed: false },
    ];
    for (const designation of designations) {
      for (const status of statuses) {
        for (const perms of permSets) {
          const row = buildMemberMenuProps(member(designation, status), perms, rowCb());
          const detail = { ...buildMemberMenuProps(member(designation, status), perms, detailCb()), onView: undefined };
          expect(keysOf(detail)).toEqual(keysOf(row));
          expect(detail.extraItems.map((item) => item.label)).toEqual(row.extraItems.map((item) => item.label));
          expect(detail.extraItems.map((item) => item.danger ?? false)).toEqual(row.extraItems.map((item) => item.danger ?? false));
          expect(detail.onEdit === undefined).toBe(row.onEdit === undefined);
          expect(detail.onView).toBeUndefined();
          expect(detail.itemName).toBe(row.itemName);
        }
      }
    }
  });
});

describe("resolveRenewTarget", () => {
  it("opens renewal for an active approved record in the expiry month", () => {
    const { record: found, open } = resolveRenewTarget([record()], "2026-11-13");
    expect(found?.id).toBe("acc-1");
    expect(open).toBe(true);
  });

  it("holds papers received before the expiry month", () => {
    expect(resolveRenewTarget([record()], "2026-10-01").open).toBe(false);
  });

  it("stays open after the expiry month", () => {
    expect(resolveRenewTarget([record()], "2026-12-05").open).toBe(true);
  });

  it("never renews leavers, unapproved records, or records without an AA number or expiry", () => {
    expect(resolveRenewTarget([record({ adminStatus: "pending" })], "2026-11-13")).toEqual({ record: null, open: false });
    expect(resolveRenewTarget([record({ endDate: "2026-11-01" })], "2026-11-13")).toEqual({ record: null, open: false });
    expect(resolveRenewTarget([record({ aaNumber: null })], "2026-11-13")).toEqual({ record: null, open: false });
    expect(resolveRenewTarget([record({ expiryDate: null })], "2026-11-13")).toEqual({ record: null, open: false });
    expect(resolveRenewTarget([], "2026-11-13")).toEqual({ record: null, open: false });
    expect(resolveRenewTarget(undefined, "2026-11-13")).toEqual({ record: null, open: false });
  });
});
