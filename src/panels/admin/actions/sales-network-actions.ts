import { getCurrentAccreditationRecord } from "@/modules/accreditation/eligibility";
import { isRenewalAllowed, manilaToday } from "@/modules/accreditation/dates";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import type { Designation, OrgMember } from "@/modules/organization/types";
import type { RowActionItem } from "@/shared/components/modern/row-actions-menu";

export type MemberMenuProps = {
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
 * Plain booleans the page already computes from the identity and the record.
 * `accreditationNone` is `resolveAccreditationDisplay(records).kind === "none"`;
 * `renewalAllowed` is the `open` flag from `resolveRenewTarget(records)`.
 */
export type MemberMenuPerms = {
  canManage: boolean;
  canTransfer: boolean;
  canChangeStatus: boolean;
  canReactivate: boolean;
  canEditAccreditation: boolean;
  canRenew: boolean;
  accreditationNone: boolean;
  renewalAllowed: boolean;
};

/** Callbacks wired by the page; the bundle only plugs them into the gated slots. */
export type MemberMenuCallbacks = {
  onView?: () => void;
  onEdit?: () => void;
  onTransfer?: () => void;
  onChangeStatus?: () => void;
  onSetAccreditation?: () => void;
  onRenew?: () => void;
  onDelete?: () => void | Promise<unknown>;
  deleteTitle?: string;
  deleteDescription?: string;
  deleteDisabledReason?: string | null;
};

/** Transfer target label mirrors the members table: an OST moves to IST, anything else moves to OST. */
export function transferLabelFor(designation: Designation): string {
  return designation === "OST" ? "Transfer to IST" : "Transfer to OST";
}

/**
 * Renewal availability mirroring AccreditationRenewAction's record gate
 * (doc 03 section 5.2.2: leavers and unapproved records are never renewed)
 * plus the canonical `isRenewalAllowed` timing rule. Pages pass the `open`
 * flag into `buildMemberMenuProps` as `renewalAllowed` so the rule logic is
 * not duplicated in each caller.
 */
export function resolveRenewTarget(
  records: readonly AccreditationRecord[] | undefined,
  today: string = manilaToday(),
): { record: AccreditationRecord | null; open: boolean } {
  const record = getCurrentAccreditationRecord(records ?? []);
  if (!record || record.adminStatus !== "active" || record.endDate || !record.aaNumber || !record.expiryDate) {
    return { record: null, open: false };
  }
  return { record, open: isRenewalAllowed(record.expiryDate, today) };
}

/**
 * Single source for the member action set shared by the members table menu
 * and the member detail-page kebab. Pure: no hooks, no JSX. Gates mirror the
 * members table: edit needs the manage right; transfer needs the transfer
 * right and never applies to SVD roots; the status toggle needs the status
 * right, and reactivation additionally needs an admin role; set accreditation
 * needs the super-admin edit right on a member with no record; renew needs
 * the admin renew right with an open renewal window.
 */
export function buildMemberMenuProps(
  member: Pick<OrgMember, "displayName" | "designation" | "status">,
  perms: MemberMenuPerms,
  cb: MemberMenuCallbacks,
): MemberMenuProps {
  const extraItems: RowActionItem[] = [];
  if (perms.canTransfer && member.designation !== "SVD" && cb.onTransfer) {
    extraItems.push({ key: "transfer", label: transferLabelFor(member.designation), onClick: cb.onTransfer });
  }
  if (perms.canChangeStatus && (member.status === "active" || perms.canReactivate) && cb.onChangeStatus) {
    const reactivate = member.status !== "active";
    extraItems.push({
      key: reactivate ? "reactivate" : "deactivate",
      label: reactivate ? "Reactivate" : "Deactivate",
      danger: !reactivate,
      onClick: cb.onChangeStatus,
    });
  }
  if (perms.canEditAccreditation && perms.accreditationNone && cb.onSetAccreditation) {
    extraItems.push({ key: "set-accreditation", label: "Set accreditation", onClick: cb.onSetAccreditation });
  }
  if (perms.canRenew && perms.renewalAllowed && cb.onRenew) {
    extraItems.push({ key: "renew-accreditation", label: "Renew accreditation", onClick: cb.onRenew });
  }

  return {
    itemName: member.displayName,
    onView: cb.onView,
    onEdit: perms.canManage && cb.onEdit ? cb.onEdit : undefined,
    extraItems,
    onDelete: cb.onDelete,
    deleteTitle: cb.deleteTitle,
    deleteDescription: cb.deleteDescription,
    deleteDisabledReason: cb.deleteDisabledReason,
  };
}
