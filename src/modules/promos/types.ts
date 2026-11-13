/** Promo Points: a wallet separate from Grant Stay Points (owner ruling 2026-11-13, docs 09 and 10). */

/** Date-only string in Asia/Manila business time, `YYYY-MM-DD`. */
export type PromoDate = string;

export type PromoStatus = "draft" | "active" | "ended";

export interface Promo {
  id: string;
  name: string;
  status: PromoStatus;
  startDate: PromoDate;
  endDate: PromoDate;
  earnOutletIds: string[];
  /** Pesos spent per 1 point, stored in centavos (positive integer). 10_000 = P100 per point. */
  earnPesosPerPointCentavos: number;
  redeemOutletIds: string[];
  /** Last day the points are usable (inclusive). Null means they do not expire. */
  pointsExpiryDate: PromoDate | null;
  /** True for the seeded demonstration promo. */
  sample?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PromoPointsEntryType = "earn" | "earn_reversal" | "use" | "use_void" | "expiry";

export interface PromoPointsEntry {
  id: string;
  promoId: string;
  membershipId: string;
  type: PromoPointsEntryType;
  /** Always a positive integer; the type gives the direction. */
  points: number;
  sourceBillId?: string;
  outletId?: string;
  note?: string;
  date: PromoDate;
  actorId: string;
  /** For `use_void`: the `use` entry being voided. */
  voidsEntryId?: string;
}

export interface PromoBalance {
  earned: number;
  reversed: number;
  used: number;
  voided: number;
  expired: number;
  available: number;
}

export type PromoUseCheck = { ok: true } | { ok: false; error: string };
