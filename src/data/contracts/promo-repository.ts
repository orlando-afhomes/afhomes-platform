import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Promo, PromoBalance, PromoPointsEntry } from "@/modules/promos/types";

export type PromoRewardInput = {
  id?: string;
  name: string;
  description: string;
  outletId: string;
  pointsCost: number;
  status?: "active" | "archived";
};

/** Promo Points are a wallet separate from Grant Stay Points (owner ruling 2026-11-13). */
export type PromoInput = {
  name: string;
  /** Draft promos earn nothing until activated. */
  status: "draft" | "active";
  startDate: string;
  endDate: string;
  earnOutletIds: string[];
  /** Centavos spent per 1 point (positive integer). */
  earnPesosPerPointCentavos: number;
  redeemOutletIds: string[];
  pointsExpiryDate: string | null;
  /** Optional so existing promo callers keep working; omitted means no configured rewards. */
  rewards?: PromoRewardInput[];
  publicTitle?: string;
  publicSummary?: string;
  publicTerms?: string;
  /** Must be false unless the public copy and every active reward are complete. */
  published?: boolean;
};

/** Public projection of a published, date-valid offer; never contains customer data. */
export type PublicPromoOffer = {
  id: string;
  title: string;
  summary: string;
  terms: string;
  startDate: string;
  endDate: string;
  pointsExpiryDate: string | null;
  earnOutlets: string[];
  rewards: Array<{ id: string; name: string; description: string; outletName: string; pointsCost: number }>;
};

/** `pointsEarned` counts earn entries; once above zero the earn rule and earn dates are locked and delete is blocked. */
export type PromoView = Promo & { pointsEarned: number };

export type PromoLedgerRow = PromoPointsEntry & {
  promoName: string;
  customerName: string;
  vipNumber: string | null;
  outletName: string | null;
  /** True for a `use` entry that was voided. */
  voided: boolean;
};

export type PromoMembershipBalance = {
  membershipId: string;
  customerName: string;
  vipNumber: string | null;
  total: PromoBalance;
  byPromo: Array<{ promoId: string; promoName: string; balance: PromoBalance }>;
};

type RecordPromoUseBase = import("./member-qr-repository").HolderVerification & { requestId: string; membershipId: string; promoId: string; note: string };
/** Named reward use derives the outlet and cost; the legacy points form stays for existing staff screens. */
export type RecordPromoUseInput = RecordPromoUseBase & (
  | { rewardId: string; outletId?: never; points?: never }
  | { rewardId?: never; outletId: string; points: number }
);

export interface PromoRepository {
  list(options?: MockAsyncOptions): Promise<PromoView[]>;
  /** Published, date-valid offers with configured active rewards; safe for the public website. */
  publicOffers(options?: MockAsyncOptions): Promise<PublicPromoOffer[]>;
  create(input: PromoInput, options?: MockAsyncOptions): Promise<PromoView>;
  update(id: string, input: PromoInput, options?: MockAsyncOptions): Promise<PromoView>;
  /** Ends the promo today (or on its end date when that is earlier). Earned points stay usable until their expiry. */
  end(id: string, options?: MockAsyncOptions): Promise<PromoView>;
  /** Only when no points were ever earned or used; otherwise end the promo. */
  delete(id: string, options?: MockAsyncOptions): Promise<void>;
  /** Entries for the memberships the identity can see, newest first. */
  ledger(options?: MockAsyncOptions): Promise<PromoLedgerRow[]>;
  balances(options?: MockAsyncOptions): Promise<PromoMembershipBalance[]>;
  recordUse(input: RecordPromoUseInput, options?: MockAsyncOptions): Promise<PromoLedgerRow>;
  voidUse(entryId: string, reason: string, options?: MockAsyncOptions): Promise<PromoLedgerRow>;
}
