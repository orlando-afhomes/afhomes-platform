import { describe, expect, it } from "vitest";
import { paymentCodeFor, paymentCodeIssues, productCodeError, schemeHowItWorks, schemePriceCentavos, schemeTermErrors } from "./rules";

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

  it("resolves payment codes per category and tier", () => {
    const spot = { category: "cash" as const, paymentCode: "C01", priceCentavosByTier: {} };
    expect(paymentCodeFor(spot, "B1")).toBe("C01");
    expect(paymentCodeFor(spot, "S1")).toBe("C01");
    expect(paymentCodeFor(spot, "G1")).toBe("C01");
    expect(paymentCodeFor({ category: "installment" as const, paymentCode: "T04", priceCentavosByTier: {} }, "B1")).toBe("T04");
    expect(paymentCodeFor({ category: "move" as const, paymentCode: "T04", priceCentavosByTier: {} }, "S1")).toBe("T04");
    const moveB = { category: "move" as const, paymentCode: null, priceCentavosByTier: {}, paymentCodeByTier: { B1: "T04", S1: "T08", G1: "T12" } };
    expect(paymentCodeFor(moveB, "B1")).toBe("T04");
    expect(paymentCodeFor(moveB, "S1")).toBe("T08");
    expect(paymentCodeFor(moveB, "G1")).toBe("T12");
    expect(paymentCodeFor({ category: "move" as const, paymentCode: null, priceCentavosByTier: {} }, "B1")).toBeNull();
    const singleOnly = { category: "move" as const, paymentCode: "T04", priceCentavosByTier: {} };
    expect(paymentCodeFor(singleOnly, "B1")).toBe("T04");
    expect(paymentCodeFor(singleOnly, "G1")).toBe("T04");
  });

  it("flags malformed or mismatched payment codes and accepts valid fixtures", () => {
    const terms = { applicableTiers: ["B1" as const], installmentCount: 4 as number | null, installmentCountByTier: undefined as { B1?: number } | undefined };
    expect(paymentCodeIssues({ category: "installment" as const, paymentCode: "X9", priceCentavosByTier: {}, ...terms })[0]).toMatch(/B1.*payment code/);
    expect(paymentCodeIssues({ category: "installment" as const, paymentCode: "T06", priceCentavosByTier: {}, ...terms })[0]).toMatch(/B1.*T06.*4/);
    expect(paymentCodeIssues({ category: "cash" as const, paymentCode: "C01", priceCentavosByTier: {}, applicableTiers: ["B1" as const], installmentCount: null, installmentCountByTier: undefined })).toEqual([]);
    expect(paymentCodeIssues({ category: "installment" as const, paymentCode: "T04", priceCentavosByTier: {}, ...terms })).toEqual([]);
    expect(paymentCodeIssues({
      category: "move" as const, paymentCode: null, priceCentavosByTier: {}, paymentCodeByTier: { B1: "T04", S1: "T08" },
      applicableTiers: ["B1", "S1"] as ("B1" | "S1")[], installmentCount: null, installmentCountByTier: { B1: 4, S1: 8 },
    })).toEqual([]);
    expect(paymentCodeIssues({ category: "move" as const, paymentCode: null, priceCentavosByTier: {}, ...terms })).toEqual([]);
    expect(schemeTermErrors({ ...base, paymentCode: "C01" }, products)).toEqual([]);
  });

  it("describes move schemes without approval language", () => {
    const down = { category: "move" as const, reservationCentavos: 1_000_000, installmentCount: null as number | null, downPaymentBasisPoints: 4_000 };
    expect(schemeHowItWorks(down)).toBe("A 40% down payment that includes the reservation fee, then equal monthly payments at 0% interest.");
    const plain = schemeHowItWorks({ category: "move" as const, reservationCentavos: 1_000_000, installmentCount: null, downPaymentBasisPoints: null });
    expect(plain).toContain("equal monthly payments at 0% interest.");
    expect(plain).not.toMatch(/approval/i);
    expect(schemeHowItWorks(down)).not.toMatch(/approval/i);
  });
});

describe("product code rules", () => {
  it("accepts a free code of one letter and one digit, in any case", () => {
    expect(productCodeError("b3", ["B1", "S1", "G1"])).toBeNull();
    expect(productCodeError("P3", ["B1"])).toBeNull();
  });

  it("never allows a code longer or shorter than 2 characters", () => {
    for (const code of ["", "B", "B33", "BRZ", "33", "1B"]) expect(productCodeError(code, [])).toMatch(/exactly 2 characters/);
  });

  it("explains held and historical codes in plain words", () => {
    for (const code of ["G2", "P2", "R2"]) expect(productCodeError(code, [])).toBe("This code is held for future use and cannot be used yet.");
    for (const code of ["B2", "S2", "P1", "R1"]) expect(productCodeError(code, [])).toBe("This code was used before and is kept for old records.");
  });

  it("refuses a code another product already has", () => {
    expect(productCodeError("b1", ["B1"])).toBe("A product with this code already exists.");
  });
});
