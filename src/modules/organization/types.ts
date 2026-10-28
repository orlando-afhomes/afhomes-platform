export type Designation = "SVD" | "SSM" | "SM" | "OST";

export type MemberStatus = "active" | "inactive" | "suspended";

export type OrgMember = {
  id: string;
  displayName: string;
  designation: Designation;
  branchId: string;
  parentId: string | null;
  status: MemberStatus;
  departmentId?: string | null;
  /** Optional link to a system account. Absence means no linked login account. */
  accountId?: string | null;
  /**
   * Human-readable Team Name stored on the SVD root that owns the branch.
   * Non-root members inherit their Team from the root via genealogy; the
   * canonical branch identifier stays in `branchId`.
   */
  teamName?: string | null;
  /** Preserved historical/seeded referral code only. No issuance or generation in Phase 05.2. */
  referralCode?: string | null;
  /** Read-only accreditation eligibility fixture for mock validation. Phase 06 replaces this. */
  mockAccreditationEligible?: boolean;
  /** Read-only mock accreditation number fixture. Phase 06 owns real issuance. */
  aaNumber?: string | null;
  /** Append-only parent/branch relationship history. */
  parentHistory?: Array<{
    previousParentId: string | null;
    newParentId: string | null;
    previousBranchId: string;
    newBranchId: string;
    operation: "create" | "transfer" | "branch-move" | "status";
    actorId: string;
    changedAt: string;
  }>;
  /**
   * Optional seller-profile extension for administratively created IST/OST
   * sellers (owner-approved manual creation). Employment records (Staff) and
   * system accounts stay untouched; the seller affiliation lives here on the
   * canonical member record. No second registry. Sensitive fields in this
   * shape must never be rendered in directory tables, genealogy views, or
   * public projections.
   */
  sellerProfile?: SellerProfile | null;
};

/** Extra seller-application fields captured by manual Add IST/OST creation. */
export type SellerProfile = {
  firstName: string;
  /** Null when the applicant attested they have no middle name. */
  middleName: string | null;
  lastName: string;
  /** Optional name suffix (Jr., Sr., II–V); null when absent. */
  suffix: string | null;
  mobileNumber: string;
  /** Date-only YYYY-MM-DD. */
  dateOfBirth: string;
  email: string;
  /** Ephemeral preview file name only; no binary is uploaded or stored. */
  profilePhotoName: string | null;
  /** Optional placeholder image URL until real photo storage exists. */
  profilePhotoUrl?: string | null;
  address: {
    street: string;
    province: string;
    city: string;
    barangay: string;
    /** Optional subdivision/village; blank when not applicable. */
    subdivision?: string | null;
    /** Preserved as text so leading zeros survive. */
    postalCode: string;
  };
  governmentIdType: string;
  governmentIdNumber: string;
  /** Date-only YYYY-MM-DD. Application metadata only. */
  cardApplicationDate: string;
  /** Free-text policy-dependent category; no official registry exists yet. */
  programCategory: string;
  /** Application metadata only; never creates VIP membership or benefits. */
  vipCardLevel: "B1" | "S1" | "G1";
  gender: string;
  civilStatus: string;
  telephone: string | null;
  facebook: string | null;
  tin: string | null;
  businessEmployer: string | null;
  businessAddress: string | null;
  jobPosition: string | null;
  /** Creation source label; manual admin creation only in this workflow. */
  sellerSource: "manual-admin";
  /** Date-only YYYY-MM-DD approved start (== original accreditation date). */
  originalAccreditationDate: string;
  /** Date-only YYYY-MM-DD canonical annual expiry. */
  expiryDate: string;
};

export type DepartmentStatus = "active" | "deactivated";

export type Department = {
  id: string;
  name: string;
  code: string;
  description: string;
  headStaffId: string | null;
  status: DepartmentStatus;
};

export type DepartmentRoleStatus = "active" | "deactivated";

export type DepartmentRole = {
  id: string;
  name: string;
  departmentId: string;
  moduleIds: string[];
  status: DepartmentRoleStatus;
  createdAt: string;
};

export type StaffStatus = "active" | "inactive" | "suspended";

export type StaffMember = {
  id: string;
  displayName: string;
  position: string;
  departmentId: string | null;
  /** Primary department role under the Department → Roles → Staff model. */
  departmentRoleId: string | null;
  status: StaffStatus;
  email: string;
  createdAt: string;
  avatarUrl: string | null;
  accountId: string | null;
  /** Optional person-profile fields captured by the Add/Edit staff form. */
  firstName?: string | null;
  /** Null when the staff member attested they have no middle name. */
  middleName?: string | null;
  lastName?: string | null;
  /** Optional name suffix (Jr., Sr., II–V); null when absent. */
  suffix?: string | null;
  mobileNumber?: string | null;
  street?: string | null;
  province?: string | null;
  city?: string | null;
  barangay?: string | null;
  /** Optional subdivision/village; blank when not applicable. */
  subdivision?: string | null;
  /** Preserved as text so leading zeros survive. */
  postalCode?: string | null;
  telephone?: string | null;
  facebook?: string | null;
  tin?: string | null;
  gender?: string | null;
  civilStatus?: string | null;
  governmentIdType?: string | null;
  governmentIdNumber?: string | null;
};
