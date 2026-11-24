import { describe, expect, it } from "vitest";
import { centavosToInt64, int64ToCentavos } from "./money";

describe("server money wire format", () => {
  it("round-trips whole centavos as an Int64 string", () => {
    expect(centavosToInt64(123456)).toBe("123456");
    expect(int64ToCentavos("123456")).toBe(123456);
    expect(int64ToCentavos(centavosToInt64(39_000_000_00))).toBe(39_000_000_00);
  });

  it("rejects fractions, non-numbers and unsafe values", () => {
    expect(() => centavosToInt64(1234.56)).toThrow(RangeError);
    expect(() => centavosToInt64(Number.MAX_SAFE_INTEGER + 2)).toThrow(RangeError);
    expect(() => int64ToCentavos("12.34")).toThrow(RangeError);
    expect(() => int64ToCentavos("abc")).toThrow(RangeError);
    expect(() => int64ToCentavos("9007199254740993")).toThrow(RangeError);
  });
});
