import { describe, expect, it } from "vitest";
import type { PaymentScheme, VipProduct } from "@/modules/vip/types";
import { buildNonStandardSchedule, buildSchedule, finalizationHolds, nonStandardPaymentCode, nonStandardTermErrors, preferOpenContract } from "./rules";
import type { Contract } from "./types";
import { paymentSchemeTierTerms } from "@/modules/vip/rules";

const product = (code: "B1" | "S1" | "G1", priceCentavos: number) => ({ code, name: code, priceCentavos }) as VipProduct;

it("opens the purchase still being prepared even when the customer has a newer finalized purchase", () => {
  const finalized = { status: "finalized", createdAt: "2026-11-16" } as const;
  const draft = { status: "draft", createdAt: "2026-11-15" } as const;
  const cancelled = { status: "cancelled", createdAt: "2026-11-17" } as const;
  expect([finalized, cancelled, draft].reduce<typeof finalized | typeof draft | typeof cancelled | undefined>(preferOpenContract, undefined)).toBe(draft);
});

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

describe("buildNonStandardSchedule (doc 05 section 10.2)", () => {
  const total = (lines: { amountCentavos: number }[]) => lines.reduce((sum, line) => sum + line.amountCentavos, 0);

  it("splits the price after the reservation fee into equal monthly payments and puts leftover centavos on the last", () => {
    const built = buildNonStandardSchedule(20_000_001, 1_000_000, 3, "2026-01-31");
    expect(built.errors).toEqual([]);
    expect(built.schedule.map((line) => [line.label, line.amountCentavos, line.dueDate])).toEqual([
      ["Reservation fee", 1_000_000, "2026-01-31"],
      ["MA1", 6_333_333, "2026-02-28"],
      ["MA2", 6_333_333, "2026-03-31"],
      ["MA3", 6_333_335, "2026-04-30"],
    ]);
    expect(total(built.schedule)).toBe(20_000_001);
    expect(built.requiredInitialCentavos).toBe(7_333_333);
  });

  it("supports 1 and 12 months with an exact total", () => {
    const one = buildNonStandardSchedule(15_000_000, 1_000_000, 1);
    expect(one.schedule.map((line) => line.amountCentavos)).toEqual([1_000_000, 14_000_000]);
    const many = buildNonStandardSchedule(39_000_000, 0, 12);
    expect(many.schedule).toHaveLength(12);
    expect(total(many.schedule)).toBe(39_000_000);
    expect(many.schedule[0]).toMatchObject({ label: "MA1", purpose: "installment", dueDate: null });
    expect(nonStandardPaymentCode(1)).toBe("T01");
    expect(nonStandardPaymentCode(12)).toBe("T12");
  });

  it("refuses a price at or below the reservation fee, fractional centavos and months outside 1 to 12", () => {
    expect(buildNonStandardSchedule(1_000_000, 1_000_000, 4).errors).toHaveLength(1);
    expect(buildNonStandardSchedule(10_000_000.5, 0, 4).errors).toHaveLength(1);
    expect(buildNonStandardSchedule(10_000_000, 0, 0).errors).toHaveLength(1);
    expect(buildNonStandardSchedule(10_000_000, 0, 13).errors).toHaveLength(1);
    expect(buildNonStandardSchedule(10_000_000, 0, 12).errors).toHaveLength(0);
    expect(buildNonStandardSchedule(10_000_000, 0, 2.5).errors).toHaveLength(1);
    expect(nonStandardTermErrors({ priceCentavos: 10_000_000, months: 4, justification: "  " }, 0)).toEqual({ reason: expect.any(String) });
  });
});

describe("finalizationHolds for Non-Standard contracts", () => {
  const base = { priceStatus: "contract_stated", schemeStatus: "configured", arrangement: null, schedule: [{ seq: 1 }], customerAccepted: true, classification: "N" } as unknown as Contract;
  const terms = { justification: "Reason", standardPriceCentavos: 1, standardInstallments: 4, approvedBy: null, approvedAt: null, approvalReference: null, selfApproved: false, confirmedBy: null, confirmedAt: null };

  it("names the missing step and clears once Finance confirms", () => {
    expect(finalizationHolds({ ...base, nonStandard: terms })).toEqual(["Non-Standard terms need Administrator approval."]);
    expect(finalizationHolds({ ...base, nonStandard: { ...terms, approvedBy: "dev-admin" } })).toEqual(["Non-Standard terms need Finance confirmation."]);
    expect(finalizationHolds({ ...base, nonStandard: { ...terms, approvedBy: "dev-admin", confirmedBy: "dev-finance" } })).toEqual([]);
    expect(finalizationHolds({ ...base, classification: "S" })).toEqual([]);
  });
});
