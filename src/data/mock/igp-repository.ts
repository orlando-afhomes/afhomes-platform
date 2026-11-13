import type { IgpAction, IgpRepository, RecordIgpSale, ReissueIgpSale } from "@/data/contracts/igp-repository";
import { BUSINESS_AUDIT_ACTIONS } from "@/modules/audit/types";
import { commissionStageAmounts } from "@/modules/commissions/rules";
import { getCurrentAccreditationRecord, getSellerStanding } from "@/modules/accreditation/eligibility";
import { firstOpenDate } from "@/modules/finance/month-close";
import { totalVerifiedCentavos } from "@/modules/finance/rules";
import type { DevIdentity } from "@/modules/identity/types";
import { formatIgpSeriesNumber, igpChecklist, igpPriceBand, isIgpDefaultReviewDue, jadAccreditationOn } from "@/modules/igp/rules";
import type { IgpIntake, IgpSale } from "@/modules/igp/types";
import { addYearsToDate, parseManilaDateOnly } from "@/shared/lib/dates";
import { BusinessRepository, customerName, genealogyFor, nowIso, today } from "./business-base";
import { applyCommissionTrigger, freezeCommissionRates, holdUnpaidCommissionForReview } from "./commission-effects";
import { adjustIgpSalesValue, canSeeIgpSale, findIgpPaymentTarget, igpPayments, reconcileIgpCollections } from "./igp-payment-effects";
import { preparePaymentSubmission } from "./payment-repository";

function required(value: string, label: string): string {
  const result = value.trim();
  if (!result) throw new Error(`Enter ${label}.`);
  return result;
}

function businessDate(value: string, label: string): string {
  if (value !== value.trim() || !parseManilaDateOnly(value) || value > today()) throw new Error(`Enter a valid ${label} on or before today.`);
  return value;
}

export class MockIgpRepository extends BusinessRepository implements IgpRepository {
  list(options?: Parameters<IgpRepository["list"]>[0]) {
    return this.run(options, (identity) => {
      const canEnter = this.can(identity, "igp.enter");
      return {
        sales: this.store.igp.sales.filter((sale) => canSeeIgpSale(identity, sale)).map((sale) => {
          const payments = igpPayments(this.store, sale.id);
          return {
            ...structuredClone(sale), buyerName: customerName(this.store, sale.customerId),
            referrerName: this.store.members.find(({ id }) => id === sale.referrerMemberId)?.displayName ?? null,
            collectedCentavos: totalVerifiedCentavos(payments), defaultReviewDue: isIgpDefaultReviewDue(sale, payments, today()),
          };
        }).reverse(),
        buyers: canEnter ? this.store.customers.filter((customer) => customer.status === "approved" || customer.status === "active_member")
          .map(({ id, displayName }) => ({ value: id, label: displayName })) : [],
        sellers: canEnter ? this.store.members.map(({ id, displayName }) => ({ value: id, label: displayName })) : [],
        accreditations: canEnter ? structuredClone(this.store.igp.accreditations) : [],
        thresholdBp: this.store.igp.thresholdBp,
      };
    });
  }

  private log(identity: DevIdentity, sale: IgpSale, action: string, details: { reason?: string; previousValue?: string | null; newValue?: string | null; relatedRecordIds?: string[] } = {}) {
    this.audit(identity, { module: "sales", entityType: "sale", entityId: sale.id, displayReference: sale.seriesNumber, action, ...details });
  }

  private requireManagement(identity: DevIdentity) {
    this.require(identity, "igp.manage", "Only an Administrator or Super Administrator can do this.");
  }

  private accreditation(identity: DevIdentity, memberId: string, rawNumber: string, approvedDate: string) {
    this.requireManagement(identity);
    if (!this.store.members.some((member) => member.id === memberId)) throw new Error("Choose a seller.");
    businessDate(approvedDate, "JA&D approval date");
    const number = required(rawNumber, "the JA&D accreditation number").toUpperCase();
    if (/\s/.test(number)) throw new Error("The JA&D number cannot contain spaces.");
    if (this.store.igp.accreditations.some((record) => record.number === number)) throw new Error("This JA&D number is already recorded.");
    const previous = jadAccreditationOn(this.store.igp.accreditations, memberId, today());
    if (previous && previous.approvedDate >= approvedDate) throw new Error("The renewal date must be after the previous approval date.");
    this.store.igp.accreditations.push({ memberId, number, approvedDate, validUntil: addYearsToDate(approvedDate, 1)!, replaces: previous?.number ?? null });
    this.audit(identity, {
      module: "accreditation", entityType: "member", entityId: memberId, action: "JAD_ACCREDITATION_RECORDED",
      previousValue: previous?.number ?? null, newValue: number, displayReference: number,
    });
  }

  private party(memberId: string, date: string, label: "Closing seller" | "Referrer") {
    const member = this.store.members.find((entry) => entry.id === memberId);
    if (!member) throw new Error(`Choose a valid ${label.toLowerCase()}.`);
    const record = getCurrentAccreditationRecord(this.store.accreditations.filter((entry) => entry.memberId === memberId));
    const standing = record ? getSellerStanding(record, date) : null;
    if (standing?.state === "blocked" && (standing.reason === "SUSPENDED" || standing.reason === "ENDED")) {
      throw new Error(`${label} is suspended or had already left on the sale date.`);
    }
    if ((!record && member.status !== "active") || (member.status === "suspended" && !record?.suspensionEffectiveDate)) throw new Error(`${label} is unavailable.`);
    const jad = jadAccreditationOn(this.store.igp.accreditations, memberId, date);
    if (!jad) throw new Error(`${label} needs a JA&D accreditation number effective on the sale date.`);
    return { jad, reminder: jad.validUntil < date ? { party: label, validUntil: jad.validUntil } : null };
  }

  private prepare(identity: DevIdentity, input: IgpIntake, replaced?: IgpSale): IgpSale {
    businessDate(input.date, "issue date");
    igpPriceBand(input.priceCentavos);
    const month = input.date.slice(0, 7);
    const sequence = this.store.igp.sales.reduce((next, sale) => sale.date.startsWith(month) ? Math.max(next, sale.sequence + 1) : next, 1);
    const seriesNumber = formatIgpSeriesNumber({ ...input, sequence });
    if (this.store.igp.sales.some((sale) => sale.seriesNumber === seriesNumber)) throw new Error("This Series Number was already used.");
    if (input.entry !== "reservation" && input.entry !== "cts") throw new Error("Choose the reason for issuing the Series Number.");
    if (input.entry === "cts" && input.scheme !== "T") throw new Error("The Contract to Sell entry applies to Terms sales.");
    if (!replaced && !this.store.customers.some((customer) => customer.id === input.customerId && (customer.status === "approved" || customer.status === "active_member"))) {
      throw new Error("Choose an approved buyer.");
    }
    const seller = this.party(input.sellerMemberId, input.date, "Closing seller");
    const referrer = input.referrerMemberId ? this.party(input.referrerMemberId, input.date, "Referrer") : null;
    if (input.referrerMemberId === input.sellerMemberId) {
      this.requireManagement(identity);
      required(input.referralReference ?? "", "the verified referral reference for the closing seller");
    }
    const commissionRates = freezeCommissionRates(this.store, "IGP", input.sellerMemberId, input.referrerMemberId);
    commissionRates.forEach(({ rateBp }) => commissionStageAmounts(input.priceCentavos, rateBp, "IGP"));
    return {
      customerId: input.customerId, project: required(input.project, "the project"), unit: required(input.unit, "the unit or lot"),
      propertyOwner: required(input.propertyOwner, "the property owner"), priceCentavos: input.priceCentavos, scheme: input.scheme,
      termMonths: input.termMonths, clauses: input.clauses, sellerMemberId: input.sellerMemberId,
      referrerMemberId: input.referrerMemberId, referralReference: input.referralReference?.trim(),
      entry: input.entry, date: input.date, id: `igp-${seriesNumber}`, sequence, seriesNumber,
      status: "pending", createdBy: identity.id, approvedBy: null, thresholdBp: this.store.igp.thresholdBp, adjustments: [],
      sellerJadNumber: seller.jad.number, expiryReminders: [seller.reminder, referrer?.reminder ?? null].filter((reminder) => reminder !== null),
      genealogy: genealogyFor(this.store, input.sellerMemberId), commissionRates, commissionReviewReason: null,
      documents: igpChecklist(input.scheme, input.entry),
      replacesId: replaced?.id ?? null, replacedById: null, refund: null,
      closedDealDate: null, stage1Date: null, fullPaymentDate: null,
    };
  }

  private record(identity: DevIdentity, { payment, ...input }: RecordIgpSale) {
    this.require(identity, "payments.submit", "Only authorized office staff can enter a receipt.");
    if (input.entry === "reservation" && payment.paidDate !== input.date) throw new Error("Use the reservation receipt date as the issue date.");
    if (input.entry === "cts" && payment.paidDate > input.date) throw new Error("The down payment must be recorded on or before the Contract to Sell date.");
    const sale = this.prepare(identity, input);
    const receipt = preparePaymentSubmission(this.store, sale, {
      ...payment, contractId: sale.id, purpose: input.entry === "reservation" ? "reservation" : "down_payment",
    }, identity.id);
    this.store.igp.sales.push(sale);
    this.store.payments.push(receipt);
    this.log(identity, sale, "IGP_SERIES_ISSUED", { newValue: sale.seriesNumber, relatedRecordIds: [receipt.id] });
    this.audit(identity, { module: "finance", action: BUSINESS_AUDIT_ACTIONS.PAYMENT_SUBMITTED, entityType: "payment", entityId: receipt.id, newValue: "submitted", relatedRecordIds: [sale.id] });
    return sale;
  }

  private reissue(identity: DevIdentity, sale: IgpSale, input: ReissueIgpSale) {
    this.requireManagement(identity);
    const reason = required(input.reason, "the reissue reason");
    if (input.date < sale.date) throw new Error("The new issue date cannot be before the old issue date.");
    if (input.unit.trim() === sale.unit && input.project.trim() === sale.project && input.propertyOwner.trim() === sale.propertyOwner
      && igpPriceBand(input.priceCentavos) === igpPriceBand(sale.priceCentavos) && input.scheme === sale.scheme
      && input.termMonths === sale.termMonths && input.clauses === sale.clauses) throw new Error("Use a correction for a price change within the same band.");
    const next = this.prepare(identity, { ...sale, ...input, entry: sale.entry === "cts" && input.scheme === "C" ? "reservation" : sale.entry }, sale);
    if (this.store.commissions.some((item) => item.saleId === sale.id && (item.status === "paid" || item.payout))) {
      next.commissionReviewReason = "A prior commission was paid or its payout was recorded. Reconcile it before paying the reissued sale.";
    } else {
      next.commissionReviewReason = sale.commissionReviewReason;
    }
    const payments = igpPayments(this.store, sale.id);
    sale.status = "replaced";
    sale.replacedById = next.id;
    adjustIgpSalesValue(this.store, sale, identity, "IGP Series Number replaced.");
    this.store.igp.sales.push(next);
    for (const payment of payments) {
      payment.contractId = next.id;
      payment.saleId = next.id;
      payment.history.push({ at: nowIso(), actorId: identity.id, event: "IGP_PAYMENT_MOVED", note: `${sale.seriesNumber} → ${next.seriesNumber}` });
    }
    holdUnpaidCommissionForReview(this.store, identity, sale.id, "IGP Series Number replaced. Use the replacement sale.");
    this.log(identity, sale, "IGP_SERIES_REPLACED", { previousValue: sale.seriesNumber, newValue: next.seriesNumber, reason, relatedRecordIds: [next.id, ...payments.map(({ id }) => id)] });
    this.log(identity, next, "IGP_SERIES_ISSUED", { previousValue: sale.seriesNumber, newValue: next.seriesNumber, reason, relatedRecordIds: [sale.id] });
    return next;
  }

  act(action: IgpAction, options?: Parameters<IgpRepository["act"]>[1]) {
    return this.run(options, (identity) => {
      this.require(identity, "igp.enter", "This account can view IGP sales only.");
      if (action.type === "record") return structuredClone(this.record(identity, action.input));
      if (action.type === "accredit") {
        this.accreditation(identity, action.memberId, action.number, action.approvedDate);
        return null;
      }
      if (action.type === "threshold") {
        this.requireManagement(identity);
        const { basisPoints } = action;
        const reason = required(action.reason, "the reason");
        if (!Number.isInteger(basisPoints) || basisPoints <= 0 || basisPoints > 10_000) throw new Error("Enter a percentage greater than zero and at most 100.");
        const previousValue = String(this.store.igp.thresholdBp);
        this.store.igp.thresholdBp = basisPoints;
        this.audit(identity, { module: "sales", entityType: "sale", entityId: "igp-threshold", action: "IGP_THRESHOLD_CHANGED", previousValue, newValue: String(basisPoints), reason });
        return null;
      }
      const sale = findIgpPaymentTarget(this.store, action.id);
      if (!sale || !canSeeIgpSale(identity, sale)) throw new Error("IGP sale not found.");
      if (sale.status === "cancelled" || sale.status === "replaced" || sale.status === "pending_review") throw new Error("This Series Number is closed.");
      const payments = igpPayments(this.store, sale.id);
      if (action.type === "reissue") return structuredClone(this.reissue(identity, sale, action.input));
      if (action.type === "approve") {
        this.requireManagement(identity);
        if (sale.status !== "pending") throw new Error("Only a pending IGP sale can be approved.");
        sale.status = "approved";
        sale.approvedBy = identity.id;
        this.log(identity, sale, "IGP_SALE_APPROVED", { previousValue: "pending", newValue: "approved", reason: sale.createdBy === identity.id ? "Self-approved." : undefined });
        reconcileIgpCollections(this.store, sale, identity);
      } else if (action.type === "default") {
        this.requireManagement(identity);
        if (!isIgpDefaultReviewDue(sale, payments, today())) throw new Error("This sale is not due for default review.");
        const reason = required(action.reason, "the reason");
        sale.status = "defaulted";
        adjustIgpSalesValue(this.store, sale, identity, "IGP sale defaulted.");
        applyCommissionTrigger(this.store, identity, sale.id, "default", firstOpenDate(this.store.closedMonths, today()));
        this.log(identity, sale, "IGP_SALE_DEFAULTED", { previousValue: "approved", newValue: "defaulted", reason });
      } else if (action.type === "cancel") {
        this.requireManagement(identity);
        const reason = required(action.reason, "the reason");
        if (!Number.isSafeInteger(action.refundCentavos) || action.refundCentavos < 0) throw new Error("Enter a valid refund amount.");
        const date = action.refundDate ? businessDate(action.refundDate, "refund date") : null;
        if (action.refundCentavos > 0 && !date) throw new Error("Enter the refund date.");
        const previousValue = sale.status;
        sale.status = "cancelled";
        adjustIgpSalesValue(this.store, sale, identity, "IGP sale cancelled.");
        sale.refund = { amountCentavos: action.refundCentavos, date, reason };
        applyCommissionTrigger(this.store, identity, sale.id, "cancellation", firstOpenDate(this.store.closedMonths, today()));
        this.log(identity, sale, "IGP_SALE_CANCELLED", { previousValue, newValue: "cancelled", reason });
        if (action.refundCentavos > 0) this.log(identity, sale, "IGP_REFUND_RECORDED", { newValue: `${action.refundCentavos} centavos on ${date}`, reason });
      } else if (action.type === "correct") {
        const reason = required(action.input.reason, "the correction reason");
        if (payments.some((item) => item.status === "verified")) this.requireManagement(identity);
        if (sale.stage1Date || this.store.commissions.some((item) => item.saleId === sale.id)) throw new Error("A sale cannot be corrected after commission release.");
        if (igpPriceBand(action.input.priceCentavos) !== igpPriceBand(sale.priceCentavos)) throw new Error("A different price band requires reissue.");
        if (action.input.priceCentavos < totalVerifiedCentavos(payments)) throw new Error("The corrected price is below approved collections.");
        const referrerId = action.input.referrerMemberId;
        if (referrerId === sale.sellerMemberId) {
          this.requireManagement(identity);
          required(action.input.referralReference ?? "", "the verified referral reference for the closing seller");
        }
        const referrer = referrerId && referrerId !== sale.referrerMemberId ? this.party(referrerId, sale.date, "Referrer") : null;
        const rates = sale.commissionRates.filter((rate) => rate.role === "DSC" || rate.memberId === referrerId);
        if (referrer) {
          const rate = this.store.commissionRateSettings.find((item) => item.memberId === referrerId && item.product === "IGP" && item.role === "DRI");
          if (!rate) throw new Error("Record the approved DRI rate before correcting the referrer.");
          rates.push({ memberId: rate.memberId, role: "DRI", rateBp: rate.rateBp });
        }
        rates.forEach(({ rateBp }) => commissionStageAmounts(action.input.priceCentavos, rateBp, "IGP"));
        const previousValue = `${sale.priceCentavos} / ${sale.referrerMemberId ?? "None"}`;
        if (referrerId !== sale.referrerMemberId) {
          sale.expiryReminders = sale.expiryReminders.filter(({ party }) => party !== "Referrer");
          if (referrer?.reminder) sale.expiryReminders.push(referrer.reminder);
        }
        sale.priceCentavos = action.input.priceCentavos;
        sale.referrerMemberId = referrerId;
        sale.referralReference = action.input.referralReference?.trim();
        sale.commissionRates = rates;
        this.log(identity, sale, "IGP_SALE_CORRECTED", { previousValue, newValue: `${sale.priceCentavos} / ${referrerId ?? "None"}`, reason });
        reconcileIgpCollections(this.store, sale, identity);
      } else {
        const document = sale.documents.find((item) => item.key === action.key);
        if (!document) throw new Error("This document does not apply to the sale.");
        const signedDate = businessDate(action.signedDate, "signature date");
        const signers = required(action.signers, "the signers");
        if (document.key === "deed" || document.key === "formal_grant" || document.key === "lease" || document.key === "spa") {
          if (!sale.fullPaymentDate) throw new Error("Record full approved payment before completing this document.");
        }
        if (document.key === "cts" || document.key === "goodwill_grant") {
          if (sale.entry !== "cts" && !payments.some((payment) => payment.status === "verified" && payment.purpose !== "reservation")) {
            throw new Error("Record an approved installment before completing this document.");
          }
        }
        const previousValue = document.signedDate;
        Object.assign(document, { status: "signed", signedDate, signers });
        this.log(identity, sale, "IGP_DOCUMENT_RECORDED", { previousValue, newValue: signedDate, reason: action.key });
      }
      return structuredClone(sale);
    });
  }
}
