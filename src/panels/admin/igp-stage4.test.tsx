import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { createMockRepositories } from "@/data/mock/repositories";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider, useMockStore } from "@/shared/providers/mock-store-provider";
import { SalesAreaPage } from "./pages/sales-area-page";

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

/** One accredited IGP sale plus its buyer membership (grant signed), before the page loads. */
function SeededMembership({ children }: { children: ReactNode }) {
  const store = useMockStore();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    store.commissionRateSettings.push({ memberId: "mem-ost-a1", product: "IGP", role: "DSC", rateBp: 500, standardRateBp: null });
    void (async () => {
      await admin.igp.act({ type: "accredit", memberId: "mem-ost-a1", number: "JAI23010001", approvedDate: "2023-01-01" });
      const sale = (await admin.igp.act({
        type: "record",
        input: {
          customerId: "cust-a6", projectId: "igp-prj-1", unitId: "igp-unit-1",
          priceCentavos: 180_000_000, scheme: "T", termMonths: 12, clauses: "S", date: "2025-01-10",
          sellerMemberId: "mem-ost-a1", referrerMemberId: null, entry: "reservation",
          payment: { paidDate: "2025-01-10", method: "Cash", amountCentavos: 18_000_000 },
        },
      }))!;
      store.igp.buyerMemberships.push({
        id: "igp-mem-1", saleId: sale.id, seriesNumber: sale.seriesNumber, customerId: sale.customerId,
        tier: "B1", grantSignedDate: "2025-02-13", status: "recorded", stayPoints: "none",
      });
      setReady(true);
    })();
  }, [store]);
  return ready ? children : null;
}

function show() {
  function Wrapper() {
    const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    return (
      <QueryClientProvider client={queryClient}>
        <MockStoreProvider>
          <DevIdentityProvider initialIdentityId="dev-admin">
            <SeededMembership><SalesAreaPage /></SeededMembership>
          </DevIdentityProvider>
        </MockStoreProvider>
      </QueryClientProvider>
    );
  }
  return render(<Wrapper />);
}

describe("IGP buyer membership and history import (Stage 4 UI)", () => {
  it("opens the Import History dialog from the heading button", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/admin/sales?tab=igp");
    show();
    await screen.findByRole("table", { name: "Property Sales (IGP)" });
    await user.click(screen.getByRole("button", { name: "Import History" }));
    expect(await screen.findByRole("dialog", { name: "Import IGP History" })).toBeInTheDocument();
    expect(screen.getByText("No IGP history has been imported yet.")).toBeInTheDocument();
  });

  it("shows the IGP buyer membership with the no-Points exclusion on the sale", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/admin/sales?tab=igp");
    show();
    const table = await screen.findByRole("table", { name: "Property Sales (IGP)" });
    await user.click(within(table).getAllByRole("row")[1]);
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("IGP Buyer Membership")).toBeInTheDocument();
    expect(within(sheet).getByText(/No Stay Points are credited/)).toBeInTheDocument();
  });
});
