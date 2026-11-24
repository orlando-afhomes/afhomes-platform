import { describe, expect, it, vi } from "vitest";
import type { BookingView } from "@/data/contracts/redemption-repository";
import type { BookingStatus } from "@/modules/redemption/types";
import {
  buildRedemptionBookingMenuProps,
  type RedemptionBookingMenuCallbacks,
  type RedemptionBookingMenuPerms,
} from "./redemption-actions";

function booking(status: BookingStatus): Pick<BookingView, "reference" | "status"> {
  return { reference: "BK-001", status } as Pick<BookingView, "reference" | "status">;
}

function fullCb(): Required<Pick<RedemptionBookingMenuCallbacks, "onApproveCash" | "onCheckIn" | "onComplete" | "onNoShow" | "onCancel">> {
  return {
    onApproveCash: vi.fn(),
    onCheckIn: vi.fn(),
    onComplete: vi.fn(),
    onNoShow: vi.fn(),
    onCancel: vi.fn(),
  };
}

/** Sheet footer props: same bundle of callbacks as the row menu. */
function sheetCb(): RedemptionBookingMenuCallbacks {
  return fullCb();
}

function keysOf(props: { extraItems: { key: string }[] }): string[] {
  return props.extraItems.map((item) => item.key);
}

const PERMS: Record<string, RedemptionBookingMenuPerms> = {
  none: { canBook: false, canApprove: false },
  bookOnly: { canBook: true, canApprove: false },
  approveOnly: { canBook: false, canApprove: true },
  full: { canBook: true, canApprove: true },
};

describe("buildRedemptionBookingMenuProps", () => {
  it("offers approve plus cancel on pending_payment with full rights", () => {
    const menu = buildRedemptionBookingMenuProps(booking("pending_payment"), PERMS.full, fullCb());
    expect(menu.itemName).toBe("BK-001");
    expect(keysOf(menu)).toEqual(["approve-cash", "cancel"]);
    expect(menu.extraItems.map((item) => item.label)).toEqual(["Approve Payment", "Cancel Booking"]);
    expect(menu.onEdit).toBeUndefined();
    expect(menu.onDelete).toBeUndefined();
  });

  it("offers check-in, no-show and cancel on confirmed with the book right", () => {
    const menu = buildRedemptionBookingMenuProps(booking("confirmed"), PERMS.bookOnly, fullCb());
    expect(keysOf(menu)).toEqual(["check-in", "no-show", "cancel"]);
    expect(menu.extraItems.find((item) => item.key === "cancel")?.danger).toBe(true);
    expect(menu.extraItems.find((item) => item.key === "check-in")?.danger ?? false).toBe(false);
    expect(menu.extraItems.map((item) => item.tone)).toEqual(["success", "warning", "danger"]);
  });

  it("offers only completion once the holder checks in", () => {
    const stay = { ...booking("confirmed"), checkedIn: { date: "2026-11-17", actorId: "staff", holder: "primary", identityChecked: true } } as const;
    expect(keysOf(buildRedemptionBookingMenuProps(stay, PERMS.full, fullCb()))).toEqual(["complete"]);
  });

  it("gates approve on the finance verify right and pending_payment status", () => {
    expect(keysOf(buildRedemptionBookingMenuProps(booking("pending_payment"), PERMS.bookOnly, fullCb()))).toEqual(["cancel"]);
    expect(keysOf(buildRedemptionBookingMenuProps(booking("confirmed"), PERMS.approveOnly, fullCb()))).toEqual([]);
    expect(keysOf(buildRedemptionBookingMenuProps(booking("confirmed"), PERMS.full, fullCb()))).not.toContain("approve-cash");
  });

  it("gates complete, no-show and cancel on the book right", () => {
    expect(keysOf(buildRedemptionBookingMenuProps(booking("confirmed"), PERMS.approveOnly, fullCb()))).toEqual([]);
    expect(keysOf(buildRedemptionBookingMenuProps(booking("pending_payment"), PERMS.approveOnly, fullCb()))).toEqual(["approve-cash"]);
  });

  it("exposes no actions on terminal statuses", () => {
    for (const status of ["completed", "cancelled", "no_show", "late_cancelled", "transfer_cancelled"] as const) {
      expect(keysOf(buildRedemptionBookingMenuProps(booking(status), PERMS.full, fullCb()))).toEqual([]);
    }
  });

  it("omits slots whose callbacks are not wired", () => {
    const menu = buildRedemptionBookingMenuProps(booking("confirmed"), PERMS.full, {});
    expect("onView" in menu).toBe(false);
    expect(menu.extraItems).toEqual([]);
  });

  it("exposes an identical action set to row and sheet-footer usages across statuses and permission combos", () => {
    const statuses: BookingStatus[] = ["pending_payment", "confirmed", "completed", "cancelled", "no_show"];
    for (const status of statuses) {
      for (const perms of Object.values(PERMS)) {
        const row = buildRedemptionBookingMenuProps(booking(status), perms, fullCb());
        const sheet = buildRedemptionBookingMenuProps(booking(status), perms, sheetCb());
        expect(keysOf(sheet)).toEqual(keysOf(row));
        expect(sheet.extraItems.map((item) => item.label)).toEqual(row.extraItems.map((item) => item.label));
        expect(sheet.extraItems.map((item) => item.danger ?? false)).toEqual(row.extraItems.map((item) => item.danger ?? false));
        expect(sheet.itemName).toBe(row.itemName);
      }
    }
  });
});
