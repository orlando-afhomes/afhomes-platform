/** Minimal append-only mock audit event for Sales Network / Accreditation actions. */
export type AuditEvent = {
  id: string;
  /** ISO timestamp of the actual event. */
  timestamp: string;
  actorId: string;
  actorRoles: string[];
  module: "sales-network" | "accreditation";
  /** Exact operation performed, e.g. ACCREDITATION_STATUS_CHANGED. */
  action: string;
  entityType: "member" | "accreditation" | "account";
  /** Immutable canonical record ID. */
  entityId: string;
  /** Official AA number when issued; never an internal member ID. */
  displayReference?: string | null;
  previousValue?: string | null;
  newValue?: string | null;
  outcome: "success";
  reason?: string | null;
  relatedRecordIds?: string[];
};
