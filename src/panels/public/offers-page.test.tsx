import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMockStore } from "@/data/mock/seed";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { PublicOffersPage } from "./pages/offers-page";

afterEach(cleanup);

function renderOffers() {
  const store = createMockStore();
  store.promos = [{
    id: "promo-public", name: "Wellness Weekend", status: "active", startDate: "2000-01-01", endDate: "2099-12-31",
    earnOutletIds: ["outlet-spa"], earnPesosPerPointCentavos: 10_000, redeemOutletIds: ["outlet-spa"],
    pointsExpiryDate: "2099-12-31", rewards: [{ id: "pr-1", name: "Spa Day Pass", description: "One day pass", outletId: "outlet-spa", pointsCost: 3, status: "active" }],
    publicTitle: "Wellness Weekend", publicSummary: "Earn and use points at the spa.", publicTerms: "One reward per visit.",
    published: true, createdAt: "2026-11-01T00:00:00.000Z", updatedAt: "2026-11-01T00:00:00.000Z",
  }];
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MockStoreProvider store={store}>
        <DevIdentityProvider initialIdentityId="dev-admin">
          <PublicOffersPage />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>,
  );
}

it("shows only published, complete offers with named rewards and point costs", async () => {
  renderOffers();
  expect(await screen.findByRole("heading", { name: "Wellness Weekend" })).toBeInTheDocument();
  expect(screen.getByText("Spa Day Pass")).toBeInTheDocument();
  const reward = screen.getByText("Spa Day Pass").closest("li")!;
  expect(reward).toHaveTextContent(/3 points.*at Resort Spa/);
  expect(screen.getByText(/Promo Points have no cash value/i)).toBeInTheDocument();
});
