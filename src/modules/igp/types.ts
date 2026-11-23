import type { GenealogyEntry } from "@/modules/contracts/types";
import type { SaleAdjustment } from "@/modules/sales/types";
import type { VipTierCode } from "@/modules/vip/types";

export type IgpScheme = "C" | "T";
export type IgpEntry = "reservation" | "cts";
export type IgpClauses = "S" | "N";
/** Lowest contract price (centavos) at which an IGP buyer's Formal VIP Grant carries this card level. */
export type IgpGrantTierRule = { tier: VipTierCode; minPriceCentavos: number };

/** Owner decision 2026-11-22: PHP 1M Bronze, PHP 2M Silver, PHP 4M Gold. Administrators can edit the minimums. */
export const DEFAULT_IGP_GRANT_TIER_RULES: readonly IgpGrantTierRule[] = [
  { tier: "B1", minPriceCentavos: 100_000_000 },
  { tier: "S1", minPriceCentavos: 200_000_000 },
  { tier: "G1", minPriceCentavos: 400_000_000 },
];

export type IgpStatus = "pending" | "approved" | "defaulted" | "cancelled" | "replaced" | "pending_review";

export type JadAccreditation = {
  memberId: string;
  number: string;
  approvedDate: string;
  validUntil: string;
  replaces: string | null;
};

export type IgpDocumentKey = "reservation" | "cts" | "goodwill_grant" | "deed" | "formal_grant" | "lease" | "spa";
export type IgpDocument = {
  key: IgpDocumentKey;
  status: "pending" | "signed";
  signedDate: string | null;
  signers: string | null;
};

/**
 * IGP buyer membership (doc 14, owner ruling 2026-11-23). Created once, when the Formal VIP Grant is
 * first recorded as signed. It links the IGP Series Number and carries the frozen card tier; it never
 * issues a VIP Number (docs 06/14) and never carries Stay Points (doc 09 belongs to VIP memberships).
 */
export type IgpBuyerMembership = {
  id: string;
  saleId: string;
  /** The IGP Series Number this membership belongs to. Never a VIP Number. */
  seriesNumber: string;
  customerId: string;
  /** Card level frozen from the 2026-11-22 price minimums when the grant was signed; null below the lowest rule. */
  tier: VipTierCode | null;
  grantSignedDate: string;
  status: "recorded";
  /** Always "none": IGP buyer memberships are never credited Stay Points. */
  stayPoints: "none";
};

export type IgpHistoryBatchStatus = "imported";

/** Validated IGP history rows kept for reference. They never become live sales, receipts or commissions. */
export type IgpHistoryRow = {
  rowNumber: number;
  seriesNumber: string;
  date: string;
  priceCentavos: number;
  scheme: IgpScheme;
  termMonths: number;
  clauses: IgpClauses;
  buyerLabel: string;
  status: "active" | "cancelled" | "replaced";
  /** The replacing Series Number. Present only on replaced rows. */
  replaces: string | null;
};

export type IgpHistoryBatch = {
  id: string;
  fileName: string;
  createdAt: string;
  createdBy: string;
  status: IgpHistoryBatchStatus;
  totalRows: number;
  rows: IgpHistoryRow[];
  skipped: Array<{ rowNumber: number; reason: string }>;
};

export type IgpCatalogStatus = "active" | "inactive";

/** A property project the sales team sells units or lots from (admin-managed list). */
export type IgpProject = { id: string; name: string; location: string | null; status: IgpCatalogStatus };

/** A unit or lot of a project; the property owner is stored here and copied onto each sale. */
export type IgpUnit = { id: string; projectId: string; unitOrLot: string; propertyOwner: string; status: IgpCatalogStatus };

export type IgpIntake = {
  customerId: string;
  /** Catalog references. `project`, `unit` and `propertyOwner` below are copies taken at entry, so later list changes never change this sale. */
  projectId: string;
  unitId: string;
  project: string;
  unit: string;
  propertyOwner: string;
  priceCentavos: number;
  scheme: IgpScheme;
  termMonths: number;
  clauses: IgpClauses;
  sellerMemberId: string;
  referrerMemberId: string | null;
  referralReference?: string;
  entry: IgpEntry;
  date: string;
};

export type IgpMilestones = {
  closedDealDate: string | null;
  stage1Date: string | null;
  fullPaymentDate: string | null;
};

export type IgpSale = IgpIntake & IgpMilestones & {
  id: string;
  sequence: number;
  seriesNumber: string;
  status: IgpStatus;
  createdBy: string;
  approvedBy: string | null;
  adjustments: SaleAdjustment[];
  thresholdBp: number;
  sellerJadNumber: string;
  expiryReminders: Array<{ party: "Closing seller" | "Referrer"; validUntil: string }>;
  genealogy: GenealogyEntry[];
  commissionRates: Array<{ memberId: string; role: "DSC" | "DRI"; rateBp: number }>;
  commissionReviewReason: string | null;
  documents: IgpDocument[];
  /** Card level of the Formal VIP Grant, frozen when that document is signed. Null: price below the lowest rule. */
  grantTier?: VipTierCode | null;
  replacesId: string | null;
  replacedById: string | null;
  refund: { amountCentavos: number; date: string | null; reason: string } | null;
};

export type IgpState = {
  sales: IgpSale[];
  accreditations: JadAccreditation[];
  thresholdBp: number;
  grantTierRules: IgpGrantTierRule[];
  projects: IgpProject[];
  units: IgpUnit[];
  /** IGP buyer memberships, created when each Formal VIP Grant is first signed (owner ruling 2026-11-23). */
  buyerMemberships: IgpBuyerMembership[];
  /** Imported IGP history batches (IGP-2). Their Series Numbers are reserved and never reused. */
  historyBatches: IgpHistoryBatch[];
};

/** Synthetic sample catalog for the mock phase. */
export function seedIgpCatalog(): { projects: IgpProject[]; units: IgpUnit[] } {
  // Invented, generic names for the prototype; they do not refer to any real development or company.
  return {
    projects: [
      { id: "igp-prj-1", name: "Altamira Ridge Residences", location: "Santa Rosa City, Laguna", status: "active" },
      { id: "igp-prj-2", name: "Lakeview Narra Estates", location: "Calamba City, Laguna", status: "active" },
      { id: "igp-prj-3", name: "Casa Sampaguita Townhomes", location: "Biñan City, Laguna", status: "active" },
    ],
    units: [
      { id: "igp-unit-1", projectId: "igp-prj-1", unitOrLot: "Unit 12A", propertyOwner: "Altamira Land Development Corporation", status: "active" },
      { id: "igp-unit-2", projectId: "igp-prj-1", unitOrLot: "Unit 14B", propertyOwner: "Altamira Land Development Corporation", status: "active" },
      { id: "igp-unit-3", projectId: "igp-prj-2", unitOrLot: "Block 3 Lot 5", propertyOwner: "Narra Ridge Realty Inc.", status: "active" },
      { id: "igp-unit-4", projectId: "igp-prj-2", unitOrLot: "Block 3 Lot 9", propertyOwner: "Narra Ridge Realty Inc.", status: "active" },
      { id: "igp-unit-5", projectId: "igp-prj-3", unitOrLot: "Phase 2 Unit 7", propertyOwner: "Sampaguita Homes and Properties Inc.", status: "active" },
      { id: "igp-unit-6", projectId: "igp-prj-3", unitOrLot: "Phase 2 Unit 8 (corner)", propertyOwner: "Sampaguita Homes and Properties Inc.", status: "active" },
    ],
  };
}

export function createIgpState(): IgpState {
  return { sales: [], accreditations: [], thresholdBp: 1_000, grantTierRules: DEFAULT_IGP_GRANT_TIER_RULES.map((rule) => ({ ...rule })), ...seedIgpCatalog(), buyerMemberships: [], historyBatches: [] };
}
