import type { AaNumberResolution, AccreditationRepository, AccreditationStatusRequest, PublicAccreditationResult, RenewAccreditationInput } from "@/data/contracts/accreditation-repository";
import { validateExistingAaIdentifier } from "@/modules/accreditation/identifiers";
import type { AccreditationAdminStatus } from "@/modules/accreditation/types";
import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { DevIdentity } from "@/modules/identity/types";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import { addOneYear, calculateRenewedExpiry, classifyRenewalTiming, formatManilaDateParts, manilaToday, parseManilaDateOnly } from "@/modules/accreditation/dates";
import { getCurrentAccreditationRecord, getSellerStanding, hasAmbiguousAccreditation, resolveAaNumber } from "@/modules/accreditation/eligibility";
import { canTransitionAccreditationStatus, transitionRequiresReason } from "@/modules/accreditation/transitions";
import { allocateSharedAaNumber, collectReservedAaNumbers, toAaYearMonth } from "@/modules/accreditation/issuance";
import { getVisibleMemberIds, isActiveIdentity } from "./scope";
import { appendAuditEvent } from "./audit";
import { activeRoles } from "./dev-identities";
import type { MockStore } from "./seed";
import { simulateAsync } from "@/data/contracts/async-options";

/** An expired seller is still eligible; `expired` tells the caller to record a reminder (doc 03 section 9). */
export type AccreditationEligibilityCheck = {
  eligible: boolean;
  reason: "NO_RECORD" | "NOT_ACTIVE" | "SUSPENDED" | "ENDED" | "INCOMPLETE_DATES" | null;
  expired: boolean;
};

export class MockAccreditationRepository implements AccreditationRepository {
  constructor(
    private readonly store: MockStore,
    private readonly getIdentity: () => DevIdentity,
    private readonly asyncOptions: MockAsyncOptions = {},
  ) {}

  private merge(options?: MockAsyncOptions) {
    return { ...this.asyncOptions, ...options };
  }

  private copy(record: AccreditationRecord): AccreditationRecord {
    return {
      ...record,
      history: record.history.map((entry) => ({ ...entry })),
      aaNumberHistory: record.aaNumberHistory?.map((entry) => ({ ...entry })),
    };
  }

  private canReadAll(identity: DevIdentity): boolean {
    return identity.roles.some((role) => role === "super_admin" || role === "admin");
  }

  private visibleMemberIds(identity: DevIdentity): Set<string> {
    if (this.canReadAll(identity)) {
      return new Set(this.store.members.map((member) => member.id));
    }
    return getVisibleMemberIds(identity, this.store);
  }

  private scoped(records: AccreditationRecord[], identity: DevIdentity): AccreditationRecord[] {
    const visible = this.visibleMemberIds(identity);
    return records.filter((record) => visible.has(record.memberId));
  }

  async list(options?: MockAsyncOptions): Promise<AccreditationRecord[]> {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!isActiveIdentity(identity)) return [];
    return this.scoped(this.store.accreditations, identity).map((record) => this.copy(record));
  }

  async getById(id: string, options?: MockAsyncOptions): Promise<AccreditationRecord | null> {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!isActiveIdentity(identity)) return null;
    const record = this.store.accreditations.find((item) => item.id === id);
    if (!record || !this.visibleMemberIds(identity).has(record.memberId)) return null;
    return this.copy(record);
  }

  async listByMember(memberId: string, options?: MockAsyncOptions): Promise<AccreditationRecord[]> {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!isActiveIdentity(identity)) return [];
    if (!this.visibleMemberIds(identity).has(memberId)) return [];
    return this.store.accreditations
      .filter((record) => record.memberId === memberId)
      .map((record) => this.copy(record));
  }

  async getCurrentForMember(memberId: string, options?: MockAsyncOptions): Promise<AccreditationRecord | null> {
    const records = await this.listByMember(memberId, options);
    return getCurrentAccreditationRecord(records);
  }

  async verifyPublic(aaNumber: string, options?: MockAsyncOptions): Promise<PublicAccreditationResult | null> {
    await simulateAsync(this.merge(options));
    const parsed = validateExistingAaIdentifier(aaNumber);
    if (!parsed.ok) return null;
    // A number replaced by a renewal resolves to the holder's current record (doc 03 section 5.2.1).
    const resolved = resolveAaNumber(this.store.accreditations, aaNumber);
    const record = resolved?.record;
    if (!resolved || !record?.aaNumber) return null;
    // Only the member's single current record can verify; superseded or ambiguous records return the generic result.
    const memberRecords = this.store.accreditations.filter((item) => item.memberId === record.memberId);
    if (hasAmbiguousAccreditation(memberRecords) || getCurrentAccreditationRecord(memberRecords)?.id !== record.id) return null;
    // Expired is shown as Expired; pending, cancelled, suspended and departed sellers are not shown as valid (doc 03 section 9).
    const standing = getSellerStanding(record, manilaToday());
    if (standing.state === "blocked") return null;
    // Both IST and OST accreditation expire (doc 03); IST only hides its "Valid Until" date, OST shows it (project 22).
    return {
      aaNumber: record.aaNumber,
      status: standing.state === "expired" ? "expired" : "valid",
      classification: record.classification,
      validUntil: record.classification === "OST" ? record.expiryDate : null,
      quotedNumberSuperseded: !resolved.quotedNumberIsCurrent,
    };
  }

  async resolveAaNumber(aaNumber: string, options?: MockAsyncOptions): Promise<AaNumberResolution | null> {
    await simulateAsync(this.merge(options));
    const identity = this.getIdentity();
    if (!isActiveIdentity(identity)) return null;
    const resolved = resolveAaNumber(this.scoped(this.store.accreditations, identity), aaNumber);
    if (!resolved?.record.aaNumber) return null;
    return { memberId: resolved.record.memberId, recordId: resolved.record.id, currentAaNumber: resolved.record.aaNumber, quotedNumberIsCurrent: resolved.quotedNumberIsCurrent };
  }

  async checkEligibility(memberId: string, asOfDate: string = manilaToday(), options?: MockAsyncOptions): Promise<AccreditationEligibilityCheck> {
    const current = await this.getCurrentForMember(memberId, options);
    if (!current) return { eligible: false, reason: "NO_RECORD", expired: false };
    // Action-specific (doc 03 section 9): an expired seller can still sell, refer and sponsor, with a reminder.
    const standing = getSellerStanding(current, asOfDate);
    if (standing.state === "blocked") return { eligible: false, reason: standing.reason, expired: false };
    return { eligible: true, reason: null, expired: standing.state === "expired" };
  }

  async renew(recordId: string, input: RenewAccreditationInput = {}, options?: MockAsyncOptions): Promise<AccreditationRecord> {
    await simulateAsync(this.merge(options));
    const identity = this.getIdentity();
    // Doc 03 section 5.3: the Administrator or the Super Administrator renews an approved seller.
    if (!isActiveIdentity(identity) || !this.canReadAll(identity)) {
      throw new Error("Accreditation renewal requires Administrator or Super Administrator authorization.");
    }
    const record = this.store.accreditations.find((item) => item.id === recordId);
    if (!record) throw new Error("Accreditation record not found.");
    const memberRecords = this.store.accreditations.filter((item) => item.memberId === record.memberId);
    if (hasAmbiguousAccreditation(memberRecords)) {
      throw new Error("Accreditation records for this seller are ambiguous; resolve them before renewing.");
    }
    if (getCurrentAccreditationRecord(memberRecords)?.id !== record.id) {
      throw new Error("Only the seller's current accreditation can be renewed.");
    }
    if (input.expectedAaNumber && record.aaNumber?.toUpperCase() !== input.expectedAaNumber.trim().toUpperCase()) {
      throw new Error("This accreditation has already been renewed since this view loaded; refresh and check the new number.");
    }
    if (record.endDate) {
      throw new Error("A person who resigned or was terminated is not renewed; they are accredited again under a new number.");
    }
    if (record.adminStatus !== "active" || !record.aaNumber || !record.expiryDate) {
      throw new Error("Only an approved, active accreditation can be renewed. A person who resigned or was terminated is accredited again under a new number.");
    }
    const today = manilaToday();
    const renewalDate = input.renewalDate ?? today;
    const renewalParts = parseManilaDateOnly(renewalDate);
    if (!renewalParts) throw new Error("The renewal date must be a valid date.");
    if (renewalDate > today) throw new Error("The renewal date cannot be in the future.");
    if (renewalParts.month === 2 && renewalParts.day === 29) {
      throw new Error("February 29 renewals need owner policy confirmation before issuance.");
    }
    if (classifyRenewalTiming(record.expiryDate, renewalDate) === "too_early") {
      throw new Error("A renewal is recorded in the expiry month or later. Hold early papers until the expiry month.");
    }
    const newExpiry = calculateRenewedExpiry(record.expiryDate, renewalDate);
    const yymm = toAaYearMonth(renewalDate);
    if (!newExpiry || !yymm) throw new Error("The renewal date must be a valid date.");
    // The team letter (I or O) is unchanged; NNNN is the next unused number of the renewal month, shared with new accreditations.
    const prefix = record.classification === "IST" ? "AAI" : "AAO";
    const reserved = collectReservedAaNumbers(this.store.accreditations, this.store.members);
    const { aaNumber: newNumber } = allocateSharedAaNumber(prefix, yymm, reserved, 1);

    const previousNumber = record.aaNumber;
    const changedAt = new Date().toISOString();
    record.aaNumberHistory = [...(record.aaNumberHistory ?? []), { aaNumber: previousNumber, replacedBy: newNumber, replacedOn: renewalDate, actorId: identity.id, changedAt }];
    record.aaNumber = newNumber;
    record.effectiveDate = renewalDate;
    record.expiryDate = newExpiry;
    record.history.push({
      operation: "renewed",
      previousValue: previousNumber,
      newValue: newNumber,
      reason: `Renewed on ${renewalDate}; valid until ${newExpiry}`,
      actorId: identity.id,
      changedAt,
    });
    // Everything recorded under the old number carries over: links are by member id, so only the displayed number moves.
    const member = this.store.members.find((item) => item.id === record.memberId);
    if (member) member.aaNumber = newNumber;
    appendAuditEvent(this.store, {
      actorId: identity.id,
      actorRoles: activeRoles(identity),
      module: "accreditation",
      action: "ACCREDITATION_RENEWED",
      entityType: "accreditation",
      entityId: record.id,
      displayReference: newNumber,
      previousValue: previousNumber,
      newValue: newNumber,
      outcome: "success",
      reason: `Renewed on ${renewalDate}`,
      relatedRecordIds: [record.memberId],
    });
    return this.copy(record);
  }

  async updateStatus(recordId: string, requested: AccreditationStatusRequest, options?: MockAsyncOptions, expectedPrevious?: AccreditationAdminStatus, reason?: string): Promise<AccreditationRecord> {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    // No canonical approval authority is defined; restrict to Super Admin.
    if (!isActiveIdentity(identity) || !identity.roles.includes("super_admin")) {
      throw new Error("Accreditation status changes require Super Administrator authorization.");
    }
    const record = this.store.accreditations.find((item) => item.id === recordId);
    if (!record) throw new Error("Accreditation record not found.");
    if (hasAmbiguousAccreditation(this.store.accreditations.filter((item) => item.memberId === record.memberId))) {
      throw new Error("Accreditation records for this seller are ambiguous; resolve them before updating.");
    }
    if (expectedPrevious && record.adminStatus !== expectedPrevious) {
      throw new Error("Accreditation status changed since this view loaded; refresh and try again.");
    }
    const allowed = canTransitionAccreditationStatus(record.adminStatus, requested);
    if (!allowed.ok) throw new Error(allowed.message);
    if (transitionRequiresReason(record.adminStatus, requested) && !reason?.trim()) {
      throw new Error("A reason is required for this status change.");
    }
    if (requested === "active") {
      if (!record.aaNumber) throw new Error("Accreditation cannot be approved without an issued AA number.");
      if (!record.effectiveDate || !record.expiryDate) {
        throw new Error("Accreditation cannot be approved without complete original and expiry dates.");
      }
    }
    const previousStatus = record.adminStatus;
    const nextStatus: AccreditationAdminStatus = requested === "active" ? "active" : requested === "cancel" ? "cancelled" : "pending";
    const trimmedReason = reason?.trim() || null;
    record.adminStatus = nextStatus;
    record.history.push({
      operation: nextStatus === "active" ? "reactivated" : nextStatus === "cancelled" ? "cancelled" : "reverted",
      reason: trimmedReason ?? (nextStatus === "active" ? "Approved (pending → active)" : `Status changed (${previousStatus} → ${nextStatus})`),
      actorId: identity.id,
      changedAt: new Date().toISOString(),
    });
    appendAuditEvent(this.store, {
      actorId: identity.id,
      actorRoles: activeRoles(identity),
      module: "accreditation",
      action: nextStatus === "cancelled" ? "ACCREDITATION_CANCELLED" : "ACCREDITATION_STATUS_CHANGED",
      entityType: "accreditation",
      entityId: record.id,
      displayReference: record.aaNumber,
      previousValue: previousStatus,
      newValue: nextStatus,
      outcome: "success",
      reason: trimmedReason,
      relatedRecordIds: [record.memberId],
    });
    return this.copy(record);
  }

  async issuePendingAccreditation(memberId: string, options?: MockAsyncOptions): Promise<AccreditationRecord> {
    const merged = this.merge(options);
    await simulateAsync(merged);
    const identity = this.getIdentity();
    if (!isActiveIdentity(identity) || !identity.roles.includes("super_admin")) {
      throw new Error("Accreditation issuance requires Super Administrator authorization.");
    }
    const member = this.store.members.find((item) => item.id === memberId);
    if (!member) throw new Error("Member not found.");
    if (this.store.accreditations.some((item) => item.memberId === memberId)) {
      throw new Error("This seller already has accreditation records.");
    }
    const approvedStart = manilaToday();
    const startParts = parseManilaDateOnly(approvedStart);
    if (!startParts) throw new Error("Approved Start must be a valid date.");
    if (startParts.month === 2 && startParts.day === 29) {
      throw new Error("February 29 starts need owner policy confirmation before issuance.");
    }
    const classification = member.designation === "OST" ? "OST" : "IST";
    const prefix = classification === "IST" ? "AAI" : "AAO";
    const yymm = toAaYearMonth(approvedStart);
    if (!yymm) throw new Error("Approved Start must be a valid date.");
    const reserved = collectReservedAaNumbers(this.store.accreditations, this.store.members);
    const allocation = allocateSharedAaNumber(prefix, yymm, reserved, this.store.accreditationSequence);

    const record: AccreditationRecord = {
      id: `accr-${this.store.accreditationSequence}`,
      memberId,
      classification,
      adminStatus: "pending",
      originalAccreditationDate: approvedStart,
      effectiveDate: approvedStart,
      expiryDate: formatManilaDateParts(addOneYear(startParts)),
      aaNumber: allocation.aaNumber,
      history: [
        { operation: "created", actorId: identity.id, changedAt: new Date().toISOString() },
      ],
    };
    this.store.accreditations.push(record);
    this.store.accreditationSequence = allocation.sequence + 1;
    member.aaNumber = allocation.aaNumber;
    appendAuditEvent(this.store, {
      actorId: identity.id,
      actorRoles: activeRoles(identity),
      module: "accreditation",
      action: "ACCREDITATION_ISSUED",
      entityType: "accreditation",
      entityId: record.id,
      displayReference: allocation.aaNumber,
      newValue: "pending",
      outcome: "success",
      reason: "Pending accreditation issued with automatic AA allocation",
      relatedRecordIds: [memberId],
    });
    return this.copy(record);
  }
}
