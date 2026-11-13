import type { VipTierCode } from "@/modules/vip/types";

/** Membership states (06 section 5). Holds are separate flags, not states (D13 interim). */
export type MembershipStatus = "pending" | "active" | "expired" | "cancelled" | "suspended";

export type MembershipEvent = { at: string; actorId: string; event: string; note: string | null };

export type CardServiceInput = {
  requestReference: string;
  approvalReference: string;
} & (
  | { kind: "replacement"; custody: "voided" | "recalled" }
  | { kind: "transfer"; nextCustomerId: string; holderNotified: boolean }
  | { kind: "inheritance"; nextCustomerId: string; inheritanceReference: string; acknowledgementReference: string }
);

export type CardServiceRecord = CardServiceInput & {
  previousCustomerId: string;
  date: string;
  actorId: string;
  entitlementVersion: number;
};

export type Membership = {
  id: string;
  customerId: string;
  contractId: string;
  productCode: VipTierCode;
  status: MembershipStatus;
  /** Official activation date in Asia/Manila. */
  activationDate: string | null;
  fullSettlementDate?: string | null;
  cardClaimDate?: string | null;
  cardClaimKind?: "actual" | "deemed";
  cardServices?: CardServiceRecord[];
  /** Provisional: the expiration boundary convention is an open decision (D12). */
  validityEndDate: string | null;
  /** The issued VIP Number used on the card. */
  cardId: string | null;
  raNumber: string | null;
  financialHold: boolean;
  createdAt: string;
  history: MembershipEvent[];
};
