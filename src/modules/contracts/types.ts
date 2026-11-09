import type { ContractClassification } from "@/modules/customers/types";
import type { PaymentPurpose } from "@/modules/finance/types";
import type { VipTierCode } from "@/modules/vip/types";

export type ContractStatus = "draft" | "submitted" | "under_review" | "returned" | "finalized" | "cancelled";

export type ScheduleItem = {
  seq: number;
  label: string;
  purpose: PaymentPurpose;
  amountCentavos: number;
  /** Due dates come from the contract Annex A; null until entered. */
  dueDate: string | null;
};

export type GenealogyEntry = { memberId: string; displayName: string; designation: string };

export type BenefitsSnapshot = {
  vipDiscountPercent: number;
  earningCycles: number;
  lifetimePoints: number;
  pointsPerCycle: number;
  weekdayPointsPerCycle: number;
  weekendPointsPerCycle: number;
  minSpendPerCycleCentavos: number;
  supplementaryHolders: number;
};

export type ContractEvent = { at: string; actorId: string; event: string; note: string | null };

/**
 * VIP contract (doc 05 section 11). Price, scheme, schedule, validity and
 * benefits are a fixed snapshot taken at preparation; later catalog changes
 * never rewrite a contract (05 section 3.1).
 */
export type Contract = {
  id: string;
  customerId: string;
  productCode: VipTierCode;
  productConfigVersion: number;
  priceCentavos: number;
  priceStatus: "contract_stated" | "conflict";
  schemeId: string;
  schemeLabel: string;
  schemeStatus: "configured" | "pending_owner_decision";
  paymentCode: string | null;
  classification: ContractClassification;
  validityYears: number;
  benefits: BenefitsSnapshot;
  schedule: ScheduleItem[];
  /** Cumulative verified amount that confirms the sale. Interim rule D25. */
  requiredInitialCentavos: number | null;
  /** Reservation Agreement reference entered from the signed form. Format pending D2/D11. */
  raNumber: string | null;
  sellerMemberId: string | null;
  /** Seller and upline at recording time; later transfers never change it (02, 13 section 4.3). */
  genealogy: GenealogyEntry[];
  status: ContractStatus;
  customerAccepted: boolean;
  preparedBy: string;
  createdAt: string;
  submittedAt: string | null;
  reviewedBy: string | null;
  finalizedAt: string | null;
  returnReason: string | null;
  cancelReason: string | null;
  /** Two-step cancellation with forfeiture (owner decision OD-2); absent or null when none was requested. */
  cancellation?: ContractCancellation | null;
  /**
   * Special arrangement (Move A or Move B), tracked separately from the payment code,
   * which records only the pricing category (owner decision 2026-11-09). Absent or null
   * for standard schemes.
   */
  arrangement?: SpecialArrangement | null;
  history: ContractEvent[];
};

/** Written approval of a Move arrangement by Super Admin (deck slide 16; owner decision 2026-11-09). */
export type SpecialArrangement = {
  schemeLabel: string;
  status: "pending" | "approved";
  approvedBy: string | null;
  approvedAt: string | null;
  /** Reference to the signed written approval. */
  approvalReference: string | null;
};

/** Grounds from the Reservation Agreement CANCELLATION clause. */
export const CANCELLATION_GROUNDS = ["non_payment", "false_information", "voluntary_withdrawal"] as const;
export type ContractCancellationGround = (typeof CANCELLATION_GROUNDS)[number];
export const CANCELLATION_GROUND_LABELS: Record<ContractCancellationGround, string> = {
  non_payment: "Non-payment within the required period",
  false_information: "False or misleading information",
  voluntary_withdrawal: "Voluntary withdrawal",
};

export type ContractCancellation = {
  ground: ContractCancellationGround;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: "requested" | "confirmed";
  decidedBy: string | null;
  decidedAt: string | null;
  /** Net verified money retained at confirmation; payments stay Verified and on record. */
  forfeitedCentavos: number | null;
};
