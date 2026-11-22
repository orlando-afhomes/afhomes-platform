import type { MockAsyncOptions } from "./async-options";
import type { PublicPromoOffer } from "./promo-repository";
import type { Experience } from "@/modules/experiences/types";
import type { PublicVipProduct } from "@/modules/vip/types";

/** Read-only public allowlists. No staff operations or private records. */
export interface PublicContentRepository {
  experiences(options?: MockAsyncOptions): Promise<Experience[]>;
  vipProducts(options?: MockAsyncOptions): Promise<PublicVipProduct[]>;
  offers(options?: MockAsyncOptions): Promise<PublicPromoOffer[]>;
}
