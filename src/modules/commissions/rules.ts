import type { Contract } from "@/modules/contracts/types";
import { collectionPercent, netVerifiedCentavos, totalVerifiedCentavos } from "@/modules/finance/rules";
import type { Payment } from "@/modules/finance/types";
import { addDaysToDate } from "@/shared/lib/dates";

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

/** Owner ruling (2026-11-09): payout opens 7 days after the payment that reached 40% was verified. */
export const PAYOUT_RELEASE_WAIT_DAYS = 7;

/**
 * Payment that first reached the 40% threshold in verification order.
 * Returns null when dated, net verified payments cannot establish a crossing.
 */
export function payoutThresholdPayment(contract: Pick<Contract, "priceCentavos">, payments: readonly Payment[]): Payment | null {
  if (!meetsPayoutRelease(contract, payments)) return null;
  const verified = payments
    .filter((payment) => payment.status === "verified" && payment.verifiedDate)
    .sort((a, b) => a.verifiedDate!.localeCompare(b.verifiedDate!) || (a.verifiedAt ?? "").localeCompare(b.verifiedAt ?? ""));
  let cumulative = 0;
  for (const payment of verified) {
    cumulative += netVerifiedCentavos(payment);
    if (cumulative * 10_000 >= contract.priceCentavos * PAYOUT_RELEASE_THRESHOLD_BP) return payment;
  }
  return null;
}

export function payoutThresholdDate(contract: Pick<Contract, "priceCentavos">, payments: readonly Payment[]): string | null {
  return payoutThresholdPayment(contract, payments)?.verifiedDate ?? null;
}

/** First business date a payout may be recorded. Null while the 40% threshold is not met. */
export function payoutReleaseDate(contract: Pick<Contract, "priceCentavos">, payments: readonly Payment[]): string | null {
  const reached = payoutThresholdDate(contract, payments);
  return reached ? addDaysToDate(reached, PAYOUT_RELEASE_WAIT_DAYS) : null;
}

/** Verified share of the contract value in whole percent, rounded down, for messages only. */
export const collectedPercent = collectionPercent;
