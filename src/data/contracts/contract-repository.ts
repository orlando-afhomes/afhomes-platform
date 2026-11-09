import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Contract, ContractCancellationGround } from "@/modules/contracts/types";
import type { Sale } from "@/modules/sales/types";

/** Contract plus joined display values, so roles without customer access never need the customer record. */
export type ContractView = Contract & {
  customerName: string;
  sellerName: string | null;
  sale: Pick<Sale, "id" | "status"> | null;
  /** Reasons finalization is currently held; empty when the contract can be finalized. */
  holds: string[];
};

export type PrepareContractInput = {
  customerId: string;
  schemeId: string;
  /** Optional due dates per schedule sequence (YYYY-MM-DD). */
  dueDates?: Record<number, string>;
  customerAccepted: boolean;
};

export type UpdateContractInput = {
  dueDates?: Record<number, string>;
  customerAccepted?: boolean;
};

export interface ContractRepository {
  list(options?: MockAsyncOptions): Promise<ContractView[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<ContractView | null>;
  prepare(input: PrepareContractInput, options?: MockAsyncOptions): Promise<ContractView>;
  /** Edits a Draft or Returned contract. */
  update(id: string, input: UpdateContractInput, options?: MockAsyncOptions): Promise<ContractView>;
  submit(id: string, options?: MockAsyncOptions): Promise<ContractView>;
  startReview(id: string, options?: MockAsyncOptions): Promise<ContractView>;
  returnForCorrection(id: string, reason: string, options?: MockAsyncOptions): Promise<ContractView>;
  finalize(id: string, options?: MockAsyncOptions): Promise<ContractView>;
  /** Direct cancellation; refused once the contract has verified payments or a Confirmed sale. */
  cancel(id: string, reason: string, options?: MockAsyncOptions): Promise<ContractView>;
  /** Admin requests a cancellation with forfeiture on a Reservation Agreement ground (OD-2). */
  requestCancellation(id: string, ground: ContractCancellationGround, reason: string, options?: MockAsyncOptions): Promise<ContractView>;
  /** Finance (not the requester) confirms or declines a requested cancellation (OD-2). */
  decideCancellation(id: string, decision: "confirm" | "decline", reason: string, options?: MockAsyncOptions): Promise<ContractView>;
  /** Records the Reservation Agreement reference from the signed form; collisions are flagged, not suffixed. */
  recordRaNumber(id: string, raNumber: string, options?: MockAsyncOptions): Promise<ContractView>;
}
