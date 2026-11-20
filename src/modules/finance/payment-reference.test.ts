import { describe, expect, it } from "vitest";
import { nextOfficialReceiptNo, nextPaymentReference } from "./payment-reference";

describe("nextPaymentReference", () => {
  it("builds PAY-YYYYMMDD-NNNN and skips references already used", () => {
    expect(nextPaymentReference([], "2026-11-20")).toBe("PAY-20261120-0001");
    expect(
      nextPaymentReference([{ referenceNo: "PAY-20261120-0001" }, { referenceNo: "PAY-20261120-0002" }], "2026-11-20"),
    ).toBe("PAY-20261120-0003");
  });

  it("scopes the sequence to the payment date and ignores foreign references", () => {
    const existing = [{ referenceNo: "GC123456789012" }, { referenceNo: "PAY-20261119-0001" }];
    expect(nextPaymentReference(existing, "2026-11-20")).toBe("PAY-20261120-0001");
  });

  it("skips a candidate reserved by an imported or historical receipt", () => {
    expect(nextPaymentReference([], "2026-11-20", (reference) => reference === "PAY-20261120-0001")).toBe("PAY-20261120-0002");
  });
});

describe("nextOfficialReceiptNo", () => {
  it("builds OR-YYYYMMDD-NNNN from the document numbers already recorded", () => {
    expect(nextOfficialReceiptNo([], "2026-11-20")).toBe("OR-20261120-0001");
    expect(
      nextOfficialReceiptNo([{ documentNo: "OR-20261120-0001" }, { documentNo: null }, { documentNo: "OR-20261119-0001" }], "2026-11-20"),
    ).toBe("OR-20261120-0002");
  });
});
