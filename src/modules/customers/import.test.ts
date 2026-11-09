import { describe, expect, it } from "vitest";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { createMockRepositories } from "@/data/mock/repositories";
import { createMockStore } from "@/data/mock/seed";
import { buildImportRows, parseCsv, rowsToImportRecords, safeSpreadsheetText, type CustomerImportRecord } from "./import";

const as = (store: ReturnType<typeof createMockStore>, id: string) => createMockRepositories(store, () => getDevIdentity(id));

const row = (overrides: CustomerImportRecord = {}): CustomerImportRecord => ({
  "First name": "Ana",
  "Last name": "Cruz",
  "Birth date": "1991-02-03",
  "Mobile number": "9170000001",
  Email: "ANA.CRUZ@example.com",
  "VIP tier": "Silver",
  "Payment scheme": "Installment 4_month",
  ...overrides,
});

describe("customer import", () => {
  it("reads quoted CSV and requires the name columns", () => {
    expect(parseCsv('﻿First name,Last name\r\n"Cruz, Jr.","say ""hi"""\n')).toEqual([["First name", "Last name"], ["Cruz, Jr.", 'say "hi"']]);
    expect(() => rowsToImportRecords([["Email"], ["a@b.co"]])).toThrow(/First name, Last name/);
    expect(rowsToImportRecords([["First name", "Last name"], ["Ana", "Cruz"], ["", ""]])).toHaveLength(1);
  });

  it("classifies rows as ready, invalid, or needing review without merging", () => {
    const store = createMockStore();
    const existing = store.customers.find((customer) => customer.mobileNumber)!;
    const rows = buildImportRows(
      [
        row(),
        row({ "First name": "", Gender: "Unknown" }),
        row({ "First name": "Ben", Email: "ben@example.com", "Mobile number": existing.mobileNumber! }),
        row({ "First name": "Ana", Email: "ana.cruz@example.com", "Mobile number": "09170000002" }),
      ],
      { existing: store.customers, products: store.products, schemes: store.paymentSchemes },
    );
    expect(rows[0].status).toBe("ready");
    expect(rows[0].input).toMatchObject({ vipPlan: "S1", mobileNumber: "09170000001", email: "ana.cruz@example.com", paymentSchemeId: "scheme-installment-4m", consentDataPrivacy: false });
    expect(rows[0].warnings.some((message) => message.startsWith("Before Submit"))).toBe(true);
    expect(rows[1].status).toBe("invalid");
    expect(rows[2].status).toBe("needs_review");
    expect(rows[3].errors.join(" ")).toMatch(/earlier row/);
  });

  it("imports ready rows as drafts only, for Administrators only, and audits the batch", async () => {
    const store = createMockStore();
    const before = store.customers.length;
    const records = [row(), row({ "First name": "" })];
    await expect(as(store, "dev-finance").customers.importCustomers({ fileName: "a.csv", records, declaration: true })).rejects.toThrow();
    await expect(as(store, "dev-admin").customers.importCustomers({ fileName: "a.csv", records, declaration: false })).rejects.toThrow(/official company records/);
    const job = await as(store, "dev-admin").customers.importCustomers({ fileName: "a.csv", records, declaration: true });
    expect(job).toMatchObject({ totalRows: 2, createdCount: 1, invalidCount: 1 });
    expect(store.customers).toHaveLength(before + 1);
    expect(store.customers.at(-1)!.status).toBe("draft");
    expect(store.auditEvents.some((event) => event.action === "CUSTOMER_IMPORT_COMPLETED" && event.entityId === job.id)).toBe(true);
    // Importing the same file again flags the row as a possible duplicate instead of creating a second customer.
    const again = await as(store, "dev-admin").customers.importCustomers({ fileName: "a.csv", records, declaration: true });
    expect(again).toMatchObject({ createdCount: 0, needsReviewCount: 1 });
  });

  it("neutralizes spreadsheet formulas in exported text", () => {
    expect(safeSpreadsheetText("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(safeSpreadsheetText("Maria")).toBe("Maria");
  });
});
