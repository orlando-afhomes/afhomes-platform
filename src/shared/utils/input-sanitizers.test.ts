import { describe, expect, it } from "vitest";
import {
  capitalizeWords,
  cleanEmailInput,
  cleanNameInput,
  cleanTitleInput,
  formatStatusLabel,
  isValidEmail,
  isValidName,
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
