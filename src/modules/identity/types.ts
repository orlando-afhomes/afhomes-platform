import type { Designation } from "@/modules/organization/types";

// Canonical sales roles (doc 02 §2.1): SVD/SSM/SM designations are
// automatically IST members; OST stands alone. No standalone "ist" role.
export type DevRole =
  | "super_admin"
  | "admin"
  | "finance"
  | "hr"
  | "svd"
  | "ssm"
  | "sm"
  | "ost";

export type AccountStatus = "active" | "inactive" | "suspended";

export type DevIdentity = {
  id: string;
  displayName: string;
  roles: DevRole[];
  designation?: Designation;
  memberId: string | null;
  branchId: string | null;
  status: AccountStatus;
  /** Optional link to a staff record for department-role module grants. */
  staffId?: string | null;
  roleAssignments?: Array<{ role: DevRole; status: "active" | "inactive" | "archived" }>;
};

export type Scope = "own" | "team" | "all";
