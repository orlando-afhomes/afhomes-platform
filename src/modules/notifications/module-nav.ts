import { ADMIN_AREA_TABS, type AdminAreaKey, type AdminNavKey } from "@/panels/admin/navigation";
import type { AuditEventView, AuditModule } from "@/modules/audit/types";

/**
 * One visible sidebar key per audit module (the flat area list, owner ruling
 * 2026-11-15). A module's badge renders on this key; several modules may share
 * an area. The hidden accounts entry is never a primary, because it has no
 * rendered navlink to badge.
 */
export const MODULE_PRIMARY_NAV: Readonly<Record<AuditModule, AdminAreaKey>> = {
  organization: "organization",
  "sales-network": "sales-network",
  accreditation: "sales-network",
  customers: "customers",
  "vip-products": "vip-products",
  contracts: "sales",
  finance: "finance",
  sales: "sales",
  commissions: "commissions",
  membership: "membership",
  "stay-points": "stay-points",
} as const;

/**
 * The area tab each module's events open on (a `?tab=` value of
 * `ADMIN_AREA_TABS[MODULE_PRIMARY_NAV[module]]`). The tab's access rule is the
 * former page's rule, so notification visibility stays per module.
 */
export const MODULE_PRIMARY_TAB: Readonly<Record<AuditModule, string>> = {
  organization: "staff",
  "sales-network": "members",
  accreditation: "registrations",
  customers: "customers",
  "vip-products": "products",
  contracts: "contracts",
  finance: "verification",
  sales: "sales",
  commissions: "commissions",
  membership: "memberships",
  "stay-points": "welcome-gift",
} as const satisfies Readonly<Record<AuditModule, string>>;

type NotificationDestination = { area: AdminAreaKey; tab: string };

/** Events owned by a more specific tab than the audit module's default view. */
const ACTION_TABS: Partial<Record<AuditModule, Readonly<Record<string, string>>>> = {
  organization: {
    DEPARTMENT_CREATED: "departments", DEPARTMENT_UPDATED: "departments", DEPARTMENT_STATUS_CHANGED: "departments",
    ROLE_CREATED: "roles", ROLE_UPDATED: "roles", ROLE_DELETED: "roles",
    REFERENCE_ENTRY_CREATED: "lists", REFERENCE_ENTRY_UPDATED: "lists", REFERENCE_ENTRY_DELETED: "lists",
    OUTLET_CREATED: "lists", OUTLET_UPDATED: "lists", OUTLET_DELETED: "lists",
  },
  customers: { CUSTOMER_IMPORT_COMPLETED: "import-export", CUSTOMERS_EXPORTED: "import-export" },
  "vip-products": {
    PAYMENT_SCHEME_CREATED: "schemes", PAYMENT_SCHEME_UPDATED: "schemes",
    TIER_LEVEL_CREATED: "tier-codes", TIER_LEVEL_UPDATED: "tier-codes", TIER_LEVEL_DEACTIVATED: "tier-codes",
    TIER_LEVEL_REACTIVATED: "tier-codes", TIER_LEVEL_DELETED: "tier-codes",
  },
  finance: {
    RECEIPT_IMPORT_CREATED: "historical-import", RECEIPT_IMPORT_SIGNED_OFF: "historical-import", RECEIPT_IMPORT_REJECTED: "historical-import",
    MONTH_CLOSED: "month-end-close", RECONCILIATION_SIGNED_OFF: "reconciliation", RECONCILIATION_VARIANCE_EXPLAINED: "reconciliation",
    FINANCIAL_HOLD_APPLIED: "collections", FINANCIAL_HOLD_RELEASED: "collections",
  },
  sales: { IGP_SERIES_ISSUED: "igp", IGP_PROJECT_CREATED: "igp-projects", IGP_UNIT_CREATED: "igp-projects" },
  commissions: {
    COMMISSION_POSITION_RATE_SET: "rates", COMMISSION_POSITION_RATE_APPLIED: "rates", COMMISSION_RATE_SET: "rates",
    // Payout list and payout events open the default Commissions tab, which hosts the payout bar.
    COMMISSION_CLAWBACK_RAISED: "recovery", COMMISSION_CLAWBACK_RECOVERED: "recovery", COMMISSION_CLAWBACK_WRITTEN_OFF: "recovery",
    COMMISSION_ALLOWANCE_REVIEWED: "allowances",
  },
  membership: { MEMBERSHIP_CREATED: "activation" },
  "stay-points": {
    RESORT_BILL_ENTERED: "resort-bills", RESORT_BILL_APPROVED: "resort-bills", RESORT_BILL_REFUNDED: "resort-bills",
    COMPASSIONATE_WAIVER_REQUESTED: "waivers", COMPASSIONATE_WAIVER_GRANTED: "waivers", COMPASSIONATE_WAIVER_REFUSED: "waivers",
    PROMO_CREATED: "promos", PROMO_UPDATED: "promos", PROMO_ENDED: "promos", PROMO_DELETED: "promos",
    PROMO_POINTS_EARNED: "promo-points", PROMO_POINTS_EARN_REVERSED: "promo-points",
    PROMO_POINTS_USED: "promo-points", PROMO_POINTS_USE_VOIDED: "promo-points",
  },
};

const REDEMPTION_DESTINATIONS: Readonly<Record<string, string>> = {
  REDEMPTION_BOOKING_CREATED: "bookings",
  REDEMPTION_TABLE_VERSION_PUBLISHED: "points-table",
  REDEMPTION_HOLIDAY_ADDED: "holidays",
};

export function notificationDestination({ module, action }: Pick<AuditEventView, "module" | "action">): NotificationDestination {
  const redemptionTab = module === "stay-points" ? REDEMPTION_DESTINATIONS[action] : undefined;
  const area = redemptionTab ? "redemption" : MODULE_PRIMARY_NAV[module];
  const tab = redemptionTab ?? ACTION_TABS[module]?.[action] ?? MODULE_PRIMARY_TAB[module];
  // Setup tabs (points table, holidays, lists, historical import, IGP projects) live in Settings.
  const inArea = (key: AdminAreaKey) => (ADMIN_AREA_TABS[key] as readonly { value: string }[]).some(({ value }) => value === tab);
  return !inArea(area) && inArea("vip-products") ? { area: "vip-products", tab } : { area, tab };
}

/** Type guard: the nav key is an area with tabs. */
export function isAreaNavKey(navKey: AdminNavKey): navKey is AdminAreaKey {
  return Object.hasOwn(ADMIN_AREA_TABS, navKey);
}

/** Reverse map: every audit module whose badge renders on the given nav key. */
export function modulesForNavKey(navKey: AdminNavKey): AuditModule[] {
  return (Object.entries(MODULE_PRIMARY_NAV) as Array<[AuditModule, AdminNavKey]>)
    .filter(([, key]) => key === navKey)
    .map(([module]) => module);
}
