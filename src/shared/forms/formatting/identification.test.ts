import { describe, expect, it } from "vitest";
import { maskGovIdNumber } from "./identification";

describe("maskGovIdNumber", () => {
  it("keeps only the last four characters visible", () => {
    expect(maskGovIdNumber("1234-5678-9012-3456")).toBe("••••3456");
  });

  it("fully masks short values", () => {
    expect(maskGovIdNumber("1234")).toBe("••••");
    expect(maskGovIdNumber("")).toBe("••••");
  });
});
