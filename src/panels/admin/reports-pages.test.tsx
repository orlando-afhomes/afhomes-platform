import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { MockReportRepository } from "@/data/mock/report-repository";
import { manilaToday } from "@/shared/lib/dates";
import { formatDate } from "@/shared/lib/format-date";
import { CollectionsReportPage } from "./pages/collections-report-page";
import { CommissionReportPage } from "./pages/commission-report-page";
import { CustomerGrowthReportPage } from "./pages/customer-growth-report-page";
import { MembershipReportPage } from "./pages/membership-report-page";
import { SalesPerformanceReportPage } from "./pages/sales-performance-report-page";
import { StayPointsReportPage } from "./pages/stay-points-report-page";
import { PromoPointsReportPage } from "./pages/promo-points-report-page";
import { previousPeriod, ReportsSummaryPanel } from "./components/reports-summary-panel";
import { ReportsAreaPage } from "./pages/reports-area-page";
import CustomerGrowthRoute from "@/app/admin/reports/customer-growth/page";
import CollectionsRoute from "@/app/admin/reports/collections/page";

const navigation = vi.hoisted(() => ({ search: "", redirect: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/reports",
  useSearchParams: () => new URLSearchParams(navigation.search),
  redirect: navigation.redirect,
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

afterEach(() => {
  cleanup();
  navigation.search = "";
  navigation.redirect.mockClear();
  window.history.replaceState(null, "", "/");
});

function show(identityId: string, page: ReactElement) {
  return render(<Wrapper identityId={identityId}>{page}</Wrapper>);
}

const TILES = {
  sales: "Period Sales",
  growth: "New Customers",
  collections: "Verified Collections",
  commissions: "Approved",
  membership: "Activated",
  points: "Points Given",
  promo: "Points Earned",
};

describe("report pages", () => {
  const cases: [string, ReactElement, keyof typeof TILES][] = [
    ["sales", <SalesPerformanceReportPage key="s" />, "sales"],
    ["growth", <CustomerGrowthReportPage key="g" />, "growth"],
    ["collections", <CollectionsReportPage key="c" />, "collections"],
    ["commissions", <CommissionReportPage key="m" />, "commissions"],
    ["membership", <MembershipReportPage key="b" />, "membership"],
    ["points", <StayPointsReportPage key="p" />, "points"],
    ["promo", <PromoPointsReportPage key="o" />, "promo"],
  ];
  it.each(cases)("%s report shows only its own tiles", async (_name, page, own) => {
    show("dev-finance", page);
    // Table cells and headers can repeat a tile label (for example "Approved"), so match all occurrences.
    expect((await screen.findAllByText(TILES[own])).length).toBeGreaterThan(0);
    expect(screen.queryByText(/No targets or unapproved formulas/)).toBeNull();
    for (const [key, label] of Object.entries(TILES)) {
      if (key !== own) expect(screen.queryAllByText(label)).toHaveLength(0);
    }
    expect(screen.getAllByRole("button", { name: /Export/ })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /^(Excel|CSV|Print)$/ })).toBeNull();
    // Each report has its own From and To fields; the old preset select is gone.
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Date range" })).toBeNull();
    expect(screen.queryByText(/Role-scoped figures/)).toBeNull();
    // Each stat card is one <dl>; a report shows at most 3.
    expect(document.querySelectorAll("dl").length).toBeLessThanOrEqual(3);
  });

  it("shows a busy Export trigger while the export is being recorded", async () => {
    const user = userEvent.setup();
    const record = vi.spyOn(MockReportRepository.prototype, "recordExport").mockImplementationOnce(() => new Promise(() => {}));
    show("dev-finance", <SalesPerformanceReportPage />);
    const trigger = await screen.findByRole("button", { name: /Export/ });
    await user.click(trigger);
    await user.click(await screen.findByRole("menuitem", { name: /Excel/ }));
    await waitFor(() => expect(record).toHaveBeenCalledTimes(1));
    expect(trigger).toHaveAttribute("aria-busy", "true");
  });

  it("shows at most 5 columns on screen and every column in the row details", async () => {
    show("dev-finance", <CommissionReportPage />);
    const table = await screen.findByRole("table", { name: "Commission Report" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers.filter((text) => text !== "Actions")).toEqual(["Recipient", "Role", "Customer", "Amount", "Status"]);
    const rows = within(table).getAllByRole("row").slice(1);
    if (within(rows[0]).queryByText("No commissions match.")) return;
    fireEvent.click(rows[0].querySelectorAll("td")[0]);
    const sheet = await screen.findByRole("dialog");
    const terms = Array.from(sheet.querySelectorAll("dt")).map((term) => term.textContent);
    expect(terms).toEqual(["Recipient", "Role", "Customer", "Product", "Amount", "Status", "Approved", "Paid"]);
  });

  it("filters the customer growth table by search text", async () => {
    show("dev-finance", <CustomerGrowthReportPage />);
    await screen.findAllByText("New Customers");
    const table = await screen.findByRole("table", { name: "Customer Growth" });
    const before = within(table).queryAllByRole("row").length;
    fireEvent.change(screen.getByLabelText("Search customers"), { target: { value: "zzzz-no-such-customer" } });
    expect(await screen.findByText("No customers match.")).toBeInTheDocument();
    expect(before).toBeGreaterThanOrEqual(1);
  });

  it("denies the collections report without finance.reports.view", async () => {
    show("dev-ost-a1", <CollectionsReportPage />);
    expect(await screen.findByText(/Access restricted/)).toBeInTheDocument();
    expect(screen.queryByText(TILES.collections)).toBeNull();
  });
});

describe("previous period", () => {
  it("is the same number of days right before the range", () => {
    expect(previousPeriod({ from: "2026-11-01", to: "2026-11-10" })).toMatchObject({ from: "2026-10-22", to: "2026-10-31", comparable: true });
    expect(previousPeriod({ from: "2026-11-15", to: "2026-11-15" })).toMatchObject({ from: "2026-11-14", to: "2026-11-14", comparable: true });
  });

  it("has nothing to compare when a date is cleared or the range is reversed", () => {
    expect(previousPeriod({ from: "1900-01-01", to: "2026-11-10" }).comparable).toBe(false);
    expect(previousPeriod({ from: "2026-11-10", to: "2999-12-31" }).comparable).toBe(false);
    expect(previousPeriod({ from: "2026-11-10", to: "2026-11-01" }).comparable).toBe(false);
  });
});

describe("reports summary", () => {
  it("shows one card per report and opens a report on click", async () => {
    const onOpen = vi.fn();
    show("dev-finance", <ReportsSummaryPanel onOpen={onOpen} />);
    await screen.findByRole("button", { name: "Open the Collections report" });
    const buttons = await screen.findAllByRole("button", { name: /^Open the .* report$/ });
    expect(buttons.map((button) => button.getAttribute("aria-label"))).toEqual([
      "Open the Sales report",
      "Open the Collections report",
      "Open the Commissions report",
      "Open the Customers report",
      "Open the Membership report",
      "Open the Stay Points report",
      "Open the Promo Points report",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Open the Collections report" }));
    expect(onOpen).toHaveBeenCalledWith("collections");
  });

  it("groups the cards under Money, People and Points and offers From and To dates", async () => {
    show("dev-finance", <ReportsSummaryPanel onOpen={vi.fn()} />);
    await screen.findByRole("button", { name: "Open the Collections report" });
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual(["Money", "People", "Points"]);
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    expect(screen.getByLabelText("To")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Date range" })).toBeNull();
    // Every card is clickable through one overlay button named "Open the ... report".
    expect(screen.getAllByRole("button", { name: /^Open the .+ report$/ })).toHaveLength(7);
  });

  it("hides the Collections card without finance.reports.view", async () => {
    show("dev-ost-a1", <ReportsSummaryPanel onOpen={vi.fn()} />);
    expect(await screen.findByRole("button", { name: "Open the Sales report" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open the Collections report" })).toBeNull();
  });
});

describe("reports area page", () => {
  const tabNames = () => screen.getAllByRole("tab").map((tab) => tab.textContent);

  it("shows every report tab, Collections included, to Finance", async () => {
    show("dev-finance", <ReportsAreaPage />);
    await screen.findByRole("tablist", { name: "Reports" });
    expect(tabNames()).toEqual(["Summary", "Sales", "Customers", "Collections", "Commissions", "Membership", "Stay Points", "Promo Points"]);
  });

  it("hides the Collections tab from an OST and falls back from ?tab=collections", async () => {
    navigation.search = "tab=collections";
    show("dev-ost-a1", <ReportsAreaPage />);
    await screen.findByRole("tablist", { name: "Reports" });
    expect(tabNames()).not.toContain("Collections");
    expect(screen.getByRole("tab", { name: "Summary" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByText(/Access restricted/)).toBeNull();
  });

  it("opens a report tab from its Summary card", async () => {
    show("dev-finance", <ReportsAreaPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Open the Sales report" }));
    expect(screen.getByRole("tab", { name: "Sales" })).toHaveAttribute("aria-selected", "true");
    expect((await screen.findAllByText("Period Sales")).length).toBeGreaterThan(0);
    expect(window.location.search).toBe("?tab=sales");
    expect(document.querySelector(".report-print__page")).not.toBeNull();
  });

  it("keeps one date range from Summary to a report tab and back", async () => {
    const user = userEvent.setup();
    show("dev-finance", <ReportsAreaPage />);
    await screen.findByRole("tablist", { name: "Reports" });
    const rangeText = () => document.querySelector(".report-print__range")?.textContent;

    // The hub starts on the 28-day default.
    const initial = rangeText();
    expect(initial).toMatch(/^Date range: .+ to .+$/);

    // Pick a one-day range on the Summary tab.
    const today = manilaToday();
    fireEvent.change(screen.getByLabelText("From"), { target: { value: today } });
    const label = formatDate(today);
    await waitFor(() => expect(rangeText()).toBe(`Date range: ${label} to ${label}`));
    const chosen = rangeText();
    expect(chosen).not.toBe(initial);

    // A report tab opened from a Summary card keeps the same range.
    await user.click(screen.getByRole("button", { name: "Open the Sales report" }));
    expect(screen.getByRole("tab", { name: "Sales" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(rangeText()).toBe(chosen));
    expect(screen.getByLabelText("From")).toHaveValue(today);
    expect(screen.getByLabelText("To")).toHaveValue(today);

    // Back on Summary the chosen range is still there.
    await user.click(screen.getByRole("tab", { name: "Summary" }));
    expect(screen.getByRole("tab", { name: "Summary" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(rangeText()).toBe(chosen));
    expect(screen.getByLabelText("From")).toHaveValue(today);
  });

  it("redirects the former report routes to their tab", async () => {
    await CustomerGrowthRoute({ searchParams: Promise.resolve({}) });
    expect(navigation.redirect).toHaveBeenLastCalledWith("/admin/reports?tab=customers");
    await CollectionsRoute({ searchParams: Promise.resolve({ q: "x" }) });
    expect(navigation.redirect).toHaveBeenLastCalledWith("/admin/reports?tab=collections&q=x");
  });
});
