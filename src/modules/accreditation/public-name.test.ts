import { describe, expect, it } from "vitest";
import { maskPublicName } from "./public-name";

describe("maskPublicName", () => {
  it("keeps the first words and masks the last word after its first letter", () => {
    expect(maskPublicName("Juan Dela Cruz")).toBe("Juan Dela C***");
    expect(maskPublicName("  Maria   Santos ")).toBe("Maria S*****");
  });

  it("masks a single word and a one-letter last word", () => {
    expect(maskPublicName("Ana")).toBe("A**");
    expect(maskPublicName("Juan D")).toBe("Juan D*");
  });

  it("returns null for an empty name", () => {
    expect(maskPublicName("")).toBeNull();
    expect(maskPublicName("   ")).toBeNull();
    expect(maskPublicName(null)).toBeNull();
  });
});
