import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Commission } from "@/modules/commissions/types";

export type CommissionView = Commission & {
  customerName: string;
  /** First date a payout may be recorded (7 days after 40% was verified); null while 40% is not reached. */
  payoutReleaseDate: string | null;
};

export type EligibleSale = {
  saleId: string;
  customerName: string;
  productCode: string;
  valueCentavos: number;
  confirmedDate: string | null;
  recipients: Array<{ memberId: string; displayName: string; designation: string; existingCommissionId: string | null }>;
};

export type ApproveCommissionInput = {
  saleId: string;
  /** Finance-assigned percentage per selected recipient, in basis points. */
  entries: Array<{ memberId: string; percentBp: number }>;
};

export interface CommissionRepository {
  list(options?: MockAsyncOptions): Promise<CommissionView[]>;
  listEligibleSales(options?: MockAsyncOptions): Promise<EligibleSale[]>;
  approve(input: ApproveCommissionInput, options?: MockAsyncOptions): Promise<CommissionView[]>;
  adjust(id: string, percentBp: number, reason: string, options?: MockAsyncOptions): Promise<CommissionView>;
  resolveHold(id: string, action: "keep" | "cancel" | "restore", reason: string, options?: MockAsyncOptions): Promise<CommissionView>;
  cancel(id: string, reason: string, options?: MockAsyncOptions): Promise<CommissionView>;
  /** Records an initiated payout. Not Paid until disbursement is confirmed (08 section 15.4). */
  recordPayout(id: string, input: { reference: string; method?: string | null; payoutDate: string }, options?: MockAsyncOptions): Promise<CommissionView>;
  confirmPayout(id: string, options?: MockAsyncOptions): Promise<CommissionView>;
}
