import { describe, expect, it } from "vitest";
import { applyBasisPoints, centavosToInputText, formatIntegerInput, formatMoneyInput, formatBasisPoints, formatPeso, MoneyError, parsePercentToBasisPoints, parsePesoToCentavos, pesos } from "./money";

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

  it("groups peso and whole-number input with commas as it is typed", () => {
    expect(formatMoneyInput("10000")).toBe("10,000");
    expect(formatMoneyInput("1234567.5")).toBe("1,234,567.5");
    expect(formatMoneyInput("0012")).toBe("12");
    expect(formatMoneyInput("12.345")).toBe("12.34");
    expect(formatMoneyInput("10000.")).toBe("10,000.");
    expect(formatMoneyInput(".5")).toBe("0.5");
    expect(formatMoneyInput("₱1,2a3.4.5")).toBe("123.45");
    expect(formatIntegerInput("25000")).toBe("25,000");
    expect(formatIntegerInput("2,5.0x")).toBe("250");
    expect(centavosToInputText(1_550_000)).toBe("15,500");
    expect(centavosToInputText(123_450)).toBe("1,234.5");
    expect(centavosToInputText(123_405)).toBe("1,234.05");
    expect(centavosToInputText(null)).toBe("");
    expect(parsePesoToCentavos(formatMoneyInput("1234567.89"))).toBe(123_456_789);
  });
});
