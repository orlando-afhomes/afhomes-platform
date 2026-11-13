import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./safe-return-path";

describe("safeReturnPath", () => {
  it("keeps same-origin admin paths", () => {
    expect(safeReturnPath("/admin")).toBe("/admin");
    expect(safeReturnPath("/admin/customers/c1?tab=a#x")).toBe("/admin/customers/c1?tab=a#x");
  });

  it.each([
    "https://evil.com/admin",
    "//evil.com/admin",
    "/\\evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
    "/admin\\..\\x",
    "/administrator",
    "/login",
    "admin",
    "/admin\n/x",
    "",
  ])("rejects %j", (value) => {
    expect(safeReturnPath(value)).toBe("/admin");
  });

  it("falls back for null and undefined", () => {
    expect(safeReturnPath(null)).toBe("/admin");
    expect(safeReturnPath(undefined, "/x")).toBe("/x");
  });
});
