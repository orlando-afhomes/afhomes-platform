import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { ReconciliationPanel } from "./pages/reconciliation-page";
import { json, renderWithApi } from "@/test/api-harness";

const totals = {
  items: [
    { measure: "verified_receipts", totalCentavos: 0, records: [] },
    { measure: "imported_receipts", totalCentavos: 0, records: [] },
    { measure: "sales_value", totalCentavos: 0, records: [] },
    { measure: "commissions_payable", totalCentavos: 0, records: [] },
    { measure: "commissions_paid", totalCentavos: 0, records: [] },
  ],
};

function reconciliationRoutes() {
  return async (url: URL) => {
    if (url.pathname === "/api/v1/reconciliation/totals") return json(totals);
    if (url.pathname === "/api/v1/reconciliation/entries") return json({ items: [] });
    if (url.pathname === "/api/v1/reconciliation/switch") {
      return json({ month: "2024-03", closed: false, signOff: null, unexplained: ["The month is not closed."], ready: false, checkedMeasures: 0, checkedLeaders: 0 });
    }
    return undefined;
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("reconciliation page", () => {
  it("shows the five live measures and the switch gate through the API", async () => {
    renderWithApi(<ReconciliationPanel />, "dev-admin", reconciliationRoutes());
    expect(await screen.findByText("Verified receipts (net)")).toBeInTheDocument();
    for (const label of ["Imported receipts (confirmed batches)", "Confirmed sales value (net)", "Commissions payable (approved, unpaid)", "Commissions paid"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
    expect(await screen.findByText("Close the month first.")).toBeInTheDocument();
  }, 30_000);

  it("restricts the comparison for an identity without reconciliation.manage", async () => {
    renderWithApi(<ReconciliationPanel />, "dev-ost-a1");
    expect(await screen.findByText(/Maintenance of the comparison is limited|Access Restricted/i)).toBeInTheDocument();
  }, 30_000);
});
