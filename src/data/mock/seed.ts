import type { Customer } from "@/modules/customers/types";
import type { OrgMember, Department, DepartmentRole, StaffMember } from "@/modules/organization/types";
import type { AccreditationRecord, RegistrationApplication } from "@/modules/accreditation/types";
import type { VipProduct } from "@/modules/vip/types";
import type { Account } from "@/modules/accounts/types";
import type { AuditEvent } from "@/modules/audit/types";
import { addOneYear, formatManilaDateParts, parseManilaDateOnly } from "@/modules/accreditation/dates";
import { buildAaNumber } from "@/modules/accreditation/issuance";

export type MockStore = {
  members: OrgMember[];
  accreditations: AccreditationRecord[];
  registrationApplications: RegistrationApplication[];
  customers: Customer[];
  products: VipProduct[];
  accounts: Account[];
  departments: Department[];
  roles: DepartmentRole[];
  staff: StaffMember[];
  /** Append-only audit history; subject to the mock-store reset lifecycle. */
  auditEvents: AuditEvent[];
  customerSequence: number;
  accountSequence: number;
  departmentSequence: number;
  roleSequence: number;
  staffSequence: number;
  memberSequence: number;
  accreditationSequence: number;
  registrationSequence: number;
  auditSequence: number;
};

// Synthetic demonstration fixtures (owner-authorized). Original date 2026-10-28
// applies to these fixtures only; expiry follows the canonical annual rule.
// No audit events are fabricated. Contact and address details below are
// invented mock data, not real personal information.
const SAMPLE_ORIGINAL_DATE = "2026-10-28";

function sampleExpiry(): string {
  const parts = parseManilaDateOnly(SAMPLE_ORIGINAL_DATE);
  return parts ? formatManilaDateParts(addOneYear(parts)) : "2027-10-28";
}

const SAMPLE_YYMM = "2610";

const members: OrgMember[] = [
  {
    id: "mem-svd-a", displayName: "Ramon Del Rosario", designation: "SVD", branchId: "branch-a", parentId: null, status: "active", accountId: null,
    teamName: "Team Alab", aaNumber: "AAI26100001", mockAccreditationEligible: true,
    sellerProfile: {
      firstName: "Ramon", middleName: "Cruz", lastName: "Del Rosario", suffix: null,
      mobileNumber: "09171234567", dateOfBirth: "1975-03-14", email: "ramon.delrosario@afhomes.local",
      profilePhotoName: "ramon-del-rosario.jpg",
      profilePhotoUrl: "https://randomuser.me/api/portraits/men/32.jpg",
      address: { street: "123 Maharlika Street", province: "Metro Manila", city: "Makati City", barangay: "San Antonio", subdivision: "Bel-Air Village", postalCode: "1203" },
      governmentIdType: "Philippine National ID", governmentIdNumber: "PHL-1942-0001234",
      cardApplicationDate: "2026-09-15", programCategory: "vip_privilege_card_holder", vipCardLevel: "G1",
      gender: "Male", civilStatus: "Married",
      telephone: "02-8812-3456", facebook: "Ramon Del Rosario", tin: "123-456-789-000",
      businessEmployer: "Del Rosario Realty", businessAddress: "456 Ayala Avenue, Makati City", jobPosition: "Broker",
      sellerSource: "manual-admin", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, expiryDate: sampleExpiry(),
    },
  },
  {
    id: "mem-ssm-a", displayName: "Maria Santos", designation: "SSM", branchId: "branch-a", parentId: "mem-svd-a", status: "active", accountId: null,
    aaNumber: "AAI26100002", mockAccreditationEligible: true,
    sellerProfile: {
      firstName: "Maria", middleName: "Reyes", lastName: "Santos", suffix: null,
      mobileNumber: "09181234567", dateOfBirth: "1982-07-22", email: "maria.santos@afhomes.local",
      profilePhotoName: "maria-santos.jpg",
      profilePhotoUrl: "https://randomuser.me/api/portraits/women/44.jpg",
      address: { street: "45 Mabini Street", province: "Negros Oriental", city: "Dumaguete City", barangay: "Poblacion", subdivision: null, postalCode: "6200" },
      governmentIdType: "Driver's License", governmentIdNumber: "N02-11-003456",
      cardApplicationDate: "2026-09-18", programCategory: "non_vip_client", vipCardLevel: "S1",
      gender: "Female", civilStatus: "Single",
      telephone: null, facebook: null, tin: null,
      businessEmployer: null, businessAddress: null, jobPosition: null,
      sellerSource: "manual-admin", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, expiryDate: sampleExpiry(),
    },
  },
  {
    id: "mem-sm-a", displayName: "Jose Reyes Jr.", designation: "SM", branchId: "branch-a", parentId: "mem-ssm-a", status: "active", accountId: null,
    aaNumber: "AAI26100003", mockAccreditationEligible: true,
    sellerProfile: {
      firstName: "Jose", middleName: null, lastName: "Reyes", suffix: "Jr.",
      mobileNumber: "09192345678", dateOfBirth: "1988-11-05", email: "jose.reyes@afhomes.local",
      profilePhotoName: "jose-reyes.jpg",
      profilePhotoUrl: "https://randomuser.me/api/portraits/men/45.jpg",
      address: { street: "78 Bonifacio Avenue", province: "Metro Manila", city: "Marikina City", barangay: "Barangka", subdivision: "Provident Village", postalCode: "1800" },
      governmentIdType: "Passport", governmentIdNumber: "P1234567A",
      cardApplicationDate: "2026-09-20", programCategory: "future_vip_privilege_card_holder", vipCardLevel: "B1",
      gender: "Male", civilStatus: "Married",
      telephone: null, facebook: "Jose Reyes", tin: null,
      businessEmployer: null, businessAddress: null, jobPosition: null,
      sellerSource: "manual-admin", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, expiryDate: sampleExpiry(),
    },
  },
  {
    id: "mem-ost-a1", displayName: "Ana Mendoza", designation: "OST", branchId: "branch-a", parentId: "mem-sm-a", status: "active", accountId: null,
    aaNumber: "AAO26100004", mockAccreditationEligible: false,
    sellerProfile: {
      firstName: "Ana", middleName: "Torres", lastName: "Mendoza", suffix: null,
      mobileNumber: "09203456789", dateOfBirth: "1992-01-30", email: "ana.mendoza@afhomes.local",
      profilePhotoName: "ana-mendoza.jpg",
      profilePhotoUrl: "https://randomuser.me/api/portraits/women/68.jpg",
      address: { street: "12 Rizal Street", province: "South Cotabato", city: "General Santos City", barangay: "Calumpang", postalCode: "9500" },
      governmentIdType: "SSS ID", governmentIdNumber: "04-1234567-8",
      cardApplicationDate: "2026-09-25", programCategory: "vip_privilege_card_holder", vipCardLevel: "S1",
      gender: "Female", civilStatus: "Married",
      telephone: null, facebook: null, tin: null,
      businessEmployer: "Mendoza Sari-Sari Store", businessAddress: "12 Rizal Street, General Santos City", jobPosition: "Store Owner",
      sellerSource: "manual-admin", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, expiryDate: sampleExpiry(),
    },
  },
  {
    id: "mem-ost-a2", displayName: "Mark Villanueva", designation: "OST", branchId: "branch-a", parentId: "mem-svd-a", status: "active", accountId: null,
    aaNumber: "AAO26100005", mockAccreditationEligible: false,
    sellerProfile: {
      firstName: "Mark", middleName: null, lastName: "Villanueva", suffix: null,
      mobileNumber: "09214567890", dateOfBirth: "1995-06-12", email: "mark.villanueva@afhomes.local",
      profilePhotoName: "mark-villanueva.jpg",
      profilePhotoUrl: "https://randomuser.me/api/portraits/men/22.jpg",
      address: { street: "90 Lapu-Lapu Street", province: "Cebu", city: "Lapu-Lapu City", barangay: "Pajo", postalCode: "6015" },
      governmentIdType: "Postal ID", governmentIdNumber: "PHL-9988776",
      cardApplicationDate: "2026-09-27", programCategory: "non_vip_client", vipCardLevel: "B1",
      gender: "Male", civilStatus: "Single",
      telephone: null, facebook: null, tin: "987-654-321-000",
      businessEmployer: null, businessAddress: null, jobPosition: null,
      sellerSource: "manual-admin", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, expiryDate: sampleExpiry(),
    },
  },
  {
    id: "mem-svd-b", displayName: "Liza Aquino", designation: "SVD", branchId: "branch-b", parentId: null, status: "active", accountId: null,
    teamName: "Team Sinag", aaNumber: "AAI26100006", mockAccreditationEligible: true,
    sellerProfile: {
      firstName: "Liza", middleName: "Bautista", lastName: "Aquino", suffix: null,
      mobileNumber: "09225678901", dateOfBirth: "1978-09-08", email: "liza.aquino@afhomes.local",
      profilePhotoName: "liza-aquino.jpg",
      profilePhotoUrl: "https://randomuser.me/api/portraits/women/26.jpg",
      address: { street: "34 Aguinaldo Highway", province: "Cavite", city: "Bacoor City", barangay: "Aniban", postalCode: "4102" },
      governmentIdType: "PRC ID", governmentIdNumber: "0012345",
      cardApplicationDate: "2026-09-16", programCategory: "vip_privilege_card_holder", vipCardLevel: "G1",
      gender: "Female", civilStatus: "Widowed",
      telephone: "046-489-0123", facebook: null, tin: null,
      businessEmployer: "Aquino Travel & Tours", businessAddress: "34 Aguinaldo Highway, Bacoor City", jobPosition: "Owner",
      sellerSource: "manual-admin", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, expiryDate: sampleExpiry(),
    },
  },
  {
    id: "mem-ost-b1", displayName: "Paolo Ramos", designation: "OST", branchId: "branch-b", parentId: "mem-svd-b", status: "active", accountId: null,
    aaNumber: "AAO26100007", mockAccreditationEligible: false,
    sellerProfile: {
      firstName: "Paolo", middleName: "Garcia", lastName: "Ramos", suffix: null,
      mobileNumber: "09236789012", dateOfBirth: "1990-12-19", email: "paolo.ramos@afhomes.local",
      profilePhotoName: "paolo-ramos.jpg",
      profilePhotoUrl: "https://randomuser.me/api/portraits/men/77.jpg",
      address: { street: "56 Del Pilar Street", province: "Batangas", city: "Batangas City", barangay: "Cuta", postalCode: "4200" },
      governmentIdType: "Voter's ID", governmentIdNumber: "VTN-4455667",
      cardApplicationDate: "2026-09-28", programCategory: "future_vip_privilege_card_holder", vipCardLevel: "B1",
      gender: "Male", civilStatus: "Separated",
      telephone: null, facebook: "Paolo Ramos", tin: null,
      businessEmployer: null, businessAddress: null, jobPosition: null,
      sellerSource: "manual-admin", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, expiryDate: sampleExpiry(),
    },
  },
];

const accreditations: AccreditationRecord[] = [
  { id: "accr-seed-1", memberId: "mem-svd-a", classification: "IST", adminStatus: "pending", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, effectiveDate: SAMPLE_ORIGINAL_DATE, expiryDate: sampleExpiry(), aaNumber: buildAaNumber("AAI", SAMPLE_YYMM, 1), history: [] },
  { id: "accr-seed-2", memberId: "mem-ssm-a", classification: "IST", adminStatus: "pending", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, effectiveDate: SAMPLE_ORIGINAL_DATE, expiryDate: sampleExpiry(), aaNumber: buildAaNumber("AAI", SAMPLE_YYMM, 2), history: [] },
  { id: "accr-seed-3", memberId: "mem-sm-a", classification: "IST", adminStatus: "pending", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, effectiveDate: SAMPLE_ORIGINAL_DATE, expiryDate: sampleExpiry(), aaNumber: buildAaNumber("AAI", SAMPLE_YYMM, 3), history: [] },
  { id: "accr-seed-4", memberId: "mem-ost-a1", classification: "OST", adminStatus: "pending", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, effectiveDate: SAMPLE_ORIGINAL_DATE, expiryDate: sampleExpiry(), aaNumber: buildAaNumber("AAO", SAMPLE_YYMM, 4), history: [] },
  { id: "accr-seed-5", memberId: "mem-ost-a2", classification: "OST", adminStatus: "pending", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, effectiveDate: SAMPLE_ORIGINAL_DATE, expiryDate: sampleExpiry(), aaNumber: buildAaNumber("AAO", SAMPLE_YYMM, 5), history: [] },
  { id: "accr-seed-6", memberId: "mem-svd-b", classification: "IST", adminStatus: "pending", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, effectiveDate: SAMPLE_ORIGINAL_DATE, expiryDate: sampleExpiry(), aaNumber: buildAaNumber("AAI", SAMPLE_YYMM, 6), history: [] },
  { id: "accr-seed-7", memberId: "mem-ost-b1", classification: "OST", adminStatus: "pending", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, effectiveDate: SAMPLE_ORIGINAL_DATE, expiryDate: sampleExpiry(), aaNumber: buildAaNumber("AAO", SAMPLE_YYMM, 7), history: [] },
];

const customers: Customer[] = [
  { id: "cust-a1", displayName: "Customer A One", branchId: "branch-a", ownerMemberId: "mem-ost-a1", status: "submitted" },
  { id: "cust-a2", displayName: "Customer A Two", branchId: "branch-a", ownerMemberId: "mem-sm-a", status: "draft" },
  { id: "cust-b1", displayName: "Customer B One", branchId: "branch-b", ownerMemberId: "mem-ost-b1", status: "submitted" },
];

const products: VipProduct[] = [
  { code: "B1", name: "Bronze VIP", tier: "Bronze" },
  { code: "S1", name: "Silver VIP", tier: "Silver" },
  { code: "G1", name: "Gold VIP", tier: "Gold" },
];

const accounts: Account[] = [
  { id: "acct-super-admin", displayName: "Super Admin", email: "superadmin@afhomes.local", roleIds: ["super_admin"], status: "active", departmentId: null, createdAt: "2026-01-01" },
  { id: "acct-admin", displayName: "Administrator", email: "admin@afhomes.local", roleIds: ["admin"], status: "active", departmentId: null, createdAt: "2026-01-02" },
  { id: "acct-hr", displayName: "HR User", email: "hr@afhomes.local", roleIds: ["hr"], status: "active", departmentId: null, createdAt: "2026-01-03" },
  { id: "acct-finance", displayName: "Finance User", email: "finance@afhomes.local", roleIds: ["finance"], status: "active", departmentId: null, createdAt: "2026-01-04" },
  { id: "acct-pending", displayName: "Pending User", email: "pending@afhomes.local", roleIds: [], status: "pending", departmentId: null, createdAt: "2026-01-05" },
];

const departments: Department[] = [
  { id: "dept-hr", name: "Human Resources", code: "HR", description: "Human Resources department", headStaffId: null, status: "active" },
  { id: "dept-finance", name: "Finance", code: "FIN", description: "Finance department", headStaffId: null, status: "active" },
  { id: "dept-ops", name: "Operations", code: "OPS", description: "Operations department", headStaffId: null, status: "active" },
  { id: "dept-admin", name: "Admin", code: "ADM", description: "Administration department", headStaffId: null, status: "active" },
  { id: "dept-sales", name: "Sales", code: "SLS", description: "Sales department", headStaffId: null, status: "active" },
];

const roles: DepartmentRole[] = [
  { id: "role-hr-staff", name: "HR Staff", departmentId: "dept-hr", moduleIds: ["dashboard", "departments", "staff"], status: "active", createdAt: "2026-01-01" },
  { id: "role-fin-staff", name: "Finance Staff", departmentId: "dept-finance", moduleIds: ["dashboard", "finance"], status: "active", createdAt: "2026-01-01" },
  { id: "role-ops-staff", name: "Operations Staff", departmentId: "dept-ops", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
  // Single Roles concept: one department Role per system account role, each
  // belonging to exactly one department. Module grants mirror the system
  // grants intersected with delegable modules; system-only privileges
  // (finance operations, protected super-admin rights, sales-network scope)
  // still come from the linked account's system role, never from these grants.
  { id: "role-super-admin", name: "Super Admin", departmentId: "dept-admin", moduleIds: ["dashboard", "departments", "roles", "staff", "accounts"], status: "active", createdAt: "2026-01-01" },
  { id: "role-admin", name: "Administrator", departmentId: "dept-admin", moduleIds: ["dashboard", "departments", "roles", "staff", "accounts"], status: "active", createdAt: "2026-01-01" },
  { id: "role-hr", name: "Human Resources", departmentId: "dept-hr", moduleIds: ["dashboard", "departments", "staff"], status: "active", createdAt: "2026-01-01" },
  { id: "role-finance", name: "Finance", departmentId: "dept-finance", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
  { id: "role-svd", name: "Sales Vice Director", departmentId: "dept-sales", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
  { id: "role-ssm", name: "Senior Sales Manager", departmentId: "dept-sales", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
  { id: "role-sm", name: "Sales Manager", departmentId: "dept-sales", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
  { id: "role-ost", name: "OST", departmentId: "dept-sales", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01" },
];

const staff: StaffMember[] = [
  { id: "staff-1", displayName: "HR Staff", position: "HR Specialist", departmentId: "dept-hr", departmentRoleId: "role-hr-staff", status: "active", email: "hrstaff@afhomes.local", createdAt: "2026-01-01", avatarUrl: null, accountId: "acct-hr" },
  { id: "staff-2", displayName: "Finance Staff", position: "Finance Analyst", departmentId: "dept-finance", departmentRoleId: "role-fin-staff", status: "active", email: "finstaff@afhomes.local", createdAt: "2026-01-02", avatarUrl: null, accountId: null },
  { id: "staff-3", displayName: "Operations Staff", position: "Operations Coordinator", departmentId: "dept-ops", departmentRoleId: "role-ops-staff", status: "active", email: "opsstaff@afhomes.local", createdAt: "2026-01-03", avatarUrl: null, accountId: null },
  // Linked admin profiles for the My Account page. Position mirrors the role
  // name per the single Roles concept; grants stay within existing delegable modules.
  { id: "staff-admin", displayName: "Admin User", position: "HR Staff", departmentId: "dept-hr", departmentRoleId: "role-hr-staff", status: "active", email: "admin@afhomes.local", createdAt: "2026-01-04", avatarUrl: null, accountId: "acct-admin" },
  { id: "staff-super", displayName: "Super Admin User", position: "HR Staff", departmentId: "dept-hr", departmentRoleId: "role-hr-staff", status: "active", email: "superadmin@afhomes.local", createdAt: "2026-01-04", avatarUrl: null, accountId: "acct-super-admin" },
];

export function createSeedStore(): MockStore {
  return {
    members: members.map((item) => ({ ...item })),
    accreditations: accreditations.map((item) => ({ ...item, history: item.history.map((entry) => ({ ...entry })) })),
    registrationApplications: [],
    customers: customers.map((item) => ({ ...item })),
    products: products.map((item) => ({ ...item })),
    accounts: accounts.map((item) => ({ ...item, roleIds: [...item.roleIds] })),
    departments: departments.map((item) => ({ ...item })),
    roles: roles.map((item) => ({ ...item, moduleIds: [...item.moduleIds] })),
    staff: staff.map((item) => ({ ...item })),
    auditEvents: [],
    customerSequence: customers.length + 1,
    accountSequence: accounts.length + 1,
    departmentSequence: departments.length + 1,
    roleSequence: roles.length + 1,
    staffSequence: staff.length + 1,
    memberSequence: members.length + 1,
    // Shared AA sequence resumes after the seven seeded reservations (1-7).
    accreditationSequence: 8,
    registrationSequence: 1,
    auditSequence: 1,
  };
}

function cloneMember(item: OrgMember): OrgMember {
  return {
    ...item,
    parentHistory: item.parentHistory?.map((entry) => ({ ...entry })),
    sellerProfile: item.sellerProfile
      ? { ...item.sellerProfile, address: { ...item.sellerProfile.address } }
      : item.sellerProfile,
  };
}

export function createMockStore(seed: MockStore = createSeedStore()): MockStore {
  return {
    members: seed.members.map(cloneMember),
    accreditations: seed.accreditations.map((item) => ({ ...item, history: item.history.map((entry) => ({ ...entry })) })),
    registrationApplications: seed.registrationApplications.map((item) => ({ ...item, history: item.history.map((entry) => ({ ...entry })) })),
    customers: seed.customers.map((item) => ({ ...item })),
    products: seed.products.map((item) => ({ ...item })),
    accounts: seed.accounts.map((item) => ({ ...item, roleIds: [...item.roleIds] })),
    departments: seed.departments.map((item) => ({ ...item })),
    roles: seed.roles.map((item) => ({ ...item, moduleIds: [...item.moduleIds] })),
    staff: seed.staff.map((item) => ({ ...item })),
    auditEvents: seed.auditEvents.map((item) => ({ ...item, relatedRecordIds: item.relatedRecordIds ? [...item.relatedRecordIds] : undefined })),
    customerSequence: seed.customerSequence,
    accountSequence: seed.accountSequence,
    departmentSequence: seed.departmentSequence,
    roleSequence: seed.roleSequence,
    staffSequence: seed.staffSequence,
    memberSequence: seed.memberSequence,
    accreditationSequence: seed.accreditationSequence,
    registrationSequence: seed.registrationSequence,
    auditSequence: seed.auditSequence,
  };
}
