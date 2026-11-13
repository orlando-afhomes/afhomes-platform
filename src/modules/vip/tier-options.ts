import type { VipProduct, VipTierCode } from "./types";

export type TierOption = { value: VipTierCode; label: string };

/** Fallback labels used until the catalog loads, so selects are never empty. */
const SEEDED_TIER_OPTIONS: TierOption[] = [
  { value: "B1", label: "Bronze (B1)" },
  { value: "S1", label: "Silver (S1)" },
  { value: "G1", label: "Gold (G1)" },
];

/**
 * Select options from the product catalog, for example "Bronze (B1)". Retired products are
 * left out unless `include` names one a record already holds, so old records stay valid.
 */
export function tierOptions(products: ReadonlyArray<VipProduct> | undefined, include?: ReadonlyArray<VipTierCode | null | undefined>): TierOption[] {
  if (!products || products.length === 0) return SEEDED_TIER_OPTIONS;
  return products
    .filter((product) => product.status === "active" || include?.includes(product.code))
    .map((product) => ({ value: product.code, label: `${product.tier} (${product.code})` }));
}
