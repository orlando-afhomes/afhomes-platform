import { describe, expect, it } from "vitest";
import type { PaymentScheme, VipProduct } from "@/modules/vip/types";
import { buildSchedule } from "./rules";
import { paymentSchemeTierTerms } from "@/modules/vip/rules";

const product = (code: "B1" | "S1" | "G1", priceCentavos: number) => ({ code, name: code, priceCentavos }) as VipProduct;

const t04: PaymentScheme = {
  id: "scheme-t04",
  label: "4-Month Installment",
  historicalLabel: null,
  category: "installment",
  paymentCode: "T04",
  applicableTiers: ["B1", "S1", "G1"],
  reservationCentavos: 1_000_000,
  installmentCount: 4,
  installmentCentavosByTier: { B1: 1_550_000, S1: 5_750_000, G1: 9_500_000 },
  priceCentavosByTier: {},
  commercialStatus: "configured",
  source: "test",
  availability: "available",
  configVersion: 1,
  effectiveDate: null,
  changes: [],
};

describe("buildSchedule", () => {
  it.each([
    ["B1", 7_200_000, 2_550_000],
    ["S1", 24_000_000, 6_750_000],
    ["G1", 39_000_000, 10_500_000],
  ] as const)("builds the 4-month installment for %s", (code, price, requiredInitial) => {
    const built = buildSchedule(product(code, price), t04);
    expect(built.errors).toEqual([]);
    expect(built.schedule.map((line) => line.label)).toEqual(["Reservation fee", "MA1", "MA2", "MA3", "MA4"]);
    expect(built.schedule.reduce((sum, line) => sum + line.amountCentavos, 0)).toBe(price);
    expect(built.requiredInitialCentavos).toBe(requiredInitial);
  });

  it("reports a total that does not equal the price", () => {
    expect(buildSchedule(product("B1", 7_300_000), t04).errors).toEqual(["The schedule total does not equal the B1 price."]);
  });

  it("builds one full payment for a cash scheme without a reservation fee", () => {
    const cash: PaymentScheme = { ...t04, category: "cash", reservationCentavos: null, installmentCount: null, installmentCentavosByTier: {} };
    const built = buildSchedule(product("B1", 7_200_000), cash);
    expect(built.schedule).toHaveLength(1);
    expect(built.schedule[0]).toMatchObject({ purpose: "full", amountCentavos: 7_200_000 });
    expect(built.requiredInitialCentavos).toBe(7_200_000);
  });

  it.each([
    ["B1", 5_400_000, 4_400_000],
    ["S1", 19_200_000, 18_200_000],
    ["G1", 31_200_000, 30_200_000],
  ] as const)("prices Spot Cash for %s from the scheme and dates the balance 7 days after reservation", (code, price, balance) => {
    const spot: PaymentScheme = { ...t04, category: "cash", paymentCode: "C01", installmentCount: null, installmentCentavosByTier: {}, priceCentavosByTier: { B1: 5_400_000, S1: 19_200_000, G1: 31_200_000 } };
    const built = buildSchedule(product(code, 99_999_900), spot, "2026-11-28");
    expect(built.priceCentavos).toBe(price);
    expect(built.schedule.map((line) => [line.label, line.amountCentavos, line.dueDate])).toEqual([
      ["Reservation fee", 1_000_000, "2026-11-28"],
      ["Balance", balance, "2026-12-05"],
    ]);
    expect(built.requiredInitialCentavos).toBe(price);
  });

  it.each([
    ["B1", 7_200_000, 1_880_000, 4, 1_080_000],
    ["S1", 24_000_000, 8_600_000, 8, 1_800_000],
    ["G1", 39_000_000, 14_600_000, 12, 1_950_000],
  ] as const)("builds Move B for %s: 40%% down including the reservation, then equal monthly payments", (code, price, downLine, count, each) => {
    const moveB: PaymentScheme = { ...t04, category: "move", installmentCount: null, downPaymentBasisPoints: 4_000, installmentCountByTier: { B1: 4, S1: 8, G1: 12 }, installmentCentavosByTier: { B1: 1_080_000, S1: 1_800_000, G1: 1_950_000 } };
    const built = buildSchedule(product(code, price), moveB, "2026-11-10");
    const terms = paymentSchemeTierTerms(product(code, price), moveB);
    expect(terms).toEqual({ priceCentavos: built.priceCentavos, reservationCentavos: built.schedule[0].amountCentavos, installmentCount: count, installmentCentavos: each });
    expect(built.errors).toEqual([]);
    expect(built.schedule[1]).toMatchObject({ label: "Down payment", purpose: "down_payment", amountCentavos: downLine, dueDate: null });
    expect(built.schedule.filter((line) => line.purpose === "installment")).toHaveLength(count);
    expect(built.schedule.at(-1)!.amountCentavos).toBe(each);
    expect(built.requiredInitialCentavos).toBe(1_000_000 + downLine);
  });

  it("dates installments monthly from the reservation and leaves them undated without one", () => {
    expect(buildSchedule(product("B1", 7_200_000), t04, "2026-11-30").schedule.map((line) => line.dueDate)).toEqual(["2026-11-30", "2026-12-30", "2027-01-30", "2027-02-28", "2027-03-30"]);
    expect(buildSchedule(product("B1", 7_200_000), t04).schedule.every((line) => line.dueDate === null)).toBe(true);
  });

  it("produces no schedule for a scheme without approved terms or tier", () => {
    expect(buildSchedule(product("B1", 7_200_000), { ...t04, commercialStatus: "pending_owner_decision" }).schedule).toEqual([]);
    expect(buildSchedule(product("B1", 7_200_000), { ...t04, applicableTiers: ["S1"] }).errors).toHaveLength(1);
  });
});
