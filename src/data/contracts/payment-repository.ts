import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { Payment, PaymentMethod, PaymentPurpose, SubmitUnmatchedReceiptInput, UnmatchedReceipt } from "@/modules/finance/types";

export type PaymentView = Payment & { customerName: string; contractLabel: string; submitterName: string; isIgp?: boolean; approvalBlocked?: boolean; referenceConflict?: boolean };
export type PaymentVerificationOptions = MockAsyncOptions & { exceptionReason?: string };
export type UnmatchedReceiptView = UnmatchedReceipt & { submitterName: string };

export type MatchUnmatchedReceiptInput = {
  contractId: string;
  purpose: PaymentPurpose;
  /** Optional Finance note recorded on the match; the money fields stay frozen. */
  note?: string | null;
};

export type SubmitPaymentInput = {
  contractId: string;
  purpose: PaymentPurpose;
  amountCentavos: number;
  method: PaymentMethod;
  paidDate: string;
  /** Ignored on submit: the system generates the payment reference. Kept for repository compatibility. */
  referenceNo?: string | null;
  /** Invoice / Official Receipt number of the document issued for this collection. */
  documentNo?: string | null;
  evidenceFileName?: string | null;
  /** File content as a data URL; kept in the browser-scoped mock store for the viewer. */
  evidenceDataUrl?: string | null;
  /** Optional bank (admin-managed list entry id) for bank transfers and cheques. */
  bankId?: string | null;
};

export interface PaymentRepository {
  list(options?: MockAsyncOptions): Promise<PaymentView[]>;
  submit(input: SubmitPaymentInput, options?: MockAsyncOptions): Promise<PaymentView>;
  /** Corrects a Returned payment; the original submission stays in history. */
  resubmit(id: string, input: Partial<Omit<SubmitPaymentInput, "contractId">>, options?: MockAsyncOptions): Promise<PaymentView>;
  verify(id: string, options?: PaymentVerificationOptions): Promise<PaymentView>;
  reject(id: string, reason: string, options?: MockAsyncOptions): Promise<PaymentView>;
  returnForCorrection(id: string, reason: string, options?: MockAsyncOptions): Promise<PaymentView>;
  /** Reversal or refund of a verified payment, capped at the remaining verified amount and never deleting the payment. */
  adjust(id: string, input: { kind: "reversal" | "refund"; amountCentavos: number; reason: string }, options?: MockAsyncOptions): Promise<PaymentView>;
  /** Unmatched receipts waiting in the Finance exceptions queue (F6.5). */
  listUnmatched(options?: MockAsyncOptions): Promise<UnmatchedReceiptView[]>;
  /** Records a receipt with no matching contract; it waits in the exceptions queue with its reason. */
  submitUnmatched(input: SubmitUnmatchedReceiptInput, options?: MockAsyncOptions): Promise<UnmatchedReceiptView>;
  /**
   * Links an unmatched receipt to a contract, creating a submitted payment with
   * the same frozen money (OR kept as the document number). Finance verifies it
   * separately; a receipt dated in a closed month counts in the first open month
   * (docs 07 section 9.1, 13 section 4.5). The unmatched record is kept.
   */
  matchUnmatched(id: string, input: MatchUnmatchedReceiptInput, options?: MockAsyncOptions): Promise<PaymentView>;
  /** Rejects an unmatched receipt with a reason; the record is kept, never deleted. */
  rejectUnmatched(id: string, reason: string, options?: MockAsyncOptions): Promise<UnmatchedReceiptView>;
}
