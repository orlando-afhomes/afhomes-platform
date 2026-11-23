import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import type { ProductCreateInput } from "@/data/contracts/product-repository";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { createMockRepositories } from "@/data/mock/repositories";
import { MockProductRepository } from "@/data/mock/product-repository";
import { createMockStore, type MockStore } from "@/data/mock/seed";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { pesos } from "@/shared/lib/money";
import { NON_ACTIVE_TIER_CODES } from "@/modules/vip/types";
import { SalesAreaPage } from "./sales-area-page";
import { VipProductsAreaPage } from "./vip-products-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/vip-products",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

function Wrapper({ children, identityId, store }: { children: React.ReactNode; identityId: string; store?: MockStore }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider store={store}>
        <DevIdentityProvider initialIdentityId={identityId}>{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});
function show(page: ReactElement, tab = "products", identityId = "dev-super-admin", store?: MockStore) {
  window.history.replaceState(null, "", `/admin/vip-products?tab=${tab}`);
  return render(<Wrapper identityId={identityId} store={store}>{page}</Wrapper>);
}

const DRAFT_INPUT: ProductCreateInput = {
  code: "B3", name: "Bronze Plus VIP", tierLevelId: "tier-level-bronze", priceCentavos: pesos(90000), validityYears: 7, earningCycles: 5,
  vipDiscountPercent: 10, lifetimePoints: 50000, pointsPerCycle: 10000, weekdayPointsPerCycle: 7000, weekendPointsPerCycle: 3000,
  minSpendPerCycleCentavos: pesos(1000), supplementaryHolders: 0, benefitsSummary: "Priority reservations and a welcome gift.",
};

async function storeWithDraftProduct() {
  const store = createMockStore();
  await createMockRepositories(store, () => getDevIdentity("dev-admin")).products.create(DRAFT_INPUT, "Draft for management review");
  return store;
}

describe("VIP products pages split by process", () => {
  it("catalog shows only the product table", async () => {
    show(<VipProductsAreaPage />);
    expect(await screen.findByRole("table", { name: "VIP Product Catalog" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Payment Plans" })).toBeNull();
    expect(screen.queryByText(/Historical and reserved tier codes/)).toBeNull();
  });

  it("catalog table shows five columns and moves benefits to the details", async () => {
    show(<VipProductsAreaPage />);
    const table = await screen.findByRole("table", { name: "VIP Product Catalog" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent?.trim()).filter((text) => text && text !== "Actions");
    expect(headers).toEqual(["Product", "Card Level", "Price", "Status", "Last Updated"]);
    fireEvent.click(within(table).getByRole("row", { name: "Open Bronze VIP" }));
    const sheet = await screen.findByRole("dialog", { name: "Bronze VIP" });
    expect(within(sheet).getByText("VIP discount")).toBeInTheDocument();
    expect(within(sheet).getByText("Lifetime points")).toBeInTheDocument();
    expect(within(sheet).queryByText(/version|v1/i)).toBeNull();
    expect(within(sheet).getByRole("button", { name: "Edit Product" })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Make Unavailable" })).toBeInTheDocument();
  });

  it("Make unavailable asks for a reason before retiring a product", async () => {
    show(<VipProductsAreaPage />);
    fireEvent.click(await screen.findByRole("row", { name: "Open Bronze VIP" }));
    const sheet = await screen.findByRole("dialog", { name: "Bronze VIP" });
    fireEvent.click(within(sheet).getByRole("button", { name: "Make Unavailable" }));
    expect(await screen.findByRole("dialog", { name: "Make Bronze VIP unavailable" })).toBeInTheDocument();
  });

  it("catalog rows open the details without a View full details item", async () => {
    show(<VipProductsAreaPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Actions for Bronze VIP" }));
    expect(screen.queryByText("View full details")).toBeNull();
  });

  it("scheme table shows one status badge per row", async () => {
    show(<VipProductsAreaPage />, "schemes");
    const table = await screen.findByRole("table", { name: "Payment Plans" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent?.trim()).filter((text) => text && text !== "Actions");
    expect(headers).toEqual(["Payment plan", "Payment Code", "Terms", "Status"]);
    for (const row of within(table).getAllByRole("row").slice(1)) expect(within(row).getAllByText(/^(Available|Unavailable|Terms pending)$/)).toHaveLength(1);
  });

  it("catalog offers New product to a manager and opens the create dialog", async () => {
    show(<VipProductsAreaPage />);
    await screen.findByRole("table", { name: "VIP Product Catalog" });
    fireEvent.click(await screen.findByRole("button", { name: /New product/ }));
    expect(await screen.findByRole("dialog", { name: "New Product" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Product code/)).toBeInTheDocument();
  });

  it("used products show Delete unavailable with the reason", async () => {
    show(<VipProductsAreaPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Actions for Bronze VIP" }));
    expect(await screen.findByText(/Delete unavailable: Already used by/)).toBeInTheDocument();
  });

  it("schemes page shows the scheme table with Move schemes", async () => {
    show(<VipProductsAreaPage />, "schemes");
    expect(await screen.findByRole("table", { name: "Payment Plans" })).toBeInTheDocument();
    expect((await screen.findAllByText(/Move A/)).length).toBeGreaterThan(0);
    expect(screen.queryByRole("table", { name: "VIP Product Catalog" })).toBeNull();
  });

  it("tier levels tab lists the managed levels and the codes that are not available", async () => {
    show(<VipProductsAreaPage />, "tier-codes");
    expect(await screen.findByText("These codes cannot be used for new products.")).toBeInTheDocument();
    const table = screen.getByRole("table", { name: "Card Level Codes That Are Not Available" });
    for (const item of NON_ACTIVE_TIER_CODES) expect(within(table).getByRole("cell", { name: item.code })).toBeInTheDocument();
    expect(within(table).getAllByText("Held for future use")).toHaveLength(3);
    expect(screen.queryByText(/\((Historical|Reserved)\)/)).toBeNull();
    const levels = await screen.findByRole("table", { name: "VIP Card Levels" });
    expect(within(levels).getAllByRole("columnheader").map((cell) => cell.textContent?.trim()).filter((text) => text && text !== "Actions")).toEqual(["Name", "Color", "Products", "Status"]);
    for (const name of ["Bronze", "Silver", "Gold"]) expect(await within(levels).findByRole("row", { name: `Open ${name}` })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Card Levels" })).toBeInTheDocument();
  });

  it("an admin adds a tier level, then picks it for a new product", async () => {
    show(<VipProductsAreaPage />, "tier-codes");
    fireEvent.click(await screen.findByRole("button", { name: /Add card level/ }));
    const dialog = await screen.findByRole("dialog", { name: "Add Card Level" });
    fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: "Platinum" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add" }));
    expect(await screen.findByRole("row", { name: "Open Platinum" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Products" }));
    fireEvent.click(await screen.findByRole("button", { name: /New product/ }));
    const form = await screen.findByRole("dialog", { name: "New Product" });
    await userEvent.setup().click(within(form).getByRole("combobox", { name: /Card level/ }));
    expect(await screen.findByRole("option", { name: "Platinum" })).toBeInTheDocument();
  });

  it("a used tier level cannot be deleted", async () => {
    show(<VipProductsAreaPage />, "tier-codes");
    fireEvent.click(await screen.findByRole("button", { name: "Actions for Bronze" }));
    expect(await screen.findByText(/Delete unavailable: Products use this card level/)).toBeInTheDocument();
  });

  it("the product form explains why a held or old code cannot be used", async () => {
    show(<VipProductsAreaPage />);
    fireEvent.click(await screen.findByRole("button", { name: /New product/ }));
    const form = await screen.findByRole("dialog", { name: "New Product" });
    fireEvent.change(within(form).getByLabelText(/Product code/), { target: { value: "g2" } });
    expect(await within(form).findByText("This code is held for future use and cannot be used yet.")).toBeInTheDocument();
    fireEvent.change(within(form).getByLabelText(/Product code/), { target: { value: "B2" } });
    expect(await within(form).findByText("This code was used before and is kept for old records.")).toBeInTheDocument();
    expect(within(form).getByLabelText(/Description/)).toBeInTheDocument();
    expect(within(form).getByLabelText("Upload product image file", { exact: false })).toBeInTheDocument();
  });

  it("scheme guide shows a comparison table by tier for each configured scheme", async () => {
    show(<SalesAreaPage />, "scheme-guide");
    expect(await screen.findByText("Spot Cash")).toBeInTheDocument();
    const [first] = screen.getAllByRole("table");
    expect(within(first).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual(["Card Level", "Total", "Reservation fee", "Balance"]);
    expect(within(first).getByText("Bronze VIP")).toBeInTheDocument();
  });

  it("scheme guide shows an empty state when no payment plans are configured", async () => {
    vi.spyOn(MockProductRepository.prototype, "listSchemes").mockResolvedValueOnce([]);
    show(<SalesAreaPage />, "scheme-guide");
    expect(await screen.findByText("No payment plans configured.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("scheme guide shows a load error with retry when the schemes query fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(MockProductRepository.prototype, "listSchemes").mockRejectedValueOnce(new Error("Schemes failed."));
    show(<SalesAreaPage />, "scheme-guide");
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/Schemes failed\./)).toBeInTheDocument();
    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Spot Cash")).toBeInTheDocument();
  });

  it("new scheme dialog groups each ticked tier into one card of three fields", async () => {
    show(<VipProductsAreaPage />, "schemes");
    await screen.findByRole("table", { name: "Payment Plans" });
    fireEvent.click(await screen.findByRole("button", { name: /New payment plan/ }));
    const dialog = await screen.findByRole("dialog", { name: "New Payment Plan" });
    expect(within(dialog).getByRole("group", { name: "Bronze terms" }).querySelector("input[type=text]")).toBeNull();
    fireEvent.click(within(dialog).getByRole("checkbox", { name: "Bronze" }));
    const card = within(dialog).getByRole("group", { name: "Bronze terms" });
    for (const label of ["Package price", "Monthly installment", "Number of installments"]) expect(within(card).getByLabelText(label)).toBeInTheDocument();
  });

  it("shows a new product as a draft and offers approval only to a Super Administrator", async () => {
    const store = await storeWithDraftProduct();

    show(<VipProductsAreaPage />, "products", "dev-admin", store);
    const row = await screen.findByRole("row", { name: "Open Bronze Plus VIP" });
    expect(within(row).getByText("Draft")).toBeInTheDocument();
    fireEvent.click(within(row).getByRole("button", { name: "Actions for Bronze Plus VIP" }));
    await screen.findByRole("menu");
    expect(screen.queryByText("Approve product")).toBeNull();

    cleanup();
    show(<VipProductsAreaPage />, "products", "dev-super-admin", store);
    fireEvent.click(await screen.findByRole("button", { name: "Actions for Bronze Plus VIP" }));
    fireEvent.click(await screen.findByText("Approve product"));
    expect(await screen.findByRole("dialog", { name: "Approve Bronze Plus VIP" })).toBeInTheDocument();
  });

  it("offers an active draft product in payment-plan setup", async () => {
    const store = await storeWithDraftProduct();
    show(<VipProductsAreaPage />, "schemes", "dev-super-admin", store);
    await screen.findByRole("table", { name: "Payment Plans" });
    fireEvent.click(await screen.findByRole("button", { name: /New payment plan/ }));
    const dialog = await screen.findByRole("dialog", { name: "New Payment Plan" });
    expect(within(dialog).getByRole("checkbox", { name: "Bronze Plus VIP" })).toBeInTheDocument();
  });

  it("refuses to clear the stated benefits of an approved product", async () => {
    const store = await storeWithDraftProduct();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    await admin.products.updateScheme("scheme-spot-cash", { applicableTiers: ["B1", "S1", "G1", "B3"] }, "Offer the new product");
    await createMockRepositories(store, () => getDevIdentity("dev-super-admin")).products.approve("B3", "Approved by management");

    show(<VipProductsAreaPage />, "products", "dev-super-admin", store);
    fireEvent.click(await screen.findByRole("row", { name: "Open Bronze Plus VIP" }));
    fireEvent.click(await screen.findByRole("button", { name: "Edit Product" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit Bronze Plus VIP" });
    fireEvent.change(within(dialog).getByLabelText(/Other benefits/), { target: { value: "" } });
    fireEvent.change(within(dialog).getByLabelText(/Reason or approval reference/), { target: { value: "Cleanup" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));
    expect(await within(dialog).findByText(/keeps its stated benefits/i)).toBeInTheDocument();
  });

  it("gives a seller the scheme guide in Sales and no Settings catalog", async () => {
    show(<SalesAreaPage />, "scheme-guide", "dev-ost-a1");
    expect(await screen.findByText("Spot Cash")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Print Guide" })).toBeInTheDocument();
    expect(within(screen.getByRole("tablist")).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Sales", "Contracts", "Property Sales (IGP)", "Payment Plan Guide"]);
    cleanup();
    show(<VipProductsAreaPage />, "products", "dev-ost-a1");
    expect(await screen.findByRole("heading", { name: "Access restricted" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "VIP Product Catalog" })).toBeNull();
  });
});
