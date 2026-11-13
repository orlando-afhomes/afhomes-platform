import { describe, expect, it } from "vitest";
import { matchesSearch, optionsFrom } from "./search";

describe("matchesSearch", () => {
  it("matches everything when the search is empty", () => {
    expect(matchesSearch("  ", "anything")).toBe(true);
  });
  it("matches any value case-insensitively and ignores empty values", () => {
    expect(matchesSearch("ana", null, "Ana Reyes")).toBe(true);
    expect(matchesSearch("zed", undefined, "Ana Reyes")).toBe(false);
  });
});

describe("optionsFrom", () => {
  it("adds an all option and de-duplicates sorted values", () => {
    expect(optionsFrom("All tiers", ["S1", "B1", "S1", null]).map((option) => option.value)).toEqual(["all", "B1", "S1"]);
  });
});
