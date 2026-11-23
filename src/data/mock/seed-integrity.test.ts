import { describe, expect, it } from "vitest";
import { collectionState } from "@/modules/finance/application/collection-state";
import { buildCollectionLedger, outstandingBalanceCentavos, totalVerifiedCentavos } from "@/modules/finance/rules";
import { parseCustomerId } from "@/modules/customers/customer-number";
import { validateCustomerForSubmit } from "@/modules/customers/rules";
import { dialingPrefixFor } from "@/shared/data/philippine-locations";
import { validateEmailAddress, validateLandline, validateMobileNumber } from "@/shared/forms/validation/contact";
import { validateGovIdNumber, validateTinNumber } from "@/shared/forms/validation/identification";
import { igpSeriesNumberProblem } from "@/modules/igp/rules";
import { buildVipNumber } from "@/modules/membership/rules";
import { computePointsLedger } from "@/modules/stay-points/engine";
import { pointsMovement } from "./redemption-points-source";
import { manilaToday } from "@/shared/lib/dates";
import { createMockStore, createSeedStore, type MockStore } from "./seed";

const PLACEHOLDER = /\b(sample|test user|customer [a-z]( one| two)?|lorem|ipsum|dummy|placeholder|tbd|foo|john doe)\b/i;
const FAKE_HOSTS = /randomuser\.me|example\.com|\.local\b|@afhomes\.test\b/i;
/** Fields that hold rule text from the signed contracts or internal flags, not sample content. */
const SKIPPED_KEYS = new Set(["priceNote", "source", "sample", "note", "reason"]);

function strings(value: unknown, path = "", out: Array<[string, string]> = []): Array<[string, string]> {
  if (typeof value === "string") out.push([path, value]);
  else if (Array.isArray(value)) value.forEach((item, index) => strings(item, `${path}[${index}]`, out));
  else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) if (!SKIPPED_KEYS.has(key)) strings(item, path ? `${path}.${key}` : key, out);
  }
  return out;
}

function checkIntegrity(store: MockStore, today: string) {
  const ids = (items: ReadonlyArray<{ id: string }>) => new Set(items.map((item) => item.id));
  const contractIds = new Set([...store.contracts.map((item) => item.id), ...store.igp.sales.map((item) => item.id)]);
  for (const contract of store.contracts) {
    const own = store.payments.filter((payment) => payment.contractId === contract.id);
    const ledger = buildCollectionLedger(contract, own);
    expect(ledger.at(-1)?.netCentavos ?? 0).toBe(totalVerifiedCentavos(own));
    expect(ledger.at(-1)?.balanceCentavos ?? contract.priceCentavos).toBe(outstandingBalanceCentavos(contract, own));
    expect(contract.schedule.reduce((sum, line) => sum + line.amountCentavos, 0)).toBe(contract.priceCentavos);
    expect(totalVerifiedCentavos(own)).toBeLessThanOrEqual(contract.priceCentavos);
    const sale = store.sales.find((item) => item.contractId === contract.id);
    if (sale) expect(sale.valueCentavos).toBe(contract.priceCentavos);
    for (const payment of own) expect(payment.saleId).toBe(sale?.id ?? null);
  }
  for (const collection of [store.members as Array<{ id: string }>, store.customers, store.contracts, store.sales, store.payments, store.memberships, store.resortSpends, store.commissions, store.auditEvents]) {
    expect(ids(collection).size).toBe(collection.length);
  }
  const members = ids(store.members);
  const customers = ids(store.customers);
  for (const member of store.members) if (member.parentId) expect(members.has(member.parentId)).toBe(true);
  for (const customer of store.customers) {
    if (customer.ownerMemberId) expect(members.has(customer.ownerMemberId)).toBe(true);
    if (customer.recommenderMemberId) expect(members.has(customer.recommenderMemberId)).toBe(true);
  }
  for (const contract of store.contracts) {
    expect(customers.has(contract.customerId)).toBe(true);
    for (const entry of contract.genealogy) expect(members.has(entry.memberId)).toBe(true);
  }
  for (const payment of store.payments) expect(contractIds.has(payment.contractId)).toBe(true);
  for (const membership of store.memberships) expect(store.contracts.some((item) => item.id === membership.contractId)).toBe(true);
  for (const spend of store.resortSpends) expect(ids(store.memberships).has(spend.membershipId)).toBe(true);
  for (const commission of store.commissions) {
    expect(store.sales.some((item) => item.id === commission.saleId) || store.igp.sales.some((item) => item.id === commission.saleId)).toBe(true);
    expect(members.has(commission.recipientMemberId)).toBe(true);
  }
  // Sales count at 25% approved collection on a finalized contract (docs 07 and 13).
  for (const sale of store.sales) {
    const contract = store.contracts.find((item) => item.id === sale.contractId)!;
    const payments = store.payments.filter((item) => item.contractId === contract.id);
    const counts = Boolean(sale.approval) && contract.status === "finalized" && Boolean(collectionState(contract, payments, sale).confirmation);
    if (sale.status !== "cancelled") expect(sale.status === "confirmed").toBe(counts);
    expect(sale.adjustments.reduce((sum, item) => sum + item.amountCentavos, 0)).toBe(sale.status === "confirmed" ? sale.valueCentavos : 0);
  }
  // One VIP Number for the RA and the card (doc 06), in the issued format.
  for (const membership of store.memberships.filter((item) => item.cardId)) {
    const contract = store.contracts.find((item) => item.id === membership.contractId)!;
    expect(membership.cardId).toBe(contract.vipNumber);
    expect(contract.raNumber).toBe(membership.raNumber);
    const issued = contract.signedAgreementRecordedDate!;
    expect(membership.cardId).toBe(buildVipNumber(issued, Number(membership.cardId!.slice(6, 11)), contract.productCode, contract.paymentCode, contract.classification));
  }
  for (const sale of store.igp.sales) expect(igpSeriesNumberProblem(sale.seriesNumber)).toBeNull();
  for (const customer of store.customers) if (customer.customerNumber) expect(parseCustomerId(customer.customerNumber)).not.toBeNull();
  // Counters start above every seeded id.
  const highest = (items: Array<{ id: string }>, prefix: string) => Math.max(0, ...items.map((item) => Number(item.id.slice(prefix.length + 1)) || 0));
  expect(store.counters.contract).toBeGreaterThan(highest(store.contracts, "ctr"));
  expect(store.counters.sale).toBeGreaterThan(highest(store.sales, "sale"));
  expect(store.counters.payment).toBeGreaterThan(highest(store.payments, "pay"));
  expect(store.counters.membership).toBeGreaterThan(highest(store.memberships, "memb"));
  expect(store.counters.commission).toBeGreaterThan(highest(store.commissions, "comm"));
  expect(store.auditSequence).toBe(store.auditEvents.length + 1);
  // Booked points never exceed the released Welcome Gift points.
  for (const booking of store.redemption.bookings.filter((item) => !item.provisional)) {
    const membership = store.memberships.find((item) => item.id === booking.membershipId)!;
    const contract = store.contracts.find((item) => item.id === membership.contractId)!;
    const ledger = computePointsLedger({
      membershipId: membership.id, vipNumber: membership.cardId!, fullSettlementDate: membership.fullSettlementDate!, claimDate: membership.cardClaimDate!,
      validityEndDate: membership.validityEndDate!, financialHold: membership.financialHold, mayRelease: true, benefits: contract.benefits,
    }, store.resortSpends.filter((item) => item.membershipId === membership.id), structuredClone(store.stayPoints), today,
    store.redemption.pads[membership.id]?.date, pointsMovement(store, membership.id));
    expect(ledger.balances.spendableWeekday).toBeGreaterThanOrEqual(0);
    expect(ledger.balances.released).toBeGreaterThan(0);
  }
}

describe("centralized seed integrity", () => {
  const today = manilaToday();
  const store = createSeedStore(today);

  it("keeps money, relationships, numbers and counters consistent", () => {
    checkIntegrity(store, today);
  });

  it("holds no placeholder names, fake hosts or stock photos", () => {
    const content = { ...store, referenceEntries: [], products: [], paymentSchemes: [] };
    const offenders = strings(content).filter(([, value]) => PLACEHOLDER.test(value) || FAKE_HOSTS.test(value));
    expect(offenders).toEqual([]);
  });

  it("passes the app's own field validation for every submitted customer and seller", () => {
    for (const customer of store.customers.filter((item) => item.status !== "draft" && item.status !== "sent_back")) {
      expect({ id: customer.id, errors: validateCustomerForSubmit(customer, store.customers, customer.id) }).toEqual({ id: customer.id, errors: {} });
    }
    for (const member of store.members) {
      const profile = member.sellerProfile!;
      const areaCode = dialingPrefixFor(profile.address.province, profile.address.city).areaCode;
      const problems = [
        validateMobileNumber(profile.mobileNumber), validateEmailAddress(profile.email), validateGovIdNumber(profile.governmentIdNumber, profile.governmentIdType),
        profile.tin ? validateTinNumber(profile.tin) : null, profile.telephone ? validateLandline(profile.telephone, areaCode) : null,
      ].filter(Boolean);
      expect({ id: member.id, problems }).toEqual({ id: member.id, problems: [] });
    }
  });

  it("keeps staff and account identities distinct unless linked", () => {
    for (const staff of store.staff) {
      const owner = store.accounts.find((account) => account.email.toLowerCase() === staff.email.toLowerCase());
      if (owner) expect({ staff: staff.id, account: owner.id }).toEqual({ staff: staff.id, account: staff.accountId });
    }
    const names = [...store.staff.map((item) => item.displayName), ...store.accounts.filter((account) => !store.staff.some((item) => item.accountId === account.id)).map((item) => item.displayName)];
    expect(new Set(names).size).toBe(names.length);
  });

  it("has unique customer names, mobiles and emails", () => {
    for (const key of ["displayName", "mobileNumber", "email"] as const) {
      const values = store.customers.map((item) => item[key]).filter(Boolean);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("fills every list that a page shows", () => {
    const counts = {
      registrationApplications: store.registrationApplications.length, seatVacancies: store.seatVacancies.length,
      closedMonths: store.closedMonths.length, unmatchedReceipts: store.unmatchedReceipts.length,
      commissionRateSettings: store.commissionRateSettings.length, vipPositionRates: store.vipPositionRates.length,
      commissionClawbacks: store.commissionClawbacks.length, commissionPayoutLists: store.commissionPayoutLists.length,
      allowanceReviews: store.allowanceReviews.length, promoPoints: store.promoPoints.length, publishedPromos: store.promos.filter((item) => item.published).length,
      receiptImportBatches: store.receiptImportBatches.length, reconciliationEntries: store.reconciliationEntries.length,
      monthSwitchSignOffs: store.monthSwitchSignOffs.length, igpSales: store.igp.sales.length, igpAccreditations: store.igp.accreditations.length,
      igpBuyerMemberships: store.igp.buyerMemberships.length, igpHistoryBatches: store.igp.historyBatches.length,
      waivers: store.stayPoints.waivers.length, refunds: store.stayPoints.refunds.length,
      bookings: store.redemption.bookings.length, redemptionLedger: store.redemption.ledger.length,
      cardholders: store.memberships.filter((item) => item.cardId).length, memberQr: Object.keys(store.memberQr).length,
    };
    for (const [name, count] of Object.entries(counts)) expect(count, name).toBeGreaterThan(0);
    expect(store.customers.length).toBeGreaterThanOrEqual(40);
    expect(store.contracts.length).toBeGreaterThanOrEqual(25);
  });

  it("gives every active seller contracts, and every team commissions and cardholders", () => {
    for (const member of store.members.filter((item) => item.status === "active")) {
      const team = store.contracts.filter((contract) => contract.genealogy.some((entry) => entry.memberId === member.id));
      expect(team.length, member.id).toBeGreaterThan(0);
    }
    for (const top of store.members.filter((item) => item.parentId === null)) {
      const teamSales = new Set(store.sales.filter((sale) => sale.team.some((entry) => entry.memberId === top.id)).map((sale) => sale.id));
      expect(store.commissions.some((item) => teamSales.has(item.saleId)), top.id).toBe(true);
      const teamContracts = new Set(store.contracts.filter((contract) => contract.genealogy.some((entry) => entry.memberId === top.id)).map((contract) => contract.id));
      expect(store.memberships.some((item) => item.cardId && teamContracts.has(item.contractId)), top.id).toBe(true);
    }
  });

  it("stays complete and current on any build date", () => {
    for (const today of ["2027-02-28", "2027-07-31"]) {
      const dated = createSeedStore(today);
      checkIntegrity(dated, today);
      const from = dated.payments.filter((item) => item.status === "verified" && item.verifiedDate! > `${today.slice(0, 7)}-00`);
      expect(from.length, `current month on ${today}`).toBeGreaterThan(0);
      const recent = new Date(Date.parse(`${today}T00:00:00Z`) - 28 * 86_400_000).toISOString().slice(0, 10);
      expect(dated.sales.some((item) => item.confirmedDate && item.confirmedDate >= recent), `28 days on ${today}`).toBe(true);
      for (const item of [...dated.payments.map((payment) => payment.paidDate), ...dated.contracts.map((contract) => contract.createdAt)]) expect(item <= today).toBe(true);
    }
  });

  it("returns isolated clones so a refresh-equivalent store is always pristine", () => {
    const first = createMockStore();
    first.contracts[0].status = "cancelled";
    first.customers[0].displayName = "Changed";
    const counter = first.counters.contract;
    first.counters.contract = 999;
    const second = createMockStore();
    expect(second.contracts[0].status).toBe("finalized");
    expect(second.customers[0].displayName).not.toBe("Changed");
    expect(second.counters.contract).toBe(counter);
  });
});
