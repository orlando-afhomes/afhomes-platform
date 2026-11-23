import type { Designation } from "@/modules/organization/types";

/** Logical commission states (08 section 12). Approved is not Paid; Paid needs confirmed disbursement. */
export type CommissionStatus = "released" | "approved" | "on_hold" | "paid" | "cancelled";

export type CommissionProduct = "VIP" | "IGP";
export type CommissionRole = "DSC" | "DRI";

/** Plain words for the commission role codes (doc 08): DSC is the closing seller, DRI the referrer. */
export const COMMISSION_ROLE_LABELS: Readonly<Record<CommissionRole, string>> = {
  DSC: "Closing seller",
  DRI: "Referrer",
};

/** Display label of a stored commission role; unknown values pass through unchanged. */
/** How Finance can pay a commission out. A fixed list so every payout record uses the same names. */
export const PAYOUT_METHODS = ["Bank Transfer", "GCash", "Maya", "Cash", "Cheque"] as const;
export type PayoutMethod = (typeof PAYOUT_METHODS)[number];

export function commissionRoleLabel(role: string): string {
  return COMMISSION_ROLE_LABELS[role as CommissionRole] ?? role;
}
export type CommissionStage = "stage1" | "full";
export type FrozenCommissionRate = { memberId: string; role: CommissionRole; rateBp: number };

export type CommissionRateSetting = FrozenCommissionRate & {
  product: CommissionProduct;
  standardRateBp: number | null;
};

/** An Admin-approved VIP standard offered when confirming a seller's service terms. */
export type VipPositionRate = {
  designation: Designation;
  role: CommissionRole;
  rateBp: number;
  approvalReference: string;
};

export type ApplyVipPositionRateInput = {
  memberId: string;
  standard: VipPositionRate;
  serviceTermsReference: string;
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
  /** Paybacks taken out of this list's payouts when it was approved (owner decision 2026-11-22). Amounts in the entries stay gross. */
  offsets?: { recipientMemberId: string; clawbackId: string; amountCentavos: number }[];
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
  /** Proof content as a data URL, kept in the browser-scoped mock store for the viewer. */
  evidenceFileDataUrl?: string | null;
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
