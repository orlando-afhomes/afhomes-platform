import { downPaymentCentavos, paymentSchemeTierTerms } from "@/modules/vip/rules";
import { formatPeso } from "@/shared/lib/money";
import type { PaymentScheme, VipProduct } from "@/modules/vip/types";

export type SchemeCardContent = { total: string | null; pill: string | null; terms: string[] };

/**
 * Pure data for the admin payment-scheme card: headline total, duration pill,
 * and term lines. All figures come from the scheme/product objects; no
 * conflict or finalization logic lives here. The "(terms pending)" label
 * suffix for unavailable schemes is handled by the caller.
 */
export function schemeCardContent(
  scheme: PaymentScheme,
  product?: Pick<VipProduct, "code" | "priceCentavos"> | null,
): SchemeCardContent {
  /** No product: nothing to price, so every field stays empty. */
  if (!product) {
    return { total: null, pill: null, terms: [] };
  }
  /**
   * Package total for the tier under the scheme (doc 05 prices §5: the
   * scheme's own contract-stated price overrides the catalog price).
   * Always computed, even when the scheme is unavailable.
   */
  const { priceCentavos: price, reservationCentavos: reservation, installmentCount: count, installmentCentavos: each } = paymentSchemeTierTerms(product, scheme);
  const total = formatPeso(price);
  /**
   * Unavailable scheme: show the total for reference but no pill or terms
   * (doc 05: Move schemes carry no usable terms until approved; the caller
   * appends "(terms pending)" to the label).
   */
  if (scheme.availability !== "available") {
    return { total, pill: null, terms: [] };
  }
  /**
   * Spot Cash (doc 05 Annex A: ₱10,000 reservation fee, balance within
   * 7 days; amendment due-dates item: full balance due within 7 days).
   */
  if (scheme.category === "cash") {
    if (reservation) {
      return {
        total,
        pill: "Pay in 7 days",
        terms: [
          `${formatPeso(reservation)} reservation fee`,
          `Balance ${formatPeso(price - reservation)} due within 7 days`,
        ],
      };
    }
    return { total, pill: "Single full payment", terms: [`Single payment of ${total}`] };
  }
  /**
   * Installment and Move shared lines (doc 05 Annex A reservation +
   * installments; amendment items 5–9: equal monthly payments at 0%
   * interest, due monthly from the reservation date).
   */
  const pill = count ? `${count} monthly payments` : null;
  const terms: string[] = [];
  if (reservation) {
    terms.push(`${formatPeso(reservation)} reservation fee`);
  }
  if (count && each) {
    terms.push(`${count} × ${formatPeso(each)} monthly payments at 0% interest`);
  }
  /**
   * Move-only down-payment line (doc 05 Annex A reservation + installments;
   * amendment items 5–9: Move B carries a down payment that includes the
   * reservation fee). Approval and Card ID mapping live on the scheme
   * register, not in the per-card terms.
   */
  if (scheme.category === "move") {
    let down: number | null = null;
    try {
      down = downPaymentCentavos(price, scheme);
    } catch {
      down = null;
    }
    if (down != null) {
      terms.push(`${formatPeso(down)} down payment (incl. reservation fee)`);
    }
  }
  return { total, pill, terms };
}
