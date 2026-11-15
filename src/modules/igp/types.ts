import type { GenealogyEntry } from "@/modules/contracts/types";
import type { SaleAdjustment } from "@/modules/sales/types";

export type IgpScheme = "C" | "T";
export type IgpEntry = "reservation" | "cts";
export type IgpClauses = "S" | "N";
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
  replacesId: string | null;
  replacedById: string | null;
  refund: { amountCentavos: number; date: string | null; reason: string } | null;
};

export type IgpState = {
  sales: IgpSale[];
  accreditations: JadAccreditation[];
  thresholdBp: number;
  projects: IgpProject[];
  units: IgpUnit[];
};

/** Synthetic sample catalog for the mock phase. */
export function seedIgpCatalog(): { projects: IgpProject[]; units: IgpUnit[] } {
  return {
    projects: [
      { id: "igp-prj-1", name: "Sample Heights", location: "Sample City", status: "active" },
      { id: "igp-prj-2", name: "Sample Gardens", location: null, status: "active" },
    ],
    units: [
      { id: "igp-unit-1", projectId: "igp-prj-1", unitOrLot: "Unit 12A", propertyOwner: "Sample Property Owner", status: "active" },
      { id: "igp-unit-2", projectId: "igp-prj-1", unitOrLot: "Unit 14B", propertyOwner: "Sample Property Owner", status: "active" },
      { id: "igp-unit-3", projectId: "igp-prj-2", unitOrLot: "Lot 5", propertyOwner: "Sample Land Holdings", status: "active" },
      { id: "igp-unit-4", projectId: "igp-prj-2", unitOrLot: "Lot 9", propertyOwner: "Sample Land Holdings", status: "active" },
    ],
  };
}

export function createIgpState(): IgpState {
  return { sales: [], accreditations: [], thresholdBp: 1_000, ...seedIgpCatalog() };
}
