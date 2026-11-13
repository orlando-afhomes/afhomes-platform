import { describe, expect, it, vi } from "vitest";
import type { Customer } from "@/modules/customers/types";
import { buildCustomerMenuProps, type CustomerMenuCallbacks, type CustomerMenuPerms } from "./customer-actions";

type Status = Customer["status"];

function customer(status: Status, restricted = false): Customer {
  return {
    id: `c-${status}${restricted ? "-r" : ""}`,
    displayName: "Juan Dela Cruz",
    branchId: "b1",
    ownerMemberId: "m1",
    status,
    restricted,
  };
}

const FULL_PERMS: CustomerMenuPerms = { canManage: true, canDraft: true, canApprove: true, canPrepare: true, ownRecord: true };

function rowCb(): CustomerMenuCallbacks {
  return {
    onView: vi.fn(),
    onEdit: vi.fn(),
    onDiscard: vi.fn(),
    onApprove: vi.fn(),
    onSendBack: vi.fn(),
    onReject: vi.fn(),
    onPrepare: vi.fn(),
  };
}

function detailCb(): CustomerMenuCallbacks {
  return {
    onEdit: vi.fn(),
    onDiscard: vi.fn(),
    onApprove: vi.fn(),
    onSendBack: vi.fn(),
    onReject: vi.fn(),
    onPrepare: vi.fn(),
  };
}

function keysOf(props: { extraItems: { key: string }[] }): string[] {
  return props.extraItems.map((item) => item.key);
}

describe("buildCustomerMenuProps", () => {
  it("exposes discard and edit for an owned draft, with no review or prepare items", () => {
    const menu = buildCustomerMenuProps(customer("draft"), FULL_PERMS, rowCb());
    expect(menu.itemName).toBe("Juan Dela Cruz");
    expect(menu.onView).toBeDefined();
    expect(menu.onEdit).toBeDefined();
    expect(menu.onDelete).toBeDefined();
    expect(menu.extraItems).toEqual([]);
    expect(menu.deleteTitle).toBe("Discard the draft for Juan Dela Cruz?");
    expect(menu.deleteDescription).toBe(
      "Only drafts can be discarded. Submitted, approved, sent back and rejected customers are never deleted.",
    );
  });

  it("gates edit and discard on ownership and rights", () => {
    // Restricted (downline summary) view: nothing editable.
    const restricted = buildCustomerMenuProps(customer("draft", true), { ...FULL_PERMS, ownRecord: false }, rowCb());
    expect(restricted.onEdit).toBeUndefined();
    expect(restricted.onDelete).toBeUndefined();
    // No rights at all: no edit, no discard, even on an owned draft.
    const none = buildCustomerMenuProps(customer("draft"), { canManage: false, canDraft: false, canApprove: false, canPrepare: false, ownRecord: true }, rowCb());
    expect(none.onEdit).toBeUndefined();
    expect(none.onDelete).toBeUndefined();
    // Draft right alone still edits and discards an owned draft.
    const clerk = buildCustomerMenuProps(
      customer("draft"),
      { canManage: false, canDraft: true, canApprove: false, canPrepare: false, ownRecord: true },
      rowCb(),
    );
    expect(clerk.onEdit).toBeDefined();
    expect(clerk.onDelete).toBeDefined();
  });

  it("never offers edit or discard on a rejected record", () => {
    const menu = buildCustomerMenuProps(customer("rejected"), FULL_PERMS, rowCb());
    expect(menu.onEdit).toBeUndefined();
    expect(menu.onDelete).toBeUndefined();
    expect(menu.extraItems).toEqual([]);
  });

  it("offers approve, send back and reject (reject danger) on submitted with the approve right", () => {
    const menu = buildCustomerMenuProps(
      customer("submitted"),
      { canManage: false, canDraft: false, canApprove: true, canPrepare: false, ownRecord: true },
      rowCb(),
    );
    expect(keysOf(menu)).toEqual(["approve", "send-back", "reject"]);
    expect(menu.extraItems.map((item) => item.label)).toEqual(["Approve", "Send back", "Reject"]);
    expect(menu.extraItems.map((item) => item.danger ?? false)).toEqual([false, false, true]);
    expect(menu.onEdit).toBeUndefined();
    expect(menu.onDelete).toBeUndefined();
  });

  it("hides review items without the approve right or off submitted status", () => {
    const noRight = buildCustomerMenuProps(customer("submitted"), { ...FULL_PERMS, canApprove: false }, rowCb());
    expect(keysOf(noRight)).toEqual(["prepare-contract"]);
    for (const status of ["draft", "approved", "sent_back", "rejected"] as const) {
      expect(keysOf(buildCustomerMenuProps(customer(status), FULL_PERMS, rowCb()))).not.toContain("approve");
    }
  });

  it("gates prepare contract on submitted/approved, ownership, the prepare right and no existing contract", () => {
    const submitted = buildCustomerMenuProps(customer("submitted"), FULL_PERMS, rowCb());
    expect(keysOf(submitted)).toEqual(["approve", "send-back", "reject", "prepare-contract"]);
    const approved = buildCustomerMenuProps(customer("approved"), FULL_PERMS, rowCb());
    expect(keysOf(approved)).toEqual(["prepare-contract"]);
    const withContract = buildCustomerMenuProps(customer("submitted"), { ...FULL_PERMS, hasContract: true }, rowCb());
    expect(keysOf(withContract)).toEqual(["approve", "send-back", "reject"]);
    const restricted = buildCustomerMenuProps(customer("submitted", true), { ...FULL_PERMS, ownRecord: false }, rowCb());
    expect(keysOf(restricted)).not.toContain("prepare-contract");
    const noRight = buildCustomerMenuProps(customer("submitted"), { ...FULL_PERMS, canPrepare: false }, rowCb());
    expect(keysOf(noRight)).not.toContain("prepare-contract");
  });

  it("omits slots whose callbacks are not wired", () => {
    const menu = buildCustomerMenuProps(customer("submitted"), FULL_PERMS, {});
    expect(menu.onView).toBeUndefined();
    expect(menu.onEdit).toBeUndefined();
    expect(menu.onDelete).toBeUndefined();
    expect(menu.extraItems).toEqual([]);
  });

  it("exposes an identical action set to row and detail usages across statuses, restrictions and permission combos", () => {
    const statuses: Status[] = ["draft", "submitted", "approved", "sent_back", "rejected"];
    const permSets: CustomerMenuPerms[] = [
      { canManage: true, canDraft: false, canApprove: false, canPrepare: false, ownRecord: true },
      { canManage: false, canDraft: true, canApprove: false, canPrepare: false, ownRecord: true },
      { canManage: false, canDraft: false, canApprove: true, canPrepare: false, ownRecord: true },
      { canManage: false, canDraft: false, canApprove: false, canPrepare: true, ownRecord: true },
      { ...FULL_PERMS },
      { ...FULL_PERMS, hasContract: true },
      { ...FULL_PERMS, ownRecord: false },
      { canManage: false, canDraft: false, canApprove: false, canPrepare: false, ownRecord: true },
    ];
    for (const status of statuses) {
      for (const restricted of [false, true]) {
        for (const perms of permSets) {
          const effective: CustomerMenuPerms = { ...perms, ownRecord: perms.ownRecord && !restricted };
          const row = buildCustomerMenuProps(customer(status, restricted), effective, rowCb());
          const detail = { ...buildCustomerMenuProps(customer(status, restricted), effective, detailCb()), onView: undefined };
          expect(keysOf(detail)).toEqual(keysOf(row));
          expect(detail.extraItems.map((item) => item.label)).toEqual(row.extraItems.map((item) => item.label));
          expect(detail.extraItems.map((item) => item.danger ?? false)).toEqual(row.extraItems.map((item) => item.danger ?? false));
          expect(detail.onEdit === undefined).toBe(row.onEdit === undefined);
          expect(detail.onDelete === undefined).toBe(row.onDelete === undefined);
          expect(detail.onView).toBeUndefined();
          expect(detail.itemName).toBe(row.itemName);
          expect(detail.deleteTitle).toBe(row.deleteTitle);
        }
      }
    }
  });
});
