import { describe, expect, it } from "vitest";
import { createSeedStore } from "@/data/seed/store";
import { approvedCollectionMilestone, isFullySettled } from "../rules";
import { collectionState } from "./collection-state";

describe("collection state characterization", () => {
  it("preserves existing thresholds and settlement without modifying records", () => {
    const store = createSeedStore();
    const before = JSON.stringify(store);
    for (const contract of store.contracts) {
      const payments = store.payments.filter((payment) => payment.contractId === contract.id);
      const sale = store.sales.find((item) => item.contractId === contract.id);
      const result = collectionState(contract, payments, sale);
      expect(result.settled).toBe(isFullySettled(contract, payments));
      if (sale) {
        expect(result.confirmation).toEqual(approvedCollectionMilestone(sale.valueCentavos, payments, sale.closedDealThresholdBp ?? 2500));
        expect(result.release).toEqual(approvedCollectionMilestone(sale.valueCentavos, payments, 4000));
        expect(result.fullPayment).toEqual(approvedCollectionMilestone(sale.valueCentavos, payments, 10000));
      }
    }
    expect(JSON.stringify(store)).toBe(before);
  });
});
