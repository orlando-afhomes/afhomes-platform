/**
 * Verified spend at AFHomes Direct Resort Operations (09 section 9). The source
 * system and the recording role are open decisions (D16), so this data comes
 * from the seed only; no screen creates it.
 */
export type ResortSpend = {
  id: string;
  membershipId: string;
  date: string;
  /** Verified eligible spend in centavos. */
  amountCentavos: number;
  description: string;
  /** refund_hold: source transaction refunded, points held until Finance reconciles. voided: reconciled as lost. */
  status: "verified" | "refund_hold" | "voided";
  verificationRef: string | null;
};

export type PointsEntryStatus = "pending" | "spendable" | "held" | "voided" | "blocked_rounding" | "outside_cycles";

export type PointsEntry = {
  spendId: string;
  date: string;
  cycle: number;
  status: PointsEntryStatus;
  earnedWeekday: number;
  earnedWeekend: number;
  /** Points not credited because a cap was reached (recorded with a capped reason, 09 section 13). */
  cappedExcess: number;
  note: string | null;
};

export type CycleSummary = {
  cycle: number;
  startDate: string;
  endDate: string;
  verifiedSpendCentavos: number;
  minimumSpendCentavos: number;
  minimumReached: boolean;
  weekdayCredited: number;
  weekendCredited: number;
  weekdayCap: number;
  weekendCap: number;
  totalCap: number;
};

export type PointsBalances = {
  spendableWeekday: number;
  spendableWeekend: number;
  pending: number;
  held: number;
  /** Redemption is disabled, so nothing is ever redeemed or reserved. */
  redeemed: 0;
  remainingCapacity: number;
};

export type PointsLedger = {
  entries: PointsEntry[];
  cycles: CycleSummary[];
  balances: PointsBalances;
};
