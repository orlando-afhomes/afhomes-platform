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

/** A number replaced by a renewal. Kept forever, never reissued, and resolves to the holder's current number (doc 03 section 5.2.1). */
export type AaNumberHistoryEntry = {
  aaNumber: string;
  replacedBy: string;
  /** Date-only actual renewal date (Asia/Manila). */
  replacedOn: string;
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
  /** Numbers replaced by renewals, oldest first (AA Number History). */
  aaNumberHistory?: AaNumberHistoryEntry[];
  /** Date-only. A rights suspension blocks sales dated on or after this date (doc 03 section 9). */
  suspensionEffectiveDate?: string | null;
  /** Date-only. Last day of a resigned or terminated seller; sales after it are blocked (doc 03 section 9). */
  endDate?: string | null;
  history: AccreditationHistoryEntry[];
};

export type RegistrationHistoryEntry = {
  operation: "created" | "submitted" | "resubmitted" | "reviewed" | "approved" | "rejected" | "withdrawn" | "info_requested";
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
  /** Sponsor name and designation as they were when the application was submitted, for the office queue. */
  sponsorLabel: string;
  /** Neutral code shown to the applicant on the confirmation screen (doc 03 section 9.2). */
  reference: string;
  /** Current applicant details (the latest version). */
  applicant: RegistrationApplicant;
  /** Current version number; each resubmission after a return adds one. */
  version: number;
  /** Every submitted version, oldest first, so the office sees what changed. */
  versions: RegistrationVersion[];
  /** Office-entered seller details needed before approval; null until the entry is checked. */
  completion: RegistrationCompletion | null;
  /** Private correction link token; set only while the application is returned to the applicant. */
  correctionToken: string | null;
  /** Reason recorded with the latest return or rejection. */
  decisionReason: string | null;
};

/** What the applicant types on the public form (doc 03 section 9.2). */
export type RegistrationApplicant = {
  firstName: string;
  middleName: string;
  noMiddleName: boolean;
  lastName: string;
  suffix: string;
  /** Canonical 09XXXXXXXXX form. */
  mobileNumber: string;
  email: string;
  /** Date-only YYYY-MM-DD. */
  dateOfBirth: string;
  street: string;
  province: string;
  city: string;
  barangay: string;
  postalCode: string;
};

/** Seller details the office completes before the Administrator decides ("a Clerk may check it and complete the entry"). */
export type RegistrationCompletion = {
  gender: string;
  civilStatus: string;
  governmentIdType: string;
  governmentIdNumber: string;
  /** Date-only YYYY-MM-DD. */
  cardApplicationDate: string;
  programCategory: string;
  vipCardLevel: "B1" | "S1" | "G1";
  /** File name only; no binary is stored. */
  profilePhotoName: string;
};

export type RegistrationVersion = {
  version: number;
  submittedAt: string;
  applicant: RegistrationApplicant;
  /** Set when the office returned this version to the applicant. */
  returnReason: string | null;
};

export type AccreditationEligibilitySource = "record" | "fixture" | "missing";

/** An expired seller stays eligible to sell, refer and sponsor; `expired` drives the reminder (doc 03 section 9). */
export type AccreditationEligibilityResult =
  | { eligible: true; source: AccreditationEligibilitySource; expired?: boolean }
  | { eligible: false; source: AccreditationEligibilitySource; reason: "NO_RECORD" | "NOT_ACTIVE" | "SUSPENDED" | "ENDED" | "INELIGIBLE_FIXTURE" | "INCOMPLETE_DATES" };
