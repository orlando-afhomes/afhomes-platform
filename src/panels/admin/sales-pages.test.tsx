import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { CommissionPayoutsPage } from "./pages/commission-payouts-page";
import { CommissionsPage } from "./pages/commissions-page";
import { ContractReviewPage } from "./pages/contract-review-page";
import { ContractsPage } from "./pages/contracts-page";
import { MembershipActivationPage } from "./pages/membership-activation-page";
import { MembershipPage } from "./pages/membership-page";
import { SalesPage } from "./pages/sales-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin",
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

afterEach(cleanup);

function show(identityId: string, page: ReactElement) {
  return render(<Wrapper identityId={identityId}>{page}</Wrapper>);
}

describe("process pages are separated", () => {
  it("Sales shows sales records and no Contracts table", async () => {
    show("dev-admin", <SalesPage />);
    expect(await screen.findByRole("table", { name: "Sales" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Contracts" })).toBeNull();
  });

  it("Contracts shows the contracts list with a New contract action and a count footer", async () => {
    show("dev-admin", <ContractsPage />);
    expect(await screen.findByRole("table", { name: "Contracts" })).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Sales" })).toBeNull();
    expect(screen.getByRole("link", { name: /new contract/i })).toHaveAttribute("href", "/admin/customers/new");
    expect(document.querySelectorAll("tbody tr[data-row-key]")).toHaveLength(4);
  });

  it("Contract Review defaults to the Submitted filter", async () => {
    show("dev-admin", <ContractReviewPage />);
    expect(await screen.findByRole("table", { name: "Contracts" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Contract status filter" })).toHaveValue("Submitted");
  });

  it("Memberships lists all with no tab bar; Activation Queue holds the queue", async () => {
    const all = show("dev-admin", <MembershipPage />);
    expect(await screen.findByRole("table", { name: "Memberships" })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByRole("table", { name: "Activation queue" })).toBeNull();
    all.unmount();
    show("dev-admin", <MembershipActivationPage />);
    expect(await screen.findByRole("table", { name: "Activation queue" })).toBeInTheDocument();
  });

  it("keeps payouts off Commissions and on Commission Payouts", async () => {
    const records = show("dev-finance", <CommissionsPage />);
    expect(await screen.findByRole("table", { name: "Commissions" })).toBeInTheDocument();
    expect(screen.queryByText("Payout release")).toBeNull();
    records.unmount();
    show("dev-finance", <CommissionPayoutsPage />);
    expect(await screen.findByRole("table", { name: "Commission payouts" })).toBeInTheDocument();
  });
});
