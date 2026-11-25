import "server-only";
import { getAuth } from "firebase-admin/auth";
import { ApiError } from "@/server/api/errors";
import { activeRoles } from "@/modules/identity/active-roles";
import { getGrantedModuleIds } from "@/modules/identity/permissions";
import { getDescendantIds, getUplineSummaries, getVisibleMemberIds } from "@/modules/identity/record-scope";
import type { Actor } from "@/server/auth/actor";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import { getCurrentAccreditationRecord, resolveEffectiveAccreditationEligibility, resolveAaNumber } from "@/modules/accreditation/eligibility";
import { manilaToday, parseManilaDateOnly } from "@/modules/accreditation/dates";
import { calculateApprovedExpiry, validateAccreditedSellerFields } from "@/modules/sales-network/accredited-seller";
import { allocateSharedAaNumber, toAaYearMonth } from "@/modules/accreditation/issuance";
import type { OrgMember } from "@/modules/organization/types";
import type {
  AccreditedSellerResult,
  CreateAccreditedSellerInput,
  CreateSalesNetworkMemberInput,
  ReferralSponsorVerificationResult,
  TransferSalesNetworkMemberTarget,
  UpdateSalesNetworkMemberInput,
} from "@/modules/sales-network/types";
import type { FillSeatVacancyInput } from "@/data/contracts/member-repository";
import { findOpenVacancy, vacancyStartDate, type SeatVacancy } from "@/modules/sales-network/vacancy";
import { getDirectChildren, isValidParentEdge, validateSalesParent } from "@/modules/sales-network/genealogy";
import { designationLabel } from "@/modules/sales-network/display";
import { allowedValues } from "@/modules/settings/lists";
import { normalizeTin } from "@/shared/utils/input-sanitizers";
import { getAdminApp } from "@/server/firebase-admin";
import {
  loadAccreditations,
  loadMembers,
  loadSeatVacancies,
  memberColumns,
  type MemberRecord,
} from "@/server/repositories/sales-network";
import { loadAccount } from "@/server/repositories/organization";
import { loadReferenceEntries } from "@/server/repositories/content";
import { dbRead, uniqueViolation } from "@/server/db";
import { conflict, invalid, newId, notFound, nowIso, transact } from "@/server/services/common";

const MODULE = "sales-network" as const;

export function canManageNetwork(actor: Actor): boolean {
  if (!getGrantedModuleIds(actor.identity).has(MODULE)) return false;
  return activeRoles(actor.identity).some((role) => ["super_admin", "admin", "svd", "ssm", "sm"].includes(role));
}

const isAdmin = (actor: Actor) => activeRoles(actor.identity).some((role) => role === "super_admin" || role === "admin");

function requireManager(actor: Actor): void {
  if (!canManageNetwork(actor)) throw new ApiError(403, "forbidden", "Sales Network changes are not allowed for this account.");
}

function visibleIds(actor: Actor, members: OrgMember[]): Set<string> {
  return isAdmin(actor) ? new Set(members.map((member) => member.id)) : getVisibleMemberIds(actor.identity, { members });
}

function visibleMember(actor: Actor, members: MemberRecord[], id: string): MemberRecord {
  if (!visibleIds(actor, members).has(id)) throw notFound("Member");
  const member = members.find((item) => item.id === id);
  if (!member) throw notFound("Member");
  return member;
}

function assertParent(actor: Actor, designation: OrgMember["designation"], parent: OrgMember | null, members: OrgMember[], accreditations: AccreditationRecord[], childId?: string): void {
  const validation = validateSalesParent(designation, parent, members, childId, accreditations);
  if (!validation.ok) throw invalid(validation.message);
  if (parent && !visibleIds(actor, members).has(parent.id) && !isAdmin(actor)) throw new ApiError(403, "outside_scope", "The selected parent is outside the authorized scope.");
}

function isProfileInput(input: UpdateSalesNetworkMemberInput): boolean {
  return Object.entries(input).some(([key, value]) => key !== "displayName" && value !== undefined);
}

const audit = (action: string, entityType: "member", entityId: string, details: Record<string, unknown>, relatedRecordIds?: string[]) => ({
  action,
  entityType,
  entityId,
  details: { module: MODULE, ...details, ...(relatedRecordIds?.length ? { relatedRecordIds } : {}) },
});

// ---------------------------------------------------------------- reads
export async function listMembers(actor: Actor): Promise<OrgMember[]> {
  const members = await loadMembers();
  const visible = visibleIds(actor, members);
  return members.filter((member) => visible.has(member.id));
}

export async function getMember(actor: Actor, id: string): Promise<OrgMember> {
  return visibleMember(actor, await loadMembers(), id);
}

export async function findMemberByAaNumber(actor: Actor, aaNumber: string): Promise<OrgMember | null> {
  const normalized = aaNumber.trim().toUpperCase();
  if (!normalized) return null;
  const [members, accreditations] = await Promise.all([loadMembers(), loadAccreditations()]);
  const visible = visibleIds(actor, members);
  const resolved = resolveAaNumber(accreditations.filter((record) => visible.has(record.memberId)), normalized);
  const memberId = resolved?.record.memberId;
  return members.find((member) => visible.has(member.id) && (member.aaNumber?.toUpperCase() === normalized || member.id === memberId)) ?? null;
}

export async function listEligibleParents(actor: Actor, childDesignation: OrgMember["designation"]): Promise<OrgMember[]> {
  if (!getGrantedModuleIds(actor.identity).has(MODULE)) return [];
  const [members, accreditations] = await Promise.all([loadMembers(), loadAccreditations()]);
  const visible = visibleIds(actor, members);
  return members
    .filter((member) => visible.has(member.id))
    .filter((parent) => validateSalesParent(childDesignation, parent, members, undefined, accreditations).ok);
}

export async function directDownline(actor: Actor, id: string): Promise<OrgMember[]> {
  const members = await loadMembers();
  const visible = visibleIds(actor, members);
  if (!visible.has(id)) return [];
  return getDirectChildren(id, members).filter((member) => visible.has(member.id));
}

export async function descendants(actor: Actor, id: string): Promise<OrgMember[]> {
  const members = await loadMembers();
  const visible = visibleIds(actor, members);
  if (!visible.has(id)) return [];
  const ids = getDescendantIds(id, members);
  return members.filter((member) => ids.has(member.id) && visible.has(member.id));
}

export async function memberParentHistory(actor: Actor, id: string) {
  const member = await getMember(actor, id);
  return member.parentHistory ?? [];
}

export async function uplineSummaries(actor: Actor) {
  if (actor.identity.status !== "active") return [];
  return getUplineSummaries(actor.identity, { members: await loadMembers() });
}

export async function lookupReferralCode(code: string): Promise<OrgMember[]> {
  const normalized = code.trim();
  if (!normalized) return [];
  return (await loadMembers()).filter((member) => member.referralCode === normalized);
}

/** Public referral check shared by the OST registration form (doc 03 section 9.2). */
export async function resolveReferralSponsor(code: string): Promise<ReferralSponsorVerificationResult> {
  const normalized = code.trim();
  if (!normalized) return { ok: false, reason: "EMPTY_INPUT", publicMessage: "Referral code is invalid or currently unavailable." };
  const [members, accreditations] = await Promise.all([loadMembers(), loadAccreditations()]);
  const matches = members.filter((member) => member.referralCode === normalized);
  if (matches.length === 0) return { ok: false, reason: "NOT_FOUND", publicMessage: "Referral code is invalid or currently unavailable." };
  if (matches.length > 1) return { ok: false, reason: "AMBIGUOUS_CODE", publicMessage: "Referral code is invalid or currently unavailable." };
  const sponsor = matches[0];
  if (!["SVD", "SSM", "SM"].includes(sponsor.designation)) return { ok: false, reason: "INELIGIBLE_DESIGNATION", publicMessage: "Referral code is invalid or currently unavailable." };
  if (sponsor.status !== "active") return { ok: false, reason: "INACTIVE_SPONSOR", publicMessage: "Referral code is invalid or currently unavailable." };
  if (!resolveEffectiveAccreditationEligibility(sponsor, accreditations).eligible) {
    return { ok: false, reason: "INELIGIBLE_ACCREDITATION", publicMessage: "Referral code is invalid or currently unavailable." };
  }
  if (!validateSalesParent("OST", sponsor, members, undefined, accreditations).ok) {
    return { ok: false, reason: "INVALID_SPONSOR", publicMessage: "Referral code is invalid or currently unavailable." };
  }
  return { ok: true, sponsor: { memberId: sponsor.id, displayName: sponsor.displayName, designation: sponsor.designation, status: sponsor.status } };
}

// ---------------------------------------------------------------- member writes
const newBranchId = () => `branch-${newId().slice(0, 8)}`;

function createHistoryEntry(actor: Actor, parentId: string | null, branchId: string): NonNullable<OrgMember["parentHistory"]>[number] {
  return { previousParentId: null, newParentId: parentId, previousBranchId: branchId, newBranchId: branchId, operation: "create", actorId: actor.userId, changedAt: nowIso() };
}

export async function createMember(actor: Actor, input: CreateSalesNetworkMemberInput): Promise<OrgMember> {
  requireManager(actor);
  const [members, accreditations] = await Promise.all([loadMembers(), loadAccreditations()]);
  const displayName = input.displayName.trim();
  if (!displayName) throw invalid("Member name is required.");
  if (input.designation === "OST") throw invalid("Outsourced Seller creation uses the referral registration workflow.");
  if (input.designation === "SVD" && input.parentId !== null) throw invalid("A Sales Vice Director cannot have a parent.");
  const parent = input.parentId ? (members.find((member) => member.id === input.parentId) ?? null) : null;
  if (input.designation !== "SVD" && !parent) throw invalid("Parent member does not exist.");
  if (parent) assertParent(actor, input.designation, parent, members, accreditations);
  const branchId = input.designation === "SVD" ? input.branchId?.trim() || newBranchId() : parent!.branchId;
  const member: OrgMember = {
    id: newId(),
    displayName,
    designation: input.designation,
    branchId,
    parentId: parent?.id ?? null,
    status: input.status ?? "active",
    departmentId: null,
    accountId: input.accountId ?? null,
    teamName: input.designation === "SVD" ? input.teamName?.trim() || null : null,
    referralCode: null,
    aaNumber: input.aaNumber ?? null,
    mockAccreditationEligible: input.mockAccreditationEligible ?? true,
    parentHistory: [createHistoryEntry(actor, parent?.id ?? null, branchId)],
  };
  const { columns, details } = memberColumns(member);
  await transact(actor, {
    variableDefinitions: "$d: Member_Data!",
    fields: "member: member_insert(data: $d)",
    variables: { d: { id: member.id, ...columns, details } },
    audit: [audit("MEMBER_CREATED", "member", member.id, { newValue: member.designation }, member.accountId ? [member.accountId] : undefined)],
  });
  return member;
}

export async function updateMember(actor: Actor, id: string, input: UpdateSalesNetworkMemberInput): Promise<OrgMember> {
  requireManager(actor);
  const members = await loadMembers();
  const member = visibleMember(actor, members, id);
  if (isProfileInput(input) && !member.sellerProfile) throw invalid("This member has no seller profile, so profile fields cannot be edited.");
  const profile = member.sellerProfile;
  let changed = false;
  let emailChanged = false;
  const account = member.accountId ? await loadAccount(member.accountId) : null;

  if (profile) {
    const setText = (key: "firstName" | "lastName" | "mobileNumber" | "dateOfBirth" | "governmentIdType" | "governmentIdNumber" | "cardApplicationDate" | "programCategory" | "gender" | "civilStatus", value: string | undefined) => {
      if (value === undefined) return;
      const trimmed = value.trim();
      if ((profile[key] as string) !== trimmed) {
        (profile as Record<string, unknown>)[key] = trimmed;
        changed = true;
      }
    };
    const setNullableText = (key: "middleName" | "suffix" | "telephone" | "facebook" | "tin" | "businessEmployer" | "businessAddress" | "jobPosition", value: string | null | undefined) => {
      if (value === undefined) return;
      const trimmed = value?.trim() ? value.trim() : null;
      if ((profile[key] as string | null) !== trimmed) {
        (profile as Record<string, unknown>)[key] = trimmed;
        changed = true;
      }
    };
    const setAddressText = (key: "street" | "province" | "city" | "barangay" | "postalCode", value: string | undefined) => {
      if (value === undefined) return;
      const trimmed = value.trim();
      if (profile.address[key] !== trimmed) {
        profile.address[key] = trimmed;
        changed = true;
      }
    };
    if ([input.firstName, input.middleName, input.noMiddleName, input.lastName, input.suffix].some((part) => part !== undefined)) {
      const pick = (value: string | null | undefined, current: string | null | undefined) => (value === undefined ? (current?.trim() ? current.trim() : null) : value?.trim() ? value.trim() : null);
      const firstName = (input.firstName ?? profile.firstName).trim();
      const middleName = input.noMiddleName ? null : pick(input.middleName, profile.middleName);
      const lastName = (input.lastName ?? profile.lastName).trim();
      const suffix = pick(input.suffix, profile.suffix);
      const displayName = [firstName, middleName, lastName, suffix].filter(Boolean).join(" ");
      if (!displayName) throw invalid("Member name is required.");
      if (displayName !== member.displayName) {
        member.displayName = displayName;
        changed = true;
      }
      setText("firstName", firstName);
      setNullableText("middleName", middleName);
      setText("lastName", lastName);
      setNullableText("suffix", suffix);
    }
    setText("mobileNumber", input.mobileNumber?.trim());
    setText("dateOfBirth", input.dateOfBirth);
    if (input.email !== undefined) {
      const email = input.email.trim();
      const normalizedEmail = email.toLowerCase();
      if (!normalizedEmail) throw invalid("Email is required.");
      if (members.some((item) => item.id !== id && item.sellerProfile?.email.toLowerCase() === normalizedEmail)) throw conflict("seller_email_exists", "Email already has seller.");
      const result = await dbRead<{ userAccounts: Array<{ id: string }> }>(`query($email: String!) { userAccounts(where: { email: { eq: $email } }) { id } }`, { email });
      if (result.userAccounts.some((item) => item.id !== member.accountId)) throw conflict("account_email_exists", "Email already has account.");
      if (profile.email.toLowerCase() !== normalizedEmail) {
        profile.email = email;
        changed = true;
        emailChanged = true;
      }
    }
    setAddressText("street", input.street);
    setAddressText("province", input.province);
    setAddressText("city", input.city);
    setAddressText("barangay", input.barangay);
    setAddressText("postalCode", input.postalCode?.trim());
    setNullableText("telephone", input.telephone);
    setNullableText("facebook", input.facebook);
    const tin = normalizeTin(input.tin);
    if (tin !== undefined) setNullableText("tin", tin);
    setNullableText("businessEmployer", input.businessEmployer);
    setNullableText("businessAddress", input.businessAddress);
    setNullableText("jobPosition", input.jobPosition);
    setText("gender", input.gender);
    setText("civilStatus", input.civilStatus);
    setText("governmentIdType", input.governmentIdType);
    setText("governmentIdNumber", input.governmentIdNumber?.trim());
    setText("cardApplicationDate", input.cardApplicationDate);
    setText("programCategory", input.programCategory);
    if (input.vipCardLevel !== undefined && profile.vipCardLevel !== input.vipCardLevel) {
      profile.vipCardLevel = input.vipCardLevel;
      changed = true;
    }
  }
  if (input.displayName !== undefined) {
    const name = input.displayName.trim();
    if (!name) throw invalid("Member name is required.");
    if (name !== member.displayName) {
      member.displayName = name;
      changed = true;
    }
  }
  if (!changed) return member;
  const { columns, details } = memberColumns(member);
  const syncAccount = Boolean(account && (account.displayName !== member.displayName || emailChanged));
  await transact(actor, {
    variableDefinitions: ["$id: UUID!", "$d: Member_Data!", ...(syncAccount ? ["$accountId: UUID!", "$account: UserAccount_Data!"] : [])].join(", "),
    fields: ["member: member_update(id: $id, data: $d)", ...(syncAccount ? ["account: userAccount_update(id: $accountId, data: $account)"] : [])].join("\n"),
    variables: {
      id,
      d: { ...columns, details, rowVersion: member.rowVersion + 1 },
      ...(syncAccount
        ? { accountId: account!.id, account: { displayName: member.displayName, ...(emailChanged && profile ? { email: profile.email } : {}) } }
        : {}),
    },
    audit: [audit("MEMBER_UPDATED", "member", id, { newValue: member.displayName })],
  });
  return member;
}

export async function transferMember(actor: Actor, id: string, newParentId: string | null, options?: TransferSalesNetworkMemberTarget): Promise<OrgMember> {
  requireManager(actor);
  const [members, accreditations] = await Promise.all([loadMembers(), loadAccreditations()]);
  const member = visibleMember(actor, members, id);
  const newDesignation = options?.designation ?? member.designation;
  if (member.designation === "SVD" && newDesignation === "SVD") throw invalid("A Sales Vice Director at the top of a team cannot be transferred.");
  if (newDesignation === "SVD" && newParentId !== null) throw invalid("A Sales Vice Director cannot have a parent.");
  if (member.parentId === newParentId && newDesignation === member.designation) throw invalid("Member already belongs to the selected parent.");
  const newParent = newParentId ? (members.find((item) => item.id === newParentId) ?? null) : null;
  if (newDesignation !== "SVD" && !newParent) throw invalid("Receiving parent does not exist.");
  assertParent(actor, newDesignation, newParent, members, accreditations, member.id);
  if (newDesignation !== member.designation) {
    for (const child of getDirectChildren(member.id, members)) {
      if (!isValidParentEdge(child.designation, newDesignation)) throw invalid(`Transfer blocked: ${child.displayName} (${designationLabel(child.designation)}) would lose an eligible sponsor.`);
    }
  }
  if (newDesignation === "SVD" && !(options?.teamName ?? "").trim()) throw invalid("Team name is required for a Sales Vice Director.");
  const targetBranchId = newDesignation === "SVD" ? newBranchId() : newParent!.branchId;
  const movedIds = new Set([member.id, ...getDescendantIds(member.id, members)]);
  const moved = members.filter((item) => movedIds.has(item.id)).map((item): MemberRecord => {
    const isRoot = item.id === member.id;
    const entry = {
      previousParentId: item.parentId,
      newParentId: isRoot ? (newParent?.id ?? null) : item.parentId,
      previousBranchId: item.branchId,
      newBranchId: targetBranchId,
      operation: "transfer" as const,
      actorId: actor.userId,
      changedAt: nowIso(),
    };
    return {
      ...item,
      designation: isRoot ? newDesignation : item.designation,
      parentId: isRoot ? (newParent?.id ?? null) : item.parentId,
      branchId: targetBranchId,
      teamName: isRoot && newDesignation === "SVD" ? (options?.teamName ?? "").trim() : isRoot ? null : item.teamName,
      parentHistory: [...(item.parentHistory ?? []), entry],
    };
  });
  const definitions: string[] = ["$rootId: UUID!", "$rootVersion: Int!", "$root: Member_Data!"];
  const fields: string[] = ["rootUpdate: member_updateMany(where: { id: { eq: $rootId }, rowVersion: { eq: $rootVersion } }, data: $root)"];
  const variables: Record<string, unknown> = {
    rootId: member.id,
    rootVersion: member.rowVersion,
    root: { ...memberColumns(moved[0]).columns, details: memberColumns(moved[0]).details, rowVersion: member.rowVersion + 1 },
  };
  moved.slice(1).forEach((item, index) => {
    const { columns, details } = memberColumns(item);
    definitions.push(`$id${index}: UUID!`, `$m${index}: Member_Data!`);
    fields.push(`m${index}: member_update(id: $id${index}, data: $m${index})`);
    variables[`id${index}`] = item.id;
    variables[`m${index}`] = { ...columns, details, rowVersion: item.rowVersion + 1 };
  });
  fields.push(`query @redact { member(id: $rootId) @check(expr: "response.rootUpdate == 1", message: "STALE_MEMBER") { id } }`);
  await transact(actor, {
    variableDefinitions: definitions.join(", "),
    fields: fields.join("\n"),
    variables,
    audit: [audit("MEMBER_TRANSFERRED", "member", member.id, { previousValue: member.parentId, newValue: newParent?.id ?? null }, newParent ? [newParent.id] : undefined)],
    markers: { STALE_MEMBER: conflict("member_changed", "The network changed while you were working. Reload and try again.") },
  });
  return moved[0];
}

export async function changeMemberStatus(actor: Actor, id: string, status: OrgMember["status"]): Promise<OrgMember> {
  requireManager(actor);
  const members = await loadMembers();
  const member = visibleMember(actor, members, id);
  if (status === "active" && (member.status === "inactive" || member.status === "suspended") && !isAdmin(actor)) {
    throw new ApiError(403, "forbidden", "Reactivation requires administrator authorization.");
  }
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $status: String!, $version: Int!",
    fields: "member: member_update(id: $id, data: { status: $status, rowVersion: $version })",
    variables: { id, status, version: member.rowVersion + 1 },
    audit: [audit("MEMBER_STATUS_CHANGED", "member", id, { previousValue: member.status, newValue: status })],
  });
  return { ...member, status };
}

// ---------------------------------------------------------------- seat vacancies
export async function listSeatVacancies(actor: Actor): Promise<SeatVacancy[]> {
  const members = await loadMembers();
  const visible = visibleIds(actor, members);
  return (await loadSeatVacancies()).filter((vacancy) => visible.has(vacancy.seatMemberId));
}

export async function recordSeatVacancy(actor: Actor, seatMemberId: string, holderEndDate: string): Promise<SeatVacancy> {
  if (!isAdmin(actor)) throw new ApiError(403, "forbidden", "Recording a vacant seat requires Administrator or Super Administrator authorization.");
  const [members, vacancies, accreditations] = await Promise.all([loadMembers(), loadSeatVacancies(), loadAccreditations()]);
  const seat = visibleMember(actor, members, seatMemberId);
  if (seat.designation === "OST") throw invalid("Only a leader seat (Sales Vice Director, Senior Sales Manager or Sales Manager) can be vacant.");
  if (!parseManilaDateOnly(holderEndDate)) throw invalid("The holder's end date must be a valid date.");
  if (findOpenVacancy(vacancies, seatMemberId)) throw conflict("seat_vacant", "This seat is already vacant.");
  const current = getCurrentAccreditationRecord(accreditations.filter((record) => record.memberId === seatMemberId));
  if (current?.endDate && current.endDate !== holderEndDate) throw conflict("end_date_exists", "The holder already has a different end date recorded.");
  const vacancy: SeatVacancy = { id: newId(), seatMemberId, holderEndDate, startDate: vacancyStartDate(holderEndDate), filledOn: null, filledMethod: null, filledByMemberId: null, recordedBy: actor.userId, recordedAt: nowIso() };
  const definitions = ["$vacancy: SeatVacancy_Data!", ...(current ? ["$recordId: UUID!", "$endDate: Date!"] : [])].join(", ");
  await transact(actor, {
    variableDefinitions: definitions,
    fields: ["vacancy: seatVacancy_insert(data: $vacancy)", ...(current ? ["accreditation: accreditation_update(id: $recordId, data: { endDate: $endDate })"] : [])].join("\n"),
    variables: { vacancy: { id: vacancy.id, seatMemberId, holderEndDate, startDate: vacancy.startDate, recordedById: actor.userId }, ...(current ? { recordId: current.id, endDate: holderEndDate } : {}) },
    audit: [audit("SEAT_VACANCY_RECORDED", "member", seatMemberId, { newValue: vacancy.startDate })],
  });
  return vacancy;
}

export async function fillSeatVacancy(actor: Actor, vacancyId: string, input: FillSeatVacancyInput): Promise<SeatVacancy> {
  if (!isAdmin(actor)) throw new ApiError(403, "forbidden", "Filling a vacant seat requires Administrator or Super Administrator authorization.");
  const [members, vacancies] = await Promise.all([loadMembers(), loadSeatVacancies()]);
  const vacancy = vacancies.find((item) => item.id === vacancyId);
  if (!vacancy) throw notFound("Vacancy");
  if (vacancy.filledOn) throw conflict("seat_filled", "This seat is already filled.");
  if (input.method !== "promotion" && input.method !== "transfer") throw invalid("A vacant seat is filled only by promotion or team transfer.");
  if (!parseManilaDateOnly(input.filledOn)) throw invalid("The fill date must be a valid date.");
  if (input.filledOn < vacancy.startDate) throw invalid("The fill date must be on or after the vacancy starts.");
  if (input.newHolderMemberId === vacancy.seatMemberId || !members.some((item) => item.id === input.newHolderMemberId)) throw invalid("Choose the member who fills the seat.");
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $filledOn: Date!, $method: String!, $holder: UUID!",
    fields: "vacancy: seatVacancy_update(id: $id, data: { filledOn: $filledOn, filledMethod: $method, filledByMemberId: $holder })",
    variables: { id: vacancyId, filledOn: input.filledOn, method: input.method, holder: input.newHolderMemberId },
    audit: [audit("SEAT_VACANCY_FILLED", "member", vacancy.seatMemberId, { previousValue: vacancy.startDate, newValue: input.method }, [vacancyId, input.newHolderMemberId])],
  });
  return { ...vacancy, filledOn: input.filledOn, filledMethod: input.method, filledByMemberId: input.newHolderMemberId };
}

// ---------------------------------------------------------------- accredited sellers
const ALLOCATION_ATTEMPTS = 5;

async function loadReservedNumbers(): Promise<Set<string>> {
  const [numbers, members] = await Promise.all([
    dbRead<{ accreditationNumbers: Array<{ aaNumber: string }> }>("query { accreditationNumbers { aaNumber } }"),
    dbRead<{ members: Array<{ aaNumber: string | null }> }>("query { members { aaNumber } }"),
  ]);
  const reserved = new Set<string>();
  for (const row of numbers.accreditationNumbers) reserved.add(row.aaNumber.trim().toUpperCase());
  for (const row of members.members) if (row.aaNumber) reserved.add(row.aaNumber.trim().toUpperCase());
  return reserved;
}

/** Allocates the next shared AA number and runs `commit`, retrying when another request took it first. */
export async function withAaAllocation<T>(prefix: "AAI" | "AAO", yymm: string, commit: (aaNumber: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < ALLOCATION_ATTEMPTS; attempt += 1) {
    const reserved = await loadReservedNumbers();
    const { aaNumber } = allocateSharedAaNumber(prefix, yymm, reserved);
    try {
      return await commit(aaNumber);
    } catch (error) {
      if (uniqueViolation(error)?.toLowerCase().includes("aanumber")) continue;
      throw error;
    }
  }
  throw conflict("aa_exhausted", "The accreditation number sequence is busy. Try again.");
}

export async function createAccreditedSeller(actor: Actor, input: CreateAccreditedSellerInput): Promise<AccreditedSellerResult> {
  requireManager(actor);
  if (!activeRoles(actor.identity).includes("super_admin")) throw new ApiError(403, "forbidden", "Complete Now requires Super Administrator authorization.");
  return commitAccreditedSeller(actor, input);
}

/**
 * Validated all-or-nothing commit of seller + account + accreditation + AA number.
 * The caller authorizes: createAccreditedSeller (Super Admin) and registration approval (Administrator or Super Admin).
 */
export async function commitAccreditedSeller(actor: Actor, input: CreateAccreditedSellerInput, keepProgramCategory?: string): Promise<AccreditedSellerResult> {
  const referenceEntries = await loadReferenceEntries();
  const fieldError = validateAccreditedSellerFields(input, allowedValues(referenceEntries, "program-category", [keepProgramCategory]));
  if (fieldError) throw invalid(fieldError);
  const [members, accreditations] = await Promise.all([loadMembers(), loadAccreditations()]);
  const email = input.email.trim();
  const normalizedEmail = email.toLowerCase();

  let linkAccountId: string | null = null;
  let createNewAccount = false;
  if (input.sellerIdentity === "existing") {
    const account = input.existingAccountId ? await loadAccount(input.existingAccountId) : null;
    if (!account) throw invalid("Selected employee account missing.");
    if (account.email.toLowerCase() !== normalizedEmail) throw invalid("Email must match account.");
    if (members.some((member) => member.accountId === account.id)) throw conflict("account_linked", "Employee already has affiliation.");
    linkAccountId = account.id;
  } else {
    const [accounts, sellerByEmail] = await Promise.all([
      dbRead<{ userAccounts: Array<{ id: string }> }>(`query($email: String!) { userAccounts(where: { email: { eq: $email } }) { id } }`, { email: normalizedEmail }),
      Promise.resolve(members.filter((member) => member.sellerProfile?.email.toLowerCase() === normalizedEmail)),
    ]);
    if (accounts.userAccounts.length > 0) throw conflict("account_email_exists", "Email already has account.");
    if (sellerByEmail.length > 0) throw conflict("seller_email_exists", "Email already has seller.");
    createNewAccount = true;
  }

  let parent: OrgMember | null = null;
  if (input.designation !== "SVD") {
    parent = members.find((member) => member.id === input.parentId) ?? null;
    if (!parent) throw invalid("Selected sponsor no longer exists.");
    if (!visibleIds(actor, members).has(parent.id) && !isAdmin(actor)) throw new ApiError(403, "outside_scope", "Sponsor outside authorized scope.");
    assertParent(actor, input.designation, parent, members, accreditations);
  } else if (input.parentId !== null) {
    throw invalid("A Sales Vice Director cannot have a parent.");
  }
  const startParts = parseManilaDateOnly(input.approvedStart);
  const yymm = toAaYearMonth(input.approvedStart);
  const expiryDate = calculateApprovedExpiry(input.approvedStart);
  if (!startParts || !yymm || !expiryDate) throw invalid("Start date must be valid.");
  if (startParts.month === 2 && startParts.day === 29) throw invalid("Leap-day starts need policy confirmation.");
  if (input.aaMethod === "manual") throw invalid("Accreditation numbers are issued automatically.");

  const memberId = newId();
  const accreditationId = newId();
  const branchId = input.designation === "SVD" ? newBranchId() : parent!.branchId;
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const middleName = input.noMiddleName ? null : input.middleName.trim();
  const suffix = input.suffix?.trim() ? input.suffix.trim() : null;
  const displayName = [firstName, middleName, lastName, suffix].filter(Boolean).join(" ");
  const adminStatus = input.accreditationStatus === "accredited" ? "active" : "pending";
  const member: OrgMember = {
    id: memberId,
    displayName,
    designation: input.designation,
    branchId,
    parentId: parent?.id ?? null,
    status: "active",
    departmentId: null,
    accountId: linkAccountId,
    teamName: input.designation === "SVD" ? (input.teamName ?? "").trim() || null : null,
    referralCode: null,
    aaNumber: null,
    mockAccreditationEligible: true,
    parentHistory: [createHistoryEntry(actor, parent?.id ?? null, branchId)],
    sellerProfile: {
      firstName, middleName, lastName, suffix,
      mobileNumber: input.mobileNumber.trim(), dateOfBirth: input.dateOfBirth.trim(), email,
      profilePhotoName: input.profilePhotoName ?? null, profilePhotoUrl: null,
      address: { street: input.street.trim(), province: input.province.trim(), city: input.city.trim(), barangay: input.barangay.trim(), postalCode: input.postalCode.trim() },
      governmentIdType: input.governmentIdType.trim(), governmentIdNumber: input.governmentIdNumber.trim(),
      cardApplicationDate: input.cardApplicationDate.trim(), programCategory: input.programCategory.trim(), vipCardLevel: input.vipCardLevel,
      gender: input.gender.trim(), civilStatus: input.civilStatus.trim(),
      telephone: input.telephone?.trim() ? input.telephone.trim() : null,
      facebook: input.facebook?.trim() ? input.facebook.trim() : null,
      tin: input.tin?.trim() ? input.tin.trim() : null,
      businessEmployer: input.businessEmployer?.trim() ? input.businessEmployer.trim() : null,
      businessAddress: input.businessAddress?.trim() ? input.businessAddress.trim() : null,
      jobPosition: input.jobPosition?.trim() ? input.jobPosition.trim() : null,
      sellerSource: "manual-admin",
      originalAccreditationDate: input.approvedStart.trim(), expiryDate,
    },
  };
  const accreditation: AccreditationRecord = {
    id: accreditationId, memberId, classification: input.mode, adminStatus,
    originalAccreditationDate: input.approvedStart.trim(), effectiveDate: input.approvedStart.trim(), expiryDate,
    aaNumber: null, history: [{ operation: "created", actorId: actor.userId, changedAt: nowIso() }],
  };
  const prefix: "AAI" | "AAO" = input.mode === "IST" ? "AAI" : "AAO";
  const firebaseUid = createNewAccount ? await createSalesUser(email, displayName) : undefined;
  const accountId = createNewAccount ? newId() : linkAccountId!;
  try {
    return await withAaAllocation(prefix, yymm, async (aaNumber) => {
      member.aaNumber = aaNumber;
      accreditation.aaNumber = aaNumber;
      const { columns, details } = memberColumns(member);
      const definitionParts = ["$member: Member_Data!", "$accreditation: Accreditation_Data!", "$number: AccreditationNumber_Data!"];
      const fieldParts = ["member: member_insert(data: $member)"];
      const variables: Record<string, unknown> = {
        member: { id: memberId, ...columns, details },
        accreditation: { id: accreditationId, memberId, ...accreditationColumns(accreditation) },
        number: { aaNumber, memberId, accreditationId, month: yymm, sequence: Number(aaNumber.slice(-4)), issuedOn: manilaToday() },
      };
      if (createNewAccount) {
        definitionParts.unshift("$account: UserAccount_Data!");
        fieldParts.push("account: userAccount_insert(data: $account)");
        variables.account = { id: accountId, email, displayName, status: "pending", portal: "sales", memberId, firebaseUid };
      } else {
        definitionParts.unshift("$accountId: UUID!", "$memberId: UUID!");
        fieldParts.push("account: userAccount_update(id: $accountId, data: { memberId: $memberId })");
        Object.assign(variables, { accountId, memberId });
      }
      fieldParts.push("accreditation: accreditation_insert(data: $accreditation)", "number: accreditationNumber_insert(data: $number)");
      await transact(actor, {
        variableDefinitions: definitionParts.join(", "),
        fields: fieldParts.join("\n"),
        variables,
        audit: [
          { action: "MEMBER_CREATED", entityType: "member", entityId: memberId, details: { module: MODULE, newValue: input.designation } },
          { action: "ACCREDITATION_ISSUED", entityType: "accreditation", entityId: accreditationId, details: { module: "accreditation", newValue: "pending", aaNumber } },
        ],
      });
      return { memberId, accountId, accreditationId, aaNumber, expiryDate };
    });
  } catch (error) {
    if (firebaseUid) await getAuth(getAdminApp()).deleteUser(firebaseUid).catch(() => undefined);
    throw error;
  }
}

async function createSalesUser(email: string, displayName: string): Promise<string | undefined> {
  try {
    return (await getAuth(getAdminApp()).createUser({ email, displayName })).uid;
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String((error as { code: unknown }).code) : "";
    if (code === "auth/email-already-exists") throw conflict("account_email_exists", "An account with this email already exists.");
    throw error;
  }
}

function accreditationColumns(record: AccreditationRecord) {
  return {
    classification: record.classification,
    adminStatus: record.adminStatus,
    originalAccreditationDate: record.originalAccreditationDate ?? undefined,
    effectiveDate: record.effectiveDate ?? undefined,
    expiryDate: record.expiryDate ?? undefined,
    aaNumber: record.aaNumber ?? undefined,
    history: record.history,
  };
}
