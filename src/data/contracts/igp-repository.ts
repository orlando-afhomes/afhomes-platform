import type { IgpDocumentKey, IgpIntake, IgpSale, JadAccreditation } from "@/modules/igp/types";
import type { Designation } from "@/modules/organization/types";
import type { MockAsyncOptions } from "./async-options";
import type { SubmitPaymentInput } from "./payment-repository";

export type IgpSaleView = IgpSale & { buyerName: string; referrerName: string | null; collectedCentavos: number; defaultReviewDue: boolean };
export type IgpRegister = {
  sales: IgpSaleView[];
  buyers: Array<{ value: string; label: string }>;
  sellers: Array<{ value: string; label: string; designation: Designation; branchId: string }>;
  accreditations: JadAccreditation[];
  thresholdBp: number;
};

/** The project, unit and owner names are copied from the catalog when the sale is saved. */
type CatalogCopy = "project" | "unit" | "propertyOwner";
export type RecordIgpSale = Omit<IgpIntake, CatalogCopy> & { payment: Omit<SubmitPaymentInput, "contractId" | "purpose"> };
export type ReissueIgpSale = Pick<IgpIntake, "projectId" | "unitId" | "priceCentavos" | "scheme" | "termMonths" | "clauses" | "date"> & { reason: string };
export type CorrectIgpSale = Pick<IgpIntake, "priceCentavos" | "referrerMemberId" | "referralReference"> & { reason: string };
export type IgpAction =
  | { type: "record"; input: RecordIgpSale }
  | { type: "accredit"; memberId: string; number: string; approvedDate: string }
  | { type: "threshold"; basisPoints: number; reason: string }
  | { type: "approve"; id: string }
  | { type: "default"; id: string; reason: string }
  | { type: "cancel"; id: string; refundCentavos: number; refundDate: string | null; reason: string }
  | { type: "reissue"; id: string; input: ReissueIgpSale }
  | { type: "correct"; id: string; input: CorrectIgpSale }
  | { type: "document"; id: string; key: IgpDocumentKey; signedDate: string; signers: string };

export interface IgpRepository {
  list(options?: MockAsyncOptions): Promise<IgpRegister>;
  act(action: IgpAction, options?: MockAsyncOptions): Promise<IgpSale | null>;
}
