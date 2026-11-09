import { describe, expect, it } from "vitest";
import { schemePriceCentavos, schemeTermErrors } from "./rules";

const products = [
  { code: "B1" as const, priceCentavos: 7_200_000 },
  { code: "S1" as const, priceCentavos: 24_000_000 },
];
const base = { category: "installment" as const, applicableTiers: ["B1" as const], reservationCentavos: 1_000_000, installmentCount: 4, installmentCentavosByTier: { B1: 1_550_000 }, priceCentavosByTier: {} };

describe("scheme rules", () => {
  it("uses the scheme price when set and the catalog price otherwise", () => {
    expect(schemePriceCentavos(products[0], { priceCentavosByTier: { B1: 5_400_000 } })).toBe(5_400_000);
    expect(schemePriceCentavos(products[0], { priceCentavosByTier: {} })).toBe(7_200_000);
  });

  it("accepts terms that add up exactly and blank terms", () => {
    expect(schemeTermErrors(base, products)).toEqual([]);
    expect(schemeTermErrors({ ...base, applicableTiers: [], reservationCentavos: null, installmentCount: null, installmentCentavosByTier: {} }, products)).toEqual([]);
  });

  it("checks a down payment scheme against the price with per-tier counts", () => {
    const moveB = { ...base, category: "move" as const, installmentCount: null, downPaymentBasisPoints: 4_000, installmentCountByTier: { B1: 4 }, installmentCentavosByTier: { B1: 1_080_000 } };
    expect(schemeTermErrors(moveB, products)).toEqual([]);
    expect(schemeTermErrors({ ...moveB, installmentCentavosByTier: { B1: 1_000_000 } }, products)[0]).toMatch(/down payment plus 4 installments/);
    expect(schemeTermErrors({ ...moveB, downPaymentBasisPoints: 10_000 }, products)[0]).toMatch(/between 0% and 100%/);
  });

  it("rejects non-integer, non-positive, oversized or mismatched amounts", () => {
    expect(schemeTermErrors({ ...base, reservationCentavos: 0 }, products)[0]).toMatch(/reservation fee must be a positive/);
    expect(schemeTermErrors({ ...base, installmentCount: 2.5 }, products)[0]).toMatch(/whole number/);
    expect(schemeTermErrors({ ...base, installmentCentavosByTier: { B1: 1_500_000.5 } }, products)[0]).toMatch(/B1 installment/);
    expect(schemeTermErrors({ ...base, installmentCentavosByTier: { B1: 1_500_000 } }, products)[0]).toMatch(/must equal the package price/);
    expect(schemeTermErrors({ ...base, category: "cash", installmentCount: null, installmentCentavosByTier: {}, reservationCentavos: 7_200_000 }, products)[0]).toMatch(/less than the B1 package price/);
  });
});
