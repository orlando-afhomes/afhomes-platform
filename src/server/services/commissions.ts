import "server-only";
import type { CommissionView } from "@/data/contracts/commission-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { ApplyVipPositionRateInput, Commission, CommissionClawback, CommissionClawbackTrigger, CommissionPayoutList, CommissionProduct, CommissionRateSetting, CommissionStage, FrozenCommissionRate, VipPositionRate } from "@/modules/commissions/types";
import { PAYOUT_METHODS } from "@/modules/commissions/types";
import { applyBasisPoints } from "@/shared/lib/money";
import { clawbackBalance, commissionStageAmounts, meetsPayoutRelease, payoutReleaseDateFor, planClawbackOffsets } from "@/modules/commissions/rules";
import { calculateAllowances, SHIPPED_ALLOWANCE_TERMS, type AllowanceReview, type AllowanceReviewInput } from "@/modules/commissions/allowances";
import { assembleAllowanceInputs as assembleInputs } from "@/modules/commissions/allowance-assembly";
import { buildVipNumber } from "@/modules/membership/rules";
import { VIP_CLOSED_DEAL_THRESHOLD_BP } from "@/modules/sales/rules";
import type { Payment } from "@/modules/finance/types";
import { totalVerifiedCentavos } from "@/modules/finance/rules";
import { firstOpenDate } from "@/modules/finance/month-close";
import type { Sale } from "@/modules/sales/types";
import type { SeatVacancy } from "@/modules/sales-network/vacancy";
import { parseManilaDateOnly } from "@/shared/lib/dates";
import type { Actor } from "@/server/auth/actor";
import { requireOperation, visibleMemberIdsFor } from "@/server/auth/authorize";
import { hasOperationPermission } from "@/modules/identity/permissions";
import { activeRoles } from "@/modules/identity/active-roles";
import { dbRead, listAll, uniqueViolation } from "@/server/db";
import { centavosToInt64, int64ToCentavos } from "@/server/money";
import {
  commissionColumns, loadAllowanceReviews, loadClawback, loadClawbacksOfMember, loadCommission, loadCommissionPayoutList,
  loadCommissionPayoutLists, loadCommissionRateSettings, loadCommissions, loadCommissionsOfSale, loadCommissionClawbacks,
  loadMembersFull, loadPaymentsOfContract, loadSaleForContract, loadVipPositionRates,
} from "@/server/repositories/records";
import type { AuditSpec } from "@/server/services/common";
import { conflict, invalid, newId, notFound, nowIso, today, transact } from "@/server/services/common";

type Ref = { id: string } | null;

// ---------------------------------------------------------------- shared effect plumbing
/**
 * Commission effects join the caller's own transaction (one business change, one transaction):
 * each helper appends mutation fields, variables and audit rows to this context.
 */
export type CommissionEffects = { definitions: string[]; fields: string[]; variables: Record<string, unknown>; audits: AuditSpec[] };

export function commissionEffects(): CommissionEffects {
  return { definitions: [], fields: [], variables: {}, audits: [] };
}

/** Pre-read commission state for one sale: its rows, their clawbacks, the closed months and member names. */
export type CommissionState = {
  commissions: Commission[];
  clawbacks: CommissionClawback[];
  closedMonths: string[];
  members: Map<string, { displayName: string; designation: string; clawbackAddendumSignedDate: string | null }>;
};

export async function loadSaleCommissionState(saleId: string): Promise<CommissionState> {
  const [commissions, closed, members] = await Promise.all([loadCommissionsOfSale(saleId), listAll<{ month: string }>("closedMonths", "month"), loadMembersFull()]);
  const commissionIds = new Set(commissions.map((row) => row.id));
  const clawbacks = commissionIds.size ? (await loadCommissionClawbacks()).filter((row) => commissionIds.has(row.commissionId)) : [];
  return {
    commissions,
    clawbacks,
    closedMonths: closed.map((row) => row.month),
    members: new Map(members.map((member) => [member.id, { displayName: member.displayName, designation: member.designation, clawbackAddendumSignedDate: member.clawbackAddendumSignedDate ?? null }])),
  };
}

const eventOf = (commission: Commission, actorId: string, event: string, note: string | null = null) => [
  ...(commission.history ?? []),
  { at: nowIso(), actorId, event, note },
];

function commissionInsertData(commission: Commission): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(commissionColumns(commission))) {
    if (value !== undefined && value !== null && value !== "") data[key] = value;
  }
  return data;
}

const UPDATE_FIELD_TYPES: Record<string, string> = {
  status: "String!", releaseDate: "Date", holdReason: "String", holdTrigger: "String", releaseRestorable: "Boolean!",
  amountCentavos: "Int64!", percentBp: "Int!", approvedById: "UUID",
};

/** One guarded commission update: the write commits only while the row still holds the status that was read. */
function commissionUpdate(id: string, alias: string, readStatus: Commission["status"], data: Record<string, unknown>, effects: CommissionEffects): void {
  effects.definitions.push(`$${alias}Id: UUID!`);
  effects.variables[`${alias}Id`] = id;
  const assignments = Object.entries(data).map(([key, value]) => {
    const type = UPDATE_FIELD_TYPES[key];
    if (!type) throw new Error(`No GraphQL type mapped for commission field ${key}.`);
    // Data Connect rejects variable names with underscores, so the field name is camel-cased onto the alias.
    const name = `${alias}${key.charAt(0).toUpperCase()}${key.slice(1)}`;
    effects.definitions.push(`$${name}: ${type}`);
    effects.variables[name] = value;
    return `${key}: $${name}`;
  }).join(", ");
  effects.fields.push(`${alias}: commission_updateMany(where: { id: { eq: $${alias}Id }, status: { eq: "${readStatus}" } }, data: { ${assignments} })`);
}

function appendHistoryFx(id: string, alias: string, history: Commission["history"], effects: CommissionEffects): void {
  effects.definitions.push(`$${alias}Id: UUID!`, `$${alias}H: Any!`);
  effects.variables[`${alias}Id`] = id;
  effects.variables[`${alias}H`] = history;
  effects.fields.push(`${alias}h: commission_updateMany(where: { id: { eq: $${alias}Id } }, data: { history: $${alias}H })`);
}

/** Creates or restores one commission row per frozen rate and stage (doc 08 sections 8 and 13). */
export function releaseCommissionsFx(
  effects: CommissionEffects, actor: Actor, state: CommissionState,
  input: { saleId: string; contractId: string; product: CommissionProduct; valueCentavos: number; rates: readonly FrozenCommissionRate[]; stage1Date: string | null; fullPaymentDate: string | null },
): void {
  const releases = input.rates.flatMap((rate) =>
    commissionStageAmounts(input.valueCentavos, rate.rateBp, input.product).map((amount) => ({ ...rate, ...amount })));
  let index = 0;
  for (const release of releases) {
    const date = release.stage === "stage1" ? input.stage1Date : input.fullPaymentDate;
    if (!date || release.amountCentavos === 0) continue;
    const existing = state.commissions.find((item) => item.saleId === input.saleId && item.recipientMemberId === release.memberId && item.role === release.role && item.stage === release.stage);
    index += 1;
    if (existing && !existing.rereleaseAfter) {
      if (existing.status === "on_hold" && !existing.payout && (existing.releaseRestorable || existing.holdTrigger === "returned_cheque" || existing.holdTrigger === "default")) {
        const status: Commission["status"] = existing.approvedAt ? "approved" : "released";
        const restoredDate = status === "released" && existing.releaseDate && state.closedMonths.some((month) => month === existing.releaseDate?.slice(0, 7))
          ? firstOpenDate(state.closedMonths.map((month) => ({ month })), date) : existing.releaseDate ?? null;
        const alias = `cr${index}`;
        commissionUpdate(existing.id, alias, "on_hold", {
          status, holdReason: null, holdTrigger: null, releaseRestorable: false,
          ...(restoredDate && restoredDate !== existing.releaseDate ? { releaseDate: restoredDate } : {}),
        }, effects);
        appendHistoryFx(existing.id, `${alias}r`, eventOf(existing, actor.userId, "COMMISSION_RESTORED"), effects);
        effects.audits.push({ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_RESTORED, entityType: "commission", entityId: existing.id, details: { module: "commissions", previousValue: "on_hold", newValue: status, relatedRecordIds: [input.saleId] } });
        // Later passes in the same transaction must see the row as restored, not re-emit it.
        existing.status = status;
        existing.holdTrigger = undefined;
        existing.holdReason = null;
        existing.releaseRestorable = undefined;
        if (restoredDate) existing.releaseDate = restoredDate;
      }
      continue;
    }
    const member = state.members.get(release.memberId);
    const commission: Commission = {
      id: newId(), saleId: input.saleId, contractId: input.contractId, recipientMemberId: release.memberId,
      recipientName: member?.displayName ?? release.memberId, recipientDesignation: member?.designation ?? "",
      basisCentavos: input.valueCentavos, percentBp: release.rateBp, amountCentavos: release.amountCentavos,
      product: input.product, role: release.role, stage: release.stage,
      releaseDate: existing?.rereleaseAfter ? firstOpenDate(state.closedMonths.map((month) => ({ month })), existing.rereleaseAfter > date ? existing.rereleaseAfter : date) : date,
      status: "released", approvedBy: "", approvedAt: "", holdReason: null, payout: null,
      history: [{ at: nowIso(), actorId: actor.userId, event: "COMMISSION_RELEASED", note: null }],
    };
    const alias = `ci${index}`;
    effects.definitions.push(`$${alias}: Commission_Data!`);
    effects.variables[alias] = commissionInsertData(commission);
    effects.fields.push(`${alias}i: commission_insert(data: $${alias})`);
    effects.audits.push({ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_RELEASED, entityType: "commission", entityId: commission.id, details: { module: "commissions", newValue: String(release.amountCentavos), relatedRecordIds: [input.saleId] } });
    // Later passes in the same transaction must see the new row instead of creating it twice.
    state.commissions.push(commission);
  }
}

/** Holds unpaid commission on a sale event and raises clawbacks for paid stages (doc 08 sections 13 and 14). */
export function applyCommissionTriggerFx(
  effects: CommissionEffects, actor: Actor, state: CommissionState,
  input: { saleId: string; trigger: CommissionClawbackTrigger; date: string; stages?: CommissionStage[] },
): void {
  let index = 0;
  for (const commission of state.commissions) {
    if (commission.saleId !== input.saleId || (input.stages && !input.stages.includes(commission.stage ?? "stage1"))) continue;
    if (commission.status === "paid") {
      if (input.trigger === "returned_cheque" && !state.closedMonths.some((month) => month === commission.payout?.payoutDate.slice(0, 7))) {
        // Doc 08 section 14.1 raises the clawback only when the stage was paid in a closed month.
        const note = "A returned cheque un-made the release stage after this commission was paid, but the payout month is still open, so no clawback was raised automatically. Finance review required.";
        const alias = `te${index}`;
        effects.definitions.push(`$${alias}Id: UUID!`, `$${alias}H: Any!`);
        effects.variables[`${alias}Id`] = commission.id;
        effects.variables[`${alias}H`] = eventOf(commission, actor.userId, BUSINESS_AUDIT_ACTIONS.COMMISSION_CLAWBACK_ESCALATED, note);
        effects.fields.push(`${alias}: commission_updateMany(where: { id: { eq: $${alias}Id }, status: { eq: "paid" } }, data: { history: $${alias}H })`);
        effects.audits.push({ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_CLAWBACK_ESCALATED, entityType: "commission", entityId: commission.id, details: { module: "commissions", previousValue: "paid", newValue: "paid", reason: note, relatedRecordIds: [input.saleId] } });
        index += 1;
        continue;
      }
      if (state.clawbacks.some((item) => item.commissionId === commission.id)) continue;
      const clawbackId = newId();
      const alias = `cbi${index}`;
      effects.definitions.push(`$${alias}: CommissionClawback_Data!`);
      effects.variables[alias] = {
        id: clawbackId, commissionId: commission.id, saleId: commission.product === "IGP" ? undefined : input.saleId,
        igpSaleId: commission.product === "IGP" ? input.saleId : undefined, recipientMemberId: commission.recipientMemberId,
        trigger: input.trigger, raisedDate: input.date, amountCentavos: centavosToInt64(commission.amountCentavos),
        recoveries: [], writeOff: null,
      };
      effects.fields.push(`${alias}i: commissionClawback_insert(data: $${alias})`);
      effects.audits.push({ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_CLAWBACK_RAISED, entityType: "commission", entityId: commission.id, details: { module: "commissions", newValue: String(commission.amountCentavos), reason: input.trigger, relatedRecordIds: [input.saleId, clawbackId] } });
      index += 1;
    } else if (commission.status === "released" || commission.status === "approved" || commission.status === "on_hold") {
      if (commission.status === "on_hold" && commission.holdTrigger === input.trigger) continue;
      const alias = `cbh${index}`;
      const previous = commission.status;
      commissionUpdate(commission.id, alias, previous, { status: "on_hold", holdReason: input.trigger.replaceAll("_", " "), holdTrigger: input.trigger }, effects);
      appendHistoryFx(commission.id, `${alias}r`, eventOf(commission, actor.userId, "COMMISSION_HELD", input.trigger.replaceAll("_", " ")), effects);
      effects.audits.push({ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_HELD, entityType: "commission", entityId: commission.id, details: { module: "commissions", previousValue: previous, newValue: "on_hold", reason: input.trigger, relatedRecordIds: [input.saleId] } });
      // Later passes in the same transaction must see the row as held, not re-emit it.
      commission.status = "on_hold";
      commission.holdTrigger = input.trigger;
      index += 1;
    }
  }
}

/** Holds released or approved commission under a plain reason; the restore flag marks recoverable holds. */
export function holdUnpaidCommissionsFx(effects: CommissionEffects, actor: Actor, state: CommissionState, saleId: string, reason: string, restoreWhenQualified = false, stages?: CommissionStage[]): void {
  let index = 0;
  for (const commission of state.commissions) {
    if (commission.saleId !== saleId || (stages && !stages.includes(commission.stage ?? "stage1"))) continue;
    if (commission.status !== "released" && commission.status !== "approved") continue;
    const alias = `hu${index}`;
    commissionUpdate(commission.id, alias, commission.status, { status: "on_hold", holdReason: reason, releaseRestorable: restoreWhenQualified }, effects);
    appendHistoryFx(commission.id, `${alias}r`, eventOf(commission, actor.userId, "COMMISSION_HELD", reason), effects);
    effects.audits.push({ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_HELD, entityType: "commission", entityId: commission.id, details: { module: "commissions", previousValue: commission.status, newValue: "on_hold", reason, relatedRecordIds: [saleId] } });
    // Later passes in the same transaction must see the row as held, not re-emit it.
    commission.status = "on_hold";
    commission.holdReason = reason;
    index += 1;
  }
}

/** Reinstatement of a Defaulted sale: open default clawbacks are written off, recoveries reported for refund (doc 08 section 14.6). */
export function restoreDefaultedCommissionsFx(effects: CommissionEffects, actor: Actor, state: CommissionState, saleId: string, date: string): void {
  let index = 0;
  for (const clawback of state.clawbacks) {
    if (clawback.saleId !== saleId || clawback.trigger !== "default" || clawback.refundDueCentavos !== undefined) continue;
    const writeOff = clawbackBalance(clawback) > 0 ? { date, actorId: actor.userId, reason: "Defaulted sale reinstated." } : null;
    const refunded = clawback.recoveries.reduce((total, entry) => total + entry.amountCentavos, 0);
    effects.definitions.push(`$cbr${index}Id: UUID!`, `$cbr${index}Wo: Any!`, `$cbr${index}Ref: Int64!`);
    effects.variables[`cbr${index}Id`] = clawback.id;
    effects.variables[`cbr${index}Wo`] = writeOff;
    effects.variables[`cbr${index}Ref`] = centavosToInt64(refunded);
    effects.fields.push(`cbr${index}: commissionClawback_updateMany(where: { id: { eq: $cbr${index}Id } }, data: { writeOff: $cbr${index}Wo, refundDueCentavos: $cbr${index}Ref })`);
    const commission = state.commissions.find((item) => item.id === clawback.commissionId);
    if (commission) {
      effects.definitions.push(`$cbr${index}C: UUID!`, `$cbr${index}Date: Date!`);
      effects.variables[`cbr${index}C`] = commission.id;
      effects.variables[`cbr${index}Date`] = date;
      effects.fields.push(`cbr${index}c: commission_updateMany(where: { id: { eq: $cbr${index}C } }, data: { rereleaseAfter: $cbr${index}Date })`);
    }
    effects.audits.push({ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_DEFAULT_REINSTATED, entityType: "commission", entityId: clawback.commissionId, details: { module: "commissions", newValue: String(refunded), reason: "Defaulted sale reinstated. Amount shown is due for refund.", relatedRecordIds: [saleId, clawback.id] } });
    index += 1;
  }
}

/** A clawback recovery appended by a payout-list approval or an allowance review (owner decision 2026-11-22). */
export function clawbackRecoveryFx(effects: CommissionEffects, actor: Actor, clawback: CommissionClawback, amountCentavos: number, reference: string): void {
  const index = effects.fields.length;
  effects.definitions.push(`$off${index}Id: UUID!`, `$off${index}R: Any!`);
  effects.variables[`off${index}Id`] = clawback.id;
  effects.variables[`off${index}R`] = [...clawback.recoveries, { date: today(), actorId: actor.userId, amountCentavos, reference }];
  effects.fields.push(`off${index}: commissionClawback_updateMany(where: { id: { eq: $off${index}Id } }, data: { recoveries: $off${index}R })`);
  effects.audits.push({ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_CLAWBACK_OFFSET, entityType: "commission", entityId: clawback.commissionId, details: { module: "commissions", newValue: String(amountCentavos), reason: reference, relatedRecordIds: [clawback.saleId, clawback.id] } });
}

// ---------------------------------------------------------------- VIP Number issuance (doc 06 sections 3, 5 and 6)
export type IssuanceReadiness = { vipNumber: string; rates: FrozenCommissionRate[] } | { blocker: string } | null;

/**
 * Builds the VIP Number when the F4 blockers are gone: approved sale, signed agreement on file, the first
 * scheduled payment verified and approved DSC/DRI rates recorded (doc 06 section 8 step 5). Returns null
 * when nothing is due, or the blocker text when a rate or the payment code is still missing.
 */
export function vipIssuance(
  contract: { status: string; vipNumber?: string | null; signedAgreementRecordedDate?: string | null; productCode: string; paymentCode?: string | null; classification: string; requiredInitialCentavos?: number | null },
  sale: Pick<Sale, "approval" | "sellerMemberId" | "referrerMemberId" | "valueCentavos"> | null,
  payments: readonly Payment[],
  rateSettings: readonly CommissionRateSetting[],
  issuedNumbers: readonly string[],
): IssuanceReadiness {
  if (!sale?.approval || contract.vipNumber) return null;
  if (!["submitted", "under_review", "finalized"].includes(contract.status)) return null;
  if (!contract.signedAgreementRecordedDate || !sale.sellerMemberId) return null;
  // The first scheduled payment after the reservation fee must be verified (doc 06 section 8 step 5).
  if (contract.requiredInitialCentavos == null || totalVerifiedCentavos(payments) < contract.requiredInitialCentavos) return null;
  const rateFor = (memberId: string, role: "DSC" | "DRI"): FrozenCommissionRate => {
    const setting = rateSettings.find((item) => item.memberId === memberId && item.product === "VIP" && item.role === role);
    if (!setting) throw new Error(`Record the approved ${role} rate for the ${role === "DSC" ? "closing seller" : "referrer"} before issuing the number.`);
    return { memberId, role, rateBp: setting.rateBp };
  };
  let rates: FrozenCommissionRate[];
  try {
    rates = [rateFor(sale.sellerMemberId, "DSC"), ...(sale.referrerMemberId ? [rateFor(sale.referrerMemberId, "DRI")] : [])];
    for (const rate of rates) commissionStageAmounts(sale.valueCentavos, rate.rateBp, "VIP");
  } catch (error) {
    return { blocker: error instanceof Error ? error.message : "Review the payment code and commission rates." };
  }
  if (!contract.paymentCode) return { blocker: "Record the approved card level and payment code before issuing the number." };
  const issueDate = today();
  const prefix = `${issueDate.slice(2, 4)}${issueDate.slice(5, 7)}${issueDate.slice(8, 10)}`;
  const highest = issuedNumbers.reduce((max, number) => (number.startsWith(prefix) ? Math.max(max, Number(number.slice(6, 11)) || 0) : max), 0);
  return { vipNumber: buildVipNumber(issueDate, highest + 1, contract.productCode, contract.paymentCode, contract.classification as "S" | "N"), rates };
}

/** Appends the issuance writes for a ready number to the caller's transaction. The RA number keeps its
 *  existing value when one is recorded; otherwise the VIP Number becomes it (mock business-effects parity). */
export function issueVipNumberFx(effects: CommissionEffects, actor: Actor, contractId: string, sale: Sale, issuance: { vipNumber: string; rates: FrozenCommissionRate[] }, raNumber: string | null): void {
  effects.definitions.push("$vipContract: UUID!", "$vipNumber: String!", ...(raNumber ? [] : ["$vipRa: String!"]), "$vipDetails: Any!");
  effects.variables["vipContract"] = contractId;
  effects.variables["vipNumber"] = issuance.vipNumber;
  if (!raNumber) effects.variables["vipRa"] = issuance.vipNumber;
  // The loaded Sale spreads its `details`; the type does not restate them.
  const saleDetails = sale as Sale & { details?: Record<string, unknown>; team?: unknown[]; expiryReminders?: unknown[] };
  effects.variables["vipDetails"] = {
    ...(saleDetails.details ?? {}),
    commissionRates: issuance.rates,
    closedDealThresholdBp: VIP_CLOSED_DEAL_THRESHOLD_BP,
    ...(saleDetails.team?.length ? { team: saleDetails.team } : {}),
    ...(saleDetails.expiryReminders ? { expiryReminders: saleDetails.expiryReminders } : {}),
  };
  effects.fields.push(
    `vip: contract_updateMany(where: { id: { eq: $vipContract } }, data: { vipNumber: $vipNumber${raNumber ? "" : ", raNumber: $vipRa"} })`,
    "vipSale: sale_updateMany(where: { contract: { id: { eq: $vipContract } } }, data: { details: $vipDetails })",
  );
  effects.audits.push({ action: BUSINESS_AUDIT_ACTIONS.VIP_NUMBER_ISSUED, entityType: "contract", entityId: contractId, details: { module: "contracts", newValue: issuance.vipNumber, displayReference: issuance.vipNumber, relatedRecordIds: [sale.id] } });
}

// ---------------------------------------------------------------- rate directory and settings
export async function rateDirectory(actor: Actor) {
  requireOperation(actor, "commission.rates.manage");
  const [members, rates, positionRates] = await Promise.all([loadMembersFull(), loadCommissionRateSettings(), loadVipPositionRates()]);
  return {
    members: members.map(({ id, displayName, designation, clawbackAddendumSignedDate }) => ({ id, name: displayName, designation, clawbackAddendumSignedDate: clawbackAddendumSignedDate ?? null })),
    positionRates,
    rates: rates.map((item) => ({ ...item, memberName: members.find((member) => member.id === item.memberId)?.displayName ?? item.memberId })),
  };
}

export async function setRate(actor: Actor, input: CommissionRateSetting & { reason?: string }): Promise<void> {
  requireOperation(actor, "commission.rates.manage");
  const reason = input.reason?.trim() || undefined;
  if (!["VIP", "IGP"].includes(input.product) || (input.role !== "DSC" && input.role !== "DRI")) throw invalid("Choose a product and commission type.");
  if (!Number.isSafeInteger(input.rateBp) || input.rateBp < 0 || (input.standardRateBp !== null && input.standardRateBp !== undefined && (!Number.isSafeInteger(input.standardRateBp) || input.standardRateBp < 0))) {
    throw invalid("Enter a valid nonnegative commission rate.");
  }
  const existing = (await loadCommissionRateSettings()).find((item) => item.memberId === input.memberId && item.product === input.product && item.role === input.role);
  await transact(actor, {
    variableDefinitions: "$m: UUID!, $p: String!, $r: String!, $rate: Int!, $std: Int, $at: Timestamp!",
    fields: existing
      ? "rate: commissionRateSetting_updateMany(where: { member: { id: { eq: $m } }, product: { eq: $p }, role: { eq: $r } }, data: { rateBp: $rate, standardRateBp: $std, updatedAt: $at })"
      : "rate: commissionRateSetting_insert(data: { memberId: $m, product: $p, role: $r, rateBp: $rate, standardRateBp: $std, updatedAt: $at })",
    variables: { m: input.memberId, p: input.product, r: input.role, rate: input.rateBp, std: input.standardRateBp ?? null, at: nowIso() },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_RATE_SET, entityType: "member", entityId: input.memberId, details: { module: "commissions", previousValue: existing ? `${existing.rateBp}bp / standard ${existing.standardRateBp ?? "unset"}` : undefined, newValue: `${input.product} ${input.role}: ${input.rateBp}bp / standard ${input.standardRateBp ?? "unset"}`, reason } }],
  });
  if (input.product === "VIP") await issueReadyVipNumbers(actor, input.memberId, input.role);
}

export async function setPositionRate(actor: Actor, input: VipPositionRate): Promise<void> {
  requireOperation(actor, "commission.rates.manage");
  const approvalReference = input.approvalReference.trim();
  if (!approvalReference) throw invalid("Enter the approval reference for this standard.", { approvalReference: "Enter the approval reference for this standard." });
  if (!Number.isSafeInteger(input.rateBp) || input.rateBp < 0) throw invalid("Enter a valid nonnegative commission rate.");
  const existing = (await loadVipPositionRates()).find((item) => item.designation === input.designation && item.role === input.role);
  await transact(actor, {
    variableDefinitions: "$d: String!, $r: String!, $rate: Int!, $ref: String!, $at: Timestamp!",
    fields: existing
      ? "rate: vipPositionRate_updateMany(where: { designation: { eq: $d }, role: { eq: $r } }, data: { rateBp: $rate, approvalReference: $ref, updatedAt: $at })"
      : "rate: vipPositionRate_insert(data: { designation: $d, role: $r, rateBp: $rate, approvalReference: $ref, updatedAt: $at })",
    variables: { d: input.designation, r: input.role, rate: input.rateBp, ref: approvalReference, at: nowIso() },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_POSITION_RATE_SET, entityType: "commission-position-rate", entityId: `VIP-${input.designation}-${input.role}`, details: { module: "commissions", previousValue: existing ? `${existing.rateBp}bp, approval ${existing.approvalReference}` : undefined, newValue: `${input.rateBp}bp`, reason: approvalReference } }],
  });
}

export async function applyPositionRate(actor: Actor, input: ApplyVipPositionRateInput): Promise<void> {
  requireOperation(actor, "commission.rates.manage");
  const member = (await loadMembersFull()).find((item) => item.id === input.memberId);
  if (!member) throw notFound("Seller");
  if (member.designation !== input.standard.designation) throw conflict("position_mismatch", "The approved rate must be for the seller's current position.");
  const serviceTermsReference = input.serviceTermsReference.trim();
  if (!serviceTermsReference) throw invalid("Enter the reference for the seller's approved service terms.", { serviceTermsReference: "Enter the reference for the seller's approved service terms." });
  const current = (await loadVipPositionRates()).find((item) => item.designation === input.standard.designation && item.role === input.standard.role);
  if (!current || current.rateBp !== input.standard.rateBp || current.approvalReference !== input.standard.approvalReference) {
    throw conflict("stale_rate", "The approved position rate has changed. Review the current rate before applying it.");
  }
  const existing = (await loadCommissionRateSettings()).find((item) => item.memberId === input.memberId && item.product === "VIP" && item.role === input.standard.role);
  if (existing) throw conflict("rate_exists", "This seller already has an approved VIP rate for this commission type.");
  await transact(actor, {
    variableDefinitions: "$d: CommissionRateSetting_Data!",
    fields: "rate: commissionRateSetting_insert(data: $d)",
    variables: { d: { id: newId(), memberId: input.memberId, product: "VIP", role: input.standard.role, rateBp: current.rateBp, standardRateBp: current.rateBp, updatedAt: nowIso() } },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_POSITION_RATE_APPLIED, entityType: "member", entityId: input.memberId, details: { module: "commissions", newValue: `VIP ${input.standard.role}: ${current.rateBp}bp`, reason: `Service terms: ${serviceTermsReference}. Standard approval: ${current.approvalReference}.`, relatedRecordIds: [`VIP-${input.standard.designation}-${input.standard.role}`] } }],
  });
  await issueReadyVipNumbers(actor, input.memberId, input.standard.role);
}

export async function setClawbackAddendum(actor: Actor, memberId: string, signedDate: string | null): Promise<void> {
  requireOperation(actor, "commission.rates.manage");
  const member = (await loadMembersFull()).find((item) => item.id === memberId);
  if (!member) throw notFound("Seller");
  if (member.designation === "OST") throw conflict("ost_addendum", "The addendum covers Internal Sellers (IST) only.");
  if (signedDate !== null && (signedDate !== signedDate.trim() || !parseManilaDateOnly(signedDate) || signedDate > today())) {
    throw invalid("Enter the signing date, on or before today.", { signedDate: "Enter the signing date, on or before today." });
  }
  const previous = member.clawbackAddendumSignedDate ?? null;
  await transact(actor, {
    variableDefinitions: "$m: UUID!, $d: Date",
    fields: "member: member_updateMany(where: { id: { eq: $m } }, data: { clawbackAddendumSignedDate: $d })",
    variables: { m: memberId, d: signedDate },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_ADDENDUM_RECORDED, entityType: "member", entityId: memberId, details: { module: "commissions", previousValue: previous ?? "none", newValue: signedDate ?? "none" } }],
  });
}

/** Re-issues pending VIP numbers after a rate change; a contract whose rates are still missing keeps its blocker. */
async function issueReadyVipNumbers(actor: Actor, memberId: string, role: "DSC" | "DRI"): Promise<void> {
  const sales = await listAll<{ id: string; contract: Ref; sellerMember: Ref; referrerMember: Ref }>("sales", "id contract { id } sellerMember { id } referrerMember { id }");
  const targets = sales.filter((row) => (role === "DSC" ? row.sellerMember?.id : row.referrerMember?.id) === memberId && row.contract);
  const numberPrefix = `${today().slice(2, 4)}${today().slice(5, 7)}${today().slice(8, 10)}`;
  for (const target of targets) {
    const read = await dbRead<{ contract: { id: string; status: string; vipNumber: string | null; raNumber: string | null; signedAgreementRecordedDate: string | null; productCode: string; classification: string; collectionVersion: number; details: Record<string, unknown> | null } | null }>(
      `query($id: UUID!) { contract(id: $id) { id status vipNumber raNumber signedAgreementRecordedDate productCode classification collectionVersion details } }`, { id: target.contract!.id });
    const contract = read.contract;
    if (!contract || contract.vipNumber || !contract.signedAgreementRecordedDate) continue;
    const sale = await loadSaleForContract(contract.id);
    if (!sale?.sale.approval) continue;
    const payments = await loadPaymentsOfContract(contract.id, sale.sale.id);
    const [settings, issued] = await Promise.all([loadCommissionRateSettings(), listAll<{ vipNumber: string | null }>("contracts", "vipNumber", { where: `{ vipNumber: { startsWith: $p } }`, variableDefinitions: "$p: String!", variables: { p: numberPrefix } })]);
    const issuance = vipIssuance(
      { ...contract, ...(contract.details ?? {}) } as never, sale.sale, payments, settings, issued.map((row) => row.vipNumber ?? "").filter(Boolean),
    );
    if (!issuance || "blocker" in issuance) continue;
    const effects = commissionEffects();
    effects.definitions.push("$cVersion: Int!");
    effects.variables["cVersion"] = contract.collectionVersion;
    issueVipNumberFx(effects, actor, contract.id, sale.sale, issuance, contract.raNumber ?? null);
    effects.fields.push('cGuard: contract_updateMany(where: { id: { eq: $vipContract }, collectionVersion: { eq: $cVersion } }, data: { collectionVersion_update: { inc: 1 } })\nquery @redact { cg: contract(id: $vipContract) @check(expr: "response.cGuard == 1", message: "STALE_CONTRACT") { id } }');
    await transact(actor, {
      variableDefinitions: effects.definitions.join(", "),
      fields: effects.fields.join("\n"),
      variables: effects.variables,
      audit: effects.audits,
      markers: { STALE_CONTRACT: conflict("stale_contract", "The contract changed at the same time. Try again.") },
    }).catch((error) => {
      // Another contract took the number first; the next rate change or receipt retries with a fresh scan.
      if (uniqueViolation(error) === "contract_vipNumber_uidx") return undefined;
      throw error;
    });
  }
}

// ---------------------------------------------------------------- payout lists (doc 08 section 11)
/** Builds one month's payout list from its released commissions not yet listed; null when none wait. */
export function payoutListOf(month: string, commissions: readonly Commission[], lists: readonly CommissionPayoutList[], preparedBy: string | null): { data: Record<string, unknown>; commissionIds: string[] } | null {
  const listed = new Set(lists.flatMap((list) => list.approvedAt
    ? list.approvedCommissionIds ?? list.entries.map(({ commissionId }) => commissionId)
    : list.month === month ? list.entries.map(({ commissionId }) => commissionId) : []));
  const eligible = commissions.filter((item) => item.status === "released" && item.releaseDate?.slice(0, 7) === month && !listed.has(item.id));
  if (!eligible.length) return null;
  return {
    data: {
      id: newId(), month,
      entries: eligible.map(({ id: commissionId, saleId, recipientMemberId, amountCentavos }) => ({ commissionId, saleId, recipientMemberId, amountCentavos })),
      ...(preparedBy ? { preparedById: preparedBy } : {}),
      preparedAt: nowIso(),
    },
    commissionIds: eligible.map((item) => item.id),
  };
}

export async function payoutLists(actor: Actor): Promise<CommissionPayoutList[]> {
  requireOperation(actor, "commission.payout.prepare");
  const [lists, commissions, names, igp] = await Promise.all([
    loadCommissionPayoutLists(), loadCommissions(),
    listAll<{ id: string; displayName: string }>("customers", "id displayName"),
    listAll<{ id: string; seriesNumber: string; customer: Ref }>("igpSales", "id seriesNumber customer { id }"),
  ]);
  const customerNames = new Map(names.map((row) => [row.id, row.displayName]));
  const igpCustomer = new Map(igp.map((row) => [row.id, row.customer?.id ?? ""]));
  const igpLabel = new Map(igp.map((row) => [row.id, row.seriesNumber]));
  return lists.map((list) => ({
    ...list,
    entries: list.entries.map((entry) => ({
      ...entry,
      recipientName: commissions.find((item) => item.id === entry.commissionId)?.recipientName ?? entry.recipientMemberId,
      saleLabel: customerNames.get(igpCustomer.get(entry.saleId) ?? "") ?? igpLabel.get(entry.saleId) ?? entry.saleId,
    })),
  }));
}

export async function preparePayoutList(actor: Actor, month: string): Promise<CommissionPayoutList> {
  requireOperation(actor, "commission.payout.prepare");
  const clean = month.trim();
  const [commissions, lists, closed] = await Promise.all([loadCommissions(), loadCommissionPayoutLists(), listAll<{ month: string }>("closedMonths", "month")]);
  if (!closed.some((row) => row.month === clean)) throw conflict("month_not_closed", "Close the ready-to-pay month before preparing its payout list.");
  const list = payoutListOf(clean, commissions, lists, actor.userId);
  if (!list) throw conflict("nothing_to_list", "No commissions ready to pay are waiting for a payout list in this month.");
  await transact(actor, {
    variableDefinitions: "$d: CommissionPayoutList_Data!",
    fields: "list: commissionPayoutList_insert(data: $d)",
    variables: { d: list.data },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_PAYOUT_LIST_PREPARED, entityType: "commission", entityId: String(list.data.id), details: { module: "commissions", newValue: clean, relatedRecordIds: list.commissionIds } }],
  });
  return (await loadCommissionPayoutList(String(list.data.id)))!;
}

export async function approvePayoutList(actor: Actor, id: string): Promise<CommissionPayoutList> {
  requireOperation(actor, "commission.approve");
  const list = await loadCommissionPayoutList(id);
  if (!list) throw notFound("Payout list");
  if (list.approvedAt) throw conflict("already_approved", "This payout list is already approved.");
  const [commissions, clawbacks, members] = await Promise.all([loadCommissions(), loadCommissionClawbacks(), loadMembersFull()]);
  const records = list.entries.map(({ commissionId }) => commissions.find((item) => item.id === commissionId)).filter((item): item is Commission => Boolean(item));
  const eligible = records.filter((item) => item.status === "released" && item.releaseDate?.slice(0, 7) === list.month);
  if (!eligible.length) throw conflict("nothing_eligible", "Every commission on this list is held or cancelled.");
  const approvedAt = nowIso();
  // Doc 08 §11.2: the audit flags a self-approval and the roles the same person holds.
  const roles = activeRoles(actor.identity);
  const selfNote = list.preparedBy === actor.userId
    ? `Self-approved: the same person prepared and approved this payout list (roles: ${roles.length ? roles.join(", ") : "none"}).`
    : undefined;
  const effects = commissionEffects();
  for (const [index, commission] of eligible.entries()) {
    const alias = `ap${index}`;
    commissionUpdate(commission.id, alias, "released", { status: "approved", approvedById: actor.userId }, effects);
    appendHistoryFx(commission.id, `${alias}r`, eventOf(commission, actor.userId, BUSINESS_AUDIT_ACTIONS.COMMISSION_APPROVED, selfNote ?? null), effects);
    effects.audits.push({ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_APPROVED, entityType: "commission", entityId: commission.id, details: { module: "commissions", previousValue: "released", newValue: "approved", ...(selfNote ? { reason: selfNote } : {}), relatedRecordIds: [commission.saleId] } });
  }
  // Paybacks come out of each signed IST's approved payouts, oldest first, capped at what is payable (2026-11-22).
  const offsets: NonNullable<CommissionPayoutList["offsets"]> = [];
  const byMember = new Map(members.map((member) => [member.id, member]));
  for (const memberId of new Set(eligible.map((item) => item.recipientMemberId))) {
    const member = byMember.get(memberId);
    if (!member || member.designation === "OST") continue;
    const payable = eligible.filter((item) => item.recipientMemberId === memberId).reduce((sum, item) => sum + item.amountCentavos, 0);
    const open = clawbacks.filter((item) => item.recipientMemberId === memberId);
    for (const { clawbackId, amountCentavos } of planClawbackOffsets(open, member.clawbackAddendumSignedDate ?? null, payable)) {
      const clawback = open.find((item) => item.id === clawbackId)!;
      clawbackRecoveryFx(effects, actor, clawback, amountCentavos, `PAYOUT-OFFSET:${id}:${clawbackId}`);
      offsets.push({ recipientMemberId: memberId, clawbackId, amountCentavos });
    }
  }
  effects.definitions.push("$listId: UUID!", "$approver: UUID!", "$at: Timestamp!", "$approvedIds: Any!", "$offsets: Any!");
  effects.variables["listId"] = id;
  effects.variables["approver"] = actor.userId;
  effects.variables["at"] = approvedAt;
  effects.variables["approvedIds"] = eligible.map((item) => item.id);
  effects.variables["offsets"] = offsets;
  effects.fields.push('list: commissionPayoutList_updateMany(where: { id: { eq: $listId }, approvedAt: { isNull: true } }, data: { approvedById: $approver, approvedAt: $at, approvedCommissionIds: $approvedIds, offsets: $offsets })\nquery @redact { l: commissionPayoutList(id: $listId) @check(expr: "response.list == 1", message: "ALREADY_APPROVED") { id } }');
  effects.audits.push({ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_PAYOUT_LIST_APPROVED, entityType: "commission", entityId: id, details: { module: "commissions", previousValue: "prepared", newValue: "approved", ...(selfNote ? { reason: selfNote } : {}), relatedRecordIds: eligible.map((item) => item.id) } });
  await transact(actor, {
    variableDefinitions: effects.definitions.join(", "),
    fields: effects.fields.join("\n"),
    variables: effects.variables,
    audit: effects.audits,
    markers: { ALREADY_APPROVED: conflict("already_approved", "This payout list was approved by someone else.") },
  });
  return (await loadCommissionPayoutList(id))!;
}

// ---------------------------------------------------------------- clawbacks
export async function clawbacks(actor: Actor): Promise<CommissionClawback[]> {
  if (hasOperationPermission(actor.identity, "commission.approve")) return loadCommissionClawbacks();
  const memberId = actor.identity.memberId;
  if (!memberId || actor.identity.status !== "active") return [];
  const all = await loadCommissionClawbacks();
  if (hasOperationPermission(actor.identity, "commission.viewTeam")) {
    const visible = await visibleMemberIdsFor(actor);
    return all.filter((item) => item.recipientMemberId === memberId || visible.has(item.recipientMemberId));
  }
  if (hasOperationPermission(actor.identity, "commission.viewOwn")) return all.filter((item) => item.recipientMemberId === memberId);
  return [];
}

export async function recordRecovery(actor: Actor, id: string, input: { amountCentavos: number; reference: string }): Promise<void> {
  requireOperation(actor, "commission.clawback.collect");
  const clawback = await loadClawback(id);
  if (!clawback) throw notFound("Payback");
  const reference = input.reference.trim();
  if (!reference) throw invalid("Enter the payback reference.", { reference: "Enter the payback reference." });
  if (clawback.recoveries.some((entry) => entry.reference.toLowerCase() === reference.toLowerCase())) throw conflict("duplicate_recovery", "This payback was already recorded.");
  if (!Number.isSafeInteger(input.amountCentavos) || input.amountCentavos <= 0 || input.amountCentavos > clawbackBalance(clawback)) {
    throw invalid("Enter an amount above zero and within the remaining balance.", { amountCentavos: "Enter an amount above zero and within the remaining balance." });
  }
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $r: Any!",
    fields: "row: commissionClawback_updateMany(where: { id: { eq: $id } }, data: { recoveries: $r })",
    variables: { id, r: [...clawback.recoveries, { date: today(), actorId: actor.userId, amountCentavos: input.amountCentavos, reference }] },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_CLAWBACK_RECOVERED, entityType: "commission", entityId: clawback.commissionId, details: { module: "commissions", newValue: String(input.amountCentavos), relatedRecordIds: [clawback.saleId, clawback.id] } }],
  });
}

export async function writeOff(actor: Actor, id: string, reason: string): Promise<void> {
  requireOperation(actor, "commission.clawback.writeOff");
  const clawback = await loadClawback(id);
  if (!clawback) throw notFound("Payback");
  const text = reason.trim();
  if (!text) throw invalid("Enter the reason for not collecting this balance.", { reason: "Enter the reason for not collecting this balance." });
  const balance = clawbackBalance(clawback);
  if (balance <= 0) throw conflict("no_open_balance", "This payback has no open balance.");
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $w: Any!",
    fields: "row: commissionClawback_updateMany(where: { id: { eq: $id } }, data: { writeOff: $w })",
    variables: { id, w: { date: today(), actorId: actor.userId, reason: text } },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_CLAWBACK_WRITTEN_OFF, entityType: "commission", entityId: clawback.commissionId, details: { module: "commissions", previousValue: String(balance), newValue: "written_off", reason: text, relatedRecordIds: [clawback.saleId, clawback.id] } }],
  });
}

// ---------------------------------------------------------------- allowances (doc 08 section 15; comparison only during the parallel run)
export async function allowanceReviews(actor: Actor) {
  requireOperation(actor, "commission.approve");
  const [reviews, members] = await Promise.all([loadAllowanceReviews(), loadMembersFull()]);
  return {
    reviews,
    members: members.flatMap(({ id, displayName, designation, aaNumber }) =>
      (designation === "SM" || designation === "SSM" || designation === "SVD") ? [{ id, name: displayName, aaNumber: aaNumber ?? null, position: designation as "SM" | "SSM" | "SVD" }] : []),
  };
}

export async function assembleAllowanceInputs(actor: Actor, month: string) {
  requireOperation(actor, "commission.approve");
  const [members, vacancyRows, sales, igpRows, payments] = await Promise.all([
    loadMembersFull(),
    listAll<{ seatMember: Ref; holderEndDate: string; startDate: string; filledOn: string | null; filledMethod: string | null; filledByMember: Ref }>("seatVacancies", "seatMember { id } holderEndDate startDate filledOn filledMethod filledByMember { id }"),
    listAll<SaleRowLight>("sales", SALE_LIGHT_FIELDS),
    listAll<IgpRowLight>("igpSales", IGP_LIGHT_FIELDS),
    listAll<PaymentLight>("payments", PAYMENT_LIGHT_FIELDS, { where: '{ status: { eq: "verified" } }' }),
  ]);
  const vacancies: SeatVacancy[] = vacancyRows.map((row) => ({
    id: row.seatMember?.id ?? "", seatMemberId: row.seatMember?.id ?? "", holderEndDate: row.holderEndDate, startDate: row.startDate,
    filledOn: row.filledOn, filledMethod: (row.filledMethod ?? null) as SeatVacancy["filledMethod"], filledByMemberId: row.filledByMember?.id ?? null, recordedBy: "", recordedAt: "",
  }));
  return assembleInputs({
    members: members as never,
    vacancies,
    sales: sales.map(toSaleLight),
    igpSales: igpRows.map(toIgpLight),
    // shortcut: IGP receipts live in the sale details until the IGP payment pipeline exists, so IGP month collections are empty here.
    payments: payments.map(toPaymentLight),
  }, month.trim());
}

type SaleRowLight = { id: string; productCode: string; valueCentavos: string; status: string; contract: Ref; customer: Ref; sellerMember: Ref; referrerMember: Ref; details: Record<string, unknown> | null };
const SALE_LIGHT_FIELDS = "id productCode valueCentavos status contract { id } customer { id } sellerMember { id } referrerMember { id } details";
const toSaleLight = (row: SaleRowLight) => ({
  ...(row.details ?? {}), id: row.id, productCode: row.productCode, contractId: row.contract?.id ?? "", customerId: row.customer?.id ?? "",
  valueCentavos: int64ToCentavos(row.valueCentavos), status: row.status, sellerMemberId: row.sellerMember?.id ?? null, referrerMemberId: row.referrerMember?.id ?? null,
}) as never;

type IgpRowLight = { id: string; priceCentavos: string; status: string; sellerMember: Ref; referrerMember: Ref; details: Record<string, unknown> | null };
const IGP_LIGHT_FIELDS = "id priceCentavos status sellerMember { id } referrerMember { id } details";
const toIgpLight = (row: IgpRowLight) => ({
  ...(row.details ?? {}), id: row.id, priceCentavos: int64ToCentavos(row.priceCentavos), status: row.status,
  sellerMemberId: row.sellerMember?.id ?? "", referrerMemberId: row.referrerMember?.id ?? null,
}) as never;

type PaymentLight = { id: string; amountCentavos: string; status: string; countedDate: string | null; paidDate: string; contract: Ref; details: Record<string, unknown> | null };
const PAYMENT_LIGHT_FIELDS = "id amountCentavos status countedDate paidDate contract { id } details";
const toPaymentLight = (row: PaymentLight) => ({
  ...(row.details ?? {}), id: row.id, amountCentavos: int64ToCentavos(row.amountCentavos), status: row.status,
  countedDate: row.countedDate ?? undefined, paidDate: row.paidDate, contractId: row.contract?.id ?? "", adjustments: [], history: [],
}) as never;

export async function saveAllowanceReview(actor: Actor, input: AllowanceReviewInput): Promise<AllowanceReview> {
  requireOperation(actor, "commission.approve");
  const month = input.month.trim();
  if (!parseManilaDateOnly(`${month}-01`)) throw invalid("Enter a valid month.", { month: "Enter a valid month." });
  const closed = await listAll<{ month: string }>("closedMonths", "month");
  if (closed.some((row) => row.month === month)) throw conflict("month_closed", "This month is closed. Its figures are locked.");
  const members = await loadMembersFull();
  const member = members.find((item) => item.id === input.memberId);
  if (!member || (member.designation !== "SM" && member.designation !== "SSM" && member.designation !== "SVD")) {
    throw invalid("Choose an Internal Seller (IST) leader.", { memberId: "Choose an Internal Seller (IST) leader." });
  }
  if (input.workbook && Object.values(input.workbook).some((value) => !Number.isSafeInteger(value) || value < 0)) throw invalid("Enter valid company spreadsheet figures.");
  const previous = (await loadAllowanceReviews()).filter((item) => item.month === month && item.memberId === input.memberId).at(-1);
  const withholdingReason = input.withholdingReason === undefined ? previous?.withholdingReason ?? "" : input.withholdingReason.trim();
  if (withholdingReason !== (previous?.withholdingReason ?? "")) requireOperation(actor, "commission.rates.manage");
  const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  const position = member.designation as "SM" | "SSM" | "SVD";
  const result = calculateAllowances({
    daysInMonth, terms: SHIPPED_ALLOWANCE_TERMS[position], qualifying: input.qualifying, extended: input.extended, withholdBa: Boolean(withholdingReason),
  });
  const id = newId();
  const reviewedAt = nowIso();
  const review: AllowanceReview = {
    id, month, memberId: input.memberId, memberName: member.displayName, position, result,
    qualifying: input.qualifying, extended: input.extended, withholdingReason, withholdBa: Boolean(withholdingReason),
    workbook: input.workbook,
    ...(input.workbook ? { workbookDifferenceReason: input.workbookDifferenceReason?.trim() || undefined } : {}),
    reviewedAt, reviewedBy: actor.userId,
  };
  // A payback is taken from the first review of a month only, so saving the review again never deducts twice.
  const effects = commissionEffects();
  if (!previous && member.clawbackAddendumSignedDate) {
    const payable = result.baCentavos + result.paCentavos + result.pbCentavos;
    const open = await loadClawbacksOfMember(input.memberId);
    let offset = 0;
    for (const { clawbackId, amountCentavos } of planClawbackOffsets(open, member.clawbackAddendumSignedDate, payable)) {
      const clawback = open.find((item) => item.id === clawbackId)!;
      clawbackRecoveryFx(effects, actor, clawback, amountCentavos, `ALLOWANCE-OFFSET:${id}:${clawbackId}`);
      offset += amountCentavos;
    }
    if (offset > 0) review.clawbackOffsetCentavos = offset;
  } else if (previous?.clawbackOffsetCentavos) {
    review.clawbackOffsetCentavos = previous.clawbackOffsetCentavos;
  }
  effects.definitions.push("$d: AllowanceReview_Data!");
  effects.variables["d"] = {
    id, month, memberId: input.memberId, result: review.result,
    inputs: { qualifying: review.qualifying, extended: review.extended, workbook: review.workbook ?? null, withholdingReason, workbookDifferenceReason: review.workbookDifferenceReason ?? null },
    clawbackOffsetCentavos: review.clawbackOffsetCentavos ? centavosToInt64(review.clawbackOffsetCentavos) : null,
    reviewedById: actor.userId, reviewedAt,
  };
  effects.fields.push("review: allowanceReview_insert(data: $d)");
  effects.audits.push({ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_ALLOWANCE_REVIEWED, entityType: "member", entityId: input.memberId, details: { module: "commissions", previousValue: previous ? JSON.stringify(previous.result) : undefined, newValue: JSON.stringify(result), reason: [withholdingReason, review.workbookDifferenceReason].filter(Boolean).join(" / ") || undefined, relatedRecordIds: [id] } });
  await transact(actor, { variableDefinitions: effects.definitions.join(", "), fields: effects.fields.join("\n"), variables: effects.variables, audit: effects.audits });
  return review;
}

// ---------------------------------------------------------------- commission views and Finance decisions
type ViewContext = { customers: Map<string, string>; contractLabels: Map<string, string>; igpLabels: Map<string, string>; customerIdOf: Map<string, string> };

async function viewContext(): Promise<ViewContext> {
  const [customers, contracts, igp] = await Promise.all([
    listAll<{ id: string; displayName: string }>("customers", "id displayName"),
    listAll<{ id: string; vipNumber: string | null; raNumber: string | null }>("contracts", "id vipNumber raNumber"),
    listAll<{ id: string; seriesNumber: string }>("igpSales", "id seriesNumber"),
  ]);
  const rows = await listAll<{ id: string; contract: { customer: Ref } | null; igpSale: { customer: Ref } | null }>("commissions", "id contract { customer { id } } igpSale { customer { id } }");
  const customerIdOf = new Map<string, string>();
  for (const row of rows) {
    const customerId = row.contract?.customer?.id ?? row.igpSale?.customer?.id;
    if (customerId) customerIdOf.set(row.id, customerId);
  }
  return {
    customers: new Map(customers.map((row) => [row.id, row.displayName])),
    contractLabels: new Map(contracts.map((row) => [row.id, row.vipNumber ?? row.raNumber ?? row.id])),
    igpLabels: new Map(igp.map((row) => [row.id, row.seriesNumber])),
    customerIdOf,
  };
}

function viewOf(commission: Commission, context: ViewContext): CommissionView {
  return {
    ...commission,
    customerName: context.customers.get(context.customerIdOf.get(commission.id) ?? "") ?? "Unknown customer",
    saleReference: commission.product === "IGP" ? context.igpLabels.get(commission.saleId) ?? commission.saleId : context.contractLabels.get(commission.contractId),
    payoutReleaseDate: commission.releaseDate ? payoutReleaseDateFor(commission.releaseDate) : null,
  };
}

export async function list(actor: Actor): Promise<CommissionView[]> {
  const context = await viewContext();
  const all = await loadCommissions();
  if (hasOperationPermission(actor.identity, "commission.approve")) {
    return all.map((item) => viewOf(item, context));
  }
  const memberId = actor.identity.memberId;
  if (!memberId || actor.identity.status !== "active") return [];
  if (hasOperationPermission(actor.identity, "commission.viewTeam")) {
    const visible = await visibleMemberIdsFor(actor);
    return all
      .filter((item) => item.recipientMemberId === memberId || visible.has(item.recipientMemberId))
      .map((item) => {
        // Team views never carry payout reference, method or history (doc 08 section 17.2).
        return item.recipientMemberId === memberId ? viewOf(item, context) : { ...viewOf(item, context), payout: null, history: [], previousPayouts: [] };
      });
  }
  if (hasOperationPermission(actor.identity, "commission.viewOwn")) {
    return all.filter((item) => item.recipientMemberId === memberId).map((item) => viewOf(item, context));
  }
  return [];
}

async function loadCommissionForDecision(actor: Actor, id: string): Promise<Commission> {
  const commission = await loadCommission(id);
  if (!commission) throw notFound("Commission");
  if (!hasOperationPermission(actor.identity, "commission.approve")) {
    const memberId = actor.identity.memberId;
    if (!memberId || commission.recipientMemberId !== memberId) throw notFound("Commission");
  }
  return commission;
}

/** The sale behind the commission must still be Confirmed before a payout proceeds (doc 08 section 11). */
async function requireConfirmedSale(commission: Commission): Promise<void> {
  if (commission.product === "IGP") {
    const read = await dbRead<{ igpSale: { status: string; details: Record<string, unknown> | null } | null }>(`query($id: UUID!) { igpSale(id: $id) { status details } }`, { id: commission.saleId });
    const sale = read.igpSale;
    if (!sale || sale.status !== "approved") throw conflict("sale_not_confirmed", "The property (IGP) sale is no longer Confirmed.");
    const stageDate = commission.stage === "full" ? "fullPaymentDate" : "stage1Date";
    if (!(sale.details as Record<string, unknown> | null)?.[stageDate]) throw conflict("stage_not_met", "The property (IGP) sale no longer meets the minimum paid.");
    return;
  }
  const sale = await loadSaleForContract(commission.contractId);
  if (!sale || sale.sale.status !== "confirmed") throw conflict("sale_not_confirmed", "The sale is no longer Confirmed, so this payout cannot proceed. Any recorded payout is kept for Finance review.");
}

const rejectUnresolvedPayout = (commission: Commission) => {
  if (commission.payout && !commission.payout.confirmedAt) {
    throw conflict("payout_unresolved", "A payout was recorded for this commission but not confirmed. It cannot be cancelled until Finance resolves that payout.");
  }
};

async function contractMeetsRelease(contractId: string): Promise<boolean> {
  const read = await dbRead<{ contract: { priceCentavos: string } | null }>(`query($id: UUID!) { contract(id: $id) { priceCentavos } }`, { id: contractId });
  if (!read.contract) throw notFound("Contract");
  const sale = await loadSaleForContract(contractId);
  const payments = await loadPaymentsOfContract(contractId, sale?.sale.id ?? null);
  return meetsPayoutRelease({ priceCentavos: int64ToCentavos(read.contract.priceCentavos) }, payments.filter((payment) => payment.status === "verified"));
}

export async function adjust(actor: Actor, id: string, percentBp: number, reason: string): Promise<CommissionView> {
  requireOperation(actor, "commission.approve");
  const text = reason.trim();
  if (!text) throw invalid("A reason is required.", { reason: "A reason is required." });
  const commission = await loadCommissionForDecision(actor, id);
  if (commission.releaseDate) throw conflict("already_released", "A commission that is ready to pay cannot change its frozen rate.");
  if (commission.status === "paid" || commission.status === "cancelled") throw conflict("not_adjustable", "A paid or cancelled commission cannot be adjusted here.");
  if (commission.payout) throw conflict("payout_recorded", "A commission with a recorded payout cannot be adjusted.");
  if (!Number.isInteger(percentBp) || percentBp <= 0 || percentBp > 10_000) throw invalid("Enter a percentage greater than 0 and at most 100.", { percentBp: "Enter a percentage greater than 0 and at most 100." });
  const amountCentavos = applyBasisPoints(commission.basisCentavos, percentBp);
  const previous = `${commission.percentBp}bp / ${commission.amountCentavos}`;
  const history = eventOf(commission, actor.userId, BUSINESS_AUDIT_ACTIONS.COMMISSION_ADJUSTED, text);
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $bp: Int!, $amt: Int64!, $h: Any!",
    fields: 'row: commission_updateMany(where: { id: { eq: $id }, releaseDate: { isNull: true }, payoutInitiatedAt: { isNull: true } }, data: { percentBp: $bp, amountCentavos: $amt, history: $h })\nquery @redact { c: commission(id: $id) @check(expr: "response.row == 1", message: "NOT_ADJUSTABLE") { id } }',
    variables: { id, bp: percentBp, amt: centavosToInt64(amountCentavos), h: history },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_ADJUSTED, entityType: "commission", entityId: id, details: { module: "commissions", previousValue: previous, newValue: `${percentBp}bp / ${amountCentavos}`, reason: text } }],
    markers: { NOT_ADJUSTABLE: conflict("not_adjustable", "This commission can no longer be adjusted.") },
  });
  return viewOf((await loadCommission(id))!, await viewContext());
}

export async function resolveHold(actor: Actor, id: string, action: "keep" | "cancel" | "restore", reason: string): Promise<CommissionView> {
  requireOperation(actor, "commission.approve");
  const text = reason.trim();
  if (!text) throw invalid("A reason is required.", { reason: "A reason is required." });
  const commission = await loadCommissionForDecision(actor, id);
  if (commission.status !== "on_hold") throw conflict("not_held", "Only a held commission can be resolved.");
  if (action === "restore") {
    await requireConfirmedSale(commission);
    if (commission.releaseDate && !commission.holdTrigger && !commission.releaseRestorable) throw conflict("review_required", "This commission requires a separate financial review.");
    if (commission.product !== "IGP" && commission.releaseDate && !(await contractMeetsRelease(commission.contractId))) {
      throw conflict("release_not_met", "The sale must meet the minimum paid before the hold can be restored.");
    }
  } else if (action === "cancel") {
    rejectUnresolvedPayout(commission);
  }
  const history = eventOf(commission, actor.userId, BUSINESS_AUDIT_ACTIONS.COMMISSION_HOLD_RESOLVED, `${action}: ${text}`);
  const effects = commissionEffects();
  if (action === "restore") {
    commissionUpdate(commission.id, "rho", "on_hold", { status: commission.approvedAt ? "approved" : "released", holdReason: null, holdTrigger: null }, effects);
    appendHistoryFx(commission.id, "rhoh", history, effects);
  } else if (action === "cancel") {
    commissionUpdate(commission.id, "rho", "on_hold", { status: "cancelled" }, effects);
    appendHistoryFx(commission.id, "rhoh", history, effects);
  } else {
    appendHistoryFx(commission.id, "rhoh", history, effects);
  }
  effects.audits.push({ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_HOLD_RESOLVED, entityType: "commission", entityId: id, details: { module: "commissions", previousValue: "on_hold", newValue: action === "cancel" ? "cancelled" : action === "restore" ? "restored" : "kept", reason: text } });
  await transact(actor, { variableDefinitions: effects.definitions.join(", "), fields: effects.fields.join("\n"), variables: effects.variables, audit: effects.audits });
  return viewOf((await loadCommission(id))!, await viewContext());
}

export async function cancel(actor: Actor, id: string, reason: string): Promise<CommissionView> {
  requireOperation(actor, "commission.approve");
  const text = reason.trim();
  if (!text) throw invalid("A reason is required.", { reason: "A reason is required." });
  const commission = await loadCommissionForDecision(actor, id);
  if (commission.status === "paid" || commission.status === "cancelled") throw conflict("not_cancellable", "A paid or cancelled commission cannot be cancelled here.");
  rejectUnresolvedPayout(commission);
  const history = eventOf(commission, actor.userId, BUSINESS_AUDIT_ACTIONS.COMMISSION_CANCELLED, text);
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $h: Any!",
    fields: 'row: commission_updateMany(where: { id: { eq: $id }, status: { in: ["released", "approved", "on_hold"] } }, data: { status: "cancelled", history: $h })\nquery @redact { c: commission(id: $id) @check(expr: "response.row == 1", message: "NOT_CANCELLABLE") { id } }',
    variables: { id, h: history },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_CANCELLED, entityType: "commission", entityId: id, details: { module: "commissions", previousValue: commission.status, newValue: "cancelled", reason: text } }],
    markers: { NOT_CANCELLABLE: conflict("not_cancellable", "This commission can no longer be cancelled.") },
  });
  return viewOf((await loadCommission(id))!, await viewContext());
}

export async function recordPayout(actor: Actor, id: string, input: { reference: string; method?: string | null; payoutDate: string; evidenceFileName?: string; evidenceDataUrl?: string }): Promise<CommissionView> {
  requireOperation(actor, "commission.payout");
  const commission = await loadCommissionForDecision(actor, id);
  if (commission.status !== "approved") throw conflict("not_approved", "Only an approved commission can be paid out.");
  if (commission.payout) throw conflict("payout_recorded", "A payout was already recorded. Duplicate payouts are not allowed.");
  await requireConfirmedSale(commission);
  if (commission.product !== "IGP" && !(await contractMeetsRelease(commission.contractId))) {
    throw conflict("release_not_met", "Commission pays out once 40% of the contract value is Finance-verified.");
  }
  const releaseDate = commission.releaseDate ? payoutReleaseDateFor(commission.releaseDate) : null;
  if (!releaseDate) throw conflict("no_release_date", "Finance must check the receipt and verification dates before recording this payout.");
  if (today() < releaseDate) throw conflict("payout_early", `Commission payout opens on ${releaseDate}, after the month it became ready to pay.`);
  const reference = input.reference.trim();
  if (!reference) throw invalid("Enter the payment reference.", { reference: "Enter the payment reference." });
  const method = input.method?.trim();
  if (method && !(PAYOUT_METHODS as readonly string[]).includes(method)) throw invalid("Choose a payment method from the list.", { method: "Choose a payment method from the list." });
  if (!parseManilaDateOnly(input.payoutDate)) throw invalid("Enter a valid payout date.", { payoutDate: "Enter a valid payout date." });
  if (input.payoutDate < releaseDate) throw invalid("The payout date must be on or after the ready-to-pay date.", { payoutDate: "The payout date must be on or after the ready-to-pay date." });
  if (input.payoutDate > today()) throw invalid("The payout date cannot be in the future.", { payoutDate: "The payout date cannot be in the future." });
  if (!method || !input.evidenceFileName?.trim()) throw invalid("Enter the payment method and attach proof of payment.", { method: "Enter the payment method.", evidenceFileName: "Attach proof of payment." });
  const history = eventOf(commission, actor.userId, BUSINESS_AUDIT_ACTIONS.COMMISSION_PAYOUT_RECORDED);
  const closed = await listAll<{ month: string }>("closedMonths", "month");
  const countedDate = firstOpenDate(closed, input.payoutDate);
  // shortcut: the proof bytes stay client-side until the private storage route exists (the payments evidence pattern); only the file name is kept.
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $ref: String!, $m: String, $d: Date!, $cd: Date!, $by: UUID!, $at: Timestamp!, $fn: String!, $h: Any!",
    fields: 'row: commission_updateMany(where: { id: { eq: $id }, status: { eq: "approved" }, payoutInitiatedAt: { isNull: true } }, data: { payoutReference: $ref, payoutMethod: $m, payoutDate: $d, payoutCountedDate: $cd, payoutProcessedById: $by, payoutInitiatedAt: $at, payoutEvidenceFileName: $fn, history: $h })\nquery @redact { c: commission(id: $id) @check(expr: "response.row == 1", message: "PAYOUT_TAKEN") { id } }',
    variables: { id, ref: reference, m: method, d: input.payoutDate, cd: countedDate, by: actor.userId, at: nowIso(), fn: input.evidenceFileName.trim(), h: history },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_PAYOUT_RECORDED, entityType: "commission", entityId: id, details: { module: "commissions", newValue: "payout_initiated" } }],
    markers: { PAYOUT_TAKEN: conflict("payout_recorded", "A payout was recorded for this commission by someone else. Duplicate payouts are not allowed.") },
  });
  return viewOf((await loadCommission(id))!, await viewContext());
}

export async function confirmPayout(actor: Actor, id: string): Promise<CommissionView> {
  requireOperation(actor, "commission.payout");
  const commission = await loadCommissionForDecision(actor, id);
  if (!commission.payout) throw conflict("no_payout", "Record a payout before confirming it was paid out.");
  if (commission.payout.confirmedAt) throw conflict("already_confirmed", "This payout was already confirmed as paid out.");
  if (commission.status !== "approved" && commission.status !== "on_hold") throw conflict("not_confirmable", "Only an approved or held commission with an initiated payout can be confirmed.");
  if (commission.status === "approved") await requireConfirmedSale(commission);
  const history = eventOf(commission, actor.userId, BUSINESS_AUDIT_ACTIONS.COMMISSION_PAID);
  const closed = await listAll<{ month: string }>("closedMonths", "month");
  const countedDate = firstOpenDate(closed, commission.payout.payoutDate);
  // Confirming a payout on a held commission treats it as paid and raises the clawback in the same transaction (doc 08 §11.6).
  const effects = commissionEffects();
  if (commission.status === "on_hold" && commission.holdTrigger) {
    const state = await loadSaleCommissionState(commission.saleId);
    const held = state.commissions.find((item) => item.id === commission.id);
    if (held) {
      held.status = "paid";
      held.payout = commission.payout;
      applyCommissionTriggerFx(effects, actor, state, { saleId: commission.saleId, trigger: commission.holdTrigger, date: today(), stages: [commission.stage ?? "stage1"] });
    }
  }
  await transact(actor, {
    variableDefinitions: ["$id: UUID!", "$at: Timestamp!", "$cd: Date!", "$h: Any!", ...effects.definitions].join(", "),
    fields: [
      'row: commission_updateMany(where: { id: { eq: $id }, payoutInitiatedAt: { isNull: false }, payoutConfirmedAt: { isNull: true } }, data: { status: "paid", payoutConfirmedAt: $at, payoutCountedDate: $cd, history: $h })',
      ...effects.fields,
      'query @redact { c: commission(id: $id) @check(expr: "response.row == 1", message: "ALREADY_DECIDED") { id } }',
    ].join("\n"),
    variables: { id, at: nowIso(), cd: countedDate, h: history, ...effects.variables },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_PAID, entityType: "commission", entityId: id, details: { module: "commissions", previousValue: commission.status, newValue: "paid" } }, ...effects.audits],
    markers: { ALREADY_DECIDED: conflict("already_decided", "This payout was decided by someone else.") },
  });
  return viewOf((await loadCommission(id))!, await viewContext());
}

/** Doc 08 §11.6: record every ready commission on an approved list with one payout instruction; failures are skipped and reported. */
export async function recordBulkPayout(actor: Actor, listId: string, input: { reference: string; method?: string | null; payoutDate: string; evidenceFileName?: string; evidenceDataUrl?: string }): Promise<{ recorded: number; skipped: { commissionId: string; reason: string }[] }> {
  requireOperation(actor, "commission.payout");
  const list = await loadCommissionPayoutList(listId);
  if (!list || !list.approvedAt) throw conflict("list_not_approved", "Approve the payout list before recording its payouts.");
  const result = { recorded: 0, skipped: [] as { commissionId: string; reason: string }[] };
  for (const commissionId of list.approvedCommissionIds ?? list.entries.map((entry) => entry.commissionId)) {
    try {
      await recordPayout(actor, commissionId, input);
      result.recorded += 1;
    } catch (error) {
      result.skipped.push({ commissionId, reason: error instanceof Error ? error.message : "The payout could not be recorded." });
    }
  }
  return result;
}

/** Doc 08 §11.6: confirm the recorded disbursements at once; a held commission is never confirmed in bulk. */
export async function confirmBulkPayout(actor: Actor, listId: string): Promise<{ confirmed: number; skipped: { commissionId: string; reason: string }[] }> {
  requireOperation(actor, "commission.payout");
  const list = await loadCommissionPayoutList(listId);
  if (!list || !list.approvedAt) throw conflict("list_not_approved", "Approve the payout list before confirming its payouts.");
  const commissions = await loadCommissions();
  const result = { confirmed: 0, skipped: [] as { commissionId: string; reason: string }[] };
  for (const commissionId of list.approvedCommissionIds ?? list.entries.map((entry) => entry.commissionId)) {
    const commission = commissions.find((item) => item.id === commissionId);
    if (!commission || commission.status !== "approved" || !commission.payout || commission.payout.confirmedAt) {
      result.skipped.push({ commissionId, reason: commission?.status === "on_hold" ? "Held commissions are never confirmed in bulk." : "Only an approved commission with an unconfirmed payout can be confirmed." });
      continue;
    }
    try {
      await confirmPayout(actor, commissionId);
      result.confirmed += 1;
    } catch (error) {
      result.skipped.push({ commissionId, reason: error instanceof Error ? error.message : "The payout could not be confirmed." });
    }
  }
  return result;
}

export async function voidPayout(actor: Actor, id: string, reason: string): Promise<CommissionView> {
  requireOperation(actor, "commission.payout");
  const text = reason.trim();
  if (!text) throw invalid("Enter a reason for voiding the payout.", { reason: "Enter a reason for voiding the payout." });
  const commission = await loadCommissionForDecision(actor, id);
  if (commission.status !== "on_hold" || !commission.payout || commission.payout.confirmedAt) throw conflict("not_voidable", "Only an unconfirmed payout on a held commission can be voided.");
  const voidedPayouts = [...(commission.previousPayouts ?? []), { ...commission.payout, voidedAt: nowIso(), voidedBy: actor.userId, reason: text }];
  const history = eventOf(commission, actor.userId, "COMMISSION_PAYOUT_VOIDED", text);
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $vp: Any!, $h: Any!",
    fields: 'row: commission_updateMany(where: { id: { eq: $id }, status: { eq: "on_hold" }, payoutConfirmedAt: { isNull: true }, payoutInitiatedAt: { isNull: false } }, data: { payoutReference: null, payoutMethod: null, payoutDate: null, payoutCountedDate: null, payoutProcessedById: null, payoutInitiatedAt: null, payoutEvidenceFileName: null, payoutEvidence: null, voidedPayouts: $vp, history: $h })\nquery @redact { c: commission(id: $id) @check(expr: "response.row == 1", message: "NOT_VOIDABLE") { id } }',
    variables: { id, vp: voidedPayouts, h: history },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_PAYOUT_VOIDED, entityType: "commission", entityId: id, details: { module: "commissions", previousValue: "payout_initiated", newValue: "voided", reason: text } }],
    markers: { NOT_VOIDABLE: conflict("not_voidable", "This payout was decided by someone else.") },
  });
  return viewOf((await loadCommission(id))!, await viewContext());
}
