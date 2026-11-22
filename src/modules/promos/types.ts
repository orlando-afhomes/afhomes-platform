/** Promo Points: a wallet separate from Grant Stay Points (owner ruling 2026-11-13, docs 09 and 10). */

/** Date-only string in Asia/Manila business time, `YYYY-MM-DD`. */
export type PromoDate = string;

export type PromoStatus = "draft" | "active" | "ended";

export type PromoRewardStatus = "active" | "archived";

/** One named reward a customer may obtain with Promo Points at an eligible outlet. */
export interface PromoReward {
  id: string;
  name: string;
  description: string;
  outletId: string;
  /** Approved whole-point cost; configured dynamically, never hard-coded. */
  pointsCost: number;
  status: PromoRewardStatus;
}

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
  /** Named rewards configured by Admin; empty until the owner supplies reward terms. */
  rewards: PromoReward[];
  /** Public offer copy. Only an explicitly published, complete offer reaches the website. */
  publicTitle: string;
  publicSummary: string;
  publicTerms: string;
  published: boolean;
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
  requestId?: string;
  holder?: "primary" | "supplementary";
  identityChecked?: boolean;
  /** Named reward used, when the use came from the reward catalog. */
  rewardId?: string;
  /** Snapshot of the reward name and cost at the time of use; later edits never rewrite history. */
  rewardName?: string;
  rewardPointsCost?: number;
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
