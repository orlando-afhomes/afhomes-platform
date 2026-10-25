export type CustomerStatus = "draft" | "submitted" | "active_member" | "inactive";

export type Customer = {
  id: string;
  displayName: string;
  branchId: string;
  ownerMemberId: string | null;
  status: CustomerStatus;
};

export type CustomerDraftInput = {
  displayName: string;
  branchId?: string;
};
