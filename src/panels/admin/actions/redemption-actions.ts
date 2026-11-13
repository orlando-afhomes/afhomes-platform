import type { BookingView } from "@/data/contracts/redemption-repository";
import type { RowActionItem } from "@/shared/components/modern/row-actions-menu";

export type RedemptionBookingMenuProps = {
  itemName: string;
  onView?: () => void;
  onEdit?: () => void;
  extraItems: RowActionItem[];
  onDelete?: () => void | Promise<unknown>;
  deleteTitle?: string;
  deleteDescription?: string;
  deleteDisabledReason?: string | null;
};

/** Plain booleans the page already computes from `useOperation`. Status gates come from the booking itself. */
export type RedemptionBookingMenuPerms = {
  canBook: boolean;
  canApprove: boolean;
};

/** Callbacks wired by the page; the bundle only plugs them into the gated slots. */
export type RedemptionBookingMenuCallbacks = {
  onView?: () => void;
  onApproveCash?: () => void;
  onComplete?: () => void | Promise<unknown>;
  onNoShow?: () => void;
  onCancel?: () => void;
};

/**
 * Single source for the redemption booking action set shared by the bookings
 * table menu and the booking detail sheet footer. Pure: no hooks, no JSX.
 * Gates mirror the sheet footer: approve needs the finance verify right on a
 * pending-payment booking; complete and no-show need the book right on a
 * confirmed booking; cancel needs the book right on an open booking
 * (pending payment or confirmed). Terminal bookings expose no actions.
 */
export function buildRedemptionBookingMenuProps(
  booking: Pick<BookingView, "reference" | "status">,
  perms: RedemptionBookingMenuPerms,
  cb: RedemptionBookingMenuCallbacks,
): RedemptionBookingMenuProps {
  const extraItems: RowActionItem[] = [];
  if (perms.canApprove && booking.status === "pending_payment" && cb.onApproveCash) {
    extraItems.push({ key: "approve-cash", label: "Approve money part", onClick: cb.onApproveCash });
  }
  if (perms.canBook && booking.status === "confirmed" && cb.onComplete) {
    extraItems.push({ key: "complete", label: "Record check-in", onClick: cb.onComplete });
  }
  if (perms.canBook && booking.status === "confirmed" && cb.onNoShow) {
    extraItems.push({ key: "no-show", label: "Record no-show", onClick: cb.onNoShow });
  }
  if (perms.canBook && (booking.status === "pending_payment" || booking.status === "confirmed") && cb.onCancel) {
    extraItems.push({ key: "cancel", label: "Cancel booking", danger: true, onClick: cb.onCancel });
  }

  return {
    itemName: booking.reference,
    onView: cb.onView,
    extraItems,
  };
}
