import type { DevRole } from "@/modules/identity/types";

export type AccountStatus = "pending" | "active" | "suspended" | "deactivated";

export type Account = {
  id: string;
  displayName: string;
  email: string;
  roleIds: DevRole[];
  status: AccountStatus;
  departmentId: string | null;
  createdAt: string;
};
