import type { Designation } from "@/modules/organization/types";
import { designationLabel } from "./display";

export type TransferSellerType = "IST" | "OST";
export type TransferPositionOption = { value: Designation; label: string };

/**
 * Starting selection for the transfer dialog. A designation change is an account-role change,
 * so without Accounts (Staff Access) authority the member keeps the current designation.
 */
export function initialTransferSelection(
  designation: Designation,
  canChangeDesignation: boolean,
): { target: TransferSellerType; position: Designation } {
  if (!canChangeDesignation) return { target: designation === "OST" ? "OST" : "IST", position: designation };
  return { target: designation === "OST" ? "IST" : "OST", position: designation === "OST" ? "SSM" : "OST" };
}

/** Position choices for the current target. Without Accounts authority the only choice is the current designation. */
export function transferPositionOptions(
  designation: Designation,
  target: TransferSellerType,
  canChangeDesignation: boolean,
): TransferPositionOption[] {
  if (!canChangeDesignation) return [{ value: designation, label: designationLabel(designation) }];
  if (target === "OST") return [{ value: "OST", label: designationLabel("OST") }];
  if (designation === "OST") {
    return [
      { value: "SVD", label: designationLabel("SVD") },
      { value: "SSM", label: designationLabel("SSM") },
      { value: "SM", label: designationLabel("SM") },
    ];
  }
  return [{ value: designation, label: designationLabel(designation) }];
}
