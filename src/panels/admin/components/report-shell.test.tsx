import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { buildExportRows, ReportExport, type ReportColumn } from "./report-shell";
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
    fireEvent.click(screen.getByRole("button", { name: /CSV/ }));
    await waitFor(() => expect(downloads.csv).toHaveBeenCalledTimes(1));
    const [fileName, rows] = downloads.csv.mock.calls[0] as [string, string[][]];
    expect(fileName).toMatch(/^test-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(rows).toHaveLength(3);
  });
});
