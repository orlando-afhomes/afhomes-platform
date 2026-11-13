import type { CustomerImportJob } from "@/modules/customers/import";
import type { Customer } from "@/modules/customers/types";
import type { OrgMember, Department, DepartmentRole, StaffMember } from "@/modules/organization/types";
import type { AccreditationRecord, RegistrationApplication } from "@/modules/accreditation/types";
import type { SeatVacancy } from "@/modules/sales-network/vacancy";
import type { VipProduct, PaymentScheme } from "@/modules/vip/types";
import type { Contract } from "@/modules/contracts/types";
import type { Sale } from "@/modules/sales/types";
import type { Payment } from "@/modules/finance/types";
import { createIgpState, type IgpState } from "@/modules/igp/types";
import type { ClosedMonth } from "@/modules/finance/month-close";
import type { Membership } from "@/modules/membership/types";
import type { Commission, CommissionRateSetting, CommissionClawback, CommissionPayoutList } from "@/modules/commissions/types";
import type { AllowanceReview } from "@/modules/commissions/allowances";
import type { ResortSpend, StayPointsState } from "@/modules/stay-points/types";
import { createStayPointsState } from "@/modules/stay-points/engine";
import type { RedemptionState } from "@/modules/redemption/types";
import { createRedemptionSeed } from "@/modules/redemption/sample-seed";
import { seedOutlets, seedReferenceEntries, type Outlet, type ReferenceEntry } from "@/modules/settings/lists";
import type { Account } from "@/modules/accounts/types";
import type { Promo, PromoPointsEntry } from "@/modules/promos/types";
import { seedPromos } from "@/modules/promos/sample-seed";
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
  igp: IgpState;
  payments: Payment[];
  closedMonths: ClosedMonth[];
  memberships: Membership[];
  commissions: Commission[];
  commissionRateSettings: CommissionRateSetting[];
  commissionClawbacks: CommissionClawback[];
  commissionPayoutLists: CommissionPayoutList[];
  allowanceReviews: AllowanceReview[];
  resortSpends: ResortSpend[];
  stayPoints: StayPointsState;
  /** Redemption configuration, bookings and points ledger; browser memory only. */
  redemption: RedemptionState;
  /** Admin-managed lists (program categories, government ID types, banks) and outlets. */
  referenceEntries: ReferenceEntry[];
  outlets: Outlet[];
  /** Promo Points: admin-defined promos and their separate points ledger (not Grant Stay Points). */
  promos: Promo[];
  promoPoints: PromoPointsEntry[];
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
    igp: createIgpState(),
    payments: clone(payments),
    closedMonths: [],
    memberships: clone(memberships),
    commissions: clone(commissions),
    commissionRateSettings: [],
    commissionClawbacks: [],
    commissionPayoutLists: [],
    allowanceReviews: [],
    resortSpends: clone(resortSpends),
    stayPoints: createStayPointsState(),
    redemption: createRedemptionSeed(),
    referenceEntries: seedReferenceEntries(),
    outlets: seedOutlets(),
    promos: seedPromos(),
    promoPoints: [],
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
    counters: { promo: 2, ...seedData.counters },
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
    igp: clone(seed.igp),
    payments: clone(seed.payments),
    closedMonths: clone(seed.closedMonths),
    memberships: clone(seed.memberships),
    commissions: clone(seed.commissions),
    commissionRateSettings: clone(seed.commissionRateSettings),
    commissionClawbacks: clone(seed.commissionClawbacks),
    commissionPayoutLists: clone(seed.commissionPayoutLists),
    allowanceReviews: clone(seed.allowanceReviews),
    resortSpends: clone(seed.resortSpends),
    stayPoints: clone(seed.stayPoints),
    redemption: clone(seed.redemption),
    referenceEntries: seed.referenceEntries.map((item) => ({ ...item })),
    outlets: seed.outlets.map((item) => ({ ...item })),
    promos: clone(seed.promos),
    promoPoints: clone(seed.promoPoints),
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
