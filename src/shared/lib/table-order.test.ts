import { describe, expect, it } from "vitest";
import { sortForTable } from "./table-order";

type Row = { id: string; date?: string; status?: string };

const rows: Row[] = [
  { id: "old", date: "2026-01-05" },
  { id: "no-date" },
  { id: "newest", date: "2026-03-01" },
  { id: "newer-pending", date: "2026-02-01", status: "pending" },
  { id: "newer-done", date: "2026-02-01", status: "done" },
];

const order = {
  date: (row: Row) => row.date,
  attention: (row: Row) => (row.status === "pending" ? 1 : 0),
};

describe("sortForTable", () => {
  it("puts the newest date first and rows without a date last", () => {
    expect(sortForTable(rows, order).map((row) => row.id)).toEqual(["newest", "newer-pending", "newer-done", "old", "no-date"]);
  });

  it("puts attention rows ahead on the same date", () => {
    const sameDay = rows.filter((row) => row.date === "2026-02-01");
    expect(sortForTable(sameDay, order).map((row) => row.id)).toEqual(["newer-pending", "newer-done"]);
  });

  it("returns the input unchanged when no order is given and never mutates it", () => {
    const input = [...rows];
    expect(sortForTable(input).map((row) => row.id)).toEqual(rows.map((row) => row.id));
    sortForTable(input, order);
    expect(input.map((row) => row.id)).toEqual(rows.map((row) => row.id));
  });
});
