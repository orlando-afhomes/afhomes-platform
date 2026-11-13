import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Commission, CommissionClawback, CommissionPayoutList, CommissionRateSetting } from "@/modules/commissions/types";
import type { AllowanceReview, AllowanceReviewInput } from "@/modules/commissions/allowances";

export type CommissionRateView = CommissionRateSetting & { memberName: string };
export type CommissionRateDirectory = { members: { id: string; name: string }[]; rates: CommissionRateView[] };

export type CommissionView = Commission & {
  customerName: string;
  saleReference?: string;
  /** First date a payout may be recorded after the release month. */
  payoutReleaseDate: string | null;
};

export interface CommissionRepository {
  rateDirectory(options?: MockAsyncOptions): Promise<CommissionRateDirectory>;
  setRate(input: CommissionRateSetting & { reason: string }, options?: MockAsyncOptions): Promise<void>;
  payoutLists(options?: MockAsyncOptions): Promise<CommissionPayoutList[]>;
  preparePayoutList(month: string, options?: MockAsyncOptions): Promise<CommissionPayoutList>;
  approvePayoutList(id: string, options?: MockAsyncOptions): Promise<CommissionPayoutList>;
  clawbacks(options?: MockAsyncOptions): Promise<CommissionClawback[]>;
  recordRecovery(id: string, input: { amountCentavos: number; reference: string }, options?: MockAsyncOptions): Promise<void>;
  writeOff(id: string, reason: string, options?: MockAsyncOptions): Promise<void>;
  allowanceReviews(options?: MockAsyncOptions): Promise<{ reviews: AllowanceReview[]; members: { id: string; name: string; position: AllowanceReview["position"] }[] }>;
  saveAllowanceReview(input: AllowanceReviewInput, options?: MockAsyncOptions): Promise<AllowanceReview>;
  list(options?: MockAsyncOptions): Promise<CommissionView[]>;
  adjust(id: string, percentBp: number, reason: string, options?: MockAsyncOptions): Promise<CommissionView>;
  resolveHold(id: string, action: "keep" | "cancel" | "restore", reason: string, options?: MockAsyncOptions): Promise<CommissionView>;
  cancel(id: string, reason: string, options?: MockAsyncOptions): Promise<CommissionView>;
  /** Records an initiated payout. Not Paid until disbursement is confirmed (08 section 15.4). */
  recordPayout(id: string, input: { reference: string; method?: string | null; payoutDate: string; evidenceFileName?: string }, options?: MockAsyncOptions): Promise<CommissionView>;
  confirmPayout(id: string, options?: MockAsyncOptions): Promise<CommissionView>;
  voidPayout(id: string, reason: string, options?: MockAsyncOptions): Promise<CommissionView>;
}
