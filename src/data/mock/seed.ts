import type { CustomerImportJob } from "@/modules/customers/import";
import type { Customer } from "@/modules/customers/types";
import type { OrgMember, Department, DepartmentRole, StaffMember } from "@/modules/organization/types";
import type { AccreditationRecord, RegistrationApplication } from "@/modules/accreditation/types";
import type { SeatVacancy } from "@/modules/sales-network/vacancy";
import type { VipProduct, PaymentScheme } from "@/modules/vip/types";
import type { Contract } from "@/modules/contracts/types";
import type { Sale } from "@/modules/sales/types";
import type { Payment } from "@/modules/finance/types";
import type { Membership } from "@/modules/membership/types";
import type { Commission } from "@/modules/commissions/types";
import type { ResortSpend } from "@/modules/stay-points/types";
import type { RedemptionState } from "@/modules/redemption/types";
import { createRedemptionSeed } from "@/modules/redemption/sample-seed";
import type { Account } from "@/modules/accounts/types";
import type { AuditEvent } from "@/modules/audit/types";
import type { ReceiptImportBatch } from "@/modules/imports/receipt-import";
import type { ReconciliationEntry } from "@/modules/reconciliation/rules";
import { seedData } from "./seed-data";

export type MockStore = {
  members: OrgMember[];
  accreditations: AccreditationRecord[];
  /** Effective-dated vacant leader seats (doc 02 section 5.1.1). Empty in the seed. */
  seatVacancies: SeatVacancy[];
  registrationApplications: RegistrationApplication[];
  customers: Customer[];
  products: VipProduct[];
  paymentSchemes: PaymentScheme[];
  contracts: Contract[];
  sales: Sale[];
  payments: Payment[];
  memberships: Membership[];
  commissions: Commission[];
  resortSpends: ResortSpend[];
  /** Redemption configuration, bookings and points ledger; browser memory only. */
  redemption: RedemptionState;
  accounts: Account[];
  departments: Department[];
  roles: DepartmentRole[];
  staff: StaffMember[];
  /** Mock sign-in passwords set by an Administrator, by account id. Browser memory only; never audited or persisted. */
  temporaryPasswords: Record<string, string>;
  /** Append-only audit history; subject to the mock-store reset lifecycle. */
  auditEvents: AuditEvent[];
  /** Customer import batches (job history); browser memory only. */
  customerImportJobs: CustomerImportJob[];
  /** Historical receipt import batches (F11.5); browser memory only. Empty in the seed. */
  receiptImportBatches: ReceiptImportBatch[];
  /** Append-only workbook reconciliation decisions (F11.3); browser memory only. Empty in the seed. */
  reconciliationEntries: ReconciliationEntry[];
  customerSequence: number;
  accountSequence: number;
  departmentSequence: number;
  roleSequence: number;
  staffSequence: number;
  memberSequence: number;
  accreditationSequence: number;
  registrationSequence: number;
  auditSequence: number;
  /** Sequence counters for business modules (contract, sale, payment, ...). */
  counters: Record<string, number>;
};

// Seed records live in the centralized synthetic seed file (seed-data.ts).
// They are deep-cloned here into browser-memory state; a refresh restores them.
const { members, accreditations, customers, products, paymentSchemes, contracts, sales, payments, memberships, commissions, resortSpends, customerImportJobs, auditEvents, accounts, departments, roles, staff } = seedData;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export function createSeedStore(): MockStore {
  return {
    members: members.map((item) => ({ ...item })),
    accreditations: accreditations.map((item) => ({ ...item, history: item.history.map((entry) => ({ ...entry })) })),
    seatVacancies: [],
    registrationApplications: [],
    customers: clone(customers),
    products: clone(products),
    paymentSchemes: clone(paymentSchemes),
    contracts: clone(contracts),
    sales: clone(sales),
    payments: clone(payments),
    memberships: clone(memberships),
    commissions: clone(commissions),
    resortSpends: clone(resortSpends),
    redemption: createRedemptionSeed(),
    accounts: accounts.map((item) => ({ ...item, roleIds: [...item.roleIds] })),
    departments: departments.map((item) => ({ ...item })),
    roles: roles.map((item) => ({ ...item, moduleIds: [...item.moduleIds] })),
    staff: staff.map((item) => ({ ...item })),
    temporaryPasswords: {},
    auditEvents: clone(auditEvents),
    customerImportJobs: customerImportJobs.map((item) => ({ ...item, createdCustomerIds: [...item.createdCustomerIds] })),
    receiptImportBatches: [],
    reconciliationEntries: [],
    customerSequence: customers.length + 1,
    accountSequence: accounts.length + 1,
    departmentSequence: departments.length + 1,
    roleSequence: roles.length + 1,
    staffSequence: staff.length + 1,
    memberSequence: members.length + 1,
    // Shared AA sequence resumes after the seven seeded reservations (1-7).
    accreditationSequence: 8,
    registrationSequence: 1,
    // Continues after the seeded audit-1..audit-8 display records.
    auditSequence: 9,
    counters: { ...seedData.counters },
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
    accreditations: seed.accreditations.map((item) => ({ ...item, history: item.history.map((entry) => ({ ...entry })), aaNumberHistory: item.aaNumberHistory?.map((entry) => ({ ...entry })) })),
    seatVacancies: seed.seatVacancies.map((item) => ({ ...item })),
    registrationApplications: clone(seed.registrationApplications),
    customers: clone(seed.customers),
    products: clone(seed.products),
    paymentSchemes: clone(seed.paymentSchemes),
    contracts: clone(seed.contracts),
    sales: clone(seed.sales),
    payments: clone(seed.payments),
    memberships: clone(seed.memberships),
    commissions: clone(seed.commissions),
    resortSpends: clone(seed.resortSpends),
    redemption: clone(seed.redemption),
    accounts: seed.accounts.map((item) => ({ ...item, roleIds: [...item.roleIds] })),
    departments: seed.departments.map((item) => ({ ...item })),
    roles: seed.roles.map((item) => ({ ...item, moduleIds: [...item.moduleIds] })),
    staff: seed.staff.map((item) => ({ ...item })),
    temporaryPasswords: { ...seed.temporaryPasswords },
    auditEvents: seed.auditEvents.map((item) => ({ ...item, relatedRecordIds: item.relatedRecordIds ? [...item.relatedRecordIds] : undefined })),
    customerImportJobs: seed.customerImportJobs.map((item) => ({ ...item, createdCustomerIds: [...item.createdCustomerIds] })),
    receiptImportBatches: clone(seed.receiptImportBatches),
    reconciliationEntries: clone(seed.reconciliationEntries),
    customerSequence: seed.customerSequence,
    accountSequence: seed.accountSequence,
    departmentSequence: seed.departmentSequence,
    roleSequence: seed.roleSequence,
    staffSequence: seed.staffSequence,
    memberSequence: seed.memberSequence,
    accreditationSequence: seed.accreditationSequence,
    registrationSequence: seed.registrationSequence,
    auditSequence: seed.auditSequence,
    counters: { ...seed.counters },
  };
}
