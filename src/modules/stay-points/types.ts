import type { BenefitsSnapshot } from "@/modules/contracts/types";
import type { PointsBucket } from "@/modules/redemption/types";

export type ResortSpend = {
  id: string;
  membershipId: string;
  date: string;
  /** Gross pre-discount less excluded components, in exact centavos. */
  amountCentavos: number;
  description: string;
  status: "submitted" | "verified" | "voided";
  verificationRef: string | null;
  venueId?: string;
  grossCentavos?: number;
  excludedCentavos?: number;
  holder?: "primary" | "supplementary";
  enteredBy?: string;
  approvedBy?: string;
  approvedDate?: string;
};

export type SpendRefund = { id: string; spendId: string; date: string; amountCentavos: number; reason: string; actorId: string };

export const WAIVER_GROUNDS = ["Hospitalization or serious illness", "Residence outside the Philippines", "Government travel restrictions or public health emergency", "Other extraordinary circumstances"] as const;

export type WaiverRequest = {
  id: string;
  membershipId: string;
  tranche: number;
  date: string;
  ground: (typeof WAIVER_GROUNDS)[number];
  supportingReference: string;
  requestedBy: string;
  decision?: { granted: boolean; actorId: string; date: string; reason: string; releaseDate: string | null };
};

export type PointsTerms = {
  membershipId: string;
  vipNumber: string;
  fullSettlementDate: string;
  claimDate: string;
  validityEndDate: string;
  financialHold: boolean;
  restoredFromHoldOn?: string;
  mayRelease: boolean;
  benefits: Pick<BenefitsSnapshot, "earningCycles" | "minSpendPerCycleCentavos" | "weekdayPointsPerCycle" | "weekendPointsPerCycle">;
};

export type TrancheStatus = "unreleased" | "released" | "released_by_waiver" | "non_activated" | "forfeited";

export type PointsTranche = {
  number: number;
  dueDate: string;
  startDate: string;
  endDate: string;
  qualifyingCentavos: number;
  minimumCentavos: number;
  status: TrancheStatus;
  releaseDate: string | null;
};

export type GiftLedgerEntry = {
  membershipId: string;
  vipNumber: string;
  tranche: number;
  bucket: PointsBucket;
  type: "release" | "waiver_release" | "expiry" | "transfer";
  points: number;
  date: string;
  reference: string | null;
  actorId: string;
};

export type PointsUse = Record<PointsBucket, number>;
export type TrancheUse = Record<number, PointsUse>;
export type PointsMovement = { reserved: TrancheUse; redeemed: TrancheUse; forfeited: TrancheUse };

export type StayPointsState = {
  ledger: GiftLedgerEntry[];
  refunds: SpendRefund[];
  waivers: WaiverRequest[];
  deemedPads: Record<string, string>;
  transferDates: Record<string, string>;
};

export type PointsLedger = {
  padDate: string | null;
  tranches: PointsTranche[];
  entries: GiftLedgerEntry[];
  balances: { spendableWeekday: number; spendableWeekend: number; released: number; reserved: number; redeemed: number; forfeited: number };
};
