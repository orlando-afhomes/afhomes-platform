import type { VipProduct, VipTierCode } from "./types";

export type TierOption = { value: VipTierCode; label: string };

/**
 * Select options from the product catalog, for example "Bronze (B1)". Retired products are
 * left out unless `include` names one a record already holds, so old records stay valid.
 * Empty until the catalog loads.
 */
export function tierOptions(products: ReadonlyArray<VipProduct> | undefined, include?: ReadonlyArray<VipTierCode | null | undefined>): TierOption[] {
  return (products ?? [])
    .filter((product) => product.status === "active" || include?.includes(product.code))
    .map((product) => ({ value: product.code, label: `${product.tier} (${product.code})` }));
}

/** Code of the first active product, or "" when the catalog has none (the form then asks for a choice). */
export function defaultProductCode(products: ReadonlyArray<Pick<VipProduct, "code" | "status">> | undefined): VipTierCode {
  return products?.find((product) => product.status === "active")?.code ?? "";
}
