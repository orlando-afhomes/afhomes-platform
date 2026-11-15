import type { AdminAreaKey, AdminNavKey } from "@/panels/admin/navigation";
import type { AuditModule } from "@/modules/audit/types";

/**
 * One visible sidebar key per audit module (the flat area list, owner ruling
 * 2026-11-15). A module's badge renders on this key; several modules may share
 * an area. The hidden accounts entry is never a primary, because it has no
 * rendered navlink to badge.
 */
export const MODULE_PRIMARY_NAV: Readonly<Record<AuditModule, AdminNavKey>> = {
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

/** Type guard: the nav key is an area with tabs. */
export function isAreaNavKey(navKey: AdminNavKey): navKey is AdminAreaKey {
  return navKey !== "dashboard" && navKey !== "audit-logs" && navKey !== "accounts";
}

/** Reverse map: every audit module whose badge renders on the given nav key. */
export function modulesForNavKey(navKey: AdminNavKey): AuditModule[] {
  return (Object.entries(MODULE_PRIMARY_NAV) as Array<[AuditModule, AdminNavKey]>)
    .filter(([, key]) => key === navKey)
    .map(([module]) => module);
}
