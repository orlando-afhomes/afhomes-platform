import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { AccreditationAdminStatus, AccreditationRecord } from "@/modules/accreditation/types";

export type AccreditationStatusRequest = "pending" | "active" | "cancel" | "expired";

/**
 * Restricted public projection: masked holder name and photo only, no full name, contact or internal
 * ids (UI21). The public result never renders a validity date; the field stays for internal reuse (owner ruling, 2026-11-19; doc 03 section 9). An expired seller is shown as Expired.
 * A number replaced by a renewal resolves to the holder's current number, with
 * `quotedNumberSuperseded` set (doc 03 section 5.2.1).
 */
export type PublicAccreditationResult = {
  aaNumber: string;
  status: "valid" | "expired";
  classification: "IST" | "OST";
  validUntil: string | null;
  quotedNumberSuperseded: boolean;
  /** Masked name such as "Juan D*****"; null when no name is on file. */
  maskedName: string | null;
  photoUrl: string | null;
};

/** Admin lookup of any AA number, current or from the AA Number History. */
export type AaNumberResolution = {
  memberId: string;
  recordId: string;
  currentAaNumber: string;
  quotedNumberIsCurrent: boolean;
};

export type RenewAccreditationInput = {
  /** Date-only actual renewal date (Asia/Manila). Defaults to today; a future date is refused. */
  renewalDate?: string;
  /** The AA number shown when the view loaded; a mismatch means the record was already renewed. */
  expectedAaNumber?: string;
};

export interface AccreditationRepository {
  /**
   * Public verification by exact official AA number only (current or superseded). Returns null with
   * no distinguishing detail for malformed, unknown, pending, cancelled, suspended or departed
   * numbers. An expired accreditation returns status "expired".
   */
  verifyPublic(aaNumber: string, options?: MockAsyncOptions): Promise<PublicAccreditationResult | null>;
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
  /**
   * Renew an approved seller (Administrator or Super Administrator, audited). Allowed in the expiry
   * month or later; issues a NEW AA number for the renewal month, valid one year from the renewal
   * date, and keeps the old number in the AA Number History. Leavers, unapproved records and a
   * renewal before the expiry month are refused (doc 03 section 5).
   */
  renew(recordId: string, input?: RenewAccreditationInput, options?: MockAsyncOptions): Promise<AccreditationRecord>;
  /** Resolve a quoted AA number (current or superseded) to the visible seller it belongs to. */
  resolveAaNumber(aaNumber: string, options?: MockAsyncOptions): Promise<AaNumberResolution | null>;
}
