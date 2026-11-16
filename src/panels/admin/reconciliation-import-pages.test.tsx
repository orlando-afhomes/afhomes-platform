import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { HistoryImportPanel } from "./pages/history-import-page";
import { ReconciliationPanel } from "./pages/reconciliation-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin",
}));

function Wrapper({ identityId, children }: { identityId: string; children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(cleanup);
const show = (identityId: string, page: ReactElement) => render(<Wrapper identityId={identityId}>{page}</Wrapper>);

describe("reconciliation and historical import pages", () => {
  it("shows Finance the measures to reconcile", async () => {
    show("dev-finance", <ReconciliationPanel />);
    const table = await screen.findByRole("table", { name: "Measures to Check" });
    expect(within(table).getByText("Verified receipts (net)")).toBeInTheDocument();
    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent?.trim()).filter((text) => text && text !== "Actions")).toEqual(["Measure", "System Total", "Company Spreadsheet Total", "Difference", "Status"]);
    expect(within(table).getAllByText("Not checked yet").length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent("0 of 5 measures checked");
    expect(screen.queryByText(/workbook/i)).toBeNull();
  });

  it("opens a measure with its source records and records the company spreadsheet total", async () => {
    const user = userEvent.setup();
    show("dev-finance", <ReconciliationPanel />);
    const table = await screen.findByRole("table", { name: "Measures to Check" });
    await user.click(within(table).getByRole("row", { name: "Open Verified receipts (net)" }));
    const sheet = await screen.findByRole("dialog", { name: "Verified receipts (net)" });
    expect(within(sheet).getByRole("region", { name: "Records Behind the System Total" })).toBeInTheDocument();
    expect(within(sheet).queryByRole("button", { name: "Record Again" })).toBeNull();
    await user.click(within(sheet).getByRole("button", { name: "Enter Company Spreadsheet Total" }));
    expect(await screen.findByLabelText(/Company spreadsheet total/)).toBeInTheDocument();
  });

  it("restricts reconciliation and the import for sellers", async () => {
    show("dev-svd-a", <ReconciliationPanel />);
    expect(await screen.findByText("Access Restricted")).toBeInTheDocument();
    cleanup();
    show("dev-finance", <HistoryImportPanel />);
    expect(await screen.findByText("Access Restricted")).toBeInTheDocument();
  });

  it("gives the Administrator the import steps without an explainer note", async () => {
    show("dev-admin", <HistoryImportPanel />);
    expect(await screen.findByRole("button", { name: /Download Template/ })).toBeInTheDocument();
    expect(screen.queryByText(/does not issue VIP Numbers/)).toBeNull();
  });

  it("summarizes invalid receipt rows and shows the full errors on demand", async () => {
    const user = userEvent.setup();
    show("dev-admin", <HistoryImportPanel />);
    const csv = "Receipt reference,Receipt date,Amount,Payment method,Customer,Sale reference,Sale status\nR-1,bad-date,-5,Cash,Customer,Sale,Open";
    const file = new File([csv], "receipts.csv", { type: "text/csv" });
    Object.defineProperty(file, "text", { value: async () => csv });
    await user.upload(screen.getByLabelText(/Receipt file/), file);
    const table = await screen.findByRole("table", { name: "Import Preview for receipts.csv" });
    expect(within(table).getByRole("cell", { name: "2 issues" })).toBeInTheDocument();
    expect(within(table).queryByText(/Receipt date must be/)).toBeNull();
    await user.click(within(table).getByRole("row", { name: "View receipt row 2" }));
    const details = await screen.findByRole("dialog", { name: "Receipt Row 2" });
    expect(within(details).getByText(/Receipt date must be/)).toBeInTheDocument();
    expect(within(details).getByText(/Amount must be greater than zero/)).toBeInTheDocument();
  });

  it("drops the parallel-run explainer from reconciliation", async () => {
    show("dev-finance", <ReconciliationPanel />);
    expect(await screen.findByText("Verified receipts (net)")).toBeInTheDocument();
    expect(screen.queryByText("Parallel run")).toBeNull();
  });
});
