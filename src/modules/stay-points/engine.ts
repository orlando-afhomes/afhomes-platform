import { addYearsToDate } from "@/shared/lib/dates";
import type { PointsBucket } from "@/modules/redemption/types";
import type { GiftLedgerEntry, PointsLedger, PointsMovement, PointsTerms, ResortSpend, StayPointsState } from "./types";

export function createStayPointsState(): StayPointsState {
  return { ledger: [], refunds: [], waivers: [], deemedPads: {}, transferDates: {} };
}

export function spendInPeriod(
  spends: readonly ResortSpend[], state: StayPointsState, start: string, end: string,
  asOf: string, includeStart: boolean,
): number {
  return spends.filter((bill) =>
    bill.status === "verified" && (includeStart ? bill.date >= start : bill.date > start)
    && bill.date <= end && (bill.approvedDate ?? bill.date) <= asOf,
  ).reduce((sum, bill) => sum + bill.amountCentavos - state.refunds
    .filter((refund) => refund.spendId === bill.id && refund.date <= asOf)
    .reduce((refunded, refund) => refunded + refund.amountCentavos, 0), 0);
}

export function firstPeriodEnd(settlement: string, pad: string): string {
  const cap = addYearsToDate(settlement, 2);
  return cap && cap < pad ? cap : pad;
}

function qualifyingRelease(
  spends: readonly ResortSpend[], state: StayPointsState, start: string, end: string, asOf: string,
  includeStart: boolean, earliest: string, minimum: number,
) {
  const dates = new Set([earliest]);
  for (const spend of spends) {
    const approved = spend.approvedDate ?? spend.date;
    if (approved > earliest && approved <= asOf) dates.add(approved);
  }
  for (const refund of state.refunds) {
    if (refund.date > earliest && refund.date <= asOf) dates.add(refund.date);
  }
  let qualification: string | null = null;
  for (const date of [...dates].sort()) {
    qualification = spendInPeriod(spends, state, start, end, date, includeStart) >= minimum ? qualification ?? date : null;
  }
  return qualification;
}

export function trancheAvailable(
  entry: GiftLedgerEntry, entries: readonly GiftLedgerEntry[], movement?: PointsMovement,
): number {
  const closed = entries.filter((other) => other.tranche === entry.tranche && other.bucket === entry.bucket
    && (other.type === "transfer" || other.type === "expiry"))
    .reduce((sum, other) => sum + other.points, 0);
  const used = movement
    ? (movement.reserved[entry.tranche]?.[entry.bucket] ?? 0)
      + (movement.redeemed[entry.tranche]?.[entry.bucket] ?? 0)
      + (movement.forfeited[entry.tranche]?.[entry.bucket] ?? 0)
    : 0;
  return Math.max(0, entry.points - closed - used);
}

export function isGiftRelease(entry: GiftLedgerEntry): boolean {
  return entry.type === "release" || entry.type === "waiver_release";
}

/** Decisions append once. Refunds change qualifying spend while prior release entries remain intact. */
export function computePointsLedger(
  terms: PointsTerms, spends: readonly ResortSpend[], state: StayPointsState,
  asOf: string, redemptionPad?: string, movement?: PointsMovement,
): PointsLedger {
  const { membershipId, vipNumber, claimDate, fullSettlementDate, benefits } = terms;
  const deemed = addYearsToDate(claimDate, 2);
  const padDate = redemptionPad ?? state.deemedPads[membershipId] ?? (deemed && deemed <= asOf ? deemed : null);
  if (padDate && !redemptionPad) state.deemedPads[membershipId] = padDate;
  const entries = state.ledger.filter((entry) => entry.membershipId === membershipId);
  const expired = asOf >= terms.validityEndDate;
  const transferDate = state.transferDates[membershipId];
  const append = (entry: Omit<GiftLedgerEntry, "membershipId" | "vipNumber">) => {
    const record = { ...entry, membershipId, vipNumber };
    entries.push(record);
    state.ledger.push(record);
    return record;
  };

  const tranches: PointsLedger["tranches"] = [];
  if (padDate) {
    for (let number = 1; number <= benefits.earningCycles; number += 1) {
      const dueDate = addYearsToDate(padDate, number - 1)!;
      const startDate = number === 1 ? fullSettlementDate : addYearsToDate(padDate, number - 2)!;
      const endDate = number === 1 ? firstPeriodEnd(fullSettlementDate, padDate) : dueDate;
      const qualifyingCentavos = spendInPeriod(spends, state, startDate, endDate, asOf, number === 1);
      const minimumCentavos = benefits.minSpendPerCycleCentavos;
      const waiver = state.waivers.find((item) => item.membershipId === membershipId && item.tranche === number && item.decision?.granted);
      const waiverDue = waiver?.decision?.releaseDate;
      let release = entries.find((entry) => entry.tranche === number && isGiftRelease(entry));
      const due = dueDate <= asOf;
      const earliest = terms.restoredFromHoldOn && terms.restoredFromHoldOn > dueDate ? terms.restoredFromHoldOn : dueDate;
      const qualifyingDate = due && qualifyingCentavos >= minimumCentavos
        ? qualifyingRelease(spends, state, startDate, endDate, asOf, number === 1, earliest, minimumCentavos) : null;
      const waiverDate = waiverDue && waiverDue <= asOf ? (waiverDue > earliest ? waiverDue : earliest) : null;
      const fromWaiver = Boolean(waiverDate && (!qualifyingDate || waiverDate < qualifyingDate));
      const releaseDate = fromWaiver ? waiverDate : qualifyingDate;
      const closedForTransfer = Boolean(transferDate && dueDate <= transferDate);
      if (!release && due && !expired && !closedForTransfer && terms.mayRelease && !terms.financialHold
        && releaseDate && releaseDate <= asOf) {
        for (const [bucket, points] of [["weekday", benefits.weekdayPointsPerCycle], ["weekend", benefits.weekendPointsPerCycle]] as const) {
          release = append({
            tranche: number, bucket, type: fromWaiver ? "waiver_release" : "release", points, date: releaseDate,
            reference: fromWaiver ? waiver?.supportingReference ?? null : null,
            actorId: fromWaiver ? waiver?.decision?.actorId ?? "system" : "system",
          });
        }
      }
      const status = release ? (release.type === "waiver_release" ? "released_by_waiver" : "released")
        : expired || closedForTransfer ? "forfeited" : due && !terms.financialHold ? "non_activated" : "unreleased";
      tranches.push({ number, dueDate, startDate, endDate, qualifyingCentavos, minimumCentavos, status, releaseDate: release?.date ?? null });
    }
  }

  const balances = { spendableWeekday: 0, spendableWeekend: 0, released: 0, reserved: 0, redeemed: 0, forfeited: 0 };
  for (const release of entries.filter(isGiftRelease)) {
    const { bucket, tranche } = release;
    let unused = trancheAvailable(release, entries, movement);
    if (expired && unused > 0) {
      append({ tranche, bucket, type: "expiry", points: unused, date: terms.validityEndDate, reference: null, actorId: "system" });
      unused = 0;
    }
    balances.released += release.points;
    balances[bucket === "weekday" ? "spendableWeekday" : "spendableWeekend"] += unused;
    balances.reserved += movement?.reserved[tranche]?.[bucket] ?? 0;
    balances.redeemed += movement?.redeemed[tranche]?.[bucket] ?? 0;
    balances.forfeited += movement?.forfeited[tranche]?.[bucket] ?? 0;
  }
  balances.forfeited += entries.filter((entry) => !isGiftRelease(entry)).reduce((sum, entry) => sum + entry.points, 0);
  return { padDate, tranches, entries, balances };
}

export function availableByBucket(ledger: PointsLedger): Record<PointsBucket, number> {
  return { weekday: ledger.balances.spendableWeekday, weekend: ledger.balances.spendableWeekend };
}
