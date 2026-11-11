import { describe, expect, it } from "vitest";
import { validateCustomerField, validateSecondaryField, type CustomerFieldContext } from "./field-validation";

const TODAY = "2026-11-10";

type FieldCase = {
  key: string;
  valid: string;
  invalid: string;
  message: string;
  ctx?: CustomerFieldContext;
};

/** One valid and one invalid case per primary key, using the exact canonical messages. */
const PRIMARY_CASES: FieldCase[] = [
  { key: "mobileNumber", valid: "09171234567", invalid: "0917123456", message: "Mobile number required." },
  { key: "landline", valid: "0285550100", invalid: "123", message: "Landline must be 7 to 10 digits." },
  { key: "tinNumber", valid: "123-456-789", invalid: "123", message: "TIN must be 9 or 12 digits." },
  {
    key: "governmentIdNumber",
    valid: "P1234567A",
    invalid: "123",
    message: "Enter a valid Passport number (8-9 uppercase letters and digits, starting with a letter).",
    ctx: { idType: "Passport" },
  },
  { key: "citizenship", valid: "Filipino", invalid: "Filipino123", message: "Citizenship may only contain letters, spaces, hyphens, and apostrophes." },
  { key: "email", valid: "ana@example.com", invalid: "ana@", message: "Enter a valid email address." },
  { key: "firstName", valid: "Ana", invalid: "Ana1", message: "First name required, letters only." },
  { key: "lastName", valid: "Cruz", invalid: "Cruz1", message: "Last name required, letters only." },
  { key: "middleName", valid: "Santos", invalid: "Santos1", message: "Middle name required, letters only." },
  { key: "suffix", valid: "Jr.", invalid: "Junior", message: "Suffix is invalid." },
  { key: "dateOfBirth", valid: "1991-02-03", invalid: "2999-01-01", message: "Enter a valid date of birth.", ctx: { today: TODAY } },
  { key: "postalCode", valid: "4114", invalid: "411", message: "ZIP code must be 4 digits." },
  {
    key: "street",
    valid: "123 Mabini Street",
    invalid: "A".repeat(161),
    message: "Street address must be 2 to 160 characters.",
  },
  {
    key: "occupation",
    valid: "A".repeat(120),
    invalid: "A".repeat(121),
    message: "Occupation/Business Name must be 120 characters or fewer.",
  },
  {
    key: "businessIndustry",
    valid: "Retail",
    invalid: "A".repeat(121),
    message: "Type of Business/Industry must be 120 characters or fewer.",
  },
  {
    key: "employedPosition",
    valid: "Manager",
    invalid: "A".repeat(121),
    message: "Employed Position must be 120 characters or fewer.",
  },
];

describe("validateCustomerField", () => {
  it.each(PRIMARY_CASES)("$key accepts a valid value and returns the canonical message for an invalid one", ({ key, valid, invalid, message, ctx }) => {
    expect(validateCustomerField(key, valid, ctx)).toBeNull();
    expect(validateCustomerField(key, invalid, ctx)).toBe(message);
  });

  it("requires first name, last name, and date of birth", () => {
    expect(validateCustomerField("firstName", "")).toBe("First name is required.");
    expect(validateCustomerField("lastName", "")).toBe("Last name is required.");
    expect(validateCustomerField("dateOfBirth", "", { today: TODAY })).toBe("Enter a valid date of birth.");
    expect(validateCustomerField("dateOfBirth", "1991-02-30", { today: TODAY })).toBe("Enter a valid date of birth.");
  });

  it("enforces the 80-character name cap and keeps exactly 120 business characters valid", () => {
    expect(validateCustomerField("firstName", "A".repeat(80))).toBeNull();
    expect(validateCustomerField("firstName", "A".repeat(81))).toBe("First name must be 80 characters or fewer.");
    expect(validateCustomerField("lastName", "A".repeat(81))).toBe("Last name must be 80 characters or fewer.");
    expect(validateCustomerField("occupation", "A".repeat(120))).toBeNull();
    expect(validateCustomerField("businessIndustry", "A".repeat(120))).toBeNull();
    expect(validateCustomerField("employedPosition", "A".repeat(120))).toBeNull();
  });

  it("accepts ages 0 through 120 and rejects older or future birth dates", () => {
    expect(validateCustomerField("dateOfBirth", "2026-11-10", { today: TODAY })).toBeNull();
    expect(validateCustomerField("dateOfBirth", "1906-11-10", { today: TODAY })).toBeNull();
    expect(validateCustomerField("dateOfBirth", "1905-11-10", { today: TODAY })).toBe("Enter a valid date of birth.");
    expect(validateCustomerField("dateOfBirth", "2026-11-11", { today: TODAY })).toBe("Enter a valid date of birth.");
  });

  it("returns null for empty optional fields", () => {
    const optionalKeys = [
      "middleName",
      "suffix",
      "landline",
      "tinNumber",
      "governmentIdNumber",
      "citizenship",
      "email",
      "postalCode",
      "street",
      "occupation",
      "businessIndustry",
      "employedPosition",
      "barangay",
      "province",
      "city",
    ];
    for (const key of optionalKeys) {
      expect(validateCustomerField(key, "", { today: TODAY }), key).toBeNull();
      expect(validateCustomerField(key, "   ", { today: TODAY }), key).toBeNull();
    }
  });

  it("leaves submit-only address requiredness to submit", () => {
    expect(validateCustomerField("barangay", "")).toBeNull();
    expect(validateCustomerField("province", "")).toBeNull();
    expect(validateCustomerField("city", "")).toBeNull();
  });

  it("returns null for unknown keys", () => {
    expect(validateCustomerField("nickname", "Anything")).toBeNull();
    expect(validateCustomerField("", "Anything")).toBeNull();
  });
});

describe("validateCustomerField landline area codes", () => {
  it("uses the supplied Metro Manila area code", () => {
    expect(validateCustomerField("landline", "81234567", { areaCode: "02" })).toBeNull();
    expect(validateCustomerField("landline", "8123456", { areaCode: "02" })).toBe("Landline must be 8 digits for Metro Manila (02).");
    expect(validateCustomerField("landline", "812345678", { areaCode: "2" })).toBe("Landline must be 8 digits for Metro Manila (02).");
  });

  it("uses the supplied provincial area code", () => {
    expect(validateCustomerField("landline", "8123456", { areaCode: "032" })).toBeNull();
    expect(validateCustomerField("landline", "81234567", { areaCode: "035" })).toBe("Landline must be 7 digits for this area code.");
  });

  it("keeps the 7 to 10 digit range when the context has no area code", () => {
    expect(validateCustomerField("landline", "8123456")).toBeNull();
    expect(validateCustomerField("landline", "8123456789")).toBeNull();
    expect(validateCustomerField("landline", "812345", { areaCode: null })).toBe("Landline must be 7 to 10 digits.");
  });

  it("applies the same area-code rule to the secondary landline", () => {
    expect(validateSecondaryField("landline", "8123456", { areaCode: "02" })).toBe("Landline must be 8 digits for Metro Manila (02).");
    expect(validateSecondaryField("landline", "8123456", { areaCode: "032" })).toBeNull();
    expect(validateSecondaryField("landline", "81234567", { areaCode: "032" })).toBe("Landline must be 7 digits for this area code.");
  });
});

describe("validateSecondaryField", () => {
  it("keeps every secondary field quiet while the optional profile is blank", () => {
    for (const key of ["firstName", "lastName", "mobileNumber", "dateOfBirth", "email", "postalCode", "street", "occupation"]) {
      expect(validateSecondaryField(key, ""), key).toBeNull();
    }
  });

  it("keeps secondary names optional on their own", () => {
    expect(validateSecondaryField("firstName", "")).toBeNull();
    expect(validateSecondaryField("firstName", "Ben")).toBeNull();
    expect(validateSecondaryField("lastName", "")).toBeNull();
    expect(validateSecondaryField("lastName", "Cruz")).toBeNull();
    expect(validateSecondaryField("firstName", "Ben1")).toBe("First name required, letters only.");
    expect(validateSecondaryField("lastName", "Cruz1")).toBe("Last name required, letters only.");
  });

  it("requires both first and last name once the secondary name is started", () => {
    expect(validateSecondaryField("name", "")).toBeNull();
    expect(validateSecondaryField("name", "   ")).toBeNull();
    expect(validateSecondaryField("name", "Ben")).toBe("Enter the supplementary holder's first and last name.");
    expect(validateSecondaryField("name", "Ben Cruz")).toBeNull();
    expect(validateSecondaryField("name", "Ben Santos Cruz")).toBeNull();
    expect(validateSecondaryField("name", "Ben1 Cruz")).toBe("First name required, letters only.");
    expect(validateSecondaryField("name", "Ben Cruz1")).toBe("Last name required, letters only.");
  });

  it("uses the same messages as the primary fields once a value is present", () => {
    expect(validateSecondaryField("mobileNumber", "123")).toBe("Mobile number required.");
    expect(validateSecondaryField("landline", "123")).toBe("Landline must be 7 to 10 digits.");
    expect(validateSecondaryField("tinNumber", "123")).toBe("TIN must be 9 or 12 digits.");
    expect(validateSecondaryField("governmentIdNumber", "123", { idType: "Passport" })).toBe(
      "Enter a valid Passport number (8-9 uppercase letters and digits, starting with a letter).",
    );
    expect(validateSecondaryField("citizenship", "Filipino123")).toBe(
      "Citizenship may only contain letters, spaces, hyphens, and apostrophes.",
    );
    expect(validateSecondaryField("email", "ana@")).toBe("Enter a valid email address.");
    expect(validateSecondaryField("postalCode", "411")).toBe("ZIP code must be 4 digits.");
    expect(validateSecondaryField("street", "A".repeat(161))).toBe("Street address must be 2 to 160 characters.");
    expect(validateSecondaryField("occupation", "A".repeat(121))).toBe("Occupation/Business Name must be 120 characters or fewer.");
    expect(validateSecondaryField("businessIndustry", "A".repeat(121))).toBe("Type of Business/Industry must be 120 characters or fewer.");
    expect(validateSecondaryField("employedPosition", "A".repeat(121))).toBe("Employed Position must be 120 characters or fewer.");
    expect(validateSecondaryField("suffix", "Junior")).toBe("Suffix is invalid.");
    expect(validateSecondaryField("middleName", "Santos1")).toBe("Middle name required, letters only.");
  });

  it("accepts a valid secondary birth date and rejects future or implausible ones", () => {
    expect(validateSecondaryField("dateOfBirth", "1990-01-01", { today: TODAY })).toBeNull();
    expect(validateSecondaryField("dateOfBirth", "2999-01-01", { today: TODAY })).toBe("Enter a valid date of birth.");
    expect(validateSecondaryField("dateOfBirth", "1905-11-10", { today: TODAY })).toBe("Enter a valid date of birth.");
  });

  it("returns null for unknown secondary keys", () => {
    expect(validateSecondaryField("nickname", "Anything")).toBeNull();
    expect(validateSecondaryField("", "Anything")).toBeNull();
  });
});
