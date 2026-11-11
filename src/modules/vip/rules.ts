import { applyBasisPoints, MoneyError } from "@/shared/lib/money";
import type { PaymentScheme, VipProduct, VipTierCode } from "./types";

/** Package price for a tier under a scheme: the scheme's own price when set, otherwise the catalog price. */
export function schemePriceCentavos(product: Pick<VipProduct, "code" | "priceCentavos">, scheme: Pick<PaymentScheme, "priceCentavosByTier">): number {
  return scheme.priceCentavosByTier[product.code] ?? product.priceCentavos;
}

/** Monthly payment count for a tier: the per-tier count when set, otherwise the scheme count. */
export function installmentCountFor(scheme: Pick<PaymentScheme, "installmentCount" | "installmentCountByTier">, tier: VipTierCode): number | null {
  return scheme.installmentCountByTier?.[tier] ?? scheme.installmentCount;
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
