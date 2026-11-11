import { describe, expect, it } from "vitest";
import { computeAge } from "@/shared/lib/dates";
import { validateCustomerForSubmit, validateSupplementaryHolder } from "./rules";
import type { CustomerDraftInput, SupplementaryHolder } from "./types";

const validInput = (overrides: Partial<CustomerDraftInput> = {}): CustomerDraftInput => ({
  displayName: "Ana Cruz",
  firstName: "Ana",
  lastName: "Cruz",
  dateOfBirth: "1991-02-03",
  gender: "Female",
  civilStatus: "Single",
  mobileNumber: "09170000001",
  address: { street: "", province: "Cavite", city: "Dasmariñas City", barangay: "Zone 1", postalCode: "" },
  vipPlan: "S1",
  paymentSchemeId: "scheme-installment-4m",
  contractClassification: "S",
  consentDataPrivacy: true,
  idReceivedCertified: true,
  ...overrides,
});

const validHolder = (overrides: Partial<SupplementaryHolder> = {}): SupplementaryHolder => ({
  firstName: "Ben",
  middleName: null,
  lastName: "Cruz",
  suffix: null,
  gender: null,
  dateOfBirth: "1990-01-01",
  ...overrides,
});

describe("computeAge", () => {
  it("returns the year difference on the exact birthday", () => {
    expect(computeAge("2000-11-10", "2026-11-10")).toBe(26);
  });

  it("subtracts one when the birthday has not occurred yet this year", () => {
    expect(computeAge("2000-11-11", "2026-11-10")).toBe(25);
    expect(computeAge("2000-01-01", "2026-11-10")).toBe(26);
  });

  it("keeps the full difference the day after the birthday", () => {
    expect(computeAge("2000-11-09", "2026-11-10")).toBe(26);
  });

  it("handles leap-day birthdays", () => {
    expect(computeAge("2000-02-29", "2024-02-29")).toBe(24);
    expect(computeAge("2000-02-29", "2024-02-28")).toBe(23);
    expect(computeAge("2000-02-29", "2023-02-28")).toBe(22);
  });

  it("returns null for invalid dates", () => {
    expect(computeAge("", "2026-11-10")).toBeNull();
    expect(computeAge("not-a-date", "2026-11-10")).toBeNull();
    expect(computeAge("2023-02-29", "2026-11-10")).toBeNull();
    expect(computeAge("1991-13-01", "2026-11-10")).toBeNull();
  });

  it("returns null when the birth date is in the future", () => {
    expect(computeAge("2030-01-01", "2026-11-10")).toBeNull();
    expect(computeAge("2026-11-11", "2026-11-10")).toBeNull();
  });

  it("returns zero when born today", () => {
    expect(computeAge("2026-11-10", "2026-11-10")).toBe(0);
  });
});

describe("customer landline and TIN format checks", () => {
  it("passes when landline and TIN are empty or omitted", () => {
    expect(validateCustomerForSubmit(validInput(), [], undefined, false)).toEqual({});
    expect(validateCustomerForSubmit(validInput({ landline: "", tinNumber: "   " }), [], undefined, false)).toEqual({});
  });

  it("passes valid landline and TIN values", () => {
    expect(validateCustomerForSubmit(validInput({ landline: "2855010", tinNumber: "123-456-789" }), [], undefined, false)).toEqual({});
    expect(validateCustomerForSubmit(validInput({ tinNumber: "123456789000" }), [], undefined, false)).toEqual({});
    expect(validateCustomerForSubmit(validInput({ tinNumber: "091-235-467-860" }), [], undefined, false)).toEqual({});
  });

  it("rejects badly formatted landline and TIN values", () => {
    expect(validateCustomerForSubmit(validInput({ landline: "123" }), [], undefined, false)).toMatchObject({
      landline: "Landline must be 7 digits for this area code.",
    });
    expect(validateCustomerForSubmit(validInput({ tinNumber: "123" }), [], undefined, false)).toMatchObject({
      tinNumber: "TIN must be 9 or 12 digits.",
    });
    expect(validateCustomerForSubmit(validInput({ tinNumber: "091-235-467-86" }), [], undefined, false)).toMatchObject({
      tinNumber: "TIN must be 9 or 12 digits.",
    });
  });
});

describe("customer landline boundaries", () => {
  it("accepts exactly 7 digits for the Cavite address and rejects 6 or 8", () => {
    expect(validateCustomerForSubmit(validInput({ landline: "2855010" }), [], undefined, false)).toEqual({});
    expect(validateCustomerForSubmit(validInput({ landline: "285501" }), [], undefined, false)).toMatchObject({
      landline: "Landline must be 7 digits for this area code.",
    });
    expect(validateCustomerForSubmit(validInput({ landline: "28550100" }), [], undefined, false)).toMatchObject({
      landline: "Landline must be 7 digits for this area code.",
    });
    expect(validateCustomerForSubmit(validInput({ landline: "2855010000" }), [], undefined, false)).toMatchObject({
      landline: "Landline must be 7 digits for this area code.",
    });
  });

  it("accepts exactly 8 digits for a Metro Manila address and rejects 7 or 9", () => {
    const metroManila = validInput({
      address: { street: "", province: "Metro Manila", city: "Quezon City", barangay: "Bagong Pag-asa", postalCode: "" },
      landline: "81234567",
    });
    expect(validateCustomerForSubmit(metroManila, [], undefined, false)).toEqual({});
    expect(validateCustomerForSubmit({ ...metroManila, landline: "8123456" }, [], undefined, false)).toMatchObject({
      landline: "Landline must be 8 digits for Metro Manila (02).",
    });
    expect(validateCustomerForSubmit({ ...metroManila, landline: "812345678" }, [], undefined, false)).toMatchObject({
      landline: "Landline must be 8 digits for Metro Manila (02).",
    });
  });

  it("accepts exactly 7 digits for a Cebu address and rejects 8", () => {
    const cebu = validInput({
      address: { street: "", province: "Cebu", city: "Cebu City", barangay: "Capitol Site (Pob.)", postalCode: "" },
      landline: "8123456",
    });
    expect(validateCustomerForSubmit(cebu, [], undefined, false)).toEqual({});
    expect(validateCustomerForSubmit({ ...cebu, landline: "81234567" }, [], undefined, false)).toMatchObject({
      landline: "Landline must be 7 digits for this area code.",
    });
  });
});

describe("customer citizenship format checks", () => {
  it("passes when citizenship is blank or well-formed", () => {
    expect(validateCustomerForSubmit(validInput(), [], undefined, false)).toEqual({});
    expect(validateCustomerForSubmit(validInput({ citizenship: "Filipino" }), [], undefined, false)).toEqual({});
    expect(validateCustomerForSubmit(validInput({ citizenship: "South African-American" }), [], undefined, false)).toEqual({});
    expect(validateCustomerForSubmit(validInput({ citizenship: "Maria Concepcion O'Neil-de la Cruz." }), [], undefined, false)).toEqual({});
    expect(validateCustomerForSubmit(validInput({ citizenship: "  Filipino  " }), [], undefined, false)).toEqual({});
  });

  it("rejects digits and special characters with the exact message", () => {
    expect(validateCustomerForSubmit(validInput({ citizenship: "Filipino123" }), [], undefined, false)).toMatchObject({
      citizenship: "Citizenship may only contain letters, spaces, hyphens, and apostrophes.",
    });
    expect(validateCustomerForSubmit(validInput({ citizenship: "Filipino!" }), [], undefined, false)).toMatchObject({
      citizenship: "Citizenship may only contain letters, spaces, hyphens, and apostrophes.",
    });
    expect(validateCustomerForSubmit(validInput({ citizenship: "Filipino/Other" }), [], undefined, false)).toMatchObject({
      citizenship: "Citizenship may only contain letters, spaces, hyphens, and apostrophes.",
    });
  });

  it("accepts exactly 80 characters and rejects 81", () => {
    expect(validateCustomerForSubmit(validInput({ citizenship: "A".repeat(80) }), [], undefined, false)).toEqual({});
    expect(validateCustomerForSubmit(validInput({ citizenship: "A".repeat(81) }), [], undefined, false)).toMatchObject({
      citizenship: "Citizenship must be 80 characters or less.",
    });
  });

  it("folds the secondary holder citizenship into the single holder key", () => {
    expect(validateSupplementaryHolder(validHolder({ citizenship: "Filipino2" }), true)).toMatchObject({
      supplementaryHolder: "Citizenship may only contain letters, spaces, hyphens, and apostrophes.",
    });
    expect(validateSupplementaryHolder(validHolder({ citizenship: "O'Brien" }), true)).toEqual({});
  });
});

describe("customer government ID per-type checks", () => {
  it("passes National ID PSN, hyphenated PSN, and 16-digit PCN forms", () => {
    expect(
      validateCustomerForSubmit(validInput({ governmentIdType: "Philippine National ID", governmentIdNumber: "123456789012" }), [], undefined, false),
    ).toEqual({});
    expect(
      validateCustomerForSubmit(validInput({ governmentIdType: "Philippine National ID", governmentIdNumber: "1234-567890-12" }), [], undefined, false),
    ).toEqual({});
    expect(
      validateCustomerForSubmit(validInput({ governmentIdType: "Philippine National ID", governmentIdNumber: "1234567890123456" }), [], undefined, false),
    ).toEqual({});
  });

  it("rejects bad and lettered National ID numbers with the exact message", () => {
    expect(
      validateCustomerForSubmit(validInput({ governmentIdType: "Philippine National ID", governmentIdNumber: "12345" }), [], undefined, false),
    ).toMatchObject({
      governmentIdNumber: "Enter a valid National ID number (12-digit PSN or 16-digit PCN).",
    });
    // The PCN is numeric; a 16-character alphanumeric code is not accepted.
    expect(
      validateCustomerForSubmit(validInput({ governmentIdType: "Philippine National ID", governmentIdNumber: "ABCD1234EFGH5678" }), [], undefined, false),
    ).toMatchObject({
      governmentIdNumber: "Enter a valid National ID number (12-digit PSN or 16-digit PCN).",
    });
  });

  it("rejects lowercase government ID numbers before the per-type checks", () => {
    expect(
      validateCustomerForSubmit(validInput({ governmentIdType: "Passport", governmentIdNumber: "p1234567a" }), [], undefined, false),
    ).toMatchObject({ governmentIdNumber: "Use uppercase letters only." });
    expect(
      validateCustomerForSubmit(validInput({ governmentIdType: "Philippine National ID", governmentIdNumber: "12345678901a" }), [], undefined, false),
    ).toMatchObject({ governmentIdNumber: "Use uppercase letters only." });
  });

  it("checks Passport and Driver's License uppercase formats", () => {
    expect(
      validateCustomerForSubmit(validInput({ governmentIdType: "Passport", governmentIdNumber: "P1234567A" }), [], undefined, false),
    ).toEqual({});
    expect(
      validateCustomerForSubmit(validInput({ governmentIdType: "Passport", governmentIdNumber: "123" }), [], undefined, false),
    ).toMatchObject({
      governmentIdNumber: "Enter a valid Passport number (8-9 uppercase letters and digits, starting with a letter).",
    });
    expect(
      validateCustomerForSubmit(validInput({ governmentIdType: "Driver's License", governmentIdNumber: "N02-11-003456" }), [], undefined, false),
    ).toEqual({});
    expect(
      validateCustomerForSubmit(validInput({ governmentIdType: "Driver's License", governmentIdNumber: "ABC" }), [], undefined, false),
    ).toMatchObject({
      governmentIdNumber: "Enter a valid Driver's License number (an uppercase letter followed by 6-11 digits).",
    });
  });

  it("enforces the per-type length boundaries", () => {
    const check = (governmentIdType: string, governmentIdNumber: string) =>
      validateCustomerForSubmit(validInput({ governmentIdType, governmentIdNumber }), [], undefined, false);
    expect(check("Philippine National ID", "A".repeat(15))).toMatchObject({
      governmentIdNumber: "Enter a valid National ID number (12-digit PSN or 16-digit PCN).",
    });
    expect(check("Passport", "P1234567")).toEqual({});
    expect(check("Passport", "P123456789")).toMatchObject({
      governmentIdNumber: "Enter a valid Passport number (8-9 uppercase letters and digits, starting with a letter).",
    });
    expect(check("Driver's License", "N123456")).toEqual({});
    expect(check("Driver's License", "N123456789012")).toMatchObject({
      governmentIdNumber: "Enter a valid Driver's License number (an uppercase letter followed by 6-11 digits).",
    });
    expect(check("SSS ID", "1234567")).toEqual({});
    expect(check("SSS ID", "123456")).toMatchObject({ governmentIdNumber: "Enter a valid SSS number (7-12 digits)." });
    expect(check("SSS ID", "AB1234567")).toMatchObject({ governmentIdNumber: "Enter a valid SSS number (7-12 digits)." });
  });

  it("keeps numeric ID rules for SSS and skips blank numbers", () => {
    expect(
      validateCustomerForSubmit(validInput({ governmentIdType: "SSS ID", governmentIdNumber: "04-1234567-8" }), [], undefined, false),
    ).toEqual({});
    expect(
      validateCustomerForSubmit(validInput({ governmentIdType: "SSS ID", governmentIdNumber: "ab" }), [], undefined, false),
    ).toMatchObject({ governmentIdNumber: "Use uppercase letters only." });
    expect(validateCustomerForSubmit(validInput({ governmentIdType: "Passport", governmentIdNumber: "" }), [], undefined, false)).toEqual({});
  });

  it("keeps the 4-40 fallback for Voter's ID and rejects disallowed characters", () => {
    expect(
      validateCustomerForSubmit(validInput({ governmentIdType: "Voter's ID", governmentIdNumber: "ABC 1234-5.6" }), [], undefined, false),
    ).toEqual({});
    expect(
      validateCustomerForSubmit(validInput({ governmentIdType: "Voter's ID", governmentIdNumber: "ABC$1234" }), [], undefined, false),
    ).toMatchObject({
      governmentIdNumber: "ID number must be 4 to 40 uppercase letters, digits, spaces, or hyphens.",
    });
  });

  it("folds the secondary holder ID check into the single holder key", () => {
    const bad = { ...validHolder(), governmentIdType: "Passport", governmentIdNumber: "12" } as SupplementaryHolder;
    expect(validateSupplementaryHolder(bad, true)).toMatchObject({
      supplementaryHolder: "Enter a valid Passport number (8-9 uppercase letters and digits, starting with a letter).",
    });
    const lowercase = { ...validHolder(), governmentIdType: "Passport", governmentIdNumber: "p1234567a" } as SupplementaryHolder;
    expect(validateSupplementaryHolder(lowercase, true)).toMatchObject({
      supplementaryHolder: "Use uppercase letters only.",
    });
    const good = { ...validHolder(), governmentIdType: "Passport", governmentIdNumber: "P1234567A" } as SupplementaryHolder;
    expect(validateSupplementaryHolder(good, true)).toEqual({});
  });
});

describe("validateSupplementaryHolder contact checks", () => {
  it("accepts a named holder with empty contact fields", () => {
    expect(validateSupplementaryHolder(validHolder(), true)).toEqual({});
    expect(validateSupplementaryHolder(validHolder({ landline: "", tinNumber: "" }), true)).toEqual({});
  });

  it("rejects badly formatted holder email, landline, and TIN under one key", () => {
    const badEmail = { ...validHolder(), email: "not-an-email" } as SupplementaryHolder;
    expect(validateSupplementaryHolder(badEmail, true)).toMatchObject({ supplementaryHolder: "Enter a valid email address." });
    expect(validateSupplementaryHolder(validHolder({ landline: "12" }), true)).toMatchObject({
      supplementaryHolder: "Landline must be 7 to 10 digits.",
    });
    expect(validateSupplementaryHolder(validHolder({ tinNumber: "12" }), true)).toMatchObject({
      supplementaryHolder: "TIN must be 9 or 12 digits.",
    });
  });

  it("keeps the name and birth-date rules intact", () => {
    expect(validateSupplementaryHolder(validHolder({ firstName: "" }), true)).toMatchObject({
      supplementaryHolder: "Enter the supplementary holder's first and last name.",
    });
    expect(validateSupplementaryHolder(validHolder({ dateOfBirth: "2999-01-01" }), true)).toMatchObject({
      supplementaryHolder: "The supplementary holder's birth date must be in the past.",
    });
    expect(validateSupplementaryHolder(validHolder(), false)).toMatchObject({
      supplementaryHolder: "The selected VIP plan does not allow a supplementary holder.",
    });
  });
});
