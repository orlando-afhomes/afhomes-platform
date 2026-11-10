import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Users, Wallet } from "lucide-react";
import { pesos } from "@/shared/lib/money";
import { formatActivityTime } from "./dashboard-activity-list";
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

  it("shows a snapshot KPI with a neutral Current pill and never a percentage", () => {
    const { container } = card({});
    expect(container.textContent).not.toMatch(/%/);
    expect(container.textContent).not.toMatch(/previous period/);
  });

  const previousLabel = "Sep 14, 2026 to Oct 12, 2026";

  it("colors an increase green and states the comparison for assistive technology", () => {
    card({ scope: "Past 28 Days", trend: { result: { kind: "change", percentTenths: 167, direction: "up" }, previousLabel } });
    const pill = screen.getByText("+16.7%").parentElement;
    expect(pill?.className).toContain("tw:bg-success/10");
    expect(screen.getByText(`Up +16.7% compared with ${previousLabel}`)).toHaveClass("tw:sr-only");
    expect(screen.getByText(/vs\. previous period/)).toBeInTheDocument();
    expect(screen.getByText("Past 28 Days,")).toHaveClass("tw:sr-only");
  });

  it("colors a decrease red and keeps no change neutral", () => {
    card({ scope: "Past 28 Days", trend: { result: { kind: "change", percentTenths: -250, direction: "down" }, previousLabel } });
    expect(screen.getByText("-25%").parentElement?.className).toContain("tw:text-destructive");
    cleanup();
    card({ scope: "Past 28 Days", trend: { result: { kind: "change", percentTenths: 0, direction: "flat" }, previousLabel } });
    const flat = screen.getByText("0%").parentElement?.className ?? "";
    expect(flat).toContain("tw:bg-muted");
    expect(flat).not.toContain("success");
    expect(flat).not.toContain("destructive");
  });

  it("says New or No comparison available instead of inventing a percentage", () => {
    card({ scope: "Past 28 Days", trend: { result: { kind: "new" }, previousLabel } });
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).toBeNull();
    cleanup();
    card({ scope: "Past 28 Days", trend: { result: { kind: "none" }, previousLabel } });
    expect(screen.getByText("No comparison available")).toBeInTheDocument();
    expect(screen.queryByText(/vs\. previous period/)).toBeNull();
  });

  it("keeps the decorative wave out of the accessibility tree", () => {
    const { container } = card({});
    const wave = container.querySelector("svg[viewBox='0 0 200 100']");
    expect(wave).toHaveAttribute("aria-hidden", "true");
  });
});

describe("formatActivityTime", () => {
  it("shows the Manila time for today and the date otherwise", () => {
    expect(formatActivityTime("2026-11-10T03:24:00Z", "2026-11-10")).toBe("11:24 AM");
    expect(formatActivityTime("2026-11-07T03:24:00Z", "2026-11-10")).toBe("Nov 7");
    expect(formatActivityTime("2026-11-07", "2026-11-10")).toBe("Nov 7");
    expect(formatActivityTime("2025-12-30", "2026-11-10")).toBe("Dec 30, 2025");
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

  const twoSeries = [
    { key: "sales", label: "Sales", color: "red", values: [0, pesos(240000), -pesos(40000)] },
    { key: "collections", label: "Collections", color: "blue", values: [0, 0, 0], emptyText: "No verified collections in this period." },
  ];

  it("keeps the summary and every series' data table for assistive technology only", () => {
    render(<DashboardTrendChart {...base} dates={["2026-11-01", "2026-11-02", "2026-11-03"]} series={twoSeries} />);
    const region = screen.getByRole("region", { name: "Sales performance" });
    const figure = region.querySelector("figure");
    expect(figure).toHaveClass("tw:sr-only");
    expect(figure?.querySelector("figcaption")?.textContent).toContain(
      "Sales ₱200,000.00; Collections ₱0.00 from Nov 1, 2026 to Nov 3, 2026 (Asia/Manila).",
    );
    const table = within(region).getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(4);
    expect(within(table).getByText("-₱40,000.00")).toBeInTheDocument();
    expect(within(region).queryByText("View chart data")).toBeNull();
  });

  it("switches the visible series with a keyboard-operable segmented control", () => {
    render(<DashboardTrendChart {...base} dates={["2026-11-01", "2026-11-02", "2026-11-03"]} series={twoSeries} />);
    const group = screen.getByRole("radiogroup", { name: "Sales performance series" });
    const sales = within(group).getByRole("radio", { name: "Sales" });
    const collections = within(group).getByRole("radio", { name: "Collections" });
    expect(sales).toHaveAttribute("aria-checked", "true");
    expect(sales).toHaveAttribute("tabindex", "0");
    expect(collections).toHaveAttribute("tabindex", "-1");

    fireEvent.keyDown(sales, { key: "ArrowRight" });
    expect(collections).toHaveAttribute("aria-checked", "true");
    expect(collections).toHaveFocus();
    expect(screen.getByText("No verified collections in this period.")).toBeInTheDocument();

    fireEvent.click(sales);
    expect(sales).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText("No verified collections in this period.")).toBeNull();
  });

  it("hides the switch when only one series is authorized", () => {
    render(<DashboardTrendChart {...base} dates={["2026-11-01", "2026-11-02"]} series={[twoSeries[0]]} />);
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });

  it("shows truthful empty and invalid-range states instead of a chart", () => {
    render(<DashboardTrendChart {...base} dates={["2026-11-01"]} series={[{ key: "s", label: "Sales", color: "red", values: [0] }]} />);
    expect(screen.getByText("No confirmed sales in this period.")).toBeInTheDocument();
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
    expect(
      screen.getByRole("img", { name: "Receivables overview: 3 contracts. Settled: 1 contract, 33.3%. Overdue: 2 contracts, 66.7%." }),
    ).toBeInTheDocument();
    const region = screen.getByRole("region", { name: "Receivables overview" });
    expect(region).not.toHaveAttribute("aria-label");
    expect(document.getElementById(region.getAttribute("aria-labelledby") ?? "")).toHaveTextContent("Receivables overview");
    expect(region).toHaveAccessibleDescription("Finalized contracts.");
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
