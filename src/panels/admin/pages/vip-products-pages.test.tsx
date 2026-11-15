import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { NON_ACTIVE_TIER_CODES } from "@/modules/vip/types";
import { VipProductsAreaPage } from "./vip-products-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/vip-products",
  useSearchParams: () => new URLSearchParams(window.location.search),
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
  window.history.replaceState(null, "", "/");
});
function show(page: ReactElement, tab = "products", identityId = "dev-super-admin") {
  window.history.replaceState(null, "", `/admin/vip-products?tab=${tab}`);
  return render(<Wrapper identityId={identityId}>{page}</Wrapper>);
}

describe("VIP products pages split by process", () => {
  it("catalog shows only the product table", async () => {
    show(<VipProductsAreaPage />);
    expect(await screen.findByRole("table", { name: "VIP product catalog" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Payment schemes" })).toBeNull();
    expect(screen.queryByText(/Historical and reserved tier codes/)).toBeNull();
  });

  it("catalog table shows five columns and moves benefits to the details", async () => {
    show(<VipProductsAreaPage />);
    const table = await screen.findByRole("table", { name: "VIP product catalog" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent?.trim()).filter((text) => text && text !== "Actions");
    expect(headers).toEqual(["Product", "Code", "Price", "Status", "Version"]);
    fireEvent.click(within(table).getByRole("row", { name: "Open Bronze VIP" }));
    const sheet = await screen.findByRole("dialog", { name: "Bronze VIP" });
    expect(within(sheet).getByText("VIP discount")).toBeInTheDocument();
    expect(within(sheet).getByText("Lifetime points")).toBeInTheDocument();
  });

  it("scheme table shows one status badge per row", async () => {
    show(<VipProductsAreaPage />, "schemes");
    const table = await screen.findByRole("table", { name: "Payment schemes" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent?.trim()).filter((text) => text && text !== "Actions");
    expect(headers).toEqual(["Scheme", "Card code", "Terms", "Status"]);
    for (const row of within(table).getAllByRole("row").slice(1)) expect(within(row).getAllByText(/^(Available|Unavailable|Terms pending)$/)).toHaveLength(1);
  });

  it("catalog offers New product to a manager and opens the create dialog", async () => {
    show(<VipProductsAreaPage />);
    await screen.findByRole("table", { name: "VIP product catalog" });
    fireEvent.click(await screen.findByRole("button", { name: /New product/ }));
    expect(await screen.findByRole("dialog", { name: "New product" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Product code/)).toBeInTheDocument();
  });

  it("used products show Delete unavailable with the reason", async () => {
    show(<VipProductsAreaPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Actions for Bronze VIP" }));
    expect(await screen.findByText(/Delete unavailable: Already used by/)).toBeInTheDocument();
  });

  it("schemes page shows the scheme table with Move schemes", async () => {
    show(<VipProductsAreaPage />, "schemes");
    expect(await screen.findByRole("table", { name: "Payment schemes" })).toBeInTheDocument();
    expect((await screen.findAllByText(/Move A/)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("table", { name: "VIP product catalog" })).toBeNull();
  });

  it("tier codes page lists the reserved codes", () => {
    show(<VipProductsAreaPage />, "tier-codes");
    for (const item of NON_ACTIVE_TIER_CODES) expect(screen.getByText(new RegExp(`^${item.code} ·`))).toBeInTheDocument();
  });

  it("opens the scheme guide when a seller follows the product catalog link", async () => {
    show(<VipProductsAreaPage />, "products", "dev-ost-a1");
    expect(await screen.findByText("Spot Cash")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print guide" })).toBeInTheDocument();
    expect(within(screen.getByRole("tablist", { name: "VIP Products" })).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Scheme guide"]);
    expect(screen.queryByRole("table", { name: "VIP product catalog" })).toBeNull();
  });
});
