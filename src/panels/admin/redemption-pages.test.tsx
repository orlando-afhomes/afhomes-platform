import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { RedemptionAreaPage } from "./pages/redemption-page";
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

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

describe("redemption pages", () => {
  it("shows the booking action to the Administrator and no sample notice", async () => {
    show("dev-admin");
    expect(await screen.findByRole("button", { name: /New booking/ })).toBeInTheDocument();
    expect(screen.queryByText(/Sample table/)).toBeNull();
    expect(screen.getByRole("button", { name: /New booking/ })).toBeInTheDocument();
  });

  it("lets Finance view bookings but not create one", async () => {
    show("dev-finance");
    expect(await screen.findByRole("table", { name: "Redemption bookings" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New booking/ })).toBeNull();
  });

  it("shows the points table and the new-version action to the Administrator, with no sample labels", async () => {
    show("dev-admin", "points-table");
    expect(await screen.findByRole("table", { name: "Points per night" })).toBeInTheDocument();
    expect(screen.queryByText(/Sample table|Sample values|\(sample\)/)).toBeNull();
    expect(screen.getByRole("button", { name: /New version/ })).toBeInTheDocument();
  });

  it("keeps both tables to five plain-word columns with no static notes", async () => {
    show("dev-admin");
    const bookings = await screen.findByRole("table", { name: "Redemption bookings" });
    const bookingHeaders = within(bookings).getAllByRole("columnheader").map((cell) => cell.textContent?.trim()).filter((text) => text && text !== "Actions");
    expect(bookingHeaders).toEqual(["Booking no.", "Cardholder", "Stay dates", "Points", "Status"]);
    await userEvent.click(screen.getByRole("tab", { name: "Cardholder points" }));
    expect(screen.queryByRole("table", { name: "Redemption bookings" })).toBeNull();
    const members = await screen.findByRole("table", { name: "Points by cardholder" });
    const memberHeaders = within(members).getAllByRole("columnheader").map((cell) => cell.textContent?.trim()).filter((text) => text && text !== "Actions");
    expect(memberHeaders).toEqual(["Cardholder", "VIP no.", "Weekday points", "Weekend points", "Can book"]);
    expect(screen.queryByText(/no cash value/)).toBeNull();
    expect(screen.queryByText(/wd|we/)).toBeNull();
  });

  it("moves reserved points to the cardholder details", async () => {
    show("dev-admin", "cardholder-points");
    const table = await screen.findByRole("table", { name: "Points by cardholder" });
    expect(within(table).queryByText(/reserved/)).toBeNull();
    const [firstRow] = within(table).getAllByRole("row", { name: /^Open points for / });
    await userEvent.click(firstRow);
    expect(await screen.findByText("Weekday points reserved")).toBeInTheDocument();
    expect(screen.getByText("Weekend points reserved")).toBeInTheDocument();
  });

  it("hides the points table, holidays and venues tabs from Finance", async () => {
    show("dev-finance", "venues");
    expect(await screen.findByRole("table", { name: "Redemption bookings" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Bookings" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Cardholder points" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Points table" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Holidays" })).toBeNull();
    expect(screen.queryByRole("tab", { name: "Venues" })).toBeNull();
    expect(screen.queryByRole("button", { name: /New version|Add holiday|Add venue/ })).toBeNull();
  });

  it("renders the holiday calendar and venues read-only with no Actions column for Finance", async () => {
    const { unmount } = render(<Wrapper identityId="dev-finance"><RedemptionHolidaysPanel /></Wrapper>);
    const holidays = await screen.findByRole("table", { name: "Holiday calendar" });
    expect(within(holidays).getAllByRole("columnheader").map((cell) => cell.textContent?.trim())).toEqual(["Date", "Name", "Status"]);
    expect(within(holidays).queryByText("Actions")).toBeNull();
    unmount();

    render(<Wrapper identityId="dev-finance"><RedemptionVenuesPanel /></Wrapper>);
    const venues = await screen.findByRole("table", { name: "Venues" });
    expect(within(venues).getAllByRole("columnheader").map((cell) => cell.textContent?.trim())).toEqual(["Venue", "Status", "Cancellation cut-off", "Check-in time"]);
    expect(within(venues).queryByText("Actions")).toBeNull();
  });

  it("denies sellers", async () => {
    show("dev-ost-a1");
    expect(await screen.findByText(/does not have access to Redemption/)).toBeInTheDocument();
  });
});
