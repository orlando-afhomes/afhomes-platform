import { describe, expect, it } from "vitest";
import { humanize } from "./humanize";

describe("humanize", () => {
  it("title-cases snake, kebab, camel and lower-case values", () => {
    expect(humanize("spot_cash")).toBe("Spot Cash");
    expect(humanize("commission-approved")).toBe("Commission Approved");
    expect(humanize("contractFinalized")).toBe("Contract Finalized");
    expect(humanize("submitted")).toBe("Submitted");
    expect(humanize("dev-finance")).toBe("Dev Finance");
  });

  it("keeps acronyms, codes, and values with digits as written", () => {
    expect(humanize("OST")).toBe("OST");
    expect(humanize("B1")).toBe("B1");
    expect(humanize("500bp/360000")).toBe("500bp/360000");
    expect(humanize("Move_A")).toBe("Move A");
  });

  it("handles empty input", () => {
    expect(humanize("")).toBe("");
    expect(humanize(null)).toBe("");
  });
});
