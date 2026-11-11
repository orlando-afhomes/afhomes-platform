import { describe, expect, it } from "vitest";
import { PAYMENT_METHODS } from "@/modules/finance/types";
import {
  cleanReferenceNumber,
  REFERENCE_LIMITS,
  referencePolicyFor,
  validateReferenceNumber,
  type ReferencePolicy,
} from "./reference-number";

const DIGITAL_MESSAGE =
  "E-wallet references must be 12 to 16 letters or digits, uppercase, with no spaces or symbols.";
const BANK_MESSAGE = "Bank references must be 6 to 20 letters or digits, uppercase, with no spaces or symbols.";
const CHEQUE_MESSAGE =
  "Cheque references must be 3 to 30 characters using letters, digits, spaces, commas, periods, slashes, or hyphens.";

const MESSAGES: Record<ReferencePolicy, string> = {
  digital: DIGITAL_MESSAGE,
  bank: BANK_MESSAGE,
  cheque: CHEQUE_MESSAGE,
};

describe("REFERENCE_LIMITS", () => {
  it("defines the approved length ranges", () => {
    expect(REFERENCE_LIMITS).toEqual({
      digital: { min: 12, max: 16 },
      bank: { min: 6, max: 20 },
      cheque: { min: 3, max: 30 },
    });
  });
});

describe("referencePolicyFor", () => {
  it("maps every canonical payment method", () => {
    expect(PAYMENT_METHODS.map((method) => [method, referencePolicyFor(method)])).toEqual([
      ["Cash", "bank"],
      ["Bank Transfer", "bank"],
      ["GCash", "digital"],
      ["Maya", "digital"],
      ["Card", "bank"],
      ["Cheque", "cheque"],
    ]);
  });

  it("matches e-wallet methods case-insensitively", () => {
    for (const method of ["gcash", "GCASH", "GcAsH", "maya", "MAYA", "MaYa"]) {
      expect(referencePolicyFor(method), method).toBe("digital");
    }
  });

  it("matches cheque and check spellings case-insensitively", () => {
    for (const method of ["cheque", "CHEQUE", "Cheque", "check", "CHECK", "Check"]) {
      expect(referencePolicyFor(method), method).toBe("cheque");
    }
  });

  it("ignores surrounding padding", () => {
    expect(referencePolicyFor("  gcash  ")).toBe("digital");
    expect(referencePolicyFor("  Cheque  ")).toBe("cheque");
  });

  it("falls back to the bank policy for everything else", () => {
    for (const method of ["Bank Transfer", "bank transfer", "Card", "Cash", "InstaPay", "Unknown", "", "   "]) {
      expect(referencePolicyFor(method), method || "blank").toBe("bank");
    }
  });
});

describe("cleanReferenceNumber", () => {
  it("uppercases digital references and strips spaces and symbols", () => {
    expect(cleanReferenceNumber("gc-12 34/56 78", "digital")).toBe("GC12345678");
    expect(cleanReferenceNumber("  abcd.1234 efgh  ", "digital")).toBe("ABCD1234EFGH");
  });

  it("uppercases bank references and strips spaces and symbols", () => {
    expect(cleanReferenceNumber("bpi 001-234 567", "bank")).toBe("BPI001234567");
    expect(cleanReferenceNumber("ref#123.456", "bank")).toBe("REF123456");
  });

  it("keeps letters, digits, spaces, commas, periods, slashes, and hyphens for cheques", () => {
    expect(cleanReferenceNumber("chk 001, 234. 567/8-9", "cheque")).toBe("CHK 001, 234. 567/8-9");
    expect(cleanReferenceNumber("abc-123/456.789, 000", "cheque")).toBe("ABC-123/456.789, 000");
  });

  it("collapses repeated spaces and drops other whitespace for cheques", () => {
    expect(cleanReferenceNumber("ABC   123", "cheque")).toBe("ABC 123");
    expect(cleanReferenceNumber("  ABC 123  ", "cheque")).toBe("ABC 123");
    expect(cleanReferenceNumber("ABC\t123\n456", "cheque")).toBe("ABC123456");
  });

  it("drops symbols outside the cheque allowlist", () => {
    expect(cleanReferenceNumber("chk#001 (a)", "cheque")).toBe("CHK001 A");
    expect(cleanReferenceNumber("a&b_c", "cheque")).toBe("ABC");
  });

  it("caps at the policy maximum without ever exceeding it", () => {
    for (const policy of ["digital", "bank", "cheque"] as const) {
      const cleaned = cleanReferenceNumber("a".repeat(60), policy);
      expect(cleaned, policy).toHaveLength(REFERENCE_LIMITS[policy].max);
      expect(cleaned.length, policy).toBeLessThanOrEqual(REFERENCE_LIMITS[policy].max);
    }
    expect(cleanReferenceNumber("a".repeat(17), "digital")).toBe("A".repeat(16));
    expect(cleanReferenceNumber("a".repeat(21), "bank")).toBe("A".repeat(20));
    expect(cleanReferenceNumber("a".repeat(31), "cheque")).toBe("A".repeat(30));
  });

  it("caps a cheque reference at the policy maximum", () => {
    expect(cleanReferenceNumber(`${"A".repeat(29)} B`, "cheque")).toBe("A".repeat(30));
  });
});

describe("validateReferenceNumber blank values", () => {
  it.each(["digital", "bank", "cheque"] as const)("treats blank %s references as optional", (policy) => {
    expect(validateReferenceNumber("", policy)).toBeNull();
    expect(validateReferenceNumber("   ", policy)).toBeNull();
    expect(validateReferenceNumber("\t\n", policy)).toBeNull();
  });
});

describe("validateReferenceNumber digital boundaries", () => {
  it("rejects 11 characters and accepts 12 to 16", () => {
    expect(validateReferenceNumber("A".repeat(11), "digital")).toBe(DIGITAL_MESSAGE);
    expect(validateReferenceNumber("A".repeat(12), "digital")).toBeNull();
    expect(validateReferenceNumber("1".repeat(16), "digital")).toBeNull();
  });

  it("rejects 17 characters instead of truncating to a valid 16", () => {
    expect(validateReferenceNumber("A".repeat(17), "digital")).toBe(DIGITAL_MESSAGE);
    expect(validateReferenceNumber("1".repeat(40), "digital")).toBe(DIGITAL_MESSAGE);
  });

  it("measures the cleaned value, so separators do not count", () => {
    expect(validateReferenceNumber("ABCD-1234-EFGH", "digital")).toBeNull();
    expect(validateReferenceNumber("ABCD 1234 EFGH!", "digital")).toBeNull();
    expect(validateReferenceNumber("abcd-1234-efgh", "digital")).toBeNull();
  });
});

describe("validateReferenceNumber bank boundaries", () => {
  it("rejects 5 characters and accepts 6 to 20", () => {
    expect(validateReferenceNumber("A".repeat(5), "bank")).toBe(BANK_MESSAGE);
    expect(validateReferenceNumber("A".repeat(6), "bank")).toBeNull();
    expect(validateReferenceNumber("1".repeat(20), "bank")).toBeNull();
  });

  it("rejects 21 characters instead of truncating to a valid 20", () => {
    expect(validateReferenceNumber("A".repeat(21), "bank")).toBe(BANK_MESSAGE);
    expect(validateReferenceNumber("1".repeat(40), "bank")).toBe(BANK_MESSAGE);
  });

  it("measures the cleaned value, so spaces and symbols do not count", () => {
    expect(validateReferenceNumber("BPI 001-234 567", "bank")).toBeNull();
    expect(validateReferenceNumber("abc-123", "bank")).toBeNull();
  });
});

describe("validateReferenceNumber cheque boundaries", () => {
  it("rejects 2 characters and accepts 3 to 30", () => {
    expect(validateReferenceNumber("AB", "cheque")).toBe(CHEQUE_MESSAGE);
    expect(validateReferenceNumber("ABC", "cheque")).toBeNull();
    expect(validateReferenceNumber("A".repeat(30), "cheque")).toBeNull();
  });

  it("rejects 31 characters instead of truncating to a valid 30", () => {
    expect(validateReferenceNumber("A".repeat(31), "cheque")).toBe(CHEQUE_MESSAGE);
    expect(validateReferenceNumber("1".repeat(40), "cheque")).toBe(CHEQUE_MESSAGE);
  });

  it("accepts the cheque separators", () => {
    expect(validateReferenceNumber("CHK 001, 234. 567/8-9", "cheque")).toBeNull();
    expect(validateReferenceNumber("abc 123", "cheque")).toBeNull();
  });

  it("ignores padding and collapsed spaces when measuring", () => {
    expect(validateReferenceNumber("  AB  ", "cheque")).toBe(CHEQUE_MESSAGE);
    expect(validateReferenceNumber("  ABC  ", "cheque")).toBeNull();
    expect(validateReferenceNumber(`A${" ".repeat(10)}B`, "cheque")).toBeNull();
  });
});

describe("validateReferenceNumber messages", () => {
  it.each(["digital", "bank", "cheque"] as const)("returns the exact %s message", (policy) => {
    const tooShort = "A";
    expect(validateReferenceNumber(tooShort, policy)).toBe(MESSAGES[policy]);
  });

  it("keeps a valid value as null", () => {
    expect(validateReferenceNumber("ABCD1234EFGH", "digital")).toBeNull();
    expect(validateReferenceNumber("BPI001234", "bank")).toBeNull();
    expect(validateReferenceNumber("CHK 001", "cheque")).toBeNull();
  });
});
