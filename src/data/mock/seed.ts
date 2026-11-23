import type { CustomerImportJob } from "@/modules/customers/import";
import type { Customer } from "@/modules/customers/types";
import type { OrgMember, Department, DepartmentRole, StaffMember } from "@/modules/organization/types";
import type { AccreditationRecord, RegistrationApplication } from "@/modules/accreditation/types";
import type { SeatVacancy } from "@/modules/sales-network/vacancy";
import type { VipProduct, PaymentScheme, TierLevel } from "@/modules/vip/types";
import type { Contract } from "@/modules/contracts/types";
import type { Sale } from "@/modules/sales/types";
import type { Payment, UnmatchedReceipt } from "@/modules/finance/types";
import type { IgpState } from "@/modules/igp/types";
import type { ClosedMonth } from "@/modules/finance/month-close";
import type { Membership } from "@/modules/membership/types";
import type { Commission, CommissionRateSetting, CommissionClawback, CommissionPayoutList, VipPositionRate } from "@/modules/commissions/types";
import type { AllowanceReview } from "@/modules/commissions/allowances";
import type { ResortSpend, StayPointsState } from "@/modules/stay-points/types";
import type { RedemptionState } from "@/modules/redemption/types";
import { seedOutlets, seedReferenceEntries, type Outlet, type ReferenceEntry } from "@/modules/settings/lists";
import { seedTierLevels } from "@/modules/vip/tier-levels";
import type { Account } from "@/modules/accounts/types";
import type { Promo, PromoPointsEntry } from "@/modules/promos/types";
import type { Experience } from "@/modules/experiences/types";
import { seedExperiences } from "@/modules/experiences/sample-seed";
import type { AuditEvent } from "@/modules/audit/types";
import type { ReceiptImportBatch } from "@/modules/imports/receipt-import";
import type { ReconciliationEntry } from "@/modules/reconciliation/rules";
import type { MonthSwitchSignOff } from "@/modules/reconciliation/switch-signoff";
import { buildSeed } from "./seed/index";

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
  /** Receipts recorded without a matching contract (F6.5); browser memory only. Empty in the seed. */
  unmatchedReceipts: UnmatchedReceipt[];
  memberQr: Record<string, { holderKey: string; token: string }>;
  memberships: Membership[];
  commissions: Commission[];
  commissionRateSettings: CommissionRateSetting[];
  vipPositionRates: VipPositionRate[];
  commissionClawbacks: CommissionClawback[];
  commissionPayoutLists: CommissionPayoutList[];
  allowanceReviews: AllowanceReview[];
  resortSpends: ResortSpend[];
  stayPoints: StayPointsState;
  /** Redemption configuration, bookings and points ledger; browser memory only. */
  redemption: RedemptionState;
  /** Admin-managed lists (program categories, government ID types, banks) and outlets. */
  referenceEntries: ReferenceEntry[];
  /** Admin-managed VIP tier levels (Bronze, Silver, Gold and later ones); products point to them. */
  tierLevels: TierLevel[];
  outlets: Outlet[];
  /** Promo Points: admin-defined promos and their separate points ledger (not Grant Stay Points). */
  promos: Promo[];
  promoPoints: PromoPointsEntry[];
  /** Public website Experiences content; distinct from Promo Rewards. */
  experiences: Experience[];
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
  /** Append-only parallel-run switch sign-offs (F11.5); browser memory only. Empty in the seed. */
  monthSwitchSignOffs: MonthSwitchSignOff[];
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

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/**
 * Builds the browser-memory store from the synthetic seed (./seed/), dated
 * relative to the Asia/Manila business date. A refresh rebuilds it, so mock
 * records never persist. `today` is for tests that need a fixed date.
 */
export function createSeedStore(today?: string): MockStore {
  const seed = buildSeed(today);
  return {
    members: seed.members,
    accreditations: seed.accreditations,
    seatVacancies: seed.seatVacancies,
    registrationApplications: seed.registrationApplications,
    customers: seed.customers,
    products: seed.products,
    paymentSchemes: seed.paymentSchemes,
    contracts: seed.contracts,
    sales: seed.sales,
    igp: seed.igp,
    payments: seed.payments,
    closedMonths: seed.closedMonths,
    unmatchedReceipts: seed.unmatchedReceipts,
    memberQr: seed.memberQr,
    memberships: seed.memberships,
    commissions: seed.commissions,
    commissionRateSettings: seed.commissionRateSettings,
    vipPositionRates: seed.vipPositionRates,
    commissionClawbacks: seed.commissionClawbacks,
    commissionPayoutLists: seed.commissionPayoutLists,
    allowanceReviews: seed.allowanceReviews,
    resortSpends: seed.resortSpends,
    stayPoints: seed.stayPoints,
    redemption: seed.redemption,
    referenceEntries: seedReferenceEntries(),
    tierLevels: seedTierLevels(),
    outlets: seedOutlets(),
    promos: seed.promos,
    promoPoints: seed.promoPoints,
    experiences: seedExperiences(),
    accounts: seed.accounts,
    departments: seed.departments,
    roles: seed.roles,
    staff: seed.staff,
    temporaryPasswords: {},
    auditEvents: seed.auditEvents,
    customerImportJobs: seed.customerImportJobs,
    receiptImportBatches: seed.receiptImportBatches,
    reconciliationEntries: seed.reconciliationEntries,
    monthSwitchSignOffs: seed.monthSwitchSignOffs,
    customerSequence: seed.customers.length + 1,
    accountSequence: seed.accounts.length + 1,
    departmentSequence: seed.departments.length + 1,
    roleSequence: seed.roles.length + 1,
    staffSequence: seed.staff.length + 1,
    memberSequence: seed.members.length + 1,
    accreditationSequence: seed.accreditationSequence,
    registrationSequence: seed.registrationSequence,
    auditSequence: seed.auditEvents.length + 1,
    counters: seed.counters,
  };
}

/** Number of seeded audit events; tests that assert absolute audit counts add it. */
export function seedAuditEventCount(today?: string): number {
  return buildSeed(today).auditEvents.length;
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
    unmatchedReceipts: clone(seed.unmatchedReceipts),
    memberQr: clone(seed.memberQr),
    memberships: clone(seed.memberships),
    commissions: clone(seed.commissions),
    commissionRateSettings: clone(seed.commissionRateSettings),
    vipPositionRates: clone(seed.vipPositionRates ?? []),
    commissionClawbacks: clone(seed.commissionClawbacks),
    commissionPayoutLists: clone(seed.commissionPayoutLists),
    allowanceReviews: clone(seed.allowanceReviews),
    resortSpends: clone(seed.resortSpends),
    stayPoints: clone(seed.stayPoints),
    redemption: clone(seed.redemption),
    referenceEntries: seed.referenceEntries.map((item) => ({ ...item })),
    tierLevels: seed.tierLevels.map((item) => ({ ...item })),
    outlets: seed.outlets.map((item) => ({ ...item })),
    promos: clone(seed.promos),
    promoPoints: clone(seed.promoPoints),
    experiences: clone(seed.experiences),
    accounts: seed.accounts.map((item) => ({ ...item, roleIds: [...item.roleIds] })),
    departments: seed.departments.map((item) => ({ ...item })),
    roles: seed.roles.map((item) => ({ ...item, moduleIds: [...item.moduleIds] })),
    staff: seed.staff.map((item) => ({ ...item })),
    temporaryPasswords: { ...seed.temporaryPasswords },
    auditEvents: seed.auditEvents.map((item) => ({ ...item, relatedRecordIds: item.relatedRecordIds ? [...item.relatedRecordIds] : undefined })),
    customerImportJobs: seed.customerImportJobs.map((item) => ({ ...item, createdCustomerIds: [...item.createdCustomerIds] })),
    receiptImportBatches: clone(seed.receiptImportBatches),
    reconciliationEntries: clone(seed.reconciliationEntries),
    monthSwitchSignOffs: clone(seed.monthSwitchSignOffs),
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
