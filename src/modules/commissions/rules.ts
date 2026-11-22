import type { Contract } from "@/modules/contracts/types";
import { approvedCollectionMilestone, collectionPercent, totalVerifiedCentavos } from "@/modules/finance/rules";
import type { Payment } from "@/modules/finance/types";
import { startOfNextMonthDate } from "@/shared/lib/dates";
import { MoneyError } from "@/shared/lib/money";
import type { CommissionClawback, CommissionProduct, CommissionStage } from "./types";

export function clawbackBalance(clawback: CommissionClawback): number {
  return clawback.writeOff ? 0 : clawback.amountCentavos - clawback.recoveries.reduce((sum, item) => sum + item.amountCentavos, 0);
}

/**
 * A clawback may be taken out of future pay only for a person with a signed addendum, and only when the clawback was
 * raised on or after the signing date (owner decision 2026-11-22; draft addendum section 6).
 */
export function clawbackOffsetEligible(clawback: CommissionClawback, signedDate: string | null | undefined): boolean {
  return Boolean(signedDate) && signedDate! <= clawback.raisedDate && clawbackBalance(clawback) > 0;
}

/**
 * Splits `payableCentavos` across the open eligible clawbacks, oldest first. Each offset is capped at what is left to pay,
 * so the person is never paid below zero; the rest stays open and carries forward (draft addendum section 3).
 */
export function planClawbackOffsets(
  clawbacks: readonly CommissionClawback[], signedDate: string | null | undefined, payableCentavos: number,
): { clawbackId: string; amountCentavos: number }[] {
  let remaining = Number.isSafeInteger(payableCentavos) && payableCentavos > 0 ? payableCentavos : 0;
  const plan: { clawbackId: string; amountCentavos: number }[] = [];
  const queue = clawbacks.filter((item) => clawbackOffsetEligible(item, signedDate))
    .sort((a, b) => a.raisedDate.localeCompare(b.raisedDate) || a.id.localeCompare(b.id));
  for (const item of queue) {
    if (remaining <= 0) break;
    const amountCentavos = Math.min(clawbackBalance(item), remaining);
    plan.push({ clawbackId: item.id, amountCentavos });
    remaining -= amountCentavos;
  }
  return plan;
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
/** Convert an approved percentage to exact basis points. Blank is distinct from zero. */
export function parseCommissionRate(value: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const rate = Number(match[1]) * 100 + Number(match[2]?.padEnd(2, "0") ?? "0");
  return Number.isSafeInteger(rate) ? rate : null;
}
