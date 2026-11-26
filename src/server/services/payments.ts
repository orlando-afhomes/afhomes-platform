import "server-only";
import type { SubmitPaymentInput } from "@/data/contracts/payment-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { collectionState } from "@/modules/finance/application/collection-state";
import { closedMonthSnapshot, firstOpenDate, type ClosedMonth } from "@/modules/finance/month-close";
import { nextOfficialReceiptNo, nextPaymentReference } from "@/modules/finance/payment-reference";
import { adjustableCentavos, exceedsContractPrice, findDuplicatePayment, findReferenceConflict, findSuggestedMatch } from "@/modules/finance/rules";
import { PAYMENT_METHODS, PAYMENT_PURPOSES, type Payment, type PaymentAdjustment, type SubmitUnmatchedReceiptInput, type UnmatchedReceipt } from "@/modules/finance/types";
import { buildReceiptImportRows, type ReceiptImportBatch, type ReceiptImportRecord } from "@/modules/imports/receipt-import";
import { canCorrectPayment, canSeeContractRecord } from "@/modules/identity/record-scope";
import type { Sale } from "@/modules/sales/types";
import { parseManilaDateOnly } from "@/shared/lib/dates";
import type { Actor } from "@/server/auth/actor";
import { requireOperation } from "@/server/auth/authorize";
import { dbRead, listAll, uniqueViolation } from "@/server/db";
import { centavosToInt64, int64ToCentavos } from "@/server/money";
import {
  loadAllowanceReviews, loadCommissionPayoutLists, loadCommissions, loadCommissionRateSettings, loadContract, loadMembershipForContract,
  loadNumbersWithPrefix, loadPayment, loadPaymentsOfContract, loadSaleForContract, loadVerifiedPayments,
} from "@/server/repositories/records";
import { conflict, invalid, newId, notFound, nowIso, today, transact, type AuditSpec } from "@/server/services/common";
import { applyCommissionTriggerFx, commissionEffects, holdUnpaidCommissionsFx, issueVipNumberFx, loadSaleCommissionState, payoutListOf, releaseCommissionsFx, restoreDefaultedCommissionsFx, vipIssuance } from "@/server/services/commissions";
import { ensureMembershipFx } from "@/server/services/membership";
import { isFullySettled } from "@/modules/finance/rules";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const REFERENCE_INDEX = "payment_referenceNo_uidx";
const DOCUMENT_INDEX = "payment_documentNo_uidx";

async function visibleContract(actor: Actor, contractId: string) {
  const found = await loadContract(contractId);
  if (!found || !canSeeContractRecord(actor.identity, found.contract)) throw notFound("Contract");
  return found;
}

async function assertActiveBank(method: string, bankId: string | null | undefined): Promise<void> {
  if (!bankId) return;
  if (method !== "Bank Transfer" && method !== "Cheque") throw invalid("A bank applies only to bank transfers and cheques.");
  const banks = await listAll<{ key: string; status: string }>("referenceEntries", "key status", { where: `{ list: { eq: "bank" } }` });
  if (!banks.some((bank) => bank.key === bankId && bank.status === "active")) throw invalid("Select an active bank.", { bankId: "Select an active bank." });
}

/** The next Cash OR number that is free across payments, unmatched receipts, import batches and IGP receipts. */
async function nextFreeCashDocumentNo(paidDate: string): Promise<string> {
  const datePrefix = paidDate.replaceAll("-", "");
  const payments = [...(await loadNumbersWithPrefix(`PAY-${datePrefix}`)), ...(await loadNumbersWithPrefix(`OR-${datePrefix}`))];
  const unmatched = (await listAll<{ orNumber: string }>("unmatchedReceipts", "orNumber", { where: `{ status: { eq: "unmatched" } }` }))
    .map((row) => ({ documentNo: row.orNumber }));
  const batches = await listAll<{ status: string; receipts: Array<{ referenceNo: string }> | null }>("receiptImportBatches", "status receipts");
  const imported = batches.filter((batch) => batch.status !== "rejected").flatMap((batch) => (batch.receipts ?? []).map((receipt) => ({ documentNo: receipt.referenceNo })));
  const igp = await listAll<{ details: { receipts?: Array<{ documentNo: string | null }> } | null }>("igpSales", "details");
  const igpNumbers = igp.flatMap((sale) => (sale.details?.receipts ?? []).map((receipt) => ({ documentNo: receipt.documentNo })));
  return nextOfficialReceiptNo([...payments, ...unmatched, ...imported, ...igpNumbers], paidDate);
}

const detailsOf = (payment: Payment) => ({ history: payment.history, evidenceFileName: payment.evidenceFileName, ...(payment.bankId ? { bankId: payment.bankId } : {}) });

/** Submits a receipt for Finance review. The system issues the payment reference, and a Cash receipt gets an Official Receipt number. */
export async function submitPayment(actor: Actor, input: SubmitPaymentInput): Promise<Payment> {
  requireOperation(actor, "payments.submit");
  const { contract } = await visibleContract(actor, input.contractId);
  if (contract.status === "cancelled") throw conflict("contract_closed", "Payments cannot be submitted for this contract.");
  const sale = (await loadSaleForContract(contract.id))?.sale ?? null;
  const existing = await loadPaymentsOfContract(contract.id, sale?.id ?? null);
  if (!(PAYMENT_PURPOSES as readonly string[]).includes(input.purpose)) throw invalid("Select a valid payment purpose.", { purpose: "Select a valid payment purpose." });
  if (!(PAYMENT_METHODS as readonly string[]).includes(input.method)) throw invalid("Select a valid payment method.", { method: "Select a valid payment method." });
  if (!Number.isSafeInteger(input.amountCentavos) || input.amountCentavos <= 0) throw invalid("Enter an amount greater than zero.", { amountCentavos: "Enter an amount greater than zero." });
  if (!DATE_ONLY.test(input.paidDate) || !parseManilaDateOnly(input.paidDate)) throw invalid("Enter the date on the receipt.", { paidDate: "Enter the date on the receipt." });
  if (input.paidDate > today()) throw invalid("The payment date cannot be in the future.", { paidDate: "The payment date cannot be in the future." });
  if (exceedsContractPrice(contract, existing, input.amountCentavos)) throw conflict("exceeds_balance", "This amount exceeds the outstanding balance of the contract.");
  await assertActiveBank(input.method, input.bankId);

  const typed = input.documentNo?.trim() || null;
  if (typed && (await paperNumberTaken(typed))) throw conflict("duplicate_number", "This OR or reference number is already used by another payment. A duplicate is not accepted.");

  const id = newId();
  const submittedAt = nowIso();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    // The next free numbers are read each time; the unique indexes are the final guard against a simultaneous request.
    const datePrefix = input.paidDate.replaceAll("-", "");
    const taken = [...(await loadNumbersWithPrefix(`PAY-${datePrefix}`)), ...(await loadNumbersWithPrefix(`OR-${datePrefix}`))];
    const referenceNo = nextPaymentReference(taken, input.paidDate);
    const documentNo = typed ?? (input.method === "Cash" ? await nextFreeCashDocumentNo(input.paidDate) : null);
    const history = [{ at: submittedAt, actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.PAYMENT_SUBMITTED, note: null }];
    const details = { history, evidenceFileName: input.evidenceFileName?.trim() || null, ...(input.bankId ? { bankId: input.bankId } : {}) };
    try {
      await transact(actor, {
        variableDefinitions: "$d: Payment_Data!",
        fields: "payment: payment_insert(data: $d)",
        variables: { d: { id, contractId: contract.id, customerId: contract.customerId, purpose: input.purpose, amountCentavos: centavosToInt64(input.amountCentavos), method: input.method, paidDate: input.paidDate, referenceNo, documentNo: documentNo ?? undefined, status: "submitted", submittedById: actor.userId, submittedAt, details } },
        audit: [{ action: BUSINESS_AUDIT_ACTIONS.PAYMENT_SUBMITTED, entityType: "payment", entityId: id, details: { module: "finance", newValue: "submitted", relatedRecordIds: [contract.id] } }],
      });
      return (await loadPayment(id))!;
    } catch (error) {
      const index = uniqueViolation(error);
      if (index === DOCUMENT_INDEX && typed) throw conflict("duplicate_number", "This OR or reference number is already used by another payment. A duplicate is not accepted.");
      if (index === REFERENCE_INDEX || index === DOCUMENT_INDEX) continue;
      throw error;
    }
  }
  throw conflict("number_busy", "Could not assign a receipt number. Try again.");
}

type VerifyOutcome = { payment: Payment; saleStatus: Sale["status"] | null };

/**
 * Finance approves a receipt. Everything it changes commits together or not at all, in one database transaction:
 * the receipt becomes Verified (only if it is still waiting), the contract version moves (only if no one else decided a
 * receipt on this contract meanwhile), an approved Pending sale becomes Confirmed when approved collections reach 25%,
 * and the audit entries are written. A second approval of the same receipt finds it already decided and changes nothing.
 * If another receipt was decided at the same moment, the totals are read again and the approval is retried.
 */
export async function verifyPayment(actor: Actor, id: string, options: { exceptionReason?: string } = {}): Promise<VerifyOutcome> {
  requireOperation(actor, "finance.verify");
  for (let attempt = 0; attempt < 3; attempt += 1) {
    // Re-read the closed months on every attempt so a month closed meanwhile is honoured.
    const closed = await closedMonths();
    const read = await loadPayment(id);
    if (!read) throw notFound("Payment");
    const { contract, version } = await visibleContract(actor, read.contractId).catch(() => {
      throw notFound("Payment");
    });
    const saleBox = await loadSaleForContract(contract.id);
    const sale = saleBox?.sale ?? null;
    const all = await loadPaymentsOfContract(contract.id, sale?.id ?? null);
    const payment = all.find((item) => item.id === id);
    if (!payment) throw notFound("Payment");
    if (payment.status !== "submitted" && payment.status !== "under_review") throw conflict("not_verifiable", "Only a submitted payment can be verified.");

    // Finance, the Administrator or the Super Administrator may approve a receipt they entered or corrected; the history flags it (doc 07 section 5).
    const corrected = payment.history.some((entry) => entry.event === BUSINESS_AUDIT_ACTIONS.PAYMENT_RESUBMITTED && entry.actorId === actor.userId);
    const selfNote = payment.submittedBy === actor.userId || corrected ? "Self-approved: the approver also submitted or corrected this receipt." : undefined;
    if (contract.status === "cancelled") throw conflict("contract_closed", "This sale is closed. Its payment cannot be verified.");
    if (!sale?.approval) throw conflict("sale_not_approved", "The sale must be approved before its receipts can be verified.");
    if (findReferenceConflict(all, payment.referenceNo, payment.id)) throw conflict("duplicate_number", "This receipt or reference number is already used by another payment. A duplicate is never verified.");
    if (payment.documentNo?.trim() && (await paperNumberTaken(payment.documentNo, { paymentId: payment.id }))) throw conflict("duplicate_number", "This receipt or reference number is already used by another payment. A duplicate is never verified.");
    const others = all.filter((item) => item.id !== payment.id && item.status === "verified");
    if (findDuplicatePayment(others, payment)) throw conflict("duplicate_payment", "A matching verified payment already exists for this contract. A duplicate is never verified twice.");
    const exceptionReason = options.exceptionReason?.trim();
    if (findSuggestedMatch(all, payment) && !exceptionReason) throw invalid("Explain why the possible matching receipt is a separate payment.", { exceptionReason: "Explain why the possible matching receipt is a separate payment." });
    if (exceedsContractPrice(contract, others, payment.amountCentavos)) throw conflict("exceeds_price", "Verifying this payment would exceed the contract price.");

    const verifiedAt = nowIso();
    const approvalNote = [selfNote, exceptionReason].filter(Boolean).join(" ");
    const verified: Payment = {
      ...payment, status: "verified", verifiedBy: actor.userId, verifiedAt, verifiedDate: today(),
      // A receipt dated in a closed month is admitted into the first open month (doc 07 section 9.1 item 8).
      countedDate: firstOpenDate(closed, payment.paidDate),
      history: [...payment.history, { at: verifiedAt, actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.PAYMENT_VERIFIED, note: approvalNote || null }],
    };

    // A Pending (or reinstated Defaulted), approved sale is confirmed when net approved receipts reach 25% (doc 07, 13).
    const reinstated = sale.status === "defaulted";
    const workingStatus = reinstated ? "pending" : sale.status;
    const milestone = workingStatus === "pending" ? collectionState(contract, [...others, verified], sale).confirmation : null;
    const reconfirmation = sale.adjustments.some((adjustment) => adjustment.kind === "reversal");
    const adjustment = milestone
      ? { date: reconfirmation ? firstOpenDate(closed, today()) : milestone.countedDate, amountCentavos: sale.valueCentavos, kind: reconfirmation ? "reconfirmation" : "confirmation", reason: "Approved collection reached 25%", confirmedDate: milestone.date }
      : null;
    const confirmSale = Boolean(adjustment) && !reinstated;

    // F6: VIP Number issuance and commission release/holds join the same transaction (docs 06, 08, 13).
    const fx = commissionEffects();
    if (sale && sale.approval) {
      const state = await loadSaleCommissionState(sale.id);
      const collection = collectionState(contract, [...others, verified], sale);
      const confirmedNow = confirmSale || (reinstated && Boolean(adjustment));
      // The receipt that covers the first scheduled payment can also be the one that freezes the rates.
      let frozen = sale.commissionRates;
      if (!frozen && !contract.vipNumber) {
        const [settings, issued] = await Promise.all([
          loadCommissionRateSettings(),
          listAll<{ vipNumber: string | null }>("contracts", "vipNumber", { where: `{ vipNumber: { startsWith: $p } }`, variableDefinitions: "$p: String!", variables: { p: `${today().slice(2, 4)}${today().slice(5, 7)}${today().slice(8, 10)}` } }),
        ]);
        const issuance = vipIssuance(contract, sale, [...others, verified], settings, issued.map((row) => row.vipNumber ?? "").filter(Boolean));
        if (issuance && "vipNumber" in issuance) {
          issueVipNumberFx(fx, actor, contract.id, sale, issuance, contract.raNumber ?? null);
          frozen = issuance.rates;
        }
      }
      if (confirmedNow || sale.status === "confirmed") {
        if (reinstated) restoreDefaultedCommissionsFx(fx, actor, state, sale.id, firstOpenDate(closed, today()));
        if (frozen) {
          if (!collection.release) {
            holdUnpaidCommissionsFx(fx, actor, state, sale.id, "Approved collections fell below 40%.", true, ["stage1"]);
          }
          releaseCommissionsFx(fx, actor, state, {
            saleId: sale.id, contractId: contract.id, product: "VIP", valueCentavos: sale.valueCentavos, rates: frozen,
            stage1Date: collection.release?.countedDate ?? null, fullPaymentDate: collection.fullPayment?.countedDate ?? null,
          });
        }
      } else if (frozen) {
        holdUnpaidCommissionsFx(fx, actor, state, sale.id, "Approved collections fell below 40%.", true, ["stage1"]);
        holdUnpaidCommissionsFx(fx, actor, state, sale.id, "The sale is no longer Confirmed.");
      }
    }
    // F7: a finalized, fully settled contract carries its pending membership in this same receipt transaction (doc 09 §5).
    const membership = await loadMembershipForContract(contract.id);
    if (!membership && contract.status === "finalized" && isFullySettled(contract, [...others, verified])) {
      ensureMembershipFx(fx, actor, contract);
    }
    // A reinstated or reconfirmed sale releases the membership Financial Hold (doc 09 §17.2).
    if (membership && membership.financialHold && isFullySettled(contract, [...others, verified])) {
      fx.definitions.push("$memId: UUID!", "$memRestored: Date!");
      fx.variables["memId"] = membership.id;
      fx.variables["memRestored"] = firstOpenDate(closed, today());
      fx.fields.push("membership: membership_updateMany(where: { id: { eq: $memId } }, data: { financialHold: false, restoredFromHoldOn: $memRestored })");
      fx.audits.push({ action: BUSINESS_AUDIT_ACTIONS.FINANCIAL_HOLD_RELEASED, entityType: "membership", entityId: membership.id, details: { module: "membership", previousValue: "financial_hold", newValue: "no_hold", relatedRecordIds: [contract.id] } });
    }

    const definitions = [
      "$payment: UUID!", "$contract: UUID!", "$version: Int!", "$verifier: UUID!", "$verifiedAt: Timestamp!", "$verifiedDate: Date!", "$countedDate: Date!", "$details: Any!",
      (confirmSale || reinstated) ? "$sale: UUID!, $confirmedDate: Date!" : "", adjustment ? "$adjDate: Date!, $adjAmount: Int64!, $adjKind: String!, $adjReason: String!" : "",
    ].filter(Boolean).join(", ");
    const fields = `bump: contract_updateMany(where: { id: { eq: $contract }, collectionVersion: { eq: $version } }, data: { collectionVersion_update: { inc: 1 } })
verified: payment_updateMany(where: { id: { eq: $payment }, status: { in: ["submitted", "under_review"] } }, data: { status: "verified", verifiedById: $verifier, verifiedAt: $verifiedAt, verifiedDate: $verifiedDate, countedDate: $countedDate, details: $details })
${confirmSale ? `confirmSale: sale_updateMany(where: { id: { eq: $sale }, status: { eq: "pending" } }, data: { status: "confirmed", confirmedDate: $confirmedDate, financialHold: false })` : ""}
${reinstated ? `reinstate: sale_updateMany(where: { id: { eq: $sale }, status: { eq: "defaulted" } }, data: { status: ${adjustment ? '"confirmed"' : '"pending"'}, ${adjustment ? "confirmedDate: $confirmedDate, " : ""}financialHold: false })` : ""}
${adjustment ? `adjustment: saleAdjustment_insert(data: { saleId: $sale, date: $adjDate, amountCentavos: $adjAmount, kind: $adjKind, reason: $adjReason, actorId: $verifier })` : ""}
query @redact {
  c: contract(id: $contract) @check(expr: "response.bump == 1", message: "STALE_CONTRACT") { id }
  p: payment(id: $payment) @check(expr: "response.verified == 1", message: "NOT_VERIFIABLE") { id }
${confirmSale ? `  s: sale(id: $sale) @check(expr: "response.confirmSale == 1", message: "STALE_SALE") { id }` : ""}
${reinstated ? `  r: sale(id: $sale) @check(expr: "response.reinstate == 1", message: "STALE_SALE") { id }` : ""}
}`;
    const audit: AuditSpec[] = [{ action: BUSINESS_AUDIT_ACTIONS.PAYMENT_VERIFIED, entityType: "payment", entityId: payment.id, details: { module: "finance", previousValue: payment.status, newValue: String(payment.amountCentavos), ...(approvalNote ? { reason: approvalNote } : {}), relatedRecordIds: [contract.id] } }];
    if (reinstated) audit.push({ action: BUSINESS_AUDIT_ACTIONS.SALE_REINSTATED, entityType: "sale", entityId: sale.id, details: { module: "sales", previousValue: "defaulted", newValue: adjustment ? "confirmed" : "pending", relatedRecordIds: [payment.id] } });
    if (adjustment) audit.push({ action: reconfirmation ? BUSINESS_AUDIT_ACTIONS.SALE_RECONFIRMED : BUSINESS_AUDIT_ACTIONS.SALE_CONFIRMED, entityType: "sale", entityId: sale.id, details: { module: "sales", previousValue: "pending", newValue: "confirmed", relatedRecordIds: [contract.id] } });
    // The details column also holds the receipt evidence pointer. Keep whatever the row already stores.
    const stored = await dbRead<{ payment: { details: Record<string, unknown> | null } | null }>(`query($id: UUID!) { payment(id: $id) { details } }`, { id: payment.id });
    const details = { ...(stored.payment?.details ?? {}), ...detailsOf(verified) };

    try {
      await transact(actor, {
        variableDefinitions: [definitions, ...fx.definitions].filter(Boolean).join(", "),
        fields: [fields, ...fx.fields].join("\n"),
        variables: {
          payment: payment.id, contract: contract.id, version, verifier: actor.userId, verifiedAt, verifiedDate: verified.verifiedDate, countedDate: verified.countedDate, details,
          ...((confirmSale || reinstated) ? { sale: sale.id, confirmedDate: adjustment?.confirmedDate ?? milestone?.date ?? today() } : {}),
          ...(adjustment ? { adjDate: adjustment.date, adjAmount: centavosToInt64(adjustment.amountCentavos), adjKind: adjustment.kind, adjReason: adjustment.reason } : {}),
          ...fx.variables,
        },
        audit: [...audit, ...fx.audits],
        markers: {
          NOT_VERIFIABLE: conflict("not_verifiable", "This payment was already decided."),
          STALE_CONTRACT: conflict("retry", "Another receipt on this contract was decided at the same time."),
          STALE_SALE: conflict("retry", "The sale changed at the same time."),
        },
      });
      return { payment: verified, saleStatus: adjustment ? "confirmed" : reinstated ? "pending" : sale.status };
    } catch (error) {
      // Another contract took the next VIP Number first: the retry re-scans and allocates the following sequence.
      if (uniqueViolation(error) === "contract_vipNumber_uidx" && attempt < 2) continue;
      // A receipt on the same contract was decided at the same moment: read the totals again and decide again.
      if (error instanceof Error && "code" in error && (error as { code: string }).code === "retry" && attempt < 2) continue;
      throw error;
    }
  }
  throw conflict("busy", "This contract is busy. Try again in a moment.");
}

// ---------------------------------------------------------------- F5: receipt decisions, adjustments, closed months, unmatched receipts and imports
async function closedMonths(): Promise<Array<{ month: string }>> {
  return listAll<{ month: string }>("closedMonths", "month");
}

async function loadVisiblePayment(actor: Actor, id: string): Promise<Payment> {
  const payment = await loadPayment(id);
  if (!payment) throw notFound("Payment");
  const contract = await loadContract(payment.contractId);
  if (!contract || !canSeeContractRecord(actor.identity, contract.contract)) throw notFound("Payment");
  return payment;
}

/** Return-for-correction and rejection share one decision path; the receipt is never deleted. */
async function decidePayment(actor: Actor, id: string, reason: string, status: "rejected" | "returned", action: string): Promise<Payment> {
  requireOperation(actor, "finance.verify");
  const text = reason.trim();
  if (!text) throw invalid("A reason is required.", { reason: "A reason is required." });
  const payment = await loadVisiblePayment(actor, id);
  if (payment.status !== "submitted" && payment.status !== "under_review") throw conflict("not_decidable", "Only a submitted payment can be rejected or returned.");
  const event = { at: nowIso(), actorId: actor.userId, event: action, note: text };
  const stored = await dbRead<{ payment: { details: Record<string, unknown> | null } | null }>(`query($id: UUID!) { payment(id: $id) { details } }`, { id });
  const details = { ...(stored.payment?.details ?? {}), ...detailsOf(payment), history: [...payment.history, event] };
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $status: String!, $reason: String!, $details: Any!",
    fields: "payment: payment_updateMany(where: { id: { eq: $id }, status: { in: [\"submitted\", \"under_review\"] } }, data: { status: $status, decisionReason: $reason, details: $details })\nquery @redact { p: payment(id: $id) @check(expr: \"response.payment == 1\", message: \"ALREADY_DECIDED\") { id } }",
    variables: { id: payment.id, status, reason: text, details },
    audit: [{ action, entityType: "payment", entityId: payment.id, details: { module: "finance", previousValue: payment.status, newValue: status, reason: text, relatedRecordIds: [payment.contractId] } }],
    markers: { ALREADY_DECIDED: conflict("already_decided", "This payment was already decided.") },
  });
  return (await loadPayment(payment.id))!;
}

export async function rejectPayment(actor: Actor, id: string, reason: string): Promise<Payment> {
  return decidePayment(actor, id, reason, "rejected", BUSINESS_AUDIT_ACTIONS.PAYMENT_REJECTED);
}

export async function returnPayment(actor: Actor, id: string, reason: string): Promise<Payment> {
  return decidePayment(actor, id, reason, "returned", BUSINESS_AUDIT_ACTIONS.PAYMENT_RETURNED);
}

export async function resubmitPayment(actor: Actor, id: string, input: Partial<Omit<SubmitPaymentInput, "contractId">>): Promise<Payment> {
  requireOperation(actor, "payments.submit");
  const payment = await loadVisiblePayment(actor, id);
  if (!canCorrectPayment(actor.identity, payment.submittedBy)) throw conflict("not_submitter", "Only the submitter or an administrator can correct this payment.");
  if (payment.status !== "returned") throw conflict("not_returned", "Only a payment returned for correction can be resubmitted.");
  const { contract } = await visibleContract(actor, payment.contractId);
  if (contract.status === "cancelled") throw conflict("contract_closed", "Payments cannot be resubmitted for this contract.");
  const purpose = input.purpose ?? payment.purpose;
  const amountCentavos = input.amountCentavos ?? payment.amountCentavos;
  const method = input.method ?? payment.method;
  const paidDate = input.paidDate ?? payment.paidDate;
  if (!(PAYMENT_PURPOSES as readonly string[]).includes(purpose)) throw invalid("Select a valid payment purpose.", { purpose: "Select a valid payment purpose." });
  if (!(PAYMENT_METHODS as readonly string[]).includes(method)) throw invalid("Select a valid payment method.", { method: "Select a valid payment method." });
  if (!Number.isSafeInteger(amountCentavos) || amountCentavos <= 0) throw invalid("Enter an amount greater than zero.", { amountCentavos: "Enter an amount greater than zero." });
  if (!DATE_ONLY.test(paidDate) || !parseManilaDateOnly(paidDate) || paidDate > today()) throw invalid("Enter a valid payment date on or before today.", { paidDate: "Enter a valid payment date." });
  const bankId = input.bankId === undefined ? payment.bankId ?? null : input.bankId?.trim() || null;
  await assertActiveBank(method, bankId);
  const all = await loadPaymentsOfContract(contract.id, payment.saleId);
  if (exceedsContractPrice(contract, all.filter((item) => item.id !== payment.id), amountCentavos)) throw conflict("exceeds_balance", "This amount exceeds the outstanding balance of the contract.");
  if (input.referenceNo !== undefined && input.referenceNo?.trim() !== payment.referenceNo) throw conflict("reference_change", "A resent receipt must keep its original payment reference.");
  let documentNo = input.documentNo !== undefined ? input.documentNo?.trim() || null : payment.documentNo ?? null;
  if (method === "Cash" && !documentNo) {
    documentNo = await nextFreeCashDocumentNo(paidDate);
  }
  if (documentNo && (await paperNumberTaken(documentNo, { paymentId: payment.id }))) {
    throw conflict("duplicate_number", "This OR or reference number is already used by another payment. A duplicate is not accepted.");
  }
  const previousVersion = { purpose: payment.purpose, amountCentavos: payment.amountCentavos, method: payment.method, paidDate: payment.paidDate, referenceNo: payment.referenceNo, documentNo: payment.documentNo ?? null, evidenceFileName: payment.evidenceFileName };
  const event = { at: nowIso(), actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.PAYMENT_RESUBMITTED, note: null, previousVersion };
  const stored = await dbRead<{ payment: { details: Record<string, unknown> | null } | null }>(`query($id: UUID!) { payment(id: $id) { details } }`, { id });
  const details = { ...(stored.payment?.details ?? {}), ...detailsOf(payment), history: [...payment.history, event], ...(input.bankId !== undefined ? { bankId } : {}), ...(input.evidenceFileName !== undefined ? { evidenceFileName: input.evidenceFileName?.trim() || null } : {}) };
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $purpose: String!, $amount: Int64!, $method: String!, $paidDate: Date!, $documentNo: String, $details: Any!",
    fields: "payment: payment_updateMany(where: { id: { eq: $id }, status: { eq: \"returned\" } }, data: { purpose: $purpose, amountCentavos: $amount, method: $method, paidDate: $paidDate, documentNo: $documentNo, status: \"submitted\", decisionReason: null, details: $details })\nquery @redact { p: payment(id: $id) @check(expr: \"response.payment == 1\", message: \"NOT_RETURNED\") { id } }",
    variables: { id: payment.id, purpose, amount: centavosToInt64(amountCentavos), method, paidDate, documentNo: documentNo ?? undefined, details },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.PAYMENT_RESUBMITTED, entityType: "payment", entityId: payment.id, details: { module: "finance", previousValue: "returned", newValue: "submitted", relatedRecordIds: [contract.id] } }],
    markers: { NOT_RETURNED: conflict("not_returned", "This payment was already decided.") },
  });
  return (await loadPayment(payment.id))!;
}

/** Reversal or refund of a verified receipt; the original receipt is never deleted (doc 07 section 14). */
export async function adjustPayment(actor: Actor, id: string, input: { kind: "reversal" | "refund"; amountCentavos: number; reason: string }): Promise<Payment> {
  requireOperation(actor, "finance.refund");
  const reason = input.reason.trim();
  if (!reason) throw invalid("A reason is required.", { reason: "A reason is required." });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const payment = await loadVisiblePayment(actor, id);
    if (payment.status !== "verified") throw conflict("not_verified", "Only a verified payment can be undone or refunded.");
    if (input.kind === "refund" && payment.purpose === "reservation") throw conflict("reservation_non_refundable", "The Reservation Fee is non-refundable. Record an undo only to correct an error.");
    if (!Number.isInteger(input.amountCentavos) || input.amountCentavos <= 0) throw invalid("Enter an amount greater than zero.", { amountCentavos: "Enter an amount greater than zero." });
    if (input.amountCentavos > adjustableCentavos(payment)) throw invalid("The amount exceeds the remaining verified amount of this payment.");
    const closed = await closedMonths();
    const date = firstOpenDate(closed, today());
    if (payment.adjustments.some((item) => item.kind === input.kind && item.amountCentavos === input.amountCentavos && item.reason === reason && item.date === date)) {
      throw conflict("duplicate_adjustment", "This adjustment was already recorded. Repeating it would duplicate it.");
    }
    const adjustment: PaymentAdjustment = { id: newId(), kind: input.kind, amountCentavos: input.amountCentavos, date, reason, actorId: actor.userId };
    const adjusted: Payment = { ...payment, adjustments: [...payment.adjustments, adjustment] };
    const { contract, version } = await visibleContract(actor, payment.contractId);
    const sale = (await loadSaleForContract(contract.id))?.sale ?? null;
    const all = await loadPaymentsOfContract(contract.id, sale?.id ?? null);
    const after = all.map((item) => (item.id === payment.id ? adjusted : item));
    const state = sale ? collectionState(contract, after, sale) : null;
    const dropToPending = Boolean(sale && sale.status === "confirmed" && state && !state.confirmation);
    const releaseHold = Boolean(sale && sale.financialHold && state?.confirmation);
    // F6: commission holds and the returned-cheque trigger join the same transaction (docs 07 §14, 08 §13–14).
    const fx = commissionEffects();
    if (sale && sale.approval) {
      const cState = await loadSaleCommissionState(sale.id);
      if (sale.commissionRates) {
        const before = collectionState(contract, all, sale);
        if (payment.method === "Cheque" && input.kind === "reversal" && before.release && !state?.release) {
          applyCommissionTriggerFx(fx, actor, cState, { saleId: sale.id, trigger: "returned_cheque", date, stages: ["stage1"] });
        }
        if (dropToPending) {
          holdUnpaidCommissionsFx(fx, actor, cState, sale.id, "Approved collections fell below 40%.", true, ["stage1"]);
          holdUnpaidCommissionsFx(fx, actor, cState, sale.id, "The sale is no longer Confirmed.");
        } else if (sale.status === "confirmed" || releaseHold) {
          if (!state?.release) {
            holdUnpaidCommissionsFx(fx, actor, cState, sale.id, "Approved collections fell below 40%.", true, ["stage1"]);
          }
          releaseCommissionsFx(fx, actor, cState, {
            saleId: sale.id, contractId: contract.id, product: "VIP", valueCentavos: sale.valueCentavos, rates: sale.commissionRates,
            stage1Date: state?.release?.countedDate ?? null, fullPaymentDate: state?.fullPayment?.countedDate ?? null,
          });
        }
      }
    }
    // F7: any reversal or refund that leaves the total price outstanding holds the membership (doc 09 §17.2);
    // verified money that settles the contract again releases it.
    const membership = sale ? await loadMembershipForContract(contract.id) : null;
    if (membership && state && !state.settled && !membership.financialHold) {
      fx.definitions.push("$memId: UUID!");
      fx.variables["memId"] = membership.id;
      fx.fields.push("membership: membership_updateMany(where: { id: { eq: $memId } }, data: { financialHold: true })");
      fx.audits.push({ action: BUSINESS_AUDIT_ACTIONS.FINANCIAL_HOLD_APPLIED, entityType: "membership", entityId: membership.id, details: { module: "membership", previousValue: "no_hold", newValue: "financial_hold", relatedRecordIds: [contract.id] } });
    } else if (membership && state?.settled && membership.financialHold) {
      fx.definitions.push("$memId: UUID!", "$memRestored: Date!");
      fx.variables["memId"] = membership.id;
      fx.variables["memRestored"] = date;
      fx.fields.push("membership: membership_updateMany(where: { id: { eq: $memId } }, data: { financialHold: false, restoredFromHoldOn: $memRestored })");
      fx.audits.push({ action: BUSINESS_AUDIT_ACTIONS.FINANCIAL_HOLD_RELEASED, entityType: "membership", entityId: membership.id, details: { module: "membership", previousValue: "financial_hold", newValue: "no_hold", relatedRecordIds: [contract.id] } });
    }
    const stored = await dbRead<{ payment: { details: Record<string, unknown> | null } | null }>(`query($id: UUID!) { payment(id: $id) { details } }`, { id });
    const event = { at: nowIso(), actorId: actor.userId, event: input.kind === "reversal" ? BUSINESS_AUDIT_ACTIONS.PAYMENT_REVERSED : BUSINESS_AUDIT_ACTIONS.PAYMENT_REFUNDED, note: reason };
    const details = { ...(stored.payment?.details ?? {}), ...detailsOf(adjusted), history: [...payment.history, event] };
    const action = input.kind === "reversal" ? BUSINESS_AUDIT_ACTIONS.PAYMENT_REVERSED : BUSINESS_AUDIT_ACTIONS.PAYMENT_REFUNDED;
    // The contract version commits only if no other receipt decision or adjustment ran since the read,
    // so two simultaneous reversals can never both use the same remaining amount (doc 07 section 14).
    const fields = [
      "bump: contract_updateMany(where: { id: { eq: $contract }, collectionVersion: { eq: $version } }, data: { collectionVersion_update: { inc: 1 } })",
      "adjustment: paymentAdjustment_insert(data: $adj)",
      "payment: payment_update(id: $id, data: { details: $details })",
      ...(sale ? [`saleState: sale_updateMany(where: { id: { eq: $sale } }, data: { financialHold: $hold${dropToPending ? ', status: "pending"' : ""} })`] : []),
      ...(dropToPending ? ["saleAdjustment: saleAdjustment_insert(data: { saleId: $sale, date: $adjDate, amountCentavos: $adjAmount, kind: \"reversal\", reason: $adjReason, actorId: $actor })"] : []),
      "query @redact { c: contract(id: $contract) @check(expr: \"response.bump == 1\", message: \"STALE_CONTRACT\") { id } }",
    ].join("\n");
    const definitions = ["$contract: UUID!", "$version: Int!", "$adj: PaymentAdjustment_Data!", "$id: UUID!", "$details: Any!", sale ? "$sale: UUID!, $hold: Boolean!" : "", dropToPending ? "$adjDate: Date!, $adjAmount: Int64!, $adjReason: String!, $actor: UUID!" : ""].filter(Boolean).join(", ");
    const audit: AuditSpec[] = [{ action, entityType: "payment", entityId: payment.id, details: { module: "finance", newValue: String(input.amountCentavos), reason, relatedRecordIds: [contract.id] } }];
    if (dropToPending && sale) {
      audit.push({ action: BUSINESS_AUDIT_ACTIONS.SALE_REVERSED, entityType: "sale", entityId: sale.id, details: { module: "sales", previousValue: "confirmed", newValue: "pending", relatedRecordIds: [contract.id] } });
      if (!sale.financialHold) audit.push({ action: BUSINESS_AUDIT_ACTIONS.FINANCIAL_HOLD_APPLIED, entityType: "sale", entityId: sale.id, details: { module: "finance", previousValue: "no_hold", newValue: "financial_hold", relatedRecordIds: [contract.id] } });
    }
    if (releaseHold && sale) audit.push({ action: BUSINESS_AUDIT_ACTIONS.FINANCIAL_HOLD_RELEASED, entityType: "sale", entityId: sale.id, details: { module: "finance", previousValue: "financial_hold", newValue: "no_hold", relatedRecordIds: [contract.id] } });
    try {
      await transact(actor, {
        variableDefinitions: [definitions, ...fx.definitions].filter(Boolean).join(", "),
        fields: [fields, ...fx.fields].join("\n"),
        variables: {
          contract: contract.id, version,
          adj: { id: adjustment.id, paymentId: payment.id, kind: adjustment.kind, amountCentavos: centavosToInt64(adjustment.amountCentavos), date: adjustment.date, reason: adjustment.reason, actorId: actor.userId },
          id: payment.id, details,
          ...(sale ? { sale: sale.id, hold: Boolean(dropToPending || (sale.financialHold && !releaseHold)) } : {}),
          ...(dropToPending ? { adjDate: date, adjAmount: centavosToInt64(-(sale?.valueCentavos ?? 0)), adjReason: "Required payment reversed or refunded", actor: actor.userId } : {}),
          ...fx.variables,
        },
        audit: [...audit, ...fx.audits],
        markers: { STALE_CONTRACT: conflict("retry", "Another receipt decision changed this contract. Try again.") },
      });
      return (await loadPayment(payment.id))!;
    } catch (error) {
      if (error instanceof Error && "code" in error && (error as { code: string }).code === "retry" && attempt < 2) continue;
      throw error;
    }
  }
  throw conflict("busy", "This contract is busy. Try again in a moment.");
}

export async function listClosedMonths(actor: Actor): Promise<ClosedMonth[]> {
  requireOperation(actor, "finance.verify");
  const rows = await listAll<{ month: string; snapshot: ClosedMonth | null }>("closedMonths", "month snapshot");
  return rows.map((row) => row.snapshot).filter((snapshot): snapshot is ClosedMonth => Boolean(snapshot));
}

/** Closes a past month and freezes its totals; later receipts dated in it count in the first open month. */
export async function closeMonth(actor: Actor, month: string): Promise<ClosedMonth> {
  requireOperation(actor, "contracts.approve");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month >= today().slice(0, 7)) throw invalid("Select a month that has ended.", { month: "Select a month that has ended." });
  const existing = await dbRead<{ closedMonths: Array<{ snapshot: ClosedMonth | null }> }>(`query($m: String!) { closedMonths(where: { month: { eq: $m } }, limit: 1) { snapshot } }`, { m: month });
  if (existing.closedMonths[0]?.snapshot) return existing.closedMonths[0].snapshot;
  const [payments, adjustmentRows, commissions, allowanceReviews, lists] = await Promise.all([
    loadVerifiedPayments(),
    listAll<{ id: string; date: string; amountCentavos: string; kind: string; reason: string; actor: { id: string } | null }>("saleAdjustments", "id date amountCentavos kind reason actor { id }"),
    loadCommissions(),
    loadAllowanceReviews(),
    loadCommissionPayoutLists(),
  ]);
  const adjustments = adjustmentRows.map((row) => ({ id: row.id, date: row.date, amountCentavos: int64ToCentavos(row.amountCentavos), kind: row.kind as "confirmation" | "reversal" | "reconfirmation" | "amendment", reason: row.reason, actorId: row.actor?.id ?? "" }));
  const snapshot = closedMonthSnapshot({ sales: [{ adjustments }], payments, commissions, allowanceReviews }, month, nowIso(), actor.userId);
  // F6: closing the month makes the system prepare that month's payout list (2026-11-16 amendment), prepared by the system.
  const payoutList = payoutListOf(month, commissions, lists, null);
  await transact(actor, {
    variableDefinitions: payoutList ? "$d: ClosedMonth_Data!, $pl: CommissionPayoutList_Data!" : "$d: ClosedMonth_Data!",
    fields: ["month: closedMonth_insert(data: $d)", ...(payoutList ? ["payoutList: commissionPayoutList_insert(data: $pl)"] : [])].join("\n"),
    variables: {
      d: { id: newId(), month, closedAt: snapshot.closedAt, closedById: actor.userId, snapshot },
      ...(payoutList ? { pl: payoutList.data } : {}),
    },
    audit: [
      { action: BUSINESS_AUDIT_ACTIONS.MONTH_CLOSED, entityType: "closed-month", entityId: month, details: { module: "finance", newValue: "closed" } },
      ...(payoutList ? [{ action: BUSINESS_AUDIT_ACTIONS.COMMISSION_PAYOUT_LIST_PREPARED, entityType: "commission", entityId: String(payoutList.data.id), details: { module: "commissions", newValue: month, relatedRecordIds: payoutList.commissionIds } } satisfies AuditSpec] : []),
    ],
  });
  return snapshot;
}

// ---------------------------------------------------------------- unmatched receipts
type UnmatchedRow = {
  id: string; amountCentavos: string; method: string; paidDate: string; orNumber: string; reason: string; evidenceFileName: string | null;
  status: string; matchedPayment: { id: string } | null; submittedBy: { id: string } | null; submittedAt: string;
  decidedBy: { id: string } | null; decidedAt: string | null; decisionReason: string | null; details: Record<string, unknown> | null;
};
const UNMATCHED_FIELDS = "id amountCentavos method paidDate orNumber reason evidenceFileName status matchedPayment { id } submittedBy { id } submittedAt decidedBy { id } decidedAt decisionReason details";

function toUnmatched(row: UnmatchedRow, names: Map<string, string>): UnmatchedReceipt & { submitterName: string } {
  const details = (row.details ?? {}) as { history?: UnmatchedReceipt["history"] };
  return {
    id: row.id, amountCentavos: int64ToCentavos(row.amountCentavos), method: row.method as UnmatchedReceipt["method"], paidDate: row.paidDate, orNumber: row.orNumber,
    reason: row.reason, evidenceFileName: row.evidenceFileName, status: row.status as UnmatchedReceipt["status"], matchedPaymentId: row.matchedPayment?.id ?? null,
    submittedBy: row.submittedBy?.id ?? "", submittedAt: row.submittedAt, decisionReason: row.decisionReason, decidedBy: row.decidedBy?.id ?? null,
    decidedAt: row.decidedAt, history: details.history ?? [], submitterName: names.get(row.submittedBy?.id ?? "") ?? "",
  };
}

async function userNames(): Promise<Map<string, string>> {
  const rows = await listAll<{ id: string; displayName: string }>("userAccounts", "id displayName");
  return new Map(rows.map((row) => [row.id, row.displayName]));
}

/** A paper OR/reference must be unused across payments, unmatched receipts, import batches and IGP receipts (doc 07 §9.2). */
export async function paperNumberTaken(number: string, self?: { paymentId?: string; unmatchedId?: string; batchId?: string }): Promise<boolean> {
  const wanted = number.trim().toLowerCase();
  if (!wanted) return false;
  const holders = await listAll<{ id: string; referenceNo: string | null; documentNo: string | null }>("payments", "id referenceNo documentNo");
  if (holders.some((row) => row.id !== self?.paymentId && ((row.referenceNo ?? "").trim().toLowerCase() === wanted || (row.documentNo ?? "").trim().toLowerCase() === wanted))) return true;
  const open = await listAll<{ id: string; orNumber: string }>("unmatchedReceipts", "id orNumber", { where: `{ status: { eq: "unmatched" } }` });
  if (open.some((row) => row.id !== self?.unmatchedId && row.orNumber.trim().toLowerCase() === wanted)) return true;
  const batches = await listAll<{ id: string; status: string; receipts: Array<{ referenceNo: string }> | null }>("receiptImportBatches", "id status receipts");
  if (batches.some((batch) => batch.id !== self?.batchId && batch.status !== "rejected" && (batch.receipts ?? []).some((receipt) => receipt.referenceNo.trim().toLowerCase() === wanted))) return true;
  const igp = await listAll<{ details: { receipts?: Array<{ documentNo: string | null }> } | null }>("igpSales", "details");
  if (igp.some((sale) => (sale.details?.receipts ?? []).some((receipt) => (receipt.documentNo ?? "").trim().toLowerCase() === wanted))) return true;
  // F7: resort bill OR numbers share the same system-wide uniqueness (doc 09 §11).
  const spends = await listAll<{ verificationRef: string | null }>("resortSpends", "verificationRef");
  return spends.some((row) => (row.verificationRef ?? "").trim().toLowerCase() === wanted);
}

export async function submitUnmatchedReceipt(actor: Actor, input: SubmitUnmatchedReceiptInput): Promise<UnmatchedReceipt> {
  requireOperation(actor, "payments.submit");
  if (!Number.isSafeInteger(input.amountCentavos) || input.amountCentavos <= 0) throw invalid("Enter an amount greater than zero.");
  if (!(PAYMENT_METHODS as readonly string[]).includes(input.method)) throw invalid("Select a valid payment method.");
  if (!DATE_ONLY.test(input.paidDate) || !parseManilaDateOnly(input.paidDate) || input.paidDate > today()) throw invalid("Enter a valid payment date on or before today.");
  const orNumber = (input.orNumber ?? "").trim();
  if (!orNumber) throw invalid("Enter the OR or bank reference number.");
  if (await paperNumberTaken(orNumber)) throw conflict("duplicate_number", "This OR or reference number is already used by another payment. A duplicate is not accepted.");
  const reason = (input.reason ?? "").trim();
  if (!reason) throw invalid("Explain why no matching contract or payment was found.");
  const submittedAt = nowIso();
  const id = newId();
  const history = [{ at: submittedAt, actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.UNMATCHED_RECEIPT_SUBMITTED, note: reason }];
  await transact(actor, {
    variableDefinitions: "$d: UnmatchedReceipt_Data!",
    fields: "receipt: unmatchedReceipt_insert(data: $d)",
    variables: { d: { id, amountCentavos: centavosToInt64(input.amountCentavos), method: input.method, paidDate: input.paidDate, orNumber, reason, evidenceFileName: input.evidenceFileName?.trim() || undefined, status: "unmatched", submittedById: actor.userId, submittedAt, details: { history } } },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.UNMATCHED_RECEIPT_SUBMITTED, entityType: "unmatched-receipt", entityId: id, details: { module: "finance", newValue: "unmatched", reason, displayReference: orNumber } }],
  });
  return (await loadUnmatched(id))!;
}

async function loadUnmatched(id: string): Promise<UnmatchedReceipt | null> {
  const result = await dbRead<{ unmatchedReceipt: UnmatchedRow | null }>(`query($id: UUID!) { unmatchedReceipt(id: $id) { ${UNMATCHED_FIELDS} } }`, { id });
  return result.unmatchedReceipt ? toUnmatched(result.unmatchedReceipt, await userNames()) : null;
}

export async function listUnmatchedReceipts(actor: Actor): Promise<UnmatchedReceipt[]> {
  requireOperation(actor, "finance.verify");
  const [rows, names] = await Promise.all([listAll<UnmatchedRow>("unmatchedReceipts", UNMATCHED_FIELDS), userNames()]);
  return rows.map((row) => toUnmatched(row, names));
}

export async function matchUnmatchedReceipt(actor: Actor, id: string, input: { contractId: string; purpose: Payment["purpose"]; note?: string | null }): Promise<Payment> {
  requireOperation(actor, "finance.verify");
  const record = await loadUnmatched(id);
  if (!record) throw notFound("Unmatched receipt");
  if (record.status !== "unmatched") throw conflict("already_resolved", "This receipt was already resolved and cannot be matched again.");
  const { contract } = await visibleContract(actor, input.contractId);
  if (contract.status === "cancelled") throw conflict("contract_closed", "Payments cannot be submitted for this contract.");
  if (!(PAYMENT_PURPOSES as readonly string[]).includes(input.purpose)) throw invalid("Select a valid payment purpose.");
  if (await paperNumberTaken(record.orNumber, { unmatchedId: record.id })) throw conflict("duplicate_number", "This OR or reference number is already used by another payment. A duplicate is not accepted.");
  const sale = (await loadSaleForContract(contract.id))?.sale ?? null;
  const all = await loadPaymentsOfContract(contract.id, sale?.id ?? null);
  if (exceedsContractPrice(contract, all.filter((item) => item.status === "verified"), record.amountCentavos)) throw conflict("exceeds_balance", "This amount exceeds the outstanding balance of the contract.");
  const paymentId = newId();
  const submittedAt = nowIso();
  let referenceNo = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const datePrefix = record.paidDate.replaceAll("-", "");
    const taken = [...(await loadNumbersWithPrefix(`PAY-${datePrefix}`)), ...(await loadNumbersWithPrefix(`OR-${datePrefix}`))];
    referenceNo = nextPaymentReference(taken, record.paidDate);
    try {
      const history = [
        { at: record.submittedAt, actorId: record.submittedBy, event: BUSINESS_AUDIT_ACTIONS.UNMATCHED_RECEIPT_SUBMITTED, note: record.reason },
        { at: submittedAt, actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.UNMATCHED_RECEIPT_MATCHED, note: input.note?.trim() || `Matched to ${contract.id}.` },
      ];
      await transact(actor, {
        variableDefinitions: "$p: Payment_Data!, $id: UUID!, $payment: UUID!, $decider: UUID!, $decidedAt: Timestamp!, $note: String, $details: Any!",
        fields: "payment: payment_insert(data: $p)\nreceipt: unmatchedReceipt_updateMany(where: { id: { eq: $id }, status: { eq: \"unmatched\" } }, data: { status: \"matched\", matchedPaymentId: $payment, decidedById: $decider, decidedAt: $decidedAt, decisionReason: $note, details: $details })",
        variables: {
          p: { id: paymentId, contractId: contract.id, customerId: contract.customerId, purpose: input.purpose, amountCentavos: centavosToInt64(record.amountCentavos), method: record.method, paidDate: record.paidDate, referenceNo, documentNo: record.orNumber, status: "submitted", submittedById: record.submittedBy, submittedAt: record.submittedAt, details: { history, evidenceFileName: record.evidenceFileName } },
          id: record.id, payment: paymentId, decider: actor.userId, decidedAt: submittedAt, note: input.note?.trim() || undefined,
          details: { history: [...record.history, { at: submittedAt, actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.UNMATCHED_RECEIPT_MATCHED, note: input.note?.trim() || null }] },
        },
        audit: [{ action: BUSINESS_AUDIT_ACTIONS.UNMATCHED_RECEIPT_MATCHED, entityType: "unmatched-receipt", entityId: record.id, details: { module: "finance", previousValue: "unmatched", newValue: paymentId, reason: input.note?.trim() || undefined, relatedRecordIds: [contract.id], displayReference: record.orNumber } }],
      });
      return (await loadPayment(paymentId))!;
    } catch (error) {
      const index = uniqueViolation(error);
      if (index === REFERENCE_INDEX && attempt < 4) continue;
      throw error;
    }
  }
  throw conflict("number_busy", "Could not assign a receipt number. Try again.");
}

export async function rejectUnmatchedReceipt(actor: Actor, id: string, reason: string): Promise<UnmatchedReceipt> {
  requireOperation(actor, "finance.verify");
  const text = reason.trim();
  if (!text) throw invalid("A reason is required.");
  const record = await loadUnmatched(id);
  if (!record) throw notFound("Unmatched receipt");
  if (record.status !== "unmatched") throw conflict("already_resolved", "This receipt was already resolved and cannot be rejected again.");
  const decidedAt = nowIso();
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $reason: String!, $decider: UUID!, $at: Timestamp!, $details: Any!",
    fields: "receipt: unmatchedReceipt_updateMany(where: { id: { eq: $id }, status: { eq: \"unmatched\" } }, data: { status: \"rejected\", decisionReason: $reason, decidedById: $decider, decidedAt: $at, details: $details })",
    variables: { id: record.id, reason: text, decider: actor.userId, at: decidedAt, details: { history: [...record.history, { at: decidedAt, actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.UNMATCHED_RECEIPT_REJECTED, note: text }] } },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.UNMATCHED_RECEIPT_REJECTED, entityType: "unmatched-receipt", entityId: record.id, details: { module: "finance", previousValue: "unmatched", newValue: "rejected", reason: text, displayReference: record.orNumber } }],
  });
  return (await loadUnmatched(record.id))!;
}

// ---------------------------------------------------------------- historical receipt imports
type BatchRow = {
  id: string; fileName: string; status: string; totalRows: number; receipts: ReceiptImportBatch["receipts"] | null; skipped: ReceiptImportBatch["skipped"] | null;
  decidedBy: { id: string } | null; decidedAt: string | null; decisionReason: string | null; details: Record<string, unknown> | null; createdAt: string;
};
const BATCH_FIELDS = "id fileName status totalRows receipts skipped decidedBy { id } decidedAt decisionReason details createdAt";

function toBatch(row: BatchRow): ReceiptImportBatch {
  const details = (row.details ?? {}) as { selfSignedOff?: boolean };
  return {
    id: row.id, fileName: row.fileName, createdAt: row.createdAt, createdBy: (row.details as { createdBy?: string } | null)?.createdBy ?? "",
    status: row.status as ReceiptImportBatch["status"], totalRows: row.totalRows, receipts: row.receipts ?? [], skipped: row.skipped ?? [],
    decidedBy: row.decidedBy?.id ?? null, decidedAt: row.decidedAt, decisionReason: row.decisionReason, selfSignedOff: details.selfSignedOff ?? false,
  };
}

async function loadBatch(id: string): Promise<ReceiptImportBatch | null> {
  const result = await dbRead<{ receiptImportBatch: BatchRow | null }>(`query($id: UUID!) { receiptImportBatch(id: $id) { ${BATCH_FIELDS} } }`, { id });
  return result.receiptImportBatch ? toBatch(result.receiptImportBatch) : null;
}

export async function listReceiptImportBatches(actor: Actor): Promise<ReceiptImportBatch[]> {
  requireOperation(actor, "history-import.manage");
  const rows = await listAll<BatchRow>("receiptImportBatches", BATCH_FIELDS, { orderBy: "[{ createdAt: DESC }, { id: DESC }]" });
  return rows.map(toBatch);
}

export async function createReceiptImportBatch(actor: Actor, input: { fileName: string; records: ReceiptImportRecord[]; declaration: boolean }): Promise<ReceiptImportBatch> {
  requireOperation(actor, "history-import.manage");
  if (!input.declaration) throw invalid("Confirm that the rows come from official company records.");
  if (input.records.length === 0) throw invalid("The file has no rows to import.");
  const [payments, batches] = await Promise.all([
    listAll<{ id: string; referenceNo: string | null; documentNo: string | null }>("payments", "id referenceNo documentNo"),
    listReceiptImportBatches(actor),
  ]);
  const rows = buildReceiptImportRows(input.records, { payments: payments.map((row) => ({ id: row.id, referenceNo: row.referenceNo })) as never, batches, today: today() });
  const ready = rows.filter((row) => row.status === "ready");
  if (ready.length === 0) throw invalid("No row can be imported. Fix the file and try again.");
  const id = newId();
  const receipts = ready.map((row, index) => ({ ...row.receipt!, id: `${id}-r${index + 1}`, batchId: id }));
  const skipped = rows.filter((row) => row.status === "invalid").map((row) => ({ rowNumber: row.rowNumber, reason: row.errors.join(" ") }));
  await transact(actor, {
    variableDefinitions: "$d: ReceiptImportBatch_Data!",
    fields: "batch: receiptImportBatch_insert(data: $d)",
    variables: { d: { id, fileName: input.fileName.trim().slice(0, 200) || "upload", createdById: actor.userId, status: "pending_signoff", totalRows: rows.length, receipts, skipped, details: { selfSignedOff: false, createdBy: actor.userId } } },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.RECEIPT_IMPORT_CREATED, entityType: "receipt-import", entityId: id, details: { module: "finance", newValue: `pending_signoff;receipts:${receipts.length};skipped:${skipped.length}` } }],
  });
  return (await loadBatch(id))!;
}

export async function signOffReceiptImportBatch(actor: Actor, id: string): Promise<ReceiptImportBatch> {
  requireOperation(actor, "history-import.signoff");
  const batch = await loadBatch(id);
  if (!batch) throw notFound("Import batch");
  if (batch.status !== "pending_signoff") throw conflict("not_pending", "Only a batch waiting for confirmation can be confirmed.");
  const selfSignedOff = batch.createdBy === actor.userId;
  const decidedAt = nowIso();
  for (const receipt of batch.receipts) {
    if (await paperNumberTaken(receipt.referenceNo, { batchId: batch.id })) {
      throw conflict("duplicate_number", "A receipt reference is already on record. Reject this batch and prepare a corrected copy.");
    }
  }
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $decider: UUID!, $at: Timestamp!, $details: Any!",
    fields: "batch: receiptImportBatch_updateMany(where: { id: { eq: $id }, status: { eq: \"pending_signoff\" } }, data: { status: \"signed_off\", decidedById: $decider, decidedAt: $at, details: $details })",
    variables: { id: batch.id, decider: actor.userId, at: decidedAt, details: { selfSignedOff, createdBy: batch.createdBy } },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.RECEIPT_IMPORT_SIGNED_OFF, entityType: "receipt-import", entityId: batch.id, details: { module: "finance", previousValue: "pending_signoff", newValue: `signed_off;receipts:${batch.receipts.length}`, reason: selfSignedOff ? "Self-confirmed: the person who confirmed also prepared this batch." : undefined } }],
  });
  return (await loadBatch(batch.id))!;
}

export async function rejectReceiptImportBatch(actor: Actor, id: string, reason: string): Promise<ReceiptImportBatch> {
  requireOperation(actor, "history-import.manage");
  const text = reason.trim();
  if (!text) throw invalid("A reason is required.");
  const batch = await loadBatch(id);
  if (!batch) throw notFound("Import batch");
  if (batch.status !== "pending_signoff") throw conflict("not_pending", "Only a batch waiting for confirmation can be rejected.");
  await transact(actor, {
    variableDefinitions: "$id: UUID!, $reason: String!, $decider: UUID!, $at: Timestamp!, $details: Any!",
    fields: "batch: receiptImportBatch_updateMany(where: { id: { eq: $id }, status: { eq: \"pending_signoff\" } }, data: { status: \"rejected\", decidedById: $decider, decidedAt: $at, decisionReason: $reason, details: $details })",
    variables: { id: batch.id, reason: text.slice(0, 500), decider: actor.userId, at: nowIso(), details: { selfSignedOff: batch.selfSignedOff, createdBy: batch.createdBy } },
    audit: [{ action: BUSINESS_AUDIT_ACTIONS.RECEIPT_IMPORT_REJECTED, entityType: "receipt-import", entityId: batch.id, details: { module: "finance", previousValue: "pending_signoff", newValue: "rejected", reason: text } }],
  });
  return (await loadBatch(batch.id))!;
}
