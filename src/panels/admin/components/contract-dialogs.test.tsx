import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ProductCreateInput } from "@/data/contracts/product-repository";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { createMockRepositories } from "@/data/mock/repositories";
import { createMockStore, type MockStore } from "@/data/mock/seed";
import { pesos } from "@/shared/lib/money";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { PrepareContractDialog } from "./prepare-contract-dialog";
import { SalesContractDetailPage } from "../pages/sales-contract-detail-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin",
}));

afterEach(cleanup);

const DRAFT_PRODUCT: ProductCreateInput = {
  code: "B3", name: "Bronze Plus VIP", tierLevelId: "tier-level-bronze", priceCentavos: pesos(90000), validityYears: 7, earningCycles: 5,
  vipDiscountPercent: 10, lifetimePoints: 50000, pointsPerCycle: 10000, weekdayPointsPerCycle: 7000, weekendPointsPerCycle: 3000,
  minSpendPerCycleCentavos: pesos(1000), supplementaryHolders: 0, benefitsSummary: "Priority reservations and a welcome gift.",
};

async function storeWithDraftProduct() {
  const store = createMockStore();
  await createMockRepositories(store, () => getDevIdentity("dev-admin")).products.create(DRAFT_PRODUCT, "Draft for management review");
  return store;
}

function Wrapper({ children, store }: { children: React.ReactNode; store?: MockStore }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider store={store}>
        <DevIdentityProvider initialIdentityId="dev-admin">{children}</DevIdentityProvider>
        <AppToaster />
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

describe("Approve deal", () => {
  it("confirms the signed agreement without a field for a manually assigned number, and stops on a missing rate", async () => {
    const user = userEvent.setup();
    render(<Wrapper><SalesContractDetailPage contractId="ctr-4" /></Wrapper>);
    await user.click(await screen.findByRole("button", { name: "Approve Deal" }));
    const confirm = await screen.findByRole("alertdialog", { name: "Approve This Deal?" });
    expect(within(confirm).getByText(/signed Reservation Agreement is on file/)).toBeInTheDocument();
    expect(within(confirm).queryByRole("textbox")).toBeNull();
    await user.click(within(confirm).getByRole("button", { name: "Approve Deal" }));
    expect(await screen.findByText(/record the approved DSC rate/i)).toBeInTheDocument();
  });
});

describe("New VIP Purchase", () => {
  it("offers only approved products in the plan dropdown", async () => {
    const user = userEvent.setup();
    const store = await storeWithDraftProduct();
    const customer = store.customers.find((item) => item.id === "cust-b1")!;
    render(<Wrapper store={store}><PrepareContractDialog customer={customer} open onClose={() => {}} repeatPurchase /></Wrapper>);
    await waitFor(() => expect(screen.getByText(/Customer B One · Bronze VIP/)).toBeInTheDocument());
    await user.click(screen.getByRole("combobox", { name: "VIP plan" }));
    expect(await screen.findByRole("option", { name: "Bronze VIP" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Bronze Plus VIP" })).toBeNull();
  });

  it("treats a retired plan held by the customer as no choice and blocks the contract", async () => {
    const user = userEvent.setup();
    const store = createMockStore();
    await createMockRepositories(store, () => getDevIdentity("dev-admin")).products.update("B1", { status: "retired" }, "Stop offering Bronze");
    const customer = store.customers.find((item) => item.id === "cust-b1")!;
    render(<Wrapper store={store}><PrepareContractDialog customer={customer} open onClose={() => {}} repeatPurchase /></Wrapper>);
    await waitFor(() => expect(screen.getByText(/Customer B One · No plan selected/)).toBeInTheDocument());
    await user.click(screen.getByRole("checkbox", { name: /separate purchase/i }));
    await user.click(screen.getByRole("button", { name: "Create Purchase Contract" }));
    expect(await screen.findByText("Choose a VIP plan.")).toBeInTheDocument();
  });
});
