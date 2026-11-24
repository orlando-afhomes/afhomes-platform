import { Check, FileText, RotateCcw, X } from "lucide-react";
import { customerRecordName } from "@/modules/customers/rules";
import { canPrepareVipContract } from "@/modules/contracts/rules";
import { canReviewRegistration } from "@/modules/customers/review";
import type { Customer } from "@/modules/customers/types";
import type { RowActionItem } from "@/shared/components/modern/row-actions-menu";

export type CustomerMenuProps = {
  itemName: string;
  onEdit?: () => void;
  extraItems: RowActionItem[];
  onDelete?: () => void | Promise<unknown>;
  deleteTitle?: string;
  deleteDescription?: string;
  deleteDisabledReason?: string | null;
};

/**
 * Plain booleans the page already computes from `useOperation` and the record.
 * `ownRecord` is `!customer.restricted`. The customer may have several contracts.
 */
export type CustomerMenuPerms = {
  canManage: boolean;
  canDraft: boolean;
  canApprove: boolean;
  canPrepare: boolean;
  ownRecord: boolean;
};

/** Callbacks wired by the page; the bundle only plugs them into the gated slots. */
export type CustomerMenuCallbacks = {
  onEdit?: () => void;
  onDiscard?: () => void | Promise<unknown>;
  onApprove?: () => void;
  onSendBack?: () => void;
  onReject?: () => void;
  onOpenContract?: () => void;
  onPrepare?: () => void;
};

const DELETE_DESCRIPTION = "Only drafts can be discarded. Submitted, approved, sent back and rejected customers are never deleted.";

/**
 * Single source for the customer action set shared by the directory table menu
 * and the detail-page header buttons. The row opens the record, so there is no "view" item. Pure: no hooks, no JSX. Gates mirror the detail
 * page: edit needs ownership plus manage (or draft plus draft right) and never
 * applies to rejected records; review needs the approve right on a submitted
 * registration; the contract action needs the prepare right and opens the existing
 * purchase if present; discard needs ownership of a draft.
 */
export function buildCustomerMenuProps(
  customer: Pick<Customer, "displayName" | "status">,
  perms: CustomerMenuPerms,
  cb: CustomerMenuCallbacks,
): CustomerMenuProps {
  const itemName = customerRecordName(customer);
  const isDraft = customer.status === "draft";
  const canEdit = perms.ownRecord && (perms.canManage || (perms.canDraft && isDraft)) && customer.status !== "rejected";
  const canDelete = perms.ownRecord && isDraft && (perms.canManage || perms.canDraft);

  const extraItems: RowActionItem[] = [];
  if (perms.canApprove && canReviewRegistration(customer.status)) {
    if (cb.onApprove) extraItems.push({ key: "approve", label: "Approve", tone: "success", icon: Check, onClick: cb.onApprove });
    if (cb.onSendBack) extraItems.push({ key: "send-back", label: "Send Back", tone: "warning", icon: RotateCcw, onClick: cb.onSendBack });
    if (cb.onReject) extraItems.push({ key: "reject", label: "Reject", tone: "danger", icon: X, onClick: cb.onReject });
  }
  if (perms.canPrepare && perms.ownRecord) {
    if (cb.onOpenContract) {
      extraItems.push({ key: "open-contract", label: "Open Contract", icon: FileText, onClick: cb.onOpenContract });
    } else if (cb.onPrepare && canPrepareVipContract(customer.status)) {
      extraItems.push({ key: "prepare-contract", label: "Prepare Contract", icon: FileText, onClick: cb.onPrepare });
    }
  }

  return {
    itemName,
    onEdit: canEdit && cb.onEdit ? cb.onEdit : undefined,
    extraItems,
    onDelete: canDelete && cb.onDiscard ? cb.onDiscard : undefined,
    deleteTitle: `Discard the draft for ${itemName}?`,
    deleteDescription: DELETE_DESCRIPTION,
  };
}
