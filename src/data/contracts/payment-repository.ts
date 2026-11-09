import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Payment, PaymentMethod, PaymentPurpose } from "@/modules/finance/types";

export type PaymentView = Payment & { customerName: string; contractLabel: string; submitterName: string };

export type SubmitPaymentInput = {
  contractId: string;
  purpose: PaymentPurpose;
  amountCentavos: number;
  method: PaymentMethod;
  paidDate: string;
  referenceNo?: string | null;
  evidenceFileName?: string | null;
};

export interface PaymentRepository {
  list(options?: MockAsyncOptions): Promise<PaymentView[]>;
  submit(input: SubmitPaymentInput, options?: MockAsyncOptions): Promise<PaymentView>;
  /** Corrects a Returned payment; the original submission stays in history. */
  resubmit(id: string, input: Partial<Omit<SubmitPaymentInput, "contractId">>, options?: MockAsyncOptions): Promise<PaymentView>;
  startReview(id: string, options?: MockAsyncOptions): Promise<PaymentView>;
  verify(id: string, options?: MockAsyncOptions): Promise<PaymentView>;
  reject(id: string, reason: string, options?: MockAsyncOptions): Promise<PaymentView>;
  returnForCorrection(id: string, reason: string, options?: MockAsyncOptions): Promise<PaymentView>;
  /** Reversal or refund of a verified payment, capped at the remaining verified amount and never deleting the payment. */
  adjust(id: string, input: { kind: "reversal" | "refund"; amountCentavos: number; reason: string }, options?: MockAsyncOptions): Promise<PaymentView>;
}
