import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { AccreditationAdminStatus, AccreditationRecord } from "@/modules/accreditation/types";

export type AccreditationStatusRequest = "pending" | "active" | "cancel" | "expired";

export interface AccreditationRepository {
  list(options?: MockAsyncOptions): Promise<AccreditationRecord[]>;
  getById(id: string, options?: MockAsyncOptions): Promise<AccreditationRecord | null>;
  listByMember(memberId: string, options?: MockAsyncOptions): Promise<AccreditationRecord[]>;
  getCurrentForMember(memberId: string, options?: MockAsyncOptions): Promise<AccreditationRecord | null>;
  /**
   * Narrow authorized status mutation. Allowed: pending → active,
   * pending → cancelled, active → pending, active → cancelled.
   * Ambiguous records, stale views, unsupported requests, missing
   * prerequisites, and missing required reasons fail with an explicit
   * message. History and an audit event are appended.
   */
  updateStatus(recordId: string, requested: AccreditationStatusRequest, options?: MockAsyncOptions, expectedPrevious?: AccreditationAdminStatus, reason?: string): Promise<AccreditationRecord>;
  /**
   * Issue a Pending accreditation (with an automatically allocated shared-
   * sequence AA number) for a member that has no accreditation records.
   * Super Admin only; fails closed when records already exist.
   */
  issuePendingAccreditation(memberId: string, options?: MockAsyncOptions): Promise<AccreditationRecord>;
}
