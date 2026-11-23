import { createIgpState } from "@/modules/igp/types";
import { createRedemptionSeed } from "@/modules/redemption/sample-seed";
import { createStayPointsState } from "@/modules/stay-points/engine";
import { createSeedClock } from "./anchor";
import { buildBusiness, buildPayoutLists, settleCommissions, type ClosedPeriods } from "./business";
import { buildPaymentSchemes, buildProducts } from "./catalog";
import { buildIgp } from "./igp";
import {
  applyCancellationClawback, buildAllowanceReviews, buildAuditEvents, buildClosedMonths, buildMemberQr, buildPromoPoints, buildPromos,
  buildReceiptImportBatches, buildReconciliation, buildRedemption, buildStayPointsExtras, buildUnmatchedReceipts,
} from "./operations";
import { buildAccounts, buildDepartments, buildNetwork, buildRoles, buildStaff } from "./organization";

export { createSeedClock, type SeedClock } from "./anchor";

/** The cancelled contract whose paid commission is clawed back (doc 08 §14). */
const CLAWBACK_SALE_ID = "sale-17";

/**
 * Builds every seeded record for one store, dated relative to `today`
 * (Asia/Manila). Deterministic for a given date. Nothing here is persisted.
 */
export function buildSeed(today?: string) {
  const clock = createSeedClock(today);
  const network = buildNetwork(clock);
  const products = buildProducts();
  const paymentSchemes = buildPaymentSchemes();
  const business = buildBusiness(clock, network.members, products, paymentSchemes);

  const nextPayment = business.counters.payment;
  const igp = buildIgp(clock, network.members, business.payments, nextPayment, business.counters.commission);
  const payments = [...business.payments, ...igp.payments];
  const commissions = [...business.commissions, ...igp.commissions];

  // Months -6 to -3 are closed; the two most recent ended months wait for close.
  const closed: ClosedPeriods = { months: [6, 5, 4, 3].map((back) => clock.month(back)), paidThrough: clock.month(4), latest: clock.month(3) };
  settleCommissions(clock, commissions, closed, new Set([CLAWBACK_SALE_ID]));
  const clawbackSale = business.sales.find((sale) => sale.id === CLAWBACK_SALE_ID);
  const cancelledOn = business.contracts.find((contract) => contract.id === clawbackSale?.contractId)?.cancellation?.decidedAt?.slice(0, 10) ?? clock.today;
  const commissionClawbacks = applyCancellationClawback(clock, commissions, clawbackSale, cancelledOn);
  const commissionPayoutLists = buildPayoutLists(clock, commissions, closed);

  const allSales = [...business.sales, ...igp.sales];
  const allowanceReviews = buildAllowanceReviews(clock, {
    members: network.members, vacancies: network.seatVacancies, sales: business.sales, igpSales: igp.sales, payments,
  }, [clock.month(4), clock.month(3)], clock.month(3));
  const receiptImportBatches = buildReceiptImportBatches(clock);
  const closedMonths = buildClosedMonths(clock, { sales: allSales, payments, commissions, allowanceReviews }, closed.months);
  const leaderCount = network.members.filter((member) => member.designation !== "OST").length;
  const reconciliation = buildReconciliation(clock, { payments, sales: allSales, commissions, importBatches: receiptImportBatches }, clock.month(4), clock.month(3), leaderCount);
  const unmatchedReceipts = buildUnmatchedReceipts(clock, payments);

  const stayPoints = { ...createStayPointsState(), ...buildStayPointsExtras(clock, business.memberships, business.resortSpends) };
  const promos = buildPromos(clock);
  const promoPoints = buildPromoPoints(clock, promos, business.resortSpends);
  const redemption = buildRedemption({
    clock, base: createRedemptionSeed(), memberships: business.memberships, contracts: business.contracts, customers: business.customers,
    spends: business.resortSpends, stayPoints,
  });
  const memberQr = buildMemberQr(business.memberships);

  const igpState = { ...createIgpState(), sales: igp.sales, accreditations: igp.accreditations, buyerMemberships: igp.buyerMemberships, historyBatches: igp.historyBatches };
  const auditEvents = buildAuditEvents(clock, {
    customers: business.customers, contracts: business.contracts, sales: business.sales, payments, memberships: business.memberships,
    commissions, closedMonths, members: network.members, igpSales: igp.sales,
  });

  const highest = (ids: readonly string[], prefix: string) => Math.max(0, ...ids.map((id) => Number(id.slice(prefix.length + 1)) || 0));
  const counters: Record<string, number> = {
    ...business.counters,
    payment: highest(payments.map(({ id }) => id), "pay") + 1,
    commission: highest(commissions.map(({ id }) => id), "comm") + 1,
    commissionClawback: commissionClawbacks.length + 1,
    commissionPayoutList: commissionPayoutLists.length + 1,
    allowanceReview: allowanceReviews.length + 1,
    reconciliation: reconciliation.entries.length + 1,
    switch: reconciliation.signOffs.length + 1,
    seatVacancy: network.seatVacancies.length + 1,
    unmatchedReceipt: unmatchedReceipts.length + 1,
    receiptImport: receiptImportBatches.length + 1,
    promo: promos.length + 1,
    promoPoints: promoPoints.length + 1,
    igpBuyerMembership: igp.buyerMemberships.length + 1,
    igpHistoryBatch: igp.historyBatches.length + 1,
    experience: 4,
  };

  return {
    clock,
    members: network.members,
    accreditations: network.accreditations,
    seatVacancies: network.seatVacancies,
    registrationApplications: network.registrationApplications,
    accreditationSequence: network.accreditationSequence,
    registrationSequence: network.registrationSequence,
    customers: business.customers,
    products,
    paymentSchemes,
    contracts: business.contracts,
    sales: business.sales,
    igp: igpState,
    payments,
    closedMonths,
    unmatchedReceipts,
    memberQr,
    memberships: business.memberships,
    commissions,
    commissionRateSettings: business.commissionRateSettings,
    vipPositionRates: business.vipPositionRates,
    commissionClawbacks,
    commissionPayoutLists,
    allowanceReviews,
    resortSpends: business.resortSpends,
    stayPoints,
    redemption,
    promos,
    promoPoints,
    accounts: buildAccounts(),
    departments: buildDepartments(),
    roles: buildRoles(),
    staff: buildStaff(),
    auditEvents,
    customerImportJobs: business.customerImportJobs,
    receiptImportBatches,
    reconciliationEntries: reconciliation.entries,
    monthSwitchSignOffs: reconciliation.signOffs,
    counters,
  };
}
