import type { Contract } from "@/modules/contracts/types";
import { collectionPercent, netVerifiedCentavos, totalVerifiedCentavos } from "@/modules/finance/rules";
import type { Payment } from "@/modules/finance/types";
import { startOfNextMonthDate } from "@/shared/lib/dates";

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

/**
 * Owner ruling R8 (2026-11-12, doc 08): a VIP commission is released 100% in the
 * month its sale's net verified collections first reach 40%, and is paid in that
 * month's month-end payout, made after the month is closed. There is no waiting
 * period (the earlier 7-day wait is removed). Owner decision 2026-11-12: a payout
 * may be recorded from the first day of the next month; the month is set by the
 * verification (approval) date of the payment that reached 40%.
 * shortcut: no month-close feature yet, so the next calendar month stands in for
 * "after the month is closed"; switch to the actual close once month close exists.
 */
export function payoutReleaseDateFor(thresholdDate: string | null): string | null {
  return thresholdDate ? startOfNextMonthDate(thresholdDate) : null;
}

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

/** First business date a payout may be recorded (start of the month after 40% was reached). Null while the threshold is not met. */
export function payoutReleaseDate(contract: Pick<Contract, "priceCentavos">, payments: readonly Payment[]): string | null {
  return payoutReleaseDateFor(payoutThresholdDate(contract, payments));
}

/** Verified share of the contract value in whole percent, rounded down, for messages only. */
export const collectedPercent = collectionPercent;
