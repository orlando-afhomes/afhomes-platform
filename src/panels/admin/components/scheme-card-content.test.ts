import { describe, expect, it } from "vitest";
import type { PaymentScheme } from "@/modules/vip/types";
import { schemeCardContent } from "./scheme-card-content";

const CENTAVOS = 100;
const peso = (amount: number) => amount * CENTAVOS;

const gold = { code: "G1" as const, priceCentavos: peso(390000) };

const baseScheme: PaymentScheme = {
  id: "scheme-fixture",
  label: "Fixture",
  historicalLabel: null,
  category: "cash",
  paymentCode: null,
  applicableTiers: ["G1"],
  reservationCentavos: null,
  installmentCount: null,
  installmentCentavosByTier: {},
  priceCentavosByTier: {},
  commercialStatus: "configured",
  source: "test fixture",
  availability: "available",
  configVersion: 1,
  effectiveDate: null,
  changes: [],
};

const spotCashGold: PaymentScheme = {
  ...baseScheme,
  id: "scheme-spot-cash",
  label: "Spot Cash",
  category: "cash",
  paymentCode: "C01",
  applicableTiers: ["B1", "S1", "G1"],
  reservationCentavos: peso(10000),
  priceCentavosByTier: { G1: peso(312000) },
};

const installmentGold: PaymentScheme = {
  ...baseScheme,
  id: "scheme-installment-4m",
  label: "4-Month Installment",
  category: "installment",
  paymentCode: "T04",
  applicableTiers: ["B1", "S1", "G1"],
  reservationCentavos: peso(10000),
  installmentCount: 4,
  installmentCentavosByTier: { G1: peso(95000) },
};

const moveAGold: PaymentScheme = {
  ...baseScheme,
  id: "scheme-move-a",
  label: "Move A",
  category: "move",
  paymentCode: null,
  applicableTiers: ["B1", "S1", "G1"],
  reservationCentavos: peso(10000),
  installmentCount: 4,
  installmentCentavosByTier: { G1: peso(75500) },
  priceCentavosByTier: { G1: peso(312000) },
};

const moveBGold: PaymentScheme = {
  ...baseScheme,
  id: "scheme-move-b",
  label: "Move B",
  category: "move",
  paymentCode: null,
  applicableTiers: ["B1", "S1", "G1"],
  reservationCentavos: peso(10000),
  installmentCount: null,
  installmentCountByTier: { G1: 12 },
  downPaymentBasisPoints: 4_000,
  installmentCentavosByTier: { G1: peso(19500) },
};

describe("schemeCardContent", () => {
  it("Spot Cash Gold shows ₱312,000 with a 7-day pill and reservation plus balance terms", () => {
    const content = schemeCardContent(spotCashGold, gold);
    expect(content.total).toBe("₱312,000.00");
    expect(content.pill).toBe("Pay in 7 days");
    expect(content.terms).toEqual(["₱10,000.00 reservation fee", "Balance ₱302,000.00 due within 7 days"]);
  });

  it("installment Gold shows ₱390,000 with 4 monthly payments at 0% interest", () => {
    const content = schemeCardContent(installmentGold, gold);
    expect(content.total).toBe("₱390,000.00");
    expect(content.pill).toBe("4 monthly payments");
    expect(content.terms).toContain("₱10,000.00 reservation fee");
    expect(content.terms).toContain("4 × ₱95,000.00 monthly payments at 0% interest");
  });

  it("Move A Gold shows ₱312,000 with monthly terms and no approval or card-id lines", () => {
    const content = schemeCardContent(moveAGold, gold);
    expect(content.total).toBe("₱312,000.00");
    expect(content.pill).toBe("4 monthly payments");
    expect(content.terms).toContain("4 × ₱75,500.00 monthly payments at 0% interest");
    expect(content.terms).not.toContain("Needs Super Admin written approval");
    expect(content.terms).not.toContain("Card ID mapping pending owner decision");
    expect(content.terms.some((term) => term.includes("down payment"))).toBe(false);
  });

  it("Move B Gold shows ₱390,000 with 12 monthly payments and a down-payment line", () => {
    const content = schemeCardContent(moveBGold, gold);
    expect(content.total).toBe("₱390,000.00");
    expect(content.pill).toBe("12 monthly payments");
    expect(content.terms).toContain("₱156,000.00 down payment (incl. reservation fee)");
  });

  it("unavailable scheme keeps the total but clears the pill and terms", () => {
    const content = schemeCardContent({ ...spotCashGold, availability: "unavailable" }, gold);
    expect(content.total).toBe("₱312,000.00");
    expect(content.pill).toBeNull();
    expect(content.terms).toEqual([]);
  });

  it("no product returns null total, null pill, and empty terms", () => {
    expect(schemeCardContent(spotCashGold, null)).toEqual({ total: null, pill: null, terms: [] });
    expect(schemeCardContent(spotCashGold, undefined)).toEqual({ total: null, pill: null, terms: [] });
  });
});
