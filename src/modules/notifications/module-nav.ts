import type { AdminNavKey } from "@/panels/admin/navigation";
import type { AuditModule } from "@/modules/audit/types";

/**
 * One visible primary leaf nav key per audit module. A module's badge renders
 * on this key; group rows aggregate their children's badges. hideFromNav
 * items (customer-import, accounts) are never primaries even though they
 * carry grants, because they have no rendered navlink to badge.
 */
export const MODULE_PRIMARY_NAV: Readonly<Record<AuditModule, AdminNavKey>> = {
  // Staff & Access also hosts account administration, so it stands in for the
  // whole organization module (departments and roles are secondary views).
  organization: "staff",
  // Members list; genealogy is the secondary view. Accreditation work under
  // the Sales Network group belongs to the accreditation module instead.
  "sales-network": "sales-network-members",
  // OST Applications is the only visible accreditation page; issued and
  // recorded accreditations surface there.
  accreditation: "accreditation-registrations",
  // Customers page; Customer Import is hideFromNav so it can never be primary.
  customers: "customers",
  // Product Catalog; Payment Schemes, Scheme Guide, and Tier Codes are secondary.
  "vip-products": "vip-products",
  // Contracts under the Sales group; Contract Review is the secondary view.
  contracts: "sales-contracts",
  // Payment Verification; Collections, Payment History, Holds, and
  // Cancellation Requests are secondary views.
  finance: "finance",
  sales: "sales",
  // Commissions hub; Assignment and Payouts are secondary process pages.
  commissions: "commissions",
  // VIP Memberships; the Activation Queue is the secondary process page.
  membership: "membership",
  "stay-points": "stay-points",
} as const;

/** Reverse map: every audit module whose badge renders on the given nav key. */
export function modulesForNavKey(navKey: AdminNavKey): AuditModule[] {
  return (Object.entries(MODULE_PRIMARY_NAV) as Array<[AuditModule, AdminNavKey]>)
    .filter(([, key]) => key === navKey)
    .map(([module]) => module);
}
