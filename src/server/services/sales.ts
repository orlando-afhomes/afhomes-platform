import "server-only";
import type { VipCommissionCorrection } from "@/data/contracts/sale-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { commissionStageAmounts } from "@/modules/commissions/rules";
import { firstOpenDate } from "@/modules/finance/month-close";
import { daysPastDue, isFullySettled } from "@/modules/finance/rules";
import { hasOperationPermission } from "@/modules/identity/permissions";
import { canSeeContractRecord } from "@/modules/identity/record-scope";
import type { Sale } from "@/modules/sales/types";
import type { Actor } from "@/server/auth/actor";
import { loadScopeMembers, requireOperation } from "@/server/auth/authorize";
import { dbRead, listAll } from "@/server/db";
import { centavosToInt64 } from "@/server/money";
import { loadContract, loadCustomer, loadPaymentsOfContract, loadSale } from "@/server/repositories/records";
import { conflict, invalid, notFound, nowIso, today, transact } from "@/server/services/common";

/** Administrator or Super Administrator approves a recorded sale; receipts can be verified only after this (doc 07, 13). */
export async function approveSale(actor: Actor, id: string): Promise<Sale> {
  requireOperation(actor, "contracts.approve");
  const sale = await loadSale(id);
  const contract = sale ? await loadContract(sale.contractId) : null;
  if (!sale || !contract || !canSeeContractRecord(actor.identity, contract.contract)) throw notFound("Sale");
  if (sale.status === "cancelled" || sale.status === "rejected") throw conflict("sale_closed", "This sale cannot be approved.");
  if (sale.approval) return sale;
  try {
    await transact(actor, {
      variableDefinitions: "$id: UUID!, $by: UUID!, $at: Timestamp!",
      fields: `upd: sale_updateMany(where: { id: { eq: $id }, approvedAt: { isNull: true } }, data: { approvedById: $by, approvedAt: $at })
query @redact { sale(id: $id) @check(expr: "response.upd == 1", message: "ALREADY_APPROVED") { id } }`,
      variables: { id: sale.id, by: actor.userId, at: nowIso() },
      audit: [{ action: BUSINESS_AUDIT_ACTIONS.SALE_APPROVED, entityType: "sale", entityId: sale.id, details: { module: "sales", newValue: "approved", relatedRecordIds: [sale.contractId] } }],
      markers: { ALREADY_APPROVED: conflict("sale_changed", "This sale was approved by someone else.") },
    });
  } catch (error) {
    // Two approvals at once: the second finds it already approved, which is the result it wanted.
    const latest = await loadSale(id);
    if (latest?.approval) return latest;
    throw error;
  }
  return (await loadSale(id))!;
}

type SaleDetails = Record<string, unknown>;

type SaleCommissionCorrection = Omit<VipCommissionCorrection, "referrerMemberId"> & { referrerMemberId?: string | null };

/**
 * Corrects the referrer or the frozen DSC/DRI rates of an active VIP sale (doc 08).
 * Rates can only be corrected once the sale carries frozen rates (F6); referrer-only
 * corrections work now. An omitted referrer keeps the current one.
 */
export async function correctSaleCommission(actor: Actor, id: string, input: SaleCommissionCorrection): Promise<Sale> {
  const canApprove = hasOperationPermission(actor.identity, "contracts.approve");
  requireOperation(actor, canApprove ? "contracts.approve" : "contracts.prepare");
  const sale = await loadSale(id);
  const contract = sale ? await loadContract(sale.contractId) : null;
  if (!sale || !contract || !canSeeContractRecord(actor.identity, contract.contract)) throw notFound("Sale");
  if (sale.status !== "pending" && sale.status !== "confirmed") throw conflict("sale_closed", "Choose an active VIP sale.");
  // shortcut: commission rows and releases arrive with F6; nothing can have been released yet.
  const payments = await loadPaymentsOfContract(sale.contractId, sale.id);
  if (!canApprove && payments.some((payment) => payment.verifiedDate)) {
    throw conflict("approval_required", "Only an Administrator or Super Administrator can correct a sale after its first approved receipt.");
  }
  if (!canApprove && (input.dscRateBp !== undefined || input.driRateBp !== undefined)) throw conflict("approval_required", "Only an Administrator or Super Administrator can correct a frozen rate.");
  const reason = input.reason.trim();
  if (!reason) throw invalid("Enter the reason for the correction.", { reason: "Enter the reason for the correction." });
  const referrer = input.referrerMemberId === undefined ? sale.referrerMemberId : input.referrerMemberId;
  if (referrer && !(await loadScopeMembers()).some((member) => member.id === referrer)) throw invalid("Choose a valid referrer.");
  if (referrer && referrer === sale.sellerMemberId) {
    const customer = await loadCustomer(sale.customerId);
    if (!customer?.approvedAt || customer.referrerMemberId !== referrer || !customer.referralReference?.trim()) {
      throw conflict("referral_unverified", "The Administrator must verify a dated referral reference for the seller to earn both commissions.");
    }
  }
  // shortcut: accreditation standing reminders are recorded at F6 alongside commission effects.

  const previousRates = sale.commissionRates;
  let rates = previousRates;
  if (previousRates) {
    const closing = previousRates.find((rate) => rate.role === "DSC");
    if (!closing) throw conflict("rate_missing", "The frozen closing seller rate is missing.");
    const previousReferral = previousRates.find((rate) => rate.role === "DRI");
    // shortcut: F6 re-freezes the DRI from the rate settings; until then a changed referrer carries the previous rate.
    const referral = referrer
      ? previousRates.find((rate) => rate.role === "DRI" && rate.memberId === referrer)
        ?? (previousReferral ? { ...previousReferral, memberId: referrer } : undefined)
      : undefined;
    if (input.driRateBp !== undefined && !referral) throw conflict("referrer_required", "Choose a referrer before correcting a DRI rate.");
    rates = [{ ...closing, rateBp: input.dscRateBp ?? closing.rateBp }, ...(referral ? [{ ...referral, rateBp: input.driRateBp ?? referral.rateBp }] : [])];
    for (const rate of rates) commissionStageAmounts(sale.valueCentavos, rate.rateBp, "VIP");
  } else if (input.dscRateBp !== undefined || input.driRateBp !== undefined) {
    throw conflict("rates_not_frozen", "The VIP Number must be issued before correcting a frozen rate.");
  }

  const detailRows = await dbRead<{ sale: { details: SaleDetails | null } | null }>(`query($id: UUID!) { sale(id: $id) { details } }`, { id });
  const details: SaleDetails = {
    ...(detailRows.sale?.details ?? {}),
    ...(rates ? { commissionRates: rates } : {}),
    ...(sale.team.length > 0 ? { team: sale.team } : {}),
    ...(sale.expiryReminders ? { expiryReminders: sale.expiryReminders } : {}),
  };
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $ref: UUID, $d: Any!",
    fields: "sale: sale_update(id: $id, data: { referrerMemberId: $ref, details: $d })",
    variables: { id: sale.id, ref: referrer ?? null, d: details },
    audit: [{
      action: BUSINESS_AUDIT_ACTIONS.VIP_SALE_COMMISSION_CORRECTED,
      entityType: "sale",
      entityId: sale.id,
      details: { module: "sales", previousValue: JSON.stringify({ referrer: sale.referrerMemberId, rates: previousRates ?? null }), newValue: JSON.stringify({ referrer: referrer ?? null, rates: rates ?? null }), reason, relatedRecordIds: [sale.contractId] },
    }],
  });
  return (await loadSale(sale.id))!;
}

/** Marks a sale on the 90-day no-payment list as Defaulted; a later verified receipt reinstates it (doc 07 section 12). */
export async function markSaleDefaulted(actor: Actor, id: string, reason: string): Promise<Sale> {
  requireOperation(actor, "contracts.approve");
  const text = reason.trim();
  if (!text) throw invalid("Enter a reason for marking the sale as Stopped Paying.", { reason: "Enter a reason." });
  const sale = await loadSale(id);
  const contract = sale ? await loadContract(sale.contractId) : null;
  if (!sale || !contract || !canSeeContractRecord(actor.identity, contract.contract)) throw notFound("Sale");
  if (!sale.approval || (sale.status !== "pending" && sale.status !== "confirmed")) throw conflict("not_active", "Only an approval-active sale can be marked as Stopped Paying.");
  const payments = await loadPaymentsOfContract(sale.contractId, sale.id);
  // Doc 07 §12: the 90-day no-payment list counts from the last approved receipt, not its paid date.
  const lastApproval = payments.filter((payment) => payment.status === "verified" && payment.verifiedDate).map((payment) => payment.verifiedDate!).sort().at(-1);
  if (isFullySettled({ priceCentavos: sale.valueCentavos }, payments) || daysPastDue(lastApproval ?? sale.recordedDate, today()) < 90) {
    throw conflict("not_due", "The sale is not on the 90-day no-payment list.");
  }
  const closed = await listAll<{ month: string }>("closedMonths", "month");
  const date = firstOpenDate(closed, today());
  const previous = sale.status;
  const stored = await dbRead<{ sale: { details: Record<string, unknown> | null } | null }>(`query($id: UUID!) { sale(id: $id) { details } }`, { id });
  const details = { ...(stored.sale?.details ?? {}), ...(sale.team.length > 0 ? { team: sale.team } : {}), ...(sale.expiryReminders ? { expiryReminders: sale.expiryReminders } : {}), defaultedAt: today() };
  const fields = [
    "sale: sale_update(id: $id, data: { status: \"defaulted\", financialHold: true, details: $details })",
    ...(previous === "confirmed" ? ["adjustment: saleAdjustment_insert(data: { saleId: $id, date: $date, amountCentavos: $amount, kind: \"reversal\", reason: $reason, actorId: $actor })"] : []),
  ].join("\n");
  const audit = [
    { action: BUSINESS_AUDIT_ACTIONS.SALE_DEFAULTED, entityType: "sale", entityId: sale.id, details: { module: "sales", previousValue: previous, newValue: "defaulted", reason: text } },
    ...(previous === "confirmed" ? [{ action: BUSINESS_AUDIT_ACTIONS.FINANCIAL_HOLD_APPLIED, entityType: "sale", entityId: sale.id, details: { module: "finance", previousValue: "no_hold", newValue: "financial_hold", relatedRecordIds: [sale.contractId] } }] : []),
  ];
  // shortcut: commission clawback and membership holds arrive with F6/F7; the sale flag records the condition now.
  await transact(actor, {
    variableDefinitions: previous === "confirmed" ? "$id: UUID!, $details: Any!, $date: Date!, $amount: Int64!, $reason: String!, $actor: UUID!" : "$id: UUID!, $details: Any!",
    fields,
    variables: { id: sale.id, details, ...(previous === "confirmed" ? { date, amount: centavosToInt64(-sale.valueCentavos), reason: text, actor: actor.userId } : {}) },
    audit,
  });
  return (await loadSale(sale.id))!;
}
