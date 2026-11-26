import "server-only";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { Contract } from "@/modules/contracts/types";
import type { Membership } from "@/modules/membership/types";
import { computePointsLedger, isGiftRelease, trancheAvailable } from "@/modules/stay-points/engine";
import type { GiftLedgerEntry, PointsLedger, PointsMovement, PointsTerms, StayPointsState } from "@/modules/stay-points/types";
import { addYearsToDate } from "@/shared/lib/dates";
import type { Actor } from "@/server/auth/actor";
import { uniqueViolation } from "@/server/db";
import { loadLedgerEntries, loadMembershipSpends, loadWaiversOfMembership } from "@/server/repositories/records";
import { today, transact, type AuditSpec } from "@/server/services/common";

// shortcut: server-side redemption is not built yet, so reserved/redeemed/forfeited movement is empty in F7.
const NO_MOVEMENT: PointsMovement = { reserved: {}, redeemed: {}, forfeited: {} };

export function termsOf(membership: Membership, contract: Contract): PointsTerms | null {
  if (!membership.cardId || !membership.cardClaimDate || !membership.validityEndDate || !membership.fullSettlementDate) return null;
  if (!contract.benefits?.earningCycles) return null;
  return {
    membershipId: membership.id, vipNumber: membership.cardId,
    fullSettlementDate: membership.fullSettlementDate, claimDate: membership.cardClaimDate,
    validityEndDate: membership.validityEndDate, financialHold: membership.financialHold,
    ...(membership.restoredFromHoldOn ? { restoredFromHoldOn: membership.restoredFromHoldOn } : {}),
    mayRelease: membership.status === "active",
    benefits: {
      earningCycles: contract.benefits.earningCycles,
      minSpendPerCycleCentavos: contract.benefits.minSpendPerCycleCentavos,
      weekdayPointsPerCycle: contract.benefits.weekdayPointsPerCycle,
      weekendPointsPerCycle: contract.benefits.weekendPointsPerCycle,
    },
  };
}

/**
 * The Annual Welcome Gift ledger: the insert-only entries already written plus the entries the
 * computation surfaces now. New releases, waiver releases, transfer closures and expiry forfeits
 * are persisted once (the composite key makes a parallel write idempotent), and the deemed Points
 * Activation Date is recorded the first time it occurs (doc 09 §8.5, §15.2).
 */
export async function ledgerOf(actor: Actor, membership: Membership, contract: Contract, asOf = today()): Promise<PointsLedger | null> {
  const terms = termsOf(membership, contract);
  if (!terms) return null;
  const [persisted, { spends, refunds }, waivers] = await Promise.all([
    loadLedgerEntries(membership.id), loadMembershipSpends(membership.id), loadWaiversOfMembership(membership.id),
  ]);
  const state: StayPointsState = {
    ledger: [...persisted], refunds, waivers,
    deemedPads: membership.deemedPadDate ? { [membership.id]: membership.deemedPadDate } : {},
    transferDates: membership.transferDate ? { [membership.id]: membership.transferDate } : {},
  };
  const ledger = computePointsLedger(terms, spends, state, asOf, undefined, NO_MOVEMENT);
  await persistEntries(actor, membership, ledger, persisted);
  return ledger;
}

async function persistEntries(actor: Actor, membership: Membership, ledger: PointsLedger, persisted: GiftLedgerEntry[]): Promise<void> {
  const known = new Set(persisted.map((entry) => `${entry.tranche}:${entry.bucket}:${entry.type}`));
  const fresh = ledger.entries.filter((entry) => !known.has(`${entry.tranche}:${entry.bucket}:${entry.type}`));
  const deemed = membership.cardClaimDate ? addYearsToDate(membership.cardClaimDate, 2) : null;
  const recordPad = Boolean(ledger.padDate && !membership.deemedPadDate && deemed && ledger.padDate === deemed);
  if (!fresh.length && !recordPad) return;
  const definitions: string[] = [];
  const fields: string[] = [];
  const variables: Record<string, unknown> = {};
  const audits: AuditSpec[] = [];
  fresh.forEach((entry, index) => {
    const alias = `le${index}`;
    definitions.push(`$${alias}: StayPointsLedgerEntry_Data!`);
    variables[alias] = {
      membershipId: membership.id, tranche: entry.tranche, bucket: entry.bucket, type: entry.type,
      points: entry.points, date: entry.date, reference: entry.reference ?? null,
      actorId: entry.actorId === "system" ? undefined : entry.actorId,
    };
    fields.push(`${alias}: stayPointsLedgerEntry_insert(data: $${alias})`);
    audits.push({
      action: entry.type === "expiry" ? BUSINESS_AUDIT_ACTIONS.STAY_POINTS_EXPIRED
        : entry.type === "transfer" ? BUSINESS_AUDIT_ACTIONS.STAY_POINTS_TRANSFERRED
          : BUSINESS_AUDIT_ACTIONS.STAY_POINTS_RELEASED,
      entityType: "membership", entityId: membership.id,
      details: { module: "stay-points", displayReference: membership.cardId, newValue: JSON.stringify({ tranche: entry.tranche, bucket: entry.bucket, points: entry.points, businessDate: entry.date }) },
    });
  });
  if (recordPad && ledger.padDate) {
    definitions.push("$padId: UUID!", "$pad: Date!");
    variables["padId"] = membership.id;
    variables["pad"] = ledger.padDate;
    fields.push("pad: membership_updateMany(where: { id: { eq: $padId }, deemedPadDate: { isNull: true } }, data: { deemedPadDate: $pad })");
    audits.push({ action: BUSINESS_AUDIT_ACTIONS.POINTS_ACTIVATION_DEEMED, entityType: "membership", entityId: membership.id, details: { module: "stay-points", displayReference: membership.cardId, newValue: ledger.padDate } });
  }
  try {
    await transact(actor, { variableDefinitions: definitions.join(", "), fields: fields.join("\n"), variables, audit: audits });
  } catch (error) {
    // A parallel read persisted the same entry first; the composite key keeps the ledger single-entry.
    if (!uniqueViolation(error)) throw error;
  }
}

/** The transfer closure entries for unused released points (doc 09 §18, invariant 14). */
export function transferClosure(ledger: PointsLedger, membership: Membership, date: string, reference: string, actorId: string): GiftLedgerEntry[] {
  return ledger.entries.filter(isGiftRelease).flatMap((entry) => {
    const points = trancheAvailable(entry, ledger.entries, NO_MOVEMENT);
    return points > 0 ? [{ ...entry, type: "transfer" as const, points, date, reference, actorId }] : [];
  }).filter((entry) => entry.membershipId === membership.id);
}
