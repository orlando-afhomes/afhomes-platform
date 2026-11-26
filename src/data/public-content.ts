import type { PublicPromoOffer } from "@/data/contracts/promo-repository";
import { buildProducts } from "@/data/seed/catalog";
import type { Experience } from "@/modules/experiences/types";
import { seedExperiences } from "@/modules/experiences/sample-seed";
import type { PublicVipProduct } from "@/modules/vip/types";
import { seedTierLevels } from "@/modules/vip/tier-levels";

/**
 * Public website content: the approved catalog snapshot and published Experiences.
 * The website has no CMS or public read API yet (deferred), so these read the same
 * confirmed seed data the clean database is built from. Promo offers are retired with
 * the mock prototype and stay empty until an authorized offers source exists.
 */
export const PUBLIC_EXPERIENCES: Experience[] = seedExperiences().filter((item) => item.published);

export const PUBLIC_VIP_PRODUCTS: PublicVipProduct[] = (() => {
  const levels = seedTierLevels();
  return buildProducts()
    .filter((product) => product.approvalStatus === "approved" && product.status === "active" && product.publiclyListed)
    .map((product) => {
      const level = levels.find((item) => item.id === product.tierLevelId);
      return {
        code: product.code,
        name: product.name,
        tier: level?.name ?? product.tier,
        tierColorKey: level?.colorKey ?? product.tierColorKey ?? "neutral",
        vipDiscountPercent: product.vipDiscountPercent,
        pointsPerCycle: product.pointsPerCycle,
        lifetimePoints: product.lifetimePoints,
        earningCycles: product.earningCycles,
        supplementaryHolders: product.supplementaryHolders,
        benefitsSummary: product.benefitsSummary ?? null,
        imageUrl: product.imageUrl ?? null,
      };
    });
})();

export const PUBLIC_OFFERS: PublicPromoOffer[] = [];
