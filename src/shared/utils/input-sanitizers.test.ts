import { describe, expect, it } from "vitest";
import {
  capitalizeAfterSpace,
  capitalizeWords,
  cleanBusinessInput,
  cleanBusinessLiveInput,
  cleanEmailInput,
  cleanNameInput,
  cleanOccupationInput,
  cleanOccupationLiveInput,
  cleanStreetInput,
  cleanTitleInput,
  formatStatusLabel,
  govIdMaxLengthFor,
  govIdPolicyFor,
  isValidEmail,
  isValidLandline,
  isValidName,
  landlineDigitRange,
  MAX_GOV_ID_LENGTH,
  MAX_STREET_TEXT,
  normalizeTin,
  uppercaseGovId,
} from "./input-sanitizers";

describe("input sanitizers", () => {
  it("strips non-name characters", () => {
    expect(cleanNameInput("HR123 Staff!")).toBe("HR Staff");
    expect(cleanNameInput("Finance@#")).toBe("Finance");
  });

  it("capitalizes each word", () => {
    expect(capitalizeWords("human resources")).toBe("Human Resources");
    expect(capitalizeWords("o'brien-smith")).toBe("O'Brien-Smith");
    expect(cleanTitleInput("hr3 st@aff")).toBe("Hr Staff");
  });

  it("validates names", () => {
    expect(isValidName("Human Resources")).toBe(true);
    expect(isValidName("O'Brien")).toBe(true);
    expect(isValidName("123")).toBe(false);
    expect(isValidName("")).toBe(false);
  });

  it("lowercases and de-spaces emails, then validates", () => {
    expect(cleanEmailInput("John.Doe@AFHOMES.Local ")).toBe("john.doe@afhomes.local");
    expect(isValidEmail("john@afhomes.local")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("missing@tld")).toBe(false);
  });

  it("formats status labels with a capital first letter", () => {
    expect(formatStatusLabel("active")).toBe("Active");
    expect(formatStatusLabel("deactivated")).toBe("Deactivated");
    expect(formatStatusLabel("suspended")).toBe("Suspended");
  });
});

describe("occupation and business cleaners", () => {
  it("strips non-allowlist characters and collapses whitespace", () => {
    expect(cleanOccupationInput("HR123 Staff!")).toBe("HR Staff");
    expect(cleanOccupationInput("owner /  manager")).toBe("Owner / Manager");
    expect(cleanBusinessInput("ACME@Corp!")).toBe("ACMECorp");
  });

  it("capitalizes every word while preserving acronyms and brand casing", () => {
    expect(cleanOccupationInput("hr staff")).toBe("Hr Staff");
    expect(cleanOccupationInput("SM manager")).toBe("SM Manager");
    expect(cleanOccupationInput("o'brien-smith")).toBe("O'Brien-Smith");
    expect(cleanBusinessInput("s&r trading, inc. (manila)")).toBe("S&r Trading, Inc. (manila)");
    expect(cleanBusinessInput("7-eleven store")).toBe("7-Eleven Store");
  });

  it("keeps business punctuation but strips it from work roles", () => {
    expect(cleanBusinessInput("S&R Trading, Inc. (Manila) 123")).toBe("S&R Trading, Inc. (Manila) 123");
    expect(cleanOccupationInput("S&R manager")).toBe("SR Manager");
    expect(cleanOccupationInput("senior software engineer (remote)")).toBe("Senior Software Engineer Remote");
  });

  it("trims to empty when nothing valid remains", () => {
    expect(cleanOccupationInput("   ")).toBe("");
    expect(cleanBusinessInput("@@$$")).toBe("");
  });

  it("accepts # in business names", () => {
    expect(cleanBusinessInput("@#$")).toBe("#");
    expect(cleanBusinessInput("S&R Trading #5 ")).toBe("S&R Trading #5");
  });

  it("keeps a single interior space and a trailing space while typing an occupation", () => {
    expect(cleanOccupationLiveInput("project manager")).toBe("Project Manager");
    expect(cleanOccupationLiveInput("project  manager")).toBe("Project Manager");
    expect(cleanOccupationLiveInput("project manager ")).toBe("Project Manager ");
  });

  it("keeps a trailing space and accepts # while typing a business name", () => {
    expect(cleanBusinessLiveInput("S&R Trading #5 ")).toBe("S&R Trading #5 ");
    expect(cleanBusinessLiveInput("Shop@ #5")).toBe("Shop #5");
    expect(cleanBusinessLiveInput("ACME  Corp")).toBe("ACME Corp");
  });
});

describe("capitalizeAfterSpace", () => {
  it("capitalizes every word start while preserving acronyms", () => {
    expect(capitalizeAfterSpace("HR manager")).toBe("HR Manager");
    expect(capitalizeAfterSpace("SM manager on duty")).toBe("SM Manager On Duty");
    expect(capitalizeAfterSpace("s&r trading")).toBe("S&r Trading");
  });

  it("capitalizes word starts after hyphens, apostrophes, and periods", () => {
    expect(capitalizeAfterSpace("o'brien-smith")).toBe("O'Brien-Smith");
    expect(capitalizeAfterSpace("7-eleven store")).toBe("7-Eleven Store");
    expect(capitalizeAfterSpace("saint.mary road")).toBe("Saint.Mary Road");
  });

  it("leaves the remaining letters of each word exactly as typed", () => {
    expect(capitalizeAfterSpace("mcArthur street")).toBe("McArthur Street");
    expect(capitalizeAfterSpace("eCommerce manager")).toBe("ECommerce Manager");
  });

  it("never trims, so a trailing space survives live typing", () => {
    expect(capitalizeAfterSpace("project manager ")).toBe("Project Manager ");
    expect(capitalizeAfterSpace("project manager  ")).toBe("Project Manager  ");
  });
});

describe("cleanStreetInput", () => {
  it("strips characters outside the street allowlist", () => {
    expect(cleanStreetInput("123 Mabini St!@")).toBe("123 Mabini St");
    expect(cleanStreetInput("<123> Mabini; St")).toBe("123 Mabini St");
  });

  it("keeps commas, number signs, ampersands, parentheses, and hyphens", () => {
    expect(cleanStreetInput("unit 4-b, lot #12 & co.")).toBe("Unit 4-B, Lot #12 & Co.");
  });

  it("capitalizes every word", () => {
    expect(cleanStreetInput("blk 5 lot 2 mabini st")).toBe("Blk 5 Lot 2 Mabini St");
    expect(cleanStreetInput("o'brien-subd.")).toBe("O'Brien-Subd.");
  });

  it("collapses repeated whitespace but preserves a trailing space while typing", () => {
    expect(cleanStreetInput("123  mabini   st")).toBe("123 Mabini St");
    expect(cleanStreetInput("123 mabini st ")).toBe("123 Mabini St ");
  });

  it("caps the street line at 160 characters", () => {
    expect(MAX_STREET_TEXT).toBe(160);
    const capped = cleanStreetInput("a".repeat(200));
    expect(capped).toHaveLength(MAX_STREET_TEXT);
    expect(capped).toBe(`A${"a".repeat(MAX_STREET_TEXT - 1)}`);
  });

  it("types the subdivision inline in the street line", () => {
    expect(cleanStreetInput("lot 2 bf homes subdivision")).toBe("Lot 2 Bf Homes Subdivision");
  });
});

describe("normalizeTin", () => {
  it("keeps undefined and null as they are", () => {
    expect(normalizeTin(undefined)).toBeUndefined();
    expect(normalizeTin(null)).toBeNull();
  });

  it("strips formatting and turns blank into null", () => {
    expect(normalizeTin("123-456-789")).toBe("123456789");
    expect(normalizeTin("123-456-789-000")).toBe("123456789000");
    expect(normalizeTin("")).toBeNull();
    expect(normalizeTin(" - ")).toBeNull();
  });
});

describe("uppercaseGovId", () => {
  it("uppercases lowercase input", () => {
    expect(uppercaseGovId("p1234567a")).toBe("P1234567A");
    expect(uppercaseGovId("ab12cd")).toBe("AB12CD");
  });

  it("strips symbols outside letters, digits, spaces, periods, and hyphens", () => {
    expect(uppercaseGovId("p-12 34.5#@$_")).toBe("P-12 34.5");
    expect(uppercaseGovId("AB$12/CD")).toBe("AB12CD");
  });

  it("preserves separators in both policies", () => {
    expect(uppercaseGovId("12-34 56.78", "numeric")).toBe("12-34 56.78");
    expect(uppercaseGovId("p-12 34.5", "alphanumeric")).toBe("P-12 34.5");
  });

  it("drops every letter under the numeric policy", () => {
    expect(uppercaseGovId("A1b2C3", "numeric")).toBe("123");
    expect(uppercaseGovId("ab-cd 12", "numeric")).toBe("- 12");
    expect(uppercaseGovId("N02-11-003456", "numeric")).toBe("02-11-003456");
  });

  it("keeps letters under the alphanumeric policy by default", () => {
    expect(uppercaseGovId("pass123")).toBe("PASS123");
    expect(uppercaseGovId("pass123", "alphanumeric")).toBe("PASS123");
  });

  it("treats a non-string or blank value as empty", () => {
    expect(uppercaseGovId("")).toBe("");
    expect(uppercaseGovId(null as unknown as string)).toBe("");
    expect(uppercaseGovId(undefined as unknown as string)).toBe("");
  });
});

describe("govIdPolicyFor", () => {
  it("uses the alphanumeric policy for Digital National ID before National ID", () => {
    expect(govIdPolicyFor("Digital National ID")).toBe("alphanumeric");
    expect(govIdPolicyFor("digital national id")).toBe("alphanumeric");
    expect(govIdPolicyFor("  DIGITAL NATIONAL ID  ")).toBe("alphanumeric");
  });

  it("uses the numeric policy for National ID and digit-only ID types", () => {
    for (const idType of ["Philippine National ID", "National ID", "TIN", "SSS ID", "GSIS ID", "UMID", "PRC ID"]) {
      expect(govIdPolicyFor(idType), idType).toBe("numeric");
    }
  });

  it("uses the alphanumeric policy for letter-bearing and unknown ID types", () => {
    for (const idType of ["Passport", "Driver's License", "Voter's ID", "Postal ID", "Other"]) {
      expect(govIdPolicyFor(idType), idType).toBe("alphanumeric");
    }
  });

  it("defaults to alphanumeric for missing or blank ID types", () => {
    expect(govIdPolicyFor()).toBe("alphanumeric");
    expect(govIdPolicyFor(undefined)).toBe("alphanumeric");
    expect(govIdPolicyFor(null)).toBe("alphanumeric");
    expect(govIdPolicyFor("")).toBe("alphanumeric");
    expect(govIdPolicyFor("   ")).toBe("alphanumeric");
  });
});

describe("landlineDigitRange", () => {
  it("requires exactly 8 digits for Metro Manila in either spelling", () => {
    expect(landlineDigitRange("02")).toEqual({ min: 8, max: 8 });
    expect(landlineDigitRange("2")).toEqual({ min: 8, max: 8 });
  });

  it("requires exactly 7 digits for provincial area codes", () => {
    expect(landlineDigitRange("032")).toEqual({ min: 7, max: 7 });
    expect(landlineDigitRange("035")).toEqual({ min: 7, max: 7 });
  });

  it("keeps the legacy 7 to 10 range when no area code is supplied", () => {
    expect(landlineDigitRange()).toEqual({ min: 7, max: 10 });
    expect(landlineDigitRange("")).toEqual({ min: 7, max: 10 });
    expect(landlineDigitRange(null)).toEqual({ min: 7, max: 10 });
  });

  it("ignores surrounding whitespace when reading the area code", () => {
    expect(landlineDigitRange(" 02 ")).toEqual({ min: 8, max: 8 });
    expect(landlineDigitRange(" 032 ")).toEqual({ min: 7, max: 7 });
  });
});

describe("isValidLandline", () => {
  it("accepts exactly 8 digits under Metro Manila and rejects 7 or 9", () => {
    expect(isValidLandline("81234567", "02")).toBe(true);
    expect(isValidLandline("8123456", "02")).toBe(false);
    expect(isValidLandline("812345678", "02")).toBe(false);
  });

  it("accepts exactly 7 digits under a provincial code and rejects 8", () => {
    expect(isValidLandline("8123456", "032")).toBe(true);
    expect(isValidLandline("81234567", "032")).toBe(false);
    expect(isValidLandline("8123456", "035")).toBe(true);
  });

  it("keeps the 7 to 10 digit range without an area code", () => {
    expect(isValidLandline("8123456")).toBe(true);
    expect(isValidLandline("8123456789")).toBe(true);
    expect(isValidLandline("812345")).toBe(false);
    expect(isValidLandline("81234567890")).toBe(false);
  });

  it("counts the raw digits so separators do not inflate or deflate the length", () => {
    expect(isValidLandline("8-123-4567", "02")).toBe(true);
    expect(isValidLandline("812-3456", "032")).toBe(true);
  });
});

describe("govIdMaxLengthFor", () => {
  it("caps the Digital National ID at 6 before National ID at 16", () => {
    expect(govIdMaxLengthFor("Digital National ID")).toBe(6);
    expect(govIdMaxLengthFor("Philippine National ID")).toBe(16);
    expect(govIdMaxLengthFor("National ID")).toBe(16);
  });

  it("caps Passport, Driver's License, TIN, and the digit-only IDs", () => {
    expect(govIdMaxLengthFor("Passport")).toBe(12);
    expect(govIdMaxLengthFor("Driver's License")).toBe(14);
    expect(govIdMaxLengthFor("TIN")).toBe(15);
    for (const idType of ["SSS ID", "GSIS ID", "UMID", "PRC ID"]) {
      expect(govIdMaxLengthFor(idType), idType).toBe(14);
    }
  });

  it("falls back to the shared 40-character cap for other or blank ID types", () => {
    for (const idType of ["Voter's ID", "Postal ID", "Other", "", "   "]) {
      expect(govIdMaxLengthFor(idType), idType).toBe(MAX_GOV_ID_LENGTH);
    }
    expect(govIdMaxLengthFor()).toBe(MAX_GOV_ID_LENGTH);
    expect(govIdMaxLengthFor(undefined)).toBe(MAX_GOV_ID_LENGTH);
    expect(govIdMaxLengthFor(null)).toBe(MAX_GOV_ID_LENGTH);
  });
});
