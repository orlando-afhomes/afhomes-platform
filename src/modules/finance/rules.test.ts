import { describe, expect, it } from "vitest";
import type { Contract } from "@/modules/contracts/types";
import { buildCollectionLedger, buildScheduleState, collectionStateFor, daysPastDue, exceedsContractPrice, findDuplicatePayment, findReferenceConflict, findSuggestedMatch,periodCollections, isFullySettled, meetsRequiredInitial, netVerifiedCentavos, outstandingBalanceCentavos, totalVerifiedCentavos } from "./rules";
import type { Payment } from "./types";

const payment = (over: Partial<Payment> = {}): Payment => ({
  id: "p1",
  contractId: "c1",
  customerId: "cu1",
  saleId: null,
  purpose: "installment",
  amountCentavos: 1_000_000,
  method: "Cash",
  paidDate: "2026-11-01",
  referenceNo: "REF-1",
  evidenceFileName: null,
  submittedBy: "u1",
  submittedAt: "2026-11-01T01:00:00.000Z",
  status: "verified",
  verifiedBy: "u2",
  verifiedAt: "2026-11-02T01:00:00.000Z",
  verifiedDate: "2026-11-02",
  decisionReason: null,
  adjustments: [],
  history: [],
  ...over,
});

const contract = { priceCentavos: 7_200_000, requiredInitialCentavos: 2_550_000 } as Pick<Contract, "priceCentavos" | "requiredInitialCentavos">;
const line = (seq: number, amountCentavos: number, dueDate: string | null) => ({ seq, label: `L${seq}`, purpose: "installment" as const, amountCentavos, dueDate });

describe("verified totals", () => {
  it("counts only verified money, net of adjustments", () => {
    expect(netVerifiedCentavos(payment({ status: "submitted" }))).toBe(0);
    expect(netVerifiedCentavos(payment({ status: "rejected" }))).toBe(0);
    const adjusted = payment({ adjustments: [{ id: "a1", kind: "refund", amountCentavos: 400_000, date: "2026-11-03", reason: "r", actorId: "u2" }] });
    expect(netVerifiedCentavos(adjusted)).toBe(600_000);
    expect(totalVerifiedCentavos([adjusted, payment({ id: "p2" })])).toBe(1_600_000);
  });

  it("computes the balance from the contract price and settles only above zero", () => {
    expect(outstandingBalanceCentavos(contract, [payment()])).toBe(6_200_000);
    expect(isFullySettled(contract, [])).toBe(false);
    expect(isFullySettled(contract, [payment({ amountCentavos: 7_200_000 })])).toBe(true);
  });

  it("meets the required initial payment only at or above it", () => {
    expect(meetsRequiredInitial(contract, [payment({ amountCentavos: 2_549_999 })])).toBe(false);
    expect(meetsRequiredInitial(contract, [payment({ amountCentavos: 2_550_000 })])).toBe(true);
    expect(meetsRequiredInitial({ requiredInitialCentavos: null }, [payment()])).toBe(false);
  });
});

describe("buildScheduleState", () => {
  const schedule = [line(1, 1_000_000, "2026-11-01"), line(2, 1_000_000, "2026-11-10"), line(3, 1_000_000, "2026-11-20"), line(4, 1_000_000, null)];

  it("allocates in order and classifies each line", () => {
    const states = buildScheduleState({ schedule }, [payment({ amountCentavos: 1_500_000 })], "2026-11-10");
    expect(states.map((state) => state.status)).toEqual(["paid", "due", "upcoming", "upcoming"]);
    expect(states[1].allocatedCentavos).toBe(500_000);
  });

  it("marks a partly paid line past its due date overdue and an undated partial as partial", () => {
    const overdue = buildScheduleState({ schedule }, [payment({ amountCentavos: 1_500_000 })], "2026-11-15");
    expect(overdue[1].status).toBe("overdue");
    const partial = buildScheduleState({ schedule }, [payment({ amountCentavos: 3_500_000 })], "2026-11-15");
    expect(partial[3].status).toBe("partial");
  });

  it("never marks a line with no due date overdue, and one payment can settle every line", () => {
    expect(buildScheduleState({ schedule }, [], "2030-01-01")[3].status).toBe("upcoming");
    expect(buildScheduleState({ schedule }, [payment({ amountCentavos: 4_000_000 })], "2030-01-01").every((state) => state.status === "paid")).toBe(true);
  });
});

describe("collection helpers", () => {
  const dated = { priceCentavos: 3_000_000, schedule: [line(1, 1_000_000, "2026-11-01"), line(2, 2_000_000, "2026-12-01")] } as Pick<Contract, "priceCentavos" | "schedule">;

  it("derives overdue, next due and state from one place", () => {
    const state = collectionStateFor(dated, [payment({ amountCentavos: 400_000 })], "2026-11-10");
    expect(state).toEqual({ verified: 400_000, balance: 2_600_000, overdue: 600_000, nextDue: "2026-11-01", daysPastDue: 9, percent: 13, state: "overdue" });
    expect(collectionStateFor(dated, [payment({ amountCentavos: 3_000_000 })], "2026-11-10").state).toBe("settled");
    expect(collectionStateFor(dated, [payment({ amountCentavos: 1_000_000 })], "2026-11-10").state).toBe("outstanding");
  });

  it("totals a period by verification date and adjustment date", () => {
    const adjusted = payment({ id: "p2", amountCentavos: 500_000, verifiedDate: "2026-11-20", adjustments: [{ id: "a", kind: "refund", amountCentavos: 100_000, date: "2026-11-21", reason: "r", actorId: "u" }] });
    expect(periodCollections([payment(), adjusted], "2026-11-01", "2026-11-30")).toEqual({ gross: 1_500_000, adjusted: 100_000, net: 1_400_000 });
    expect(periodCollections([payment(), adjusted], "2026-11-15", "2026-11-30")).toEqual({ gross: 500_000, adjusted: 100_000, net: 400_000 });
  });

  it("flags an amount that would exceed the price", () => {
    expect(exceedsContractPrice(contract, [payment({ amountCentavos: 7_000_000 })], 200_000)).toBe(false);
    expect(exceedsContractPrice(contract, [payment({ amountCentavos: 7_000_000 })], 200_001)).toBe(true);
  });
});

describe("collection ledger", () => {
  const refund = { id: "a", kind: "refund" as const, amountCentavos: 200_000, date: "2026-11-05", reason: "r", actorId: "u" };

  it("lists verified money and adjustments in date order with running net and balance", () => {
    const ledger = buildCollectionLedger({ priceCentavos: 3_000_000 }, [
      payment({ id: "p2", amountCentavos: 1_000_000, verifiedDate: "2026-11-04" }),
      payment({ id: "p1", amountCentavos: 1_000_000, verifiedDate: "2026-11-02", adjustments: [refund] }),
      payment({ id: "p3", status: "submitted", amountCentavos: 500_000, verifiedDate: null }),
    ]);
    expect(ledger.map((entry) => [entry.date, entry.kind, entry.netCentavos, entry.balanceCentavos])).toEqual([
      ["2026-11-02", "payment", 1_000_000, 2_000_000],
      ["2026-11-04", "payment", 2_000_000, 1_000_000],
      ["2026-11-05", "refund", 1_800_000, 1_200_000],
    ]);
  });

  it("ends at the same net and balance the contract views use", () => {
    const payments = [payment({ id: "p1", amountCentavos: 1_000_000, adjustments: [refund] }), payment({ id: "p2", amountCentavos: 500_000 })];
    const ledger = buildCollectionLedger({ priceCentavos: 3_000_000 }, payments);
    expect(ledger.at(-1)!.netCentavos).toBe(totalVerifiedCentavos(payments));
    expect(ledger.at(-1)!.balanceCentavos).toBe(outstandingBalanceCentavos({ priceCentavos: 3_000_000 }, payments));
  });
});

describe("schedule order and days past due", () => {
  it("applies money to the reservation before installments whatever the stored order", () => {
    const schedule = [
      { seq: 1, label: "MA1", purpose: "installment" as const, amountCentavos: 1_000_000, dueDate: null },
      { seq: 2, label: "Reservation fee", purpose: "reservation" as const, amountCentavos: 1_000_000, dueDate: null },
    ];
    const states = buildScheduleState({ schedule }, [payment({ amountCentavos: 1_000_000 })], "2026-11-10");
    expect(states.map((state) => [state.label, state.status])).toEqual([["Reservation fee", "paid"], ["MA1", "upcoming"]]);
  });

  it("counts whole calendar days and never goes negative", () => {
    expect(daysPastDue("2026-11-01", "2026-11-10")).toBe(9);
    expect(daysPastDue("2026-11-10", "2026-11-01")).toBe(0);
  });
});

describe("findReferenceConflict", () => {
  it("matches the same number on any contract or status, ignoring case and spacing", () => {
    expect(findReferenceConflict([payment({ contractId: "c9", status: "rejected" })], " ref-1 ")?.id).toBe("p1");
  });

  it("ignores blank numbers and the payment itself", () => {
    expect(findReferenceConflict([payment({ referenceNo: null })], "")).toBeUndefined();
    expect(findReferenceConflict([payment()], "REF-1", "p1")).toBeUndefined();
  });
});

describe("findSuggestedMatch", () => {
  const open = payment({ id: "p2", status: "submitted", referenceNo: "REF-2" });

  it("suggests another open receipt on the same contract with the same amount and date", () => {
    expect(findSuggestedMatch([payment({ status: "under_review" })], open)?.id).toBe("p1");
  });

  it("does not suggest verified receipts, other amounts or other contracts", () => {
    expect(findSuggestedMatch([payment()], open)).toBeUndefined();
    expect(findSuggestedMatch([payment({ status: "submitted", amountCentavos: 5 })], open)).toBeUndefined();
    expect(findSuggestedMatch([payment({ status: "submitted", contractId: "c2" })], open)).toBeUndefined();
  });
});

describe("findDuplicatePayment", () => {
  const candidate = { contractId: "c1", amountCentavos: 1_000_000, method: "Cash" as const, referenceNo: " ref-1 ", paidDate: "2026-11-01" };

  it("matches an equal submission ignoring reference case and spacing", () => {
    expect(findDuplicatePayment([payment()], candidate)?.id).toBe("p1");
  });

  it("ignores rejected payments and other contracts", () => {
    expect(findDuplicatePayment([payment({ status: "rejected" })], candidate)).toBeUndefined();
    expect(findDuplicatePayment([payment({ contractId: "c2" })], candidate)).toBeUndefined();
  });
});
