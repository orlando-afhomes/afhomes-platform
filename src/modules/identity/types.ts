import type { Designation } from "@/modules/organization/types";

export type DevRole =
  | "super_admin"
  | "admin"
  | "finance"
  | "hr"
  | "svd"
  | "ssm"
  | "sm"
  | "ist"
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
  roleAssignments?: Array<{ role: DevRole; status: "active" | "inactive" | "archived" }>;
};

export type Scope = "own" | "team" | "all";
