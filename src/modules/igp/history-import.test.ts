import { describe, expect, it } from "vitest";
import { buildIgpHistoryImportRows, rowsToIgpHistoryRecords } from "./history-import";
import { igpSeriesNumberProblem, parseIgpSeriesNumber } from "./rules";

const TODAY = "2026-12-31";

function record(overrides: Record<string, string> = {}) {
  return {
    "Series Number": "A26111500012T12S",
    "Issue date": "2026-11-15",
    "Contract price": "1800000.00",
    "Payment plan": "Terms",
    "Term months": "12",
    "Contract type": "Standard",
    Buyer: "Sample Buyer",
    Status: "Active",
    Replaces: "",
    ...overrides,
  };
}

describe("IGP history import SUPERSEDED handling", () => {
  it("rejects a SUPERSEDED row that names no replacement, and links one that does", () => {
    const missing = buildIgpHistoryImportRows([record({ Status: "SUPERSEDED" })], { taken: [], today: TODAY });
    expect(missing[0].status).toBe("invalid");
    expect(missing[0].errors.join(" ")).toMatch(/names no replacement.*Replaces/);

    const linked = buildIgpHistoryImportRows(
      [
        record({ Status: "SUPERSEDED", Replaces: "A26120300013T12S" }),
        record({
          "Series Number": "A26120300013T12S",
          "Issue date": "2026-12-03",
          "Contract price": "2600000.00",
        }),
      ],
      { taken: [], today: TODAY },
    );
    expect(linked.map(({ status }) => status)).toEqual(["ready", "ready"]);
    expect(linked[0].row).toMatchObject({ status: "replaced", replaces: "A26120300013T12S" });
  });

  it("refuses a replacement number that is neither in the file nor on record", () => {
    const rows = buildIgpHistoryImportRows([record({ Status: "SUPERSEDED", Replaces: "A26120300013T12S" })], { taken: [], today: TODAY });
    expect(rows[0].status).toBe("invalid");
    expect(rows[0].errors.join(" ")).toMatch(/not in this file or on record/);
  });

  it("rejects the whole replacement chain when its final target is missing", () => {
    const rows = buildIgpHistoryImportRows([
      record({ Status: "SUPERSEDED", Replaces: "A26120300013T12S" }),
      record({
        "Series Number": "A26120300013T12S", "Issue date": "2026-12-03",
        "Contract price": "2600000.00", Status: "SUPERSEDED", Replaces: "A26120400014T12S",
      }),
    ], { taken: [], today: TODAY });
    expect(rows.map(({ status }) => status)).toEqual(["invalid", "invalid"]);
    expect(rows[0].errors.join(" ")).toMatch(/chain through A26120300013T12S is incomplete/);
    expect(rows[1].errors.join(" ")).toContain("A26120400014T12S");
  });

  it("rejects circular replacements and rows depending on that circle", () => {
    const rows = buildIgpHistoryImportRows([
      record({ Status: "SUPERSEDED", Replaces: "A26120300013T12S" }),
      record({
        "Series Number": "A26120300013T12S", "Issue date": "2026-12-03",
        "Contract price": "2600000.00", Status: "SUPERSEDED", Replaces: "A26111500012T12S",
      }),
      record({ "Series Number": "A26111400022T12S", "Issue date": "2026-11-14", Status: "SUPERSEDED", Replaces: "A26111500012T12S" }),
      record({ "Series Number": "A26111600032T12S", "Issue date": "2026-11-16" }),
    ], { taken: [], today: TODAY });
    expect(rows.map(({ status }) => status)).toEqual(["invalid", "invalid", "invalid", "ready"]);
    for (const item of rows.slice(0, 3)) expect(item.errors.join(" ")).toMatch(/circular/i);
  });

  it("rejects a SUPERSEDED row whose replacement fails validation elsewhere in the file", () => {
    const rows = buildIgpHistoryImportRows(
      [
        record({ Status: "SUPERSEDED", Replaces: "A26120300013T12S" }),
        record({
          "Series Number": "A26120300013T12S",
          "Issue date": "not-a-date",
          "Contract price": "2600000.00",
        }),
      ],
      { taken: [], today: TODAY },
    );
    expect(rows.map(({ status }) => status)).toEqual(["invalid", "invalid"]);
    expect(rows[0].errors.join(" ")).toMatch(/not in this file or on record/);
  });
});

describe("IGP history import format validation", () => {
  it.each<{ field: string; overrides: Record<string, string>; expected: string }>([
    { field: "Payment plan", overrides: { "Series Number": "A26111500012T01S", "Payment plan": "Cash", "Term months": "1" }, expected: "Terms" },
    { field: "Payment plan", overrides: { "Payment plan": "Cash" }, expected: "Terms" },
    { field: "Term months", overrides: { "Term months": "24" }, expected: "12" },
    { field: "Contract type", overrides: { "Contract type": "Non-Standard" }, expected: "Standard" },
  ])("rejects a $field that conflicts with the Series Number", ({ field, overrides, expected }) => {
    const [row] = buildIgpHistoryImportRows([record(overrides)], { taken: [], today: TODAY });
    expect(row).toMatchObject({ status: "invalid", row: null });
    expect(row.errors).toEqual([`${field} must match the Series Number (${expected}).`]);
  });

  it.each(["2026-10-15", "2026-11-16"])("rejects an issue date of %s for a number issued on November 15", (date) => {
    const [row] = buildIgpHistoryImportRows([record({ "Issue date": date })], { taken: [], today: TODAY });
    expect(row.status).toBe("invalid");
    expect(row.errors.join(" ")).toMatch(/Issue date must match.*2026-11-15/);
  });

  it("accepts band 0 for a price above ₱9,000,000 and refuses every other fault plainly", () => {
    const above = buildIgpHistoryImportRows(
      [record({ "Series Number": "A26112000010C01N", "Issue date": "2026-11-20", "Contract price": "10000000.00", "Payment plan": "Cash", "Term months": "1", "Contract type": "Non-Standard" })],
      { taken: [], today: TODAY },
    );
    expect(above[0].status).toBe("ready");

    const cases: Array<[Record<string, string>, RegExp]> = [
      [record({ "Series Number": "A26111500012T12" }), /16-character/],
      [record({ "Series Number": "J26111500012T12S" }), /starts with A/],
      [record({ "Contract price": "10000000.00" }), /band digit 2 does not match.*band 0/],
      [record({ "Series Number": "A26112000010C01N", "Contract price": "1800000.00", "Payment plan": "Cash", "Term months": "1" }), /band digit 0 does not match/],
      [record({ Status: "Mystery" }), /Active, Cancelled or SUPERSEDED/],
    ];
    for (const [override, message] of cases) {
      const rows = buildIgpHistoryImportRows([override], { taken: [], today: TODAY });
      expect(rows[0].status).toBe("invalid");
      expect(rows[0].errors.join(" ")).toMatch(message);
    }
  });

  it("never reuses a Series Number from the records or from earlier in the file", () => {
    const rows = buildIgpHistoryImportRows([record(), record({ Buyer: "Another Buyer" })], {
      taken: ["A26111500012T12S"],
      today: TODAY,
    });
    expect(rows.map(({ status }) => status)).toEqual(["invalid", "invalid"]);
    expect(rows[0].errors.join(" ")).toMatch(/already on record.*never reused/);
    expect(rows[1].errors.join(" ")).toMatch(/already on record.*never reused/);

    const duplicate = buildIgpHistoryImportRows([record(), record({ Buyer: "Another Buyer" })], { taken: [], today: TODAY });
    expect(duplicate.map(({ status }) => status)).toEqual(["ready", "invalid"]);
    expect(duplicate[1].errors.join(" ")).toMatch(/more than once in the file/);
  });
});

describe("IGP Series Number parsing", () => {
  it("parses segments and reads the template header", () => {
    expect(parseIgpSeriesNumber("A26111500012T12S")).toEqual({
      datePart: "2026-11-15", sequence: 1, band: 2, scheme: "T", termMonths: 12, clauses: "S",
    });
    expect(igpSeriesNumberProblem("A26111500012T12S")).toBeNull();
    expect(rowsToIgpHistoryRecords([[...["Series Number", "Issue date", "Contract price", "Status"]]])).toEqual([]);
  });
});
