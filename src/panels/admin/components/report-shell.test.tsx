import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { MockReportRepository } from "@/data/mock/report-repository";
import { buildExportRows, ReportExport, ReportTable, type ReportColumn } from "./report-shell";
import { formatPeso } from "@/shared/lib/money";

const downloads = vi.hoisted(() => ({ csv: vi.fn(), xlsx: vi.fn() }));
const pdf = vi.hoisted(() => ({ create: vi.fn(), download: vi.fn() }));
vi.mock("@/shared/lib/spreadsheet", () => ({ downloadCsv: downloads.csv, downloadXlsx: downloads.xlsx }));
vi.mock("@/panels/admin/documents/report-pdf-output", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/panels/admin/documents/report-pdf-output")>()),
  createReportPdf: pdf.create,
  downloadReportPdf: pdf.download,
}));

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

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", { value: vi.fn(() => "blob:report-preview"), configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });
  pdf.create.mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));
});

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

  it("writes an Excel file with every row after recording the export", async () => {
    const record = vi.spyOn(MockReportRepository.prototype, "recordExport");
    render(<Wrapper><ReportExport report="Test Report" fileName="test" columns={COLUMNS} rows={ROWS} range={{ from: "2026-11-01", to: "2026-11-13" }} /></Wrapper>);
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: /Excel/ }));
    await waitFor(() => expect(downloads.xlsx).toHaveBeenCalledTimes(1));
    const [fileName, sheets] = downloads.xlsx.mock.calls[0] as [string, Array<{ name: string; rows: string[][] }>];
    expect(fileName).toMatch(/^test-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(sheets[0].rows).toHaveLength(3);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ format: "xlsx", rowCount: 2 }));
  });

  it("downloads the same filtered rows as a PDF and records one export", async () => {
    const record = vi.spyOn(MockReportRepository.prototype, "recordExport");
    render(<Wrapper><ReportExport report="Test Report" fileName="test" columns={COLUMNS} rows={ROWS} range={{ from: "2026-11-01", to: "2026-11-13" }} metadata={['Filters: Search "Ana"']} /></Wrapper>);
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Download PDF" }));
    await waitFor(() => expect(pdf.create).toHaveBeenCalledTimes(1));
    expect(pdf.create).toHaveBeenCalledWith({
      title: "Test Report",
      generated: expect.any(String),
      metadata: [expect.stringContaining("Date range:"), 'Filters: Search "Ana"'],
      columns: ["Name", "Amount"],
      rows: [["A, B", formatPeso(123456)], ["C", formatPeso(5)]],
    });
    expect(pdf.download).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/^test-\d{4}-\d{2}-\d{2}\.pdf$/));
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ report: "Test Report", format: "pdf", rowCount: 2 }));
  });

  it("previews the same PDF for Print without downloading it", async () => {
    const record = vi.spyOn(MockReportRepository.prototype, "recordExport");
    render(<Wrapper><ReportExport report="Test Report" fileName="test" columns={COLUMNS} rows={ROWS} range={null} /></Wrapper>);
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
    fireEvent.click(await screen.findByRole("menuitem", { name: "Print" }));
    expect(await screen.findByText("Open PDF to print")).toBeInTheDocument();
    expect(await screen.findByTitle("Test Report PDF preview")).toBeInTheDocument();
    expect(pdf.create).toHaveBeenCalledTimes(1);
    expect(pdf.download).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ format: "pdf" }));
  });

  it("builds the same document for Download PDF and Print", async () => {
    const record = vi.spyOn(MockReportRepository.prototype, "recordExport");
    render(<Wrapper><ReportExport report="Test Report" fileName="test" columns={COLUMNS} rows={ROWS} range={{ from: "2026-11-01", to: "2026-11-13" }} /></Wrapper>);
    const choose = async (item: string) => {
      fireEvent.click(screen.getByRole("button", { name: /Export/ }));
      fireEvent.click(await screen.findByRole("menuitem", { name: item }));
    };

    await choose("Download PDF");
    await waitFor(() => expect(pdf.create).toHaveBeenCalledTimes(1));
    await choose("Print");
    await waitFor(() => expect(pdf.create).toHaveBeenCalledTimes(2));

    expect(pdf.create.mock.calls[1][0]).toEqual(pdf.create.mock.calls[0][0]);
    expect(pdf.download).toHaveBeenCalledTimes(1);
    expect(record).toHaveBeenCalledTimes(2);
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

  it("offers one Export menu with Excel, CSV, Download PDF and Print", async () => {
    renderTable();
    expect(screen.getAllByRole("button", { name: /Export/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /^(Excel|CSV|Download PDF|Print)$/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
    const items = await screen.findAllByRole("menuitem");
    expect(items.map((item) => item.textContent?.trim())).toEqual(["Excel", "CSV", "Download PDF", "Print"]);
    const icons = items.map((item) => item.querySelector("svg")?.outerHTML);
    expect(icons.every(Boolean)).toBe(true);
    expect(new Set(icons).size).toBe(items.length);
  });

  it("hides Print on a page without a print layout", async () => {
    render(<Wrapper><ReportExport report="Test Report" fileName="test" columns={COLUMNS} rows={ROWS} range={null} printable={false} /></Wrapper>);
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
    expect((await screen.findAllByRole("menuitem")).map((item) => item.textContent?.trim())).toEqual(["Excel", "CSV", "Download PDF"]);
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
