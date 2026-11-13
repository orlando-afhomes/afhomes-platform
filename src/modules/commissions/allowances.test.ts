import { describe, expect, it } from "vitest";
import { calculateAllowances, SHIPPED_ALLOWANCE_TERMS } from "./allowances";

describe("monthly leader allowances", () => {
  const terms = SHIPPED_ALLOWANCE_TERMS.SM;
  it("prorates qualifying BA and tests the extended BA, PA and PB separately", () => {
    expect(calculateAllowances({
      daysInMonth: 30, terms,
      qualifying: { days: 15, teamTcpCentavos: 100_000_000, collectionsCentavos: 40_000_000, assumedCreditCentavos: 0 },
      extended: { days: 15, teamTcpCentavos: 120_000_000, collectionsCentavos: 45_000_000, assumedCreditCentavos: 5_000_000 },
    })).toEqual({ baCentavos: 1_500_000, paCentavos: 1_500_000, pbCentavos: 2_250_000 });
  });

  it("blocks qualifying PA with insufficient collections and applies full BA withholding", () => {
    expect(calculateAllowances({
      daysInMonth: 30, terms, withholdBa: true,
      qualifying: { days: 30, teamTcpCentavos: 200_000_000, collectionsCentavos: 39_999_999, assumedCreditCentavos: 0 },
      extended: { days: 0, teamTcpCentavos: 0, collectionsCentavos: 0, assumedCreditCentavos: 0 },
    })).toEqual({ baCentavos: 0, paCentavos: 0, pbCentavos: 0 });
  });
});
