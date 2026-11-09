import type { VipTierCode } from "@/modules/vip/types";

/** Membership states (06 section 5). Holds are separate flags, not states (D13 interim). */
export type MembershipStatus = "pending" | "active" | "expired" | "cancelled" | "suspended";

export type MembershipEvent = { at: string; actorId: string; event: string; note: string | null };

export type Membership = {
  id: string;
  customerId: string;
  contractId: string;
  productCode: VipTierCode;
  status: MembershipStatus;
  /** Official activation date in Asia/Manila; validity runs from it (05 section 19). */
  activationDate: string | null;
  /** Provisional: the expiration boundary convention is an open decision (D12). */
  validityEndDate: string | null;
  /** 17-character official Card ID, assigned once at activation and never regenerated (06 section 9). */
  cardId: string | null;
  raNumber: string | null;
  financialHold: boolean;
  createdAt: string;
  history: MembershipEvent[];
};
