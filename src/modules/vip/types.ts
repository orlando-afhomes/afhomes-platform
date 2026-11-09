export type VipTierCode = "B1" | "S1" | "G1";

export type ProductChange = {
  version: number;
  date: string;
  actorId: string;
  reason: string;
  summary: string;
};

/**
 * VIP product configuration (doc 05). Prices and benefits are the values stated
 * in the October 2026 standard contracts (05 section 5); they are not settled
 * catalog decisions. A change creates a new configVersion and never alters
 * finalized contracts, which keep their own snapshot (05 section 3.1).
 */
export type VipProduct = {
  code: VipTierCode;
  name: string;
  tier: "Bronze" | "Silver" | "Gold";
  /** Integer centavos. */
  priceCentavos: number;
  /** "conflict" blocks contract finalization (D5). */
  priceStatus: "contract_stated" | "conflict";
  priceNote: string | null;
  /** Total validity in years including extension. */
  validityYears: number;
  /** Years that earn Stay Points cycles; the extension years add none (09 section 8). */
  earningCycles: number;
  vipDiscountPercent: number;
  lifetimePoints: number;
  pointsPerCycle: number;
  weekdayPointsPerCycle: number;
  weekendPointsPerCycle: number;
  minSpendPerCycleCentavos: number;
  supplementaryHolders: number;
  status: "active" | "retired";
  configVersion: number;
  effectiveDate: string | null;
  changes: ProductChange[];
};

export type PaymentSchemeCategory = "cash" | "installment" | "move";

/** Official payment scheme register entry (05 section 8). Move schemes carry no terms until approved (D7). */
export type PaymentScheme = {
  id: string;
  label: string;
  historicalLabel: string | null;
  category: PaymentSchemeCategory;
  /** Card ID payment segment, e.g. C01 or T04 (06 section 6.3). Null where not documented. */
  paymentCode: string | null;
  applicableTiers: VipTierCode[];
  reservationCentavos: number | null;
  installmentCount: number | null;
  /** Equal monthly installment per tier, in centavos. No interest is ever charged (07 section 13). */
  installmentCentavosByTier: Partial<Record<VipTierCode, number>>;
  /**
   * Package price per tier for this scheme, in centavos. Empty for a tier means the
   * catalog price applies. Spot Cash carries its own Full Payment contract price (OD-11).
   */
  priceCentavosByTier: Partial<Record<VipTierCode, number>>;
  /** Monthly payment count per tier when it differs by tier (Move B: 4, 8, 12); falls back to installmentCount. */
  installmentCountByTier?: Partial<Record<VipTierCode, number>>;
  /** Down payment as basis points of the package price, including the reservation fee (Move B: 4,000). */
  downPaymentBasisPoints?: number | null;
  commercialStatus: "configured" | "pending_owner_decision";
  source: string;
  availability: "available" | "unavailable";
  /**
   * Owner hold: while set, the scheme stays pending and unavailable however its
   * terms are edited. Only the owner lifts it (not an Admin input field).
   */
  ownerHold?: string | null;
  configVersion: number;
  /** Business date the current configuration version took effect. */
  effectiveDate: string | null;
  /** Audited configuration history; finalized contracts keep their own snapshot. */
  changes: ProductChange[];
};

/** Historical and reserved tier codes: shown for reference, never auto-activated (05 sections 4 and 19). */
export const NON_ACTIVE_TIER_CODES: ReadonlyArray<{ code: string; label: string; state: "historical" | "reserved" }> = [
  { code: "B2", label: "Super Bronze", state: "historical" },
  { code: "S2", label: "Super Silver", state: "historical" },
  { code: "P1", label: "Elite Prime", state: "historical" },
  { code: "R1", label: "Elite Royale", state: "historical" },
  { code: "G2", label: "Reserved", state: "reserved" },
  { code: "P2", label: "Reserved", state: "reserved" },
  { code: "R2", label: "Reserved", state: "reserved" },
];
