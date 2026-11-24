import "server-only";
import type { SubmitPaymentInput } from "@/data/contracts/payment-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { collectionState } from "@/modules/finance/application/collection-state";
import { nextOfficialReceiptNo, nextPaymentReference } from "@/modules/finance/payment-reference";
import { exceedsContractPrice, findDuplicatePayment, findReferenceConflict, findSuggestedMatch } from "@/modules/finance/rules";
import { PAYMENT_METHODS, PAYMENT_PURPOSES, type Payment } from "@/modules/finance/types";
import { canSeeContractRecord } from "@/modules/identity/record-scope";
import type { Sale } from "@/modules/sales/types";
import { parseManilaDateOnly } from "@/shared/lib/dates";
import type { Actor } from "@/server/auth/actor";
import { requireOperation } from "@/server/auth/authorize";
import { uniqueViolation } from "@/server/db";
import { centavosToInt64 } from "@/server/money";
import { loadContract, loadNumberHolders, loadNumbersWithPrefix, loadPayment, loadPaymentsOfContract, loadSaleForContract } from "@/server/repositories/records";
import { conflict, invalid, newId, notFound, nowIso, today, transact, type AuditSpec } from "@/server/services/common";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const REFERENCE_INDEX = "payment_referenceNo_uidx";
const DOCUMENT_INDEX = "payment_documentNo_uidx";

async function visibleContract(actor: Actor, contractId: string) {
  const found = await loadContract(contractId);
  if (!found || !canSeeContractRecord(actor.identity, found.contract)) throw notFound("Contract");
  return found;
}

const detailsOf = (payment: Payment) => ({ adjustments: payment.adjustments, history: payment.history, evidenceFileName: payment.evidenceFileName, ...(payment.bankId ? { bankId: payment.bankId } : {}) });

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
  // The Reservation Agreement bank list is not in the pilot schema.
  if (input.bankId) throw invalid("Choosing a bank is not part of the pilot yet.");

  const typed = input.documentNo?.trim() || null;
  if (typed && (await loadNumberHolders(typed)).length > 0) throw conflict("duplicate_number", "This OR or reference number is already used by another payment. A duplicate is not accepted.");

  const id = newId();
  const submittedAt = nowIso();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    // The next free numbers are read each time; the unique indexes are the final guard against a simultaneous request.
    const datePrefix = input.paidDate.replaceAll("-", "");
    const taken = [...(await loadNumbersWithPrefix(`PAY-${datePrefix}`)), ...(await loadNumbersWithPrefix(`OR-${datePrefix}`))];
    const referenceNo = nextPaymentReference(taken, input.paidDate);
    const documentNo = typed ?? (input.method === "Cash" ? nextOfficialReceiptNo(taken, input.paidDate) : null);
    const history = [{ at: submittedAt, actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.PAYMENT_SUBMITTED, note: null }];
    const details = { adjustments: [], history, evidenceFileName: input.evidenceFileName?.trim() || null };
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
    const others = all.filter((item) => item.id !== payment.id && item.status === "verified");
    if (findDuplicatePayment(others, payment)) throw conflict("duplicate_payment", "A matching verified payment already exists for this contract. A duplicate is never verified twice.");
    const exceptionReason = options.exceptionReason?.trim();
    if (findSuggestedMatch(all, payment) && !exceptionReason) throw invalid("Explain why the possible matching receipt is a separate payment.", { exceptionReason: "Explain why the possible matching receipt is a separate payment." });
    if (exceedsContractPrice(contract, others, payment.amountCentavos)) throw conflict("exceeds_price", "Verifying this payment would exceed the contract price.");

    const verifiedAt = nowIso();
    const approvalNote = [selfNote, exceptionReason].filter(Boolean).join(" ");
    const verified: Payment = {
      ...payment, status: "verified", verifiedBy: actor.userId, verifiedAt, verifiedDate: today(),
      // shortcut: month close is not in the pilot, so a receipt is counted on its own receipt date.
      countedDate: payment.paidDate,
      history: [...payment.history, { at: verifiedAt, actorId: actor.userId, event: BUSINESS_AUDIT_ACTIONS.PAYMENT_VERIFIED, note: approvalNote || null }],
    };

    // A Pending, approved sale is confirmed when net approved receipts reach 25% (doc 07, 13).
    const milestone = sale.status === "pending" ? collectionState(contract, [...others, verified], sale).confirmation : null;
    const reconfirmation = sale.adjustments.some((adjustment) => adjustment.kind === "reversal");
    const adjustment = milestone
      ? { date: reconfirmation ? today() : milestone.countedDate, amountCentavos: sale.valueCentavos, kind: reconfirmation ? "reconfirmation" : "confirmation", reason: "Approved collection reached 25%", confirmedDate: milestone.date }
      : null;

    const definitions = ["$payment: UUID!", "$contract: UUID!", "$version: Int!", "$verifier: UUID!", "$verifiedAt: Timestamp!", "$verifiedDate: Date!", "$countedDate: Date!", "$details: Any!", adjustment ? "$sale: UUID!, $confirmedDate: Date!, $adjDate: Date!, $adjAmount: Int64!, $adjKind: String!, $adjReason: String!" : ""].filter(Boolean).join(", ");
    const fields = `bump: contract_updateMany(where: { id: { eq: $contract }, collectionVersion: { eq: $version } }, data: { collectionVersion_update: { inc: 1 } })
verified: payment_updateMany(where: { id: { eq: $payment }, status: { in: ["submitted", "under_review"] } }, data: { status: "verified", verifiedById: $verifier, verifiedAt: $verifiedAt, verifiedDate: $verifiedDate, countedDate: $countedDate, details: $details })
${adjustment ? `confirmSale: sale_updateMany(where: { id: { eq: $sale }, status: { eq: "pending" } }, data: { status: "confirmed", confirmedDate: $confirmedDate })
adjustment: saleAdjustment_insert(data: { saleId: $sale, date: $adjDate, amountCentavos: $adjAmount, kind: $adjKind, reason: $adjReason, actorId: $verifier })` : ""}
query @redact {
  c: contract(id: $contract) @check(expr: "response.bump == 1", message: "STALE_CONTRACT") { id }
  p: payment(id: $payment) @check(expr: "response.verified == 1", message: "NOT_VERIFIABLE") { id }
${adjustment ? `  s: sale(id: $sale) @check(expr: "response.confirmSale == 1", message: "STALE_SALE") { id }` : ""}
}`;
    const audit: AuditSpec[] = [{ action: BUSINESS_AUDIT_ACTIONS.PAYMENT_VERIFIED, entityType: "payment", entityId: payment.id, details: { module: "finance", previousValue: payment.status, newValue: String(payment.amountCentavos), ...(approvalNote ? { reason: approvalNote } : {}), relatedRecordIds: [contract.id] } }];
    if (adjustment) audit.push({ action: BUSINESS_AUDIT_ACTIONS.SALE_CONFIRMED, entityType: "sale", entityId: sale.id, details: { module: "sales", previousValue: "pending", newValue: "confirmed", relatedRecordIds: [contract.id] } });

    try {
      await transact(actor, {
        variableDefinitions: definitions,
        fields,
        variables: {
          payment: payment.id, contract: contract.id, version, verifier: actor.userId, verifiedAt, verifiedDate: verified.verifiedDate, countedDate: verified.countedDate, details: detailsOf(verified),
          ...(adjustment ? { sale: sale.id, confirmedDate: adjustment.confirmedDate, adjDate: adjustment.date, adjAmount: centavosToInt64(adjustment.amountCentavos), adjKind: adjustment.kind, adjReason: adjustment.reason } : {}),
        },
        audit,
        markers: {
          NOT_VERIFIABLE: conflict("not_verifiable", "This payment was already decided."),
          STALE_CONTRACT: conflict("retry", "Another receipt on this contract was decided at the same time."),
          STALE_SALE: conflict("retry", "The sale changed at the same time."),
        },
      });
      return { payment: verified, saleStatus: adjustment ? "confirmed" : sale.status };
    } catch (error) {
      // A receipt on the same contract was decided at the same moment: read the totals again and decide again.
      if (error instanceof Error && "code" in error && (error as { code: string }).code === "retry" && attempt < 2) continue;
      throw error;
    }
  }
  throw conflict("busy", "This contract is busy. Try again in a moment.");
}
