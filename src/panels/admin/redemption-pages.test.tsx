import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { RedemptionAreaPage } from "./pages/redemption-page";
import { VipProductsAreaPage } from "./pages/vip-products-page";
import { RedemptionHolidaysPanel, RedemptionVenuesPanel } from "./pages/redemption-points-table-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/redemption",
  useSearchParams: () => new URLSearchParams(window.location.search),
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
function show(identityId: string, tab = "bookings") {
  window.history.replaceState(null, "", `/admin/redemption?tab=${tab}`);
  return render(<Wrapper identityId={identityId}><RedemptionAreaPage /></Wrapper>);
}

/** The points table, holidays and venues tabs now live in the Settings area. */
function showSettings(identityId: string, tab: string) {
  window.history.replaceState(null, "", `/admin/vip-products?tab=${tab}`);
  return render(<Wrapper identityId={identityId}><VipProductsAreaPage /></Wrapper>);
}

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("redemption pages", () => {
  it("shows the booking action to the Administrator and no sample notice", async () => {
    show("dev-admin");
    expect(await screen.findByRole("button", { name: /New Booking/ })).toBeInTheDocument();
    expect(screen.queryByText(/Sample table/)).toBeNull();
    expect(screen.getByRole("button", { name: /New Booking/ })).toBeInTheDocument();
  });

  it("lets Finance view bookings but not create one", async () => {
    show("dev-finance");
    expect(await screen.findByRole("table", { name: "Redemption Bookings" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New Booking/ })).toBeNull();
  });

  it("shows the points table and the update action to the Administrator, in plain words, with no sample labels", async () => {
    showSettings("dev-admin", "points-table");
    expect(await screen.findByRole("table", { name: "Points per Night" })).toBeInTheDocument();
    expect(screen.queryByText(/Sample table|Sample values|\(sample\)/)).toBeNull();
    expect(screen.getByRole("button", { name: /Update points table/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New version/ })).toBeNull();
    expect(screen.getByText(/Weekend nights: /)).toBeInTheDocument();
    const select = screen.getByRole("combobox", { name: "Points table" });
    expect((select as HTMLInputElement).value).toMatch(/From [A-Z][a-z]{2} \d{1,2}, \d{4} \((in use|coming up|old)\)/);
    expect(screen.queryByText(/Version \d/)).toBeNull();
  });

  it("keeps both tables to five plain-word columns with no static notes", async () => {
    show("dev-admin");
    const bookings = await screen.findByRole("table", { name: "Redemption Bookings" });
    const bookingHeaders = within(bookings).getAllByRole("columnheader").map((cell) => cell.textContent?.trim()).filter((text) => text && text !== "Actions");
    expect(bookingHeaders).toEqual(["Booking no.", "Cardholder", "Venue", "Stay Dates", "Status"]);
    await userEvent.click(screen.getByRole("tab", { name: "Card Points" }));
    expect(screen.queryByRole("table", { name: "Redemption Bookings" })).toBeNull();
    const members = await screen.findByRole("table", { name: "Points by Cardholder" });
    const memberHeaders = within(members).getAllByRole("columnheader").map((cell) => cell.textContent?.trim()).filter((text) => text && text !== "Actions");
    expect(memberHeaders).toEqual(["Cardholder", "VIP no.", "Weekday Points", "Weekend Points", "Can Book"]);
    expect(screen.queryByText(/no cash value/)).toBeNull();
    expect(screen.queryByText(/wd|we/)).toBeNull();
  });

  it("moves reserved points to the cardholder details", async () => {
    show("dev-admin", "cardholder-points");
    const table = await screen.findByRole("table", { name: "Points by Cardholder" });
    expect(within(table).queryByText(/reserved/)).toBeNull();
    const [firstRow] = within(table).getAllByRole("row", { name: /^Open points for / });
    await userEvent.click(firstRow);
    expect(await screen.findByText("Weekday points reserved")).toBeInTheDocument();
    expect(screen.getByText("Weekend points reserved")).toBeInTheDocument();
  });

  it("hides the points table, holidays and venues tabs from Finance", async () => {
    show("dev-finance", "venues");
    expect(await screen.findByRole("table", { name: "Redemption Bookings" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Bookings" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Card Points" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Points table" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Holidays" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Venues" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Update points table|Add holiday|Add venue/ })).toBeNull();
  });

  it("renders the holiday calendar and venues read-only with no Actions column for Finance", async () => {
    const { unmount } = render(<Wrapper identityId="dev-finance"><RedemptionHolidaysPanel /></Wrapper>);
    const holidays = await screen.findByRole("table", { name: "Holiday Calendar" });
    expect(within(holidays).getAllByRole("columnheader").map((cell) => cell.textContent?.trim())).toEqual(["Name", "Date", "Status"]);
    expect(within(holidays).queryByText("Actions")).toBeNull();
    unmount();

    render(<Wrapper identityId="dev-finance"><RedemptionVenuesPanel /></Wrapper>);
    const venues = await screen.findByRole("table", { name: "Venues" });
    expect(within(venues).getAllByRole("columnheader").map((cell) => cell.textContent?.trim())).toEqual(["Venue", "Status", "Cancellation Cut-Off", "Check-In Time"]);
    expect(within(venues).queryByText("Actions")).toBeNull();
  });

  it("labels a venue that is not open yet as Coming soon and opens its row for editing", async () => {
    showSettings("dev-admin", "venues");
    const table = await screen.findByRole("table", { name: "Venues" });
    expect(within(table).queryByText("Not open yet")).toBeNull();
    expect(screen.queryByText("View full details")).toBeNull();
    const rows = within(table).getAllByRole("row", { name: /^Open venue / });
    expect(rows.length).toBeGreaterThan(0);
    await userEvent.click(rows[0]);
    expect(await screen.findByRole("heading", { name: "Edit Venue" })).toBeInTheDocument();
  });

  it("denies sellers", async () => {
    show("dev-ost-a1");
    expect(await screen.findByText(/does not have access to Redemption/)).toBeInTheDocument();
  });
});
