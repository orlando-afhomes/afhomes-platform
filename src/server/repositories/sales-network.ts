import "server-only";
import { dbRead, listAll } from "@/server/db";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import type { OrgMember } from "@/modules/organization/types";
import type { RegistrationApplication } from "@/modules/accreditation/types";
import type { SeatVacancy } from "@/modules/sales-network/vacancy";

type Json = Record<string, unknown>;

// ---------------------------------------------------------------- members
export type MemberRow = {
  id: string; displayName: string; designation: string; branchId: string; status: string;
  teamName: string | null; referralCode: string | null; aaNumber: string | null;
  details: Json | null; parentHistory: Json[] | null; rowVersion: number;
  parent: { id: string } | null; userAccounts_on_member: Array<{ id: string }>;
};
export const MEMBER_FIELDS = "id displayName designation branchId status teamName referralCode aaNumber details parentHistory rowVersion parent { id } userAccounts_on_member { id }";

export type MemberRecord = OrgMember & { rowVersion: number };

export function toMember(row: MemberRow): MemberRecord {
  const details = row.details ?? {};
  return {
    ...details,
    id: row.id,
    displayName: row.displayName,
    designation: row.designation as OrgMember["designation"],
    branchId: row.branchId,
    parentId: row.parent?.id ?? null,
    status: row.status as OrgMember["status"],
    teamName: row.teamName ?? null,
    referralCode: row.referralCode ?? null,
    aaNumber: row.aaNumber ?? null,
    accountId: row.userAccounts_on_member[0]?.id ?? null,
    parentHistory: (row.parentHistory ?? (details.parentHistory as Json[] | undefined) ?? []) as NonNullable<OrgMember["parentHistory"]>,
    rowVersion: row.rowVersion,
  } as MemberRecord;
}

/** Splits a member into its indexed columns and the jsonb `details` (seller profile and fixtures). */
export function memberColumns(member: OrgMember) {
  const { id: _id, displayName, designation, branchId, parentId, status, teamName, referralCode, aaNumber, parentHistory, accountId: _account, departmentId: _department, ...details } = member;
  void _id; void _account; void _department;
  return {
    columns: {
      displayName,
      designation,
      branchId,
      parentId: parentId ?? undefined,
      status,
      teamName: teamName ?? undefined,
      referralCode: referralCode ?? undefined,
      aaNumber: aaNumber ?? undefined,
      parentHistory: parentHistory ?? undefined,
    },
    details,
  };
}

export async function loadMembers(): Promise<MemberRecord[]> {
  return (await listAll<MemberRow>("members", MEMBER_FIELDS)).map(toMember);
}

export async function loadMember(id: string): Promise<MemberRecord | null> {
  const result = await dbRead<{ member: MemberRow | null }>(`query($id: UUID!) { member(id: $id) { ${MEMBER_FIELDS} } }`, { id });
  return result.member ? toMember(result.member) : null;
}

// ---------------------------------------------------------------- accreditations
export type AccreditationRow = {
  id: string; member: { id: string } | null; classification: string; adminStatus: string;
  originalAccreditationDate: string | null; effectiveDate: string | null; expiryDate: string | null;
  aaNumber: string | null; suspensionEffectiveDate: string | null; endDate: string | null;
  history: Json[] | null; createdAt: string;
};
export const ACCREDITATION_FIELDS = "id member { id } classification adminStatus originalAccreditationDate effectiveDate expiryDate aaNumber suspensionEffectiveDate endDate history createdAt";

type NumberRow = { aaNumber: string; issuedOn: string; replacedOn: string | null; accreditation: { id: string } | null };
const NUMBER_FIELDS = "aaNumber issuedOn replacedOn accreditation { id }";

export type AccreditationNumbers = Map<string, Array<{ aaNumber: string; replacedOn: string | null }>>;

/** AA Number History per accreditation, oldest first (replaced rows only; the current number lives on the record). */
export async function loadAccreditationNumbers(): Promise<AccreditationNumbers> {
  const rows = await listAll<NumberRow>("accreditationNumbers", NUMBER_FIELDS, { orderBy: "[{ issuedOn: ASC }]" });
  const map: AccreditationNumbers = new Map();
  for (const row of rows) {
    if (!row.replacedOn || !row.accreditation) continue;
    const list = map.get(row.accreditation.id) ?? [];
    list.push({ aaNumber: row.aaNumber, replacedOn: row.replacedOn });
    map.set(row.accreditation.id, list);
  }
  return map;
}

export function toAccreditation(row: AccreditationRow, numbers?: AccreditationNumbers): AccreditationRecord {
  const history = (row.history ?? []) as AccreditationRecord["history"];
  const replaced = numbers?.get(row.id) ?? [];
  return {
    id: row.id,
    memberId: row.member?.id ?? "",
    classification: row.classification as AccreditationRecord["classification"],
    adminStatus: row.adminStatus as AccreditationRecord["adminStatus"],
    originalAccreditationDate: row.originalAccreditationDate,
    effectiveDate: row.effectiveDate,
    expiryDate: row.expiryDate,
    aaNumber: row.aaNumber,
    suspensionEffectiveDate: row.suspensionEffectiveDate,
    endDate: row.endDate,
    history,
    ...(replaced.length > 0
      ? {
          aaNumberHistory: replaced.map((entry) => ({
            aaNumber: entry.aaNumber,
            replacedBy: row.aaNumber ?? "",
            replacedOn: entry.replacedOn ?? "",
            actorId: "",
            changedAt: "",
          })),
        }
      : {}),
  };
}

export async function loadAccreditations(): Promise<AccreditationRecord[]> {
  const [rows, numbers] = await Promise.all([listAll<AccreditationRow>("accreditations", ACCREDITATION_FIELDS), loadAccreditationNumbers()]);
  return rows.map((row) => toAccreditation(row, numbers));
}

export async function loadAccreditation(id: string): Promise<AccreditationRecord | null> {
  const [result, numbers] = await Promise.all([
    dbRead<{ accreditation: AccreditationRow | null }>(`query($id: UUID!) { accreditation(id: $id) { ${ACCREDITATION_FIELDS} } }`, { id }),
    loadAccreditationNumbers(),
  ]);
  return result.accreditation ? toAccreditation(result.accreditation, numbers) : null;
}

export async function loadAccreditationsByMember(memberId: string): Promise<AccreditationRecord[]> {
  const [rows, numbers] = await Promise.all([
    listAll<AccreditationRow>("accreditations", ACCREDITATION_FIELDS, { where: "{ member: { id: { eq: $id } } }", variableDefinitions: "$id: UUID!", variables: { id: memberId } }),
    loadAccreditationNumbers(),
  ]);
  return rows.map((row) => toAccreditation(row, numbers));
}

export function accreditationColumns(record: AccreditationRecord) {
  return {
    memberId: record.memberId,
    classification: record.classification,
    adminStatus: record.adminStatus,
    originalAccreditationDate: record.originalAccreditationDate ?? undefined,
    effectiveDate: record.effectiveDate ?? undefined,
    expiryDate: record.expiryDate ?? undefined,
    aaNumber: record.aaNumber ?? undefined,
    suspensionEffectiveDate: record.suspensionEffectiveDate ?? undefined,
    endDate: record.endDate ?? undefined,
    history: record.history,
  };
}

// ---------------------------------------------------------------- registrations
export type RegistrationRow = {
  id: string; classification: string; member: { id: string } | null; account: { id: string } | null;
  sponsorMember: { id: string } | null; status: string; sponsorLabel: string; reference: string;
  applicant: Json; version: number; versions: Json[] | null; completion: Json | null;
  correctionToken: string | null; decisionReason: string | null; history: Json[] | null;
  reviewer: { id: string } | null; submittedAt: string | null; decidedAt: string | null;
  createdAt: string; updatedAt: string;
};
export const REGISTRATION_FIELDS = "id classification member { id } account { id } sponsorMember { id } status sponsorLabel reference applicant version versions completion correctionToken decisionReason history reviewer { id } submittedAt decidedAt createdAt updatedAt";

export function toRegistration(row: RegistrationRow): RegistrationApplication {
  return {
    id: row.id,
    classification: row.classification as RegistrationApplication["classification"],
    memberId: row.member?.id ?? null,
    accountId: row.account?.id ?? null,
    sponsorMemberId: row.sponsorMember?.id ?? null,
    status: row.status as RegistrationApplication["status"],
    sponsorLabel: row.sponsorLabel,
    reference: row.reference,
    applicant: row.applicant as RegistrationApplication["applicant"],
    version: row.version,
    versions: (row.versions ?? []) as RegistrationApplication["versions"],
    completion: (row.completion ?? null) as RegistrationApplication["completion"],
    correctionToken: row.correctionToken,
    decisionReason: row.decisionReason,
    history: (row.history ?? []) as RegistrationApplication["history"],
    reviewerId: row.reviewer?.id ?? null,
    submittedAt: row.submittedAt,
    decidedAt: row.decidedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function loadRegistrations(): Promise<RegistrationApplication[]> {
  return (await listAll<RegistrationRow>("registrationApplications", REGISTRATION_FIELDS)).map(toRegistration);
}

export async function loadRegistration(id: string): Promise<RegistrationApplication | null> {
  const result = await dbRead<{ registrationApplication: RegistrationRow | null }>(`query($id: UUID!) { registrationApplication(id: $id) { ${REGISTRATION_FIELDS} } }`, { id });
  return result.registrationApplication ? toRegistration(result.registrationApplication) : null;
}

export async function loadRegistrationByToken(token: string): Promise<RegistrationApplication | null> {
  const result = await dbRead<{ registrationApplications: RegistrationRow[] }>(
    `query($token: String!) { registrationApplications(where: { correctionToken: { eq: $token } }) { ${REGISTRATION_FIELDS} } }`,
    { token },
  );
  const row = result.registrationApplications.find((item) => item.status === "needs_info");
  return row ? toRegistration(row) : null;
}

/** Columns and jsonb parts for a registration write. */
export function registrationColumns(application: RegistrationApplication) {
  return {
    classification: application.classification,
    memberId: application.memberId ?? undefined,
    accountId: application.accountId ?? undefined,
    sponsorMemberId: application.sponsorMemberId ?? undefined,
    status: application.status,
    sponsorLabel: application.sponsorLabel,
    reference: application.reference,
    applicant: application.applicant,
    version: application.version,
    versions: application.versions,
    completion: application.completion ?? undefined,
    correctionToken: application.correctionToken ?? undefined,
    decisionReason: application.decisionReason ?? undefined,
    history: application.history,
    reviewerId: application.reviewerId ?? undefined,
    submittedAt: application.submittedAt ?? undefined,
    decidedAt: application.decidedAt ?? undefined,
  };
}

// ---------------------------------------------------------------- seat vacancies
export type VacancyRow = {
  id: string; seatMember: { id: string } | null; holderEndDate: string; startDate: string;
  filledOn: string | null; filledMethod: string | null; filledByMember: { id: string } | null;
  recordedBy: { id: string } | null; recordedAt: string;
};
export const VACANCY_FIELDS = "id seatMember { id } holderEndDate startDate filledOn filledMethod filledByMember { id } recordedBy { id } recordedAt";

export function toVacancy(row: VacancyRow): SeatVacancy {
  return {
    id: row.id,
    seatMemberId: row.seatMember?.id ?? "",
    holderEndDate: row.holderEndDate,
    startDate: row.startDate,
    filledOn: row.filledOn,
    filledMethod: row.filledMethod as SeatVacancy["filledMethod"],
    filledByMemberId: row.filledByMember?.id ?? null,
    recordedBy: row.recordedBy?.id ?? "system",
    recordedAt: row.recordedAt,
  };
}

export async function loadSeatVacancies(): Promise<SeatVacancy[]> {
  return (await listAll<VacancyRow>("seatVacancies", VACANCY_FIELDS, { orderBy: "[{ startDate: ASC }]" })).map(toVacancy);
}
