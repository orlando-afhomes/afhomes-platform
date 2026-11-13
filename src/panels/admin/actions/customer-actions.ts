import { customerRecordName } from "@/modules/customers/rules";
import { canReviewRegistration } from "@/modules/customers/review";
import type { Customer } from "@/modules/customers/types";
import type { RowActionItem } from "@/shared/components/modern/row-actions-menu";

export type CustomerMenuProps = {
  itemName: string;
  onView?: () => void;
  onEdit?: () => void;
  extraItems: RowActionItem[];
  onDelete?: () => void | Promise<unknown>;
  deleteTitle?: string;
  deleteDescription?: string;
  deleteDisabledReason?: string | null;
};

/**
 * Plain booleans the page already computes from `useOperation` and the record.
 * `ownRecord` is `!customer.restricted`; `hasContract` is whether a
 * non-cancelled contract already exists for the customer.
 */
export type CustomerMenuPerms = {
  canManage: boolean;
  canDraft: boolean;
  canApprove: boolean;
  canPrepare: boolean;
  ownRecord: boolean;
  hasContract?: boolean;
};

/** Callbacks wired by the page; the bundle only plugs them into the gated slots. */
export type CustomerMenuCallbacks = {
  onView?: () => void;
  onEdit?: () => void;
  onDiscard?: () => void | Promise<unknown>;
  onApprove?: () => void;
  onSendBack?: () => void;
  onReject?: () => void;
  onPrepare?: () => void;
};

const DELETE_DESCRIPTION = "Only drafts can be discarded. Submitted, approved, sent back and rejected customers are never deleted.";

/**
 * Single source for the customer action set shared by the directory table menu
 * and the detail-page kebab. Pure: no hooks, no JSX. Gates mirror the detail
 * page: edit needs ownership plus manage (or draft plus draft right) and never
 * applies to rejected records; review needs the approve right on a submitted
 * registration; prepare needs the prepare right on a submitted or approved
 * record with no contract yet; discard needs ownership of a draft.
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
    if (cb.onApprove) extraItems.push({ key: "approve", label: "Approve", onClick: cb.onApprove });
    if (cb.onSendBack) extraItems.push({ key: "send-back", label: "Send back", onClick: cb.onSendBack });
    if (cb.onReject) extraItems.push({ key: "reject", label: "Reject", danger: true, onClick: cb.onReject });
  }
  if (
    perms.canPrepare &&
    perms.ownRecord &&
    (customer.status === "submitted" || customer.status === "approved") &&
    !perms.hasContract &&
    cb.onPrepare
  ) {
    extraItems.push({ key: "prepare-contract", label: "Prepare contract", onClick: cb.onPrepare });
  }

  return {
    itemName,
    onView: cb.onView,
    onEdit: canEdit && cb.onEdit ? cb.onEdit : undefined,
    extraItems,
    onDelete: canDelete && cb.onDiscard ? cb.onDiscard : undefined,
    deleteTitle: `Discard the draft for ${itemName}?`,
    deleteDescription: DELETE_DESCRIPTION,
  };
}
