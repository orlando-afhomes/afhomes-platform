import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { NON_ACTIVE_TIER_CODES } from "@/modules/vip/types";
import { PaymentSchemesPage } from "./payment-schemes-page";
import { TierCodesPage } from "./tier-codes-page";
import { VipProductsPage } from "./vip-products-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin",
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId="dev-super-admin">{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(cleanup);
const show = (page: ReactElement) => render(<Wrapper>{page}</Wrapper>);

describe("VIP products pages split by process", () => {
  it("catalog shows only the product table", async () => {
    show(<VipProductsPage />);
    expect(await screen.findByRole("table", { name: "VIP product catalog" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Payment schemes" })).toBeNull();
    expect(screen.queryByText(/Historical and reserved tier codes/)).toBeNull();
  });

  it("catalog offers New product to a manager and opens the create dialog", async () => {
    show(<VipProductsPage />);
    await screen.findByRole("table", { name: "VIP product catalog" });
    fireEvent.click(await screen.findByRole("button", { name: /New product/ }));
    expect(await screen.findByRole("dialog", { name: "New product" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Product code/)).toBeInTheDocument();
  });

  it("used products show Delete unavailable with the reason", async () => {
    show(<VipProductsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Actions for Bronze VIP" }));
    expect(await screen.findByText(/Delete unavailable: Already used by/)).toBeInTheDocument();
  });

  it("schemes page shows the scheme table with Move schemes", async () => {
    show(<PaymentSchemesPage />);
    expect(await screen.findByRole("table", { name: "Payment schemes" })).toBeInTheDocument();
    expect((await screen.findAllByText(/Move A/)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("table", { name: "VIP product catalog" })).toBeNull();
  });

  it("tier codes page lists the reserved codes", () => {
    show(<TierCodesPage />);
    for (const item of NON_ACTIVE_TIER_CODES) expect(screen.getByText(new RegExp(`^${item.code} ·`))).toBeInTheDocument();
  });
});
