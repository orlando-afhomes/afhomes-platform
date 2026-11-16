import type { AuditEventView, AuditModule } from "@/modules/audit/types";

/**
 * Brand-new-record audit actions per module. Only these actions drive the red
 * navlink badges; every other audit action appears solely in the bell list.
 * Locked content: extend only with explicit owner authorization.
 */
export const CREATION_ACTIONS: Readonly<Record<AuditModule, readonly string[]>> = {
  organization: ["ACCOUNT_CREATED", "STAFF_CREATED", "ROLE_CREATED", "DEPARTMENT_CREATED", "REFERENCE_ENTRY_CREATED", "OUTLET_CREATED"],
  "sales-network": ["MEMBER_CREATED", "SELLER_CREATED"],
  accreditation: ["ACCREDITATION_ISSUED", "REGISTRATION_SUBMITTED", "JAD_ACCREDITATION_RECORDED"],
  customers: ["CUSTOMER_DRAFT_CREATED", "CUSTOMER_SUBMITTED", "CUSTOMER_IMPORT_COMPLETED"],
  "vip-products": ["PRODUCT_CREATED", "PAYMENT_SCHEME_CREATED", "TIER_LEVEL_CREATED"],
  contracts: ["CONTRACT_PREPARED", "CONTRACT_RA_RECORDED"],
  finance: ["PAYMENT_SUBMITTED", "RECEIPT_IMPORT_CREATED", "MONTH_CLOSED"],
  sales: ["SALE_RECORDED", "IGP_SERIES_ISSUED", "IGP_PROJECT_CREATED", "IGP_UNIT_CREATED"],
  commissions: ["COMMISSION_RELEASED", "COMMISSION_POSITION_RATE_APPLIED", "COMMISSION_PAYOUT_LIST_PREPARED", "COMMISSION_CLAWBACK_RAISED"],
  membership: ["MEMBERSHIP_CREATED"],
  "stay-points": [
    "RESORT_BILL_ENTERED",
    "REDEMPTION_BOOKING_CREATED",
    "REDEMPTION_TABLE_VERSION_PUBLISHED",
    "REDEMPTION_HOLIDAY_ADDED",
    "COMPASSIONATE_WAIVER_REQUESTED",
    "PROMO_CREATED",
    "PROMO_POINTS_EARNED",
    "PROMO_POINTS_USED",
  ],
} as const;

/** True when the event records a brand-new record in its module. */
export function isCreationEvent(module: AuditModule, action: string): boolean {
  return CREATION_ACTIONS[module]?.includes(action) ?? false;
}

/** First-time rate setup shares an audit action with edits to an existing rate. */
export function isNotificationBadgeEvent(event: Pick<AuditEventView, "module" | "action" | "previousValue">): boolean {
  return isCreationEvent(event.module, event.action) || (
    event.module === "commissions" && event.previousValue === null &&
    (event.action === "COMMISSION_RATE_SET" || event.action === "COMMISSION_POSITION_RATE_SET")
  );
}
