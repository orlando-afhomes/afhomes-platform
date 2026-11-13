import type { CommissionView } from "@/data/contracts/commission-repository";
import { humanize } from "@/shared/lib/humanize";
import type { ContractView } from "@/data/contracts/contract-repository";
import type { MembershipView } from "@/data/contracts/membership-repository";
import type { PaymentView } from "@/data/contracts/payment-repository";
import type { SaleView } from "@/data/contracts/sale-repository";
import type { Customer } from "@/modules/customers/types";
import { collectionStateFor, paymentCountedDate } from "@/modules/finance/rules";
import { confirmedValueInPeriod, teamSales } from "@/modules/sales/rules";
import type { OrgMember } from "@/modules/organization/types";
import { addDaysToDate, manilaDateOf } from "@/shared/lib/dates";

export function countVisibleMembers(members: readonly { id: string }[]) {
  return members.length;
}

export function countVisibleCustomers(customers: readonly { id: string }[]) {
  return customers.length;
}

export function countUplines(uplines: readonly { id: string }[]) {
  return uplines.length;
}

/** Seeded VIP tiers (doc 05). Tiers created later come from the product catalog. */
export const DASHBOARD_TIERS: ReadonlyArray<{ code: string; label: string }> = [
  { code: "B1", label: "Bronze" },
  { code: "S1", label: "Silver" },
  { code: "G1", label: "Gold" },
];

export type DashboardTierCode = string;

export type TierDistributionRow = {
  code: DashboardTierCode;
  label: string;
  count: number;
  /** Exact share of the counted records, 0 to 100 (display only). */
  share: number;
};

type TierProduct = { code: string; tier: string };

/** Seeded tiers first, then any catalog tier not already listed. */
function dashboardTiers(products: ReadonlyArray<TierProduct> | undefined) {
  const tiers = [...DASHBOARD_TIERS];
  for (const product of products ?? []) {
    if (!tiers.some((tier) => tier.code === product.code)) tiers.push({ code: product.code, label: product.tier });
  }
  return tiers;
}

function tierDistribution(records: readonly { productCode: string }[], products?: ReadonlyArray<TierProduct>): { total: number; rows: TierDistributionRow[] } {
  const total = records.length;
  const rows = dashboardTiers(products).map(({ code, label }) => {
    const count = records.filter((record) => record.productCode === code).length;
    return { code, label, count, share: total === 0 ? 0 : (count * 100) / total };
  });
  return { total, rows };
}

export function countVisibleContracts(contracts: readonly Pick<ContractView, "status">[]) {
  return contracts.filter((contract) => contract.status !== "cancelled").length;
}

/** Contract mix across the VIP tiers. Cancelled contracts are excluded. */
export function contractTierDistribution(contracts: readonly Pick<ContractView, "productCode" | "status">[], products?: ReadonlyArray<TierProduct>) {
  return tierDistribution(contracts.filter((contract) => contract.status !== "cancelled"), products);
}

/** Mix of currently Confirmed sales across the VIP tiers (current snapshot). */
export function confirmedSalesTierDistribution(sales: readonly Pick<SaleView, "productCode" | "status">[], products?: ReadonlyArray<TierProduct>) {
  return tierDistribution(sales.filter((sale) => sale.status === "confirmed"), products);
}

/** Submitted and under-review contracts still need an Admin decision (doc 05 section 11). */
export function countPendingContractReviews(contracts: readonly Pick<ContractView, "status">[]) {
  return contracts.filter((contract) => contract.status === "submitted" || contract.status === "under_review").length;
}

/** Contracts returned to the seller for correction. */
export function countReturnedContracts(contracts: readonly Pick<ContractView, "status">[]) {
  return contracts.filter((contract) => contract.status === "returned").length;
}

export function countCustomerDrafts(customers: readonly Pick<Customer, "status">[]) {
  return customers.filter((customer) => customer.status === "draft").length;
}

/** The Finance verification queue (doc 07 section 9). */
export function countPendingPaymentVerifications(payments: readonly Pick<PaymentView, "status">[]) {
  return payments.filter((payment) => payment.status === "submitted" || payment.status === "under_review").length;
}

/** The activation queue: pending memberships (doc 06 section 5). */
export function countPendingMembershipActivations(memberships: readonly Pick<MembershipView, "status">[]) {
  return memberships.filter((membership) => membership.status === "pending").length;
}

/** Same filter as the Finance Cancellations page. */
export function countCancellationRequests(contracts: readonly Pick<ContractView, "cancellation">[]) {
  return contracts.filter((contract) => contract.cancellation?.status === "requested").length;
}

/** Same filter as the Financial Holds page (doc 07 section 19). */
export function countFinancialHolds(memberships: readonly Pick<MembershipView, "financialHold">[]) {
  return memberships.filter((membership) => membership.financialHold).length;
}

export type CommissionPayoutSummary = {
  /** Approved commissions, which are not Paid until disbursement is confirmed (doc 08 section 12). */
  approvedUnpaidCentavos: number;
  approvedCount: number;
  /** Release date reached and no payout recorded yet. */
  ready: number;
  /** Payout recorded, disbursement not confirmed. */
  awaitingConfirmation: number;
};

/**
 * Mirrors the Commission Payouts page: approved commissions, split into ready
 * (release date reached, the `releaseOpen` rule) and awaiting confirmation.
 */
export function commissionPayoutSummary(
  commissions: readonly Pick<CommissionView, "status" | "amountCentavos" | "payout" | "payoutReleaseDate">[],
  today: string,
): CommissionPayoutSummary {
  const approved = commissions.filter((item) => item.status === "approved");
  return {
    approvedUnpaidCentavos: approved.reduce((total, item) => total + item.amountCentavos, 0),
    approvedCount: approved.length,
    ready: approved.filter((item) => !item.payout && item.payoutReleaseDate !== null && today >= item.payoutReleaseDate).length,
    awaitingConfirmation: approved.filter((item) => item.payout !== null && !item.payout.confirmedAt).length,
  };
}

export type ReceivableState = "settled" | "outstanding" | "overdue";

export type ReceivablesBreakdown = {
  rows: { state: ReceivableState; count: number; balanceCentavos: number }[];
  contractCount: number;
  /** Remaining unpaid contractual amount based on verified payments (doc 07 section 3). */
  outstandingCentavos: number;
  /** Unpaid amount of installments past their due date (doc 07 section 13). */
  overdueCentavos: number;
};

/** Receivables of finalized contracts, using the same rule as the Finance Collections page. */
export function receivablesBreakdown(
  contracts: readonly ContractView[],
  payments: readonly PaymentView[],
  today: string,
): ReceivablesBreakdown {
  const totals: Record<ReceivableState, { count: number; balanceCentavos: number }> = {
    settled: { count: 0, balanceCentavos: 0 },
    outstanding: { count: 0, balanceCentavos: 0 },
    overdue: { count: 0, balanceCentavos: 0 },
  };
  let outstandingCentavos = 0;
  let overdueCentavos = 0;
  let contractCount = 0;
  for (const contract of contracts) {
    if (contract.status !== "finalized") continue;
    const state = collectionStateFor(
      contract,
      payments.filter((payment) => payment.contractId === contract.id),
      today,
    );
    contractCount += 1;
    totals[state.state].count += 1;
    totals[state.state].balanceCentavos += state.balance;
    outstandingCentavos += state.balance;
    overdueCentavos += state.overdue;
  }
  return {
    rows: (["settled", "outstanding", "overdue"] as const).map((state) => ({ state, ...totals[state] })),
    contractCount,
    outstandingCentavos,
    overdueCentavos,
  };
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Every Asia/Manila calendar day in [from, to]; empty for an invalid range. */
export function dateSpan(from: string, to: string): string[] {
  if (!DATE_ONLY.test(from) || !DATE_ONLY.test(to) || from > to) return [];
  const dates: string[] = [];
  let cursor: string | null = from;
  while (cursor && cursor <= to && dates.length < 3660) {
    dates.push(cursor);
    if (cursor === to) break;
    cursor = addDaysToDate(cursor, 1);
  }
  return dates;
}

function zeroed(dates: readonly string[]) {
  return new Map(dates.map((date) => [date, 0]));
}

/** Net confirmed sales value per day by signed adjustment date (doc 13 sections 4.3 and 5). */
export function dailyConfirmedSales(sales: readonly Pick<SaleView, "adjustments">[], dates: readonly string[]): number[] {
  const byDate = zeroed(dates);
  for (const sale of sales) {
    for (const adjustment of sale.adjustments) {
      const current = byDate.get(adjustment.date);
      if (current !== undefined) byDate.set(adjustment.date, current + adjustment.amountCentavos);
    }
  }
  return dates.map((date) => byDate.get(date) ?? 0);
}

export type DailyCollections = {
  /** Approved amounts by receipt accounting date. */
  gross: number[];
  /** Reversals and refunds by their own dates, as positive amounts. */
  adjustments: number[];
  /** Gross minus adjustments for the same day (doc 07 section 22). */
  net: number[];
};

/** Daily collections; totals match `periodCollections` for the same range. */
export function dailyCollections(
  payments: readonly Pick<PaymentView, "status" | "countedDate" | "paidDate" | "amountCentavos" | "adjustments">[],
  dates: readonly string[],
): DailyCollections {
  const gross = zeroed(dates);
  const adjusted = zeroed(dates);
  for (const payment of payments) {
    const date = paymentCountedDate(payment);
    if (date) {
      const current = gross.get(date);
      if (current !== undefined) gross.set(date, current + payment.amountCentavos);
    }
    for (const adjustment of payment.adjustments) {
      const date = manilaDateOf(adjustment.date);
      const current = adjusted.get(date);
      if (current !== undefined) adjusted.set(date, current + adjustment.amountCentavos);
    }
  }
  const grossValues = dates.map((date) => gross.get(date) ?? 0);
  const adjustmentValues = dates.map((date) => adjusted.get(date) ?? 0);
  return {
    gross: grossValues,
    adjustments: adjustmentValues,
    net: grossValues.map((value, index) => value - adjustmentValues[index]),
  };
}

export type TeamContribution = {
  member: Pick<OrgMember, "id" | "displayName" | "designation">;
  /** Confirmed sales value of this member's recording-time team in the period. */
  confirmedCentavos: number;
};

/**
 * Contribution of each direct downline member: their own plus their downline's
 * confirmed sales, using the team recorded on each sale so transfers never move
 * history (doc 13 section 7).
 */
export function teamContributions(
  members: readonly Pick<OrgMember, "id" | "displayName" | "designation" | "parentId">[],
  managerId: string | null,
  sales: readonly SaleView[],
  from: string,
  to: string,
): TeamContribution[] {
  if (!managerId) return [];
  return members
    .filter((member) => member.parentId === managerId)
    .map((member) => ({
      member: { id: member.id, displayName: member.displayName, designation: member.designation },
      confirmedCentavos: confirmedValueInPeriod(teamSales(sales, member.id), from, to),
    }))
    .sort((a, b) => b.confirmedCentavos - a.confirmedCentavos || a.member.displayName.localeCompare(b.member.displayName));
}

export type DashboardActivityKind = "customer" | "contract" | "sale" | "payment" | "membership" | "commission";

export type DashboardActivityItem = {
  id: string;
  kind: DashboardActivityKind;
  action: string;
  label: string;
  /** Record reference already visible to the role; no customer details are copied. */
  reference: string;
  /** VIP tier of a contract or sale, when the record carries one. */
  productCode?: string;
  timestamp: string;
};

const ACTIVITY_LABELS: Record<string, string> = {
  CUSTOMER_SUBMITTED: "Customer submitted",
  CONTRACT_PREPARED: "Contract prepared",
  CONTRACT_SUBMITTED: "Contract submitted",
  CONTRACT_REVIEW_STARTED: "Contract review started",
  CONTRACT_FINALIZED: "Contract finalized",
  CONTRACT_RETURNED: "Contract returned",
  CONTRACT_CANCELLED: "Contract cancelled",
  CONTRACT_CANCELLATION_REQUESTED: "Cancellation requested",
  CONTRACT_CANCELLATION_DECLINED: "Cancellation declined",
  SALE_CONFIRMATION: "Sale confirmed",
  SALE_REVERSAL: "Sale reversed",
  SALE_RECONFIRMATION: "Sale reconfirmed",
  SALE_AMENDMENT: "Sale value amended",
  PAYMENT_SUBMITTED: "Payment submitted",
  PAYMENT_VERIFIED: "Payment verified",
  PAYMENT_REJECTED: "Payment rejected",
  PAYMENT_RETURNED: "Payment returned",
  PAYMENT_RESUBMITTED: "Payment resubmitted",
  PAYMENT_REVERSED: "Payment reversed",
  PAYMENT_REFUNDED: "Payment refunded",
  MEMBERSHIP_ACTIVATED: "Membership activated",
  COMMISSION_PAYOUT_RECORDED: "Payout recorded, not confirmed",
  COMMISSION_PAID: "Commission payout confirmed",
};

function activityLabel(action: string) {
  const known = ACTIVITY_LABELS[action];
  if (known) return known;
  return humanize(action);
}

function activityTime(value: string) {
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : 0;
}

export type ActivitySources = {
  customers?: readonly Pick<Customer, "displayName" | "submittedAt">[];
  contracts?: readonly (Pick<ContractView, "customerName" | "history"> & { productCode?: string })[];
  sales?: readonly (Pick<SaleView, "customerName" | "adjustments"> & { productCode?: string })[];
  payments?: readonly Pick<PaymentView, "customerName" | "history">[];
  memberships?: readonly Pick<MembershipView, "customerName" | "history">[];
  commissions?: readonly Pick<CommissionView, "customerName" | "history">[];
};

/**
 * Recent business activity from records the role can already read. Only the
 * action and record reference are shown; no audit payloads or customer details.
 * `include` narrows the events a dashboard shows.
 */
export function buildActivityFeed(
  sources: ActivitySources,
  limit = 6,
  include: (item: DashboardActivityItem) => boolean = () => true,
): DashboardActivityItem[] {
  const items: DashboardActivityItem[] = [];
  let sequence = 0;
  const push = (kind: DashboardActivityKind, reference: string, action: string, timestamp: string, productCode?: string) => {
    sequence += 1;
    const item: DashboardActivityItem = { id: `${kind}-${reference}-${sequence}`, kind, action, label: activityLabel(action), reference, timestamp };
    if (productCode) item.productCode = productCode;
    if (include(item)) items.push(item);
  };

  for (const customer of sources.customers ?? []) {
    if (customer.submittedAt) push("customer", customer.displayName, "CUSTOMER_SUBMITTED", customer.submittedAt);
  }
  for (const contract of sources.contracts ?? []) {
    for (const event of contract.history) push("contract", contract.customerName, event.event, event.at, contract.productCode);
  }
  for (const sale of sources.sales ?? []) {
    for (const adjustment of sale.adjustments) {
      push("sale", sale.customerName, `SALE_${adjustment.kind.toUpperCase()}`, adjustment.date, sale.productCode);
    }
  }
  for (const payment of sources.payments ?? []) {
    for (const event of payment.history) push("payment", payment.customerName, event.event, event.at);
  }
  for (const membership of sources.memberships ?? []) {
    for (const event of membership.history) push("membership", membership.customerName, event.event, event.at);
  }
  for (const commission of sources.commissions ?? []) {
    for (const event of commission.history) push("commission", commission.customerName, event.event, event.at);
  }

  return items.sort((a, b) => activityTime(b.timestamp) - activityTime(a.timestamp)).slice(0, Math.max(0, limit));
}
