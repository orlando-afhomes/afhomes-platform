import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { createMockStore, type MockStore } from "@/data/mock/seed";
import { FinanceAreaPage } from "./finance-area-page";
import { CommissionsAreaPage } from "./commissions-area-page";
import CollectionsRoute from "@/app/admin/finance/collections/page";
import HoldsRoute from "@/app/admin/finance/holds/page";
import PayoutsRoute from "@/app/admin/commissions/payouts/page";
import HistoricalImportRoute from "@/app/admin/reports/historical-import/page";

const navigation = vi.hoisted(() => ({ search: "", redirect: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: navigation.push, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/finance",
  useSearchParams: () => new URLSearchParams(navigation.search),
  redirect: navigation.redirect,
}));

function Wrapper({ children, identityId, store }: { children: React.ReactNode; identityId: string; store?: MockStore }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider store={store}>
        <DevIdentityProvider initialIdentityId={identityId}>{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  navigation.search = "";
  navigation.redirect.mockClear();
  navigation.push.mockClear();
  window.history.replaceState(null, "", "/");
});

function show(page: ReactElement, tab = "", identityId = "dev-finance", store?: MockStore) {
  navigation.search = tab ? `tab=${tab}` : "";
  return render(<Wrapper identityId={identityId} store={store}>{page}</Wrapper>);
}

const tabNames = () => screen.getAllByRole("tab").map((tab) => tab.textContent);

describe("Finance list filters", () => {
  it.each([
    ["cancellations", "Search cancellation requests", /^Open cancellation request from /, "No requests match the filters."],
  ])("search narrows %s", async (tab, searchLabel, rowName, none) => {
    show(<FinanceAreaPage />, tab);
    const [first] = await screen.findAllByRole("row", { name: rowName });
    expect(within(first.closest("table") as HTMLElement).queryByRole("link")).toBeNull();
    await userEvent.type(screen.getByRole("searchbox", { name: searchLabel }), "zzz-no-such-record");
    expect(await screen.findByText(none)).toBeInTheDocument();
    expect(screen.queryByRole("row", { name: rowName })).toBeNull();
  });

  it.each([
    ["cancellations", "Customer, Product, Ground", /^Open cancellation request from /, "/admin/finance/cancellations/"],
  ])("opens the record when a %s row is clicked, with no link column", async (tab, columns, rowName, target) => {
    show(<FinanceAreaPage />, tab);
    const [row] = await screen.findAllByRole("row", { name: rowName });
    expect(headers(row.closest("table") as HTMLElement)).toEqual(columns.split(", "));
    await userEvent.click(row);
    expect(navigation.push).toHaveBeenCalledWith(expect.stringContaining(target));
  });
});

describe("Finance area", () => {
  it("shows the allowed tabs and keeps only the selected panel open", async () => {
    const user = userEvent.setup();
    show(<FinanceAreaPage />);
    expect(await screen.findByRole("heading", { name: "Finance", level: 1 })).toBeInTheDocument();
    expect(tabNames()).toEqual(["Receipts", "Collections", "Cancellations", "Close the Month", "Compare with Spreadsheet"]);
    expect(await screen.findByRole("table", { name: "All payments" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Collections" }));
    expect(await screen.findByRole("table", { name: "Collections" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "All payments" })).toBeNull();
    expect(window.location.search).toBe("?tab=collections");
    expect(screen.getAllByRole("tablist")).toHaveLength(1);
  });

  it("falls back from a removed tab for Finance", async () => {
    show(<FinanceAreaPage />, "holds");
    expect(await screen.findByRole("table", { name: "All payments" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Receipts" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "Holds" })).toBeNull();
  });

  it.each(["dev-hr", "dev-ost-a1", "dev-clerk"])("denies Finance to %s", async (identityId) => {
    show(<FinanceAreaPage />, "verification", identityId);
    expect(await screen.findByRole("heading", { name: "Access restricted" })).toBeInTheDocument();
    expect(screen.queryByRole("tabpanel")).toBeNull();
  });
});

const headers = (table: HTMLElement) => within(table).getAllByRole("columnheader").map((cell) => cell.textContent?.trim()).filter((text) => text && text !== "Actions");

describe("Finance tables stay short", () => {
  it("shows payments as Customer, Amount, Method, Date, Status", async () => {
    navigation.search = "tab=verification&show=all";
    render(<Wrapper identityId="dev-finance"><FinanceAreaPage /></Wrapper>);
    expect(headers(await screen.findByRole("table", { name: "All payments" }))).toEqual(["Customer", "Amount", "Method", "Date", "Status"]);
  });

  it("filters the verification queue to exceptions with the Show filter", async () => {
    const user = userEvent.setup();
    show(<FinanceAreaPage />);
    expect(await screen.findByRole("table", { name: "All payments" })).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "Show" }));
    await user.click(await screen.findByRole("option", { name: "Exceptions" }));
    expect(await screen.findByRole("table", { name: "Receipt exceptions" })).toBeInTheDocument();
  });

  it("opens the waiting queue from an explicit link", async () => {
    const page = () => <Wrapper identityId="dev-finance"><FinanceAreaPage /></Wrapper>;
    const { rerender } = render(page());
    expect(await screen.findByRole("table", { name: "All payments" })).toBeInTheDocument();
    navigation.search = "tab=verification&show=waiting";
    rerender(page());
    expect(await screen.findByRole("table", { name: "Verification queue" })).toBeInTheDocument();
  });

  it("shows collections as Customer, Balance, Overdue, Status, Next due and opens full details", async () => {
    const user = userEvent.setup();
    show(<FinanceAreaPage />, "collections");
    const table = await screen.findByRole("table", { name: "Collections" });
    expect(headers(table)).toEqual(["Customer", "Balance", "Overdue", "Status", "Next Due"]);
    await user.click(within(table).getAllByRole("row")[1]);
    expect(await screen.findByRole("region", { name: "Collection" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Contract" })).toBeInTheDocument();
  });
});

describe("Unmatched receipts (G1)", () => {
  function unmatchedStore() {
    const store = createMockStore();
    store.unmatchedReceipts.push({
      id: "unr-panel-1",
      amountCentavos: 1550000,
      method: "Bank Transfer",
      paidDate: "2026-11-20",
      orNumber: "BT-PANEL-1",
      evidenceFileName: null,
      reason: "Panel test: no matching payment.",
      submittedBy: "dev-clerk",
      submittedAt: "2026-11-20T00:00:00.000Z",
      status: "unmatched",
      matchedPaymentId: null,
      decisionReason: null,
      decidedBy: null,
      decidedAt: null,
      history: [{ at: "2026-11-20T00:00:00.000Z", actorId: "dev-clerk", event: "UNMATCHED_RECEIPT_SUBMITTED", note: "Panel test: no matching payment." }],
    });
    return store;
  }

  it("lists unmatched receipts with their reason in the exceptions tab", async () => {
    const user = userEvent.setup();
    show(<FinanceAreaPage />, "", "dev-finance", unmatchedStore());
    await screen.findByRole("table", { name: "All payments" });
    await user.click(screen.getByRole("combobox", { name: "Show" }));
    await user.click(await screen.findByRole("option", { name: "Exceptions" }));
    const table = await screen.findByRole("table", { name: "Unmatched receipts" });
    expect(within(table).getByRole("row", { name: /BT-PANEL-1/ })).toHaveTextContent("Panel test: no matching payment.");
    await user.click(within(table).getByRole("button", { name: "Match receipt BT-PANEL-1" }));
    expect(await screen.findByRole("dialog", { name: "Match Unmatched Receipt" })).toBeInTheDocument();
  });

  it("records an unmatched receipt from the exceptions tab with one request per click", async () => {
    const user = userEvent.setup();
    show(<FinanceAreaPage />, "", "dev-admin", unmatchedStore());
    await screen.findByRole("table", { name: "All payments" });
    await user.click(screen.getByRole("combobox", { name: "Show" }));
    await user.click(await screen.findByRole("option", { name: "Exceptions" }));
    await screen.findByRole("table", { name: "Unmatched receipts" });
    await user.click(screen.getByRole("button", { name: "Record unmatched receipt" }));
    const dialog = await screen.findByRole("dialog", { name: "Record Unmatched Receipt" });
    await user.type(within(dialog).getByLabelText(/^Amount/), "155");
    await user.type(within(dialog).getByLabelText(/^OR \/ bank reference number/), "BT-PANEL-2");
    await user.type(within(dialog).getByLabelText(/^Why no match was found/), "Panel test intake.");
    const submit = within(dialog).getByRole("button", { name: "Record Receipt" });
    await user.click(submit);
    expect(await within(await screen.findByRole("table", { name: "Unmatched receipts" })).findByRole("row", { name: /BT-PANEL-2/ })).toBeInTheDocument();
  });
});

describe("Collections on payment hold", () => {  it("keeps only memberships on hold with the On payment hold option", async () => {
    const user = userEvent.setup();
    show(<FinanceAreaPage />, "collections");
    const table = await screen.findByRole("table", { name: "Collections" });
    const rows = within(table).getAllByRole("row").length;
    await user.click(screen.getByRole("combobox", { name: "Status filter" }));
    await user.click(await screen.findByRole("option", { name: "On payment hold" }));
    const held = within(await screen.findByRole("table", { name: "Collections" })).queryAllByRole("row").length;
    expect(held).toBeLessThan(rows);
  });
});

describe("Commissions area", () => {
  it("opens a former Payouts link on Commissions, with no Prepare button, and hides Rates", async () => {
    show(<CommissionsAreaPage />, "payouts");
    expect(await screen.findByRole("table", { name: "Commissions" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Commissions" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("button", { name: "Prepare payout list" })).toBeNull();
    expect(tabNames()).toEqual(["Commissions", "Commission Paybacks", "Leader Allowances"]);
  });

  it("lets an Administrator record the signed addendum from Commission Paybacks, and nobody else", async () => {
    const user = userEvent.setup();
    const admin = show(<CommissionsAreaPage />, "recovery", "dev-admin");
    await user.click(await screen.findByRole("button", { name: "Signed Addendum Dates" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("combobox", { name: /Seller/ })).toBeInTheDocument();
    expect(within(dialog).getByText(/Only Internal Sellers \(IST\) sign this/)).toBeInTheDocument();
    admin.unmount();
    show(<CommissionsAreaPage />, "recovery", "dev-finance");
    await screen.findByRole("table", { name: "Commission Paybacks" });
    expect(screen.queryByRole("button", { name: "Signed Addendum Dates" })).toBeNull();
  });

  it("gives a Clerk no Commissions area now that month close prepares the payout list", async () => {
    show(<CommissionsAreaPage />, "rates", "dev-clerk");
    expect(await screen.findByRole("heading", { name: "Access restricted" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Set rate" })).toBeNull();
    expect(screen.queryByText("Approved, unpaid")).toBeNull();
  });

  it("keeps administrator controls out of a seller's view", async () => {
    show(<CommissionsAreaPage />, "rates", "dev-ost-b1");
    await screen.findByRole("tab", { name: "Commission Paybacks" });
    expect(tabNames()).toEqual(["Commissions", "Commission Paybacks"]);
    expect(screen.getByRole("tab", { name: "Commissions" })).toHaveAttribute("aria-selected", "true");
  });
});

it("keeps Finance and Commissions bookmarks working", async () => {
  await CollectionsRoute({ searchParams: Promise.resolve({ q: "sample" }) });
  expect(navigation.redirect).toHaveBeenLastCalledWith("/admin/finance?tab=collections&q=sample");
  await HistoricalImportRoute({ searchParams: Promise.resolve({}) });
  expect(navigation.redirect).toHaveBeenLastCalledWith("/admin/vip-products?tab=historical-import");
  await HoldsRoute({ searchParams: Promise.resolve({}) });
  expect(navigation.redirect).toHaveBeenLastCalledWith("/admin/finance?tab=collections");
  await PayoutsRoute({ searchParams: Promise.resolve({}) });
  expect(navigation.redirect).toHaveBeenLastCalledWith("/admin/commissions?tab=commissions");
});

describe("Month-End Close", () => {
  it("puts the month picker, the red Close month button and the table together", async () => {
    show(<FinanceAreaPage />, "month-end-close", "dev-admin");
    const toolbar = await screen.findByRole("region", { name: "Close a month" });
    expect(within(toolbar).getByLabelText("Month")).toBeInTheDocument();
    expect(within(toolbar).getByRole("button", { name: "Close Month" }).className).toContain("tw:bg-destructive");
    const closed = screen.getByRole("region", { name: "Closed months" });
    expect(headers(await within(closed).findByRole("table", { name: "Closed Months" }))).toEqual(["Month", "Sales", "Net Collections", "Commission", "Closed on"]);
    expect(within(closed).queryByRole("link")).toBeNull();
  });
});
