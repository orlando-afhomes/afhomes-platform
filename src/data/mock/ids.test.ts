import { describe, expect, it } from "vitest";
import { randomNumericId } from "./ids";

describe("randomNumericId", () => {
  it("returns digits only, requested length, no leading zero", () => {
    for (let i = 0; i < 200; i += 1) {
      expect(randomNumericId(new Set())).toMatch(/^[1-9]\d{11}$/);
    }
    expect(randomNumericId(new Set(), 8)).toMatch(/^[1-9]\d{7}$/);
  });

  it("never returns a taken value", () => {
    const taken = new Set<string>();
    for (let i = 0; i < 500; i += 1) {
      const id = randomNumericId(taken);
      expect(taken.has(id)).toBe(false);
      taken.add(id);
    }
  });
});
