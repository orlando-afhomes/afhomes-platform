import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Promo, PromoBalance, PromoPointsEntry } from "@/modules/promos/types";

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

export type RecordPromoUseInput = { membershipId: string; promoId: string; outletId: string; points: number; note: string };

export interface PromoRepository {
  list(options?: MockAsyncOptions): Promise<PromoView[]>;
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
