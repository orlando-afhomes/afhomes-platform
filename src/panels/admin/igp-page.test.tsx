import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { createMockRepositories } from "@/data/mock/repositories";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider, useMockStore } from "@/shared/providers/mock-store-provider";
import { IgpTab } from "./pages/igp-page";
import SalesRoute from "@/app/admin/sales/page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

/** Records one accredited IGP sale with its reservation receipt before the page loads. */
function SeededIgp({ children }: { children: ReactNode }) {
  const store = useMockStore();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    store.commissionRateSettings.push({ memberId: "mem-ost-a1", product: "IGP", role: "DSC", rateBp: 500, standardRateBp: null });
    void (async () => {
      await admin.igp.act({ type: "accredit", memberId: "mem-ost-a1", number: "JAI23010001", approvedDate: "2023-01-01" });
      await admin.igp.act({
        type: "record",
        input: {
          customerId: "cust-a6", project: "Sample Project", unit: "Lot 12", propertyOwner: "Sample Owner",
          priceCentavos: 180_000_000, scheme: "T", termMonths: 12, clauses: "S", date: "2025-01-10",
          sellerMemberId: "mem-ost-a1", referrerMemberId: null, entry: "reservation",
          payment: { paidDate: "2025-01-10", method: "Cash", amountCentavos: 18_000_000, referenceNo: "IGP-0101" },
        },
      });
      setReady(true);
    })();
  }, [store]);
  return ready ? children : null;
}

function show(identityId = "dev-admin", page: ReactNode = <IgpTab />) {
  function Wrapper() {
    const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    return (
      <QueryClientProvider client={queryClient}>
        <MockStoreProvider>
          <DevIdentityProvider initialIdentityId={identityId}>
            <SeededIgp>{page}</SeededIgp>
          </DevIdentityProvider>
        </MockStoreProvider>
      </QueryClientProvider>
    );
  }
  return render(<Wrapper />);
}

describe("Sales area", () => {
  it("offers an Administrator all sales tabs and opens contract actions from the URL", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/admin/sales?tab=contracts");
    show("dev-admin", <SalesRoute />);
    const tabs = await screen.findByRole("tablist", { name: "Sales" });
    expect(within(tabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Sales", "Contracts", "Contract review", "IGP"]);
    expect(within(tabs).getByRole("tab", { name: "Contracts" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: "New contract" })).toHaveAttribute("href", "/admin/customers/new");
    const table = await screen.findByRole("table", { name: "Contracts" });
    await user.click(within(table).getAllByRole("button", { name: /^Actions for/ })[0]);
    await user.click(await screen.findByRole("menuitem", { name: "View full details" }));
    const details = await screen.findByRole("dialog");
    expect(within(details).getByText("Payment scheme")).toBeInTheDocument();
    expect(within(details).getByRole("link", { name: "Open contract" })).toHaveAttribute("href", expect.stringMatching(/^\/admin\/sales\/contracts\//));
  });

  it("hides Contract review from sellers and falls back to the Sales tab", async () => {
    window.history.replaceState(null, "", "/admin/sales?tab=contract-review");
    show("dev-ost-a1", <SalesRoute />);
    const tabs = await screen.findByRole("tablist", { name: "Sales" });
    expect(within(tabs).queryByRole("tab", { name: "Contract review" })).toBeNull();
    expect(within(tabs).getByRole("tab", { name: "Sales" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("link", { name: "New contract" })).toBeNull();
  });

  it("opens IGP for Finance even when the URL points at a restricted tab", async () => {
    window.history.replaceState(null, "", "/admin/sales?tab=contract-review");
    show("dev-finance", <SalesRoute />);
    expect(await screen.findByRole("table", { name: "IGP Sales" })).toBeInTheDocument();
    expect(within(screen.getByRole("tablist", { name: "Sales" })).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["IGP"]);
    expect(screen.queryByRole("button", { name: "Record sale" })).toBeNull();
  });
});

describe("IGP Sales page", () => {
  it("shows the register in 5 columns and opens the sale with its actions in a details panel", async () => {
    const user = userEvent.setup();
    show();
    const table = await screen.findByRole("table", { name: "IGP Sales" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent?.trim()).filter((text) => text && text !== "Actions");
    expect(headers).toEqual(["Series Number", "Buyer", "Property", "Contract price", "Status"]);
    expect(screen.getByRole("button", { name: "JA&D history" })).toBeInTheDocument();
    await user.click(within(table).getByRole("button", { name: /^Actions for/ }));
    await user.click(await screen.findByRole("menuitem", { name: "View full details" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("Approved collections")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "IGP-0101" })).toBeInTheDocument();
    expect(within(sheet).getByRole("heading", { name: "JA&D accreditation history" })).toBeInTheDocument();
    // Receipt status is a plain word, never a raw code such as "under_review".
    expect(within(sheet).queryByText(/_/)).toBeNull();
    expect(within(sheet).getByRole("button", { name: "Approve sale" })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Cancel sale" })).toBeInTheDocument();
  });
});
