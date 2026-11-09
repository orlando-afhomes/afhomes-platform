import { describe, expect, it } from "vitest";
import { applyBasisPoints, formatBasisPoints, formatPeso, MoneyError, parsePercentToBasisPoints, parsePesoToCentavos, pesos } from "./money";

describe("money", () => {
  it("parses and formats exact centavos", () => {
    expect(parsePesoToCentavos("₱1,234.5")).toBe(123_450);
    expect(parsePesoToCentavos("390000")).toBe(39_000_000);
    expect(parsePesoToCentavos("12.345")).toBeNull();
    expect(parsePesoToCentavos("abc")).toBeNull();
    expect(formatPeso(pesos(390_000))).toBe("₱390,000.00");
    expect(formatPeso(-5_050)).toBe("-₱50.50");
  });

  it("applies basis points only when exact", () => {
    expect(applyBasisPoints(pesos(390_000), 500)).toBe(pesos(19_500));
    expect(() => applyBasisPoints(1, 333)).toThrow(MoneyError);
  });

  it("converts percentages to basis points", () => {
    expect(parsePercentToBasisPoints("2.5")).toBe(250);
    expect(parsePercentToBasisPoints("1.234")).toBeNull();
    expect(formatBasisPoints(250)).toBe("2.5%");
    expect(formatBasisPoints(100)).toBe("1%");
  });
});
