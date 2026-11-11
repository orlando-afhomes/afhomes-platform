import { describe, expect, it } from "vitest";
import { validateLandline } from "./contact";

const METRO_MANILA_MESSAGE = "Landline must be 8 digits for Metro Manila (02).";
const PROVINCIAL_MESSAGE = "Landline must be 7 digits for this area code.";
const DOMESTIC_MESSAGE = "Landline must be 7 to 10 digits.";

describe("validateLandline", () => {
  it("never blocks an empty optional value, with or without an area code", () => {
    expect(validateLandline("")).toBeNull();
    expect(validateLandline("   ")).toBeNull();
    expect(validateLandline("", "02")).toBeNull();
    expect(validateLandline("   ", "032")).toBeNull();
  });

  it("requires exactly 8 digits for Metro Manila (02)", () => {
    expect(validateLandline("81234567", "02")).toBeNull();
    expect(validateLandline("8123456", "02")).toBe(METRO_MANILA_MESSAGE);
    expect(validateLandline("812345678", "02")).toBe(METRO_MANILA_MESSAGE);
  });

  it("treats the bare 2 as Metro Manila too", () => {
    expect(validateLandline("81234567", "2")).toBeNull();
    expect(validateLandline("8123456", "2")).toBe(METRO_MANILA_MESSAGE);
  });

  it("requires exactly 7 digits for any other area code", () => {
    expect(validateLandline("8123456", "032")).toBeNull();
    expect(validateLandline("81234567", "032")).toBe(PROVINCIAL_MESSAGE);
    expect(validateLandline("812345", "032")).toBe(PROVINCIAL_MESSAGE);
    expect(validateLandline("8123456", "035")).toBeNull();
    expect(validateLandline("81234567", "035")).toBe(PROVINCIAL_MESSAGE);
  });

  it("keeps the 7 to 10 digit domestic range without an area code", () => {
    expect(validateLandline("8123456")).toBeNull();
    expect(validateLandline("8123456789")).toBeNull();
    expect(validateLandline("812345")).toBe(DOMESTIC_MESSAGE);
    expect(validateLandline("81234567890")).toBe(DOMESTIC_MESSAGE);
    expect(validateLandline("8123456", null)).toBeNull();
    expect(validateLandline("812345", null)).toBe(DOMESTIC_MESSAGE);
  });

  it("ignores separators and formatting when counting digits", () => {
    expect(validateLandline("8-123-4567", "02")).toBeNull();
    expect(validateLandline("812-3456", "032")).toBeNull();
  });
});
