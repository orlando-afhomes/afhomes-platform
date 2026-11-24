import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createMockStore } from "@/data/mock/seed";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
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

// The seed holds an accredited IGP cash sale with a signed Formal VIP Grant (its buyer membership)
// and one imported IGP history batch; both are read from the store.
const seed = createMockStore();
const seededMembership = seed.igp.buyerMemberships[0];

function show() {
  function Wrapper() {
    const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    return (
      <QueryClientProvider client={queryClient}>
        <MockStoreProvider>
          <DevIdentityProvider initialIdentityId="dev-admin">
            <SalesAreaPage />
          </DevIdentityProvider>
        </MockStoreProvider>
      </QueryClientProvider>
    );
  }
  return render(<Wrapper />);
}

describe("IGP buyer membership and available actions", () => {
  it("keeps accreditation history accessible and hides the import action", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/admin/sales?tab=igp");
    show();
    await screen.findByRole("table", { name: "Property Sales" });
    await user.click(screen.getByRole("button", { name: "More actions" }));
    expect(await screen.findByRole("menuitem", { name: "Approval History" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Import History" })).toBeNull();
  });

  it("shows the IGP buyer membership with the no-Points exclusion on the sale", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/admin/sales?tab=igp");
    show();
    const table = await screen.findByRole("table", { name: "Property Sales" });
    expect(seededMembership).toMatchObject({ status: "recorded", stayPoints: "none" });
    await user.click(within(table).getByRole("row", { name: `Open property sale (IGP) ${seededMembership.seriesNumber}` }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("IGP Buyer Membership")).toBeInTheDocument();
    expect(within(sheet).getByText(/No Stay Points are credited/)).toBeInTheDocument();
  });
});
