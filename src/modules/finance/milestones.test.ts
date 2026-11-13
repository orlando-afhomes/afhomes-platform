import { describe, expect, it } from "vitest";
import { deriveMilestones } from "./milestones";
import type { Payment } from "./types";

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
  status: verifiedDate ? "verified" : "submitted",
  verifiedBy: verifiedDate ? "u2" : null,
  verifiedAt: verifiedDate ? `${verifiedDate}T02:00:00.000Z` : null,
  verifiedDate,
  decisionReason: null,
  adjustments: [],
  history: [],
  ...over,
});

const contract = { priceCentavos: 3_000_000 };
const dateOf = (milestones: ReturnType<typeof deriveMilestones>, key: string) => milestones.find((item) => item.key === key)?.date;

describe("deriveMilestones", () => {
  it("keeps recorded, verified, release and fully paid separate", () => {
    const milestones = deriveMilestones({
      contract,
      payments: [payment("a", 1_300_000, "2026-11-02"), payment("b", 1_700_000, "2026-11-20", { paidDate: "2026-11-05" })],
      saleConfirmedDate: "2026-11-02",
      activationDate: null,
      cardId: null,
      includePaymentReference: true,
    });
    expect(dateOf(milestones, "recorded")).toBe("2026-11-01");
    expect(dateOf(milestones, "verified")).toBe("2026-11-02");
    expect(dateOf(milestones, "release")).toBe("2026-11-01");
    expect(milestones.find((item) => item.key === "release")?.note).toBe("Payment reference a");
    expect(dateOf(milestones, "paid")).toBe("2026-11-05");
    expect(dateOf(milestones, "activated")).toBeNull();
    expect(dateOf(milestones, "card")).toBeNull();
  });

  it("does not count unverified money and never marks a submitted payment as verified", () => {
    const milestones = deriveMilestones({ contract, payments: [payment("a", 3_000_000, null)], saleConfirmedDate: null, activationDate: null, cardId: null });
    expect(dateOf(milestones, "recorded")).toBe("2026-11-01");
    expect(dateOf(milestones, "verified")).toBeNull();
    expect(dateOf(milestones, "release")).toBeNull();
    expect(dateOf(milestones, "paid")).toBeNull();
  });

  it("reports activation and Card ID only from the membership", () => {
    const milestones = deriveMilestones({ contract, payments: [payment("a", 3_000_000, "2026-11-02")], saleConfirmedDate: "2026-11-02", activationDate: "2026-11-03", cardId: "26110300001B1T04S" });
    expect(dateOf(milestones, "activated")).toBe("2026-11-03");
    expect(dateOf(milestones, "release")).toBe("2026-11-01");
    expect(milestones.find((item) => item.key === "card")).toMatchObject({ date: "2026-11-03", note: "26110300001B1T04S" });
  });
});
