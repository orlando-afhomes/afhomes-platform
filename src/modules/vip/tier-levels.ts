import type { TierColorKey, TierLevel, VipProduct } from "./types";

export const TIER_LEVEL_NAME_MAX = 40;

/** Colors an admin can give a tier level; each maps to an existing design token. */
export const TIER_COLOR_OPTIONS: ReadonlyArray<{ value: TierColorKey; label: string }> = [
  { value: "bronze", label: "Bronze" },
  { value: "silver", label: "Silver" },
  { value: "gold", label: "Gold" },
  { value: "neutral", label: "Neutral" },
];

export const TIER_LEVEL_BRONZE_ID = "tier-level-bronze";
export const TIER_LEVEL_SILVER_ID = "tier-level-silver";
export const TIER_LEVEL_GOLD_ID = "tier-level-gold";

/** Seeded levels keep stable ids so seeded products resolve. */
export function seedTierLevels(): TierLevel[] {
  return [
    { id: TIER_LEVEL_BRONZE_ID, name: "Bronze", colorKey: "bronze", sortOrder: 1, status: "active" },
    { id: TIER_LEVEL_SILVER_ID, name: "Silver", colorKey: "silver", sortOrder: 2, status: "active" },
    { id: TIER_LEVEL_GOLD_ID, name: "Gold", colorKey: "gold", sortOrder: 3, status: "active" },
  ];
}

/** Trimmed, single-spaced name, or the plain-words problem with it. Uniqueness ignores case. */
export function tierLevelNameError(raw: string, others: readonly Pick<TierLevel, "name">[]): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return "A name is required.";
  if (name.length > TIER_LEVEL_NAME_MAX) return `The name must be ${TIER_LEVEL_NAME_MAX} characters or fewer.`;
  if (others.some((item) => item.name.toLowerCase() === name.toLowerCase())) return "A card level with this name already exists.";
  return null;
}

type Option = { value: string; label: string };

/**
 * Select options of tier levels in order: active ones, plus a deactivated level a record
 * already holds (`keep`), marked "(inactive)" so old records stay valid.
 */
export function tierLevelOptions(levels: readonly TierLevel[], keep: readonly (string | null | undefined)[] = []): Option[] {
  return [...levels]
    .filter((level) => level.status === "active" || keep.includes(level.id))
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((level) => ({ value: level.id, label: level.status === "active" ? level.name : `${level.name} (inactive)` }));
}

/** Number of products (retired ones too) in a level. */
export function productsInLevel(products: readonly Pick<VipProduct, "tierLevelId">[], levelId: string): number {
  return products.filter((product) => product.tierLevelId === levelId).length;
}
