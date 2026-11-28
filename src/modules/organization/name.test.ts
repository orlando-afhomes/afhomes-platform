import { describe, expect, it } from "vitest";
import { composeDisplayName, splitDisplayName } from "./name";

describe("splitDisplayName", () => {
  it("splits a two-part name into first and last", () => {
    expect(splitDisplayName("Orlando Dela Cruz")).toEqual({ first: "Orlando", middle: "", last: "Dela Cruz" });
  });

  it("splits a three-part name into first, middle and last", () => {
    expect(splitDisplayName("Ana Maria Santos")).toEqual({ first: "Ana", middle: "Maria", last: "Santos" });
  });

  it("keeps extra middle words together", () => {
    expect(splitDisplayName("Jose Rizal del Rosario Cruz")).toEqual({ first: "Jose", middle: "Rizal del Rosario", last: "Cruz" });
  });

  it("handles a blank name", () => {
    expect(splitDisplayName("")).toEqual({ first: "", middle: "", last: "" });
  });
});

describe("composeDisplayName", () => {
  it("composes first, middle, last and suffix", () => {
    expect(composeDisplayName({ firstName: "Ana", middleName: "Maria", lastName: "Santos", suffix: "Jr." })).toBe("Ana Maria Santos Jr.");
  });

  it("omits the middle name when noMiddleName is set", () => {
    expect(composeDisplayName({ firstName: "Orlando", middleName: "Maria", lastName: "Dela Cruz", noMiddleName: true })).toBe("Orlando Dela Cruz");
  });

  it("omits blank parts", () => {
    expect(composeDisplayName({ firstName: "Orlando", lastName: "Dela Cruz", suffix: null })).toBe("Orlando Dela Cruz");
  });
});
