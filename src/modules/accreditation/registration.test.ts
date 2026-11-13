import { describe, expect, it } from "vitest";
import { getDevIdentity } from "@/data/mock/dev-identities";
import {
  EMPTY_APPLICANT,
  canDecideRegistrations,
  canReviewRegistrations,
  isDuplicateApplication,
  normalizeApplicant,
  validateApplicant,
  validateCompletion,
  validateDecisionReason,
} from "./registration";

describe("OST application rules", () => {
  it("lets Administrators review and decide, and keeps everyone else out", () => {
    for (const id of ["dev-admin", "dev-super-admin"]) {
      expect(canReviewRegistrations(getDevIdentity(id))).toBe(true);
      expect(canDecideRegistrations(getDevIdentity(id))).toBe(true);
    }
    for (const id of ["dev-finance", "dev-hr", "dev-svd-a", "dev-ost-a1", "dev-inactive"]) {
      expect(canReviewRegistrations(getDevIdentity(id))).toBe(false);
      expect(canDecideRegistrations(getDevIdentity(id))).toBe(false);
    }
  });

  it("reports an error for every missing required applicant field", () => {
    expect(Object.keys(validateApplicant(EMPTY_APPLICANT)).sort()).toEqual(
      ["barangay", "city", "dateOfBirth", "email", "firstName", "lastName", "middleName", "mobileNumber", "postalCode", "province", "street"].sort(),
    );
  });

  it("normalizes mobile and email, and ignores a middle name that is explicitly absent", () => {
    const result = normalizeApplicant({ ...EMPTY_APPLICANT, firstName: " Ana  Marie ", middleName: "X", noMiddleName: true, mobileNumber: "0917-555-0123", email: " A@B.COM " });
    expect(result).toMatchObject({ firstName: "Ana Marie", middleName: "", mobileNumber: "09175550123", email: "a@b.com" });
  });

  it("matches a duplicate only against applications that still count", () => {
    const base = normalizeApplicant({ ...EMPTY_APPLICANT, firstName: "Ana", lastName: "Cruz", dateOfBirth: "1990-01-15", mobileNumber: "09175550123", email: "a@b.com" });
    const other = (status: "submitted" | "rejected") => [{ id: "reg-1", status, applicant: base }] as never;
    expect(isDuplicateApplication(base, other("submitted"))).toBe(true);
    expect(isDuplicateApplication(base, other("rejected"))).toBe(false);
    expect(isDuplicateApplication(base, other("submitted"), "reg-1")).toBe(false);
  });

  it("requires a bounded reason and a complete seller entry", () => {
    expect(validateDecisionReason("  ")).toMatch(/required/);
    expect(validateDecisionReason("x".repeat(501))).toMatch(/500/);
    expect(validateDecisionReason("Fix the birth date.")).toBeNull();
    expect(validateCompletion({ gender: "", civilStatus: "", governmentIdType: "", governmentIdNumber: "", cardApplicationDate: "", programCategory: "", vipCardLevel: "B1", profilePhotoName: "" })).toBe("Select a gender.");
  });
});
