import type { DevRole } from "@/modules/identity/types";

export type AccountStatus = "pending" | "active" | "suspended" | "deactivated";

/** Approved account status transitions (unchanged by S3). */
export const ACCOUNT_STATUS_TRANSITIONS: Record<AccountStatus, readonly AccountStatus[]> = {
  pending: ["active"],
  active: ["suspended", "deactivated"],
  suspended: ["active", "deactivated"],
  deactivated: ["active"],
};

/**
 * Hard deletion is disabled until the owner approves the archive and
 * historical-retention policy (open item R8; doc 01 section 8).
 */
export const ACCOUNT_DELETE_DISABLED = "Account deletion is unavailable until the archive and retention policy is approved.";

/** What the acting identity may do to one account in Account Management. */
export type AccountActionPolicy = {
  canEdit: boolean;
  canManageRoles: boolean;
  assignableRoles: DevRole[];
  revocableRoles: DevRole[];
  allowedStatuses: AccountStatus[];
  /** Why actions are limited, or null when nothing is restricted. */
  restriction: string | null;
  /** True when a staff record links to this account: Staff is authoritative for name/email. */
  linkedToStaff: boolean;
  canDelete: boolean;
  /** Why the account cannot be deleted, or null when it can. */
  deleteRestriction: string | null;
};

export type AccountPolicies = {
  /** System roles the actor may give a new account. */
  creatableRoles: DevRole[];
  accounts: Record<string, AccountActionPolicy>;
};

/** Linked-account facts a Staff/Employees holder needs, without Accounts module access. */
export type LinkedAccountSummary = {
  id: string;
  email: string;
  status: AccountStatus;
  isProtected: boolean;
  /** Suspension/deactivation actions available through the Staff workflow. */
  allowedStatuses: AccountStatus[];
};

export type Account = {
  id: string;
  displayName: string;
  email: string;
  roleIds: DevRole[];
  status: AccountStatus;
  departmentId: string | null;
  createdAt: string;
};
