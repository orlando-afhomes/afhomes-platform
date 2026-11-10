import type { CustomerImportJob } from "@/modules/customers/import";
import type { Customer } from "@/modules/customers/types";
import type { OrgMember, Department, DepartmentRole, StaffMember } from "@/modules/organization/types";
import type { AccreditationRecord, RegistrationApplication } from "@/modules/accreditation/types";
import type { VipProduct, PaymentScheme } from "@/modules/vip/types";
import type { Contract } from "@/modules/contracts/types";
import type { Sale } from "@/modules/sales/types";
import type { Payment } from "@/modules/finance/types";
import type { Membership } from "@/modules/membership/types";
import type { Commission } from "@/modules/commissions/types";
import type { ResortSpend } from "@/modules/stay-points/types";
import type { Account } from "@/modules/accounts/types";
import type { AuditEvent } from "@/modules/audit/types";
import { seedData } from "./seed-data";

export type MockStore = {
  members: OrgMember[];
  accreditations: AccreditationRecord[];
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
  accounts: Account[];
  departments: Department[];
  roles: DepartmentRole[];
  staff: StaffMember[];
  /** Append-only audit history; subject to the mock-store reset lifecycle. */
  auditEvents: AuditEvent[];
  /** Customer import batches (job history); browser memory only. */
  customerImportJobs: CustomerImportJob[];
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
    accounts: accounts.map((item) => ({ ...item, roleIds: [...item.roleIds] })),
    departments: departments.map((item) => ({ ...item })),
    roles: roles.map((item) => ({ ...item, moduleIds: [...item.moduleIds] })),
    staff: staff.map((item) => ({ ...item })),
    auditEvents: clone(auditEvents),
    customerImportJobs: customerImportJobs.map((item) => ({ ...item, createdCustomerIds: [...item.createdCustomerIds] })),
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
    accreditations: seed.accreditations.map((item) => ({ ...item, history: item.history.map((entry) => ({ ...entry })) })),
    registrationApplications: seed.registrationApplications.map((item) => ({ ...item, history: item.history.map((entry) => ({ ...entry })) })),
    customers: clone(seed.customers),
    products: clone(seed.products),
    paymentSchemes: clone(seed.paymentSchemes),
    contracts: clone(seed.contracts),
    sales: clone(seed.sales),
    payments: clone(seed.payments),
    memberships: clone(seed.memberships),
    commissions: clone(seed.commissions),
    resortSpends: clone(seed.resortSpends),
    accounts: seed.accounts.map((item) => ({ ...item, roleIds: [...item.roleIds] })),
    departments: seed.departments.map((item) => ({ ...item })),
    roles: seed.roles.map((item) => ({ ...item, moduleIds: [...item.moduleIds] })),
    staff: seed.staff.map((item) => ({ ...item })),
    auditEvents: seed.auditEvents.map((item) => ({ ...item, relatedRecordIds: item.relatedRecordIds ? [...item.relatedRecordIds] : undefined })),
    customerImportJobs: seed.customerImportJobs.map((item) => ({ ...item, createdCustomerIds: [...item.createdCustomerIds] })),
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
