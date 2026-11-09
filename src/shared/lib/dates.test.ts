import { describe, expect, it } from "vitest";
import { manilaDateOf } from "./dates";

describe("manilaDateOf", () => {
  it("keeps a date-only value", () => {
    expect(manilaDateOf("2026-11-09")).toBe("2026-11-09");
  });

  it("moves a late-evening UTC timestamp to the next Manila day", () => {
    expect(manilaDateOf("2026-11-09T23:30:00.000Z")).toBe("2026-11-10");
    expect(manilaDateOf("2026-11-09T15:59:59.000Z")).toBe("2026-11-09");
  });
});
