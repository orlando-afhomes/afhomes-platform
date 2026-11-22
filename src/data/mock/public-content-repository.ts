import { simulateAsync, type MockAsyncOptions } from "@/data/contracts/async-options";
import type { PublicContentRepository } from "@/data/contracts/public-content-repository";
import type { PublicPromoOffer } from "@/data/contracts/promo-repository";
import type { PublicVipProduct } from "@/modules/vip/types";
import type { Promo } from "@/modules/promos/types";
import { manilaToday } from "@/shared/lib/dates";
import type { MockStore } from "./seed";

/** Shared projections keep staff previews and public reads governed by the same allowlists. */
export function projectPublicVipProducts(store: Pick<MockStore, "products" | "tierLevels">): PublicVipProduct[] {
  return store.products
      .filter((product) => product.approvalStatus === "approved" && product.status === "active" && product.publiclyListed)
      .map((product) => {
        const level = store.tierLevels.find((item) => item.id === product.tierLevelId);
        return {
          code: product.code,
          name: product.name,
          tier: level?.name ?? product.tier,
          tierColorKey: level?.colorKey ?? product.tierColorKey ?? "neutral",
          vipDiscountPercent: product.vipDiscountPercent,
          pointsPerCycle: product.pointsPerCycle,
          lifetimePoints: product.lifetimePoints,
          supplementaryHolders: product.supplementaryHolders,
          benefitsSummary: product.benefitsSummary ?? null,
          imageUrl: product.imageUrl ?? null,
        };
      });
}

export function projectPromoOffer(store: Pick<MockStore, "outlets">, promo: Promo): PublicPromoOffer {
    const outletName = (id: string) => store.outlets.find((outlet) => outlet.id === id)?.name ?? "AFhomes outlet";
    return {
      id: promo.id,
      title: promo.publicTitle,
      summary: promo.publicSummary,
      terms: promo.publicTerms,
      startDate: promo.startDate,
      endDate: promo.endDate,
      pointsExpiryDate: promo.pointsExpiryDate,
      earnOutlets: promo.earnOutletIds.map(outletName),
      rewards: promo.rewards
        .filter((reward) => reward.status === "active" && reward.pointsCost > 0 && promo.redeemOutletIds.includes(reward.outletId))
        .map((reward) => ({ id: reward.id, name: reward.name, description: reward.description, outletName: outletName(reward.outletId), pointsCost: reward.pointsCost })),
    };
}

export function projectPublicOffers(store: Pick<MockStore, "promos" | "outlets">, date = manilaToday()): PublicPromoOffer[] {
      return store.promos
        .filter((promo) => promo.published && promo.status === "active" && date >= promo.startDate && date <= promo.endDate)
        .map((promo) => projectPromoOffer(store, promo))
        .filter((offer) => offer.title && offer.summary && offer.terms && offer.rewards.length > 0);
}

/** Reads the existing browser store without constructing staff repositories. */
export function createPublicContentRepository(store: Pick<MockStore, "experiences" | "products" | "tierLevels" | "promos" | "outlets">, defaults: MockAsyncOptions = {}): PublicContentRepository {
  const run = async <T>(options: MockAsyncOptions | undefined, read: () => T): Promise<T> => {
    await simulateAsync({ ...defaults, ...options });
    return read();
  };
  return {
    experiences: (options) => run(options, () => structuredClone(store.experiences.filter((item) => item.published))),
    vipProducts: (options) => run(options, () => projectPublicVipProducts(store)),
    offers: (options) => run(options, () => projectPublicOffers(store)),
  };
}
