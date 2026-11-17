import type { BookingView } from "@/data/contracts/redemption-repository";
import type { RowActionItem } from "@/shared/components/modern/row-actions-menu";

export type RedemptionBookingMenuProps = {
  itemName: string;
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
  onApproveCash?: () => void;
  onCheckIn?: () => void | Promise<unknown>;
  onComplete?: () => void | Promise<unknown>;
  onNoShow?: () => void;
  onCancel?: () => void;
};

/**
 * Single source for the redemption booking action set shared by the bookings
 * table menu and the booking detail sheet footer. Pure: no hooks, no JSX.
 * Gates mirror the sheet footer: approve needs the finance verify right on a
 * pending-payment booking. Office staff can check in, cancel or mark a pending
 * arrival as a no-show. After check-in, the only action is completion.
 */
export function buildRedemptionBookingMenuProps(
  booking: Pick<BookingView, "reference" | "status" | "checkedIn">,
  perms: RedemptionBookingMenuPerms,
  cb: RedemptionBookingMenuCallbacks,
): RedemptionBookingMenuProps {
  const extraItems: RowActionItem[] = [];
  if (perms.canApprove && booking.status === "pending_payment" && cb.onApproveCash) {
    extraItems.push({ key: "approve-cash", label: "Approve Money Part", tone: "success", onClick: cb.onApproveCash });
  }
  if (perms.canBook && booking.status === "confirmed") {
    if (!booking.checkedIn && cb.onCheckIn) extraItems.push({ key: "check-in", label: "Record Check-In", tone: "success", onClick: cb.onCheckIn });
    if (booking.checkedIn && cb.onComplete) extraItems.push({ key: "complete", label: "Complete Stay", tone: "success", onClick: cb.onComplete });
  }
  if (perms.canBook && booking.status === "confirmed" && !booking.checkedIn && cb.onNoShow) {
    extraItems.push({ key: "no-show", label: "Record No-Show", tone: "warning", onClick: cb.onNoShow });
  }
  if (perms.canBook && (booking.status === "pending_payment" || booking.status === "confirmed") && !booking.checkedIn && cb.onCancel) {
    extraItems.push({ key: "cancel", label: "Cancel Booking", tone: "danger", danger: true, onClick: cb.onCancel });
  }

  return {
    itemName: booking.reference,
    extraItems,
  };
}
