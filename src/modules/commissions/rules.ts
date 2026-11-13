import type { Contract } from "@/modules/contracts/types";
import { approvedCollectionMilestone, collectionPercent, totalVerifiedCentavos } from "@/modules/finance/rules";
import type { Payment } from "@/modules/finance/types";
import { startOfNextMonthDate } from "@/shared/lib/dates";
import { MoneyError } from "@/shared/lib/money";
import type { CommissionClawback, CommissionProduct, CommissionStage } from "./types";

export function clawbackBalance(clawback: CommissionClawback): number {
  return clawback.writeOff ? 0 : clawback.amountCentavos - clawback.recoveries.reduce((sum, item) => sum + item.amountCentavos, 0);
}

export function commissionStageAmounts(
  basisCentavos: number, rateBp: number, product: CommissionProduct,
): { stage: CommissionStage; amountCentavos: number }[] {
  if (!Number.isSafeInteger(basisCentavos) || basisCentavos < 0 || !Number.isSafeInteger(rateBp) || rateBp < 0) {
    throw new MoneyError("Enter a valid contract value and commission rate.");
  }
  const exactShare = (amount: bigint, share: bigint) => {
    const scale = BigInt(10_000);
    const numerator = amount * share;
    if (numerator % scale !== BigInt(0) || numerator / scale > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new MoneyError("The commission must be a whole, supported number of centavos.");
    }
    return numerator / scale;
  };
  const total = exactShare(BigInt(basisCentavos), BigInt(rateBp));
  const first = product === "IGP" ? exactShare(total, BigInt(4_000)) : total;
  return [
    { stage: "stage1", amountCentavos: Number(first) },
    ...(product === "IGP" ? [{ stage: "full" as const, amountCentavos: Number(total - first) }] : []),
  ];
}

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

/** A payout may be recorded on or after the first day after the release month. */
export function payoutReleaseDateFor(thresholdDate: string | null): string | null {
  return thresholdDate ? startOfNextMonthDate(thresholdDate) : null;
}

/**
 * Payment that first reached the 40% threshold in verification order.
 * Returns null when dated, net verified payments cannot establish a crossing.
 */
export function payoutThresholdPayment(contract: Pick<Contract, "priceCentavos">, payments: readonly Payment[]): Payment | null {
  return approvedCollectionMilestone(contract.priceCentavos, payments, PAYOUT_RELEASE_THRESHOLD_BP)?.payment ?? null;
}

export function payoutThresholdDate(contract: Pick<Contract, "priceCentavos">, payments: readonly Payment[]): string | null {
  return approvedCollectionMilestone(contract.priceCentavos, payments, PAYOUT_RELEASE_THRESHOLD_BP)?.countedDate ?? null;
}

/** First business date a payout may be recorded (start of the month after 40% was reached). Null while the threshold is not met. */
export function payoutReleaseDate(contract: Pick<Contract, "priceCentavos">, payments: readonly Payment[]): string | null {
  return payoutReleaseDateFor(payoutThresholdDate(contract, payments));
}

/** Verified share of the contract value in whole percent, rounded down, for messages only. */
export const collectedPercent = collectionPercent;
