import { describe, expect, it } from "vitest";
import { buttonVariants } from "./button";

const has = (variant: Parameters<typeof buttonVariants>[0], token: string) =>
  buttonVariants(variant).split(" ").includes(token);

describe("buttonVariants semantic colors", () => {
  it("success is solid green with white text", () => {
    expect(has({ variant: "success" }, "tw:bg-success")).toBe(true);
    expect(has({ variant: "success" }, "tw:text-success-foreground")).toBe(true);
  });

  it("destructive and danger are the same solid red", () => {
    expect(has({ variant: "danger" }, "tw:bg-destructive")).toBe(true);
    expect(buttonVariants({ variant: "danger" })).toBe(buttonVariants({ variant: "destructive" }));
  });

  it("warning and info are soft tints with colored text and border", () => {
    for (const name of ["warning", "info"] as const) {
      expect(has({ variant: name }, `tw:bg-${name}/10`)).toBe(true);
      expect(has({ variant: name }, `tw:text-${name}`)).toBe(true);
      expect(has({ variant: name }, `tw:border-${name}/40`)).toBe(true);
    }
  });

  it("outline is a soft brand tint and secondary is its alias", () => {
    expect(has({ variant: "outline" }, "tw:bg-primary/10")).toBe(true);
    expect(has({ variant: "outline" }, "tw:border-primary/25")).toBe(true);
    expect(buttonVariants({ variant: "outline" })).toBe(buttonVariants({ variant: "secondary" }));
  });
});
