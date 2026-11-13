import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { RedemptionPage } from "./pages/redemption-page";
import { RedemptionPointsTablePage } from "./pages/redemption-points-table-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/redemption",
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
const show = (identityId: string, page: ReactElement) => render(<Wrapper identityId={identityId}>{page}</Wrapper>);

afterEach(cleanup);

describe("redemption pages", () => {
  it("shows the sample table notice and the booking action to the Administrator", async () => {
    show("dev-admin", <RedemptionPage />);
    expect(await screen.findByText("Sample table. Replace with the approved table.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New booking/ })).toBeInTheDocument();
  });

  it("lets Finance view bookings but not create one", async () => {
    show("dev-finance", <RedemptionPage />);
    expect(await screen.findByRole("table", { name: "Redemption bookings" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /New booking/ })).toBeNull();
  });

  it("shows the points table with the sample notice and the new-version action to the Administrator", async () => {
    show("dev-admin", <RedemptionPointsTablePage />);
    expect(await screen.findByText("Sample table. Replace with the approved table.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New version/ })).toBeInTheDocument();
  });

  it("denies sellers", async () => {
    show("dev-ost-a1", <RedemptionPage />);
    expect(await screen.findByText(/does not have access to Redemption/)).toBeInTheDocument();
  });
});
