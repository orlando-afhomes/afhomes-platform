import { describe, expect, it, vi } from "vitest";
import type { ReceiptImportBatch, ReceiptImportBatchStatus } from "@/modules/imports/receipt-import";
import { buildImportBatchMenuProps } from "./history-import-actions";

function batchWithStatus(status: ReceiptImportBatchStatus): ReceiptImportBatch {
  return {
    id: "B-001",
    fileName: "receipts.xlsx",
    createdAt: "2026-10-15",
    createdBy: "admin",
    status,
    totalRows: 2,
    receipts: [],
    skipped: [],
    decidedBy: null,
    decidedAt: null,
    decisionReason: null,
    selfSignedOff: false,
  };
}

const STATUSES: ReceiptImportBatchStatus[] = ["pending_signoff", "signed_off", "rejected"];

describe("buildImportBatchMenuProps", () => {
  it("names the menu after the batch", () => {
    const menu = buildImportBatchMenuProps(batchWithStatus("pending_signoff"), { canSignOff: true }, { onSignOff: () => {}, onReject: () => {} });
    expect(menu.itemName).toBe("batch B-001");
  });

  it("exposes no edit or delete entries", () => {
    const menu = buildImportBatchMenuProps(batchWithStatus("pending_signoff"), { canSignOff: true }, { onView: () => {}, onSignOff: () => {}, onReject: () => {} });
    expect(menu.onEdit).toBeUndefined();
    expect(menu.onDelete).toBeUndefined();
    expect(menu.deleteDisabledReason).toBeUndefined();
  });

  it.each(STATUSES)("table props and sheet footer props expose the identical action set for status %s (canSignOff true and false)", (status) => {
    for (const canSignOff of [true, false]) {
      const batch = batchWithStatus(status);
      const table = buildImportBatchMenuProps(batch, { canSignOff }, { onView: () => {}, onSignOff: () => {}, onReject: () => {} });
      const sheet = buildImportBatchMenuProps(batch, { canSignOff }, { onSignOff: () => {}, onReject: () => {} });
      expect(sheet.onView).toBeUndefined();
      expect(table.onView).toBeDefined();
      expect(sheet.extraItems.map((item) => item.key)).toEqual(table.extraItems.map((item) => item.key));
      expect(sheet.extraItems.map((item) => item.label)).toEqual(table.extraItems.map((item) => item.label));
      expect(sheet.extraItems.map((item) => item.danger ?? false)).toEqual(table.extraItems.map((item) => item.danger ?? false));
    }
  });

  it("offers sign-off and reject for a pending batch when the signer holds signoff permission", () => {
    const menu = buildImportBatchMenuProps(batchWithStatus("pending_signoff"), { canSignOff: true }, { onSignOff: () => {}, onReject: () => {} });
    expect(menu.extraItems.map((item) => item.key)).toEqual(["signoff", "reject"]);
    expect(menu.extraItems.find((item) => item.key === "reject")?.danger).toBe(true);
    expect(menu.extraItems.find((item) => item.key === "signoff")?.danger).toBeFalsy();
  });

  it("offers reject without sign-off for a pending batch when the signer lacks signoff permission (preserved gate quirk)", () => {
    const menu = buildImportBatchMenuProps(batchWithStatus("pending_signoff"), { canSignOff: false }, { onSignOff: () => {}, onReject: () => {} });
    expect(menu.extraItems.map((item) => item.key)).toEqual(["reject"]);
  });

  it("offers no actions for decided batches regardless of permission", () => {
    for (const status of ["signed_off", "rejected"] as const) {
      for (const canSignOff of [true, false]) {
        const menu = buildImportBatchMenuProps(batchWithStatus(status), { canSignOff }, { onSignOff: () => {}, onReject: () => {} });
        expect(menu.extraItems).toEqual([]);
      }
    }
  });

  it("wires the menu callbacks through to the page handlers", () => {
    const onView = vi.fn();
    const onSignOff = vi.fn();
    const onReject = vi.fn();
    const menu = buildImportBatchMenuProps(batchWithStatus("pending_signoff"), { canSignOff: true }, { onView, onSignOff, onReject });
    menu.onView?.();
    menu.extraItems.find((item) => item.key === "signoff")?.onClick();
    menu.extraItems.find((item) => item.key === "reject")?.onClick();
    expect(onView).toHaveBeenCalledTimes(1);
    expect(onSignOff).toHaveBeenCalledTimes(1);
    expect(onReject).toHaveBeenCalledTimes(1);
  });
});
