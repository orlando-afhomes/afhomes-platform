import type { Account } from "@/modules/accounts/types";
import type { AccreditationRecord, RegistrationApplicant, RegistrationApplication } from "@/modules/accreditation/types";
import { calculateRenewedExpiry } from "@/modules/accreditation/dates";
import { buildAaNumber, toAaYearMonth } from "@/modules/accreditation/issuance";
import type { Department, DepartmentRole, Designation, OrgMember, StaffMember } from "@/modules/organization/types";
import type { SeatVacancy } from "@/modules/sales-network/vacancy";
import { vacancyStartDate } from "@/modules/sales-network/vacancy";
import type { VipTierCode } from "@/modules/vip/types";
import type { SeedClock } from "./anchor";
import { addressAt, companyEmail, governmentIdAt, landlineAt, mobileAt, tinAt, tokenAt } from "./people";

type SellerSpec = {
  id: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  suffix?: string;
  gender: "Male" | "Female";
  civilStatus: string;
  dateOfBirth: string;
  designation: Designation;
  branchId: string;
  parentId: string | null;
  teamName?: string;
  referralCode?: string;
  /** Days before today of the original accreditation. */
  accreditedDaysAgo: number;
  /** Renewed on the expiry date of the first year (doc 03 section 5.2). */
  renewed?: boolean;
  /** Days before today the holder left (seat stays in the genealogy, doc 02 section 5.1.1). */
  leftDaysAgo?: number;
  governmentIdType: string;
  vipCardLevel: VipTierCode;
  programCategory: string;
  employer?: string;
  jobPosition?: string;
};

const SELLERS: readonly SellerSpec[] = [
  { id: "mem-svd-a", firstName: "Ramon", middleName: "Cruz", lastName: "Del Rosario", gender: "Male", civilStatus: "Married", dateOfBirth: "1975-03-14",
    designation: "SVD", branchId: "branch-a", parentId: null, teamName: "Team Alab", accreditedDaysAgo: 540, renewed: true,
    governmentIdType: "Philippine National ID", vipCardLevel: "G1", programCategory: "vip_privilege_card_holder", employer: "Del Rosario Realty Services", jobPosition: "Licensed Real Estate Broker" },
  { id: "mem-ssm-a", firstName: "Maria", middleName: "Reyes", lastName: "Santos", gender: "Female", civilStatus: "Single", dateOfBirth: "1982-07-22",
    designation: "SSM", branchId: "branch-a", parentId: "mem-svd-a", accreditedDaysAgo: 470, renewed: true,
    governmentIdType: "Driver's License", vipCardLevel: "S1", programCategory: "non_vip_client" },
  { id: "mem-sm-a", firstName: "Jose", middleName: null, lastName: "Reyes", suffix: "Jr.", gender: "Male", civilStatus: "Married", dateOfBirth: "1988-11-05",
    designation: "SM", branchId: "branch-a", parentId: "mem-ssm-a", referralCode: "REF-SMALPHA", accreditedDaysAgo: 335,
    governmentIdType: "Passport", vipCardLevel: "B1", programCategory: "future_vip_privilege_card_holder" },
  { id: "mem-ost-a1", firstName: "Ana", middleName: "Torres", lastName: "Mendoza", gender: "Female", civilStatus: "Married", dateOfBirth: "1992-01-30",
    designation: "OST", branchId: "branch-a", parentId: "mem-sm-a", accreditedDaysAgo: 300,
    governmentIdType: "SSS ID", vipCardLevel: "S1", programCategory: "vip_privilege_card_holder", employer: "Mendoza Home Supplies", jobPosition: "Store Owner" },
  { id: "mem-ost-a2", firstName: "Mark", middleName: null, lastName: "Villanueva", gender: "Male", civilStatus: "Single", dateOfBirth: "1995-06-12",
    designation: "OST", branchId: "branch-a", parentId: "mem-svd-a", accreditedDaysAgo: 395,
    governmentIdType: "Postal ID", vipCardLevel: "B1", programCategory: "non_vip_client" },
  { id: "mem-svd-b", firstName: "Liza", middleName: "Bautista", lastName: "Aquino", gender: "Female", civilStatus: "Widowed", dateOfBirth: "1978-09-08",
    designation: "SVD", branchId: "branch-b", parentId: null, teamName: "Team Sinag", referralCode: "REF-LAQUINO", accreditedDaysAgo: 520, renewed: true,
    governmentIdType: "PRC ID", vipCardLevel: "G1", programCategory: "vip_privilege_card_holder", employer: "Aquino Travel and Tours", jobPosition: "Owner" },
  { id: "mem-ost-b1", firstName: "Paolo", middleName: "Garcia", lastName: "Ramos", gender: "Male", civilStatus: "Separated", dateOfBirth: "1990-12-19",
    designation: "OST", branchId: "branch-b", parentId: "mem-svd-b", accreditedDaysAgo: 250,
    governmentIdType: "UMID", vipCardLevel: "B1", programCategory: "future_vip_privilege_card_holder" },
  { id: "mem-ost-a3", firstName: "Kristine", middleName: "Ocampo", lastName: "Lagman", gender: "Female", civilStatus: "Single", dateOfBirth: "1996-04-17",
    designation: "OST", branchId: "branch-a", parentId: "mem-sm-a", accreditedDaysAgo: 190,
    governmentIdType: "Philippine National ID", vipCardLevel: "B1", programCategory: "non_vip_client", employer: "Calamba Doctors' Hospital", jobPosition: "Staff Nurse" },
  { id: "mem-ost-a4", firstName: "Dennis", middleName: "Villegas", lastName: "Sarmiento", gender: "Male", civilStatus: "Married", dateOfBirth: "1987-09-02",
    designation: "OST", branchId: "branch-a", parentId: "mem-ssm-a", accreditedDaysAgo: 150,
    governmentIdType: "Driver's License", vipCardLevel: "S1", programCategory: "vip_privilege_card_holder", employer: "Sarmiento Auto Supply", jobPosition: "Proprietor" },
  { id: "mem-ssm-b", firstName: "Roberto", middleName: "Natividad", lastName: "Valdez", gender: "Male", civilStatus: "Married", dateOfBirth: "1980-02-11",
    designation: "SSM", branchId: "branch-b", parentId: "mem-svd-b", referralCode: "REF-RVALDEZ", accreditedDaysAgo: 260,
    governmentIdType: "Passport", vipCardLevel: "S1", programCategory: "vip_privilege_card_holder" },
  { id: "mem-ost-b2", firstName: "Jocelyn", middleName: "Medina", lastName: "Manalo", gender: "Female", civilStatus: "Married", dateOfBirth: "1991-08-25",
    designation: "OST", branchId: "branch-b", parentId: "mem-ssm-b", accreditedDaysAgo: 120,
    governmentIdType: "SSS ID", vipCardLevel: "B1", programCategory: "non_vip_client", employer: "Department of Education, Batangas City", jobPosition: "Public School Teacher" },
  { id: "mem-svd-c", firstName: "Teresita", middleName: "Gonzaga", lastName: "Navarro", gender: "Female", civilStatus: "Married", dateOfBirth: "1973-12-03",
    designation: "SVD", branchId: "branch-c", parentId: null, teamName: "Team Bagwis", referralCode: "REF-TNAVARRO", accreditedDaysAgo: 500, renewed: true,
    governmentIdType: "PRC ID", vipCardLevel: "G1", programCategory: "vip_privilege_card_holder", employer: "Navarro Insurance Agency", jobPosition: "General Agent" },
  { id: "mem-ssm-c", firstName: "Gerardo", middleName: "Lim", lastName: "Pascua", gender: "Male", civilStatus: "Married", dateOfBirth: "1979-05-21",
    designation: "SSM", branchId: "branch-c", parentId: "mem-svd-c", accreditedDaysAgo: 330, leftDaysAgo: 75,
    governmentIdType: "UMID", vipCardLevel: "S1", programCategory: "non_vip_client" },
  { id: "mem-sm-c", firstName: "Arnel", middleName: "Mendoza", lastName: "Dizon", gender: "Male", civilStatus: "Single", dateOfBirth: "1986-10-14",
    designation: "SM", branchId: "branch-c", parentId: "mem-ssm-c", referralCode: "REF-ADIZON", accreditedDaysAgo: 210,
    governmentIdType: "Philippine National ID", vipCardLevel: "B1", programCategory: "future_vip_privilege_card_holder" },
  { id: "mem-ost-c1", firstName: "Rowena", middleName: "Yap", lastName: "Castillo", gender: "Female", civilStatus: "Single", dateOfBirth: "1994-03-09",
    designation: "OST", branchId: "branch-c", parentId: "mem-sm-c", accreditedDaysAgo: 95,
    governmentIdType: "Postal ID", vipCardLevel: "B1", programCategory: "non_vip_client", employer: "Santa Rosa City Hall", jobPosition: "Administrative Aide" },
];

/** Members whose accreditation is linked to an OST registration in the seed. */
export const REGISTERED_OST_MEMBER_ID = "mem-ost-c1";

const displayNameOf = (spec: SellerSpec) => `${spec.firstName} ${spec.lastName}${spec.suffix ? ` ${spec.suffix}` : ""}`;
const avoidLeapDay = (date: string, clock: SeedClock) => (date.endsWith("-02-29") ? clock.addDays(date, 1) : date);

export type NetworkSeed = {
  members: OrgMember[];
  accreditations: AccreditationRecord[];
  seatVacancies: SeatVacancy[];
  registrationApplications: RegistrationApplication[];
  accreditationSequence: number;
  registrationSequence: number;
};

export function buildNetwork(clock: SeedClock): NetworkSeed {
  // Issue events in date order so each month's shared AA sequence runs 0001, 0002, ... (doc 03).
  type Issue = { spec: SellerSpec; kind: "original" | "renewal"; date: string };
  const issues: Issue[] = [];
  for (const spec of SELLERS) {
    const original = avoidLeapDay(clock.ago(spec.accreditedDaysAgo), clock);
    issues.push({ spec, kind: "original", date: original });
    if (spec.renewed) issues.push({ spec, kind: "renewal", date: avoidLeapDay(clock.addYears(original, 1), clock) });
  }
  issues.sort((a, b) => a.date.localeCompare(b.date) || SELLERS.indexOf(a.spec) - SELLERS.indexOf(b.spec));
  const perMonth = new Map<string, number>();
  const numbers = new Map<string, string>();
  let latestMonth = "";
  for (const issue of issues) {
    const yymm = toAaYearMonth(issue.date)!;
    const sequence = (perMonth.get(yymm) ?? 0) + 1;
    perMonth.set(yymm, sequence);
    numbers.set(`${issue.spec.id}:${issue.kind}`, buildAaNumber(issue.spec.designation === "OST" ? "AAO" : "AAI", yymm, sequence));
    if (yymm > latestMonth) latestMonth = yymm;
  }

  const accreditations: AccreditationRecord[] = [];
  const members: OrgMember[] = SELLERS.map((spec, index) => {
    const original = avoidLeapDay(clock.ago(spec.accreditedDaysAgo), clock);
    const firstExpiry = clock.addYears(original, 1);
    const renewalDate = spec.renewed ? avoidLeapDay(firstExpiry, clock) : null;
    const effectiveDate = renewalDate ?? original;
    const expiryDate = renewalDate ? calculateRenewedExpiry(firstExpiry, renewalDate)! : firstExpiry;
    const originalNumber = numbers.get(`${spec.id}:original`)!;
    const currentNumber = renewalDate ? numbers.get(`${spec.id}:renewal`)! : originalNumber;
    const endDate = spec.leftDaysAgo ? clock.ago(spec.leftDaysAgo) : null;
    accreditations.push({
      id: `accr-seed-${index + 1}`, memberId: spec.id, classification: spec.designation === "OST" ? "OST" : "IST", adminStatus: "active",
      originalAccreditationDate: original, effectiveDate, expiryDate, aaNumber: currentNumber,
      aaNumberHistory: renewalDate ? [{ aaNumber: originalNumber, replacedBy: currentNumber, replacedOn: renewalDate, actorId: "dev-admin", changedAt: clock.at(renewalDate, "10:15") }] : undefined,
      endDate,
      history: [
        { operation: "created", newValue: originalNumber, actorId: "dev-admin", changedAt: clock.at(original, "09:30") },
        ...(renewalDate ? [{ operation: "renewed" as const, previousValue: originalNumber, newValue: currentNumber, reason: `Renewed on ${renewalDate}; valid until ${expiryDate}`, actorId: "dev-admin", changedAt: clock.at(renewalDate, "10:15") }] : []),
      ],
    });
    const address = addressAt(index + 40);
    const hasBusiness = Boolean(spec.employer);
    return {
      id: spec.id, displayName: displayNameOf(spec), designation: spec.designation, branchId: spec.branchId, parentId: spec.parentId,
      status: spec.leftDaysAgo ? "inactive" : "active", accountId: null,
      ...(spec.teamName ? { teamName: spec.teamName } : {}),
      ...(spec.referralCode ? { referralCode: spec.referralCode } : {}),
      aaNumber: currentNumber, mockAccreditationEligible: spec.designation !== "OST",
      sellerProfile: {
        firstName: spec.firstName, middleName: spec.middleName, lastName: spec.lastName, suffix: spec.suffix ?? null,
        mobileNumber: mobileAt(index + 200), dateOfBirth: spec.dateOfBirth, email: companyEmail(spec.firstName, spec.lastName),
        profilePhotoName: null, profilePhotoUrl: null, address,
        governmentIdType: spec.governmentIdType, governmentIdNumber: governmentIdAt(spec.governmentIdType, index + 200),
        cardApplicationDate: clock.addDays(original, -12), programCategory: spec.programCategory, vipCardLevel: spec.vipCardLevel,
        gender: spec.gender, civilStatus: spec.civilStatus,
        telephone: index % 3 === 0 ? landlineAt(index + 200, address) : null,
        facebook: index % 2 === 0 ? displayNameOf(spec) : null,
        tin: spec.designation !== "OST" || hasBusiness ? tinAt(index + 200) : null,
        businessEmployer: spec.employer ?? null,
        businessAddress: hasBusiness ? `${address.street}, ${address.city}, ${address.province}` : null,
        jobPosition: spec.jobPosition ?? null,
        sellerSource: "manual-admin", originalAccreditationDate: original, expiryDate,
      },
      ...(spec.id === "mem-ost-a4" ? {
        parentHistory: [
          { previousParentId: null, newParentId: "mem-sm-a", previousBranchId: "branch-a", newBranchId: "branch-a", operation: "create" as const, actorId: "dev-admin", changedAt: clock.at(original, "09:30") },
          { previousParentId: "mem-sm-a", newParentId: "mem-ssm-a", previousBranchId: "branch-a", newBranchId: "branch-a", operation: "transfer" as const, actorId: "dev-admin", changedAt: clock.at(clock.ago(64), "14:20") },
        ],
      } : {}),
      ...(spec.id === "mem-ost-b2" ? {
        parentHistory: [
          { previousParentId: null, newParentId: "mem-svd-b", previousBranchId: "branch-b", newBranchId: "branch-b", operation: "create" as const, actorId: "dev-admin", changedAt: clock.at(original, "09:30") },
          { previousParentId: "mem-svd-b", newParentId: "mem-ssm-b", previousBranchId: "branch-b", newBranchId: "branch-b", operation: "transfer" as const, actorId: "dev-admin", changedAt: clock.at(clock.ago(48), "11:05") },
        ],
      } : {}),
      ...(spec.id === "mem-ssm-c" ? {
        parentHistory: [
          { previousParentId: "mem-svd-c", newParentId: "mem-svd-c", previousBranchId: "branch-c", newBranchId: "branch-c", operation: "status" as const, actorId: "dev-admin", changedAt: clock.at(clock.ago(spec.leftDaysAgo! - 1), "16:00") },
        ],
      } : {}),
    } satisfies OrgMember;
  });

  const departed = SELLERS.find((spec) => spec.leftDaysAgo)!;
  const holderEndDate = clock.ago(departed.leftDaysAgo!);
  const seatVacancies: SeatVacancy[] = [{
    id: "vac-1", seatMemberId: departed.id, holderEndDate, startDate: vacancyStartDate(holderEndDate),
    filledOn: null, filledMethod: null, filledByMemberId: null, recordedBy: "dev-admin", recordedAt: clock.at(clock.addDays(holderEndDate, 1), "10:00"),
  }];

  return {
    members, accreditations, seatVacancies,
    registrationApplications: buildRegistrations(clock, members),
    accreditationSequence: SELLERS.length + 1,
    registrationSequence: 5,
  };
}

function applicantOf(first: string, middle: string | null, last: string, index: number, dateOfBirth: string): RegistrationApplicant {
  const address = addressAt(index + 120);
  return {
    firstName: first, middleName: middle ?? "", noMiddleName: middle === null, lastName: last, suffix: "",
    mobileNumber: mobileAt(index + 120), email: companyEmail(first, last).replace("@afhomes.com.ph", index % 2 ? "@gmail.com" : "@yahoo.com"),
    dateOfBirth, street: address.street, province: address.province, city: address.city, barangay: address.barangay, postalCode: address.postalCode,
  };
}

function buildRegistrations(clock: SeedClock, members: readonly OrgMember[]): RegistrationApplication[] {
  const sponsor = (id: string) => {
    const member = members.find((item) => item.id === id)!;
    return { sponsorMemberId: id, sponsorLabel: `${member.displayName} (${member.designation})` };
  };
  const approvedOn = clock.ago(95);
  const approvedSubmitted = clock.ago(102);
  const rowena = applicantOf("Rowena", "Yap", "Castillo", 1, "1994-03-09");
  const pending = applicantOf("Mylene", "Abrenica", "Soriano", 2, "1993-10-28");
  const returnedFirst = { ...applicantOf("Patrick", "Uy", "Lucero", 3, "1997-01-15"), barangay: "Banlic" };
  const returnedSubmitted = clock.ago(9);
  const returnedOn = clock.ago(6);
  const rejected = applicantOf("Harold", null, "Manuel", 4, "1989-06-30");
  const rejectedSubmitted = clock.ago(27);
  const rejectedOn = clock.ago(24);
  return [
    {
      id: "reg-1", classification: "OST", memberId: REGISTERED_OST_MEMBER_ID, accountId: null, ...sponsor("mem-sm-c"), status: "approved",
      createdAt: clock.at(approvedSubmitted, "19:42"), updatedAt: clock.at(approvedOn, "10:05"), submittedAt: clock.at(approvedSubmitted, "19:42"),
      decidedAt: clock.at(approvedOn, "10:05"), reviewerId: "dev-admin",
      history: [
        { operation: "submitted", previousStatus: null, newStatus: "submitted", actorId: "applicant", changedAt: clock.at(approvedSubmitted, "19:42"), note: null },
        { operation: "approved", previousStatus: "submitted", newStatus: "approved", actorId: "dev-admin", changedAt: clock.at(approvedOn, "10:05"), note: null },
      ],
      reference: "OSTA-48217305", applicant: rowena, version: 1,
      versions: [{ version: 1, submittedAt: clock.at(approvedSubmitted, "19:42"), applicant: rowena, returnReason: null }],
      completion: { gender: "Female", civilStatus: "Single", governmentIdType: "Postal ID", governmentIdNumber: governmentIdAt("Postal ID", 214),
        cardApplicationDate: approvedOn, programCategory: "non_vip_client", vipCardLevel: "B1", profilePhotoName: "rowena-castillo.jpg" },
      correctionToken: null, decisionReason: null,
    },
    {
      id: "reg-2", classification: "OST", memberId: null, accountId: null, ...sponsor("mem-sm-a"), status: "submitted",
      createdAt: clock.at(clock.ago(2), "21:10"), updatedAt: clock.at(clock.ago(2), "21:10"), submittedAt: clock.at(clock.ago(2), "21:10"),
      decidedAt: null, reviewerId: null,
      history: [{ operation: "submitted", previousStatus: null, newStatus: "submitted", actorId: "applicant", changedAt: clock.at(clock.ago(2), "21:10"), note: null }],
      reference: "OSTA-70594128", applicant: pending, version: 1,
      versions: [{ version: 1, submittedAt: clock.at(clock.ago(2), "21:10"), applicant: pending, returnReason: null }],
      completion: null, correctionToken: null, decisionReason: null,
    },
    {
      id: "reg-3", classification: "OST", memberId: null, accountId: null, ...sponsor("mem-ssm-b"), status: "needs_info",
      createdAt: clock.at(returnedSubmitted, "08:55"), updatedAt: clock.at(returnedOn, "15:30"), submittedAt: clock.at(returnedSubmitted, "08:55"),
      decidedAt: null, reviewerId: "dev-admin",
      history: [
        { operation: "submitted", previousStatus: null, newStatus: "submitted", actorId: "applicant", changedAt: clock.at(returnedSubmitted, "08:55"), note: null },
        { operation: "info_requested", previousStatus: "submitted", newStatus: "needs_info", actorId: "dev-admin", changedAt: clock.at(returnedOn, "15:30"), note: "The barangay does not match the city on the application. Please correct the residential address." },
      ],
      reference: "OSTA-31865047", applicant: returnedFirst, version: 1,
      versions: [{ version: 1, submittedAt: clock.at(returnedSubmitted, "08:55"), applicant: returnedFirst, returnReason: "The barangay does not match the city on the application. Please correct the residential address." }],
      completion: null, correctionToken: tokenAt(3, "registration-correction"),
      decisionReason: "The barangay does not match the city on the application. Please correct the residential address.",
    },
    {
      id: "reg-4", classification: "OST", memberId: null, accountId: null, ...sponsor("mem-svd-b"), status: "rejected",
      createdAt: clock.at(rejectedSubmitted, "13:20"), updatedAt: clock.at(rejectedOn, "11:45"), submittedAt: clock.at(rejectedSubmitted, "13:20"),
      decidedAt: clock.at(rejectedOn, "11:45"), reviewerId: "dev-admin",
      history: [
        { operation: "submitted", previousStatus: null, newStatus: "submitted", actorId: "applicant", changedAt: clock.at(rejectedSubmitted, "13:20"), note: null },
        { operation: "rejected", previousStatus: "submitted", newStatus: "rejected", actorId: "dev-admin", changedAt: clock.at(rejectedOn, "11:45"), note: "The applicant is already accredited under another team." },
      ],
      reference: "OSTA-92740316", applicant: rejected, version: 1,
      versions: [{ version: 1, submittedAt: clock.at(rejectedSubmitted, "13:20"), applicant: rejected, returnReason: null }],
      completion: null, correctionToken: null, decisionReason: "The applicant is already accredited under another team.",
    },
  ];
}

export function buildDepartments(): Department[] {
  return [
    { id: "dept-hr", name: "Human Resources", code: "HR", description: "Hiring, staff records, office accounts and employee relations.", headStaffId: null, status: "active" },
    { id: "dept-finance", name: "Finance", code: "FIN", description: "Receipt verification, collections, commission payouts and month-end close.", headStaffId: null, status: "active" },
    { id: "dept-ops", name: "Operations", code: "OPS", description: "Customer applications, contract paperwork, card release and front-desk records.", headStaffId: null, status: "active" },
    { id: "dept-admin", name: "Admin", code: "ADM", description: "Company administration, approvals and system access.", headStaffId: null, status: "active" },
    { id: "dept-sales", name: "Sales", code: "SLS", description: "Accredited sales network: Sales Vice Directors, Senior Sales Managers, Sales Managers and OSTs.", headStaffId: null, status: "active" },
  ];
}

export function buildRoles(): DepartmentRole[] {
  return [
    { id: "role-hr-staff", name: "HR Staff", departmentId: "dept-hr", moduleIds: ["dashboard", "departments", "staff"], status: "active", createdAt: "2026-01-01" },
    { id: "role-fin-staff", name: "Finance Staff", departmentId: "dept-finance", moduleIds: ["dashboard", "finance"], status: "active", createdAt: "2026-01-01" },
    { id: "role-ops-staff", name: "Operations Staff", departmentId: "dept-ops", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
    // Single Roles concept: one department Role per system account role, each
    // belonging to exactly one department. Module grants mirror the system
    // grants intersected with delegable modules; system-only privileges
    // (finance operations, protected super-admin rights, sales-network scope)
    // still come from the linked account's system role, never from these grants.
    // Stored "accounts" grants on these two roles are inert: accounts is not
    // delegable (S3-01), so effective access ignores it.
    { id: "role-super-admin", name: "Super Admin", departmentId: "dept-admin", moduleIds: ["dashboard", "departments", "roles", "staff", "accounts"], status: "active", createdAt: "2026-01-01", isProtected: true },
    { id: "role-admin", name: "Administrator", departmentId: "dept-admin", moduleIds: ["dashboard", "departments", "roles", "staff", "accounts"], status: "active", createdAt: "2026-01-01" },
    { id: "role-hr", name: "Human Resources", departmentId: "dept-hr", moduleIds: ["dashboard", "departments", "staff"], status: "active", createdAt: "2026-01-01" },
    { id: "role-finance", name: "Finance", departmentId: "dept-finance", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
    { id: "role-svd", name: "Sales Vice Director", departmentId: "dept-sales", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
    { id: "role-ssm", name: "Senior Sales Manager", departmentId: "dept-sales", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
    { id: "role-sm", name: "Sales Manager", departmentId: "dept-sales", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
    { id: "role-ost", name: "OST", departmentId: "dept-sales", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
  ];
}

/** Office staff. Names are invented; emails use the company domain for display only. */
export const STAFF_PEOPLE = {
  hr: { firstName: "Carmela", lastName: "Rivera" },
  finance: { firstName: "Rosalinda", lastName: "Tan" },
  financeAnalyst: { firstName: "Jonathan", lastName: "Villamor" },
  operations: { firstName: "Gilbert", lastName: "Mercado" },
  admin: { firstName: "Eduardo", lastName: "Ocampo" },
  superAdmin: { firstName: "Victoria", lastName: "Salazar" },
  records: { firstName: "Lorna", lastName: "Pineda" },
  clerk: { firstName: "Marites", lastName: "Gonzales" },
  pending: { firstName: "Nerissa", lastName: "Aguilar" },
} as const;

const fullName = (person: { firstName: string; lastName: string }) => `${person.firstName} ${person.lastName}`;
const emailOf = (person: { firstName: string; lastName: string }) => companyEmail(person.firstName, person.lastName);

export function buildAccounts(): Account[] {
  const p = STAFF_PEOPLE;
  return [
    { id: "acct-super-admin", displayName: fullName(p.superAdmin), email: emailOf(p.superAdmin), roleIds: ["super_admin"], status: "active", departmentId: null, createdAt: "2026-01-01" },
    { id: "acct-admin", displayName: fullName(p.admin), email: emailOf(p.admin), roleIds: ["admin"], status: "active", departmentId: null, createdAt: "2026-01-02" },
    { id: "acct-hr", displayName: fullName(p.hr), email: emailOf(p.hr), roleIds: ["hr"], status: "active", departmentId: null, createdAt: "2026-01-03" },
    { id: "acct-finance", displayName: fullName(p.finance), email: emailOf(p.finance), roleIds: ["finance"], status: "active", departmentId: null, createdAt: "2026-01-04" },
    { id: "acct-clerk", displayName: fullName(p.clerk), email: emailOf(p.clerk), roleIds: ["clerk"], status: "active", departmentId: "dept-ops", createdAt: "2026-01-07" },
    { id: "acct-pending", displayName: fullName(p.pending), email: emailOf(p.pending), roleIds: [], status: "pending", departmentId: null, createdAt: "2026-01-05" },
    // Suspended office staff login: lets HR exercise reactivation (owner ruling 2026-11-12, A4).
    { id: "acct-records", displayName: fullName(p.records), email: emailOf(p.records), roleIds: [], status: "suspended", departmentId: null, createdAt: "2026-01-06" },
  ];
}

export function buildStaff(): StaffMember[] {
  const p = STAFF_PEOPLE;
  return [
    { id: "staff-1", displayName: fullName(p.hr), position: "HR Specialist", departmentId: "dept-hr", departmentRoleId: "role-hr-staff", status: "active", email: emailOf(p.hr), createdAt: "2026-01-01", avatarUrl: null, accountId: "acct-hr" },
    { id: "staff-2", displayName: fullName(p.financeAnalyst), position: "Finance Analyst", departmentId: "dept-finance", departmentRoleId: "role-fin-staff", status: "active", email: emailOf(p.financeAnalyst), createdAt: "2026-01-02", avatarUrl: null, accountId: null },
    { id: "staff-3", displayName: fullName(p.operations), position: "Operations Coordinator", departmentId: "dept-ops", departmentRoleId: "role-ops-staff", status: "active", email: emailOf(p.operations), createdAt: "2026-01-03", avatarUrl: null, accountId: null },
    // Linked admin profiles for the My Account page. The department Role grants
    // stay within existing delegable modules; system privileges come from the account role.
    { id: "staff-admin", displayName: fullName(p.admin), position: "Administrator", departmentId: "dept-hr", departmentRoleId: "role-hr-staff", status: "active", email: emailOf(p.admin), createdAt: "2026-01-04", avatarUrl: null, accountId: "acct-admin" },
    { id: "staff-super", displayName: fullName(p.superAdmin), position: "Super Administrator", departmentId: "dept-hr", departmentRoleId: "role-hr-staff", status: "active", email: emailOf(p.superAdmin), createdAt: "2026-01-04", avatarUrl: null, accountId: "acct-super-admin" },
    { id: "staff-records", displayName: fullName(p.records), position: "Records Clerk", departmentId: "dept-ops", departmentRoleId: "role-ops-staff", status: "active", email: emailOf(p.records), createdAt: "2026-01-06", avatarUrl: null, accountId: "acct-records" },
    { id: "staff-clerk", displayName: fullName(p.clerk), position: "Office Clerk", departmentId: "dept-ops", departmentRoleId: "role-ops-staff", status: "active", email: emailOf(p.clerk), createdAt: "2026-01-07", avatarUrl: null, accountId: "acct-clerk" },
  ];
}
