import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { FinanceAreaPage } from "./finance-area-page";
import { CommissionsAreaPage } from "./commissions-area-page";
import CollectionsRoute from "@/app/admin/finance/collections/page";
import PayoutsRoute from "@/app/admin/commissions/payouts/page";
import HistoricalImportRoute from "@/app/admin/reports/historical-import/page";

const navigation = vi.hoisted(() => ({ search: "", redirect: vi.fn() }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/finance",
  useSearchParams: () => new URLSearchParams(navigation.search),
  redirect: navigation.redirect,
}));

function Wrapper({ children, identityId }: { children: React.ReactNode; identityId: string }) {
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

function show(page: ReactElement, tab = "", identityId = "dev-finance") {
  navigation.search = tab ? `tab=${tab}` : "";
  return render(<Wrapper identityId={identityId}>{page}</Wrapper>);
}

const tabNames = () => screen.getAllByRole("tab").map((tab) => tab.textContent);

describe("Finance list filters", () => {
  it.each([
    ["holds", "Search financial holds", "Open contract", "No holds match the filters."],
    ["cancellations", "Search cancellation requests", "Open request", "No requests match the filters."],
  ])("search narrows %s", async (tab, searchLabel, link, none) => {
    show(<FinanceAreaPage />, tab);
    expect(await screen.findByRole("link", { name: link })).toBeInTheDocument();
    await userEvent.type(screen.getByRole("searchbox", { name: searchLabel }), "zzz-no-such-record");
    expect(await screen.findByText(none)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: link })).toBeNull();
  });
});

describe("Finance area", () => {
  it("shows the allowed tabs and keeps only the selected panel open", async () => {
    const user = userEvent.setup();
    show(<FinanceAreaPage />);
    expect(await screen.findByRole("heading", { name: "Finance", level: 1 })).toBeInTheDocument();
    expect(tabNames()).toEqual(["Verification", "Collections", "Payment history", "Holds", "Cancellations", "Month-end close", "Reconciliation"]);
    expect(await screen.findByRole("table", { name: "Verification queue" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Payment history" }));
    expect(await screen.findByRole("table", { name: "All payments" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Verification queue" })).toBeNull();
    expect(window.location.search).toBe("?tab=payments");
    expect(screen.getAllByRole("tablist")).toHaveLength(1);
  });

  it("falls back from a restricted tab for Finance", async () => {
    show(<FinanceAreaPage />, "historical-import");
    expect(await screen.findByRole("table", { name: "Verification queue" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Verification" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "Historical import" })).toBeNull();
  });

  it.each(["dev-hr", "dev-ost-a1", "dev-clerk"])("denies Finance to %s", async (identityId) => {
    show(<FinanceAreaPage />, "payments", identityId);
    expect(await screen.findByRole("heading", { name: "Access restricted" })).toBeInTheDocument();
    expect(screen.queryByRole("tabpanel")).toBeNull();
  });
});

const headers = (table: HTMLElement) => within(table).getAllByRole("columnheader").map((cell) => cell.textContent?.trim()).filter((text) => text && text !== "Actions");

describe("Finance tables stay short", () => {
  it("shows payments as Customer, Amount, Method, Date, Status", async () => {
    show(<FinanceAreaPage />, "payments");
    expect(headers(await screen.findByRole("table", { name: "All payments" }))).toEqual(["Customer", "Amount", "Method", "Date", "Status"]);
  });

  it("filters the verification queue to exceptions with the Show filter", async () => {
    const user = userEvent.setup();
    show(<FinanceAreaPage />);
    expect(await screen.findByRole("table", { name: "Verification queue" })).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "Show" }));
    await user.click(await screen.findByRole("option", { name: "Exceptions only" }));
    expect(await screen.findByRole("table", { name: "Receipt exceptions" })).toBeInTheDocument();
  });

  it("shows collections as Customer, Balance, Overdue, Status, Next due and opens full details", async () => {
    const user = userEvent.setup();
    show(<FinanceAreaPage />, "collections");
    const table = await screen.findByRole("table", { name: "Collections" });
    expect(headers(table)).toEqual(["Customer", "Balance", "Overdue", "Status", "Next due"]);
    await user.click(within(table).getAllByRole("row")[1]);
    expect(await screen.findByRole("region", { name: "Collection" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open contract" })).toBeInTheDocument();
  });
});

describe("Commissions area", () => {
  it("offers Finance the payout action and hides Rates", async () => {
    show(<CommissionsAreaPage />, "payouts");
    expect(await screen.findByRole("button", { name: "Prepare payout list" })).toBeInTheDocument();
    expect(tabNames()).toEqual(["Commissions", "Payouts", "Recovery", "Allowances"]);
  });

  it("gives a Clerk only the payout list workflow", async () => {
    show(<CommissionsAreaPage />, "rates", "dev-clerk");
    expect(await screen.findByRole("table", { name: "Monthly payout lists" })).toBeInTheDocument();
    expect(tabNames()).toEqual(["Payouts"]);
    expect(screen.queryByRole("button", { name: "Set rate" })).toBeNull();
    expect(screen.queryByText("Approved, unpaid")).toBeNull();
  });

  it("keeps administrator controls out of a seller's view", async () => {
    show(<CommissionsAreaPage />, "rates", "dev-ost-b1");
    await screen.findByRole("tab", { name: "Recovery" });
    expect(tabNames()).toEqual(["Commissions", "Recovery"]);
    expect(screen.getByRole("tab", { name: "Commissions" })).toHaveAttribute("aria-selected", "true");
  });
});

it("keeps Finance and Commissions bookmarks working", async () => {
  await CollectionsRoute({ searchParams: Promise.resolve({ q: "sample" }) });
  expect(navigation.redirect).toHaveBeenLastCalledWith("/admin/finance?tab=collections&q=sample");
  await HistoricalImportRoute({ searchParams: Promise.resolve({}) });
  expect(navigation.redirect).toHaveBeenLastCalledWith("/admin/finance?tab=historical-import");
  await PayoutsRoute({ searchParams: Promise.resolve({}) });
  expect(navigation.redirect).toHaveBeenLastCalledWith("/admin/commissions?tab=payouts");
});
