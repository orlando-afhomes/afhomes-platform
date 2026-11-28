import type { DevRole } from "@/modules/identity/types";
import type { Designation } from "@/modules/organization/types";

const DESIGNATION_ROLES: Record<Designation, DevRole> = {
  SVD: "svd",
  SSM: "ssm",
  SM: "sm",
  OST: "ost",
};

/** A seller's position is also their system role (doc 02 §2.1); there is no separate IST role. */
export function salesRoleForDesignation(designation: Designation): DevRole {
  return DESIGNATION_ROLES[designation];
}
