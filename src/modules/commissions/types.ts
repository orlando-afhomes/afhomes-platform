/** Logical commission states (08 section 12). Approved is not Paid; Paid needs confirmed disbursement. */
export type CommissionStatus = "approved" | "on_hold" | "paid" | "cancelled";

export type CommissionPayout = {
  reference: string;
  method: string | null;
  payoutDate: string;
  processedBy: string;
  initiatedAt: string;
  /** Set only when disbursement is confirmed; until then the commission is not Paid (08 section 15.4). */
  confirmedAt: string | null;
};

export type CommissionEvent = { at: string; actorId: string; event: string; note: string | null };

/** One record per recipient of a Confirmed Sale (08 section 22 Scenario C). */
export type Commission = {
  id: string;
  saleId: string;
  contractId: string;
  recipientMemberId: string;
  recipientName: string;
  recipientDesignation: string;
  /** Finalized contract value snapshot in centavos; never the catalog price (08 section 10.2). */
  basisCentavos: number;
  /** Finance-assigned percentage in basis points (1% = 100). No default rate exists (08 section 9.1). */
  percentBp: number;
  amountCentavos: number;
  status: CommissionStatus;
  approvedBy: string;
  approvedAt: string;
  holdReason: string | null;
  payout: CommissionPayout | null;
  history: CommissionEvent[];
};
