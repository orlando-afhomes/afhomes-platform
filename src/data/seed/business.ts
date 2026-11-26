import type { Commission, CommissionPayoutList, CommissionRateSetting, FrozenCommissionRate, VipPositionRate } from "@/modules/commissions/types";
import { commissionStageAmounts } from "@/modules/commissions/rules";
import { buildNonStandardSchedule, buildSchedule, snapshotBenefits } from "@/modules/contracts/rules";
import type { Contract, ContractEvent, GenealogyEntry, ScheduleItem } from "@/modules/contracts/types";
import type { CustomerImportJob } from "@/modules/customers/import";
import { formatCustomerId } from "@/modules/customers/customer-number";
import type { Customer, CustomerStatus, AcquisitionChannel } from "@/modules/customers/types";
import { collectionState } from "@/modules/finance/application/collection-state";
import { nextOfficialReceiptNo, nextPaymentReference } from "@/modules/finance/payment-reference";
import type { Payment, PaymentMethod, PaymentPurpose } from "@/modules/finance/types";
import { buildVipNumber, computeValidityEnd } from "@/modules/membership/rules";
import type { Membership } from "@/modules/membership/types";
import type { OrgMember } from "@/modules/organization/types";
import { VIP_CLOSED_DEAL_THRESHOLD_BP } from "@/modules/sales/rules";
import type { Sale } from "@/modules/sales/types";
import type { ResortSpend } from "@/modules/stay-points/types";
import { paymentCodeFor } from "@/modules/vip/rules";
import type { PaymentScheme, VipProduct, VipTierCode } from "@/modules/vip/types";
import type { SeedClock } from "./anchor";
import { peso } from "./catalog";
import { addressAt, CUSTOMER_NAMES, GOVERNMENT_ID_TYPES, governmentIdAt, landlineAt, mobileAt, personalEmail, tinAt, type PersonName } from "./people";

/**
 * Customers, contracts, sales, receipts, memberships, resort bills and per-sale
 * commissions. Schedules, VIP Numbers, receipt references, collection milestones
 * and commission amounts all come from the same rule functions the app uses, so
 * the seed stays consistent with docs 05 to 09 by construction.
 */

// --------------------------------------------------------------------------
// Customers
// --------------------------------------------------------------------------

type CustomerSpec = {
  id: string;
  name: number;
  branchId: string;
  owner: string;
  status: CustomerStatus;
  tier?: VipTierCode;
  schemeId?: string;
  channel?: AcquisitionChannel;
  createdDaysAgo: number;
  recommender?: string;
  occupation?: string;
  reviewReason?: string;
  draftOnly?: boolean;
};

const OCCUPATIONS = [
  "Registered Nurse", "Public School Teacher", "Civil Engineer", "Business Owner", "Bank Officer", "Pharmacist", "Accountant",
  "Overseas Filipino Worker", "Government Employee", "Restaurant Owner", "IT Specialist", "Retired", "Physician", "Sales Manager",
];

/**
 * The first nine ids keep the records older tests and screens refer to. Index
 * 0 to 2 replace the former placeholder names; the rest keep their names.
 */
const CUSTOMER_SPECS: readonly CustomerSpec[] = [
  { id: "cust-a1", name: 0, branchId: "branch-a", owner: "mem-ost-a1", status: "submitted", tier: "S1", schemeId: "scheme-installment-4m", channel: "Referral", createdDaysAgo: 56, recommender: "mem-ost-a1", occupation: "Registered Nurse" },
  { id: "cust-a2", name: 1, branchId: "branch-a", owner: "mem-sm-a", status: "draft", tier: "B1", createdDaysAgo: 9, draftOnly: true },
  { id: "cust-b1", name: 2, branchId: "branch-b", owner: "mem-ost-b1", status: "submitted", tier: "B1", schemeId: "scheme-installment-4m", channel: "FB Ads", createdDaysAgo: 34, recommender: "mem-ost-b1", occupation: "IT Specialist" },
  { id: "cust-a9", name: 3, branchId: "branch-a", owner: "mem-ost-a1", status: "active_member", tier: "S1", schemeId: "scheme-installment-4m", channel: "CMP", createdDaysAgo: 175 },
  { id: "cust-b2", name: 4, branchId: "branch-b", owner: "mem-ssm-b", status: "active_member", tier: "G1", schemeId: "scheme-spot-cash", channel: "Corporate", createdDaysAgo: 168 },
  { id: "cust-c1", name: 5, branchId: "branch-c", owner: "mem-sm-c", status: "active_member", tier: "B1", schemeId: "scheme-installment-4m", channel: "Walk-In", createdDaysAgo: 161 },
  { id: "cust-a10", name: 6, branchId: "branch-a", owner: "mem-svd-a", status: "approved", tier: "G1", schemeId: "scheme-move-b", channel: "GDP", createdDaysAgo: 153 },
  { id: "cust-b3", name: 7, branchId: "branch-b", owner: "mem-ost-b1", status: "active_member", tier: "S1", schemeId: "scheme-installment-4m", channel: "Referral", createdDaysAgo: 148, recommender: "mem-ost-a1" },
  { id: "cust-a11", name: 8, branchId: "branch-a", owner: "mem-ost-a2", status: "active_member", tier: "B1", schemeId: "scheme-move-a", channel: "DRP", createdDaysAgo: 141 },
  { id: "cust-c2", name: 9, branchId: "branch-c", owner: "mem-svd-c", status: "approved", tier: "S1", schemeId: "scheme-installment-4m", channel: "Public Servant", createdDaysAgo: 131 },
  { id: "cust-a12", name: 10, branchId: "branch-a", owner: "mem-ost-a3", status: "active_member", tier: "B1", schemeId: "scheme-installment-4m", channel: "FB Ads", createdDaysAgo: 127 },
  { id: "cust-b4", name: 11, branchId: "branch-b", owner: "mem-svd-b", status: "approved", tier: "G1", schemeId: "scheme-installment-4m", channel: "Corporate", createdDaysAgo: 121 },
  { id: "cust-a13", name: 12, branchId: "branch-a", owner: "mem-ost-a4", status: "active_member", tier: "S1", schemeId: "scheme-spot-cash", channel: "Walk-In", createdDaysAgo: 103 },
  { id: "cust-c3", name: 13, branchId: "branch-c", owner: "mem-sm-c", status: "approved", tier: "B1", schemeId: "scheme-installment-4m", channel: "CMP", createdDaysAgo: 99 },
  { id: "cust-b5", name: 14, branchId: "branch-b", owner: "mem-ost-b2", status: "active_member", tier: "S1", schemeId: "scheme-installment-4m", channel: "Public Servant", createdDaysAgo: 95 },
  { id: "cust-a14", name: 15, branchId: "branch-a", owner: "mem-ost-a1", status: "approved", tier: "B1", schemeId: "scheme-installment-4m", channel: "Referral", createdDaysAgo: 180 },
  { id: "cust-c4", name: 16, branchId: "branch-c", owner: "mem-svd-c", status: "approved", tier: "G1", schemeId: "scheme-installment-4m", channel: "GDP", createdDaysAgo: 71, recommender: "mem-sm-c" },
  { id: "cust-b6", name: 17, branchId: "branch-b", owner: "mem-ost-b1", status: "approved", tier: "B1", schemeId: "scheme-spot-cash", channel: "FB Ads", createdDaysAgo: 65 },
  { id: "cust-a15", name: 18, branchId: "branch-a", owner: "mem-ost-a3", status: "approved", tier: "S1", schemeId: "scheme-move-b", channel: "CMP", createdDaysAgo: 61 },
  { id: "cust-a16", name: 19, branchId: "branch-a", owner: "mem-ssm-a", status: "approved", tier: "G1", schemeId: "scheme-installment-4m", channel: "Corporate", createdDaysAgo: 55 },
  { id: "cust-b7", name: 20, branchId: "branch-b", owner: "mem-ssm-b", status: "approved", tier: "S1", schemeId: "scheme-installment-4m", channel: "Walk-In", createdDaysAgo: 41 },
  { id: "cust-c5", name: 21, branchId: "branch-c", owner: "mem-ost-c1", status: "approved", tier: "B1", schemeId: "scheme-installment-4m", channel: "Referral", createdDaysAgo: 36, recommender: "mem-ost-c1" },
  { id: "cust-a17", name: 22, branchId: "branch-a", owner: "mem-ost-a4", status: "approved", tier: "B1", schemeId: "scheme-installment-4m", channel: "DRP", createdDaysAgo: 33 },
  { id: "cust-b8", name: 23, branchId: "branch-b", owner: "mem-svd-b", status: "approved", tier: "G1", schemeId: "scheme-spot-cash", channel: "Corporate", createdDaysAgo: 15 },
  { id: "cust-a18", name: 24, branchId: "branch-a", owner: "mem-ost-a2", status: "approved", tier: "S1", schemeId: "scheme-installment-4m", channel: "FB Ads", createdDaysAgo: 8 },
  { id: "cust-c6", name: 25, branchId: "branch-c", owner: "mem-ost-c1", status: "approved", tier: "B1", schemeId: "scheme-installment-4m", channel: "Walk-In", createdDaysAgo: 6 },
  { id: "cust-a19", name: 26, branchId: "branch-a", owner: "mem-ost-a3", status: "approved", tier: "S1", schemeId: "scheme-installment-4m", channel: "Referral", createdDaysAgo: 3 },
  // IGP property buyers (doc 14): approved customers without a VIP contract.
  { id: "cust-b9", name: 27, branchId: "branch-b", owner: "mem-svd-b", status: "approved", tier: "S1", schemeId: "scheme-spot-cash", channel: "Corporate", createdDaysAgo: 118 },
  { id: "cust-a20", name: 28, branchId: "branch-a", owner: "mem-svd-a", status: "approved", tier: "G1", schemeId: "scheme-spot-cash", channel: "Referral", createdDaysAgo: 84 },
  { id: "cust-c7", name: 29, branchId: "branch-c", owner: "mem-svd-c", status: "approved", tier: "B1", schemeId: "scheme-installment-4m", channel: "GDP", createdDaysAgo: 46 },
  // Application review examples (doc 04 sections 5 and 10).
  { id: "cust-c8", name: 30, branchId: "branch-c", owner: "mem-sm-c", status: "submitted", tier: "S1", schemeId: "scheme-installment-4m", channel: "CMP", createdDaysAgo: 4 },
  { id: "cust-b10", name: 31, branchId: "branch-b", owner: "mem-ost-b2", status: "submitted", tier: "B1", schemeId: "scheme-move-a", channel: "Public Servant", createdDaysAgo: 2 },
  { id: "cust-a21", name: 32, branchId: "branch-a", owner: "mem-ost-a4", status: "sent_back", tier: "S1", schemeId: "scheme-installment-4m", channel: "Walk-In", createdDaysAgo: 12,
    reviewReason: "The government ID photo is blurred. Please upload a clear copy of the front of the ID." },
  { id: "cust-b11", name: 33, branchId: "branch-b", owner: "mem-ost-b1", status: "draft", tier: "B1", createdDaysAgo: 1, draftOnly: true },
];

/** The six customers kept from the earlier seed (names already realistic). */
const LEGACY_CUSTOMERS: ReadonlyArray<{ id: string; firstName: string; middleName: string | null; lastName: string; gender: "Male" | "Female"; dateOfBirth: string;
  civilStatus: string; owner: string; status: CustomerStatus; tier: VipTierCode; createdDaysAgo: number; channel?: AcquisitionChannel; recommender?: string; reviewReason?: string; draftOnly?: boolean }> = [
  { id: "cust-a3", firstName: "Elena", middleName: "Cruz", lastName: "Bautista", gender: "Female", dateOfBirth: "1979-11-30", civilStatus: "Married", owner: "mem-sm-a", status: "submitted", tier: "G1", createdDaysAgo: 21, channel: "CMP", recommender: "mem-ost-a1" },
  { id: "cust-a4", firstName: "Rafael", middleName: null, lastName: "Domingo", gender: "Male", dateOfBirth: "1993-02-18", civilStatus: "Single", owner: "mem-ost-a2", status: "submitted", tier: "B1", createdDaysAgo: 19, channel: "Walk-In", recommender: "mem-ost-a2" },
  { id: "cust-a5", firstName: "Lourdes", middleName: "Reyes", lastName: "Fabian", gender: "Female", dateOfBirth: "1986-05-04", civilStatus: "Married", owner: "mem-ost-a1", status: "draft", tier: "S1", createdDaysAgo: 13, draftOnly: true },
  { id: "cust-a6", firstName: "Noel", middleName: "Santos", lastName: "Pascual", gender: "Male", dateOfBirth: "1981-06-09", civilStatus: "Married", owner: "mem-ost-a2", status: "approved", tier: "B1", createdDaysAgo: 42, channel: "CMP" },
  { id: "cust-a7", firstName: "Gina", middleName: null, lastName: "Soriano", gender: "Female", dateOfBirth: "1995-12-01", civilStatus: "Single", owner: "mem-ost-a1", status: "sent_back", tier: "S1", createdDaysAgo: 41,
    reviewReason: "Residential address is missing." },
  { id: "cust-a8", firstName: "Victor", middleName: "Lim", lastName: "Alcantara", gender: "Male", dateOfBirth: "1988-03-22", civilStatus: "Single", owner: "mem-ost-a2", status: "rejected", tier: "B1", createdDaysAgo: 43,
    reviewReason: "Duplicate of an existing customer record." },
];

const BIRTH_DATES = ["1978-04-12", "1985-09-03", "1990-01-27", "1972-11-18", "1983-06-30", "1969-02-14", "1988-08-08", "1994-12-05", "1980-03-21", "1976-07-16", "1991-10-09", "1986-05-25"];
const CIVIL = ["Married", "Single", "Married", "Widowed", "Married", "Separated"];

function fullCustomer(input: {
  id: string; person: PersonName; index: number; branchId: string; owner: string; status: CustomerStatus; tier?: VipTierCode; schemeId?: string;
  channel?: AcquisitionChannel; createdAt: string; recommender?: string; occupation?: string; reviewReason?: string; draftOnly?: boolean;
  dateOfBirth?: string; civilStatus?: string; clock: SeedClock;
}): Customer {
  const { person, index, clock } = input;
  const displayName = `${person.firstName} ${person.lastName}`;
  const submittedAt = input.status === "draft" ? null : clock.addDays(input.createdAt, 1);
  const base: Customer = {
    id: input.id, displayName, branchId: input.branchId, ownerMemberId: input.owner, status: input.status,
    firstName: person.firstName, middleName: person.middleName, noMiddleName: person.middleName === null, lastName: person.lastName,
    mobileNumber: mobileAt(index), vipPlan: input.tier ?? null, createdAt: input.createdAt, submittedAt,
  };
  if (input.draftOnly) return base;
  const govType = GOVERNMENT_ID_TYPES[index % GOVERNMENT_ID_TYPES.length];
  const customer: Customer = {
    ...base,
    gender: person.gender, civilStatus: input.civilStatus ?? CIVIL[index % CIVIL.length], dateOfBirth: input.dateOfBirth ?? BIRTH_DATES[index % BIRTH_DATES.length],
    email: personalEmail(person.firstName, person.lastName, index),
    address: input.status === "sent_back" && input.reviewReason?.includes("address") ? null : addressAt(index),
    governmentIdType: govType, governmentIdNumber: governmentIdAt(govType, index),
    citizenship: "Filipino", landline: index % 4 === 0 ? landlineAt(index, addressAt(index)) : null, tinNumber: index % 3 === 0 ? tinAt(index) : null,
    occupation: input.occupation ?? OCCUPATIONS[index % OCCUPATIONS.length],
    paymentSchemeId: input.schemeId ?? null, contractClassification: input.tier ? "S" : null,
    recommenderMemberId: input.recommender ?? null, acquisitionChannel: input.channel ?? null,
    consentDataPrivacy: true, idReceivedCertified: true,
  };
  const history: Customer["statusHistory"] = [];
  if (submittedAt) history.push({ status: "submitted", at: clock.at(submittedAt, "09:20"), actorId: "dev-clerk" });
  const decided = submittedAt ? clock.addDays(submittedAt, 2) : null;
  if (decided && (input.status === "approved" || input.status === "active_member")) {
    history.push({ status: "approved", at: clock.at(decided, "10:30"), actorId: "dev-admin" });
    customer.approvedAt = decided;
  }
  if (decided && input.status === "sent_back") history.push({ status: "sent_back", at: clock.at(decided, "14:00"), actorId: "dev-admin", reason: input.reviewReason });
  if (decided && input.status === "rejected") history.push({ status: "rejected", at: clock.at(decided, "11:00"), actorId: "dev-admin", reason: input.reviewReason });
  if (input.reviewReason) customer.reviewReason = input.reviewReason;
  if (history.length) customer.statusHistory = history;
  return customer;
}

export function buildCustomers(clock: SeedClock): Customer[] {
  const fromSpecs = CUSTOMER_SPECS.map((spec) => fullCustomer({
    id: spec.id, person: CUSTOMER_NAMES[spec.name], index: spec.name, branchId: spec.branchId, owner: spec.owner, status: spec.status,
    tier: spec.tier, schemeId: spec.schemeId, channel: spec.channel, createdAt: clock.ago(spec.createdDaysAgo), recommender: spec.recommender,
    occupation: spec.occupation, reviewReason: spec.reviewReason, draftOnly: spec.draftOnly, clock,
  }));
  const legacy = LEGACY_CUSTOMERS.map((spec, offset) => fullCustomer({
    id: spec.id, person: { firstName: spec.firstName, middleName: spec.middleName, lastName: spec.lastName, gender: spec.gender }, index: 60 + offset,
    branchId: "branch-a", owner: spec.owner, status: spec.status, tier: spec.tier, schemeId: spec.draftOnly ? undefined : "scheme-installment-4m",
    channel: spec.channel, createdAt: clock.ago(spec.createdDaysAgo), recommender: spec.recommender, reviewReason: spec.reviewReason,
    draftOnly: spec.draftOnly, dateOfBirth: spec.dateOfBirth, civilStatus: spec.civilStatus, clock,
  }));
  // Keep the earlier order: a1, a2, b1, a3 .. a8, then the rest.
  const ordered = [...fromSpecs.slice(0, 3), ...legacy, ...fromSpecs.slice(3)];
  // Customer IDs (doc 04): one YYYY-NNNN sequence per year, in creation order.
  const perYear = new Map<string, number>();
  for (const customer of [...ordered].sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || a.id.localeCompare(b.id))) {
    if (customer.status === "draft" || customer.status === "rejected" || !customer.createdAt) continue;
    const year = customer.createdAt.slice(0, 4);
    const next = (perYear.get(year) ?? 0) + 1;
    perYear.set(year, next);
    customer.customerNumber = formatCustomerId(year, next);
    customer.customerIdMode = "auto";
  }
  return ordered;
}

// --------------------------------------------------------------------------
// Contracts, sales and receipts
// --------------------------------------------------------------------------

type PaymentPlan = {
  /** Schedule lines verified by Finance, in order. */
  paid: number;
  /** Status of the receipt for the next line, when one was submitted. */
  next?: "submitted" | "returned" | "rejected";
  nextReason?: string;
  /** A second, duplicate upload of the next receipt (suggested-match exception). */
  duplicateNext?: boolean;
};

type DealSpec = {
  contractId: string;
  saleId: string;
  customerId: string;
  tier: VipTierCode;
  schemeId: string;
  seller: string;
  referrer?: string;
  /** Days before today of the reservation (schedule start). */
  reservationDaysAgo: number;
  stage: "draft" | "under_review" | "returned" | "finalized" | "cancelled";
  plan: PaymentPlan;
  /** Membership state once the contract is finalized. */
  membership?: "pending" | "active" | "cancelled";
  /** Days after full settlement the card was claimed (active memberships). */
  claimAfterDays?: number;
  financialHold?: boolean;
  nonStandard?: { priceCentavos: number; months: number; justification: string };
  cancellation?: { daysAgo: number; ground: "non_payment" | "voluntary_withdrawal"; reason: string };
  returnReason?: string;
  method?: PaymentMethod;
};

/** New deals (ids continue after the four kept contracts). */
const DEALS: readonly DealSpec[] = [
  { contractId: "ctr-5", saleId: "sale-5", customerId: "cust-a9", tier: "S1", schemeId: "scheme-installment-4m", seller: "mem-ost-a1", reservationDaysAgo: 172, stage: "finalized", plan: { paid: 5 }, membership: "active", claimAfterDays: 6, method: "Bank Transfer" },
  { contractId: "ctr-6", saleId: "sale-6", customerId: "cust-b2", tier: "G1", schemeId: "scheme-spot-cash", seller: "mem-ssm-b", reservationDaysAgo: 165, stage: "finalized", plan: { paid: 2 }, membership: "active", claimAfterDays: 9, method: "Cheque" },
  { contractId: "ctr-7", saleId: "sale-7", customerId: "cust-c1", tier: "B1", schemeId: "scheme-installment-4m", seller: "mem-sm-c", reservationDaysAgo: 158, stage: "finalized", plan: { paid: 5 }, membership: "active", claimAfterDays: 4, method: "GCash" },
  { contractId: "ctr-8", saleId: "sale-8", customerId: "cust-a10", tier: "G1", schemeId: "scheme-move-b", seller: "mem-svd-a", reservationDaysAgo: 150, stage: "finalized", plan: { paid: 6 }, membership: "pending", method: "Bank Transfer" },
  { contractId: "ctr-9", saleId: "sale-9", customerId: "cust-b3", tier: "S1", schemeId: "scheme-installment-4m", seller: "mem-ost-b1", referrer: "mem-ost-a1", reservationDaysAgo: 145, stage: "finalized", plan: { paid: 5 }, membership: "active", claimAfterDays: 3, method: "Cash" },
  { contractId: "ctr-10", saleId: "sale-10", customerId: "cust-a11", tier: "B1", schemeId: "scheme-move-a", seller: "mem-ost-a2", reservationDaysAgo: 138, stage: "finalized", plan: { paid: 5 }, membership: "active", claimAfterDays: 12, method: "GCash" },
  { contractId: "ctr-11", saleId: "sale-11", customerId: "cust-c2", tier: "S1", schemeId: "scheme-installment-4m", seller: "mem-svd-c", reservationDaysAgo: 128, stage: "finalized", plan: { paid: 3 }, membership: "pending", method: "Bank Transfer" },
  { contractId: "ctr-12", saleId: "sale-12", customerId: "cust-a12", tier: "B1", schemeId: "scheme-installment-4m", seller: "mem-ost-a3", reservationDaysAgo: 124, stage: "finalized", plan: { paid: 5 }, membership: "active", claimAfterDays: 5, method: "Cash" },
  { contractId: "ctr-13", saleId: "sale-13", customerId: "cust-b4", tier: "G1", schemeId: "scheme-installment-4m", seller: "mem-svd-b", reservationDaysAgo: 118, stage: "finalized", plan: { paid: 3, next: "submitted" }, membership: "pending", method: "Cheque" },
  { contractId: "ctr-14", saleId: "sale-14", customerId: "cust-a13", tier: "S1", schemeId: "scheme-spot-cash", seller: "mem-ost-a4", reservationDaysAgo: 100, stage: "finalized", plan: { paid: 2 }, membership: "active", claimAfterDays: 7, financialHold: false, method: "Bank Transfer" },
  { contractId: "ctr-15", saleId: "sale-15", customerId: "cust-c3", tier: "B1", schemeId: "scheme-installment-4m", seller: "mem-sm-c", reservationDaysAgo: 96, stage: "finalized", plan: { paid: 3, next: "returned", nextReason: "The deposit slip photo is unreadable. Please upload a clear copy." }, membership: "pending", method: "GCash" },
  { contractId: "ctr-16", saleId: "sale-16", customerId: "cust-b5", tier: "S1", schemeId: "scheme-installment-4m", seller: "mem-ost-b2", reservationDaysAgo: 92, stage: "finalized", plan: { paid: 4 }, membership: "pending", method: "Bank Transfer" },
  { contractId: "ctr-17", saleId: "sale-17", customerId: "cust-a14", tier: "B1", schemeId: "scheme-installment-4m", seller: "mem-ost-a1", reservationDaysAgo: 176, stage: "cancelled", plan: { paid: 3 }, membership: "cancelled", method: "GCash",
    cancellation: { daysAgo: 12, ground: "non_payment", reason: "No payment for the third and fourth installments after two written reminders." } },
  { contractId: "ctr-18", saleId: "sale-18", customerId: "cust-c4", tier: "G1", schemeId: "scheme-installment-4m", seller: "mem-svd-c", referrer: "mem-sm-c", reservationDaysAgo: 68, stage: "finalized", plan: { paid: 3, next: "rejected", nextReason: "Duplicate of a receipt already verified for this contract." }, membership: "pending", method: "Bank Transfer" },
  { contractId: "ctr-19", saleId: "sale-19", customerId: "cust-b6", tier: "B1", schemeId: "scheme-spot-cash", seller: "mem-ost-b1", reservationDaysAgo: 62, stage: "finalized", plan: { paid: 2 }, membership: "pending", method: "Cash" },
  { contractId: "ctr-20", saleId: "sale-20", customerId: "cust-a15", tier: "S1", schemeId: "scheme-move-b", seller: "mem-ost-a3", reservationDaysAgo: 58, stage: "finalized", plan: { paid: 3 }, membership: "pending", method: "Bank Transfer" },
  { contractId: "ctr-21", saleId: "sale-21", customerId: "cust-a16", tier: "G1", schemeId: "scheme-installment-4m", seller: "mem-ssm-a", reservationDaysAgo: 52, stage: "finalized", plan: { paid: 2 }, membership: "pending", method: "Bank Transfer",
    nonStandard: { priceCentavos: peso(390000), months: 10, justification: "Corporate buyer paying through monthly payroll deduction; ten equal payments approved instead of four." } },
  { contractId: "ctr-22", saleId: "sale-22", customerId: "cust-b7", tier: "S1", schemeId: "scheme-installment-4m", seller: "mem-ssm-b", reservationDaysAgo: 38, stage: "finalized", plan: { paid: 2, next: "submitted", duplicateNext: true }, membership: "pending", method: "GCash" },
  { contractId: "ctr-23", saleId: "sale-23", customerId: "cust-c5", tier: "B1", schemeId: "scheme-installment-4m", seller: "mem-ost-c1", reservationDaysAgo: 33, stage: "finalized", plan: { paid: 1, next: "submitted" }, membership: "pending", method: "Cash" },
  { contractId: "ctr-24", saleId: "sale-24", customerId: "cust-a17", tier: "B1", schemeId: "scheme-installment-4m", seller: "mem-ost-a4", reservationDaysAgo: 30, stage: "finalized", plan: { paid: 2 }, membership: "pending", method: "GCash" },
  { contractId: "ctr-25", saleId: "sale-25", customerId: "cust-b8", tier: "G1", schemeId: "scheme-spot-cash", seller: "mem-svd-b", reservationDaysAgo: 12, stage: "finalized", plan: { paid: 1, next: "submitted" }, membership: "pending", method: "Bank Transfer" },
  { contractId: "ctr-26", saleId: "sale-26", customerId: "cust-a18", tier: "S1", schemeId: "scheme-installment-4m", seller: "mem-ost-a2", reservationDaysAgo: 6, stage: "under_review", plan: { paid: 0, next: "submitted" }, method: "Cash" },
  { contractId: "ctr-27", saleId: "sale-27", customerId: "cust-c6", tier: "B1", schemeId: "scheme-installment-4m", seller: "mem-ost-c1", reservationDaysAgo: 4, stage: "returned", plan: { paid: 0, next: "submitted" }, method: "GCash",
    returnReason: "The customer's signature on page 3 of the Reservation Agreement is missing." },
  { contractId: "ctr-28", saleId: "sale-28", customerId: "cust-a19", tier: "S1", schemeId: "scheme-installment-4m", seller: "mem-ost-a3", reservationDaysAgo: 1, stage: "draft", plan: { paid: 0 } },
];

/** Sample commission rates (synthetic; each seller's real rate comes from their signed service terms, doc 08). */
export const SAMPLE_VIP_RATES = { DSC: 500, DRI: 200 } as const;
export const SAMPLE_IGP_RATES = { DSC: 300, DRI: 100 } as const;

export type BusinessSeed = {
  customers: Customer[];
  contracts: Contract[];
  sales: Sale[];
  payments: Payment[];
  memberships: Membership[];
  commissions: Commission[];
  commissionRateSettings: CommissionRateSetting[];
  vipPositionRates: VipPositionRate[];
  resortSpends: ResortSpend[];
  customerImportJobs: CustomerImportJob[];
  counters: Record<string, number>;
};

type Ctx = {
  clock: SeedClock;
  members: readonly OrgMember[];
  products: readonly VipProduct[];
  schemes: readonly PaymentScheme[];
  customers: Customer[];
  payments: Payment[];
  vipSequence: Map<string, number>;
};

export function genealogyOf(members: readonly OrgMember[], memberId: string): GenealogyEntry[] {
  const chain: GenealogyEntry[] = [];
  const seen = new Set<string>();
  let current = members.find((member) => member.id === memberId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.push({ memberId: current.id, displayName: current.displayName, designation: current.designation });
    current = current.parentId ? members.find((member) => member.id === current!.parentId) : undefined;
  }
  return chain;
}

function issueVipNumber(ctx: Ctx, date: string, tier: VipTierCode, paymentCode: string, classification: "S" | "N"): string {
  const month = date.slice(0, 7);
  const sequence = (ctx.vipSequence.get(month) ?? 0) + 1;
  ctx.vipSequence.set(month, sequence);
  return buildVipNumber(date, sequence, tier, paymentCode, classification);
}

const BANK_IDS = ["ref-bank-1", "ref-bank-2", "ref-bank-3", "ref-bank-5"];

function receipt(ctx: Ctx, input: {
  id: string; contractId: string; customerId: string; saleId: string | null; purpose: PaymentPurpose; amountCentavos: number; method: PaymentMethod;
  paidDate: string; status: Payment["status"]; submittedBy: string; verifyAfterDays?: number; reason?: string | null; serial: number;
}): Payment {
  const { clock } = ctx;
  const verifiedDate = input.status === "verified" ? clock.addDays(input.paidDate, Math.min(input.verifyAfterDays ?? 1, Math.max(0, daysBetween(input.paidDate, clock.today)))) : null;
  const documentNo = input.method === "Cash"
    ? nextOfficialReceiptNo(ctx.payments, input.paidDate)
    : input.method === "Bank Transfer" ? `AR-${String(41_200 + input.serial * 7).padStart(7, "0")}`
      : input.method === "Cheque" ? `CHK-${String(830_000 + input.serial * 13)}`
        : `${input.method === "GCash" ? "GC" : "MY"}${String(9_000_000_000_000 + input.serial * 104_729).slice(0, 13)}`;
  const decidedAt = input.status === "returned" || input.status === "rejected" ? clock.addDays(input.paidDate, 1) : null;
  const payment: Payment = {
    id: input.id, contractId: input.contractId, customerId: input.customerId, saleId: input.saleId, purpose: input.purpose,
    amountCentavos: input.amountCentavos, method: input.method, paidDate: input.paidDate,
    referenceNo: nextPaymentReference(ctx.payments, input.paidDate), documentNo,
    evidenceFileName: `${input.method === "Cash" ? "official-receipt" : input.method === "Cheque" ? "cheque" : input.method === "Bank Transfer" ? "deposit-slip" : "gcash-receipt"}-${input.paidDate.replaceAll("-", "")}.jpg`,
    ...(input.method === "Bank Transfer" || input.method === "Cheque" ? { bankId: BANK_IDS[input.serial % BANK_IDS.length] } : {}),
    submittedBy: input.submittedBy, submittedAt: input.paidDate, status: input.status,
    verifiedBy: verifiedDate ? "dev-finance" : null, verifiedAt: verifiedDate ? clock.at(verifiedDate, "15:10") : null, verifiedDate,
    decisionReason: input.reason ?? null, adjustments: [],
    history: [
      { at: clock.at(input.paidDate, "10:00"), actorId: input.submittedBy, event: "PAYMENT_SUBMITTED", note: null },
      ...(verifiedDate ? [{ at: clock.at(verifiedDate, "15:10"), actorId: "dev-finance", event: "PAYMENT_VERIFIED", note: null }] : []),
      ...(decidedAt ? [{ at: clock.at(decidedAt, "11:30"), actorId: "dev-finance", event: input.status === "returned" ? "PAYMENT_RETURNED" : "PAYMENT_REJECTED", note: input.reason ?? null }] : []),
    ],
  };
  ctx.payments.push(payment);
  return payment;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

const SUBMITTER_BY_METHOD: Record<string, string> = { Cash: "dev-clerk", Cheque: "dev-clerk" };

type DealResult = { contract: Contract; sale: Sale; membership: Membership | null; payments: Payment[] };

function buildDeal(ctx: Ctx, deal: DealSpec, paymentSerial: { value: number }): DealResult {
  const { clock } = ctx;
  const product = ctx.products.find((item) => item.code === deal.tier)!;
  const scheme = ctx.schemes.find((item) => item.id === deal.schemeId)!;
  const reservation = clock.ago(deal.reservationDaysAgo);
  const standard = buildSchedule(product, scheme, reservation);
  const custom = deal.nonStandard ? buildNonStandardSchedule(deal.nonStandard.priceCentavos, scheme.reservationCentavos ?? 0, deal.nonStandard.months, reservation) : null;
  const schedule: ScheduleItem[] = (custom?.schedule ?? standard.schedule).map((line) =>
    line.dueDate ? line : { ...line, dueDate: clock.addDays(reservation, 14) });
  const priceCentavos = deal.nonStandard?.priceCentavos ?? standard.priceCentavos;
  const classification = deal.nonStandard ? "N" as const : "S" as const;
  const paymentCode = deal.nonStandard ? `T${String(deal.nonStandard.months).padStart(2, "0")}` : paymentCodeFor(scheme, deal.tier);
  const team = genealogyOf(ctx.members, deal.seller);
  const preparer = `dev-${deal.seller.replace("mem-", "")}`;
  const createdAt = clock.addDays(reservation, -1);
  const submitted = deal.stage === "draft" ? null : reservation;
  const approved = submitted && deal.stage !== "returned" && deal.stage !== "under_review" ? clock.addDays(submitted, 1) : null;
  const finalized = approved && (deal.stage === "finalized" || deal.stage === "cancelled") ? clock.addDays(approved, 1) : null;

  // Receipts: each paid line on its due date (never in the future), verified a day later.
  const contractPayments: Payment[] = [];
  const method = deal.method ?? "Bank Transfer";
  const submitter = SUBMITTER_BY_METHOD[method] ?? (preparer.startsWith("dev-ost") || preparer.startsWith("dev-sm") ? "dev-clerk" : "dev-clerk");
  for (let index = 0; index < deal.plan.paid; index += 1) {
    const line = schedule[index];
    const due = line.dueDate! > clock.ago(1) ? clock.ago(1) : line.dueDate!;
    paymentSerial.value += 1;
    contractPayments.push(receipt(ctx, {
      id: `pay-${paymentSerial.value}`, contractId: deal.contractId, customerId: deal.customerId, saleId: deal.saleId, purpose: line.purpose,
      amountCentavos: line.amountCentavos, method, paidDate: due, status: "verified", submittedBy: submitter, serial: paymentSerial.value,
    }));
  }
  if (deal.plan.next) {
    const line = schedule[deal.plan.paid];
    const due = line.dueDate! > clock.today ? clock.today : line.dueDate!;
    const paidDate = due > clock.ago(1) && deal.plan.next !== "submitted" ? clock.ago(1) : due;
    const copies = deal.plan.duplicateNext ? 2 : 1;
    for (let copy = 0; copy < copies; copy += 1) {
      paymentSerial.value += 1;
      contractPayments.push(receipt(ctx, {
        id: `pay-${paymentSerial.value}`, contractId: deal.contractId, customerId: deal.customerId, saleId: deal.saleId, purpose: line.purpose,
        amountCentavos: line.amountCentavos, method, paidDate, status: deal.plan.next, submittedBy: submitter, reason: deal.plan.nextReason ?? null, serial: paymentSerial.value,
      }));
    }
  }

  const vipNumber = finalized && paymentCode ? issueVipNumber(ctx, finalized, deal.tier, paymentCode, classification) : undefined;
  const history: ContractEvent[] = [];
  if (submitted) history.push({ at: clock.at(submitted, "11:00"), actorId: preparer, event: "CONTRACT_SUBMITTED", note: null });
  if (deal.stage === "returned") history.push({ at: clock.at(clock.addDays(reservation, 1), "16:20"), actorId: "dev-admin", event: "CONTRACT_RETURNED", note: deal.returnReason ?? null });
  if (vipNumber && finalized) history.push({ at: clock.at(finalized, "10:00"), actorId: "dev-admin", event: "CONTRACT_RA_RECORDED", note: null });
  if (finalized) history.push({ at: clock.at(finalized, "10:05"), actorId: "dev-admin", event: "CONTRACT_FINALIZED", note: null });

  const sale: Sale = {
    id: deal.saleId, contractId: deal.contractId, customerId: deal.customerId, productCode: deal.tier, branchId: ctx.members.find((m) => m.id === deal.seller)!.branchId,
    valueCentavos: priceCentavos, recordedDate: submitted ?? createdAt, approval: approved ? { approvedAt: approved, approvedBy: "dev-admin" } : null,
    ...(vipNumber ? {
      commissionRates: [
        { memberId: deal.seller, role: "DSC" as const, rateBp: SAMPLE_VIP_RATES.DSC },
        ...(deal.referrer ? [{ memberId: deal.referrer, role: "DRI" as const, rateBp: SAMPLE_VIP_RATES.DRI }] : []),
      ],
      closedDealThresholdBp: VIP_CLOSED_DEAL_THRESHOLD_BP,
    } : {}),
    sellerMemberId: deal.seller, referrerMemberId: deal.referrer ?? null, team, status: "pending", confirmedDate: null, adjustments: [],
  };
  const collection = collectionState({ priceCentavos }, contractPayments, sale);
  if (sale.approval && collection.confirmation && finalized) {
    sale.status = "confirmed";
    sale.confirmedDate = collection.confirmation.date;
    sale.adjustments.push({ id: `adj-${deal.saleId.split("-")[1]}`, date: collection.confirmation.countedDate, amountCentavos: priceCentavos, kind: "confirmation", reason: "Approved collection reached 25%", actorId: "system" });
  }
  if (deal.cancellation) {
    const date = clock.ago(deal.cancellation.daysAgo);
    if (sale.status === "confirmed") sale.adjustments.push({ id: `adj-${deal.saleId.split("-")[1]}r`, date, amountCentavos: -priceCentavos, kind: "reversal", reason: "Contract cancelled for non-payment", actorId: "dev-admin" });
    sale.status = "cancelled";
    history.push({ at: clock.at(date, "14:40"), actorId: "dev-admin", event: "CONTRACT_CANCELLED", note: deal.cancellation.reason });
  }

  const contract: Contract = {
    id: deal.contractId, customerId: deal.customerId, productCode: deal.tier, productConfigVersion: product.configVersion, priceCentavos,
    priceStatus: "contract_stated", schemeId: scheme.id, schemeLabel: deal.nonStandard ? `Non-Standard, ${deal.nonStandard.months} monthly payments` : scheme.label, schemeStatus: scheme.commercialStatus,
    paymentCode: paymentCode ?? null, classification, validityYears: product.validityYears, benefits: snapshotBenefits(product), schedule,
    requiredInitialCentavos: custom?.requiredInitialCentavos ?? standard.requiredInitialCentavos,
    raNumber: vipNumber ?? null, ...(vipNumber ? { vipNumber, signedAgreementRecordedDate: finalized! } : {}),
    sellerMemberId: deal.seller, referrerMemberId: deal.referrer ?? null, genealogy: team,
    status: deal.stage === "cancelled" ? "cancelled" : deal.stage, customerAccepted: deal.stage !== "draft", preparedBy: preparer,
    createdAt, submittedAt: submitted, reviewedBy: approved ? "dev-admin" : deal.stage === "returned" ? "dev-admin" : null, finalizedAt: finalized,
    returnReason: deal.returnReason ?? null, cancelReason: deal.cancellation?.reason ?? null,
    ...(deal.cancellation ? { cancellation: {
      ground: deal.cancellation.ground, reason: deal.cancellation.reason, requestedBy: "dev-admin", requestedAt: clock.at(clock.ago(deal.cancellation.daysAgo + 3), "09:30"),
      status: "confirmed" as const, decidedBy: "dev-super-admin", decidedAt: clock.at(clock.ago(deal.cancellation.daysAgo), "14:40"), forfeitedCentavos: scheme.reservationCentavos,
    } } : {}),
    ...(deal.nonStandard ? { nonStandard: {
      justification: deal.nonStandard.justification, standardPriceCentavos: standard.priceCentavos, standardInstallments: scheme.installmentCount ?? 4,
      approvedBy: "dev-admin", approvedAt: clock.at(approved!, "09:15"), approvalReference: "ADM-NS-0007", selfApproved: false,
      confirmedBy: "dev-finance", confirmedAt: clock.at(approved!, "13:40"),
    } } : {}),
    history,
  };

  let membership: Membership | null = null;
  if (finalized && deal.membership) {
    membership = {
      id: `memb-${deal.contractId.split("-")[1]}`, customerId: deal.customerId, contractId: deal.contractId, productCode: deal.tier,
      status: deal.membership, activationDate: null, validityEndDate: null, cardId: null, raNumber: contract.raNumber, financialHold: false,
      createdAt: finalized, history: [],
    };
    if (deal.membership === "active" && collection.fullPayment && vipNumber) {
      const notAfterToday = (date: string) => (date > clock.today ? clock.today : date);
      const activation = notAfterToday(clock.addDays(collection.fullPayment.date, 2));
      const claim = notAfterToday(clock.addDays(collection.fullPayment.date, deal.claimAfterDays ?? 5));
      membership.activationDate = activation;
      membership.fullSettlementDate = collection.fullPayment.date;
      membership.cardId = vipNumber;
      membership.cardClaimDate = claim;
      membership.cardClaimKind = "actual";
      membership.validityEndDate = computeValidityEnd(claim, product.validityYears);
      membership.financialHold = deal.financialHold ?? false;
      membership.history = [
        { at: clock.at(activation, "10:20"), actorId: "dev-admin", event: "MEMBERSHIP_ACTIVATED", note: null },
        { at: clock.at(claim, "15:45"), actorId: "dev-clerk", event: "CARD_CLAIM_RECORDED", note: claim },
      ];
    }
    if (deal.membership === "cancelled") {
      membership.history = [{ at: clock.at(clock.ago(deal.cancellation!.daysAgo), "14:45"), actorId: "dev-super-admin", event: "MEMBERSHIP_CANCELLED", note: deal.cancellation!.reason }];
    }
  }
  return { contract, sale, membership, payments: contractPayments };
}

/** The four contracts kept from the earlier seed, dated relative to today. */
function buildLegacyDeals(ctx: Ctx): { contracts: Contract[]; sales: Sale[]; payments: Payment[]; memberships: Membership[] } {
  const { clock } = ctx;
  const product = (code: VipTierCode) => ctx.products.find((item) => item.code === code)!;
  const installment = ctx.schemes.find((item) => item.id === "scheme-installment-4m")!;
  const schedule = (code: VipTierCode, dues: (string | null)[]) => buildSchedule(product(code), installment).schedule.map((line, index) => ({ ...line, dueDate: dues[index] ?? null }));
  const required = (code: VipTierCode) => buildSchedule(product(code), installment).requiredInitialCentavos;
  const base = (id: string, customerId: string, code: VipTierCode, seller: string) => ({
    id, customerId, productCode: code, productConfigVersion: 1, priceCentavos: product(code).priceCentavos, priceStatus: "contract_stated" as const,
    schemeId: installment.id, schemeLabel: installment.label, schemeStatus: installment.commercialStatus, paymentCode: installment.paymentCode,
    classification: "S" as const, validityYears: product(code).validityYears, benefits: snapshotBenefits(product(code)),
    sellerMemberId: seller, genealogy: genealogyOf(ctx.members, seller), customerAccepted: true, reviewedBy: null, finalizedAt: null, returnReason: null, cancelReason: null,
  });
  const a = (days: number) => clock.ago(days);

  const ctr2CardDate = a(21);
  const ctr2Vip = issueVipNumber(ctx, ctr2CardDate, "B1", "T04", "S");
  const contracts: Contract[] = [
    { ...base("ctr-1", "cust-a1", "S1", "mem-ost-a1"), schedule: schedule("S1", [a(54), a(24), a(18), clock.ahead(12), clock.ahead(43)]),
      requiredInitialCentavos: required("S1"), raNumber: null, status: "finalized", preparedBy: "dev-ost-a1", createdAt: a(55),
      submittedAt: a(54), reviewedBy: "dev-admin", finalizedAt: a(53),
      history: [{ at: a(54), actorId: "dev-ost-a1", event: "CONTRACT_SUBMITTED", note: null }, { at: a(53), actorId: "dev-admin", event: "CONTRACT_FINALIZED", note: null }] },
    { ...base("ctr-2", "cust-b1", "B1", "mem-ost-b1"), schedule: schedule("B1", [a(32), a(24), a(23), a(22), a(21)]),
      requiredInitialCentavos: required("B1"), raNumber: ctr2Vip, vipNumber: ctr2Vip, signedAgreementRecordedDate: ctr2CardDate, status: "finalized", preparedBy: "dev-ost-b1", createdAt: a(33),
      submittedAt: a(32), reviewedBy: "dev-admin", finalizedAt: a(31),
      // Cancellation Requests shows this record. assertCancellable still rejects
      // new requests on this contract (Active membership).
      cancellation: { ground: "non_payment", reason: "Two missed installments after the reservation fee.", requestedBy: "dev-admin", requestedAt: clock.at(a(15)), status: "requested", decidedBy: null, decidedAt: null, forfeitedCentavos: null },
      history: [{ at: a(32), actorId: "dev-ost-b1", event: "CONTRACT_SUBMITTED", note: null }, { at: a(31), actorId: "dev-admin", event: "CONTRACT_FINALIZED", note: null }] },
    { ...base("ctr-3", "cust-a3", "G1", "mem-sm-a"), schedule: schedule("G1", [null, null, null, null, null]),
      requiredInitialCentavos: required("G1"), raNumber: null, status: "under_review", preparedBy: "dev-sm-a", createdAt: a(20),
      submittedAt: a(19),
      history: [{ at: a(19), actorId: "dev-sm-a", event: "CONTRACT_SUBMITTED", note: null }, { at: a(13), actorId: "owner", event: "CONTRACT_REVISED", note: "Owner ruling 2026-11-10 (doc 05 item 11): Gold price conflict resolved; snapshot at ₱390,000." }] },
    { ...base("ctr-4", "cust-a4", "B1", "mem-ost-a2"), schedule: schedule("B1", [a(13), null, null, null, null]),
      requiredInitialCentavos: required("B1"), raNumber: null, status: "under_review", preparedBy: "dev-ost-a2", createdAt: a(18),
      submittedAt: a(17),
      history: [{ at: a(17), actorId: "dev-ost-a2", event: "CONTRACT_SUBMITTED", note: null }] },
  ];
  const sales: Sale[] = [
    { id: "sale-1", contractId: "ctr-1", customerId: "cust-a1", productCode: "S1", branchId: "branch-a", valueCentavos: peso(240000), recordedDate: a(54),
      sellerMemberId: "mem-ost-a1", referrerMemberId: "mem-ost-b1", team: genealogyOf(ctx.members, "mem-ost-a1"), status: "confirmed", confirmedDate: a(26),
      adjustments: [{ id: "adj-1", date: a(26), amountCentavos: peso(240000), kind: "confirmation", reason: "Required initial payment verified by Finance", actorId: "dev-finance" }] },
    { id: "sale-2", contractId: "ctr-2", customerId: "cust-b1", productCode: "B1", branchId: "branch-b", valueCentavos: peso(72000), recordedDate: a(32),
      sellerMemberId: "mem-ost-b1", referrerMemberId: null, team: genealogyOf(ctx.members, "mem-ost-b1"), status: "confirmed", confirmedDate: a(24),
      adjustments: [{ id: "adj-2", date: a(24), amountCentavos: peso(72000), kind: "confirmation", reason: "Required initial payment verified by Finance", actorId: "dev-finance" }] },
    { id: "sale-3", contractId: "ctr-3", customerId: "cust-a3", productCode: "G1", branchId: "branch-a", valueCentavos: peso(390000), recordedDate: a(19),
      sellerMemberId: "mem-sm-a", referrerMemberId: null, team: genealogyOf(ctx.members, "mem-sm-a"), status: "pending", confirmedDate: null, adjustments: [] },
    { id: "sale-4", contractId: "ctr-4", customerId: "cust-a4", productCode: "B1", branchId: "branch-a", valueCentavos: peso(72000), recordedDate: a(17),
      sellerMemberId: "mem-ost-a2", referrerMemberId: null, team: genealogyOf(ctx.members, "mem-ost-a2"), status: "pending", confirmedDate: null, adjustments: [] },
  ].map((sale) => ({ ...sale, approval: { approvedAt: sale.recordedDate, approvedBy: "dev-admin" } })) as Sale[];

  const legacy = (id: string, contractId: string, customerId: string, saleId: string, purpose: PaymentPurpose, amount: number, paidDate: string, status: Payment["status"], submittedBy: string, serial: number) =>
    receipt(ctx, { id, contractId, customerId, saleId, purpose, amountCentavos: amount, method: "Bank Transfer", paidDate, status, submittedBy, serial, verifyAfterDays: 0 });
  const payments: Payment[] = [
    legacy("pay-1", "ctr-1", "cust-a1", "sale-1", "reservation", peso(10000), a(54), "verified", "dev-ost-a1", 1),
    legacy("pay-2", "ctr-1", "cust-a1", "sale-1", "installment", peso(57500), a(26), "verified", "dev-ost-a1", 2),
    legacy("pay-3", "ctr-2", "cust-b1", "sale-2", "reservation", peso(10000), a(32), "verified", "dev-ost-b1", 3),
    legacy("pay-4", "ctr-4", "cust-a4", "sale-4", "reservation", peso(10000), a(16), "submitted", "dev-ost-a2", 4),
    legacy("pay-5", "ctr-2", "cust-b1", "sale-2", "installment", peso(15500), a(24), "verified", "dev-ost-b1", 5),
    legacy("pay-6", "ctr-2", "cust-b1", "sale-2", "installment", peso(15500), a(23), "verified", "dev-ost-b1", 6),
    legacy("pay-7", "ctr-2", "cust-b1", "sale-2", "installment", peso(15500), a(22), "verified", "dev-ost-b1", 7),
    legacy("pay-8", "ctr-2", "cust-b1", "sale-2", "installment", peso(15500), a(21), "verified", "dev-ost-b1", 8),
  ];
  const memberships: Membership[] = [
    { id: "memb-1", customerId: "cust-b1", contractId: "ctr-2", productCode: "B1", status: "active", activationDate: ctr2CardDate,
      validityEndDate: computeValidityEnd(ctr2CardDate, 7), cardClaimDate: ctr2CardDate, fullSettlementDate: ctr2CardDate, cardClaimKind: "actual", cardId: ctr2Vip, raNumber: ctr2Vip, financialHold: true, createdAt: a(24),
      history: [{ at: clock.at(ctr2CardDate, "10:20"), actorId: "dev-admin", event: "MEMBERSHIP_ACTIVATED", note: null }] },
    { id: "memb-2", customerId: "cust-a1", contractId: "ctr-1", productCode: "S1", status: "pending", activationDate: null,
      validityEndDate: null, cardId: null, raNumber: null, financialHold: false, createdAt: a(53), history: [] },
  ];
  return { contracts, sales, payments, memberships };
}

/**
 * Per-sale commissions (doc 08): DSC and DRI at the frozen rate, 100% released
 * in the month the sale first reaches 40% approved collection. Payout state
 * follows the month: lists of closed months are prepared at close; the older
 * closed month is fully paid, the latest one is approved and partly paid.
 */
/** Closed months of the seed: every month up to `latest` is closed; lists of months up to `paidThrough` are fully paid. */
export type ClosedPeriods = { months: readonly string[]; paidThrough: string; latest: string };

/** A released commission record (doc 08 §8.2): one per stage and DSC or DRI role. */
export function releasedCommission(clock: SeedClock, input: {
  id: string; saleId: string; contractId: string; member: Pick<OrgMember, "id" | "displayName" | "designation">; basisCentavos: number; rate: FrozenCommissionRate;
  amountCentavos: number; product: "VIP" | "IGP"; stage: "stage1" | "full"; releaseDate: string;
}): Commission {
  return {
    id: input.id, saleId: input.saleId, contractId: input.contractId, recipientMemberId: input.member.id, recipientName: input.member.displayName, recipientDesignation: input.member.designation,
    basisCentavos: input.basisCentavos, percentBp: input.rate.rateBp, amountCentavos: input.amountCentavos, product: input.product, role: input.rate.role, stage: input.stage,
    releaseDate: input.releaseDate, status: "released", approvedBy: "", approvedAt: "", holdReason: null, payout: null,
    history: [{ at: clock.at(input.releaseDate, "18:00"), actorId: "system", event: "COMMISSION_RELEASED", note: null }],
  };
}

/**
 * Payout state by release month: the system prepares each closed month's list at
 * close (doc 08 §11.1(4)), people approve and pay it. Months up to `paidThrough`
 * are paid; the latest closed month is approved and partly paid; open months stay
 * Released until their month closes. Approved is never Paid (doc 08 §12).
 */
export function settleCommissions(clock: SeedClock, commissions: Commission[], closed: ClosedPeriods, paidSaleIds: ReadonlySet<string> = new Set()): void {
  const pay = (commission: Commission, payoutDate: string, serial: number, confirm: boolean) => {
    commission.payout = { reference: `DSB-${payoutDate.replaceAll("-", "")}-${String(serial).padStart(3, "0")}`, method: "Bank Transfer", payoutDate,
      processedBy: "dev-finance", initiatedAt: clock.at(payoutDate, "11:00"), confirmedAt: null, evidenceFileName: `payout-advice-${payoutDate.replaceAll("-", "")}.pdf` };
    commission.history.push({ at: clock.at(payoutDate, "11:00"), actorId: "dev-finance", event: "COMMISSION_PAYOUT_RECORDED", note: null });
    if (!confirm) return;
    commission.status = "paid";
    commission.payout.confirmedAt = clock.at(payoutDate, "16:30");
    commission.payout.countedDate = payoutDate;
    commission.history.push({ at: clock.at(payoutDate, "16:30"), actorId: "dev-finance", event: "COMMISSION_PAID", note: null });
  };
  let serial = 1;
  let latestIndex = 0;
  for (const commission of commissions) {
    const month = commission.releaseDate?.slice(0, 7);
    if (!month || commission.status !== "released" || !closed.months.includes(month)) continue;
    const payoutMonthStart = clock.addMonths(`${month}-01`, 1);
    const approvedAt = clock.at(clock.addDays(payoutMonthStart, 6), "10:00");
    commission.status = "approved";
    commission.approvedBy = "dev-admin";
    commission.approvedAt = approvedAt;
    commission.history.push({ at: approvedAt, actorId: "dev-admin", event: "COMMISSION_APPROVED", note: null });
    if (month <= closed.paidThrough || paidSaleIds.has(commission.saleId)) {
      pay(commission, clock.addDays(payoutMonthStart, 9), serial++, true);
    } else {
      // Latest closed month: about a third paid, a third recorded and waiting for confirmation, a third waiting for payout.
      const payoutDate = clock.addDays(payoutMonthStart, 11);
      const slot = latestIndex++ % 3;
      if (payoutDate <= clock.ago(1) && slot < 2) pay(commission, payoutDate, serial++, slot === 0);
    }
  }
}

export function buildPayoutLists(clock: SeedClock, commissions: readonly Commission[], closed: ClosedPeriods): CommissionPayoutList[] {
  return closed.months.flatMap((month) => {
    const entries = commissions.filter((item) => item.releaseDate?.slice(0, 7) === month && item.status !== "released");
    if (!entries.length) return [];
    const close = clock.addDays(clock.addMonths(`${month}-01`, 1), 4);
    return [{
      id: "", month,
      entries: entries.map(({ id, saleId, recipientMemberId, amountCentavos }) => ({ commissionId: id, saleId, recipientMemberId, amountCentavos })),
      preparedBy: "system", preparedAt: clock.at(close, "17:05"), approvedBy: "dev-admin", approvedAt: clock.at(clock.addDays(close, 2), "10:00"),
      approvedCommissionIds: entries.map(({ id }) => id),
    }];
  }).map((list, index) => ({ ...list, id: `commission-list-${index + 1}` }));
}

function buildSaleCommissions(clock: SeedClock, members: readonly OrgMember[], sales: readonly Sale[], payments: readonly Payment[], startId: number) {
  const commissions: Commission[] = [];
  let next = startId;
  for (const sale of sales) {
    if (!sale.commissionRates || sale.status === "pending") continue;
    const own = payments.filter((payment) => payment.contractId === sale.contractId);
    const release = collectionState({ priceCentavos: sale.valueCentavos }, own, sale).release;
    if (!release) continue;
    for (const rate of sale.commissionRates as FrozenCommissionRate[]) {
      const [{ amountCentavos }] = commissionStageAmounts(sale.valueCentavos, rate.rateBp, "VIP");
      commissions.push(releasedCommission(clock, {
        id: `comm-${next++}`, saleId: sale.id, contractId: sale.contractId, member: members.find((item) => item.id === rate.memberId)!,
        basisCentavos: sale.valueCentavos, rate, amountCentavos, product: "VIP", stage: "stage1", releaseDate: release.countedDate,
      }));
    }
  }
  return { commissions, next };
}

/** The three display commissions kept from the earlier seed (sale-2). */
function legacyCommissions(clock: SeedClock): Commission[] {
  const a = (days: number) => clock.ago(days);
  return [
    { id: "comm-1", saleId: "sale-2", contractId: "ctr-2", recipientMemberId: "mem-ost-b1", recipientName: "Paolo Ramos", recipientDesignation: "OST",
      basisCentavos: peso(72000), percentBp: 500, amountCentavos: peso(3600), status: "approved",
      approvedBy: "dev-finance", approvedAt: a(24), holdReason: null, payout: null,
      history: [{ at: a(24), actorId: "dev-finance", event: "COMMISSION_APPROVED", note: null }] },
    { id: "comm-2", saleId: "sale-2", contractId: "ctr-2", recipientMemberId: "mem-svd-b", recipientName: "Liza Aquino", recipientDesignation: "SVD",
      basisCentavos: peso(72000), percentBp: 200, amountCentavos: peso(1440), status: "paid",
      approvedBy: "dev-finance", approvedAt: a(26), holdReason: null,
      payout: { reference: `DSB-${a(19).replaceAll("-", "")}-011`, method: "Bank Transfer", payoutDate: a(19), processedBy: "dev-finance", initiatedAt: a(19), confirmedAt: a(18) },
      history: [
        { at: a(26), actorId: "dev-finance", event: "COMMISSION_APPROVED", note: null },
        { at: a(19), actorId: "dev-finance", event: "COMMISSION_PAYOUT_RECORDED", note: null },
        { at: a(18), actorId: "dev-finance", event: "COMMISSION_PAID", note: null },
      ] },
    // A replaced approval, kept on record: cancelled commissions never block a new approval for the same sale.
    { id: "comm-3", saleId: "sale-2", contractId: "ctr-2", recipientMemberId: "mem-ost-b1", recipientName: "Paolo Ramos", recipientDesignation: "OST",
      basisCentavos: peso(72000), percentBp: 300, amountCentavos: peso(2160), status: "cancelled",
      approvedBy: "dev-finance", approvedAt: a(25), holdReason: null, payout: null,
      history: [
        { at: a(25), actorId: "dev-finance", event: "COMMISSION_APPROVED", note: null },
        { at: a(24), actorId: "dev-finance", event: "COMMISSION_CANCELLED", note: "Replaced by the approved 5% entry." },
      ] },
  ];
}

const RESORT_ITEMS: ReadonlyArray<[string, number, string]> = [
  ["Teppanyaki dinner for four", 6_850, "outlet-teppanyaki"],
  ["Deluxe room, two nights", 12_400, "venue-wellness-hotel"],
  ["Hot spring day pass and lunch", 3_200, "venue-hotspring-resort"],
  ["Signature massage, 90 minutes", 2_900, "outlet-spa"],
  ["Family lunch buffet", 4_750, "outlet-teppanyaki"],
  ["Pasalubong and resort souvenirs", 1_850, "outlet-shop"],
  ["Standard room, one night", 5_600, "venue-wellness-hotel"],
  ["Couples spa package", 5_400, "outlet-spa"],
];

function buildResortSpends(clock: SeedClock, memberships: readonly Membership[]): ResortSpend[] {
  const a = (days: number) => clock.ago(days);
  // Kept from the earlier seed on memb-1.
  const spends: ResortSpend[] = [
    { id: "rs-1", membershipId: "memb-1", date: a(19), amountCentavos: peso(400), description: "Resort restaurant", status: "verified", verificationRef: null },
    { id: "rs-2", membershipId: "memb-1", date: a(17), amountCentavos: peso(600), description: "Resort accommodation extras", status: "verified", verificationRef: null },
    { id: "rs-3", membershipId: "memb-1", date: a(16), amountCentavos: peso(500), description: "Resort activity pass (refunded)", status: "voided", verificationRef: null },
  ];
  let serial = 4;
  const carded = memberships.filter((item) => item.cardId && item.cardClaimDate && item.id !== "memb-1");
  carded.forEach((membership, index) => {
    const bills = index % 2 === 0 ? 3 : 2;
    for (let bill = 0; bill < bills; bill += 1) {
      const [description, amount, venueId] = RESORT_ITEMS[(index * 3 + bill) % RESORT_ITEMS.length];
      const date = clock.addDays(membership.cardClaimDate!, 6 + bill * 17 + index * 2);
      if (date >= clock.today) continue;
      const status: ResortSpend["status"] = bill === bills - 1 && index % 3 === 1 && date >= a(10) ? "submitted" : "verified";
      const id = `rs-${serial}`;
      serial += 1;
      spends.push({
        id, membershipId: membership.id, date, amountCentavos: peso(amount), grossCentavos: peso(amount), excludedCentavos: 0, description, status,
        verificationRef: status === "verified" ? `BILL-${date.replaceAll("-", "")}-${String(serial).padStart(3, "0")}` : null, venueId, holder: "primary",
        enteredBy: "dev-gsd", ...(status === "verified" ? { approvedBy: "dev-finance", approvedDate: clock.addDays(date, 1) > clock.today ? date : clock.addDays(date, 1) } : {}),
      });
    }
  });
  return spends;
}

export function buildBusiness(clock: SeedClock, members: readonly OrgMember[], products: readonly VipProduct[], schemes: readonly PaymentScheme[]): BusinessSeed {
  const customers = buildCustomers(clock);
  const ctx: Ctx = { clock, members, products, schemes, customers, payments: [], vipSequence: new Map() };
  const legacy = buildLegacyDeals(ctx);
  const serial = { value: 8 };
  const deals = DEALS.map((deal) => buildDeal(ctx, deal, serial));
  const contracts = [...legacy.contracts, ...deals.map((item) => item.contract)];
  const sales = [...legacy.sales, ...deals.map((item) => item.sale)];
  const payments = ctx.payments;
  const memberships = [...legacy.memberships, ...deals.flatMap((item) => (item.membership ? [item.membership] : []))];

  // Sellers named on contracts carry approved DSC and DRI rates (the issued VIP Numbers froze them).
  const rateMembers = members.filter((member) => member.status === "active");
  const commissionRateSettings: CommissionRateSetting[] = rateMembers.flatMap((member) => [
    { memberId: member.id, product: "VIP" as const, role: "DSC" as const, rateBp: SAMPLE_VIP_RATES.DSC, standardRateBp: SAMPLE_VIP_RATES.DSC },
    { memberId: member.id, product: "VIP" as const, role: "DRI" as const, rateBp: SAMPLE_VIP_RATES.DRI, standardRateBp: SAMPLE_VIP_RATES.DRI },
    ...(member.designation !== "OST" ? [
      { memberId: member.id, product: "IGP" as const, role: "DSC" as const, rateBp: SAMPLE_IGP_RATES.DSC, standardRateBp: null },
      { memberId: member.id, product: "IGP" as const, role: "DRI" as const, rateBp: SAMPLE_IGP_RATES.DRI, standardRateBp: null },
    ] : []),
  ]);
  const vipPositionRates: VipPositionRate[] = (["SVD", "SSM", "SM", "OST"] as const).flatMap((designation) => [
    { designation, role: "DSC" as const, rateBp: SAMPLE_VIP_RATES.DSC, approvalReference: "ADM-MEMO-2026-031" },
    { designation, role: "DRI" as const, rateBp: SAMPLE_VIP_RATES.DRI, approvalReference: "ADM-MEMO-2026-031" },
  ]);

  const kept = legacyCommissions(clock);
  const { commissions: saleCommissions, next } = buildSaleCommissions(clock, members, sales, payments, kept.length + 1);
  const commissions = [...kept, ...saleCommissions];
  const resortSpends = buildResortSpends(clock, memberships);

  const importedIds = customers.filter((customer) => customer.branchId === "branch-b" && customer.status !== "draft").map((customer) => customer.id);
  const walkIns = customers.filter((customer) => customer.acquisitionChannel === "Walk-In").map((customer) => customer.id);
  const customerImportJobs: CustomerImportJob[] = [
    { id: "imp-1", fileName: "team-sinag-customers.xlsx", createdAt: clock.at(clock.ago(150), "10:15"), actorId: "dev-admin",
      totalRows: importedIds.length, createdCount: importedIds.length, needsReviewCount: 0, invalidCount: 0, createdCustomerIds: importedIds },
    { id: "imp-2", fileName: "walk-in-registrations.csv", createdAt: clock.at(clock.ago(30), "14:40"), actorId: "dev-admin",
      totalRows: walkIns.length + 3, createdCount: walkIns.length, needsReviewCount: 2, invalidCount: 1, createdCustomerIds: walkIns },
  ];

  const highest = (items: Array<{ id: string }>, prefix: string) => Math.max(0, ...items.map((item) => Number(item.id.replace(`${prefix}-`, "")) || 0));
  const counters: Record<string, number> = {
    contract: highest(contracts, "ctr") + 1, sale: highest(sales, "sale") + 1, payment: highest(payments, "pay") + 1,
    membership: highest(memberships, "memb") + 1, commission: next, adjustment: highest(sales.flatMap((sale) => sale.adjustments), "adj") + 1,
    resortSpend: highest(resortSpends, "rs") + 1, customerImport: 3,
  };
  for (const [month, sequence] of ctx.vipSequence) counters[`vip-number:${month}`] = sequence;

  return { customers, contracts, sales, payments, memberships, commissions, commissionRateSettings, vipPositionRates, resortSpends, customerImportJobs, counters };
}
