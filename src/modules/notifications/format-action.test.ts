import { describe, expect, it } from "vitest";
import { formatNotificationAction } from "./format-action";

describe("formatNotificationAction", () => {
  it("turns an action code into a sentence-case label", () => {
    expect(formatNotificationAction("COMMISSION_APPROVED")).toBe("Commission approved");
    expect(formatNotificationAction("PAYMENT_VERIFIED")).toBe("Payment verified");
    expect(formatNotificationAction("SALE_CONFIRMED")).toBe("Sale confirmed");
  });

  it("uses plain words for company jargon and keeps acronyms uppercase", () => {
    expect(formatNotificationAction("IGP_SERIES_ISSUED")).toBe("Property (IGP) series issued");
    expect(formatNotificationAction("CONTRACT_RA_RECORDED")).toBe("Reservation agreement recorded");
    expect(formatNotificationAction("VIP_NUMBER_ISSUED")).toBe("VIP Number issued");
    expect(formatNotificationAction("COMMISSION_CLAWBACK_WRITTEN_OFF")).toBe("Commission payback not collected");
    expect(formatNotificationAction("COMPASSIONATE_WAIVER_GRANTED")).toBe("Gift exception granted");
    expect(formatNotificationAction("JAD_ACCREDITATION_RECORDED")).toBe("JA&D accreditation recorded");
    expect(formatNotificationAction("CARD_CLAIM_RECORDED")).toBe("Card claim recorded");
  });

  it("handles single words and empty input", () => {
    expect(formatNotificationAction("MONTH_CLOSED")).toBe("Month closed");
    expect(formatNotificationAction("")).toBe("");
  });
});
