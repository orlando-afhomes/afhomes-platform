import { describe, expect, it } from "vitest";
import { canPrintGrant, firstPaymentSummary, supportedPrintTier, templateKeyFor } from "./print-data";
import { createMockStore } from "@/data/mock/seed";
import { displayPriceFor } from "@/modules/vip/pricing";
import type { Contract } from "./types";
import type { Payment } from "@/modules/finance/types";

const contract = {
  productCode: "G1",
  schemeId: "scheme-installment-4m",
  status: "finalized",
  classification: "S",
  vipNumber: "26112300001G1T04S",
  priceCentavos: 39_000_000,
  schedule: [
    { seq: 1, label: "Reservation fee", amountCentavos: 1_000_000, purpose: "reservation", dueDate: "2026-11-23" },
    ...Array.from({ length: 4 }, (_, i) => ({ seq: i + 2, label: `MA${i + 1}`, amountCentavos: 9_500_000, purpose: "installment" as const, dueDate: "2026-12-23" })),
  ],
} as Contract;

describe("printable VIP documents", () => {
  it("selects the tier agreement and requires a finalized, numbered Grant", () => {
    expect(templateKeyFor("reservation", contract)).toBe("reservation-gold");
    expect(templateKeyFor("grant", contract)).toBe("grant-gold");
    expect(canPrintGrant({ ...contract, vipNumber: undefined })).toBe(false);
    expect(canPrintGrant({ ...contract, status: "submitted" })).toBe(false);
    expect(canPrintGrant(contract)).toBe(true);
  });

  it("withholds fixed-price Grants when their schedule does not match the source", () => {
    expect(templateKeyFor("grant", { ...contract, schemeId: "scheme-move-b" })).toBeNull();
    expect(templateKeyFor("grant", { ...contract, classification: "N" })).toBeNull();
    expect(templateKeyFor("grant", { ...contract, priceCentavos: 78_000_000 })).toBeNull();
  });

  it("keeps the Grant template prices equal to the configured four-month prices", () => {
    const store = createMockStore();
    const scheme = store.paymentSchemes.find((item) => item.id === "scheme-installment-4m")!;
    for (const code of ["B1", "S1", "G1"]) {
      const product = store.products.find((item) => item.code === code)!;
      expect(displayPriceFor(product, scheme)).toBe(supportedPrintTier(code)!.grantPrice);
    }
  });

  it("prints only approved, net receipts and keeps the remaining schedule separate", () => {
    const payments = [
      { contractId: "ctr-1", status: "verified", amountCentavos: 1_000_000, purpose: "reservation", adjustments: [{ amountCentavos: 100_000 }] },
      { contractId: "ctr-1", status: "submitted", amountCentavos: 9_500_000, purpose: "installment", adjustments: [] },
    ] as Payment[];
    expect(firstPaymentSummary(contract, payments, "2026-11-23")).toMatchObject({
      received: 900_000, reservationReceived: 900_000, downPaymentReceived: 0, balance: 38_100_000,
    });
  });
});
