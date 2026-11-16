import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
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

describe("contract details show actions allowed for each viewer", () => {
  it("lets an authorized reviewer approve the deal on the approved Gold terms from Contracts", async () => {
    show("dev-admin", <SalesContractDetailPage contractId="ctr-3" />);
    expect(await screen.findByRole("button", { name: "Approve Deal" })).toBeEnabled();
    for (const name of ["Start review", "Finalize", "Record signed agreement", "Approve Sale"]) expect(button(name)).toBeNull();
    expect(button("Edit details")).toBeNull();
  });

  it("shows a missing VIP rate before issuance and links an Admin to the affected sale", async () => {
    show("dev-admin", <SalesContractDetailPage contractId="ctr-3" />);
    expect(await screen.findByText("Approved Commission Rates Needed")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Set Closing Seller Rate" })).toHaveAttribute(
      "href",
      "/admin/commissions?tab=rates&sale=sale-3&role=DSC",
    );
    expect(button("Approve Deal")).toBeEnabled();
  });

  it("Sales contract keeps its overview and gives Admin the review actions in the same detail", async () => {
    show("dev-admin", <SalesContractDetailPage contractId="ctr-3" />);
    const summary = await screen.findByRole("group", { name: "Contract summary" });
    expect(within(summary).getByText("Contract Price")).toBeInTheDocument();
    expect(within(summary).getByText("Verified Payments")).toBeInTheDocument();
    expect(within(summary).getByText("Outstanding Balance")).toBeInTheDocument();
    expect(within(summary).getByText("Status")).toBeInTheDocument();
    const tablist = await screen.findByRole("tablist", { name: "Contract detail views" });
    expect(within(tablist).getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");
    expect(within(tablist).getByRole("tab", { name: "Payment Schedule" })).toBeInTheDocument();
    expect(within(tablist).getByRole("tab", { name: "Payments" })).toBeInTheDocument();
    expect(within(tablist).getByRole("tab", { name: "History" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contract Terms" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contract Status" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Contract Summary" })).toBeInTheDocument();
    expect(button("Approve Deal")).toBeEnabled();
    expect(button("Return for Correction")).toBeEnabled();
    expect(button("Confirm cancellation")).toBeNull();
  });

  it("keeps review actions hidden from the seller on a contract assigned to them", async () => {
    show("dev-ost-a2", <SalesContractDetailPage contractId="ctr-4" />);
    await screen.findByRole("group", { name: "Contract summary" });
    for (const name of ["Approve Deal", "Return for Correction"]) expect(button(name)).toBeNull();
  });

  it("Sales contract Payment Schedule tab shows the schedule and opens the MA1 sheet on row click", async () => {
    const user = userEvent.setup();
    show("dev-admin", <SalesContractDetailPage contractId="ctr-4" />);
    await screen.findByRole("tablist", { name: "Contract detail views" });
    await user.click(screen.getByRole("tab", { name: "Payment Schedule" }));
    const table = await screen.findByRole("table", { name: "Payment Schedule" });
    expect(within(table).getByText("MA1")).toBeInTheDocument();
    await user.click(within(table).getByText("MA1"));
    expect(await screen.findByText("Installment Details")).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("MA1")).toBeInTheDocument();
    expect(within(dialog).getAllByText("—").length).toBeGreaterThan(0);
    await user.keyboard("{Escape}");
  });

  it("Sales contract Payment Schedule has no row menu and the Payments/History tabs render", async () => {
    const user = userEvent.setup();
    show("dev-admin", <SalesContractDetailPage contractId="ctr-4" />);
    await screen.findByRole("tablist", { name: "Contract detail views" });
    await user.click(screen.getByRole("tab", { name: "Payment Schedule" }));
    await screen.findByRole("table", { name: "Payment Schedule" });
    expect(screen.queryByRole("button", { name: "Actions for MA1" })).toBeNull();
    await user.click(screen.getByRole("tab", { name: "Payments" }));
    expect(await screen.findByRole("table", { name: "Payments" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "History" }));
    expect(await screen.findByRole("heading", { name: "History" })).toBeInTheDocument();
    expect(screen.getByText(/contract submitted/i)).toBeInTheDocument();
  });

  it("Finance collection shows the ledger and payments without contract actions", async () => {
    show("dev-finance", <FinanceCollectionDetailPage contractId="ctr-1" />);
    expect(await screen.findByRole("table", { name: "Payment Ledger" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Payments" })).toBeInTheDocument();
    for (const name of ["Approve Deal", "Edit Details", "Submit Contract", "Submit Payment", "Cancel Contract", "Confirm Cancellation"]) expect(button(name)).toBeNull();
  });

  it("Finance collection ledger rows keep 5 columns and open details with the running Net verified value", async () => {
    const user = userEvent.setup();
    show("dev-finance", <FinanceCollectionDetailPage contractId="ctr-1" />);
    const ledger = await screen.findByRole("table", { name: "Payment Ledger" });
    // The 5 data columns stay on screen; Net verified is only in the row details.
    expect(within(ledger).getAllByRole("columnheader")).toHaveLength(5);
    expect(within(ledger).queryByText("Net verified")).toBeNull();
    // ctr-1: ₱10,000 reservation + ₱57,500 installment = ₱67,500 net verified, ₱172,500 balance on a ₱240,000 contract.
    await user.click(within(ledger).getByText("Installment"));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Net verified")).toBeInTheDocument();
    expect(within(dialog).getByText("₱67,500.00")).toBeInTheDocument();
    expect(within(dialog).getByText("₱172,500.00")).toBeInTheDocument();
    await user.keyboard("{Escape}");
  });

  it("Finance cancellation page has no decision buttons when nothing is requested", async () => {
    show("dev-finance", <FinanceCancellationDetailPage contractId="ctr-1" />);
    expect(await screen.findByText("No Cancellation Request")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Payment Ledger" })).toBeInTheDocument();
    expect(button("Confirm Cancellation")).toBeNull();
    expect(button("Decline Cancellation")).toBeNull();
  });
});
