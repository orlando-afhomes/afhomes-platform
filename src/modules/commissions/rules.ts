import type { Contract } from "@/modules/contracts/types";
import { totalVerifiedCentavos } from "@/modules/finance/rules";
import type { Payment } from "@/modules/finance/types";

/**
 * AFhomes stage-1 release: a VIP commission pays out in full once net
 * Finance-verified collections reach 40% of the contract value (C2 ruling R22,
 * A4 section 2, A7 section 1; adopted by owner decision OD-4 on 2026-11-09).
 */
export const PAYOUT_RELEASE_THRESHOLD_BP = 4_000;

/** Integer comparison in centavos and basis points; no floating-point percentages. */
export function meetsPayoutRelease(contract: Pick<Contract, "priceCentavos">, payments: readonly Payment[]): boolean {
  return totalVerifiedCentavos(payments) * 10_000 >= contract.priceCentavos * PAYOUT_RELEASE_THRESHOLD_BP;
}

/** Verified share of the contract value in whole percent, rounded down, for messages only. */
export function collectedPercent(contract: Pick<Contract, "priceCentavos">, payments: readonly Payment[]): number {
  if (contract.priceCentavos <= 0) return 0;
  return Math.floor((totalVerifiedCentavos(payments) * 100) / contract.priceCentavos);
}
