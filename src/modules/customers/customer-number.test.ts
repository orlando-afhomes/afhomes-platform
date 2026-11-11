import { afterEach, describe, expect, it, vi } from "vitest";
import { manilaToday } from "@/shared/lib/dates";
import {
  CUSTOMER_ID_PATTERN,
  currentManilaYear,
  formatCustomerId,
  nextCustomerId,
  parseCustomerId,
  validateCustomerId,
} from "./customer-number";
import type { CustomerDraftInput } from "./types";

describe("formatCustomerId", () => {
  it("pads the sequence to four digits", () => {
    expect(formatCustomerId(2026, 1)).toBe("2026-0001");
    expect(formatCustomerId(2026, 42)).toBe("2026-0042");
    expect(formatCustomerId(2026, 999)).toBe("2026-0999");
  });

  it("keeps an already four-digit sequence and does not truncate a longer one", () => {
    expect(formatCustomerId(2026, 9999)).toBe("2026-9999");
    expect(formatCustomerId(2026, 10000)).toBe("2026-10000");
  });

  it("accepts the year as a string", () => {
    expect(formatCustomerId("2026", 7)).toBe("2026-0007");
  });
});

describe("parseCustomerId", () => {
  it("returns the year and sequence parts", () => {
    expect(parseCustomerId("2026-0001")).toEqual({ year: "2026", sequence: "0001" });
    expect(parseCustomerId("1999-9999")).toEqual({ year: "1999", sequence: "9999" });
  });

  it("ignores surrounding whitespace", () => {
    expect(parseCustomerId(" 2026-0001 ")).toEqual({ year: "2026", sequence: "0001" });
  });

  it("rejects null, empty and malformed values", () => {
    for (const value of [null, undefined, "", "   ", "2026-1", "2026-00001", "26-0001", "2026/0001", "2026-00A1", "ABCD-0001", "2026-0001-1"]) {
      expect(parseCustomerId(value)).toBeNull();
    }
  });
});

describe("nextCustomerId", () => {
  it("starts at 0001 when the year has no issued IDs", () => {
    expect(nextCustomerId([], 2026)).toBe("2026-0001");
    expect(nextCustomerId([{ customerNumber: null }, {}], 2026)).toBe("2026-0001");
  });

  it("uses the highest sequence for the year and tolerates gaps", () => {
    expect(
      nextCustomerId([{ customerNumber: "2026-0001" }, { customerNumber: "2026-0007" }, { customerNumber: "2026-0003" }], 2026),
    ).toBe("2026-0008");
  });

  it("ignores other years and malformed values", () => {
    expect(
      nextCustomerId(
        [
          { customerNumber: "2025-0999" },
          { customerNumber: "2027-0500" },
          { customerNumber: "2026-0004" },
          { customerNumber: "2026-99" },
          { customerNumber: "CUST-9001" },
          { customerNumber: " 2026-0002 " },
        ],
        2026,
      ),
    ).toBe("2026-0005");
  });

  it("accepts the year as a number or string", () => {
    const existing = [{ customerNumber: "2026-0005" }];
    expect(nextCustomerId(existing, 2026)).toBe("2026-0006");
    expect(nextCustomerId(existing, "2026")).toBe("2026-0006");
  });

  it("throws when the year's sequence is exhausted instead of wrapping", () => {
    expect(() => nextCustomerId([{ customerNumber: "2026-9999" }], 2026)).toThrow("The Customer ID sequence for 2026 is exhausted.");
    expect(() => nextCustomerId([{ customerNumber: "2026-9998" }, { customerNumber: "2026-9999" }], "2026")).toThrow(
      "The Customer ID sequence for 2026 is exhausted.",
    );
  });
});

describe("validateCustomerId", () => {
  it("returns null for a correctly formatted, unused ID", () => {
    expect(validateCustomerId("2026-0001", [])).toBeNull();
    expect(validateCustomerId("2026-0001", [{ id: "c2", customerNumber: "2026-0002" }])).toBeNull();
  });

  it("returns the format message for malformed values", () => {
    for (const value of ["", "2026-1", "26-0001", "2026/0001", "ABCD-0001", "2026-0001-2"]) {
      expect(validateCustomerId(value, [])).toBe("Customer ID must use the format YYYY-NNNN, for example 2026-0001.");
    }
  });

  it("detects duplicates case- and whitespace-insensitively", () => {
    const existing = [{ id: "c1", customerNumber: " 2026-0001 " }];
    expect(validateCustomerId("2026-0001", existing)).toBe("This Customer ID is already in use.");
    expect(validateCustomerId(" 2026-0001 ", existing)).toBe("This Customer ID is already in use.");
  });

  it("does not report the customer's own ID as a duplicate", () => {
    const existing = [{ id: "c1", customerNumber: "2026-0001" }];
    expect(validateCustomerId("2026-0001", existing, "c1")).toBeNull();
    expect(validateCustomerId("2026-0001", existing, "c2")).toBe("This Customer ID is already in use.");
  });
});

describe("currentManilaYear", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("matches the year of the Asia/Manila business date", () => {
    expect(currentManilaYear()).toBe(manilaToday().slice(0, 4));
    expect(currentManilaYear()).toMatch(/^\d{4}$/);
  });

  it("uses Manila, not UTC, across the New Year boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-31T15:30:00Z"));
    expect(currentManilaYear()).toBe("2025");
    vi.setSystemTime(new Date("2025-12-31T16:30:00Z"));
    expect(currentManilaYear()).toBe("2026");
  });
});

describe("customer draft fields", () => {
  it("exposes referrerMemberId and customerIdMode on CustomerDraftInput", () => {
    const draft: CustomerDraftInput = { displayName: "Ana Cruz", referrerMemberId: "member-ost-1", customerIdMode: "auto" };
    expect(draft.referrerMemberId).toBe("member-ost-1");
    expect(draft.customerIdMode).toBe("auto");
  });

  it("keeps the documented Customer ID pattern", () => {
    expect(CUSTOMER_ID_PATTERN.test("2026-0001")).toBe(true);
    expect(CUSTOMER_ID_PATTERN.test("2026-10000")).toBe(false);
  });
});
