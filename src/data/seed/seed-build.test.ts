import { describe, expect, it } from "vitest";
import { createSeedClock } from "./anchor";
import { buildSeed } from "./index";
import { addressAt, companyEmail, governmentIdAt, landlineAt, mobileAt, personalEmail, tinAt, tokenAt } from "./people";

describe("seed clock", () => {
  it("derives every date from the fixed business day", () => {
    const clock = createSeedClock("2026-11-23");
    expect(clock.today).toBe("2026-11-23");
    expect(clock.ago(1)).toBe("2026-11-22");
    expect(clock.ahead(1)).toBe("2026-11-24");
    expect(clock.monthStart(0)).toBe("2026-11-01");
    expect(clock.monthStart(1)).toBe("2026-10-01");
    expect(clock.month(1)).toBe("2026-10");
    expect(clock.inMonth(1, 31)).toBe("2026-10-28");
    expect(clock.at("2026-11-23")).toBe("2026-11-23T09:00:00+08:00");
  });
});

describe("seed generators", () => {
  it("is deterministic: the same index always gives the same value", () => {
    expect(mobileAt(3)).toBe(mobileAt(3));
    expect(tinAt(9)).toBe(tinAt(9));
    expect(governmentIdAt("Passport", 4)).toBe(governmentIdAt("Passport", 4));
    expect(personalEmail("Angela", "Ramos", 5)).toBe(personalEmail("Angela", "Ramos", 5));
    expect(tokenAt(7, "qr")).toBe(tokenAt(7, "qr"));
    expect(addressAt(11)).toEqual(addressAt(11));
  });

  it("emits valid formats with non-sequential values", () => {
    expect(mobileAt(0)).toMatch(/^09\d{9}$/);
    expect(mobileAt(1)).toMatch(/^09\d{9}$/);
    expect(mobileAt(0).slice(0, 9)).not.toBe(mobileAt(1).slice(0, 9));
    expect(tinAt(0)).toMatch(/^\d{3}-\d{3}-\d{3}$/);
    expect(governmentIdAt("Passport", 0)).toMatch(/^P\d{7}[A-Z]$/);
    expect(governmentIdAt("Driver's License", 0)).toMatch(/^D\d{2}-\d{2}-\d{6}$/);
    expect(personalEmail("Angela", "Ramos", 0)).toContain("@");
    expect(companyEmail("Jose", "Reyes")).toBe("jose.reyes@afhomes.com.ph");
    expect(tokenAt(0, "qr")).toMatch(/^[0-9a-f]{32}$/);
    expect(landlineAt(0, { province: "Laguna", city: "Calamba City" })).toMatch(/^\d{3}-\d{4}$/);
  });
});

describe("seed build", () => {
  it("builds the same store twice for a fixed date", () => {
    const first = JSON.stringify(buildSeed("2026-11-23"));
    const second = JSON.stringify(buildSeed("2026-11-23"));
    expect(second).toBe(first);
  });

  it("links a replaced IGP history row to the active replacement", () => {
    const store = buildSeed("2026-11-23");
    const rows = store.igp.historyBatches[0].rows;
    const replaced = rows.find((row) => row.status === "replaced")!;
    const replacement = rows.find((row) => row.status === "active" && row.buyerLabel === replaced.buyerLabel)!;

    expect(replaced.replaces).toBe(replacement.seriesNumber);
    expect(replacement.replaces).toBeNull();
  });

  it("assigns a unique official receipt number to the submitted IGP cash payment", () => {
    const store = buildSeed("2026-11-23");
    const payment = store.payments.find((item) => item.method === "Cash" && item.status === "submitted" &&
      store.igp.sales.some((sale) => sale.id === item.saleId))!;

    expect(payment.documentNo).toMatch(/^OR-20261119-\d{4}$/);
    expect(store.payments.filter((item) => item.documentNo === payment.documentNo)).toHaveLength(1);
  });
});
