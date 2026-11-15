import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { buildExportRows, ReportExport, ReportTable, type ReportColumn } from "./report-shell";
import { formatPeso } from "@/shared/lib/money";

const downloads = vi.hoisted(() => ({ csv: vi.fn(), xlsx: vi.fn() }));
vi.mock("@/shared/lib/spreadsheet", () => ({ downloadCsv: downloads.csv, downloadXlsx: downloads.xlsx }));

type Row = { name: string; amount: number };
const COLUMNS: ReportColumn<Row>[] = [
  { header: "Name", value: (row) => row.name },
  { header: "Amount", value: (row) => formatPeso(row.amount) },
];
const ROWS: Row[] = [{ name: "A, B", amount: 123456 }, { name: "C", amount: 5 }];

function Wrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId="dev-finance">{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("report export", () => {
  it("builds a header row and exact formatted money text", () => {
    expect(buildExportRows(COLUMNS, ROWS)).toEqual([["Name", "Amount"], ["A, B", formatPeso(123456)], ["C", formatPeso(5)]]);
  });

  it("writes a CSV with every row after recording the export", async () => {
    render(<Wrapper><ReportExport report="Test Report" fileName="test" columns={COLUMNS} rows={ROWS} range={{ from: "2026-11-01", to: "2026-11-13" }} /></Wrapper>);
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /CSV/ }));
    await waitFor(() => expect(downloads.csv).toHaveBeenCalledTimes(1));
    const [fileName, rows] = downloads.csv.mock.calls[0] as [string, string[][]];
    expect(fileName).toMatch(/^test-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(rows).toHaveLength(3);
  });
});

type WideRow = { id: string; values: string[] };
const WIDE_COLUMNS: ReportColumn<WideRow>[] = Array.from({ length: 7 }, (_, index) => ({
  header: `Column ${index + 1}`,
  value: (row: WideRow) => row.values[index],
  screen: index < 5 ? undefined : false,
}));
const WIDE_ROWS: WideRow[] = [{ id: "r1", values: ["Maria", "b", "c", "d", "e", "f", "g"] }];

describe("report table", () => {
  const renderTable = () =>
    render(<Wrapper><ReportTable report="Wide Report" fileName="wide" range={null} columns={WIDE_COLUMNS} rows={WIDE_ROWS} getRowId={(row) => row.id} emptyText="None" /></Wrapper>);

  it("shows only the screen columns and every column in the row details", async () => {
    renderTable();
    const table = screen.getByRole("table", { name: "Wide Report" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent).filter((text) => text !== "Actions");
    expect(headers).toEqual(["Column 1", "Column 2", "Column 3", "Column 4", "Column 5"]);
    fireEvent.click(within(table).getByText("Maria"));
    const sheet = await screen.findByRole("dialog");
    expect(Array.from(sheet.querySelectorAll("dt")).map((term) => term.textContent)).toEqual(WIDE_COLUMNS.map((column) => column.header));
    expect(within(sheet).getByText("g")).toBeInTheDocument();
  });

  it("opens the row details from the row itself, with no row menu", async () => {
    renderTable();
    expect(screen.queryByRole("button", { name: "Actions for Maria" })).toBeNull();
    fireEvent.click(screen.getByRole("row", { name: "Open details of Maria" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("shows the first column as plain bold text, not a link", () => {
    render(<Wrapper><ReportTable report="Dash Report" fileName="dash" range={null} columns={COLUMNS} rows={[{ name: "Ana", amount: 5 }]} getRowId={(row) => row.name} emptyText="None" /></Wrapper>);
    const cell = within(screen.getByRole("table", { name: "Dash Report" })).getByText("Ana");
    expect(cell).toHaveClass("tw:font-semibold");
    expect(cell.closest("a")).toBeNull();
  });

  it("offers one Export menu with Excel, CSV and Print", async () => {
    renderTable();
    expect(screen.getAllByRole("button", { name: /Export/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /^(Excel|CSV|Print)$/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
    expect((await screen.findAllByRole("menuitem")).map((item) => item.textContent?.trim())).toEqual(["Excel", "CSV", "Print"]);
  });

  it("hides Print on a page without a print layout", async () => {
    render(<Wrapper><ReportExport report="Test Report" fileName="test" columns={COLUMNS} rows={ROWS} range={null} printable={false} /></Wrapper>);
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
    expect((await screen.findAllByRole("menuitem")).map((item) => item.textContent?.trim())).toEqual(["Excel", "CSV"]);
  });

  it("exports every column, including those hidden on screen", async () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /CSV/ }));
    await waitFor(() => expect(downloads.csv).toHaveBeenCalledTimes(1));
    const [, rows] = downloads.csv.mock.calls[0] as [string, string[][]];
    expect(rows[0]).toHaveLength(7);
    expect(rows[1]).toEqual(["Maria", "b", "c", "d", "e", "f", "g"]);
  });
});
