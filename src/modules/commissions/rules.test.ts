import { describe, expect, it } from "vitest";
import type { Contract } from "@/modules/contracts/types";
import type { Payment } from "@/modules/finance/types";
import { collectedPercent, meetsPayoutRelease, payoutReleaseDate, payoutThresholdDate } from "./rules";

const contract = { priceCentavos: 7_200_000 } as Pick<Contract, "priceCentavos">;

const payment = (id: string, amountCentavos: number, verifiedDate: string | null, over: Partial<Payment> = {}): Payment => ({
  id,
  contractId: "c1",
  customerId: "cu1",
  saleId: null,
  purpose: "installment",
  amountCentavos,
  method: "Cash",
  paidDate: "2026-11-01",
  referenceNo: id,
  evidenceFileName: null,
  submittedBy: "u1",
  submittedAt: "2026-11-01T01:00:00.000Z",
  status: "verified",
  verifiedBy: "u2",
  verifiedAt: verifiedDate ? `${verifiedDate}T02:00:00.000Z` : null,
  verifiedDate,
  decisionReason: null,
  adjustments: [],
  history: [],
  ...over,
});

describe("40% payout release", () => {
  it("compares in integers at the exact threshold (B1: 2,880,000 centavos)", () => {
    expect(meetsPayoutRelease(contract, [payment("a", 2_879_999, "2026-11-02")])).toBe(false);
    expect(meetsPayoutRelease(contract, [payment("a", 2_880_000, "2026-11-02")])).toBe(true);
  });

  it("dates the threshold at the payment that reached it and opens payout 7 days later", () => {
    const payments = [payment("a", 1_000_000, "2026-11-02"), payment("b", 1_550_000, "2026-11-10"), payment("c", 1_550_000, "2026-11-20")];
    expect(payoutThresholdDate(contract, payments)).toBe("2026-11-20");
    expect(payoutReleaseDate(contract, payments)).toBe("2026-11-27");
  });

  it("returns null while below the threshold", () => {
    expect(payoutThresholdDate(contract, [payment("a", 1_000_000, "2026-11-02")])).toBeNull();
    expect(payoutReleaseDate(contract, [])).toBeNull();
  });

  it("recalculates after a reversal drops net money below 40%", () => {
    const reversed = payment("a", 3_000_000, "2026-11-02", { adjustments: [{ id: "x", kind: "reversal", amountCentavos: 1_000_000, date: "2026-11-05", reason: "r", actorId: "u2" }] });
    expect(payoutThresholdDate(contract, [reversed])).toBeNull();
  });

  // A verified payment with no verifiedDate counts toward the total but cannot date the threshold.
  it("returns no date when the qualifying payment has no verification date", () => {
    expect(payoutThresholdDate(contract, [payment("a", 3_000_000, null)])).toBeNull();
  });
});

describe("collectedPercent", () => {
  it("rounds down and guards a zero price", () => {
    expect(collectedPercent(contract, [payment("a", 2_879_999, "2026-11-02")])).toBe(39);
    expect(collectedPercent({ priceCentavos: 0 }, [payment("a", 1, "2026-11-02")])).toBe(0);
  });
});
