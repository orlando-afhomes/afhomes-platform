import { describe, expect, it } from "vitest";
import { exampleFor } from "./example-text";

describe("example placeholders", () => {
  it.each([
    ["Email", "juan.delacruz@example.com"],
    ["First name (Extra cardholder)", "Juan"],
    ["Mobile number", "0917 123 4567"],
    ["Total Bill Amount", "25,000.00"],
    ["Points to use", "500"],
    ["VIP discount (%)", "5"],
    ["Down payment (% of price)", "40"],
    ["Term in months", "12"],
    ["Number of installments", "4"],
    ["Note", "Customer asked for a receipt copy"],
    ["Reason for withholding", "Customer asked for a correction"],
    ["Invoice / Receipt number", "OR-2026-001234"],
  ])("gives %s an example", (label, example) => {
    expect(exampleFor(label)).toBe(example);
  });

  it("gives nothing for an empty or unknown label", () => {
    expect(exampleFor("")).toBeUndefined();
    expect(exampleFor(undefined)).toBeUndefined();
    expect(exampleFor("Zzz")).toBeUndefined();
  });
});
