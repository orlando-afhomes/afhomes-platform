import type { AuditEvent, AuditEntityType, AuditModule } from "@/modules/audit/types";
import { assembleAllowanceInputs } from "@/modules/commissions/allowance-assembly";
import { calculateAllowances, SHIPPED_ALLOWANCE_TERMS, type AllowanceReview } from "@/modules/commissions/allowances";
import type { Commission, CommissionClawback } from "@/modules/commissions/types";
import type { Contract } from "@/modules/contracts/types";
import type { Customer } from "@/modules/customers/types";
import { closedMonthSnapshot, type ClosedMonth } from "@/modules/finance/month-close";
import type { Payment, UnmatchedReceipt } from "@/modules/finance/types";
import type { ReceiptImportBatch } from "@/modules/imports/receipt-import";
import type { IgpSale } from "@/modules/igp/types";
import type { Membership } from "@/modules/membership/types";
import type { OrgMember } from "@/modules/organization/types";
import { earnPointsForBill } from "@/modules/promos/rules";
import type { Promo, PromoPointsEntry } from "@/modules/promos/types";
import { computeSourceTotals, type ReconciliationEntry } from "@/modules/reconciliation/rules";
import type { MonthSwitchSignOff } from "@/modules/reconciliation/switch-signoff";
import { priceStay, selectTableVersion } from "@/modules/redemption/rules";
import type { RedemptionBooking, RedemptionLedgerEntry, RedemptionState } from "@/modules/redemption/types";
import type { SeatVacancy } from "@/modules/sales-network/vacancy";
import type { Sale } from "@/modules/sales/types";
import { computePointsLedger, firstPeriodEnd, spendInPeriod } from "@/modules/stay-points/engine";
import type { PointsMovement, ResortSpend, StayPointsState } from "@/modules/stay-points/types";
import type { SeedClock } from "./anchor";
import { peso } from "./catalog";
import { tokenAt } from "./people";

// --------------------------------------------------------------------------
// Month-end close, allowance reviews and reconciliation
// --------------------------------------------------------------------------

/** The close of a month happens on the 5th of the following month. */
const closeDateOf = (clock: SeedClock, month: string) => clock.addDays(clock.addMonths(`${month}-01`, 1), 4);

/**
 * Saved allowance reviews (doc 08 §15). Inputs come from the same assembly the
 * review page copies; figures come from the shipped workbook terms. Reviews are
 * saved before their month closes, as the repository requires.
 */
export function buildAllowanceReviews(clock: SeedClock, data: { members: readonly OrgMember[]; vacancies: readonly SeatVacancy[]; sales: readonly Sale[]; igpSales: readonly IgpSale[]; payments: readonly Payment[] }, months: readonly string[], latestMonth: string): AllowanceReview[] {
  const reviews: AllowanceReview[] = [];
  let id = 1;
  for (const month of months) {
    const assembly = assembleAllowanceInputs(data, month);
    const reviewedOn = clock.addDays(closeDateOf(clock, month), -2);
    for (const leader of assembly.leaders) {
      if (leader.vacantWholeMonth) continue;
      const member = data.members.find((item) => item.id === leader.memberId)!;
      const qualifying = { days: leader.eligibleDays, teamTcpCentavos: leader.teamTcpCentavos, collectionsCentavos: leader.teamCollectionsCentavos, assumedCreditCentavos: leader.assumedCreditCentavos };
      const extended = { days: 0, teamTcpCentavos: 0, collectionsCentavos: 0, assumedCreditCentavos: 0 };
      const result = calculateAllowances({ daysInMonth: assembly.daysInMonth, terms: SHIPPED_ALLOWANCE_TERMS[leader.position], qualifying, extended });
      // One leader in the latest month shows a workbook difference with its explanation.
      const differs = month === latestMonth && leader.position === "SVD" && member.id === "mem-svd-b" && result.baCentavos > 0;
      const workbook = differs ? { ...result, baCentavos: result.baCentavos - peso(500) } : { ...result };
      reviews.push({
        id: `allowance-${id++}`, month, memberId: member.id, memberName: member.displayName, position: leader.position,
        qualifying, extended, withholdingReason: "", withholdBa: false, workbook,
        workbookDifferenceReason: differs ? "The company workbook prorated the basic allowance for one leave day; the platform follows the shipped terms." : undefined,
        result, reviewedAt: clock.at(reviewedOn, "16:10"), reviewedBy: "dev-finance",
      });
    }
  }
  return reviews;
}

export function buildClosedMonths(clock: SeedClock, data: Parameters<typeof closedMonthSnapshot>[0], months: readonly string[]): ClosedMonth[] {
  return months.map((month) => closedMonthSnapshot(data, month, clock.at(closeDateOf(clock, month), "17:00"), "dev-admin"));
}

/**
 * Company-workbook checks for the sign-off month (all five measures, so the
 * parallel-run switch is signed off) and a partial check of the latest month.
 */
export function buildReconciliation(clock: SeedClock, source: Parameters<typeof computeSourceTotals>[0], signOffMonth: string, latestMonth: string, leaderCount: number) {
  const entries: ReconciliationEntry[] = [];
  let id = 1;
  const record = (period: string, measure: ReconciliationEntry["measure"], live: number, variance: number, reason: string | null, on: string) => {
    entries.push({
      id: `rec-${id++}`, period, measure, workbookCentavos: live + variance, liveCentavos: live, differenceCentavos: variance,
      decision: variance === 0 ? "signed_off" : "explained_variance", reason, actorId: "dev-finance", recordedAt: clock.at(on, "11:20"),
    });
  };
  const signOffOn = clock.addDays(closeDateOf(clock, signOffMonth), 3);
  for (const total of computeSourceTotals(source, signOffMonth)) {
    const variance = total.measure === "verified_receipts" && total.totalCentavos > 0 ? peso(1_250) : 0;
    record(signOffMonth, total.measure, total.totalCentavos, variance, variance ? "The workbook includes a bank charge the platform records separately; agreed with Finance." : null, signOffOn);
  }
  const latestOn = clock.addDays(closeDateOf(clock, latestMonth), 4);
  for (const total of computeSourceTotals(source, latestMonth).filter((item) => item.measure === "verified_receipts" || item.measure === "sales_value" || item.measure === "commissions_paid")) {
    record(latestMonth, total.measure, total.totalCentavos, 0, null, latestOn);
  }
  // Interim checks of the running month, so the default month view shows recorded decisions.
  const currentMonth = clock.month(0);
  const interimOn = clock.ago(1).startsWith(currentMonth) ? clock.ago(1) : clock.today;
  for (const total of computeSourceTotals(source, currentMonth).filter((item) => item.measure === "verified_receipts" || item.measure === "sales_value")) {
    record(currentMonth, total.measure, total.totalCentavos, 0, null, interimOn);
  }
  const signOffs: MonthSwitchSignOff[] = [{
    id: "switch-1", month: signOffMonth, actorId: "dev-super-admin", recordedAt: clock.at(clock.addDays(signOffOn, 1), "15:00"),
    checkedMeasures: 5, checkedLeaders: leaderCount,
  }];
  return { entries, signOffs };
}

// --------------------------------------------------------------------------
// Receipt exceptions and historical imports
// --------------------------------------------------------------------------

export function buildUnmatchedReceipts(clock: SeedClock, payments: readonly Payment[]): UnmatchedReceipt[] {
  const matchedTarget = [...payments].reverse().find((payment) => payment.status === "verified" && payment.method === "Cash" && payment.documentNo && payment.paidDate >= clock.ago(60));
  const receipts: UnmatchedReceipt[] = [
    { id: "unr-1", amountCentavos: peso(15_500), method: "Bank Transfer", paidDate: clock.ago(3), orNumber: "BDO-0098341257",
      evidenceFileName: "deposit-slip-unknown-sender.jpg", reason: "Bank deposit with no customer name on the slip; the amount matches a Bronze monthly installment.",
      submittedBy: "dev-clerk", submittedAt: clock.at(clock.ago(2), "10:40"), status: "unmatched", matchedPaymentId: null, decisionReason: null, decidedBy: null, decidedAt: null,
      history: [{ at: clock.at(clock.ago(2), "10:40"), actorId: "dev-clerk", event: "UNMATCHED_RECEIPT_SUBMITTED", note: null }] },
    { id: "unr-3", amountCentavos: peso(8_000), method: "GCash", paidDate: clock.ago(19), orNumber: "GC1007382915044",
      evidenceFileName: "gcash-transfer-screenshot.jpg", reason: "Customer sent a partial amount by GCash without a reference to any contract.",
      submittedBy: "dev-clerk", submittedAt: clock.at(clock.ago(18), "09:15"), status: "rejected", matchedPaymentId: null,
      decisionReason: "The sender confirmed the transfer was meant for another company and has been refunded.", decidedBy: "dev-finance", decidedAt: clock.at(clock.ago(14), "13:30"),
      history: [
        { at: clock.at(clock.ago(18), "09:15"), actorId: "dev-clerk", event: "UNMATCHED_RECEIPT_SUBMITTED", note: null },
        { at: clock.at(clock.ago(14), "13:30"), actorId: "dev-finance", event: "UNMATCHED_RECEIPT_REJECTED", note: "Refunded to the sender." },
      ] },
  ];
  if (matchedTarget) {
    receipts.splice(1, 0, {
      id: "unr-2", amountCentavos: matchedTarget.amountCentavos, method: matchedTarget.method, paidDate: matchedTarget.paidDate, orNumber: matchedTarget.documentNo!,
      evidenceFileName: matchedTarget.evidenceFileName, reason: "Walk-in cash payment recorded before the customer's contract number was confirmed.",
      submittedBy: "dev-clerk", submittedAt: clock.at(matchedTarget.paidDate, "16:50"), status: "matched", matchedPaymentId: matchedTarget.id,
      decisionReason: null, decidedBy: "dev-finance", decidedAt: matchedTarget.verifiedAt,
      history: [
        { at: clock.at(matchedTarget.paidDate, "16:50"), actorId: "dev-clerk", event: "UNMATCHED_RECEIPT_SUBMITTED", note: null },
        { at: matchedTarget.verifiedAt ?? clock.at(matchedTarget.paidDate, "17:30"), actorId: "dev-finance", event: "UNMATCHED_RECEIPT_MATCHED", note: matchedTarget.contractId },
      ],
    });
  }
  return receipts;
}

/** Historical receipts from the company workbook (doc 13), before the platform's own records. */
export function buildReceiptImportBatches(clock: SeedClock): ReceiptImportBatch[] {
  const rows: ReadonlyArray<[number, number, number, ReceiptImportBatch["receipts"][number]["method"], ReceiptImportBatch["receipts"][number]["purpose"], string, string]> = [
    [9, 3, 10_000, "Cash", "reservation", "Leonora Bautista Sison", "26-HIST-0141"],
    [9, 3, 57_500, "Bank Transfer", "installment", "Celestino Arroyo", "26-HIST-0118"],
    [9, 12, 15_500, "GCash", "installment", "Marivic Dela Cruz", "26-HIST-0122"],
    [9, 20, 95_000, "Cheque", "installment", "Wenceslao Bayani", "26-HIST-0109"],
    [8, 6, 182_000, "Bank Transfer", "full", "Rosario Tumulak", "26-HIST-0150"],
    [8, 15, 10_000, "Cash", "reservation", "Herminio Pacheco", "26-HIST-0153"],
  ];
  const signedOff = clock.ago(140);
  const batch: ReceiptImportBatch = {
    id: "rimp-1", fileName: "sales-collections-history.xlsx", createdAt: clock.at(clock.ago(142), "14:05"), createdBy: "dev-admin", status: "signed_off",
    totalRows: rows.length + 1,
    receipts: rows.map(([months, day, amount, method, purpose, customer, sale], index) => {
      const paidDate = clock.inMonth(months, day);
      return { id: `imported-${index + 1}`, batchId: "rimp-1", rowNumber: index + 2, referenceNo: `OR-${paidDate.replaceAll("-", "")}-H${String(index + 1).padStart(3, "0")}`,
        paidDate, amountCentavos: peso(amount), method, purpose, customerLabel: customer, saleReference: sale, remarks: null };
    }),
    skipped: [{ rowNumber: rows.length + 2, reason: "The receipt reference is already used by another payment." }],
    decidedBy: "dev-super-admin", decidedAt: clock.at(signedOff, "10:30"), decisionReason: null, selfSignedOff: false,
  };
  return [batch];
}

// --------------------------------------------------------------------------
// Clawback on the cancelled contract (doc 08 §14)
// --------------------------------------------------------------------------

export function applyCancellationClawback(clock: SeedClock, commissions: Commission[], sale: Sale | undefined, cancelledOn: string): CommissionClawback[] {
  if (!sale) return [];
  const clawbacks: CommissionClawback[] = [];
  for (const commission of commissions.filter((item) => item.saleId === sale.id)) {
    if (commission.status === "paid") {
      clawbacks.push({
        id: `clawback-${clawbacks.length + 1}`, commissionId: commission.id, saleId: sale.id, recipientMemberId: commission.recipientMemberId,
        trigger: "cancellation", raisedDate: cancelledOn, amountCentavos: commission.amountCentavos,
        recoveries: [{ date: clock.ago(4), amountCentavos: Math.floor(commission.amountCentavos / 2 / 100) * 100, reference: `RCV-${clock.ago(4).replaceAll("-", "")}-01`, actorId: "dev-finance" }],
        writeOff: null,
      });
    } else if (commission.status !== "cancelled") {
      commission.status = "on_hold";
      commission.holdReason = "cancellation";
      commission.holdTrigger = "cancellation";
      commission.history.push({ at: clock.at(cancelledOn, "14:41"), actorId: "dev-super-admin", event: "COMMISSION_HELD", note: "cancellation" });
    }
  }
  return clawbacks;
}

// --------------------------------------------------------------------------
// Stay Points extras, promos and redemption
// --------------------------------------------------------------------------

export function buildStayPointsExtras(clock: SeedClock, memberships: readonly Membership[], spends: readonly ResortSpend[]): Pick<StayPointsState, "refunds" | "waivers"> {
  const refundable = spends.find((spend) => spend.status === "verified" && spend.membershipId !== "memb-1" && spend.amountCentavos >= peso(4_000) && spend.date <= clock.ago(5));
  const refunds = refundable ? [{ id: "refund-1", spendId: refundable.id, date: clock.addDays(refundable.date, 2), amountCentavos: peso(1_200),
    reason: "One dish was returned to the kitchen and removed from the bill.", actorId: "dev-finance" }] : [];
  const carded = memberships.filter((item) => item.cardId && item.cardClaimDate && item.id !== "memb-1");
  const waivers: StayPointsState["waivers"] = [];
  if (carded[1]) waivers.push({ id: "waiver-1", membershipId: carded[1].id, tranche: 2, date: clock.ago(9), ground: "Residence outside the Philippines",
    supportingReference: "Certificate of employment, Dubai, dated last month", requestedBy: "dev-admin" });
  if (carded[2]) waivers.push({ id: "waiver-2", membershipId: carded[2].id, tranche: 2, date: clock.ago(33), ground: "Hospitalization or serious illness",
    supportingReference: "Medical certificate submitted at the front desk", requestedBy: "dev-admin",
    decision: { granted: false, actorId: "dev-super-admin", date: clock.ago(27), reason: "The hospitalization did not fall within the earning year in question.", releaseDate: null } });
  return { refunds, waivers };
}

export function buildPromos(clock: SeedClock): Promo[] {
  const created = clock.at(clock.monthStart(3), "09:00");
  return [
    {
      id: "promo-1", name: "Teppanyaki Dining Points", status: "active", startDate: clock.monthStart(3), endDate: clock.addDays(clock.monthStart(-2), -1),
      earnOutletIds: ["outlet-teppanyaki"], earnPesosPerPointCentavos: peso(100), redeemOutletIds: ["outlet-teppanyaki"],
      pointsExpiryDate: clock.addMonths(clock.monthStart(-2), 6),
      rewards: [
        { id: "reward-1", name: "Free Teppanyaki Garlic Rice Set", description: "One garlic rice set with iced tea for one guest.", outletId: "outlet-teppanyaki", pointsCost: 25, status: "active" },
        { id: "reward-2", name: "Chef's Dessert Platter", description: "Seasonal dessert platter good for two.", outletId: "outlet-teppanyaki", pointsCost: 40, status: "active" },
      ],
      publicTitle: "Earn while you dine at Teppanyaki",
      publicSummary: "VIP cardholders earn one point for every ₱100 spent at the resort's Teppanyaki Restaurant and use them for set meals and desserts.",
      publicTerms: "Points are earned on the net bill after discounts. Present your VIP card before payment. Points expire on the date shown on your statement and cannot be converted to cash.",
      published: true, createdAt: created, updatedAt: created,
    },
    {
      id: "promo-2", name: "Wellness Spa Rewards", status: "active", startDate: clock.monthStart(2), endDate: clock.addDays(clock.monthStart(-3), -1),
      earnOutletIds: ["outlet-spa", "venue-wellness-hotel"], earnPesosPerPointCentavos: peso(200), redeemOutletIds: ["outlet-spa"],
      pointsExpiryDate: clock.addMonths(clock.monthStart(-3), 6),
      rewards: [
        { id: "reward-3", name: "30-Minute Foot Reflexology", description: "A 30-minute foot reflexology session at the Resort Spa.", outletId: "outlet-spa", pointsCost: 30, status: "active" },
        { id: "reward-4", name: "Aromatherapy Upgrade", description: "Upgrade any 60-minute massage to an aromatherapy massage.", outletId: "outlet-spa", pointsCost: 15, status: "active" },
      ],
      publicTitle: "Wellness Spa Rewards",
      publicSummary: "Earn one point for every ₱200 spent on rooms at the Smart Wellness Hotel or at the Resort Spa, then treat yourself to a spa reward.",
      publicTerms: "Valid for VIP cardholders and their registered extra cardholder. Rewards are subject to therapist availability; book at least one day ahead.",
      published: true, createdAt: created, updatedAt: created,
    },
    {
      id: "promo-3", name: "Holiday Family Stay Bonus", status: "draft", startDate: clock.monthStart(-1), endDate: clock.addDays(clock.monthStart(-3), -1),
      earnOutletIds: ["venue-wellness-hotel", "venue-hotspring-resort"], earnPesosPerPointCentavos: peso(500), redeemOutletIds: ["outlet-shop"],
      pointsExpiryDate: null,
      rewards: [{ id: "reward-5", name: "Pasalubong Gift Box", description: "Assorted Laguna delicacies in a gift box.", outletId: "outlet-shop", pointsCost: 20, status: "active" }],
      publicTitle: "", publicSummary: "", publicTerms: "", published: false, createdAt: clock.at(clock.ago(6), "14:30"), updatedAt: clock.at(clock.ago(6), "14:30"),
    },
  ];
}

export function buildPromoPoints(clock: SeedClock, promos: readonly Promo[], spends: readonly ResortSpend[]): PromoPointsEntry[] {
  const entries: PromoPointsEntry[] = [];
  let id = 1;
  for (const spend of spends) {
    if (spend.status !== "verified" || !spend.venueId) continue;
    for (const promo of promos) {
      const points = earnPointsForBill(promo, spend.venueId, spend.date, spend.amountCentavos);
      if (points <= 0) continue;
      entries.push({ id: `pp-${id++}`, promoId: promo.id, membershipId: spend.membershipId, type: "earn", points, sourceBillId: spend.id, outletId: spend.venueId,
        date: spend.approvedDate ?? spend.date, actorId: "dev-finance" });
    }
  }
  // One reward used at the counter from the largest balance.
  const balances = new Map<string, number>();
  for (const entry of entries.filter((item) => item.promoId === "promo-1")) balances.set(entry.membershipId, (balances.get(entry.membershipId) ?? 0) + entry.points);
  const [membershipId, balance] = [...balances.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  const reward = promos[0].rewards[0];
  if (membershipId && balance && balance >= reward.pointsCost) {
    const earnedOn = entries.filter((item) => item.membershipId === membershipId).map((item) => item.date).sort().at(-1)!;
    const useDate = clock.addDays(earnedOn, 3) > clock.today ? clock.today : clock.addDays(earnedOn, 3);
    entries.push({ id: `pp-${id++}`, promoId: "promo-1", membershipId, type: "use", points: reward.pointsCost, outletId: reward.outletId, date: useDate, actorId: "dev-gsd",
      requestId: `use-${tokenAt(1, "promo-use").slice(0, 12)}`, holder: "primary", identityChecked: true, rewardId: reward.id, rewardName: reward.name, rewardPointsCost: reward.pointsCost });
  }
  return entries;
}

type RedemptionInput = {
  clock: SeedClock;
  base: RedemptionState;
  memberships: readonly Membership[];
  contracts: readonly Contract[];
  customers: readonly Customer[];
  spends: readonly ResortSpend[];
  stayPoints: StayPointsState;
};

/**
 * Bookings at the open hotel (doc 10; staff prototype authorized 2026-11-17).
 * A first stay sets the Points Activation Date at check-in and releases the first
 * Welcome Gift tranche when the year-one spend is met; nights are priced with the
 * owner-adopted points table.
 */
export function buildRedemption(input: RedemptionInput): RedemptionState {
  const { clock, base, stayPoints } = input;
  const state: RedemptionState = { ...base, bookings: [], ledger: [], pads: {}, requests: {}, sequence: 1 };
  const holidays = new Set(state.holidays.filter((item) => !item.removed).map((item) => item.date));
  const venue = state.venues.find((item) => item.status === "open")!;
  const nameOf = (membership: Membership) => input.customers.find((item) => item.id === membership.customerId)?.displayName ?? "Primary cardholder";

  const eligible = input.memberships.filter((membership) => membership.status === "active" && membership.cardId && membership.cardClaimDate && !membership.financialHold && membership.fullSettlementDate);
  type Plan = { membership: Membership; checkIn: string; nights: number; room: string; status: RedemptionBooking["status"]; createdDaysBefore: number; checkedIn?: boolean };
  const plans: Plan[] = [];
  const minimumMet = (membership: Membership, contract: Contract, padDate: string) => spendInPeriod(input.spends.filter((spend) => spend.membershipId === membership.id), stayPoints,
    membership.fullSettlementDate!, firstPeriodEnd(membership.fullSettlementDate!, padDate), padDate, true) >= contract.benefits.minSpendPerCycleCentavos;

  const firstStayOptions: Array<{ daysAgo: number; nights: number; room: string; follow?: Omit<Plan, "membership"> }> = [
    { daysAgo: 24, nights: 2, room: "Deluxe", follow: { checkIn: clock.ahead(16), nights: 2, room: "Standard", status: "confirmed", createdDaysBefore: 0 } },
    { daysAgo: 11, nights: 1, room: "Standard", follow: { checkIn: clock.ahead(9), nights: 1, room: "Standard", status: "cancelled", createdDaysBefore: 0 } },
    { daysAgo: 1, nights: 2, room: "Standard" },
  ];
  let option = 0;
  for (const membership of eligible) {
    const contract = input.contracts.find((item) => item.id === membership.contractId)!;
    const choice = firstStayOptions[option];
    if (!choice) break;
    const checkIn = clock.ago(choice.daysAgo);
    if (checkIn <= membership.cardClaimDate! || !minimumMet(membership, contract, checkIn)) continue;
    const inProgress = choice.daysAgo < choice.nights;
    plans.push({ membership, checkIn, nights: choice.nights, room: choice.room, status: inProgress ? "confirmed" : "completed", createdDaysBefore: 10, checkedIn: true });
    if (choice.follow) plans.push({ membership, ...choice.follow });
    option += 1;
  }
  // An upcoming first stay for another cardholder: provisional until check-in sets the activation date.
  const provisional = eligible.find((membership) => !plans.some((plan) => plan.membership.id === membership.id) && membership.cardClaimDate! < clock.ago(3));
  if (provisional) plans.push({ membership: provisional, checkIn: clock.ahead(21), nights: 2, room: "Deluxe", status: "confirmed", createdDaysBefore: 0 });

  for (const plan of plans) {
    const { membership } = plan;
    const contract = input.contracts.find((item) => item.id === membership.contractId)!;
    const version = selectTableVersion(state.tableVersions, membership.cardClaimDate!)!;
    const checkOut = clock.addDays(plan.checkIn, plan.nights);
    const pricing = priceStay({ version, venueId: venue.id, roomType: plan.room, checkIn: plan.checkIn, checkOut, holidays, cashNightDates: [] });
    const createdOn = plan.createdDaysBefore === 0 && plan.checkIn > clock.today ? clock.ago(2) : clock.addDays(plan.checkIn, -plan.createdDaysBefore);
    const sequence = state.sequence++;
    const padSet = Boolean(state.pads[membership.id]);
    const isProvisional = !padSet && !plan.checkedIn;
    const booking: RedemptionBooking = {
      id: `rbk-${sequence}`, reference: `RDM-${String(sequence).padStart(4, "0")}`, membershipId: membership.id, vipNumber: membership.cardId!,
      venueId: venue.id, roomType: plan.room, checkIn: plan.checkIn, checkOut, guests: plan.room === "Deluxe" ? 3 : 2, stayingHolder: nameOf(membership),
      nights: pricing.nights, basisVersionId: version.id, basisVersion: version.version, reservedWeekday: pricing.weekdayPoints, reservedWeekend: pricing.weekendPoints,
      ...(isProvisional ? { provisional: true } : {}), cashNights: 0, cashAmountCentavos: 0, cashReference: null, status: plan.status,
      createdBy: "dev-gsd", createdAt: clock.at(createdOn, "13:15"),
      history: [{ at: clock.at(createdOn, "13:15"), actorId: "dev-gsd", event: "BOOKING_CREATED", note: null }],
    };
    if (plan.checkedIn) {
      // The first check-in sets the Points Activation Date and releases tranche 1 (doc 10 §6).
      if (!padSet) state.pads[membership.id] = { date: plan.checkIn, bookingId: booking.id };
      booking.checkedIn = { date: plan.checkIn, actorId: "dev-gsd", holder: "primary", identityChecked: true };
      booking.history.push({ at: clock.at(plan.checkIn, "14:20"), actorId: "dev-gsd", event: "BOOKING_CHECKED_IN", note: "primary" });
    }
    const reserveAt = plan.checkedIn ? clock.at(plan.checkIn, "14:20") : booking.createdAt;
    const ledgerEntry = (type: RedemptionLedgerEntry["type"], bucket: "weekday" | "weekend", points: number, at: string, reason: string) => {
      if (points <= 0) return;
      state.ledger.push({ id: `rled-${state.sequence++}`, membershipId: membership.id, vipNumber: membership.cardId!, bookingId: booking.id, type, bucket, points,
        basisVersionId: version.id, trancheId: "1", actorId: "dev-gsd", at, reason });
    };
    if (!isProvisional) {
      // Make sure the release for tranche 1 exists before reserving against it.
      computePointsLedger({
        membershipId: membership.id, vipNumber: membership.cardId!, fullSettlementDate: membership.fullSettlementDate!, claimDate: membership.cardClaimDate!,
        validityEndDate: membership.validityEndDate!, financialHold: membership.financialHold, mayRelease: true, benefits: contract.benefits,
      }, input.spends.filter((spend) => spend.membershipId === membership.id), stayPoints, clock.today, state.pads[membership.id]?.date, emptyMovement());
      ledgerEntry("reserve", "weekday", pricing.weekdayPoints, reserveAt, "Booking confirmed");
      ledgerEntry("reserve", "weekend", pricing.weekendPoints, reserveAt, "Booking confirmed");
    }
    if (plan.status === "completed") {
      const done = clock.at(checkOut, "12:05");
      ledgerEntry("consume", "weekday", pricing.weekdayPoints, done, "Stay completed");
      ledgerEntry("consume", "weekend", pricing.weekendPoints, done, "Stay completed");
      booking.history.push({ at: done, actorId: "dev-gsd", event: "BOOKING_COMPLETED", note: null });
    }
    if (plan.status === "cancelled") {
      const cancelled = clock.at(clock.ago(1), "09:40");
      ledgerEntry("return", "weekday", pricing.weekdayPoints, cancelled, "Cancelled before the cut-off");
      ledgerEntry("return", "weekend", pricing.weekendPoints, cancelled, "Cancelled before the cut-off");
      booking.history.push({ at: cancelled, actorId: "dev-gsd", event: "BOOKING_CANCELLED", note: "The cardholder moved the family trip to next month." });
    }
    state.bookings.push(booking);
  }
  return state;
}

function emptyMovement(): PointsMovement {
  return { reserved: {}, redeemed: {}, forfeited: {} };
}

/** QR holder records for every claimed card (the portal and the counter scan use them). */
export function buildMemberQr(memberships: readonly Membership[]): Record<string, { holderKey: string; token: string }> {
  const records: Record<string, { holderKey: string; token: string }> = {};
  memberships.forEach((membership, index) => {
    if (membership.status !== "active" || !membership.cardId || !membership.cardClaimDate) return;
    records[JSON.stringify([membership.id, "primary"])] = {
      holderKey: JSON.stringify([membership.customerId, membership.cardId, 0]),
      token: membership.id === "memb-1" ? "c149175c37eb4eaabe092abefce8f47d" : tokenAt(index, "member-qr"),
    };
  });
  return records;
}

// --------------------------------------------------------------------------
// Audit trail
// --------------------------------------------------------------------------

type AuditSource = {
  customers: readonly Customer[];
  contracts: readonly Contract[];
  sales: readonly Sale[];
  payments: readonly Payment[];
  memberships: readonly Membership[];
  commissions: readonly Commission[];
  closedMonths: readonly ClosedMonth[];
  members: readonly OrgMember[];
  igpSales: readonly IgpSale[];
};

const ROLE_OF: Record<string, string[]> = {
  "dev-admin": ["admin"], "dev-super-admin": ["super_admin"], "dev-finance": ["finance"], "dev-clerk": ["clerk"], "dev-gsd": ["gsd"], system: ["system"],
};

/**
 * Display audit history for the seeded records (doc 12). Every event mirrors a
 * real repository action on an existing record and predates the store build, so
 * runtime events always sort newer.
 */
export function buildAuditEvents(clock: SeedClock, source: AuditSource): AuditEvent[] {
  type Draft = Omit<AuditEvent, "id" | "outcome" | "actorRoles"> & { actorRoles?: string[] };
  const drafts: Draft[] = [];
  const push = (timestamp: string, actorId: string, module: AuditModule, action: string, entityType: AuditEntityType, entityId: string, extra: Partial<Draft> = {}) => {
    if (timestamp.slice(0, 10) > clock.today) return;
    drafts.push({ timestamp, actorId, module, action, entityType, entityId, ...extra });
  };
  for (const customer of source.customers) {
    for (const entry of customer.statusHistory ?? []) {
      const action = entry.status === "submitted" ? "CUSTOMER_SUBMITTED" : entry.status === "approved" ? "CUSTOMER_APPROVED" : entry.status === "sent_back" ? "CUSTOMER_SENT_BACK" : "CUSTOMER_REJECTED";
      push(entry.at, entry.actorId, "customers", action, "customer", customer.id, { newValue: entry.status, reason: entry.reason ?? null });
    }
  }
  for (const contract of source.contracts) {
    for (const event of contract.history) {
      const at = event.at.length === 10 ? clock.at(event.at, "11:00") : event.at;
      push(at, event.actorId, "contracts", event.event, "contract", contract.id, { relatedRecordIds: [contract.customerId], newValue: event.event === "CONTRACT_RA_RECORDED" ? contract.vipNumber ?? null : null, reason: event.note });
    }
  }
  for (const payment of source.payments) {
    if (payment.status === "verified" && payment.verifiedAt) {
      push(payment.verifiedAt, payment.verifiedBy ?? "dev-finance", "finance", "PAYMENT_VERIFIED", "payment", payment.id, { newValue: "verified", relatedRecordIds: [payment.contractId] });
    }
  }
  for (const sale of source.sales) {
    const confirmation = sale.adjustments.find((item) => item.kind === "confirmation");
    if (confirmation) push(clock.at(confirmation.date, "18:00"), confirmation.actorId === "system" ? "system" : confirmation.actorId, "sales", "SALE_CONFIRMED", "sale", sale.id, { previousValue: "pending", newValue: "confirmed", relatedRecordIds: [sale.contractId] });
  }
  for (const membership of source.memberships) {
    for (const event of membership.history) push(event.at.length === 10 ? clock.at(event.at, "10:20") : event.at, event.actorId, "membership", event.event, "membership", membership.id, { relatedRecordIds: [membership.contractId] });
  }
  for (const commission of source.commissions) {
    for (const event of commission.history) {
      if (event.event === "COMMISSION_RELEASED") continue;
      push(event.at.length === 10 ? clock.at(event.at, "15:00") : event.at, event.actorId, "commissions", event.event, "commission", commission.id, { relatedRecordIds: [commission.saleId] });
    }
  }
  for (const closed of source.closedMonths) push(closed.closedAt, closed.closedBy, "finance", "MONTH_CLOSED", "sale", closed.month, { newValue: "closed" });
  for (const sale of source.igpSales) {
    push(clock.at(sale.date, "11:30"), sale.createdBy, "sales", "IGP_SERIES_ISSUED", "sale", sale.id, { newValue: sale.seriesNumber, displayReference: sale.seriesNumber });
    if (sale.approvedBy) push(clock.at(clock.addDays(sale.date, 1), "10:00"), sale.approvedBy, "sales", "IGP_SALE_APPROVED", "sale", sale.id, { newValue: "approved", displayReference: sale.seriesNumber });
  }
  drafts.sort((a, b) => a.timestamp.localeCompare(b.timestamp) || a.entityId.localeCompare(b.entityId));
  return drafts.map((draft, index) => ({
    id: `audit-${index + 1}`, ...draft, actorRoles: draft.actorRoles ?? ROLE_OF[draft.actorId] ?? [draft.actorId.replace("dev-", "").replace(/-[a-z0-9]+$/, "")], outcome: "success",
  }));
}
