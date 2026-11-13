import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { PaymentRepository, PaymentVerificationOptions, PaymentView, SubmitPaymentInput } from "@/data/contracts/payment-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { Contract } from "@/modules/contracts/types";
import { meetsPayoutRelease } from "@/modules/commissions/rules";
import { adjustableCentavos, exceedsContractPrice, findDuplicatePayment, findReferenceConflict, findSuggestedMatch } from "@/modules/finance/rules";
import { firstOpenDate } from "@/modules/finance/month-close";
import { PAYMENT_METHODS, PAYMENT_PURPOSES, type Payment, type PaymentEvent } from "@/modules/finance/types";
import type { DevIdentity } from "@/modules/identity/types";
import type { IgpSale } from "@/modules/igp/types";
import { cleanReferenceNumber, referencePolicyFor, validateReferenceNumber } from "@/shared/forms/validation/reference-number";
import { DEV_IDENTITIES } from "./dev-identities";
import { BusinessRepository, DATE_ONLY, canSeeContract, customerName, nowIso, today } from "./business-base";
import { paymentsOfContract, reconcileContract } from "./business-effects";
import { applyCommissionTrigger, restoreDefaultedCommission } from "./commission-effects";
import { nextId } from "./ids";
import type { MockStore } from "./seed";
import { canCorrectPayment } from "./scope";
import { canSeeIgpSale, findIgpPaymentTarget, reconcileIgpCollections } from "./igp-payment-effects";
import { hasImportedReceiptReference, hasRedemptionReceiptReference, hasResortReceiptReference } from "./resort-receipt-reference";
import { parseManilaDateOnly } from "@/shared/lib/dates";

type PaymentTarget = Contract | IgpSale;

function canSeePaymentTarget(identity: DevIdentity, target: PaymentTarget): boolean {
  return "seriesNumber" in target ? canSeeIgpSale(identity, target) : canSeeContract(identity, target);
}

function isClosedPaymentTarget(target: PaymentTarget): boolean {
  return target.status === "cancelled" || target.status === "returned" || target.status === "replaced" || target.status === "pending_review";
}

function hasReferenceConflict(store: MockStore, referenceNo: string | null | undefined, selfId?: string): boolean {
  return Boolean(findReferenceConflict(store.payments, referenceNo, selfId)) ||
    hasResortReceiptReference(store, referenceNo) || hasImportedReceiptReference(store, referenceNo) ||
    Boolean(referenceNo && hasRedemptionReceiptReference(store, referenceNo));
}

function validateReference(store: MockStore, referenceNo: string | null | undefined, selfId?: string) {
  if (!referenceNo?.trim()) throw new Error("Enter the receipt or reference number.");
  if (hasReferenceConflict(store, referenceNo, selfId)) throw new Error("This receipt or reference number is already used by another payment. A duplicate is not accepted.");
}

function validateFields(store: MockStore, target: PaymentTarget, input: Pick<SubmitPaymentInput, "purpose" | "amountCentavos" | "method" | "paidDate">, selfId?: string) {
  if (!(PAYMENT_PURPOSES as readonly string[]).includes(input.purpose)) throw new Error("Select a valid payment purpose.");
  if (!(PAYMENT_METHODS as readonly string[]).includes(input.method)) throw new Error("Select a valid payment method.");
  if (!Number.isSafeInteger(input.amountCentavos) || input.amountCentavos <= 0) throw new Error("Enter an amount greater than zero.");
  if (!DATE_ONLY.test(input.paidDate) || !parseManilaDateOnly(input.paidDate)) throw new Error("Enter the date on the receipt.");
  if (input.paidDate > today()) throw new Error("The payment date cannot be in the future.");
  if (exceedsContractPrice(target, paymentsOfContract(store, target.id).filter((item) => item.id !== selfId), input.amountCentavos)) throw new Error("This amount exceeds the outstanding balance of the contract.");
}

/** Construct a validated receipt before a workflow commits its records to the mock store. */
export function preparePaymentSubmission(store: MockStore, target: PaymentTarget, input: SubmitPaymentInput, submittedBy: string): Payment {
  if (isClosedPaymentTarget(target)) throw new Error("Payments cannot be submitted for this contract.");
  validateFields(store, target, input);
  validateReference(store, input.referenceNo);
  const bankId = input.bankId || null;
  if (bankId) {
    if (input.method !== "Bank Transfer" && input.method !== "Cheque") throw new Error("A bank applies only to bank transfers and cheques.");
    if (!store.referenceEntries.some((entry) => entry.list === "bank" && entry.id === bankId && entry.status === "active")) throw new Error("Select an active bank.");
  }
  const sale = "seriesNumber" in target ? target : store.sales.find((item) => item.contractId === target.id);
  const timestamp = nowIso();
  return {
    id: nextId(store, "payment", "pay"), contractId: target.id, customerId: target.customerId, saleId: sale?.id ?? null,
    purpose: input.purpose, amountCentavos: input.amountCentavos, method: input.method, paidDate: input.paidDate,
    referenceNo: input.referenceNo?.trim() ?? null, evidenceFileName: input.evidenceFileName?.trim() || null,
    ...(bankId ? { bankId } : {}),
    submittedBy, submittedAt: timestamp, status: "submitted", verifiedBy: null, verifiedAt: null, verifiedDate: null,
    decisionReason: null, adjustments: [],
    history: [{ at: timestamp, actorId: submittedBy, event: BUSINESS_AUDIT_ACTIONS.PAYMENT_SUBMITTED, note: null }],
  };
}

export class MockPaymentRepository extends BusinessRepository implements PaymentRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  private view(payment: Payment): PaymentView {
    const contract = this.paymentTarget(payment.contractId);
    const submitter = DEV_IDENTITIES.find((item) => item.id === payment.submittedBy);
    return JSON.parse(
      JSON.stringify({
        ...payment,
        customerName: customerName(this.store, payment.customerId),
        contractLabel: !contract ? "Unknown contract" : "seriesNumber" in contract
          ? `IGP · ${contract.seriesNumber}` : `${contract.productCode} · ${contract.schemeLabel}`,
        ...(contract && "seriesNumber" in contract ? { isIgp: true, approvalBlocked: !contract.approvedBy || isClosedPaymentTarget(contract) } : {
          approvalBlocked: !contract || contract.status === "cancelled" || !this.store.sales.some((sale) => sale.contractId === contract.id && sale.approval),
        }),
        referenceConflict: hasReferenceConflict(this.store, payment.referenceNo, payment.id),
        submitterName: submitter?.displayName ?? payment.submittedBy,
      }),
    ) as PaymentView;
  }

  private paymentTarget(id: string): PaymentTarget | undefined {
    return this.store.contracts.find((item) => item.id === id) ?? findIgpPaymentTarget(this.store, id);
  }

  private contractFor(identity: DevIdentity, id: string): PaymentTarget {
    const contract = this.paymentTarget(id);
    if (!contract || !canSeePaymentTarget(identity, contract)) throw new Error("Contract not found.");
    return contract;
  }

  private paymentFor(identity: DevIdentity, id: string): Payment {
    const payment = this.store.payments.find((item) => item.id === id);
    if (!payment) throw new Error("Payment not found.");
    const contract = this.paymentTarget(payment.contractId);
    if (!contract || !canSeePaymentTarget(identity, contract)) throw new Error("Payment not found.");
    return payment;
  }

  private event(payment: Payment, identity: DevIdentity, event: string, note: string | null = null, previousVersion?: PaymentEvent["previousVersion"]) {
    payment.history.push({ at: nowIso(), actorId: identity.id, event, note, ...(previousVersion ? { previousVersion } : {}) });
  }

  async list(options?: MockAsyncOptions): Promise<PaymentView[]> {
    return this.run(options, (identity) =>
      this.store.payments
        .filter((payment) => {
          const contract = this.paymentTarget(payment.contractId);
          return contract !== undefined && canSeePaymentTarget(identity, contract);
        })
        .map((payment) => this.view(payment)),
    );
  }

  async submit(input: SubmitPaymentInput, options?: MockAsyncOptions): Promise<PaymentView> {
    return this.run(options, (identity) => {
      this.require(identity, "payments.submit", "Submitting payments is not allowed for this identity.");
      const contract = this.contractFor(identity, input.contractId);
      const payment = preparePaymentSubmission(this.store, contract, input, identity.id);
      this.store.payments.push(payment);
      this.audit(identity, { module: "finance", action: BUSINESS_AUDIT_ACTIONS.PAYMENT_SUBMITTED, entityType: "payment", entityId: payment.id, newValue: "submitted", relatedRecordIds: [contract.id] });
      return this.view(payment);
    });
  }

  async resubmit(id: string, input: Partial<Omit<SubmitPaymentInput, "contractId">>, options?: MockAsyncOptions): Promise<PaymentView> {
    return this.run(options, (identity) => {
      this.require(identity, "payments.submit", "Submitting payments is not allowed for this identity.");
      const payment = this.paymentFor(identity, id);
      if (!canCorrectPayment(identity, payment.submittedBy)) throw new Error("Only the submitter or an administrator can correct this payment.");
      if (payment.status !== "returned") throw new Error("Only a payment returned for correction can be resubmitted.");
      const contract = this.contractFor(identity, payment.contractId);
      if ("seriesNumber" in contract && isClosedPaymentTarget(contract)) throw new Error("Payments cannot be resubmitted for this IGP sale.");
      const next = {
        purpose: input.purpose ?? payment.purpose,
        amountCentavos: input.amountCentavos ?? payment.amountCentavos,
        method: input.method ?? payment.method,
        paidDate: input.paidDate ?? payment.paidDate,
      };
      validateFields(this.store, contract, next, payment.id);
      if (input.referenceNo !== undefined && input.referenceNo?.trim() !== payment.referenceNo) {
        throw new Error("A resent receipt must keep its original reference number.");
      }
      validateReference(this.store, payment.referenceNo, payment.id);
      const { purpose, amountCentavos, method, paidDate, referenceNo, evidenceFileName } = payment;
      const nextPolicy = referencePolicyFor(next.method);
      if (nextPolicy !== referencePolicyFor(method) && referenceNo &&
        (cleanReferenceNumber(referenceNo, nextPolicy) !== referenceNo || validateReferenceNumber(referenceNo, nextPolicy))) {
        throw new Error("The original reference number does not match the format for the new payment method.");
      }
      this.event(payment, identity, BUSINESS_AUDIT_ACTIONS.PAYMENT_RESUBMITTED, null, { purpose, amountCentavos, method, paidDate, referenceNo, evidenceFileName });
      Object.assign(payment, next);
      if (input.evidenceFileName !== undefined) payment.evidenceFileName = input.evidenceFileName?.trim() || null;
      payment.status = "submitted";
      payment.decisionReason = null;
      this.audit(identity, { module: "finance", action: BUSINESS_AUDIT_ACTIONS.PAYMENT_RESUBMITTED, entityType: "payment", entityId: payment.id, previousValue: "returned", newValue: "submitted", relatedRecordIds: [contract.id] });
      return this.view(payment);
    });
  }

  async startReview(id: string, options?: MockAsyncOptions): Promise<PaymentView> {
    return this.run(options, (identity) => {
      this.require(identity, "finance.verify", "Only Finance can review payments.");
      const payment = this.paymentFor(identity, id);
      if (payment.status !== "submitted") throw new Error("Only a submitted payment can enter review.");
      payment.status = "under_review";
      this.event(payment, identity, BUSINESS_AUDIT_ACTIONS.PAYMENT_REVIEW_STARTED);
      this.audit(identity, { module: "finance", action: BUSINESS_AUDIT_ACTIONS.PAYMENT_REVIEW_STARTED, entityType: "payment", entityId: payment.id, previousValue: "submitted", newValue: "under_review", relatedRecordIds: [payment.contractId] });
      return this.view(payment);
    });
  }

  async verify(id: string, options?: PaymentVerificationOptions): Promise<PaymentView> {
    return this.run(options, (identity) => {
      this.require(identity, "finance.verify", "Only Finance can verify payments.");
      const payment = this.paymentFor(identity, id);
      if (payment.status !== "submitted" && payment.status !== "under_review") throw new Error("Only a submitted payment can be verified.");
      // Owner ruling 2026-11-12 (R6, doc 07 section 5): Finance, the Administrator or the Super Administrator may approve a receipt they entered or corrected; the history flags it.
      // A correction resubmitted by someone else keeps the original submitter, so the corrector is checked too.
      const corrected = payment.history.some((entry) => entry.event === BUSINESS_AUDIT_ACTIONS.PAYMENT_RESUBMITTED && entry.actorId === identity.id);
      const selfNote = payment.submittedBy === identity.id || corrected ? "Self-approved: the approver also submitted or corrected this receipt." : undefined;
      const contract = this.contractFor(identity, payment.contractId);
      const igpSale = "seriesNumber" in contract ? contract : undefined;
      if (contract.status === "cancelled" || (igpSale && isClosedPaymentTarget(igpSale))) throw new Error("This sale is closed. Its payment cannot be verified.");
      const sale = igpSale ? undefined : this.store.sales.find((item) => item.contractId === contract.id);
      if (igpSale ? !igpSale.approvedBy : !sale?.approval) throw new Error("The sale must be approved before its receipts can be verified.");
      if (hasReferenceConflict(this.store, payment.referenceNo, payment.id)) throw new Error("This receipt or reference number is already used by another payment. A duplicate is never verified.");
      const others = paymentsOfContract(this.store, contract.id).filter((item) => item.id !== payment.id && item.status === "verified");
      const duplicate = findDuplicatePayment(others, payment);
      if (duplicate) throw new Error("A matching verified payment already exists for this contract. A duplicate is never verified twice.");
      const exceptionReason = options?.exceptionReason?.trim();
      if (findSuggestedMatch(this.store.payments, payment) && !exceptionReason) throw new Error("Explain why the possible matching receipt is a separate payment.");
      if (exceedsContractPrice(contract, others, payment.amountCentavos)) throw new Error("Verifying this payment would exceed the contract price.");
      const previous = payment.status;
      payment.status = "verified";
      payment.verifiedBy = identity.id;
      payment.verifiedAt = nowIso();
      payment.verifiedDate = today();
      payment.countedDate = firstOpenDate(this.store.closedMonths, payment.paidDate);
      const approvalNote = [selfNote, exceptionReason].filter(Boolean).join(" ");
      this.event(payment, identity, BUSINESS_AUDIT_ACTIONS.PAYMENT_VERIFIED, approvalNote || null);
      this.audit(identity, { module: "finance", action: BUSINESS_AUDIT_ACTIONS.PAYMENT_VERIFIED, entityType: "payment", entityId: payment.id, previousValue: previous, newValue: String(payment.amountCentavos), reason: approvalNote || undefined, relatedRecordIds: [contract.id] });
      if (sale?.status === "defaulted") {
        sale.status = "pending";
        this.audit(identity, { module: "sales", action: BUSINESS_AUDIT_ACTIONS.SALE_REINSTATED, entityType: "sale", entityId: sale.id, previousValue: "defaulted", newValue: "active", relatedRecordIds: [payment.id] });
        restoreDefaultedCommission(this.store, identity, sale.id, firstOpenDate(this.store.closedMonths, today()));
      }
      if (igpSale) reconcileIgpCollections(this.store, igpSale, identity, payment, "verify");
      else reconcileContract(this.store, contract.id, identity);
      return this.view(payment);
    });
  }

  private decide(identity: DevIdentity, id: string, reason: string, status: "rejected" | "returned", action: string): PaymentView {
    this.require(identity, "finance.verify", "Only Finance can review payments.");
    if (!reason.trim()) throw new Error("A reason is required.");
    const payment = this.paymentFor(identity, id);
    if (payment.status !== "submitted" && payment.status !== "under_review") throw new Error("Only a submitted payment can be rejected or returned.");
    const previous = payment.status;
    payment.status = status;
    payment.decisionReason = reason.trim();
    this.event(payment, identity, action, reason.trim());
    this.audit(identity, { module: "finance", action, entityType: "payment", entityId: payment.id, previousValue: previous, newValue: status, reason: reason.trim(), relatedRecordIds: [payment.contractId] });
    return this.view(payment);
  }

  async reject(id: string, reason: string, options?: MockAsyncOptions): Promise<PaymentView> {
    return this.run(options, (identity) => this.decide(identity, id, reason, "rejected", BUSINESS_AUDIT_ACTIONS.PAYMENT_REJECTED));
  }

  async returnForCorrection(id: string, reason: string, options?: MockAsyncOptions): Promise<PaymentView> {
    return this.run(options, (identity) => this.decide(identity, id, reason, "returned", BUSINESS_AUDIT_ACTIONS.PAYMENT_RETURNED));
  }

  async adjust(id: string, input: { kind: "reversal" | "refund"; amountCentavos: number; reason: string }, options?: MockAsyncOptions): Promise<PaymentView> {
    return this.run(options, (identity) => {
      this.require(identity, "finance.refund", "Only Finance can reverse or refund payments.");
      if (!input.reason.trim()) throw new Error("A reason is required.");
      const payment = this.paymentFor(identity, id);
      const igpSale = findIgpPaymentTarget(this.store, payment.contractId);
      if (payment.status !== "verified") throw new Error("Only a verified payment can be reversed or refunded.");
      // The Reservation Fee is non-refundable (Reservation Agreement; owner decision OD-12). A reversal still corrects errors.
      if (!igpSale && input.kind === "refund" && payment.purpose === "reservation") throw new Error("The Reservation Fee is non-refundable. Record a reversal only to correct an error.");
      if (!Number.isInteger(input.amountCentavos) || input.amountCentavos <= 0) throw new Error("Enter an amount greater than zero.");
      if (input.amountCentavos > adjustableCentavos(payment)) throw new Error("The amount exceeds the remaining verified amount of this payment.");
      const date = firstOpenDate(this.store.closedMonths, today());
      const repeated = payment.adjustments.some(
        (item) => item.kind === input.kind && item.amountCentavos === input.amountCentavos && item.reason === input.reason.trim() && item.date === date,
      );
      if (repeated) throw new Error("This adjustment was already recorded. Repeating it would duplicate it.");
      const contract = !igpSale && payment.method === "Cheque" && input.kind === "reversal"
        ? this.store.contracts.find(({ id }) => id === payment.contractId) : undefined;
      const payments = contract ? paymentsOfContract(this.store, contract.id) : [];
      const previouslyReleased = contract && meetsPayoutRelease(contract, payments);
      payment.adjustments.push({ id: nextId(this.store, "adjustment", "adj"), kind: input.kind, amountCentavos: input.amountCentavos, date, reason: input.reason.trim(), actorId: identity.id });
      const action = input.kind === "reversal" ? BUSINESS_AUDIT_ACTIONS.PAYMENT_REVERSED : BUSINESS_AUDIT_ACTIONS.PAYMENT_REFUNDED;
      this.event(payment, identity, action, input.reason.trim());
      this.audit(identity, { module: "finance", action, entityType: "payment", entityId: payment.id, newValue: String(input.amountCentavos), reason: input.reason.trim(), relatedRecordIds: [payment.contractId] });
      if (contract && previouslyReleased && !meetsPayoutRelease(contract, payments)) {
        const sale = this.store.sales.find(({ contractId }) => contractId === contract.id);
        if (sale) applyCommissionTrigger(this.store, identity, sale.id, "returned_cheque", date, ["stage1"]);
      }
      if (igpSale) reconcileIgpCollections(this.store, igpSale, identity, payment, input.kind);
      else reconcileContract(this.store, payment.contractId, identity);
      return this.view(payment);
    });
  }
}
