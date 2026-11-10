import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("Sales contract shows tabbed Overview with KPI and status cards and no review or finance actions", async () => {
    show("dev-admin", <SalesContractDetailPage contractId="ctr-3" />);
    const summary = await screen.findByRole("group", { name: "Contract summary" });
    expect(within(summary).getByText("Contract price")).toBeInTheDocument();
    expect(within(summary).getByText("Verified payments")).toBeInTheDocument();
    expect(within(summary).getByText("Outstanding balance")).toBeInTheDocument();
    expect(within(summary).getByText("Status")).toBeInTheDocument();
    const tablist = await screen.findByRole("tablist", { name: "Contract detail views" });
    expect(within(tablist).getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(within(tablist).getByRole("tab", { name: "Payment Schedule" })).toBeInTheDocument();
    expect(within(tablist).getByRole("tab", { name: "Payments" })).toBeInTheDocument();
    expect(within(tablist).getByRole("tab", { name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contract terms" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contract Status" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contract Summary" })).toBeInTheDocument();
    for (const name of ["Finalize", "Start review", "Return for correction", "Record RA number", "Request cancellation", "Confirm cancellation"]) expect(button(name)).toBeNull();
  });

  it("Sales contract Payment Schedule tab shows the schedule and opens the MA1 sheet on row click", async () => {
    const user = userEvent.setup();
    show("dev-admin", <SalesContractDetailPage contractId="ctr-4" />);
    await screen.findByRole("tablist", { name: "Contract detail views" });
    await user.click(screen.getByRole("tab", { name: "Payment Schedule" }));
    const table = await screen.findByRole("table", { name: "Payment schedule" });
    expect(within(table).getByText("MA1")).toBeInTheDocument();
    await user.click(within(table).getByText("MA1"));
    expect(await screen.findByText("Installment Details")).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("MA1")).toBeInTheDocument();
    expect(within(dialog).getByText("Date not set")).toBeInTheDocument();
    await user.keyboard("{Escape}");
  });

  it("Sales contract Payment Schedule kebab opens the same MA1 sheet and Payments/History tabs render", async () => {
    const user = userEvent.setup();
    show("dev-admin", <SalesContractDetailPage contractId="ctr-4" />);
    await screen.findByRole("tablist", { name: "Contract detail views" });
    await user.click(screen.getByRole("tab", { name: "Payment Schedule" }));
    await screen.findByRole("table", { name: "Payment schedule" });
    await user.click(screen.getByRole("button", { name: "Actions for MA1" }));
    await user.click(await screen.findByRole("menuitem", { name: "View" }));
    expect(await screen.findByText("Installment Details")).toBeInTheDocument();
    expect(screen.getByText("Remaining")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("tab", { name: "Payments" }));
    expect(await screen.findByRole("table", { name: "Payments" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "History" }));
    expect(await screen.findByRole("heading", { name: "History" })).toBeInTheDocument();
    expect(screen.getByText(/contract submitted/i)).toBeInTheDocument();
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
