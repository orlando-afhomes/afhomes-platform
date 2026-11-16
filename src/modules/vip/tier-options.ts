import { NON_ACTIVE_TIER_CODES, type VipProduct, type VipTierCode } from "./types";

export type TierOption = { value: VipTierCode; label: string };

/**
 * Select options from the product catalog, using names such as "Bronze". Retired products are
 * left out unless `include` names one a record already holds, so old records stay valid.
 * Empty until the catalog loads.
 */
export function tierOptions(products: ReadonlyArray<VipProduct> | undefined, include?: ReadonlyArray<VipTierCode | null | undefined>): TierOption[] {
  const available = (products ?? []).filter((product) => product.status === "active" || include?.includes(product.code));
  return available.map((product) => ({
    value: product.code,
    label: available.some((other) => other.code !== product.code && other.tier === product.tier)
      ? product.name || product.tier
      : product.tier,
  }));
}

const STANDARD_TIER_NAMES = new Map([["B1", "Bronze"], ["S1", "Silver"], ["G1", "Gold"]]);

/** Human-readable tier for a stored code, including documented historical products. */
export function tierDisplayName(
  code: VipTierCode | null | undefined,
  products: ReadonlyArray<Pick<VipProduct, "code" | "tier">> | undefined,
): string | null {
  if (!code) return null;
  return products?.find((product) => product.code === code)?.tier
    ?? STANDARD_TIER_NAMES.get(code)
    ?? NON_ACTIVE_TIER_CODES.find((product) => product.code === code && product.state === "historical")?.label
    ?? null;
}

/** Code of the first active product, or "" when the catalog has none (the form then asks for a choice). */
export function defaultProductCode(products: ReadonlyArray<Pick<VipProduct, "code" | "status">> | undefined): VipTierCode {
  return products?.find((product) => product.status === "active")?.code ?? "";
}
