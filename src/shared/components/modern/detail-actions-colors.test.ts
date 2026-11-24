import { describe, expect, it } from "vitest";
import { actionMenuClass, buttonVariants, isDestructiveAction } from "@/shared/ui/button";

describe("action colors", () => {
  it("keeps print, export and download distinct in both buttons and menus", () => {
    const variants = ["info", "teal", "cyan"] as const;
    expect(new Set(variants.map((variant) => buttonVariants({ variant }))).size).toBe(3);
    expect(new Set(variants.map(actionMenuClass)).size).toBe(3);
    expect(variants.every((variant) => Boolean(actionMenuClass(variant)))).toBe(true);
  });

  it("recognizes both destructive aliases and burgundy in overflow menus", () => {
    expect(["danger", "destructive", "burgundy"].every(isDestructiveAction)).toBe(true);
    expect(isDestructiveAction("rose")).toBe(false);
  });
});
