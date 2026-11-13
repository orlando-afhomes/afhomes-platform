import { computePointsLedger } from "@/modules/stay-points/engine";
import type { Membership } from "@/modules/membership/types";
import type { MockStore } from "./seed";

/**
 * The only coupling between Redemption and the Stay Points earning model. A later
 * rewrite of the earning model (doc 09 tranches) replaces this file's default
 * implementation; nothing else in Redemption reads the engine.
 */
export type PointsSource = {
  /** Released points per bucket before any redemption movement. */
  grossSpendable(membership: Membership, store: MockStore): { weekday: number; weekend: number };
  /** Whether the Year 1 condition holds when a first redemption would set the PAD (owner ruling A7b). */
  yearOneConditionMet(membership: Membership, store: MockStore): boolean;
};

/**
 * shortcut: reads the current engine (spend-to-earn model). Its spendable balance stands in
 * for released tranches, and its first cycle's minimum-spend flag stands in for the Year 1
 * condition. Replace when the Annual Welcome Gift tranche model lands.
 */
export const engineBackedPointsSource: PointsSource = {
  grossSpendable(membership, store) {
    const ledger = computeLedger(membership, store);
    return { weekday: ledger?.balances.spendableWeekday ?? 0, weekend: ledger?.balances.spendableWeekend ?? 0 };
  },
  yearOneConditionMet(membership, store) {
    return computeLedger(membership, store)?.cycles.find((cycle) => cycle.cycle === 1)?.minimumReached ?? false;
  },
};

function computeLedger(membership: Membership, store: MockStore) {
  const contract = store.contracts.find((item) => item.id === membership.contractId);
  if (!contract || !membership.activationDate) return null;
  return computePointsLedger(membership.activationDate, contract.benefits, store.resortSpends.filter((item) => item.membershipId === membership.id));
}
