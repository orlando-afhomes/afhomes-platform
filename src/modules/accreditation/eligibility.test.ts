import { describe, expect, it } from "vitest";
import type { AccreditationRecord } from "@/modules/accreditation/types";
import type { OrgMember } from "@/modules/organization/types";
import { getSellerStanding, resolveEffectiveAccreditationEligibility, resolveAaNumber } from "@/modules/accreditation/eligibility";

function record(overrides: Partial<AccreditationRecord> = {}): AccreditationRecord {
  return {
    id: "accr-1",
    memberId: "mem-1",
    classification: "OST",
    adminStatus: "active",
    originalAccreditationDate: "2026-02-10",
    effectiveDate: "2026-02-10",
    expiryDate: "2027-02-10",
    aaNumber: "AAO26020001",
    history: [],
    ...overrides,
  };
}

const member = { id: "mem-1", displayName: "Seller", designation: "OST", branchId: "b", parentId: null, status: "active" } as OrgMember;

describe("seller standing by action (doc 03 section 9)", () => {
  it("is valid through the whole expiry date", () => {
    expect(getSellerStanding(record(), "2027-02-10")).toEqual({ state: "valid" });
  });

  it("is expired, not blocked, after the expiry date, with a reminder", () => {
    expect(getSellerStanding(record(), "2027-02-11")).toEqual({ state: "expired", expiryDate: "2027-02-10", reminder: "expired_grace" });
    expect(getSellerStanding(record(), "2027-09-01")).toMatchObject({ state: "expired", reminder: "closed_not_renewed" });
  });

  it("blocks a suspension only for dates on or after its effective date", () => {
    const suspended = record({ adminStatus: "suspended", suspensionEffectiveDate: "2026-08-15" });
    expect(getSellerStanding(suspended, "2026-08-14")).toEqual({ state: "valid" });
    expect(getSellerStanding(suspended, "2026-08-15")).toEqual({ state: "blocked", reason: "SUSPENDED" });
  });

  it("blocks a suspension with no recorded date for every date", () => {
    expect(getSellerStanding(record({ adminStatus: "suspended" }), "2026-03-01")).toEqual({ state: "blocked", reason: "SUSPENDED" });
  });

  it("blocks a resignation or termination only after its end date", () => {
    const ended = record({ endDate: "2026-09-30" });
    expect(getSellerStanding(ended, "2026-09-30")).toEqual({ state: "valid" });
    expect(getSellerStanding(ended, "2026-10-01")).toEqual({ state: "blocked", reason: "ENDED" });
    expect(getSellerStanding(record({ adminStatus: "revoked", endDate: "2026-09-30" }), "2026-10-01")).toEqual({ state: "blocked", reason: "ENDED" });
  });

  it("blocks an expired seller who has also left", () => {
    expect(getSellerStanding(record({ endDate: "2026-09-30" }), "2027-03-01")).toEqual({ state: "blocked", reason: "ENDED" });
  });

  it("blocks pending, cancelled and date-less records", () => {
    expect(getSellerStanding(record({ adminStatus: "pending" }), "2026-03-01")).toEqual({ state: "blocked", reason: "NOT_ACTIVE" });
    expect(getSellerStanding(record({ adminStatus: "cancelled" }), "2026-03-01")).toEqual({ state: "blocked", reason: "NOT_ACTIVE" });
    expect(getSellerStanding(record({ expiryDate: null }), "2026-03-01")).toEqual({ state: "blocked", reason: "INCOMPLETE_DATES" });
  });
});

describe("resolveEffectiveAccreditationEligibility", () => {
  it("keeps an expired seller eligible and flags the expiry", () => {
    expect(resolveEffectiveAccreditationEligibility(member, [record()], "2027-03-01")).toEqual({ eligible: true, source: "record", expired: true });
  });

  it("still refuses a suspended seller", () => {
    const suspended = record({ adminStatus: "suspended", suspensionEffectiveDate: "2026-08-15" });
    expect(resolveEffectiveAccreditationEligibility(member, [suspended], "2026-08-15")).toEqual({ eligible: false, source: "record", reason: "SUSPENDED" });
  });
});

describe("AA Number History resolution (doc 03 section 5.2.1)", () => {
  const renewed = record({
    aaNumber: "AAO27020015",
    aaNumberHistory: [{ aaNumber: "AAO26020001", replacedBy: "AAO27020015", replacedOn: "2027-02-18", actorId: "dev-admin", changedAt: "2027-02-18T01:00:00.000Z" }],
  });

  it("resolves a current number and a superseded number to the same record", () => {
    expect(resolveAaNumber([renewed], "aao27020015")).toEqual({ record: renewed, quotedNumberIsCurrent: true });
    expect(resolveAaNumber([renewed], "AAO26020001")).toEqual({ record: renewed, quotedNumberIsCurrent: false });
  });

  it("returns null for an unknown number", () => {
    expect(resolveAaNumber([renewed], "AAO26020002")).toBeNull();
  });
});
