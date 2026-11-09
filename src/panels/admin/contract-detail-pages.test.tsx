import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { ContractReviewDetailPage } from "./pages/contract-review-detail-page";
import { FinanceCancellationDetailPage } from "./pages/finance-cancellation-detail-page";
import { FinanceCollectionDetailPage } from "./pages/finance-collection-detail-page";
import { SalesContractDetailPage } from "./pages/sales-contract-detail-page";

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

function show(identityId: string, page: ReactElement) {
  return render(<Wrapper identityId={identityId}>{page}</Wrapper>);
}

afterEach(cleanup);

const button = (name: string) => screen.queryByRole("button", { name });

describe("contract detail pages show only their own process actions", () => {
  it("Review offers finalization and no payment submission", async () => {
    show("dev-admin", <ContractReviewDetailPage contractId="ctr-3" />);
    expect(await screen.findByText("Finalization is on hold")).toBeInTheDocument();
    expect(button("Finalize")).toBeDisabled();
    expect(button("Submit payment")).toBeNull();
    expect(button("Edit details")).toBeNull();
  });

  it("Sales contract has no review or finance actions", async () => {
    show("dev-admin", <SalesContractDetailPage contractId="ctr-3" />);
    expect(await screen.findByRole("table", { name: "Payment schedule" })).toBeInTheDocument();
    for (const name of ["Finalize", "Start review", "Return for correction", "Record RA number", "Request cancellation", "Confirm cancellation"]) expect(button(name)).toBeNull();
  });

  it("Finance collection shows the ledger and payments without contract actions", async () => {
    show("dev-finance", <FinanceCollectionDetailPage contractId="ctr-1" />);
    expect(await screen.findByRole("table", { name: "Payment ledger" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Payments" })).toBeInTheDocument();
    for (const name of ["Finalize", "Edit details", "Submit contract", "Submit payment", "Cancel contract", "Confirm cancellation"]) expect(button(name)).toBeNull();
  });

  it("Finance cancellation page has no decision buttons when nothing is requested", async () => {
    show("dev-finance", <FinanceCancellationDetailPage contractId="ctr-1" />);
    expect(await screen.findByText("No cancellation request")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Payment ledger" })).toBeInTheDocument();
    expect(button("Confirm cancellation")).toBeNull();
    expect(button("Decline cancellation")).toBeNull();
  });
});
