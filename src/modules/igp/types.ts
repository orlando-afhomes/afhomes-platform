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

export type IgpIntake = {
  customerId: string;
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
};

export function createIgpState(): IgpState {
  return { sales: [], accreditations: [], thresholdBp: 1_000 };
}
