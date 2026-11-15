import { describe, expect, it } from "vitest";
import { formatNotificationAction } from "./format-action";

describe("formatNotificationAction", () => {
  it("turns an action code into a sentence-case label", () => {
    expect(formatNotificationAction("COMMISSION_APPROVED")).toBe("Commission approved");
    expect(formatNotificationAction("PAYMENT_VERIFIED")).toBe("Payment verified");
    expect(formatNotificationAction("SALE_CONFIRMED")).toBe("Sale confirmed");
  });

  it("keeps known acronyms uppercase", () => {
    expect(formatNotificationAction("IGP_SERIES_ISSUED")).toBe("IGP series issued");
    expect(formatNotificationAction("CONTRACT_RA_RECORDED")).toBe("Contract RA recorded");
    expect(formatNotificationAction("CARD_CLAIM_RECORDED")).toBe("Card claim recorded");
  });

  it("handles single words and empty input", () => {
    expect(formatNotificationAction("MONTH_CLOSED")).toBe("Month closed");
    expect(formatNotificationAction("")).toBe("");
  });
});
