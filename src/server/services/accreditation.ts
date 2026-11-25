import "server-only";
import { ApiError } from "@/server/api/errors";
import { activeRoles } from "@/modules/identity/active-roles";
import { getVisibleMemberIds } from "@/modules/identity/record-scope";
import type { Actor } from "@/server/auth/actor";
import type { AaNumberResolution, AccreditationStatusRequest, PublicAccreditationResult, RenewAccreditationInput } from "@/data/contracts/accreditation-repository";
import type { AccreditationAdminStatus, AccreditationRecord } from "@/modules/accreditation/types";
import { validateExistingAaIdentifier } from "@/modules/accreditation/identifiers";
import { maskPublicName } from "@/modules/accreditation/public-name";
import { addOneYear, calculateRenewedExpiry, classifyRenewalTiming, formatManilaDateParts, manilaToday, parseManilaDateOnly } from "@/modules/accreditation/dates";
import { getCurrentAccreditationRecord, getSellerStanding, hasAmbiguousAccreditation, resolveAaNumber as resolveQuotedAaNumber } from "@/modules/accreditation/eligibility";
import { canTransitionAccreditationStatus, transitionRequiresReason } from "@/modules/accreditation/transitions";
import { toAaYearMonth } from "@/modules/accreditation/issuance";
import { loadAccreditations, loadAccreditationsByMember, loadAccreditation, loadMembers, type MemberRecord } from "@/server/repositories/sales-network";
import { conflict, invalid, newId, notFound, nowIso, transact } from "@/server/services/common";
import { withAaAllocation } from "@/server/services/sales-network";

const isSuperAdmin = (actor: Actor) => activeRoles(actor.identity).includes("super_admin");
const isAdmin = (actor: Actor) => activeRoles(actor.identity).some((role) => role === "super_admin" || role === "admin");

function visibleMemberIds(actor: Actor, members: MemberRecord[]): Set<string> {
  return isAdmin(actor) ? new Set(members.map((member) => member.id)) : getVisibleMemberIds(actor.identity, { members });
}

const audit = (action: string, entityId: string, details: Record<string, unknown>, relatedRecordIds?: string[]) => ({
  action,
  entityType: "accreditation",
  entityId,
  details: { module: "accreditation", ...details, ...(relatedRecordIds?.length ? { relatedRecordIds } : {}) },
});

// ---------------------------------------------------------------- reads
export async function listAccreditations(actor: Actor): Promise<AccreditationRecord[]> {
  const [members, records] = await Promise.all([loadMembers(), loadAccreditations()]);
  const visible = visibleMemberIds(actor, members);
  return records.filter((record) => visible.has(record.memberId));
}

export async function getAccreditation(actor: Actor, id: string): Promise<AccreditationRecord> {
  const record = await loadAccreditation(id);
  if (!record) throw notFound("Accreditation");
  const members = await loadMembers();
  if (!visibleMemberIds(actor, members).has(record.memberId)) throw notFound("Accreditation");
  return record;
}

export async function listMemberAccreditations(actor: Actor, memberId: string): Promise<AccreditationRecord[]> {
  const members = await loadMembers();
  if (!visibleMemberIds(actor, members).has(memberId)) return [];
  return loadAccreditationsByMember(memberId);
}

export async function currentMemberAccreditation(actor: Actor, memberId: string): Promise<AccreditationRecord | null> {
  const records = await listMemberAccreditations(actor, memberId);
  return getCurrentAccreditationRecord(records);
}

/** Public verification by exact AA number; restricted projection (doc 03 section 9). */
export async function verifyPublic(aaNumber: string): Promise<PublicAccreditationResult | null> {
  if (!validateExistingAaIdentifier(aaNumber).ok) return null;
  const [records, members] = await Promise.all([loadAccreditations(), loadMembers()]);
  const resolved = resolveQuotedAaNumber(records, aaNumber);
  const record = resolved?.record;
  if (!resolved || !record?.aaNumber) return null;
  const memberRecords = records.filter((item) => item.memberId === record.memberId);
  if (hasAmbiguousAccreditation(memberRecords) || getCurrentAccreditationRecord(memberRecords)?.id !== record.id) return null;
  const standing = getSellerStanding(record, manilaToday());
  if (standing.state === "blocked") return null;
  const member = members.find((item) => item.id === record.memberId);
  return {
    aaNumber: record.aaNumber,
    status: standing.state === "expired" ? "expired" : "valid",
    classification: record.classification,
    validUntil: record.classification === "OST" ? record.expiryDate : null,
    quotedNumberSuperseded: !resolved.quotedNumberIsCurrent,
    maskedName: maskPublicName(member?.displayName),
    photoUrl: member?.sellerProfile?.profilePhotoUrl ?? null,
  };
}

export async function resolveAaNumberForActor(actor: Actor, aaNumber: string): Promise<AaNumberResolution | null> {
  const [records, members] = await Promise.all([loadAccreditations(), loadMembers()]);
  const visible = visibleMemberIds(actor, members);
  const resolved = resolveQuotedAaNumber(records.filter((record) => visible.has(record.memberId)), aaNumber);
  if (!resolved?.record.aaNumber) return null;
  return { memberId: resolved.record.memberId, recordId: resolved.record.id, currentAaNumber: resolved.record.aaNumber, quotedNumberIsCurrent: resolved.quotedNumberIsCurrent };
}

// ---------------------------------------------------------------- writes
export async function updateAccreditationStatus(
  actor: Actor,
  recordId: string,
  requested: AccreditationStatusRequest,
  expectedPrevious?: AccreditationAdminStatus,
  reason?: string,
): Promise<AccreditationRecord> {
  if (!isSuperAdmin(actor)) throw new ApiError(403, "forbidden", "Accreditation status changes require Super Administrator authorization.");
  const [records, members] = await Promise.all([loadAccreditations(), loadMembers()]);
  const record = records.find((item) => item.id === recordId);
  if (!record) throw notFound("Accreditation");
  if (!visibleMemberIds(actor, members).has(record.memberId)) throw notFound("Accreditation");
  const memberRecords = records.filter((item) => item.memberId === record.memberId);
  if (hasAmbiguousAccreditation(memberRecords)) throw conflict("ambiguous_accreditation", "Accreditation records for this seller are ambiguous; resolve them before updating.");
  if (expectedPrevious && record.adminStatus !== expectedPrevious) throw conflict("stale_accreditation", "Accreditation status changed since this view loaded; refresh and try again.");
  const allowed = canTransitionAccreditationStatus(record.adminStatus, requested);
  if (!allowed.ok) throw invalid(allowed.message);
  const trimmedReason = reason?.trim() || null;
  if (transitionRequiresReason(record.adminStatus, requested) && !trimmedReason) throw invalid("A reason is required for this status change.");
  if (requested === "active") {
    if (!record.aaNumber) throw invalid("Accreditation cannot be approved without an issued accreditation number.");
    if (!record.effectiveDate || !record.expiryDate) throw invalid("Accreditation cannot be approved without complete original and expiry dates.");
  }
  const nextStatus: AccreditationAdminStatus = requested === "active" ? "active" : requested === "cancel" ? "cancelled" : "pending";
  const previousStatus = record.adminStatus;
  const history = [
    ...record.history,
    {
      operation: nextStatus === "active" ? ("reactivated" as const) : nextStatus === "cancelled" ? ("cancelled" as const) : ("reverted" as const),
      reason: trimmedReason ?? (nextStatus === "active" ? "Approved (pending → active)" : `Status changed (${previousStatus} → ${nextStatus})`),
      actorId: actor.userId,
      changedAt: nowIso(),
    },
  ];
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $status: String!, $history: Any!",
    fields: "accreditation: accreditation_update(id: $id, data: { adminStatus: $status, history: $history })",
    variables: { id: recordId, status: nextStatus, history },
    audit: [audit(nextStatus === "cancelled" ? "ACCREDITATION_CANCELLED" : "ACCREDITATION_STATUS_CHANGED", recordId, { previousValue: previousStatus, newValue: nextStatus, ...(trimmedReason ? { reason: trimmedReason } : {}), ...(record.aaNumber ? { aaNumber: record.aaNumber } : {}) }, [record.memberId])],
  });
  return { ...record, adminStatus: nextStatus, history };
}

export async function issuePendingAccreditation(actor: Actor, memberId: string): Promise<AccreditationRecord> {
  if (!isSuperAdmin(actor)) throw new ApiError(403, "forbidden", "Accreditation issuance requires Super Administrator authorization.");
  const [members, records] = await Promise.all([loadMembers(), loadAccreditations()]);
  const member = members.find((item) => item.id === memberId);
  if (!member) throw notFound("Member");
  if (!visibleMemberIds(actor, members).has(memberId)) throw notFound("Member");
  if (records.some((record) => record.memberId === memberId)) throw conflict("accreditation_exists", "This seller already has accreditation records.");
  const approvedStart = manilaToday();
  const startParts = parseManilaDateOnly(approvedStart);
  if (!startParts) throw invalid("Approved Start must be a valid date.");
  if (startParts.month === 2 && startParts.day === 29) throw invalid("February 29 starts need owner policy confirmation before issuance.");
  const classification = member.designation === "OST" ? "OST" : "IST";
  const prefix = classification === "IST" ? "AAI" : "AAO";
  const yymm = toAaYearMonth(approvedStart)!;
  const expiryDate = formatManilaDateParts(addOneYear(startParts));
  const recordId = newId();
  const aaNumber = await withAaAllocation(prefix, yymm, async (number) => {
    await transact(actor, {
      variableDefinitions: "$accreditation: Accreditation_Data!, $number: AccreditationNumber_Data!, $memberId: UUID!, $aaNumber: String!",
      fields: [
        "accreditation: accreditation_insert(data: $accreditation)",
        "number: accreditationNumber_insert(data: $number)",
        "member: member_update(id: $memberId, data: { aaNumber: $aaNumber, rowVersion: 1 })",
      ].join("\n"),
      variables: {
        accreditation: { id: recordId, memberId, classification, adminStatus: "pending", originalAccreditationDate: approvedStart, effectiveDate: approvedStart, expiryDate, aaNumber: number, history: [{ operation: "created", actorId: actor.userId, changedAt: nowIso() }] },
        number: { aaNumber: number, memberId, accreditationId: recordId, month: yymm, sequence: Number(number.slice(-4)), issuedOn: approvedStart },
        memberId,
        aaNumber: number,
      },
      audit: [audit("ACCREDITATION_ISSUED", recordId, { newValue: "pending", aaNumber: number }, [memberId])],
    });
    return number;
  });
  return {
    id: recordId,
    memberId,
    classification,
    adminStatus: "pending",
    originalAccreditationDate: approvedStart,
    effectiveDate: approvedStart,
    expiryDate,
    aaNumber,
    history: [{ operation: "created", actorId: actor.userId, changedAt: nowIso() }],
  };
}

export async function renewAccreditation(actor: Actor, recordId: string, input: RenewAccreditationInput = {}): Promise<AccreditationRecord> {
  if (!isAdmin(actor)) throw new ApiError(403, "forbidden", "Accreditation renewal requires Administrator or Super Administrator authorization.");
  const [records, members] = await Promise.all([loadAccreditations(), loadMembers()]);
  const record = records.find((item) => item.id === recordId);
  if (!record) throw notFound("Accreditation");
  if (!visibleMemberIds(actor, members).has(record.memberId)) throw notFound("Accreditation");
  const memberRecords = records.filter((item) => item.memberId === record.memberId);
  if (hasAmbiguousAccreditation(memberRecords)) throw conflict("ambiguous_accreditation", "Accreditation records for this seller are ambiguous; resolve them before renewing.");
  if (getCurrentAccreditationRecord(memberRecords)?.id !== record.id) throw conflict("not_current", "Only the seller's current accreditation can be renewed.");
  if (input.expectedAaNumber && record.aaNumber?.toUpperCase() !== input.expectedAaNumber.trim().toUpperCase()) {
    throw conflict("already_renewed", "This accreditation has already been renewed since this view loaded; refresh and check the new number.");
  }
  if (record.endDate) throw conflict("ended", "A person who resigned or was terminated is not renewed; they are accredited again under a new number.");
  if (record.adminStatus !== "active" || !record.aaNumber || !record.expiryDate) {
    throw conflict("not_renewable", "Only an approved, active accreditation can be renewed. A person who resigned or was terminated is accredited again under a new number.");
  }
  const today = manilaToday();
  const renewalDate = input.renewalDate ?? today;
  const renewalParts = parseManilaDateOnly(renewalDate);
  if (!renewalParts) throw invalid("The renewal date must be a valid date.");
  if (renewalDate > today) throw invalid("The renewal date cannot be in the future.");
  if (renewalParts.month === 2 && renewalParts.day === 29) throw invalid("February 29 renewals need owner policy confirmation before issuance.");
  if (classifyRenewalTiming(record.expiryDate, renewalDate) === "too_early") throw conflict("too_early", "A renewal is recorded in the expiry month or later. Hold early papers until the expiry month.");
  const newExpiry = calculateRenewedExpiry(record.expiryDate, renewalDate);
  const yymm = toAaYearMonth(renewalDate);
  if (!newExpiry || !yymm) throw invalid("The renewal date must be a valid date.");
  const prefix = record.classification === "IST" ? "AAI" : "AAO";
  const previousNumber = record.aaNumber;
  const history = [
    ...record.history,
    { operation: "renewed" as const, previousValue: previousNumber, newValue: "", reason: `Renewed on ${renewalDate}; valid until ${newExpiry}`, actorId: actor.userId, changedAt: nowIso() },
  ];
  const aaNumber = await withAaAllocation(prefix, yymm, async (number) => {
    history[history.length - 1].newValue = number;
    await transact(actor, {
      variableDefinitions: "$id: UUID!, $aaNumber: String!, $expiryDate: Date!, $effectiveDate: Date!, $history: Any!, $oldNumber: String!, $replacedOn: Date!, $memberId: UUID!, $month: String!, $sequence: Int!",
      fields: [
        "replaced: accreditationNumber_updateMany(where: { accreditationId: { eq: $id }, aaNumber: { eq: $oldNumber } }, data: { replacedOn: $replacedOn })",
        "accreditation: accreditation_update(id: $id, data: { aaNumber: $aaNumber, effectiveDate: $effectiveDate, expiryDate: $expiryDate, history: $history })",
        "number: accreditationNumber_insert(data: { aaNumber: $aaNumber, memberId: $memberId, accreditationId: $id, month: $month, sequence: $sequence, issuedOn: $effectiveDate })",
        "member: member_update(id: $memberId, data: { aaNumber: $aaNumber })",
        `query @redact { accreditation(id: $id) @check(expr: "response.replaced == 1", message: "NUMBER_MISSING") { id } }`,
      ].join("\n"),
      variables: { id: record.id, aaNumber: number, expiryDate: newExpiry, effectiveDate: renewalDate, history, oldNumber: previousNumber, replacedOn: renewalDate, memberId: record.memberId, month: yymm, sequence: Number(number.slice(-4)) },
      audit: [audit("ACCREDITATION_RENEWED", record.id, { previousValue: previousNumber, newValue: number, reason: `Renewed on ${renewalDate}`, aaNumber: number }, [record.memberId])],
      markers: { NUMBER_MISSING: conflict("number_missing", "The current number record is missing; reconcile the accreditation numbers first.") },
    });
    return number;
  });
  return { ...record, aaNumber, effectiveDate: renewalDate, expiryDate: newExpiry, history };
}
