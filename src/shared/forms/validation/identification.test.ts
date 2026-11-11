import { describe, expect, it } from "vitest";
import { validateGovIdNumber } from "./identification";

const LOWERCASE_MESSAGE = "Use uppercase letters only.";
const NATIONAL_MESSAGE = "Enter a valid National ID number (12-digit PSN or 16-digit PCN).";
const PASSPORT_MESSAGE = "Enter a valid Passport number (8-9 uppercase letters and digits, starting with a letter).";
const DRIVERS_LICENSE_MESSAGE = "Enter a valid Driver's License number (an uppercase letter followed by 6-11 digits).";
const DIGITAL_NATIONAL_MESSAGE = "Enter a valid Digital National ID (6 uppercase letters and digits).";
const OTHER_MESSAGE = "ID number must be 4 to 40 uppercase letters, digits, spaces, or hyphens.";

describe("validateGovIdNumber requiredness", () => {
  it("requires a value and treats blank as missing", () => {
    expect(validateGovIdNumber("")).toBe("ID number required.");
    expect(validateGovIdNumber("   ")).toBe("ID number required.");
    expect(validateGovIdNumber("", "Passport")).toBe("ID number required.");
  });

  it("rejects lowercase letters for every known and unknown ID type", () => {
    for (const idType of [
      "Digital National ID",
      "Philippine National ID",
      "National ID",
      "Passport",
      "Driver's License",
      "TIN",
      "SSS ID",
      "GSIS ID",
      "UMID",
      "PRC ID",
      "Voter's ID",
      "Postal ID",
      "Other",
      undefined,
      "",
    ]) {
      expect(validateGovIdNumber("ab12", idType), idType ?? "no type").toBe(LOWERCASE_MESSAGE);
    }
  });

  it("rejects any lowercase letter even when the rest of the number is valid", () => {
    expect(validateGovIdNumber("P1234567a", "Passport")).toBe(LOWERCASE_MESSAGE);
    expect(validateGovIdNumber("12345678901a", "Philippine National ID")).toBe(LOWERCASE_MESSAGE);
  });
});

describe("validateGovIdNumber digital national ID", () => {
  it("accepts exactly six uppercase letters and digits", () => {
    for (const value of ["AB12CD", "ABCDEF", "123456", "A1B2C3"]) {
      expect(validateGovIdNumber(value, "Digital National ID"), value).toBeNull();
    }
    expect(validateGovIdNumber("AB-12 CD", "Digital National ID")).toBeNull();
  });

  it("rejects shorter, longer, or non-alphanumeric codes with the exact message", () => {
    for (const value of ["AB12C", "AB12CD7", "AB12C!", "AB 12"]) {
      expect(validateGovIdNumber(value, "Digital National ID"), value).toBe(DIGITAL_NATIONAL_MESSAGE);
    }
  });

  it("matches the digital type before the national type", () => {
    expect(validateGovIdNumber("AB12CD", "digital national id")).toBeNull();
    expect(validateGovIdNumber("ABCD1234EFGH5678", "Digital National ID")).toBe(DIGITAL_NATIONAL_MESSAGE);
  });
});

describe("validateGovIdNumber national ID", () => {
  it("accepts a 12-digit PSN or a 16-digit PCN, with or without separators", () => {
    expect(validateGovIdNumber("123456789012", "Philippine National ID")).toBeNull();
    expect(validateGovIdNumber("1234-567890-12", "Philippine National ID")).toBeNull();
    expect(validateGovIdNumber("1234 5678 9012", "National ID")).toBeNull();
    expect(validateGovIdNumber("1234567890123456", "Philippine National ID")).toBeNull();
    expect(validateGovIdNumber("1234-5678-9012-3456", "Philippine National ID")).toBeNull();
  });

  it("rejects 16 alphanumeric letters because the PCN is numeric", () => {
    expect(validateGovIdNumber("ABCD1234EFGH5678", "Philippine National ID")).toBe(NATIONAL_MESSAGE);
    expect(validateGovIdNumber("123456789012345A", "Philippine National ID")).toBe(NATIONAL_MESSAGE);
  });

  it("rejects other digit lengths with the exact message", () => {
    for (const value of ["12345678901", "1234567890123", "123456789012345", "A".repeat(12)]) {
      expect(validateGovIdNumber(value, "Philippine National ID"), value).toBe(NATIONAL_MESSAGE);
    }
  });
});

describe("validateGovIdNumber passport", () => {
  it("accepts 8 or 9 characters starting with an uppercase letter", () => {
    for (const value of ["P1234567", "P12345678", "P1234567A", "AB123456"]) {
      expect(validateGovIdNumber(value, "Passport"), value).toBeNull();
    }
    expect(validateGovIdNumber("P-123 4567", "Passport")).toBeNull();
  });

  it("rejects a leading digit or a length outside 8-9 with the exact message", () => {
    for (const value of ["12345678", "P123456", "P123456789", "P1234567890", "9A123456"]) {
      expect(validateGovIdNumber(value, "Passport"), value).toBe(PASSPORT_MESSAGE);
    }
  });
});

describe("validateGovIdNumber driver's license", () => {
  it("accepts an uppercase letter followed by 6 to 11 digits", () => {
    for (const value of ["N123456", "N12345678901", "N02-11-003456", "N02 11 003456"]) {
      expect(validateGovIdNumber(value, "Driver's License"), value).toBeNull();
    }
  });

  it("rejects a missing leading letter, short digits, or too many digits", () => {
    for (const value of ["1234567", "N12345", "NN123456", "N123456789012", "N1234567890A"]) {
      expect(validateGovIdNumber(value, "Driver's License"), value).toBe(DRIVERS_LICENSE_MESSAGE);
    }
  });
});

describe("validateGovIdNumber TIN", () => {
  it("accepts 9 or 12 digits", () => {
    expect(validateGovIdNumber("123456789", "TIN")).toBeNull();
    expect(validateGovIdNumber("123-456-789", "TIN")).toBeNull();
    expect(validateGovIdNumber("123456789000", "TIN")).toBeNull();
    expect(validateGovIdNumber("123-456-789-000", "TIN")).toBeNull();
  });

  it("rejects other lengths or letters with the exact message", () => {
    for (const value of ["12345678", "1234567890", "12345678901", "1234567890123", "A12345678"]) {
      expect(validateGovIdNumber(value, "TIN"), value).toBe("TIN must be 9 or 12 digits.");
    }
  });
});

describe("validateGovIdNumber digit-only ID types", () => {
  const DIGIT_TYPES: ReadonlyArray<{ idType: string; label: string }> = [
    { idType: "SSS ID", label: "SSS" },
    { idType: "GSIS ID", label: "GSIS" },
    { idType: "UMID", label: "UMID" },
    { idType: "PRC ID", label: "PRC" },
  ];

  it.each(DIGIT_TYPES)("$idType accepts 7 to 12 digits", ({ idType }) => {
    expect(validateGovIdNumber("1234567", idType)).toBeNull();
    expect(validateGovIdNumber("123456789012", idType)).toBeNull();
    expect(validateGovIdNumber("12-345678-9012", idType)).toBeNull();
  });

  it.each(DIGIT_TYPES)("$idType rejects letters and out-of-range lengths with its message", ({ idType, label }) => {
    const message = `Enter a valid ${label} number (7-12 digits).`;
    for (const value of ["123456", "1234567890123", "A1234567", "1234567B", "AB12"]) {
      expect(validateGovIdNumber(value, idType), `${idType}: ${value}`).toBe(message);
    }
  });
});

describe("validateGovIdNumber fallback types", () => {
  const FALLBACK_TYPES = ["Voter's ID", "Postal ID", "Other", "", undefined];

  it.each(FALLBACK_TYPES)("accepts 4 to 40 uppercase letters, digits, spaces, periods, and hyphens for %s", (idType) => {
    expect(validateGovIdNumber("ABCD", idType)).toBeNull();
    expect(validateGovIdNumber("ABC 1234-5.6", idType)).toBeNull();
    expect(validateGovIdNumber("A".repeat(40), idType)).toBeNull();
  });

  it.each(FALLBACK_TYPES)("rejects too short, too long, or disallowed characters for %s", (idType) => {
    for (const value of ["ABC", "A".repeat(41), "ABC$1234", "ABC/1234"]) {
      expect(validateGovIdNumber(value, idType), `${idType}: ${value}`).toBe(OTHER_MESSAGE);
    }
  });
});

describe("validateGovIdNumber type matching", () => {
  it("trims and lowercases the type before matching", () => {
    expect(validateGovIdNumber("P123456", "  PASSPORT  ")).toBe(PASSPORT_MESSAGE);
    expect(validateGovIdNumber("1234567", "  sss id  ")).toBeNull();
    expect(validateGovIdNumber("AB12C", "  digital national id  ")).toBe(DIGITAL_NATIONAL_MESSAGE);
  });

  it("keeps the single-argument fallback unchanged", () => {
    expect(validateGovIdNumber("ABC123")).toBeNull();
    expect(validateGovIdNumber("ABC")).toBe(OTHER_MESSAGE);
    expect(validateGovIdNumber("abc123")).toBe(LOWERCASE_MESSAGE);
  });
});
