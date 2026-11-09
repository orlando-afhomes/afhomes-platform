import type { GenealogyEntry } from "@/modules/contracts/types";
import type { VipTierCode } from "@/modules/vip/types";

export type SaleStatus = "pending" | "confirmed" | "cancelled" | "rejected";

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
  sellerMemberId: string | null;
  /** Seller and upline at recording time (13 section 4.3). */
  team: GenealogyEntry[];
  status: SaleStatus;
  confirmedDate: string | null;
  adjustments: SaleAdjustment[];
};
