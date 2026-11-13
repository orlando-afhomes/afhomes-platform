import { describe, expect, it } from "vitest";
import {
  calculateRenewedExpiry,
  classifyRenewalTiming,
  getAccreditationReminder,
  isRenewalAllowed,
} from "@/modules/accreditation/dates";

describe("renewal timing (doc 03 section 5.1)", () => {
  it("holds papers before the expiry month", () => {
    expect(classifyRenewalTiming("2027-02-10", "2027-01-31")).toBe("too_early");
    expect(isRenewalAllowed("2027-02-10", "2027-01-31")).toBe(false);
    expect(calculateRenewedExpiry("2027-02-10", "2027-01-31")).toBeNull();
  });

  it("accepts any day of the expiry month, even before the exact expiry day", () => {
    expect(classifyRenewalTiming("2027-02-10", "2027-02-01")).toBe("in_expiry_month");
    expect(isRenewalAllowed("2027-02-10", "2027-02-01")).toBe(true);
  });

  it("accepts a late renewal", () => {
    expect(classifyRenewalTiming("2027-10-14", "2028-01-20")).toBe("late");
    expect(isRenewalAllowed("2027-10-14", "2028-01-20")).toBe(true);
  });

  it("is valid one year from the actual renewal date, not from the old expiry", () => {
    expect(calculateRenewedExpiry("2027-02-10", "2027-02-18")).toBe("2028-02-18");
    expect(calculateRenewedExpiry("2027-10-14", "2028-01-20")).toBe("2029-01-20");
    expect(calculateRenewedExpiry("2027-02-10", "2027-02-01")).toBe("2028-02-01");
  });

  it("rejects malformed dates", () => {
    expect(classifyRenewalTiming(null, "2027-02-18")).toBe("invalid");
    expect(calculateRenewedExpiry("2027-02-10", "not-a-date")).toBeNull();
  });
});

describe("accreditation reminder labels (doc 03 section 5.5)", () => {
  it("shows nothing until one month before expiry", () => {
    expect(getAccreditationReminder("2027-02-10", "2027-01-09")).toBeNull();
  });

  it("is RENEWAL DUE from one month before through the expiry date", () => {
    expect(getAccreditationReminder("2027-02-10", "2027-01-10")).toBe("renewal_due");
    expect(getAccreditationReminder("2027-02-10", "2027-02-10")).toBe("renewal_due");
  });

  it("is EXPIRED - GRACE for one month after expiry", () => {
    expect(getAccreditationReminder("2027-02-10", "2027-02-11")).toBe("expired_grace");
    expect(getAccreditationReminder("2027-02-10", "2027-03-10")).toBe("expired_grace");
  });

  it("is CLOSED - NOT RENEWED after the grace month", () => {
    expect(getAccreditationReminder("2027-02-10", "2027-03-11")).toBe("closed_not_renewed");
  });

  it("clamps month-end dates", () => {
    expect(getAccreditationReminder("2027-03-31", "2027-02-28")).toBe("renewal_due");
    expect(getAccreditationReminder("2027-01-31", "2027-02-28")).toBe("expired_grace");
  });

  it("returns null for incomplete dates", () => {
    expect(getAccreditationReminder(null, "2027-02-10")).toBeNull();
  });
});
