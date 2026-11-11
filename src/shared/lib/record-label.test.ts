import { describe, expect, it } from "vitest";
import { recordLabel } from "./record-label";

describe("recordLabel", () => {
  it("joins the kind and the real-data parts", () => {
    expect(recordLabel("Contract", "Rafael Domingo", "B1")).toBe("Contract · Rafael Domingo · B1");
  });

  it("skips empty parts and keeps just the kind when none remain", () => {
    expect(recordLabel("Payment", null, "  ", undefined)).toBe("Payment");
    expect(recordLabel("Sale", "Elena Bautista", "")).toBe("Sale · Elena Bautista");
  });
});
