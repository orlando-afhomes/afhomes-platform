import { schemePriceCentavos } from "@/modules/vip/rules";
import type { PaymentScheme, VipProduct } from "@/modules/vip/types";

type PriceProduct = Pick<VipProduct, "code" | "priceCentavos">;
type StatusProduct = Pick<VipProduct, "code" | "priceStatus">;
type OwnPriceScheme = Pick<PaymentScheme, "priceCentavosByTier">;
type FromPriceScheme = Pick<PaymentScheme, "priceCentavosByTier" | "availability" | "applicableTiers">;

/**
 * Package price shown for a tier, optionally under a scheme. A scheme with its
 * own contract-stated price overrides the catalog price; otherwise the catalog
 * price applies. Exact integer centavos; delegates to `schemePriceCentavos`.
 */
export function displayPriceFor(product: PriceProduct, scheme?: OwnPriceScheme | null): number {
  if (scheme == null) return product.priceCentavos;
  return schemePriceCentavos(product, scheme);
}

/**
 * Minimum package price for a tier across the available schemes that cover it,
 * each priced via `schemePriceCentavos`. Falls back to the catalog price when
 * no available scheme applies. Exact integer centavos.
 */
export function fromPriceFor(product: PriceProduct, schemes: ReadonlyArray<FromPriceScheme>): number {
  let min: number | null = null;
  for (const scheme of schemes) {
    if (scheme.availability !== "available") continue;
    if (!scheme.applicableTiers.includes(product.code)) continue;
    const price = schemePriceCentavos(product, scheme);
    if (min == null || price < min) min = price;
  }
  return min ?? product.priceCentavos;
}

/**
 * Price status for a tier under a scheme. Mirrors the `ownPrice` logic in
 * `MockContractRepository.prepare()`: a scheme with its own contract-stated
 * price for the tier reports "contract_stated", otherwise the catalog status
 * applies (a catalog conflict still blocks finalization).
 */
export function applicablePriceStatus(
  product: StatusProduct,
  scheme?: OwnPriceScheme | null,
): VipProduct["priceStatus"] {
  if (scheme != null && scheme.priceCentavosByTier[product.code] != null) return "contract_stated";
  return product.priceStatus;
}
