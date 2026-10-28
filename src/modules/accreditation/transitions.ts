import type { AccreditationAdminStatus } from "@/modules/accreditation/types";
import type { AccreditationStatusRequest } from "@/data/contracts/accreditation-repository";

export type AccreditationTransitionCheck = { ok: true } | { ok: false; message: string };

// Owner-approved transition matrix. Cancelled reactivation and Expired as a
// manual administrative state remain unauthorized. Suspended/Revoked records
// are never transitioned by this operation.
export function canTransitionAccreditationStatus(
  current: AccreditationAdminStatus,
  requested: AccreditationStatusRequest,
): AccreditationTransitionCheck {
  if (requested === "expired") {
    return { ok: false, message: "Expiry is derived from official dates; selecting Expired cannot change this record." };
  }
  if (requested === "pending") {
    if (current === "pending") return { ok: false, message: "Accreditation is already Pending." };
    if (current === "active") return { ok: true };
    return { ok: false, message: `Accreditation with status ${current} cannot return to Pending through this operation.` };
  }
  if (requested === "active") {
    if (current === "active") return { ok: false, message: "Accreditation is already Accredited." };
    if (current === "pending") return { ok: true };
    return { ok: false, message: `Accreditation with status ${current} cannot be approved through this operation.` };
  }
  if (current === "cancelled") return { ok: false, message: "Accreditation is already Cancelled." };
  if (current === "pending" || current === "active") return { ok: true };
  return { ok: false, message: `Accreditation with status ${current} cannot be cancelled through this operation.` };
}

// Downgrades and cancellations require a recorded reason; the initial
// Pending → Accredited approval does not.
export function transitionRequiresReason(current: AccreditationAdminStatus, requested: AccreditationStatusRequest): boolean {
  return !(current === "pending" && requested === "active");
}
