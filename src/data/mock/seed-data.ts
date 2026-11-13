import type { Customer } from "@/modules/customers/types";
import type { CustomerImportJob } from "@/modules/customers/import";
import type { AuditEvent } from "@/modules/audit/types";
import type { OrgMember, Department, DepartmentRole, StaffMember } from "@/modules/organization/types";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import type { VipProduct, PaymentScheme, VipTierCode } from "@/modules/vip/types";
import type { Account } from "@/modules/accounts/types";
import { buildSchedule } from "@/modules/contracts/rules";
import type { Contract, ScheduleItem } from "@/modules/contracts/types";
import type { Sale } from "@/modules/sales/types";
import type { Payment, PaymentPurpose } from "@/modules/finance/types";
import type { Membership } from "@/modules/membership/types";
import type { Commission } from "@/modules/commissions/types";
import type { ResortSpend } from "@/modules/stay-points/types";

/**
 * AFHomes Platform — centralized synthetic seed data (frontend mock phase).
 *
 * Authoritative source of every seeded record. All data here is invented,
 * relationally consistent demonstration data; contact and address details are
 * not real personal information. Nothing in this file is a database, is
 * persisted, or is read by server code: the application deep-clones it into a
 * browser-memory store (seed.ts) that resets on every refresh.
 *
 * Original date 2026-10-28 applies to the sales-network fixtures only; expiry
 * follows the canonical annual rule (one year, Asia/Manila date-only).
 */

const SAMPLE_ORIGINAL_DATE = "2026-10-28";
const SAMPLE_EXPIRY = "2027-10-28";
const SAMPLE_YYMM = "2610";

/** AA number: prefix + YYMM + shared sequence padded to four digits. */
function aaNumber(prefix: string, sequence: number) {
  return prefix + SAMPLE_YYMM + String(sequence).padStart(4, "0");
}

const members: OrgMember[] = [
  {
    id: "mem-svd-a", displayName: "Ramon Del Rosario", designation: "SVD", branchId: "branch-a", parentId: null, status: "active", accountId: null,
    teamName: "Team Alab", aaNumber: "AAI26100001", mockAccreditationEligible: true,
    sellerProfile: {
      firstName: "Ramon", middleName: "Cruz", lastName: "Del Rosario", suffix: null,
      mobileNumber: "09171234567", dateOfBirth: "1975-03-14", email: "ramon.delrosario@afhomes.local",
      profilePhotoName: "ramon-del-rosario.jpg",
      profilePhotoUrl: "https://randomuser.me/api/portraits/men/32.jpg",
      address: { street: "123 Maharlika Street", province: "Metro Manila", city: "Makati City", barangay: "San Antonio", postalCode: "1203" },
      governmentIdType: "Philippine National ID", governmentIdNumber: "PHL-1942-0001234",
      cardApplicationDate: "2026-09-15", programCategory: "vip_privilege_card_holder", vipCardLevel: "G1",
      gender: "Male", civilStatus: "Married",
      telephone: "02-8812-3456", facebook: "Ramon Del Rosario", tin: "123-456-789-000",
      businessEmployer: "Del Rosario Realty", businessAddress: "456 Ayala Avenue, Makati City", jobPosition: "Broker",
      sellerSource: "manual-admin", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, expiryDate: SAMPLE_EXPIRY,
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
      address: { street: "45 Mabini Street", province: "Negros Oriental", city: "Dumaguete City", barangay: "Poblacion", postalCode: "6200" },
      governmentIdType: "Driver's License", governmentIdNumber: "N02-11-003456",
      cardApplicationDate: "2026-09-18", programCategory: "non_vip_client", vipCardLevel: "S1",
      gender: "Female", civilStatus: "Single",
      telephone: null, facebook: null, tin: null,
      businessEmployer: null, businessAddress: null, jobPosition: null,
      sellerSource: "manual-admin", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, expiryDate: SAMPLE_EXPIRY,
    },
  },
  {
    id: "mem-sm-a", displayName: "Jose Reyes Jr.", designation: "SM", branchId: "branch-a", parentId: "mem-ssm-a", status: "active", accountId: null,
    referralCode: "REF-SMALPHA",
    aaNumber: "AAI26100003", mockAccreditationEligible: true,
    sellerProfile: {
      firstName: "Jose", middleName: null, lastName: "Reyes", suffix: "Jr.",
      mobileNumber: "09192345678", dateOfBirth: "1988-11-05", email: "jose.reyes@afhomes.local",
      profilePhotoName: "jose-reyes.jpg",
      profilePhotoUrl: "https://randomuser.me/api/portraits/men/45.jpg",
      address: { street: "78 Bonifacio Avenue", province: "Metro Manila", city: "Marikina City", barangay: "Barangka", postalCode: "1800" },
      governmentIdType: "Passport", governmentIdNumber: "P1234567A",
      cardApplicationDate: "2026-09-20", programCategory: "future_vip_privilege_card_holder", vipCardLevel: "B1",
      gender: "Male", civilStatus: "Married",
      telephone: null, facebook: "Jose Reyes", tin: null,
      businessEmployer: null, businessAddress: null, jobPosition: null,
      sellerSource: "manual-admin", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, expiryDate: SAMPLE_EXPIRY,
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
      sellerSource: "manual-admin", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, expiryDate: SAMPLE_EXPIRY,
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
      sellerSource: "manual-admin", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, expiryDate: SAMPLE_EXPIRY,
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
      sellerSource: "manual-admin", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, expiryDate: SAMPLE_EXPIRY,
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
      sellerSource: "manual-admin", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, expiryDate: SAMPLE_EXPIRY,
    },
  },
];

const accreditations: AccreditationRecord[] = [
  { id: "accr-seed-1", memberId: "mem-svd-a", classification: "IST", adminStatus: "pending", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, effectiveDate: SAMPLE_ORIGINAL_DATE, expiryDate: SAMPLE_EXPIRY, aaNumber: aaNumber("AAI", 1), history: [] },
  { id: "accr-seed-2", memberId: "mem-ssm-a", classification: "IST", adminStatus: "pending", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, effectiveDate: SAMPLE_ORIGINAL_DATE, expiryDate: SAMPLE_EXPIRY, aaNumber: aaNumber("AAI", 2), history: [] },
  { id: "accr-seed-3", memberId: "mem-sm-a", classification: "IST", adminStatus: "pending", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, effectiveDate: SAMPLE_ORIGINAL_DATE, expiryDate: SAMPLE_EXPIRY, aaNumber: aaNumber("AAI", 3), history: [] },
  { id: "accr-seed-4", memberId: "mem-ost-a1", classification: "OST", adminStatus: "active", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, effectiveDate: SAMPLE_ORIGINAL_DATE, expiryDate: SAMPLE_EXPIRY, aaNumber: aaNumber("AAO", 4), history: [] },
  { id: "accr-seed-5", memberId: "mem-ost-a2", classification: "OST", adminStatus: "active", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, effectiveDate: SAMPLE_ORIGINAL_DATE, expiryDate: SAMPLE_EXPIRY, aaNumber: aaNumber("AAO", 5), history: [] },
  { id: "accr-seed-6", memberId: "mem-svd-b", classification: "IST", adminStatus: "pending", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, effectiveDate: SAMPLE_ORIGINAL_DATE, expiryDate: SAMPLE_EXPIRY, aaNumber: aaNumber("AAI", 6), history: [] },
  { id: "accr-seed-7", memberId: "mem-ost-b1", classification: "OST", adminStatus: "active", originalAccreditationDate: SAMPLE_ORIGINAL_DATE, effectiveDate: SAMPLE_ORIGINAL_DATE, expiryDate: SAMPLE_EXPIRY, aaNumber: aaNumber("AAO", 7), history: [] },
];



const accounts: Account[] = [
  { id: "acct-super-admin", displayName: "Super Admin", email: "superadmin@afhomes.local", roleIds: ["super_admin"], status: "active", departmentId: null, createdAt: "2026-01-01" },
  { id: "acct-admin", displayName: "Administrator", email: "admin@afhomes.local", roleIds: ["admin"], status: "active", departmentId: null, createdAt: "2026-01-02" },
  { id: "acct-hr", displayName: "HR User", email: "hr@afhomes.local", roleIds: ["hr"], status: "active", departmentId: null, createdAt: "2026-01-03" },
  { id: "acct-finance", displayName: "Finance User", email: "finance@afhomes.local", roleIds: ["finance"], status: "active", departmentId: null, createdAt: "2026-01-04" },
  { id: "acct-clerk", displayName: "Office Clerk", email: "clerk@afhomes.local", roleIds: ["clerk"], status: "active", departmentId: "dept-ops", createdAt: "2026-01-07" },
  { id: "acct-pending", displayName: "Pending User", email: "pending@afhomes.local", roleIds: [], status: "pending", departmentId: null, createdAt: "2026-01-05" },
  // Suspended office staff login: lets HR exercise reactivation (owner ruling 2026-11-12, A4).
  { id: "acct-records", displayName: "Records Clerk", email: "records@afhomes.local", roleIds: [], status: "suspended", departmentId: null, createdAt: "2026-01-06" },
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

const staff: StaffMember[] = [
  { id: "staff-1", displayName: "HR Staff", position: "HR Specialist", departmentId: "dept-hr", departmentRoleId: "role-hr-staff", status: "active", email: "hrstaff@afhomes.local", createdAt: "2026-01-01", avatarUrl: null, accountId: "acct-hr" },
  { id: "staff-2", displayName: "Finance Staff", position: "Finance Analyst", departmentId: "dept-finance", departmentRoleId: "role-fin-staff", status: "active", email: "finstaff@afhomes.local", createdAt: "2026-01-02", avatarUrl: null, accountId: null },
  { id: "staff-3", displayName: "Operations Staff", position: "Operations Coordinator", departmentId: "dept-ops", departmentRoleId: "role-ops-staff", status: "active", email: "opsstaff@afhomes.local", createdAt: "2026-01-03", avatarUrl: null, accountId: null },
  // Linked admin profiles for the My Account page. Position mirrors the role
  // name per the single Roles concept; grants stay within existing delegable modules.
  { id: "staff-admin", displayName: "Admin User", position: "HR Staff", departmentId: "dept-hr", departmentRoleId: "role-hr-staff", status: "active", email: "admin@afhomes.local", createdAt: "2026-01-04", avatarUrl: null, accountId: "acct-admin" },
  { id: "staff-super", displayName: "Super Admin User", position: "HR Staff", departmentId: "dept-hr", departmentRoleId: "role-hr-staff", status: "active", email: "superadmin@afhomes.local", createdAt: "2026-01-04", avatarUrl: null, accountId: "acct-super-admin" },
  { id: "staff-records", displayName: "Records Clerk", position: "Operations Coordinator", departmentId: "dept-ops", departmentRoleId: "role-ops-staff", status: "active", email: "records@afhomes.local", createdAt: "2026-01-06", avatarUrl: null, accountId: "acct-records" },
  { id: "staff-clerk", displayName: "Office Clerk", position: "Clerk", departmentId: "dept-ops", departmentRoleId: "role-ops-staff", status: "active", email: "clerk@afhomes.local", createdAt: "2026-01-07", avatarUrl: null, accountId: "acct-clerk" },
];

// ---------------------------------------------------------------------------
// Business-module fixtures (customers, VIP catalog, contracts, sales, payments,
// memberships, resort spend). Money is integer centavos. Figures come only from
// the October/November 2026 standard contracts and business rules; nothing here
// is an approved price list. Gold price resolved by owner ruling 2026-11-10 (05 amendment item 11); Section IV ₱780,000 rejected.
// No commission, receipt number or Card ID is fabricated beyond the synthetic
// examples in doc 06 section 17.
// ---------------------------------------------------------------------------

const peso = (amount: number) => amount * 100;

const customers: Customer[] = [
  { id: "cust-a1", displayName: "Customer A One", branchId: "branch-a", ownerMemberId: "mem-ost-a1", status: "submitted",
    firstName: "Customer", lastName: "A One", gender: "Female", civilStatus: "Married", dateOfBirth: "1985-04-12",
    mobileNumber: "09171110001", email: "customer.a1@afhomes.local",
    address: { street: "10 Sampaguita Street", province: "Negros Oriental", city: "Dumaguete City", barangay: "Daro", postalCode: "6200" },
    vipPlan: "S1", paymentSchemeId: "scheme-installment-4m", contractClassification: "S", recommenderMemberId: "mem-ost-a1", acquisitionChannel: "Referral",
    consentDataPrivacy: true, idReceivedCertified: true, createdAt: "2026-09-28", submittedAt: "2026-09-29" },
  { id: "cust-a2", displayName: "Customer A Two", branchId: "branch-a", ownerMemberId: "mem-sm-a", status: "draft" },
  { id: "cust-b1", displayName: "Customer B One", branchId: "branch-b", ownerMemberId: "mem-ost-b1", status: "submitted",
    firstName: "Customer", lastName: "B One", gender: "Male", civilStatus: "Single", dateOfBirth: "1990-08-03",
    mobileNumber: "09171110002", email: "customer.b1@afhomes.local",
    address: { street: "5 Orchid Lane", province: "Batangas", city: "Batangas City", barangay: "Cuta", postalCode: "4200" },
    vipPlan: "B1", paymentSchemeId: "scheme-installment-4m", contractClassification: "S", recommenderMemberId: "mem-ost-b1", acquisitionChannel: "FB Ads",
    consentDataPrivacy: true, idReceivedCertified: true, createdAt: "2026-10-20", submittedAt: "2026-10-21" },
  { id: "cust-a3", displayName: "Elena Bautista", branchId: "branch-a", ownerMemberId: "mem-sm-a", status: "submitted",
    firstName: "Elena", middleName: "Cruz", lastName: "Bautista", gender: "Female", civilStatus: "Married", dateOfBirth: "1979-11-30",
    mobileNumber: "09171110003", email: "elena.bautista@afhomes.local",
    address: { street: "21 Narra Avenue", province: "Metro Manila", city: "Marikina City", barangay: "Concepcion Uno", postalCode: "1807" },
    vipPlan: "G1", paymentSchemeId: "scheme-installment-4m", contractClassification: "S", recommenderMemberId: "mem-ost-a1", acquisitionChannel: "CMP",
    consentDataPrivacy: true, idReceivedCertified: true, createdAt: "2026-11-02", submittedAt: "2026-11-03" },
  { id: "cust-a4", displayName: "Rafael Domingo", branchId: "branch-a", ownerMemberId: "mem-ost-a2", status: "submitted",
    firstName: "Rafael", lastName: "Domingo", gender: "Male", civilStatus: "Single", dateOfBirth: "1993-02-18",
    mobileNumber: "09171110004", email: "rafael.domingo@afhomes.local",
    address: { street: "8 Acacia Road", province: "Cebu", city: "Lapu-Lapu City", barangay: "Pajo", postalCode: "6015" },
    vipPlan: "B1", paymentSchemeId: "scheme-installment-4m", contractClassification: "S", recommenderMemberId: "mem-ost-a2", acquisitionChannel: "Walk-In",
    consentDataPrivacy: true, idReceivedCertified: true, createdAt: "2026-11-04", submittedAt: "2026-11-05" },
  // Registration review examples (doc 04 sections 5 and 10): a seller draft awaiting the Clerk, then an approved, a sent-back and a rejected record.
  { id: "cust-a5", displayName: "Lourdes Fabian", branchId: "branch-a", ownerMemberId: "mem-ost-a1", status: "draft",
    firstName: "Lourdes", lastName: "Fabian", mobileNumber: "09171110005", vipPlan: "S1", createdAt: "2026-11-10", submittedAt: null },
  { id: "cust-a6", displayName: "Noel Pascual", branchId: "branch-a", ownerMemberId: "mem-ost-a2", status: "approved",
    firstName: "Noel", lastName: "Pascual", gender: "Male", civilStatus: "Married", dateOfBirth: "1981-06-09",
    mobileNumber: "09171110006", email: "noel.pascual@afhomes.local",
    address: { street: "3 Molave Street", province: "Cebu", city: "Lapu-Lapu City", barangay: "Pajo", postalCode: "6015" },
    vipPlan: "B1", paymentSchemeId: "scheme-installment-4m", contractClassification: "S", acquisitionChannel: "CMP",
    consentDataPrivacy: true, idReceivedCertified: true, createdAt: "2026-10-12", submittedAt: "2026-10-13", approvedAt: "2026-10-15",
    statusHistory: [
      { status: "submitted", at: "2026-10-13T09:00:00+08:00", actorId: "dev-clerk" },
      { status: "approved", at: "2026-10-15T10:30:00+08:00", actorId: "dev-admin" },
    ] },
  { id: "cust-a7", displayName: "Gina Soriano", branchId: "branch-a", ownerMemberId: "mem-ost-a1", status: "sent_back",
    firstName: "Gina", lastName: "Soriano", gender: "Female", civilStatus: "Single", dateOfBirth: "1995-12-01",
    mobileNumber: "09171110007", vipPlan: "S1", paymentSchemeId: "scheme-installment-4m", contractClassification: "S",
    consentDataPrivacy: true, idReceivedCertified: true, createdAt: "2026-10-13", submittedAt: "2026-10-14",
    reviewReason: "Residential address is missing.",
    statusHistory: [
      { status: "submitted", at: "2026-10-14T09:15:00+08:00", actorId: "dev-clerk" },
      { status: "sent_back", at: "2026-10-16T14:00:00+08:00", actorId: "dev-admin", reason: "Residential address is missing." },
    ] },
  { id: "cust-a8", displayName: "Victor Alcantara", branchId: "branch-a", ownerMemberId: "mem-ost-a2", status: "rejected",
    firstName: "Victor", lastName: "Alcantara", gender: "Male", civilStatus: "Single", dateOfBirth: "1988-03-22",
    mobileNumber: "09171110008", vipPlan: "B1", paymentSchemeId: "scheme-installment-4m", contractClassification: "S",
    consentDataPrivacy: true, idReceivedCertified: true, createdAt: "2026-10-11", submittedAt: "2026-10-12",
    reviewReason: "Duplicate of an existing customer record.",
    statusHistory: [
      { status: "submitted", at: "2026-10-12T09:00:00+08:00", actorId: "dev-clerk" },
      { status: "rejected", at: "2026-10-14T11:00:00+08:00", actorId: "dev-admin", reason: "Duplicate of an existing customer record." },
    ] },
];

const products: VipProduct[] = [
  { code: "B1", name: "Bronze VIP", tier: "Bronze", priceCentavos: peso(72000), priceStatus: "contract_stated",
    priceNote: "Stated in the Bronze VIP Grant Contract, Standard Pricing (Section II and Annex A).",
    validityYears: 7, earningCycles: 5, vipDiscountPercent: 15, lifetimePoints: 50000, pointsPerCycle: 10000,
    weekdayPointsPerCycle: 7000, weekendPointsPerCycle: 3000, minSpendPerCycleCentavos: peso(1000), supplementaryHolders: 0,
    status: "active", configVersion: 1, effectiveDate: null, changes: [] },
  { code: "S1", name: "Silver VIP", tier: "Silver", priceCentavos: peso(240000), priceStatus: "contract_stated",
    priceNote: "Stated in Section II and Annex A. Section IV of the Silver contract still carries an unfinished amount placeholder (05 6.2).",
    validityYears: 12, earningCycles: 10, vipDiscountPercent: 20, lifetimePoints: 200000, pointsPerCycle: 20000,
    weekdayPointsPerCycle: 14000, weekendPointsPerCycle: 6000, minSpendPerCycleCentavos: peso(2000), supplementaryHolders: 0,
    status: "active", configVersion: 1, effectiveDate: null, changes: [] },
  { code: "G1", name: "Gold VIP", tier: "Gold", priceCentavos: peso(390000), priceStatus: "contract_stated",
    priceNote: "Gold VIP ₱390,000 confirmed by owner ruling effective 2026-11-10 (doc 05 amendment item 11). Section IV ₱780,000 rejected.",
    validityYears: 22, earningCycles: 20, vipDiscountPercent: 25, lifetimePoints: 500000, pointsPerCycle: 25000,
    weekdayPointsPerCycle: 17500, weekendPointsPerCycle: 7500, minSpendPerCycleCentavos: peso(3000), supplementaryHolders: 1,
    status: "active", configVersion: 1, effectiveDate: null, changes: [] },
];

const paymentSchemes: PaymentScheme[] = [
  { id: "scheme-spot-cash", label: "Spot Cash", historicalLabel: "Spot cash", category: "cash", paymentCode: "C01",
    applicableTiers: ["B1", "S1", "G1"], reservationCentavos: peso(10000), installmentCount: null, installmentCentavosByTier: {},
    priceCentavosByTier: { B1: peso(54000), S1: peso(192000), G1: peso(312000) },
    commercialStatus: "configured",
    source: "Full Payment contracts: Php 54,000 / 192,000 / 312,000, Php 10,000 reservation fee, balance within 7 days (OD-11 released by the owner on 2026-11-09). Card ID payment code in 06 section 6.3.",
    availability: "available", ownerHold: null, configVersion: 2, effectiveDate: "2026-11-09",
    changes: [{ version: 2, date: "2026-11-09", actorId: "owner", reason: "OD-11 released by the owner", summary: "priceCentavosByTier, reservationCentavos, availability" }] },
  { id: "scheme-installment-4m", label: "4-Month Installment", historicalLabel: "Installment 4_month", category: "installment", paymentCode: "T04",
    applicableTiers: ["B1", "S1", "G1"], reservationCentavos: peso(10000), installmentCount: 4,
    installmentCentavosByTier: { B1: peso(15500), S1: peso(57500), G1: peso(95000) }, priceCentavosByTier: {},
    commercialStatus: "configured",
    source: "Standard Pricing contracts: Php 10,000 non-refundable reservation fee plus four monthly installments at 0% interest (Annex A).",
    availability: "available", configVersion: 1, effectiveDate: null, changes: [] },
  // Move schemes are standard schemes with owner-ruled Card ID payment codes (06 section 6.3):
  // Move A uses T04 for all tiers; Move B uses per-tier T04/T08/T12. The special arrangement
  // is no longer created.
  { id: "scheme-move-a", label: "Move A", historicalLabel: "Move a", category: "move", paymentCode: "T04",
    applicableTiers: ["B1", "S1", "G1"], reservationCentavos: peso(10000), installmentCount: 4,
    installmentCentavosByTier: { B1: peso(11000), S1: peso(45500), G1: peso(75500) },
    priceCentavosByTier: { B1: peso(54000), S1: peso(192000), G1: peso(312000) },
    commercialStatus: "configured",
    source: "Group VIP IST Presentation slides 13 to 16: Spot Cash price paid as the reservation fee plus 4 monthly payments (Bronze per slide 15). Approved by the owner on 2026-11-09. Card ID payment code not authorized yet.",
    availability: "available", configVersion: 2, effectiveDate: "2026-11-09",
    changes: [{ version: 2, date: "2026-11-09", actorId: "owner", reason: "Move A approved by the owner", summary: "terms, availability" }] },
  { id: "scheme-move-b", label: "Move B", historicalLabel: null, category: "move", paymentCode: null, paymentCodeByTier: { B1: "T04", S1: "T08", G1: "T12" },
    applicableTiers: ["B1", "S1", "G1"], reservationCentavos: peso(10000), installmentCount: null, downPaymentBasisPoints: 4_000,
    installmentCountByTier: { B1: 4, S1: 8, G1: 12 },
    installmentCentavosByTier: { B1: peso(10800), S1: peso(18000), G1: peso(19500) }, priceCentavosByTier: {},
    commercialStatus: "configured",
    source: "Group VIP IST Presentation slide 14: installment price, 40% down payment including the reservation fee, then 4, 8 or 12 monthly payments. Approved by the owner on 2026-11-09; replaces the unsourced Move B1 and Move B2 entries. Card ID payment code not authorized yet.",
    availability: "available", configVersion: 1, effectiveDate: "2026-11-09",
    changes: [{ version: 1, date: "2026-11-09", actorId: "owner", reason: "Move B approved by the owner", summary: "created" }] },
];

const benefitsOf = (p: VipProduct) => ({
  vipDiscountPercent: p.vipDiscountPercent, earningCycles: p.earningCycles, lifetimePoints: p.lifetimePoints,
  pointsPerCycle: p.pointsPerCycle, weekdayPointsPerCycle: p.weekdayPointsPerCycle, weekendPointsPerCycle: p.weekendPointsPerCycle,
  minSpendPerCycleCentavos: p.minSpendPerCycleCentavos, supplementaryHolders: p.supplementaryHolders,
});
const byCode = (code: string) => products.find((p) => p.code === code)!;

const team = {
  "mem-ost-a1": [
    { memberId: "mem-ost-a1", displayName: "Ana Mendoza", designation: "OST" },
    { memberId: "mem-sm-a", displayName: "Jose Reyes Jr.", designation: "SM" },
    { memberId: "mem-ssm-a", displayName: "Maria Santos", designation: "SSM" },
    { memberId: "mem-svd-a", displayName: "Ramon Del Rosario", designation: "SVD" },
  ],
  "mem-sm-a": [
    { memberId: "mem-sm-a", displayName: "Jose Reyes Jr.", designation: "SM" },
    { memberId: "mem-ssm-a", displayName: "Maria Santos", designation: "SSM" },
    { memberId: "mem-svd-a", displayName: "Ramon Del Rosario", designation: "SVD" },
  ],
  "mem-ost-a2": [
    { memberId: "mem-ost-a2", displayName: "Mark Villanueva", designation: "OST" },
    { memberId: "mem-svd-a", displayName: "Ramon Del Rosario", designation: "SVD" },
  ],
  "mem-ost-b1": [
    { memberId: "mem-ost-b1", displayName: "Paolo Ramos", designation: "OST" },
    { memberId: "mem-svd-b", displayName: "Liza Aquino", designation: "SVD" },
  ],
};

/** 4-Month Installment schedule built by the same rule the app uses, with seed due dates applied by position. */
const installmentSchedule = (code: VipTierCode, dues: (string | null)[]): ScheduleItem[] =>
  buildSchedule(byCode(code), paymentSchemes.find((s) => s.id === "scheme-installment-4m")!).schedule.map((line, index) => ({ ...line, dueDate: dues[index] ?? null }));
const requiredInitialOf = (code: VipTierCode) => buildSchedule(byCode(code), paymentSchemes.find((s) => s.id === "scheme-installment-4m")!).requiredInitialCentavos;

const baseContract = (id: string, customerId: string, code: VipTierCode, schemeId: string, seller: keyof typeof team) => {
  const product = byCode(code);
  const scheme = paymentSchemes.find((s) => s.id === schemeId)!;
  return {
    id, customerId, productCode: code, productConfigVersion: product.configVersion, priceCentavos: buildSchedule(product, scheme).priceCentavos,
    priceStatus: scheme.priceCentavosByTier[code] != null ? "contract_stated" : product.priceStatus, schemeId, schemeLabel: scheme.label, schemeStatus: scheme.commercialStatus, paymentCode: scheme.paymentCode,
    classification: "S" as const, validityYears: product.validityYears, benefits: benefitsOf(product),
    sellerMemberId: seller, genealogy: team[seller], customerAccepted: true, reviewedBy: null, finalizedAt: null, returnReason: null, cancelReason: null,
  };
};

const contracts: Contract[] = [
  { ...baseContract("ctr-1", "cust-a1", "S1", "scheme-installment-4m", "mem-ost-a1"),
    schedule: installmentSchedule("S1", ["2026-09-30", "2026-10-30", "2026-11-05", "2026-12-05", "2027-01-05"]),
    requiredInitialCentavos: requiredInitialOf("S1"), raNumber: null, status: "finalized", preparedBy: "dev-ost-a1", createdAt: "2026-09-29",
    submittedAt: "2026-09-30", reviewedBy: "dev-admin", finalizedAt: "2026-10-01",
    history: [{ at: "2026-09-30", actorId: "dev-ost-a1", event: "CONTRACT_SUBMITTED", note: null }, { at: "2026-10-01", actorId: "dev-admin", event: "CONTRACT_FINALIZED", note: null }] },
  { ...baseContract("ctr-2", "cust-b1", "B1", "scheme-installment-4m", "mem-ost-b1"),
    schedule: installmentSchedule("B1", ["2026-10-22", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]),
    requiredInitialCentavos: requiredInitialOf("B1"), raNumber: "2026-0001", status: "finalized", preparedBy: "dev-ost-b1", createdAt: "2026-10-21",
    submittedAt: "2026-10-22", reviewedBy: "dev-admin", finalizedAt: "2026-10-23",
    // Seeded so Cancellation Requests shows a record. assertCancellable still
    // rejects new requests on this contract (Active membership), so the
    // request-cancellation validation tests are unaffected.
    cancellation: { ground: "non_payment", reason: "Two missed installments after the reservation fee.", requestedBy: "dev-admin", requestedAt: "2026-11-08T09:00:00+08:00", status: "requested", decidedBy: null, decidedAt: null, forfeitedCentavos: null },
    history: [{ at: "2026-10-22", actorId: "dev-ost-b1", event: "CONTRACT_SUBMITTED", note: null }, { at: "2026-10-23", actorId: "dev-admin", event: "CONTRACT_FINALIZED", note: null }] },
  { ...baseContract("ctr-3", "cust-a3", "G1", "scheme-installment-4m", "mem-sm-a"),
    schedule: installmentSchedule("G1", [null, null, null, null, null]),
    requiredInitialCentavos: requiredInitialOf("G1"), raNumber: null, status: "under_review", preparedBy: "dev-sm-a", createdAt: "2026-11-03",
    submittedAt: "2026-11-04",
    history: [{ at: "2026-11-04", actorId: "dev-sm-a", event: "CONTRACT_SUBMITTED", note: null }, { at: "2026-11-10", actorId: "owner", event: "CONTRACT_REVISED", note: "Owner ruling 2026-11-10 (doc 05 item 11): Gold price conflict resolved; snapshot at ₱390,000." }] },
  { ...baseContract("ctr-4", "cust-a4", "B1", "scheme-installment-4m", "mem-ost-a2"),
    schedule: installmentSchedule("B1", ["2026-11-10", null, null, null, null]),
    requiredInitialCentavos: requiredInitialOf("B1"), raNumber: null, status: "under_review", preparedBy: "dev-ost-a2", createdAt: "2026-11-05",
    submittedAt: "2026-11-06",
    history: [{ at: "2026-11-06", actorId: "dev-ost-a2", event: "CONTRACT_SUBMITTED", note: null }] },
];

const sales: Sale[] = ([
  { id: "sale-1", contractId: "ctr-1", customerId: "cust-a1", productCode: "S1", branchId: "branch-a", valueCentavos: peso(240000), recordedDate: "2026-09-30",
    sellerMemberId: "mem-ost-a1", referrerMemberId: "mem-ost-b1", team: team["mem-ost-a1"], status: "confirmed", confirmedDate: "2026-10-28",
    adjustments: [{ id: "adj-1", date: "2026-10-28", amountCentavos: peso(240000), kind: "confirmation", reason: "Required initial payment verified by Finance", actorId: "dev-finance" }] },
  { id: "sale-2", contractId: "ctr-2", customerId: "cust-b1", productCode: "B1", branchId: "branch-b", valueCentavos: peso(72000), recordedDate: "2026-10-22",
    sellerMemberId: "mem-ost-b1", referrerMemberId: null, team: team["mem-ost-b1"], status: "confirmed", confirmedDate: "2026-10-30",
    adjustments: [{ id: "adj-2", date: "2026-10-30", amountCentavos: peso(72000), kind: "confirmation", reason: "Required initial payment verified by Finance", actorId: "dev-finance" }] },
  { id: "sale-3", contractId: "ctr-3", customerId: "cust-a3", productCode: "G1", branchId: "branch-a", valueCentavos: peso(390000), recordedDate: "2026-11-04",
    sellerMemberId: "mem-sm-a", referrerMemberId: null, team: team["mem-sm-a"], status: "pending", confirmedDate: null, adjustments: [] },
  { id: "sale-4", contractId: "ctr-4", customerId: "cust-a4", productCode: "B1", branchId: "branch-a", valueCentavos: peso(72000), recordedDate: "2026-11-06",
    sellerMemberId: "mem-ost-a2", referrerMemberId: null, team: team["mem-ost-a2"], status: "pending", confirmedDate: null, adjustments: [] },
] satisfies Omit<Sale, "approval">[]).map((sale) => ({
  ...sale,
  approval: { approvedAt: sale.recordedDate, approvedBy: "dev-admin" },
}));

const pay = (id: string, contractId: string, customerId: string, saleId: string, purpose: PaymentPurpose, amount: number, paidDate: string, status: Payment["status"], extra?: Partial<Payment>): Payment => ({
  id, contractId, customerId, saleId, purpose, amountCentavos: amount, method: "Bank Transfer", paidDate, referenceNo: "BT-" + id.toUpperCase(),
  evidenceFileName: "receipt-" + id + ".jpg", submittedBy: "dev-ost-a1", submittedAt: paidDate, status,
  verifiedBy: status === "verified" ? "dev-finance" : null, verifiedAt: status === "verified" ? paidDate : null,
  verifiedDate: status === "verified" ? paidDate : null, decisionReason: null, adjustments: [],
  history: [{ at: paidDate, actorId: "dev-ost-a1", event: "PAYMENT_SUBMITTED", note: null }].concat(status === "verified" ? [{ at: paidDate, actorId: "dev-finance", event: "PAYMENT_VERIFIED", note: null }] : []),
  ...extra,
});

const payments: Payment[] = [
  pay("pay-1", "ctr-1", "cust-a1", "sale-1", "reservation", peso(10000), "2026-09-30", "verified"),
  pay("pay-2", "ctr-1", "cust-a1", "sale-1", "installment", peso(57500), "2026-10-28", "verified"),
  pay("pay-3", "ctr-2", "cust-b1", "sale-2", "reservation", peso(10000), "2026-10-22", "verified", { submittedBy: "dev-ost-b1" }),
  pay("pay-4", "ctr-4", "cust-a4", "sale-4", "reservation", peso(10000), "2026-11-07", "submitted", { submittedBy: "dev-ost-a2" }),
  pay("pay-5", "ctr-2", "cust-b1", "sale-2", "installment", peso(15500), "2026-10-30", "verified", { submittedBy: "dev-ost-b1" }),
  pay("pay-6", "ctr-2", "cust-b1", "sale-2", "installment", peso(15500), "2026-10-31", "verified", { submittedBy: "dev-ost-b1" }),
  pay("pay-7", "ctr-2", "cust-b1", "sale-2", "installment", peso(15500), "2026-11-01", "verified", { submittedBy: "dev-ost-b1" }),
  pay("pay-8", "ctr-2", "cust-b1", "sale-2", "installment", peso(15500), "2026-11-02", "verified", { submittedBy: "dev-ost-b1" }),
];

const memberships: Membership[] = [
  { id: "memb-1", customerId: "cust-b1", contractId: "ctr-2", productCode: "B1", status: "active", activationDate: "2026-11-02",
    validityEndDate: "2033-11-02", cardClaimDate: "2026-11-02", fullSettlementDate: "2026-11-02", cardClaimKind: "actual", cardId: "26110200001B1T04S", raNumber: "2026-0001", financialHold: true, createdAt: "2026-10-30",
    history: [{ at: "2026-11-02", actorId: "dev-admin", event: "MEMBERSHIP_ACTIVATED", note: null }] },
  { id: "memb-2", customerId: "cust-a1", contractId: "ctr-1", productCode: "S1", status: "pending", activationDate: null,
    validityEndDate: null, cardId: null, raNumber: null, financialHold: false, createdAt: "2026-10-01", history: [] },
];

const resortSpends: ResortSpend[] = [
  { id: "rs-1", membershipId: "memb-1", date: "2026-11-04", amountCentavos: peso(400), description: "Resort restaurant", status: "verified", verificationRef: null },
  { id: "rs-2", membershipId: "memb-1", date: "2026-11-06", amountCentavos: peso(600), description: "Resort accommodation extras", status: "verified", verificationRef: null },
  { id: "rs-3", membershipId: "memb-1", date: "2026-11-07", amountCentavos: peso(500), description: "Resort activity pass (refunded)", status: "voided", verificationRef: null },
];

const commissions: Commission[] = [
  // Seeded so Commissions, Payouts and the Commission Report show records.
  // All three attach to the confirmed sale-2, which no test mutates, and use
  // recipients no test approves for that sale (tests only approve sale-1/sale-4).
  { id: "comm-1", saleId: "sale-2", contractId: "ctr-2", recipientMemberId: "mem-ost-b1", recipientName: "Paolo Ramos", recipientDesignation: "OST",
    basisCentavos: peso(72000), percentBp: 500, amountCentavos: peso(3600), status: "approved",
    approvedBy: "dev-finance", approvedAt: "2026-10-30", holdReason: null, payout: null,
    history: [{ at: "2026-10-30", actorId: "dev-finance", event: "COMMISSION_APPROVED", note: null }] },
  { id: "comm-2", saleId: "sale-2", contractId: "ctr-2", recipientMemberId: "mem-svd-b", recipientName: "Liza Aquino", recipientDesignation: "SVD",
    basisCentavos: peso(72000), percentBp: 200, amountCentavos: peso(1440), status: "paid",
    approvedBy: "dev-finance", approvedAt: "2026-10-28", holdReason: null,
    payout: { reference: "PAY-2026-0011", method: "Bank Transfer", payoutDate: "2026-11-04", processedBy: "dev-finance", initiatedAt: "2026-11-04", confirmedAt: "2026-11-05" },
    history: [
      { at: "2026-10-28", actorId: "dev-finance", event: "COMMISSION_APPROVED", note: null },
      { at: "2026-11-04", actorId: "dev-finance", event: "COMMISSION_PAYOUT_RECORDED", note: null },
      { at: "2026-11-05", actorId: "dev-finance", event: "COMMISSION_PAID", note: null },
    ] },
  // A replaced approval, kept on record: cancelled commissions never block a new approval for the same sale.
  { id: "comm-3", saleId: "sale-2", contractId: "ctr-2", recipientMemberId: "mem-ost-b1", recipientName: "Paolo Ramos", recipientDesignation: "OST",
    basisCentavos: peso(72000), percentBp: 300, amountCentavos: peso(2160), status: "cancelled",
    approvedBy: "dev-finance", approvedAt: "2026-10-29", holdReason: null, payout: null,
    history: [
      { at: "2026-10-29", actorId: "dev-finance", event: "COMMISSION_APPROVED", note: null },
      { at: "2026-10-30", actorId: "dev-finance", event: "COMMISSION_CANCELLED", note: "Replaced by the approved 5% entry." },
    ] },
];

const counters: Record<string, number> = { contract: 5, sale: 5, payment: 9, membership: 3, commission: 4, adjustment: 3, resortSpend: 4, customerImport: 3 };

const customerImportJobs: CustomerImportJob[] = [
  { id: "imp-1", fileName: "branch-b-customers.xlsx", createdAt: "2026-11-03T10:15:00+08:00", actorId: "dev-admin",
    totalRows: 12, createdCount: 12, needsReviewCount: 0, invalidCount: 0, createdCustomerIds: [] },
  { id: "imp-2", fileName: "walkin-october.csv", createdAt: "2026-10-25T14:40:00+08:00", actorId: "dev-admin",
    totalRows: 8, createdCount: 5, needsReviewCount: 2, invalidCount: 1, createdCustomerIds: [] },
];

/**
 * Seeded audit history so Audit Logs (and the customer Audit Log tab) show
 * records on a fresh load. Every event mirrors a real repository payload for
 * an existing record; all timestamps predate the mock "today" so runtime
 * events always sort newer. Tests that assert absolute audit counts add
 * SEED_AUDIT_EVENT_COUNT (exported below) to their expectations.
 */
const auditEvents: AuditEvent[] = [
  { id: "audit-1", timestamp: "2026-09-29T10:05:00+08:00", actorId: "dev-ost-a1", actorRoles: ["ost"], module: "customers", action: "CUSTOMER_SUBMITTED", entityType: "customer", entityId: "cust-a1", newValue: "submitted", outcome: "success" },
  { id: "audit-2", timestamp: "2026-09-29T10:06:00+08:00", actorId: "dev-ost-a1", actorRoles: ["ost"], module: "contracts", action: "CONTRACT_PREPARED", entityType: "contract", entityId: "ctr-1", newValue: "draft", outcome: "success", relatedRecordIds: ["cust-a1"] },
  { id: "audit-3", timestamp: "2026-09-30T09:12:00+08:00", actorId: "dev-ost-a1", actorRoles: ["ost"], module: "contracts", action: "CONTRACT_SUBMITTED", entityType: "contract", entityId: "ctr-1", newValue: "submitted", outcome: "success", relatedRecordIds: ["cust-a1"] },
  { id: "audit-4", timestamp: "2026-10-01T11:20:00+08:00", actorId: "dev-admin", actorRoles: ["admin"], module: "contracts", action: "CONTRACT_FINALIZED", entityType: "contract", entityId: "ctr-1", previousValue: "submitted", newValue: "finalized", outcome: "success", relatedRecordIds: ["cust-a1"] },
  { id: "audit-5", timestamp: "2026-10-22T13:45:00+08:00", actorId: "dev-admin", actorRoles: ["admin"], module: "contracts", action: "CONTRACT_FINALIZED", entityType: "contract", entityId: "ctr-2", previousValue: "submitted", newValue: "finalized", outcome: "success", relatedRecordIds: ["cust-b1"] },
  { id: "audit-6", timestamp: "2026-10-28T15:30:00+08:00", actorId: "dev-finance", actorRoles: ["finance"], module: "finance", action: "PAYMENT_VERIFIED", entityType: "payment", entityId: "pay-2", newValue: "verified", outcome: "success", relatedRecordIds: ["ctr-1"] },
  { id: "audit-7", timestamp: "2026-10-28T15:31:00+08:00", actorId: "dev-finance", actorRoles: ["finance"], module: "sales", action: "SALE_CONFIRMED", entityType: "sale", entityId: "sale-1", newValue: "confirmed", outcome: "success", relatedRecordIds: ["ctr-1"] },
  { id: "audit-8", timestamp: "2026-10-30T09:00:00+08:00", actorId: "dev-finance", actorRoles: ["finance"], module: "commissions", action: "COMMISSION_APPROVED", entityType: "commission", entityId: "comm-1", newValue: "500bp/360000", outcome: "success", relatedRecordIds: ["sale-2"] },
];

/** Absolute audit assertions in tests add this to their expectations. */
export const SEED_AUDIT_EVENT_COUNT = auditEvents.length;

export const seedData = {
  members,
  accreditations,
  customers,
  products,
  paymentSchemes,
  contracts,
  sales,
  payments,
  memberships,
  commissions,
  resortSpends,
  customerImportJobs,
  auditEvents,
  accounts,
  departments,
  roles,
  staff,
  counters,
};
