export type PaymentPurpose = "reservation" | "down_payment" | "installment" | "full";

export const PAYMENT_PURPOSES: readonly PaymentPurpose[] = ["reservation", "down_payment", "installment", "full"];
export const PAYMENT_METHODS = ["Cash", "Bank Transfer", "GCash", "Maya", "Card", "Cheque"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Logical lifecycle (07 section 9.3). Reversed and Refunded are linked adjustment events, not states. */
export type PaymentStatus = "submitted" | "under_review" | "verified" | "rejected" | "returned";

export type PaymentAdjustment = {
  id: string;
  kind: "reversal" | "refund";
  amountCentavos: number;
  date: string;
  reason: string;
  actorId: string;
};

type PaymentVersion = Pick<Payment, "purpose" | "amountCentavos" | "method" | "paidDate" | "referenceNo" | "evidenceFileName">;

export type PaymentEvent = {
  at: string;
  actorId: string;
  event: string;
  note: string | null;
  previousVersion?: PaymentVersion;
};

/**
 * Payment record (07 section 8). Evidence is a file name only: no file content
 * is kept. Receipt numbers are never invented; referenceNo is whatever the
 * submitter entered from the real receipt.
 */
export type Payment = {
  id: string;
  contractId: string;
  customerId: string;
  saleId: string | null;
  purpose: PaymentPurpose;
  amountCentavos: number;
  method: PaymentMethod;
  /** Business date on the receipt (YYYY-MM-DD, Asia/Manila). */
  paidDate: string;
  /** Accounting date for a receipt admitted after its own month closed. */
  countedDate?: string;
  referenceNo: string | null;
  evidenceFileName: string | null;
  /** Optional bank (list entry id) for bank transfers and cheques; absent on older receipts. */
  bankId?: string | null;
  submittedBy: string;
  submittedAt: string;
  status: PaymentStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  /** Business date of Finance verification (Verified Collections are dated by this). */
  verifiedDate: string | null;
  decisionReason: string | null;
  adjustments: PaymentAdjustment[];
  history: PaymentEvent[];
};

export type ScheduleLineStatus = "paid" | "partial" | "due" | "overdue" | "upcoming";

export type ScheduleLineState = {
  seq: number;
  label: string;
  amountCentavos: number;
  dueDate: string | null;
  allocatedCentavos: number;
  status: ScheduleLineStatus;
};
