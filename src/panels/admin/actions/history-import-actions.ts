import type { RowActionItem } from "@/shared/components/modern/row-actions-menu";
import type { ReceiptImportBatch } from "@/modules/imports/receipt-import";

export type ImportBatchMenuProps = { itemName: string; onView?: () => void; onEdit?: () => void; extraItems: RowActionItem[]; onDelete?: () => void | Promise<unknown>; deleteTitle?: string; deleteDescription?: string; deleteDisabledReason?: string | null; };

/** Gates mirrored from the batches table: history-import.manage guards the panel, history-import.signoff guards sign-off. */
export type ImportBatchPerms = { canSignOff: boolean; };

/** Handlers mirrored from the batches table: sign-off runs the shared sign-off confirm, reject opens the shared RejectDialog. */
export type ImportBatchCallbacks = { onView?: () => void; onSignOff: () => void; onReject: () => void; };

/**
 * Pure action bundle for a historical receipt-import batch. No hooks, no JSX.
 * Used by the batches table row menu and the batch detail sheet footer so both
 * surfaces expose the identical action set: View, Sign off batch (key
 * `signoff`, only for pending batches when the signer holds
 * history-import.signoff), and Reject batch (key `reject`, danger, only for
 * pending batches). NOTE: Reject intentionally carries no signoff-permission
 * check, preserving the table's long-standing behavior exactly.
 */
export function buildImportBatchMenuProps(batch: ReceiptImportBatch, perms: ImportBatchPerms, cb: ImportBatchCallbacks): ImportBatchMenuProps {
  const extraItems: RowActionItem[] =
    batch.status !== "pending_signoff"
      ? []
      : [
          ...(perms.canSignOff ? [{ key: "signoff", label: "Sign off batch", onClick: cb.onSignOff }] : []),
          { key: "reject", label: "Reject batch", danger: true, onClick: cb.onReject },
        ];
  return { itemName: `batch ${batch.id}`, onView: cb.onView, extraItems };
}
