import { describe, expect, it } from "vitest";
import { cn } from "./utils";

// Covers every shape currently passed by callers: plain strings,
// optional className props, and `condition && "class"` expressions.
describe("cn", () => {
  it("joins class strings with spaces", () => {
    expect(cn("page-header")).toBe("page-header");
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("drops false, null, and undefined", () => {
    expect(cn("page-container", undefined)).toBe("page-container");
    expect(cn("page-container", null)).toBe("page-container");
    expect(cn("nav-group__icon", false && "nav-group__icon--open")).toBe("nav-group__icon");
  });

  it("keeps conditional classes when truthy", () => {
    const open = true;
    expect(cn("nav-group__icon", open && "nav-group__icon--open")).toBe(
      "nav-group__icon nav-group__icon--open",
    );
  });

  it("returns an empty string for no values", () => {
    expect(cn()).toBe("");
    expect(cn(undefined, false, null)).toBe("");
  });
});
