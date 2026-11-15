import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DataTable, MAX_DATA_COLUMNS, type ColumnDef } from "./data-table";

type Row = { id: string };
const columnsOf = (count: number, extra: ColumnDef<Row, unknown>[] = []): ColumnDef<Row, unknown>[] => [
  ...Array.from({ length: count }, (_, index) => ({ id: `c${index}`, header: `Column ${index}`, cell: () => `v${index}` })),
  ...extra,
];
const data: Row[] = [{ id: "r1" }];

afterEach(() => cleanup());

describe("DataTable empty values and rows", () => {
  it("shows an em dash for null, undefined, empty and blank cells but keeps 0 and elements", () => {
    const columns: ColumnDef<Row, unknown>[] = [
      { id: "a", header: "A", cell: () => null },
      { id: "b", header: "B", cell: () => undefined },
      { id: "c", header: "C", cell: () => "" },
      { id: "d", header: "D", cell: () => "  " },
      { id: "e", header: "E", cell: () => 0 },
    ];
    render(<DataTable caption="Empties" data={data} columns={columns} getRowId={(row) => row.id} emptyText="None" />);
    const cells = screen.getAllByRole("cell").map((cell) => cell.textContent);
    expect(cells).toEqual(["—", "—", "—", "—", "0"]);
  });

  it("tints the whole clickable row on hover and opens it on click", () => {
    const onRowOpen = vi.fn();
    render(<DataTable caption="Rows" data={data} columns={columnsOf(1)} getRowId={(row) => row.id} emptyText="None" onRowOpen={onRowOpen} />);
    const row = screen.getAllByRole("row")[1];
    expect(row.className).toContain("tw:hover:bg-(--color-brand-soft)");
    expect(row.className).toContain("tw:cursor-pointer");
    fireEvent.click(row);
    expect(onRowOpen).toHaveBeenCalledWith(data[0]);
  });
});

describe("DataTable column limit", () => {
  it("renders up to 5 data columns plus the row menu", () => {
    render(<DataTable caption="Fine" data={data} columns={columnsOf(MAX_DATA_COLUMNS)} getRowId={(row) => row.id} emptyText="None" rowActions={() => "menu"} />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(MAX_DATA_COLUMNS + 1);
  });

  it("does not count a column with id actions", () => {
    render(<DataTable caption="Fine" data={data} columns={columnsOf(MAX_DATA_COLUMNS, [{ id: "actions", header: "", cell: () => "menu" }])} getRowId={(row) => row.id} emptyText="None" />);
    expect(screen.getAllByRole("columnheader")).toHaveLength(MAX_DATA_COLUMNS + 1);
  });

  it("throws in tests, naming the table, when more than 5 data columns are passed", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(<DataTable caption="Wide table" data={data} columns={columnsOf(MAX_DATA_COLUMNS + 1)} getRowId={(row) => row.id} emptyText="None" />),
    ).toThrow(/DataTable "Wide table" has 6 data columns/);
    quiet.mockRestore();
  });
});
