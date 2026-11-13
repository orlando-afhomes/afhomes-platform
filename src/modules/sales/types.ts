import type { AccreditationReminder } from "@/modules/accreditation/dates";
import type { GenealogyEntry } from "@/modules/contracts/types";
import type { VipTierCode } from "@/modules/vip/types";

export type SaleStatus = "pending" | "confirmed" | "defaulted" | "cancelled" | "rejected";

/** Recorded on a sale whose salesperson or referrer had an expired accreditation on the sale date (doc 03 section 9). */
export type SaleExpiryReminder = {
  role: "seller" | "referrer";
  memberId: string;
  /** Date-only valid-until date that had passed. */
  expiryDate: string;
  reminder: AccreditationReminder;
};

export type SaleAdjustment = {
  id: string;
  /** Business date the adjustment is reported in (Finance confirmation or reversal date). */
  date: string;
  /** Signed centavos. */
  amountCentavos: number;
  kind: "confirmation" | "reversal" | "reconfirmation" | "amendment";
  reason: string;
  actorId: string;
};

/**
 * Sale record (doc 13). Counted once at the full finalized contract value on the
 * Finance confirmation date; reversals and reconfirmations are dated adjustments.
 */
export type Sale = {
  id: string;
  contractId: string;
  customerId: string;
  productCode: VipTierCode;
  branchId: string;
  valueCentavos: number;
  recordedDate: string;
  approval: { approvedAt: string; approvedBy: string } | null;
  commissionRates?: { memberId: string; role: "DSC" | "DRI"; rateBp: number }[];
  defaultedAt?: string;
  sellerMemberId: string | null;
  /** VIP Referrer of the sale (doc 13 section 4; owner ruling 2026-11-12). Never counted in the referrer's My Sales. */
  referrerMemberId: string | null;
  /** Seller and upline at recording time (13 section 4.3). */
  team: GenealogyEntry[];
  status: SaleStatus;
  confirmedDate: string | null;
  adjustments: SaleAdjustment[];
  /** Expiry reminders recorded when the sale was created; absent or empty when none applied. */
  expiryReminders?: SaleExpiryReminder[];
};
