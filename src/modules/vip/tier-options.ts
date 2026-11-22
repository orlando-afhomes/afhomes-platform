import { NON_ACTIVE_TIER_CODES, type VipProduct, type VipTierCode } from "./types";

export type TierOption = { value: VipTierCode; label: string };

/** A product may be sold only after Super Administrator approval and while it is active. */
export function isSellableProduct(product: Pick<VipProduct, "status" | "approvalStatus">): boolean {
  return product.status === "active" && product.approvalStatus === "approved";
}

/**
 * Select options from the product catalog, using names such as "Bronze". Draft and retired
 * products are left out unless `include` names one a record already holds, so drafts never
 * enter contract selection and old records stay valid. Empty until the catalog loads.
 */
export function tierOptions(products: ReadonlyArray<VipProduct> | undefined, include?: ReadonlyArray<VipTierCode | null | undefined>): TierOption[] {
  // A draft is never selectable; `include` only keeps a retired product that a record already holds.
  const available = (products ?? []).filter((product) => product.approvalStatus === "approved" && (product.status === "active" || include?.includes(product.code)));
  return toTierOptions(available);
}

/**
 * Options for configuration screens (payment plans) where an active Draft must be selectable
 * before approval. Never use this for customer plans or contracts.
 */
export function configurationTierOptions(products: ReadonlyArray<VipProduct> | undefined, include?: ReadonlyArray<VipTierCode | null | undefined>): TierOption[] {
  const available = (products ?? []).filter((product) => product.status === "active" || include?.includes(product.code));
  return toTierOptions(available);
}

function toTierOptions(available: ReadonlyArray<VipProduct>): TierOption[] {
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

/** Code of the first active, approved product, or "" when the catalog has none (the form then asks for a choice). */
export function defaultProductCode(products: ReadonlyArray<Pick<VipProduct, "code" | "status" | "approvalStatus">> | undefined): VipTierCode {
  return products?.find((product) => isSellableProduct(product))?.code ?? "";
}
