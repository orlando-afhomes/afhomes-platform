import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Contract, ContractCancellationGround } from "@/modules/contracts/types";
import type { Sale } from "@/modules/sales/types";
import type { CommissionRole } from "@/modules/commissions/types";

/** Contract plus joined display values, so roles without customer access never need the customer record. */
export type ContractView = Contract & {
  customerName: string;
  sellerName: string | null;
  sale: Pick<Sale, "id" | "status" | "confirmedDate"> | null;
  /** Reasons finalization is currently held; empty when the contract can be finalized. */
  holds: string[];
  missingCommissionRates: { role: CommissionRole; memberName: string | null }[];
};

export type PrepareContractInput = {
  customerId: string;
  /** A stable request ID for an explicitly separate purchase. Retrying it reopens the same contract. */
  newPurchaseRequestId?: string;
  schemeId: string;
  productCode?: Sale["productCode"];
  classification?: Contract["classification"];
  sellerMemberId?: string;
  referrerMemberId?: string | null;
  /** Reservation date (YYYY-MM-DD, Asia/Manila) that due dates derive from; defaults to the preparation date. */
  reservationDate?: string;
  /** Optional due dates per schedule sequence (YYYY-MM-DD); they override the derived dates. */
  dueDates?: Record<number, string>;
  customerAccepted: boolean;
  /** Required for a Non-Standard (N) contract and refused for Standard (doc 05 §10.2). */
  nonStandardTerms?: NonStandardTermsInput;
};

/** Non-Standard price, number of monthly payments and reason (doc 05 §10.2). */
export type NonStandardTermsInput = { priceCentavos: number; months: number; justification: string };

export type UpdateContractInput = {
  dueDates?: Record<number, string>;
  customerAccepted?: boolean;
  /** New Non-Standard terms; allowed only while Draft or Returned, and they clear both approvals. */
  nonStandardTerms?: NonStandardTermsInput;
};

export interface ContractRepository {
  list(options?: MockAsyncOptions): Promise<ContractView[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<ContractView | null>;
  prepare(input: PrepareContractInput, options?: MockAsyncOptions): Promise<ContractView>;
  /** Edits a Draft or Returned contract. */
  update(id: string, input: UpdateContractInput, options?: MockAsyncOptions): Promise<ContractView>;
  submit(id: string, options?: MockAsyncOptions): Promise<ContractView>;
  returnForCorrection(id: string, reason: string, options?: MockAsyncOptions): Promise<ContractView>;
  finalize(id: string, options?: MockAsyncOptions): Promise<ContractView>;
  /** Direct cancellation; refused once the contract has verified payments or a Confirmed sale. */
  cancel(id: string, reason: string, options?: MockAsyncOptions): Promise<ContractView>;
  /** Admin requests a cancellation with forfeiture on a Reservation Agreement ground (OD-2). */
  requestCancellation(id: string, ground: ContractCancellationGround, reason: string, options?: MockAsyncOptions): Promise<ContractView>;
  /** Finance (not the requester) confirms or declines a requested cancellation (OD-2). */
  decideCancellation(id: string, decision: "confirm" | "decline", reason: string, options?: MockAsyncOptions): Promise<ContractView>;
  /** Records the Reservation Agreement reference from the signed form; collisions are flagged, not suffixed. */
  recordSignedAgreement(id: string, options?: MockAsyncOptions): Promise<ContractView>;
  /** Super Admin records the written approval of a Move arrangement (owner decision 2026-11-09). */
  approveArrangement(id: string, approvalReference: string, options?: MockAsyncOptions): Promise<ContractView>;
  /** Step 1 of doc 05 §10.2: the Administrator or Super Administrator approves Non-Standard terms with the signed-approval reference. */
  approveNonStandard(id: string, approvalReference: string, options?: MockAsyncOptions): Promise<ContractView>;
  /** Step 2 of doc 05 §10.2: Finance confirms the Non-Standard price and payments. */
  confirmNonStandard(id: string, options?: MockAsyncOptions): Promise<ContractView>;
  /** Auditable recode of the Card ID payment segment for pre-resolution Move contracts; new contracts snapshot it at prepare. */
  resolvePaymentCode(id: string, approvalReference: string, options?: MockAsyncOptions): Promise<ContractView>;
}
