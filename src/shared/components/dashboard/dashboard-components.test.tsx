import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Users, Wallet } from "lucide-react";
import { pesos } from "@/shared/lib/money";
import { DashboardDistributionChart } from "./dashboard-distribution-chart";
import { DashboardKpiCard, DashboardKpiGrid } from "./dashboard-kpi";
import { DashboardPendingActions, DashboardPendingItem } from "./dashboard-pending-actions";
import { DashboardTrendChart } from "./dashboard-trend-chart";

afterEach(cleanup);

describe("DashboardKpiCard", () => {
  function card(props: Partial<Parameters<typeof DashboardKpiCard>[0]>) {
    return render(
      <DashboardKpiGrid columns={1}>
        <DashboardKpiCard label="Customers" value="5" icon={Users} scope="Current" description="Visible to your role" {...props} />
      </DashboardKpiGrid>,
    );
  }

  it("pairs the label with its value and states the scope", () => {
    card({});
    const term = screen.getByText("Customers", { selector: "dt" });
    expect(term.nextElementSibling).toHaveTextContent("5");
    expect(screen.getByText("Current")).toBeInTheDocument();
    expect(screen.getByText(/Visible to your role/)).toBeInTheDocument();
  });

  it("shows a skeleton while loading and an honest message on error", () => {
    const { container } = card({ loading: true });
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
    expect(screen.queryByText("5")).toBeNull();
    cleanup();
    card({ error: new Error("boom") });
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/Visible to your role/)).toBeNull();
  });
});

describe("DashboardTrendChart", () => {
  const base = {
    title: "Sales performance",
    description: "Confirmed sales value over time.",
    loading: false,
    error: null,
    emptyText: "No confirmed sales in this period.",
  };

  it("summarizes every series and exposes the daily data table", () => {
    render(
      <DashboardTrendChart
        {...base}
        dates={["2026-11-01", "2026-11-02", "2026-11-03"]}
        series={[
          { key: "sales", label: "Confirmed sales value", color: "red", values: [0, pesos(240000), -pesos(40000)], area: true },
          { key: "collections", label: "Verified collections", color: "blue", values: [pesos(1000), 0, 0] },
        ]}
      />,
    );
    const region = screen.getByRole("region", { name: "Sales performance" });
    expect(region.querySelector("figcaption")?.textContent).toContain(
      "Confirmed sales value ₱200,000.00; Verified collections ₱1,000.00 from Nov 1, 2026 to Nov 3, 2026 (Asia/Manila).",
    );
    fireEvent.click(within(region).getByText("View chart data"));
    const table = within(region).getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getByText("-₱40,000.00")).toBeInTheDocument();
  });

  it("shows truthful empty and invalid-range states instead of a chart", () => {
    render(<DashboardTrendChart {...base} dates={["2026-11-01"]} series={[{ key: "s", label: "Sales", color: "red", values: [0] }]} />);
    expect(screen.getByText("No confirmed sales in this period.")).toBeInTheDocument();
    expect(screen.queryByText("View chart data")).toBeNull();
    cleanup();
    render(<DashboardTrendChart {...base} dates={[]} series={[]} invalidRange />);
    expect(screen.getByText("Select a valid date range to see this chart.")).toBeInTheDocument();
  });

  it("reports load errors", () => {
    render(<DashboardTrendChart {...base} dates={[]} series={[]} error={new Error("Could not load sales.")} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not load sales.");
  });
});

describe("DashboardDistributionChart", () => {
  it("shows counts, shares, amounts and an accessible summary", () => {
    render(
      <DashboardDistributionChart
        title="Receivables overview"
        description="Finalized contracts."
        unit={["contract", "contracts"]}
        loading={false}
        error={null}
        emptyText="None."
        rows={[
          { key: "settled", label: "Settled", count: 1, color: "green" },
          { key: "overdue", label: "Overdue", count: 2, color: "red", amountCentavos: pesos(172500) },
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: "Receivables overview: Settled 1, Overdue 2, total 3." })).toBeInTheDocument();
    expect(screen.getByText("33.3%")).toBeInTheDocument();
    expect(screen.getByText("66.7%")).toBeInTheDocument();
    expect(screen.getByText("₱172,500.00")).toBeInTheDocument();
  });

  it("shows the empty text when nothing is counted", () => {
    render(
      <DashboardDistributionChart title="Mix" description="d" unit={["sale", "sales"]} loading={false} error={null} emptyText="No confirmed sales yet." rows={[{ key: "a", label: "A", count: 0, color: "red" }]} />,
    );
    expect(screen.getByText("No confirmed sales yet.")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });
});

describe("DashboardPendingItem", () => {
  it("names the queue and its real count for assistive technology", () => {
    render(
      <DashboardPendingActions>
        <DashboardPendingItem href="/admin/finance" label="Payment Verification" count={3} icon={Wallet} />
        <DashboardPendingItem href="/admin/finance/holds" label="Financial Holds" count={0} icon={Wallet} error={new Error("x")} />
      </DashboardPendingActions>,
    );
    expect(screen.getByRole("link", { name: "Payment Verification: 3 pending" })).toHaveAttribute("href", "/admin/finance");
    expect(screen.getByRole("link", { name: "Financial Holds: count unavailable" })).toBeInTheDocument();
  });
});
