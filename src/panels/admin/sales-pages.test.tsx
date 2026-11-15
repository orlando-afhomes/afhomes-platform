import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { CommissionsAreaPage } from "./pages/commissions-area-page";
import { SalesAreaPage } from "./pages/sales-area-page";
import { MembershipAreaPage } from "./pages/membership-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin",
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

afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });

function show(identityId: string, page: ReactElement, tab?: string) {
  window.history.replaceState(null, "", tab ? "/admin?tab=" + tab : "/admin");
  return render(<Wrapper identityId={identityId}>{page}</Wrapper>);
}

describe("process pages are separated", () => {
  it("Sales shows sales records and no Contracts table", async () => {
    show("dev-admin", <SalesAreaPage />, "sales");
    expect(await screen.findByRole("table", { name: "Sales" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Contracts" })).toBeNull();
  });

  it("Sales shows 5 columns and moves dates and reminders to View full details", async () => {
    const user = userEvent.setup();
    show("dev-admin", <SalesAreaPage />, "sales");
    const table = await screen.findByRole("table", { name: "Sales" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent?.trim()).filter((text) => text && text !== "Actions");
    expect(headers).toEqual(["Sale", "Customer", "Plan", "Seller", "Status"]);
    await user.click(within(table).getAllByRole("button", { name: /^Actions for sale for/ })[0]);
    await user.click(await screen.findByRole("menuitem", { name: "View full details" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("Recorded")).toBeInTheDocument();
    expect(within(sheet).getByText("Payment scheme")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Open contract" })).toBeInTheDocument();
  });

  it("Contracts shows the contracts list with a New contract action and a count footer", async () => {
    show("dev-admin", <SalesAreaPage />, "contracts");
    expect(await screen.findByRole("table", { name: "Contracts" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Sales" })).toBeNull();
    expect(screen.getByRole("link", { name: /new contract/i })).toHaveAttribute("href", "/admin/customers/new");
    expect(document.querySelectorAll("tbody tr[data-row-key]")).toHaveLength(4);
  });

  it("Contract Review defaults to the Submitted filter", async () => {
    show("dev-admin", <SalesAreaPage />, "contract-review");
    expect(await screen.findByRole("table", { name: "Contracts" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Contract status filter" })).toHaveValue("Submitted");
  });

  it("Memberships and Activation Queue show different records", async () => {
    const all = show("dev-admin", <MembershipAreaPage />, "memberships");
    expect(await screen.findByRole("table", { name: "Memberships" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Activation queue" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Activation queue" })).toBeNull();
    all.unmount();
    show("dev-admin", <MembershipAreaPage />, "activation");
    expect(await screen.findByRole("table", { name: "Activation queue" })).toBeInTheDocument();
  });

  it("keeps payouts off Commissions and on Commission Payouts", async () => {
    const records = show("dev-finance", <CommissionsAreaPage />, "commissions");
    expect(await screen.findByRole("table", { name: "Commissions" })).toBeInTheDocument();
    expect(screen.queryByText("Payout release")).toBeNull();
    records.unmount();
    show("dev-finance", <CommissionsAreaPage />, "payouts");
    expect(await screen.findByRole("table", { name: "Commission payouts" })).toBeInTheDocument();
  });
});
