import { describe, expect, it } from "vitest";
import { buildCardId } from "@/modules/membership/rules";
import { buildCollectionLedger, meetsRequiredInitial, outstandingBalanceCentavos, totalVerifiedCentavos } from "@/modules/finance/rules";
import { createMockStore, createSeedStore } from "./seed";

describe("centralized seed integrity", () => {
  const store = createSeedStore();
  const ids = (items: ReadonlyArray<{ id: string }>) => new Set(items.map((item) => item.id));

  it("keeps ledger, balance, sale value and schedule totals in step for every contract", () => {
    for (const contract of store.contracts) {
      const own = store.payments.filter((payment) => payment.contractId === contract.id);
      const ledger = buildCollectionLedger(contract, own);
      expect(ledger.at(-1)?.netCentavos ?? 0).toBe(totalVerifiedCentavos(own));
      expect(ledger.at(-1)?.balanceCentavos ?? contract.priceCentavos).toBe(outstandingBalanceCentavos(contract, own));
      expect(contract.schedule.reduce((sum, line) => sum + line.amountCentavos, 0)).toBe(contract.priceCentavos);
      const sale = store.sales.find((item) => item.contractId === contract.id);
      if (sale) expect(sale.valueCentavos).toBe(contract.priceCentavos);
      for (const payment of own) expect(payment.saleId).toBe(sale?.id ?? null);
    }
  });

  it("has unique ids in every collection", () => {
    for (const collection of [store.members as Array<{ id: string }>, store.customers, store.contracts, store.sales, store.payments, store.memberships, store.resortSpends, store.paymentSchemes]) {
      expect(ids(collection).size).toBe(collection.length);
    }
    expect(new Set(store.products.map((item) => item.code)).size).toBe(store.products.length);
  });

  it("resolves every relationship", () => {
    const members = ids(store.members);
    const customers = ids(store.customers);
    const contracts = ids(store.contracts);
    const schemes = ids(store.paymentSchemes);
    for (const member of store.members) if (member.parentId) expect(members.has(member.parentId)).toBe(true);
    for (const customer of store.customers) {
      if (customer.ownerMemberId) expect(members.has(customer.ownerMemberId)).toBe(true);
      if (customer.recommenderMemberId) expect(members.has(customer.recommenderMemberId)).toBe(true);
      if (customer.paymentSchemeId) expect(schemes.has(customer.paymentSchemeId)).toBe(true);
    }
    for (const contract of store.contracts) {
      expect(customers.has(contract.customerId)).toBe(true);
      expect(schemes.has(contract.schemeId)).toBe(true);
      expect(store.products.some((item) => item.code === contract.productCode)).toBe(true);
      for (const entry of contract.genealogy) expect(members.has(entry.memberId)).toBe(true);
      // The schedule always adds up to the contract price.
      expect(contract.schedule.reduce((sum, line) => sum + line.amountCentavos, 0)).toBe(contract.priceCentavos);
    }
    for (const sale of store.sales) {
      expect(contracts.has(sale.contractId)).toBe(true);
      expect(sale.valueCentavos).toBe(store.contracts.find((item) => item.id === sale.contractId)!.priceCentavos);
    }
    for (const payment of store.payments) expect(contracts.has(payment.contractId)).toBe(true);
    for (const membership of store.memberships) expect(contracts.has(membership.contractId)).toBe(true);
    for (const spend of store.resortSpends) expect(ids(store.memberships).has(spend.membershipId)).toBe(true);
  });

  it("keeps sale status consistent with verified money", () => {
    for (const sale of store.sales) {
      const contract = store.contracts.find((item) => item.id === sale.contractId)!;
      const payments = store.payments.filter((item) => item.contractId === contract.id);
      const meets = contract.status === "finalized" && meetsRequiredInitial(contract, payments);
      expect(sale.status === "confirmed").toBe(meets);
      expect(sale.adjustments.reduce((sum, item) => sum + item.amountCentavos, 0)).toBe(sale.status === "confirmed" ? sale.valueCentavos : 0);
    }
  });

  it("seeds only a Card ID the builder would produce", () => {
    const membership = store.memberships.find((item) => item.cardId)!;
    const contract = store.contracts.find((item) => item.id === membership.contractId)!;
    expect(buildCardId({ activationDate: membership.activationDate!, raNumber: contract.raNumber, tierCode: contract.productCode, paymentCode: contract.paymentCode, classification: contract.classification })).toEqual({ cardId: membership.cardId });
  });

  it("starts counters above every seeded id and seeds display commissions", () => {
    const highest = (items: Array<{ id: string }>) => Math.max(0, ...items.map((item) => Number(item.id.split("-").pop())));
    expect(store.counters.contract).toBeGreaterThan(highest(store.contracts));
    expect(store.counters.sale).toBeGreaterThan(highest(store.sales));
    expect(store.counters.payment).toBeGreaterThan(highest(store.payments));
    expect(store.counters.membership).toBeGreaterThan(highest(store.memberships));
    expect(store.counters.commission).toBeGreaterThan(highest(store.commissions));
    // Seeded so Commissions, Payouts and the Commission Report show records.
    expect(store.commissions.map((item) => item.id).sort()).toEqual(["comm-1", "comm-2", "comm-3"]);
    for (const commission of store.commissions) {
      expect(store.sales.some((item) => item.id === commission.saleId)).toBe(true);
      expect(store.contracts.some((item) => item.id === commission.contractId)).toBe(true);
      expect(store.members.some((item) => item.id === commission.recipientMemberId)).toBe(true);
    }
  });

  it("returns isolated clones so a refresh-equivalent store is always pristine", () => {
    const first = createMockStore();
    first.contracts[0].status = "cancelled";
    first.customers[0].displayName = "Changed";
    first.counters.contract = 999;
    const second = createMockStore();
    expect(second.contracts[0].status).toBe("finalized");
    expect(second.customers[0].displayName).not.toBe("Changed");
    expect(second.counters.contract).toBe(5);
  });
});
