/** Logical commission states (08 section 12). Approved is not Paid; Paid needs confirmed disbursement. */
export type CommissionStatus = "released" | "approved" | "on_hold" | "paid" | "cancelled";

export type CommissionProduct = "VIP" | "IGP";
export type CommissionRole = "DSC" | "DRI";
export type CommissionStage = "stage1" | "full";
export type FrozenCommissionRate = { memberId: string; role: CommissionRole; rateBp: number };

export type CommissionRateSetting = FrozenCommissionRate & {
  product: CommissionProduct;
  standardRateBp: number | null;
};

export type CommissionClawbackTrigger = "cancellation" | "rescission" | "downgrade" | "default" | "returned_cheque";

export type CommissionClawback = {
  id: string;
  commissionId: string;
  saleId: string;
  recipientMemberId: string;
  trigger: CommissionClawbackTrigger;
  raisedDate: string;
  amountCentavos: number;
  recoveries: { date: string; amountCentavos: number; reference: string; actorId: string }[];
  writeOff: { date: string; actorId: string; reason: string } | null;
  refundDueCentavos?: number;
};

export type CommissionPayoutList = {
  id: string;
  month: string;
  entries: { commissionId: string; saleId: string; recipientMemberId: string; amountCentavos: number; recipientName?: string; saleLabel?: string }[];
  preparedBy: string;
  preparedAt: string;
  approvedBy: string | null;
  approvedAt: string | null;
  approvedCommissionIds?: string[];
};

export type CommissionPayout = {
  reference: string;
  method: string | null;
  payoutDate: string;
  /** Posting date assigned on confirmation, moved forward if the payout month is closed. */
  countedDate?: string;
  processedBy: string;
  initiatedAt: string;
  /** Set only when disbursement is confirmed; until then the commission is not Paid (08 section 15.4). */
  confirmedAt: string | null;
  evidenceFileName?: string | null;
};

export type CommissionEvent = { at: string; actorId: string; event: string; note: string | null };

/** One record per released stage and DSC or DRI role. */
export type Commission = {
  id: string;
  saleId: string;
  contractId: string;
  recipientMemberId: string;
  recipientName: string;
  recipientDesignation: string;
  /** Contract price snapshot in centavos (08 section 10.2). */
  basisCentavos: number;
  /** The approved seller rate frozen at number issuance (1% = 100 basis points). */
  percentBp: number;
  amountCentavos: number;
  product?: CommissionProduct;
  role?: CommissionRole;
  stage?: CommissionStage;
  releaseDate?: string;
  previousPayouts?: (CommissionPayout & { voidedAt: string; voidedBy: string; reason: string })[];
  holdTrigger?: CommissionClawbackTrigger;
  releaseRestorable?: boolean;
  rereleaseAfter?: string;
  status: CommissionStatus;
  approvedBy: string;
  approvedAt: string;
  holdReason: string | null;
  payout: CommissionPayout | null;
  history: CommissionEvent[];
};
