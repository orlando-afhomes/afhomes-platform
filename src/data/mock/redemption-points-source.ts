import { approvedCollectionMilestone } from "@/modules/finance/rules";
import type { Membership } from "@/modules/membership/types";
import type { PointsBucket } from "@/modules/redemption/types";
import { addYearsToDate, manilaDateOf } from "@/shared/lib/dates";
import { availableByBucket, computePointsLedger, firstPeriodEnd, isGiftRelease, spendInPeriod, trancheAvailable } from "@/modules/stay-points/engine";
import type { PointsMovement, PointsTerms } from "@/modules/stay-points/types";
import { appendAuditEvent } from "./audit";
import { today } from "./business-base";
import type { MockStore } from "./seed";
import { recordDueDeemedClaim } from "./card-claim";

export type PointsSource = {
  grossSpendable(membership: Membership, store: MockStore): Record<PointsBucket, number>;
  yearOneConditionMet(membership: Membership, store: MockStore, date?: string): boolean;
  ledger?: typeof membershipPointsLedger;
};

export function resolvePointsTerms(membership: Membership, store: MockStore): PointsTerms | null {
  const contract = store.contracts.find((item) => item.id === membership.contractId);
  if (contract) recordDueDeemedClaim(store, membership, contract);
  if (!contract || !membership.cardClaimDate || !membership.validityEndDate || !membership.cardId) return null;
  const fullSettlementDate = membership.fullSettlementDate
    ?? approvedCollectionMilestone(contract.priceCentavos, store.payments.filter((item) => item.contractId === contract.id), 10_000)?.date;
  if (!fullSettlementDate) return null;
  const restoration = membership.history.findLast((event) => event.event === "FINANCIAL_HOLD_RELEASED");
  return {
    membershipId: membership.id, vipNumber: membership.cardId, fullSettlementDate, claimDate: membership.cardClaimDate,
    validityEndDate: membership.validityEndDate, financialHold: membership.financialHold,
    restoredFromHoldOn: restoration ? manilaDateOf(restoration.at) : undefined,
    mayRelease: membership.status === "active", benefits: contract.benefits,
  };
}

export function pointsMovement(store: MockStore, membershipId: string): PointsMovement {
  const result: PointsMovement = { reserved: {}, redeemed: {}, forfeited: {} };
  for (const entry of store.redemption.ledger) {
    if (entry.membershipId !== membershipId || !entry.trancheId) continue;
    const tranche = Number(entry.trancheId);
    const reserved = result.reserved[tranche] ??= { weekday: 0, weekend: 0 };
    if (entry.type === "reserve") reserved[entry.bucket] += entry.points;
    else {
      reserved[entry.bucket] -= entry.points;
      if (entry.type === "consume" || entry.type === "forfeit") {
        const target = entry.type === "consume" ? result.redeemed : result.forfeited;
        (target[tranche] ??= { weekday: 0, weekend: 0 })[entry.bucket] += entry.points;
      }
    }
  }
  return result;
}

export function membershipPointsLedger(membership: Membership, store: MockStore, asOf = today()) {
  const terms = resolvePointsTerms(membership, store);
  if (!terms) return null;
  const state = store.stayPoints;
  const ledgerLength = state.ledger.length;
  const previousDeemed = state.deemedPads[membership.id];
  const ledger = computePointsLedger(
    terms, store.resortSpends.filter((item) => item.membershipId === membership.id), state, asOf,
    store.redemption.pads[membership.id]?.date, pointsMovement(store, membership.id),
  );
  if (!previousDeemed && state.deemedPads[membership.id]) {
    appendAuditEvent(store, {
      module: "stay-points", action: "POINTS_ACTIVATION_DEEMED", entityType: "membership", entityId: membership.id,
      displayReference: membership.cardId, newValue: state.deemedPads[membership.id], actorId: "system", actorRoles: ["system"], outcome: "success",
    });
  }
  for (const entry of state.ledger.slice(ledgerLength)) {
    appendAuditEvent(store, {
      module: "stay-points", action: entry.type === "expiry" ? "STAY_POINTS_EXPIRED" : "STAY_POINTS_RELEASED",
      entityType: "membership", entityId: membership.id, displayReference: membership.cardId,
      newValue: JSON.stringify({ tranche: entry.tranche, bucket: entry.bucket, points: entry.points, businessDate: entry.date, reference: entry.reference }),
      actorId: "system", actorRoles: ["system"], outcome: "success",
    });
  }
  return ledger;
}

export const engineBackedPointsSource: PointsSource = {
  grossSpendable(membership, store) {
    const ledger = membershipPointsLedger(membership, store);
    return ledger ? availableByBucket(ledger) : { weekday: 0, weekend: 0 };
  },
  yearOneConditionMet(membership, store, date = today()) {
    const terms = resolvePointsTerms(membership, store);
    if (!terms) return false;
    const deemed = addYearsToDate(terms.claimDate, 2);
    const pad = store.redemption.pads[membership.id]?.date ?? (deemed && deemed < date ? deemed : date);
    return spendInPeriod(store.resortSpends.filter((item) => item.membershipId === membership.id), store.stayPoints,
      terms.fullSettlementDate, firstPeriodEnd(terms.fullSettlementDate, pad), today(), true) >= terms.benefits.minSpendPerCycleCentavos;
  },
  ledger: membershipPointsLedger,
};

export function closeStayPointsForTransfer(store: MockStore, membership: Membership, effectiveDate: string, actorId: string, reference: string): void {
  const ledger = membershipPointsLedger(membership, store, effectiveDate);
  const movement = pointsMovement(store, membership.id);
  for (const entry of ledger?.entries.filter(isGiftRelease) ?? []) {
    const points = trancheAvailable(entry, ledger!.entries, movement);
    if (points > 0) {
      store.stayPoints.ledger.push({ ...entry, type: "transfer", points, date: effectiveDate, reference, actorId });
    }
  }
  store.stayPoints.transferDates[membership.id] = effectiveDate;
}
