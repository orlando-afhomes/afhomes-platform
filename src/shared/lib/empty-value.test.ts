import { describe, expect, it } from "vitest";
import { displayValue, EMPTY } from "./empty-value";

describe("displayValue", () => {
  it("returns the em dash for missing values", () => {
    expect(EMPTY).toBe("—");
    for (const value of [null, undefined, "", "   "]) expect(displayValue(value)).toBe(EMPTY);
  });

  it("keeps real values, including zero", () => {
    expect(displayValue("Maria")).toBe("Maria");
    expect(displayValue(0)).toBe(0);
    expect(displayValue(false)).toBe(false);
  });

  it("accepts a custom fallback", () => {
    expect(displayValue(null, "n/a")).toBe("n/a");
  });
});
