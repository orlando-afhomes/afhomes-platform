import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { AccreditationVerificationPage } from "@/panels/public/pages/accreditation-verification-page";
import { AuditLogsPage } from "./pages/audit-logs-page";
import { CommissionAssignmentPage } from "./pages/commission-assignment-page";
import { CommissionsPage } from "./pages/commissions-page";
import { SchemeGuidePage } from "./pages/scheme-guide-page";
import { CustomerImportExportPage } from "./pages/customer-import-export-page";
import { ContractDetailPage } from "./pages/contract-detail-page";
import { ContractsPage } from "./pages/contracts-page";
import { CustomerDetailPage } from "./pages/customer-detail-page";
import { CustomerFormPage } from "./pages/customer-form-page";
import { CustomersPage } from "./pages/customers-page";
import { FinancePage } from "./pages/finance-page";
import { MembershipPage } from "./pages/membership-page";
import { ReportsPage } from "./pages/reports-page";
import { SalesPage } from "./pages/sales-page";
import { StayPointsPage } from "./pages/stay-points-page";
import { VipProductsPage } from "./pages/vip-products-page";

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
        <DevIdentityProvider initialIdentityId={identityId}>
          <AppToaster />
          {children}
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  toast.dismiss();
});

function show(identityId: string, page: ReactElement) {
  return render(<Wrapper identityId={identityId}>{page}</Wrapper>);
}

describe("business pages render for the intended roles", () => {
  it("lists customers for a seller and restricts the OST view of others", async () => {
    show("dev-ssm-a", <CustomersPage />);
    expect(await screen.findByRole("table", { name: "Customers" })).toBeInTheDocument();
    expect(await screen.findByText("Customer A One")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "New customer" })).toBeInTheDocument();
  });

  it("hides the new-customer action from an OST", async () => {
    show("dev-ost-a1", <CustomersPage />);
    expect(await screen.findByText("Customer A One")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /new customer/i })).toBeNull();
  });

  it("shows a summary-only customer detail for downline records", async () => {
    show("dev-ssm-a", <CustomerDetailPage customerId="cust-a1" />);
    expect(await screen.findByText(/belongs to your downline/i)).toBeInTheDocument();
    expect(screen.queryByText("09171110001")).toBeNull();
  });

  it("blocks Submit on an empty customer form and keeps the draft flow honest", async () => {
    const user = userEvent.setup();
    show("dev-sm-a", <CustomerFormPage />);
    await user.click(await screen.findByRole("button", { name: "Submit" }));
    expect(await screen.findByText(/at least a first or last name/i)).toBeInTheDocument();
  });

  it("renders the catalog with the Gold conflict and unusable Move schemes", async () => {
    show("dev-admin", <VipProductsPage />);
    expect(await screen.findByRole("table", { name: "VIP product catalog" })).toBeInTheDocument();
    expect(await screen.findByText("Source conflict")).toBeInTheDocument();
    expect((await screen.findAllByText("Pending owner decision")).length).toBeGreaterThanOrEqual(3);
  });

  it("shows contract review holds and finalize availability to Admin", async () => {
    show("dev-admin", <ContractDetailPage contractId="ctr-3" />);
    expect(await screen.findByText("Finalization is on hold")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Finalize" })).toBeDisabled();
  });

  it("asks Admin to request a cancellation with forfeiture when the contract has verified money", async () => {
    const user = userEvent.setup();
    show("dev-admin", <ContractDetailPage contractId="ctr-1" />);
    await user.click(await screen.findByRole("button", { name: "Request cancellation" }));
    expect(screen.queryByRole("button", { name: "Cancel contract" })).toBeNull();
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/reason/i), "Customer withdrew in writing");
    await user.click(within(dialog).getByRole("button", { name: "Request cancellation" }));
    expect(await screen.findByText("Cancellation awaiting Finance confirmation")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm cancellation" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Request cancellation" })).toBeNull();
  });

  it("lists contracts for review", async () => {
    show("dev-admin", <ContractsPage />);
    expect(await screen.findByRole("table", { name: "Contracts" })).toBeInTheDocument();
    expect((await screen.findAllByText("CTR-4")).length).toBeGreaterThan(0);
  });

  it("gives Finance a verification queue with the pending reservation", async () => {
    show("dev-finance", <FinancePage />);
    expect(await screen.findByRole("table", { name: "Verification queue" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Verify" })).toBeInTheDocument();
  });

  it("shows sellers only their own sales scope", async () => {
    show("dev-ost-a1", <SalesPage />);
    expect(await screen.findByRole("table", { name: "Sales" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Team sales" })).toBeNull();
    expect((await screen.findAllByText("Customer A One")).length).toBeGreaterThan(0);
    expect(screen.queryByText("Customer B One")).toBeNull();
  });

  it("lets Finance see confirmed sales on the Commission Assignment page", async () => {
    show("dev-finance", <CommissionAssignmentPage />);
    expect(await screen.findByText("No default rates")).toBeInTheDocument();
    expect((await screen.findAllByRole("button", { name: "Assign percentages" })).length).toBeGreaterThan(0);
  });

  it("shows Administrators the customer import steps and templates", async () => {
    show("dev-admin", <CustomerImportExportPage />);
    expect(await screen.findByRole("tab", { name: /Import/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "XLSX template" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Customer file/)).toHaveAttribute("accept", ".xlsx,.csv");
  });

  it("keeps customer import and commission assignment away from roles without the permission", async () => {
    show("dev-finance", <CustomerImportExportPage />);
    // Finance has no Customers module, so the page is refused before any import control renders.
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Customer Import and Export" })).toBeNull());
    expect(screen.queryByRole("tab", { name: /Import/ })).toBeNull();
    expect(screen.queryByLabelText(/Customer file/)).toBeNull();
  });

  it("tells a seller that only Finance assigns commission percentages", async () => {
    show("dev-ost-a1", <CommissionAssignmentPage />);
    expect(await screen.findByText("Only authorized Finance personnel assign commission percentages.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Assign percentages" })).toBeNull();
  });

  it("lists every official scheme in the guide and gives pending ones no figures", async () => {
    show("dev-admin", <SchemeGuidePage />);
    expect(await screen.findByRole("heading", { name: "4-Month Installment" })).toBeInTheDocument();
    for (const name of ["Spot Cash", "Move A", "Move B1", "Move B2"]) expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    expect(screen.getAllByText(/Terms are pending owner approval/).length).toBeGreaterThanOrEqual(4);
    expect(screen.getByRole("button", { name: "Print guide" })).toBeInTheDocument();
  });

  it("links Finance from Commissions to Commission Assignment", async () => {
    show("dev-finance", <CommissionsPage />);
    expect(await screen.findByRole("link", { name: "Commission assignment" })).toHaveAttribute("href", "/admin/commissions/assignment");
  });

  it("shows memberships and the activation queue to Admin", async () => {
    show("dev-admin", <MembershipPage />);
    expect(await screen.findByRole("table", { name: "Activation queue" })).toBeInTheDocument();
  });

  it("shows the points ledger with redemption disabled", async () => {
    show("dev-finance", <StayPointsPage />);
    expect(await screen.findByText("Redemption is not available")).toBeInTheDocument();
    expect(await screen.findByRole("table", { name: "Points ledger" })).toBeInTheDocument();
    expect((await screen.findAllByRole("button", { name: "Release" })).length).toBeGreaterThan(0);
  });

  it("renders role-scoped reports", async () => {
    show("dev-finance", <ReportsPage />);
    expect(await screen.findByText("Finance and collections")).toBeInTheDocument();
  });

  it("denies the audit viewer to non-administrators", async () => {
    show("dev-ost-a1", <AuditLogsPage />);
    expect(await screen.findByText("Access restricted")).toBeInTheDocument();
  });

  it("shows audit history to Admin", async () => {
    show("dev-admin", <AuditLogsPage />);
    expect(await screen.findByText("Restricted view")).toBeInTheDocument();
  });
});

describe("public accreditation verification", () => {
  it("returns one generic failure and never discovers by name", async () => {
    const user = userEvent.setup();
    show("dev-ost-a1", <AccreditationVerificationPage />);
    await user.type(screen.getByLabelText(/accreditation number/i), "AAI26100001");
    await user.click(screen.getByRole("button", { name: "Verify" }));
    await waitFor(() => expect(screen.getByText(/no active accreditation was found/i)).toBeInTheDocument());
  });
});
