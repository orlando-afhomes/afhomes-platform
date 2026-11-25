import { applyBasisPoints, MoneyError } from "@/shared/lib/money";
import { isValidTierCode, NON_ACTIVE_TIER_CODES, type PaymentScheme, type VipProduct, type VipTierCode } from "./types";

/**
 * Plain-words problem with a new product code, or null when it can be used. The code has exactly
 * one letter and one digit (05 section 4.1), is not held or historical (05 section 4), and is not taken.
 */
export function productCodeError(code: string, existingCodes: readonly string[]): string | null {
  const value = code.trim().toUpperCase();
  if (!isValidTierCode(value)) return "The product code must be exactly 2 characters: one letter and one digit, for example B3.";
  const held = NON_ACTIVE_TIER_CODES.find((item) => item.code === value);
  if (held) return held.state === "reserved" ? "This code is held for future use and cannot be used yet." : "This code was used before and is kept for old records.";
  if (existingCodes.some((item) => item.toUpperCase() === value)) return "A product with this code already exists.";
  return null;
}

/** Package price for a tier under a scheme: the scheme's own price when set, otherwise the catalog price. */
export function schemePriceCentavos(product: Pick<VipProduct, "code" | "priceCentavos">, scheme: Pick<PaymentScheme, "priceCentavosByTier">): number {
  return scheme.priceCentavosByTier[product.code] ?? product.priceCentavos;
}

/** Monthly payment count for a tier: the per-tier count when set, otherwise the scheme count. */
export function installmentCountFor(scheme: Pick<PaymentScheme, "installmentCount" | "installmentCountByTier">, tier: VipTierCode): number | null {
  return scheme.installmentCountByTier?.[tier] ?? scheme.installmentCount;
}

export function paymentSchemeTierTerms(product: Pick<VipProduct, "code" | "priceCentavos">, scheme: PaymentScheme) {
  return {
    priceCentavos: schemePriceCentavos(product, scheme),
    reservationCentavos: scheme.reservationCentavos ?? 0,
    installmentCount: installmentCountFor(scheme, product.code),
    installmentCentavos: scheme.installmentCentavosByTier[product.code],
  };
}

/** Card ID payment segment for a tier: the single scheme code when set, otherwise the per-tier code. Never throws. */
export function paymentCodeFor(
  scheme: Pick<PaymentScheme, "category" | "paymentCode" | "priceCentavosByTier"> & {
    paymentCodeByTier?: Partial<Record<VipTierCode, string>>;
  },
  tier: VipTierCode,
): string | null {
  if (scheme.category === "move") return scheme.paymentCode ?? scheme.paymentCodeByTier?.[tier] ?? null;
  return scheme.paymentCode ?? null;
}

/** Human-readable payment code problems, one per applicable tier with a resolving code. */
export function paymentCodeIssues(
  scheme: Pick<PaymentScheme, "category" | "paymentCode" | "priceCentavosByTier" | "applicableTiers" | "installmentCount" | "installmentCountByTier"> & {
    paymentCodeByTier?: Partial<Record<VipTierCode, string>>;
  },
): string[] {
  const issues: string[] = [];
  for (const tier of scheme.applicableTiers) {
    const code = paymentCodeFor(scheme, tier);
    if (code == null) continue;
    if (!/^[CT]\d{2}$/.test(code)) {
      issues.push(`The ${tier} payment code "${code}" is invalid; it must look like C01 or T04.`);
      continue;
    }
    if (code.startsWith("T")) {
      const count = installmentCountFor(scheme, tier);
      if (count == null || Number(code.slice(1)) !== count) {
        issues.push(
          count == null
            ? `The ${tier} payment code "${code}" needs an installment count to match.`
            : `The ${tier} payment code "${code}" must match the ${count} monthly installments.`,
        );
      }
    }
  }
  return issues;
}

/** Down payment including the reservation fee, exact in centavos; null when the scheme has none. Throws MoneyError when inexact. */
export function downPaymentCentavos(price: number, scheme: Pick<PaymentScheme, "downPaymentBasisPoints">): number | null {
  return scheme.downPaymentBasisPoints ? applyBasisPoints(price, scheme.downPaymentBasisPoints) : null;
}

/** Plain-language summary of how a configured scheme is paid; one wording for every screen. */
export function schemeHowItWorks(scheme: Pick<PaymentScheme, "category" | "reservationCentavos" | "installmentCount" | "downPaymentBasisPoints">): string {
  const reservation = scheme.reservationCentavos ? "A non-refundable reservation fee, then " : "";
  if (scheme.category === "cash") return scheme.reservationCentavos ? "A non-refundable reservation fee, then the balance within 7 days." : "One full payment.";
  if (scheme.category === "installment") return `${reservation}${scheme.installmentCount} equal monthly installments at 0% interest, due monthly from the reservation date.`;
  if (scheme.downPaymentBasisPoints) return `A ${scheme.downPaymentBasisPoints / 100}% down payment that includes the reservation fee, then equal monthly payments at 0% interest.`;
  return `${reservation}equal monthly payments at 0% interest.`;
}

const positiveInteger =(value: number | null | undefined) => value == null || (Number.isInteger(value) && value > 0);

/** Plain-words problem with a product's terms, or null when they are complete and consistent (05 section 18). */
export function productTermErrors(next: VipProduct): string | null {
  if ((next.description ?? "").length > 500) return "The description must be 500 characters or fewer.";
  if ((next.benefitsSummary ?? "").length > 500) return "The benefits summary must be 500 characters or fewer.";
  if (!Number.isInteger(next.priceCentavos) || next.priceCentavos <= 0) return "The price must be a positive amount.";
  if (!Number.isInteger(next.validityYears) || next.validityYears < 1) return "Validity must be at least one year.";
  if (!Number.isInteger(next.earningCycles) || next.earningCycles < 1) return "Earning cycles must be at least one.";
  if (!Number.isInteger(next.pointsPerCycle) || next.pointsPerCycle <= 0) return "Points per cycle must be positive.";
  if (!Number.isInteger(next.lifetimePoints) || next.lifetimePoints <= 0) return "Lifetime points must be positive.";
  if (!Number.isInteger(next.weekdayPointsPerCycle) || next.weekdayPointsPerCycle < 0 || !Number.isInteger(next.weekendPointsPerCycle) || next.weekendPointsPerCycle < 0) return "Weekday and weekend points cannot be negative.";
  if (!Number.isInteger(next.vipDiscountPercent) || next.vipDiscountPercent < 0 || next.vipDiscountPercent > 100) return "The VIP discount must be between 0 and 100 percent.";
  if (!Number.isInteger(next.supplementaryHolders) || next.supplementaryHolders < 0) return "Extra cardholders cannot be negative.";
  if (next.weekdayPointsPerCycle + next.weekendPointsPerCycle !== next.pointsPerCycle) return "Weekday and weekend points must add up to the points per cycle.";
  if (next.pointsPerCycle * next.earningCycles !== next.lifetimePoints) return "Lifetime points must equal points per cycle times earning cycles.";
  if (next.earningCycles > next.validityYears) return "Earning cycles cannot exceed the validity years.";
  return null;
}

/** Terms that set what a customer pays or earns; on an approved product only the approver may change them. */
export const PRODUCT_ECONOMIC_KEYS: ReadonlyArray<keyof VipProduct> = [
  "priceCentavos", "validityYears", "earningCycles", "pointsPerCycle", "lifetimePoints",
  "weekdayPointsPerCycle", "weekendPointsPerCycle", "minSpendPerCycleCentavos", "vipDiscountPercent", "supplementaryHolders", "tierLevelId",
];

/** An approved product keeps its stated benefits so its public card cannot lose the custom perks. */
export function benefitsLostError(before: VipProduct, next: VipProduct): string | null {
  if (before.approvalStatus !== "approved" || !before.benefitsSummary?.trim() || next.benefitsSummary?.trim()) return null;
  return "An approved product keeps its stated benefits. Enter the benefits or retire the product instead of clearing them.";
}

/** Scheme terms are complete only when every documented field for its category is present (05 section 8). */
export function schemeTermsComplete(scheme: PaymentScheme): boolean {
  if (scheme.ownerHold) return false;
  if (scheme.applicableTiers.length === 0) return false;
  const codeFor = (tier: VipTierCode) => scheme.paymentCodeByTier?.[tier] ?? scheme.paymentCode ?? null;
  if (!scheme.applicableTiers.every((tier) => codeFor(tier))) return false;
  if (scheme.category === "cash") return true;
  return scheme.applicableTiers.every((tier) => (installmentCountFor(scheme, tier) ?? 0) > 0 && (scheme.installmentCentavosByTier[tier] ?? 0) > 0);
}

type SchemeTerms = Pick<
  PaymentScheme,
  "category" | "applicableTiers" | "reservationCentavos" | "installmentCount" | "installmentCountByTier" | "installmentCentavosByTier" | "priceCentavosByTier" | "downPaymentBasisPoints"
> & {
  paymentCode?: string | null;
  paymentCodeByTier?: Partial<Record<VipTierCode, string>>;
};

/**
 * Validates entered scheme terms against the catalog. Blank terms are allowed
 * (the scheme then stays unavailable); entered terms must be exact integer
 * centavos and must add up to the package price for every applicable tier.
 */
export function schemeTermErrors(scheme: SchemeTerms, products: ReadonlyArray<Pick<VipProduct, "code" | "priceCentavos">>): string[] {
  const errors: string[] = [];
  // Owner decision, 2026-11-22: conflicting sources must be corrected before saving.
  for (const [tier, code] of Object.entries(scheme.paymentCodeByTier ?? {})) {
    if (scheme.paymentCode && code && scheme.paymentCode !== code) errors.push(`The ${tier} payment code conflicts with the single scheme code. Use matching codes or one source.`);
  }

  if (!positiveInteger(scheme.reservationCentavos)) errors.push("The reservation fee must be a positive amount.");
  if (!positiveInteger(scheme.installmentCount)) errors.push("The number of installments must be a whole number greater than zero.");
  for (const [tier, count] of Object.entries(scheme.installmentCountByTier ?? {})) if (!positiveInteger(count)) errors.push(`The ${tier} number of installments must be a whole number greater than zero.`);
  for (const [tier, amount] of Object.entries(scheme.installmentCentavosByTier)) if (!positiveInteger(amount)) errors.push(`The ${tier} installment must be a positive amount.`);
  for (const [tier, amount] of Object.entries(scheme.priceCentavosByTier)) if (!positiveInteger(amount)) errors.push(`The ${tier} package price must be a positive amount.`);
  const bp = scheme.downPaymentBasisPoints;
  if (bp != null && (!Number.isInteger(bp) || bp <= 0 || bp >= 10_000)) errors.push("The down payment must be a whole basis-point share between 0% and 100%.");
  if (errors.length > 0) return errors;
  for (const tier of scheme.applicableTiers) {
    const product = products.find((item) => item.code === tier);
    if (!product) continue;
    const price = schemePriceCentavos(product, scheme);
    const reservation = scheme.reservationCentavos ?? 0;
    if (reservation >= price) errors.push(`The reservation fee must be less than the ${tier} package price.`);
    let down: number | null;
    try {
      down = downPaymentCentavos(price, scheme);
    } catch (error) {
      if (error instanceof MoneyError) {
        errors.push(`The ${tier} down payment is not a whole number of centavos.`);
        continue;
      }
      throw error;
    }
    if (down != null && down < reservation) errors.push(`The ${tier} down payment must include the reservation fee.`);
    const count = installmentCountFor(scheme, tier);
    const each = scheme.installmentCentavosByTier[tier];
    if (scheme.category !== "cash" && count && each && (down ?? reservation) + count * each !== price) {
      errors.push(`For ${tier}, the ${down != null ? "down payment" : "reservation fee"} plus ${count} installments must equal the package price.`);
    }
  }
  errors.push(...paymentCodeIssues({ ...scheme, paymentCode: scheme.paymentCode ?? null }));
  return errors;
}
