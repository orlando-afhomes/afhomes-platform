export type AccreditationClassification = "IST" | "OST";

export type AccreditationAdminStatus = "pending" | "active" | "suspended" | "revoked" | "cancelled";

export type RegistrationClassification = "IST" | "OST";

export type RegistrationStatus =
  | "draft"
  | "submitted"
  | "pending_review"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "needs_info";

export type AccreditationHistoryEntry = {
  operation:
    | "created"
    | "date_corrected"
    | "renewed"
    | "suspended"
    | "reactivated"
    | "revoked"
    | "cancelled"
    | "reverted"
    | "identifier_changed";
  previousValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  actorId: string;
  changedAt: string;
};

export type AccreditationRecord = {
  id: string;
  memberId: string;
  classification: AccreditationClassification;
  adminStatus: AccreditationAdminStatus;
  originalAccreditationDate: string | null;
  effectiveDate: string | null;
  expiryDate: string | null;
  aaNumber: string | null;
  history: AccreditationHistoryEntry[];
};

export type RegistrationHistoryEntry = {
  operation: "created" | "submitted" | "reviewed" | "approved" | "rejected" | "withdrawn" | "info_requested";
  previousStatus: RegistrationStatus | null;
  newStatus: RegistrationStatus;
  actorId: string;
  changedAt: string;
  note?: string | null;
};

export type RegistrationApplication = {
  id: string;
  classification: RegistrationClassification;
  memberId: string | null;
  accountId: string | null;
  sponsorMemberId: string | null;
  status: RegistrationStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  decidedAt: string | null;
  reviewerId: string | null;
  history: RegistrationHistoryEntry[];
};

export type AccreditationEligibilitySource = "record" | "fixture" | "missing";

export type AccreditationEligibilityResult =
  | { eligible: true; source: AccreditationEligibilitySource }
  | { eligible: false; source: AccreditationEligibilitySource; reason: "NO_RECORD" | "NOT_ACTIVE" | "EXPIRED" | "INELIGIBLE_FIXTURE" | "INCOMPLETE_DATES" };
