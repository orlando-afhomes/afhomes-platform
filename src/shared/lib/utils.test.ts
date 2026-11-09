import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("joins conditional classes and drops falsy values", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });

  it("lets a later prefixed Tailwind utility override a conflicting earlier one", () => {
    expect(cn("tw:px-2 tw:bg-primary", "tw:px-4")).toBe("tw:bg-primary tw:px-4");
    expect(cn("tw:hover:bg-muted", "tw:hover:bg-primary")).toBe("tw:hover:bg-primary");
  });

  it("leaves unprefixed legacy class names untouched", () => {
    expect(cn("size-4", "size-8")).toBe("size-4 size-8");
  });
});
