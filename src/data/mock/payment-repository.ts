import type { MockAsyncOptions } from "@/data/contracts/async-options";
import type { PaymentRepository, PaymentView, SubmitPaymentInput } from "@/data/contracts/payment-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import type { Contract } from "@/modules/contracts/types";
import { adjustableCentavos, findDuplicatePayment, totalVerifiedCentavos } from "@/modules/finance/rules";
import { PAYMENT_METHODS, PAYMENT_PURPOSES, type Payment } from "@/modules/finance/types";
import type { DevIdentity } from "@/modules/identity/types";
import { DEV_IDENTITIES } from "./dev-identities";
import { BusinessRepository, canSeeContract, customerName, nowIso, today } from "./business-base";
import { paymentsOfContract, reconcileContract } from "./business-effects";
import { nextId } from "./ids";
import type { MockStore } from "./seed";
import { activeIdentityRoles } from "./scope";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const BROAD = new Set(["super_admin", "admin"]);

export class MockPaymentRepository extends BusinessRepository implements PaymentRepository {
  constructor(store: MockStore, getIdentity: () => DevIdentity, asyncOptions: MockAsyncOptions = {}) {
    super(store, getIdentity, asyncOptions);
  }

  private view(payment: Payment): PaymentView {
    const contract = this.store.contracts.find((item) => item.id === payment.contractId);
    const submitter = DEV_IDENTITIES.find((item) => item.id === payment.submittedBy);
    return JSON.parse(
      JSON.stringify({
        ...payment,
        customerName: customerName(this.store, payment.customerId),
        contractLabel: contract ? `${contract.productCode} · ${contract.schemeLabel}` : "Unknown contract",
        submitterName: submitter?.displayName ?? payment.submittedBy,
      }),
    ) as PaymentView;
  }

  private contractFor(identity: DevIdentity, id: string): Contract {
    const contract = this.store.contracts.find((item) => item.id === id);
    if (!contract || !canSeeContract(identity, contract)) throw new Error("Contract not found.");
    return contract;
  }

  private paymentFor(identity: DevIdentity, id: string): Payment {
    const payment = this.store.payments.find((item) => item.id === id);
    if (!payment) throw new Error("Payment not found.");
    const contract = this.store.contracts.find((item) => item.id === payment.contractId);
    if (!contract || !canSeeContract(identity, contract)) throw new Error("Payment not found.");
    return payment;
  }

  private event(payment: Payment, identity: DevIdentity, event: string, note: string | null = null) {
    payment.history.push({ at: nowIso(), actorId: identity.id, event, note });
  }

  private validateFields(contract: Contract, input: { purpose: Payment["purpose"]; amountCentavos: number; method: Payment["method"]; paidDate: string }, selfId?: string) {
    if (!(PAYMENT_PURPOSES as readonly string[]).includes(input.purpose)) throw new Error("Select a valid payment purpose.");
    if (!(PAYMENT_METHODS as readonly string[]).includes(input.method)) throw new Error("Select a valid payment method.");
    if (!Number.isInteger(input.amountCentavos) || input.amountCentavos <= 0) throw new Error("Enter an amount greater than zero.");
    if (!DATE_ONLY.test(input.paidDate)) throw new Error("Enter the date on the receipt.");
    if (input.paidDate > today()) throw new Error("The payment date cannot be in the future.");
    const verified = totalVerifiedCentavos(paymentsOfContract(this.store, contract.id).filter((item) => item.id !== selfId));
    // Overpayment and credit handling are an open decision (D17): amounts above the balance are rejected.
    if (verified + input.amountCentavos > contract.priceCentavos) throw new Error("This amount exceeds the outstanding balance of the contract.");
  }

  async list(options?: MockAsyncOptions): Promise<PaymentView[]> {
    return this.run(options, (identity) =>
      this.store.payments
        .filter((payment) => {
          const contract = this.store.contracts.find((item) => item.id === payment.contractId);
          return Boolean(contract) && canSeeContract(identity, contract!);
        })
        .map((payment) => this.view(payment)),
    );
  }

  async submit(input: SubmitPaymentInput, options?: MockAsyncOptions): Promise<PaymentView> {
    return this.run(options, (identity) => {
      this.require(identity, "payments.submit", "Submitting payments is not allowed for this identity.");
      const contract = this.contractFor(identity, input.contractId);
      if (contract.status === "cancelled" || contract.status === "returned") throw new Error("Payments cannot be submitted for this contract.");
      this.validateFields(contract, input);
      const duplicate = findDuplicatePayment(this.store.payments, { ...input, referenceNo: input.referenceNo ?? null });
      if (duplicate) throw new Error(`A matching payment (${duplicate.id}) was already submitted. Duplicates are not accepted.`);
      const sale = this.store.sales.find((item) => item.contractId === contract.id);
      const payment: Payment = {
        id: nextId(this.store, "payment", "pay"),
        contractId: contract.id,
        customerId: contract.customerId,
        saleId: sale?.id ?? null,
        purpose: input.purpose,
        amountCentavos: input.amountCentavos,
        method: input.method,
        paidDate: input.paidDate,
        referenceNo: input.referenceNo?.trim() || null,
        evidenceFileName: input.evidenceFileName?.trim() || null,
        submittedBy: identity.id,
        submittedAt: nowIso(),
        status: "submitted",
        verifiedBy: null,
        verifiedAt: null,
        verifiedDate: null,
        decisionReason: null,
        adjustments: [],
        history: [],
      };
      this.event(payment, identity, BUSINESS_AUDIT_ACTIONS.PAYMENT_SUBMITTED);
      this.store.payments.push(payment);
      this.audit(identity, { module: "finance", action: BUSINESS_AUDIT_ACTIONS.PAYMENT_SUBMITTED, entityType: "payment", entityId: payment.id, newValue: "submitted", relatedRecordIds: [contract.id] });
      return this.view(payment);
    });
  }

  async resubmit(id: string, input: Partial<Omit<SubmitPaymentInput, "contractId">>, options?: MockAsyncOptions): Promise<PaymentView> {
    return this.run(options, (identity) => {
      this.require(identity, "payments.submit", "Submitting payments is not allowed for this identity.");
      const payment = this.paymentFor(identity, id);
      const broad = activeIdentityRoles(identity).some((role) => BROAD.has(role));
      if (!broad && payment.submittedBy !== identity.id) throw new Error("Only the submitter can correct this payment.");
      if (payment.status !== "returned") throw new Error("Only a payment returned for correction can be resubmitted.");
      const contract = this.contractFor(identity, payment.contractId);
      const next = {
        purpose: input.purpose ?? payment.purpose,
        amountCentavos: input.amountCentavos ?? payment.amountCentavos,
        method: input.method ?? payment.method,
        paidDate: input.paidDate ?? payment.paidDate,
      };
      this.validateFields(contract, next, payment.id);
      // The original submission is preserved in history (07 section 9.2).
      this.event(payment, identity, BUSINESS_AUDIT_ACTIONS.PAYMENT_RESUBMITTED, `Original: ${payment.amountCentavos} centavos on ${payment.paidDate}`);
      Object.assign(payment, next);
      if (input.referenceNo !== undefined) payment.referenceNo = input.referenceNo?.trim() || null;
      if (input.evidenceFileName !== undefined) payment.evidenceFileName = input.evidenceFileName?.trim() || null;
      payment.status = "submitted";
      payment.decisionReason = null;
      this.audit(identity, { module: "finance", action: BUSINESS_AUDIT_ACTIONS.PAYMENT_RESUBMITTED, entityType: "payment", entityId: payment.id, previousValue: "returned", newValue: "submitted" });
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
      this.audit(identity, { module: "finance", action: BUSINESS_AUDIT_ACTIONS.PAYMENT_REVIEW_STARTED, entityType: "payment", entityId: payment.id, previousValue: "submitted", newValue: "under_review" });
      return this.view(payment);
    });
  }

  async verify(id: string, options?: MockAsyncOptions): Promise<PaymentView> {
    return this.run(options, (identity) => {
      this.require(identity, "finance.verify", "Only Finance can verify payments.");
      const payment = this.paymentFor(identity, id);
      if (payment.status !== "submitted" && payment.status !== "under_review") throw new Error("Only a submitted payment can be verified.");
      // A correction resubmitted by someone else keeps the original submitter, so the corrector is checked too (07 section 5.2).
      const corrected = payment.history.some((entry) => entry.event === BUSINESS_AUDIT_ACTIONS.PAYMENT_RESUBMITTED && entry.actorId === identity.id);
      if (payment.submittedBy === identity.id || corrected) throw new Error("A payment cannot be verified by the person who submitted or corrected it.");
      const contract = this.contractFor(identity, payment.contractId);
      if (contract.status === "cancelled") throw new Error("This contract is cancelled. Its payment can be rejected or returned, not verified.");
      const others = paymentsOfContract(this.store, contract.id).filter((item) => item.id !== payment.id && item.status === "verified");
      const duplicate = findDuplicatePayment(others, payment);
      if (duplicate) throw new Error(`A matching verified payment (${duplicate.id}) already exists. A duplicate is never verified twice.`);
      if (totalVerifiedCentavos(others) + payment.amountCentavos > contract.priceCentavos) throw new Error("Verifying this payment would exceed the contract price.");
      const previous = payment.status;
      payment.status = "verified";
      payment.verifiedBy = identity.id;
      payment.verifiedAt = nowIso();
      payment.verifiedDate = today();
      this.event(payment, identity, BUSINESS_AUDIT_ACTIONS.PAYMENT_VERIFIED);
      this.audit(identity, { module: "finance", action: BUSINESS_AUDIT_ACTIONS.PAYMENT_VERIFIED, entityType: "payment", entityId: payment.id, previousValue: previous, newValue: "verified", relatedRecordIds: [contract.id] });
      reconcileContract(this.store, contract.id, identity);
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
    this.audit(identity, { module: "finance", action, entityType: "payment", entityId: payment.id, previousValue: previous, newValue: status, reason: reason.trim() });
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
      if (payment.status !== "verified") throw new Error("Only a verified payment can be reversed or refunded.");
      // The Reservation Fee is non-refundable (Reservation Agreement; owner decision OD-12). A reversal still corrects errors.
      if (input.kind === "refund" && payment.purpose === "reservation") throw new Error("The Reservation Fee is non-refundable. Record a reversal only to correct an error.");
      if (!Number.isInteger(input.amountCentavos) || input.amountCentavos <= 0) throw new Error("Enter an amount greater than zero.");
      if (input.amountCentavos > adjustableCentavos(payment)) throw new Error("The amount exceeds the remaining verified amount of this payment.");
      const date = today();
      const repeated = payment.adjustments.some(
        (item) => item.kind === input.kind && item.amountCentavos === input.amountCentavos && item.reason === input.reason.trim() && item.date === date,
      );
      if (repeated) throw new Error("This adjustment was already recorded. Repeating it would duplicate it.");
      payment.adjustments.push({ id: nextId(this.store, "adjustment", "adj"), kind: input.kind, amountCentavos: input.amountCentavos, date, reason: input.reason.trim(), actorId: identity.id });
      const action = input.kind === "reversal" ? BUSINESS_AUDIT_ACTIONS.PAYMENT_REVERSED : BUSINESS_AUDIT_ACTIONS.PAYMENT_REFUNDED;
      this.event(payment, identity, action, input.reason.trim());
      this.audit(identity, { module: "finance", action, entityType: "payment", entityId: payment.id, newValue: String(input.amountCentavos), reason: input.reason.trim(), relatedRecordIds: [payment.contractId] });
      reconcileContract(this.store, payment.contractId, identity);
      return this.view(payment);
    });
  }
}
