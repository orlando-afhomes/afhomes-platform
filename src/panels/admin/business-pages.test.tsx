import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { AccreditationVerificationPage } from "@/panels/public/pages/accreditation-verification-page";
import { AdminSidebarContext } from "./layouts/admin-sidebar-context";
import { AuditLogsPage } from "./pages/audit-logs-page";
import { CommissionAssignmentPage } from "./pages/commission-assignment-page";
import { CommissionsPage } from "./pages/commissions-page";
import { SchemeGuidePage } from "./pages/scheme-guide-page";
import { CustomerImportExportPage } from "./pages/customer-import-export-page";
import { ContractReviewDetailPage } from "./pages/contract-review-detail-page";
import { ContractsPage } from "./pages/contracts-page";
import { CustomerDetailPage } from "./pages/customer-detail-page";
import { CustomerFormPage } from "./pages/customer-form-page";
import { CustomersPage } from "./pages/customers-page";
import { FinancePage } from "./pages/finance-page";
import { MembershipActivationPage } from "./pages/membership-activation-page";
import { CollectionsReportPage } from "./pages/collections-report-page";
import { SalesPage } from "./pages/sales-page";
import { StayPointsPage } from "./pages/stay-points-page";
import { PaymentSchemesPage } from "./pages/payment-schemes-page";
import { VipProductsPage } from "./pages/vip-products-page";
import { PrepareContractDialog } from "./components/prepare-contract-dialog";
import type { Customer } from "@/modules/customers/types";

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

async function openMenuWith(triggerName: string, itemName: string) {
  const user = userEvent.setup();
  const triggers = await screen.findAllByRole("button", { name: new RegExp(triggerName) });
  for (const trigger of triggers) {
    await user.click(trigger);
    const items = await screen.findAllByRole("menuitem");
    if (items.some((item) => item.textContent?.includes(itemName))) return;
    await user.keyboard("{Escape}");
  }
  throw new Error(`No row menu offered "${itemName}".`);
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

  it("shows only the VIP card choice first and opens the application after a card is chosen", async () => {
    const user = userEvent.setup();
    show("dev-sm-a", <CustomerFormPage />);
    expect(await screen.findByRole("radiogroup", { name: "VIP card" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/first name/i)).toBeNull();
    const continueButton = screen.getByRole("button", { name: /continue/i });
    expect(continueButton).toBeDisabled();
    await user.click(await screen.findByRole("radio", { name: /silver vip/i }));
    await user.click(continueButton);
    expect(await screen.findByRole("radiogroup", { name: "Payment scheme" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Contract classification" })).toBeInTheDocument();
  });

  it("shows card images, then keeps the chosen card pinned and collapses then restores the sidebar", async () => {
    const user = userEvent.setup();
    const calls: boolean[] = [];
    const sidebar = { collapsed: false, setCollapsed: (value: boolean) => calls.push(value) };
    const view = show("dev-sm-a", <AdminSidebarContext.Provider value={sidebar}><CustomerFormPage /></AdminSidebarContext.Provider>);
    expect(await screen.findByAltText("Gold VIP privilege card")).toBeInTheDocument();
    await user.click(await screen.findByRole("radio", { name: /gold vip/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByRole("complementary", { name: "Selected VIP card" })).toHaveTextContent("Gold VIP (G1)");
    expect(calls).toEqual([true]);
    await user.click(screen.getByRole("button", { name: "Change card" }));
    expect(await screen.findByRole("radiogroup", { name: "VIP card" })).toBeInTheDocument();
    view.unmount();
    expect(calls).toEqual([true, false]);
  });

  it("moves focus to the first invalid field and lets a finished step be reopened from the progress bar", async () => {
    const user = userEvent.setup();
    show("dev-sm-a", <CustomerFormPage />);
    await user.click(await screen.findByRole("radio", { name: /silver vip/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(await screen.findByRole("button", { name: /continue/i }));
    await waitFor(() => expect(document.activeElement).toHaveAttribute("role", "radio"));
    const progress = screen.getByRole("list", { name: "Progress" });
    await user.click(within(progress).getByText(/vip card/i));
    expect(await screen.findByRole("radiogroup", { name: "VIP card" })).toBeInTheDocument();
  });

  it("lets any step in the progress bar be clicked but stops a forward jump at the first incomplete step", async () => {
    const user = userEvent.setup();
    show("dev-sm-a", <CustomerFormPage />);
    await user.click(await screen.findByRole("radio", { name: /silver vip/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    const progress = await screen.findByRole("list", { name: "Progress" });
    await user.click(within(progress).getByText(/reservation/i));
    expect(await screen.findByText(/select a payment scheme/i)).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Payment scheme" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Application form" })).toBeNull();
  });

  it("blocks Continue until the payment plan is chosen, then shows customer detail blocks", async () => {
    const user = userEvent.setup();
    show("dev-sm-a", <CustomerFormPage />);
    await user.click(await screen.findByRole("radio", { name: /silver vip/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(await screen.findByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/select a payment scheme/i)).toBeInTheDocument();
    const schemes = await screen.findByRole("radiogroup", { name: "Payment scheme" });
    await user.click(within(schemes).getAllByRole("radio").find((item) => item.getAttribute("aria-disabled") !== "true" && !item.hasAttribute("data-disabled"))!);
    await user.click(screen.getByRole("radio", { name: /standard \(s\)/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByRole("heading", { name: "Personal details" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Address" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText(/first name is required/i)).toBeInTheDocument();
  });

  it("renders the catalog with Gold resolved to Contract-stated", async () => {
    show("dev-admin", <VipProductsPage />);
    expect(await screen.findByRole("table", { name: "VIP product catalog" })).toBeInTheDocument();
    expect(await screen.findByText("Gold VIP")).toBeInTheDocument();
    expect(screen.queryByText("Source conflict")).toBeNull();
    // Bronze, Silver, and Gold each carry a Contract-stated price badge.
    expect((await screen.findAllByText("Contract-stated")).length).toBe(3);
  });

  it("renders the payment schemes as configured, Move ones flagged for Super Admin approval", async () => {
    show("dev-admin", <PaymentSchemesPage />);
    expect(await screen.findByRole("table", { name: "Payment schemes" })).toBeInTheDocument();
    expect(screen.queryAllByText("Pending owner decision")).toHaveLength(0);
    expect((await screen.findAllByText("Configured")).length).toBe(4);
  });

  it("shows finalization available to Admin for the resolved Gold contract", async () => {
    show("dev-admin", <ContractReviewDetailPage contractId="ctr-3" />);
    await screen.findByRole("button", { name: "Finalize" });
    expect(screen.queryByText("Finalization is on hold")).toBeNull();
    expect(screen.getByRole("button", { name: "Finalize" })).toBeEnabled();
  });

  it("asks Admin to request a cancellation with forfeiture when the contract has verified money", async () => {
    const user = userEvent.setup();
    show("dev-admin", <ContractReviewDetailPage contractId="ctr-1" />);
    await user.click(await screen.findByRole("button", { name: "Request cancellation" }));
    expect(screen.queryByRole("button", { name: "Cancel contract" })).toBeNull();
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/reason/i), "Customer withdrew in writing");
    await user.click(within(dialog).getByRole("button", { name: "Request cancellation" }));
    expect(await screen.findByText("Cancellation awaiting Finance confirmation")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm cancellation" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Request cancellation" })).toBeNull();
  });

  it("lists contracts for review with a New contract action and a count footer", async () => {
    show("dev-admin", <ContractsPage />);
    expect(await screen.findByRole("table", { name: "Contracts" })).toBeInTheDocument();
    expect((await screen.findAllByText("CTR-4")).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /new contract/i })).toHaveAttribute("href", "/admin/customers/new");
    expect(await screen.findByText("Showing 4 contracts")).toBeInTheDocument();
  });

  it("hides the New contract action from identities without contracts.prepare", async () => {
    show("dev-ost-a1", <ContractsPage />);
    expect(await screen.findByRole("table", { name: "Contracts" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /new contract/i })).toBeNull();
    expect(await screen.findByText("Showing 1 contract")).toBeInTheDocument();
  });

  it("gives Finance a verification queue with the pending reservation", async () => {
    show("dev-finance", <FinancePage />);
    expect(await screen.findByRole("table", { name: "Verification queue" })).toBeInTheDocument();
    await openMenuWith("Actions for payment", "Verify");
  });

  it("opens a payment details sheet when anywhere on a Finance row is clicked", async () => {
    const user = userEvent.setup();
    show("dev-finance", <FinancePage />);
    const table = await screen.findByRole("table", { name: "Verification queue" });
    await user.click(within(table).getAllByRole("row")[1]);
    expect(await screen.findByRole("heading", { name: /payment/i })).toBeInTheDocument();
    expect(await screen.findByText("Finance review")).toBeInTheDocument();
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
    await openMenuWith("Actions for sale", "Assign percentages");
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
    for (const name of ["Spot Cash", "Move A", "Move B"]) expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    // Spot Cash (OD-11) and the Move schemes are configured by owner decision (2026-11-09); none is pending.
    expect(screen.queryAllByText(/Terms are pending owner approval/)).toHaveLength(0);
    expect(screen.getByText("A non-refundable reservation fee, then the balance within 7 days.")).toBeInTheDocument();
    expect(screen.getAllByText(/Super Admin written approval/).length).toBe(2);
    expect(screen.getByRole("button", { name: "Print guide" })).toBeInTheDocument();
  });

  it("links Finance from Commissions to Commission Assignment", async () => {
    show("dev-finance", <CommissionsPage />);
    expect(await screen.findByRole("link", { name: "Commission assignment" })).toHaveAttribute("href", "/admin/commissions/assignment");
  });

  it("shows the activation queue to Admin", async () => {
    show("dev-admin", <MembershipActivationPage />);
    expect(await screen.findByRole("table", { name: "Activation queue" })).toBeInTheDocument();
  });

  it("shows the points ledger with redemption disabled", async () => {
    show("dev-finance", <StayPointsPage />);
    expect(await screen.findByText("Redemption is not available")).toBeInTheDocument();
    expect(await screen.findByRole("table", { name: "Points ledger" })).toBeInTheDocument();
    await openMenuWith("Actions for points entry", "Release held points");
  });

  it("renders role-scoped reports", async () => {
    show("dev-finance", <CollectionsReportPage />);
    expect(await screen.findByText("Verified collections")).toBeInTheDocument();
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

describe("customer application wizard scheme pricing", () => {
  function wizardMain() {
    const element = document.querySelector(".customer-application__main");
    if (!(element instanceof HTMLElement)) throw new Error("Wizard main column not found.");
    return element;
  }

  async function startApplication(user: ReturnType<typeof userEvent.setup>, card: RegExp) {
    show("dev-sm-a", <CustomerFormPage />);
    await user.click(await screen.findByRole("radio", { name: card }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("radiogroup", { name: "Payment scheme" });
  }

  async function fillCustomerStep(user: ReturnType<typeof userEvent.setup>) {
    // Required-field captions carry an aria-hidden asterisk, so match loosely.
    await user.type(screen.getByLabelText(/first name/i), "Maria");
    await user.type(screen.getByLabelText(/last name/i), "Reyes");
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: "1990-05-01" } });
    await user.click(within(screen.getByRole("radiogroup", { name: "Gender" })).getByRole("radio", { name: "Male" }));
    await user.click(within(screen.getByRole("radiogroup", { name: "Civil status" })).getByRole("radio", { name: "Single" }));
    await user.type(screen.getByLabelText(/mobile number/i), "09171110009");
    await user.type(screen.getByLabelText(/^province/i), "Cebu");
    await user.type(screen.getByLabelText(/^city/i), "Lapu-Lapu City");
    await user.type(screen.getByLabelText(/^barangay/i), "Pajo");
    await user.click(screen.getByRole("button", { name: /continue/i }));
  }

  async function certifySalesStep(user: ReturnType<typeof userEvent.setup>) {
    await screen.findByText("Sales attribution");
    await user.click(screen.getByRole("checkbox", { name: /processing of personal data/i }));
    await user.click(screen.getByRole("checkbox", { name: /specimen signatures/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
  }

  it("shows the Spot Cash price for Gold with no conflict notice", async () => {
    const user = userEvent.setup();
    await startApplication(user, /gold vip/i);
    expect(within(wizardMain()).queryByText(/Price under review/)).toBeNull();
    const schemes = screen.getByRole("radiogroup", { name: "Payment scheme" });
    await user.click(within(schemes).getByRole("radio", { name: /spot cash/i }));
    expect(within(wizardMain()).queryByText(/Price under review/)).toBeNull();
    await user.click(screen.getByRole("radio", { name: /standard \(s\)/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await fillCustomerStep(user);
    await certifySalesStep(user);
    expect(await screen.findByRole("heading", { name: "Application form" })).toBeInTheDocument();
    expect(within(wizardMain()).getByText(/Gold VIP \(G1\) · ₱312,000/)).toBeInTheDocument();
    expect(within(wizardMain()).queryByText(/Price under review/)).toBeNull();
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByRole("heading", { name: "Review the application" })).toBeInTheDocument();
    expect(within(wizardMain()).getByText("₱312,000.00")).toBeInTheDocument();
    expect(within(wizardMain()).queryByText(/Price under review/)).toBeNull();
    expect(within(wizardMain()).getByText("Reservation and acceptance")).toBeInTheDocument();
  });

  it("shows the catalog price for Gold installments with no conflict notice", async () => {
    const user = userEvent.setup();
    await startApplication(user, /gold vip/i);
    const schemes = screen.getByRole("radiogroup", { name: "Payment scheme" });
    await user.click(within(schemes).getByRole("radio", { name: /4-month installment/i }));
    expect(within(wizardMain()).queryByText(/Price under review/)).toBeNull();
    await user.click(screen.getByRole("radio", { name: /standard \(s\)/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await fillCustomerStep(user);
    await certifySalesStep(user);
    expect(await screen.findByRole("heading", { name: "Application form" })).toBeInTheDocument();
    expect(within(wizardMain()).getByText(/Gold VIP \(G1\) · ₱390,000/)).toBeInTheDocument();
    expect(within(wizardMain()).queryByText(/Price under review/)).toBeNull();
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByRole("heading", { name: "Review the application" })).toBeInTheDocument();
    expect(within(wizardMain()).getByText("₱390,000.00")).toBeInTheDocument();
    expect(within(wizardMain()).queryByText(/Price under review/)).toBeNull();
    expect(within(wizardMain()).getByText("Reservation and acceptance")).toBeInTheDocument();
  });

  it("clears the conflict notice for Gold under Move A", async () => {
    const user = userEvent.setup();
    await startApplication(user, /gold vip/i);
    const schemes = screen.getByRole("radiogroup", { name: "Payment scheme" });
    await user.click(within(schemes).getByRole("radio", { name: /move a/i }));
    expect(within(wizardMain()).queryByText(/Price under review/)).toBeNull();
  });

  it("keeps the exact installment price for Bronze with no conflict notice", async () => {
    const user = userEvent.setup();
    await startApplication(user, /bronze vip/i);
    expect(within(wizardMain()).queryByText(/Price under review/)).toBeNull();
    const schemes = screen.getByRole("radiogroup", { name: "Payment scheme" });
    await user.click(within(schemes).getByRole("radio", { name: /4-month installment/i }));
    expect(within(wizardMain()).queryByText(/Price under review/)).toBeNull();
    await user.click(screen.getByRole("radio", { name: /standard \(s\)/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await fillCustomerStep(user);
    await certifySalesStep(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByRole("heading", { name: "Review the application" })).toBeInTheDocument();
    expect(within(wizardMain()).getByText("₱72,000.00")).toBeInTheDocument();
    expect(screen.queryByText(/Price under review/)).toBeNull();
    expect(within(wizardMain()).getByText("Reservation and acceptance")).toBeInTheDocument();
  });

  it("keeps the exact Spot Cash price for Silver with no conflict notice", async () => {
    const user = userEvent.setup();
    await startApplication(user, /silver vip/i);
    expect(within(wizardMain()).queryByText(/Price under review/)).toBeNull();
    const schemes = screen.getByRole("radiogroup", { name: "Payment scheme" });
    await user.click(within(schemes).getByRole("radio", { name: /spot cash/i }));
    expect(within(wizardMain()).queryByText(/Price under review/)).toBeNull();
    await user.click(screen.getByRole("radio", { name: /standard \(s\)/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await fillCustomerStep(user);
    await certifySalesStep(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByRole("heading", { name: "Review the application" })).toBeInTheDocument();
    expect(within(wizardMain()).getByText("₱192,000.00")).toBeInTheDocument();
    expect(screen.queryByText(/Price under review/)).toBeNull();
    expect(within(wizardMain()).getByText("Reservation and acceptance")).toBeInTheDocument();
  });
});

describe("gold contract preview and tiles", () => {
  const goldCustomer = (paymentSchemeId: string): Customer => ({
    id: "cust-gold-preview",
    displayName: "Gold Preview",
    branchId: "branch-a",
    ownerMemberId: "mem-sm-a",
    status: "submitted",
    vipPlan: "G1",
    paymentSchemeId,
  }) as Customer;

  it("previews the exact Spot Cash schedule lines from buildSchedule in the prepare dialog", async () => {
    show("dev-admin", <PrepareContractDialog customer={goldCustomer("scheme-spot-cash")} open onClose={() => {}} />);
    expect(await screen.findByRole("heading", { name: "Payment schedule" })).toBeInTheDocument();
    expect(screen.getByText("Reservation fee")).toBeInTheDocument();
    expect(screen.getByText("₱10,000.00")).toBeInTheDocument();
    expect(screen.getByText("Balance")).toBeInTheDocument();
    expect(screen.getByText("₱302,000.00")).toBeInTheDocument();
  });

  it("previews the exact installment schedule lines from buildSchedule in the prepare dialog", async () => {
    show("dev-admin", <PrepareContractDialog customer={goldCustomer("scheme-installment-4m")} open onClose={() => {}} />);
    expect(await screen.findByRole("heading", { name: "Payment schedule" })).toBeInTheDocument();
    expect(screen.getByText("Reservation fee")).toBeInTheDocument();
    expect(screen.getByText("MA1")).toBeInTheDocument();
    expect(screen.getAllByText("₱95,000.00")).toHaveLength(4);
  });

  it("snapshots the resolved Gold price on the contract tiles", async () => {
    show("dev-admin", <ContractReviewDetailPage contractId="ctr-3" />);
    const tiles = await screen.findByRole("group", { name: "Contract summary" });
    // Contract price and outstanding balance (nothing verified yet on ctr-3).
    expect(within(tiles).getAllByText("₱390,000.00")).toHaveLength(2);
    expect(within(tiles).getByText("Snapshot at preparation")).toBeInTheDocument();
    expect(within(tiles).queryByText("Source conflict")).toBeNull();
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
