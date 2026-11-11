import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { manilaToday, computeAge } from "@/shared/lib/dates";
import { validateCustomerForSubmit } from "@/modules/customers/rules";
import { AddressSection, ContactSection, GovernmentIdSection, IdentitySection, SecondaryHolderSection, toDraft, toInput, type SetDraft } from "./components/customer-form-sections";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { AccreditationVerificationPage } from "@/panels/public/pages/accreditation-verification-page";
import { AdminSidebarContext } from "./layouts/admin-sidebar-context";
import { AdminMobileNav } from "./components/admin-mobile-nav";
import { AdminSidebar } from "./components/admin-sidebar";
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
import { useCustomers } from "@/data/queries";
import { currentManilaYear } from "@/modules/customers/customer-number";
import type { Customer } from "@/modules/customers/types";
import { MockCustomerRepository } from "@/data/mock/customer-repository";
import { MockAccreditationRepository } from "@/data/mock/accreditation-repository";
import * as registration from "@/modules/customers/application/register-customer";
import Swal from "sweetalert2";

const navigation = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => navigation,
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
  Swal.close();
  toast.dismiss();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  navigation.push.mockClear();
  navigation.replace.mockClear();
  navigation.back.mockClear();
});

/** Test probe: watches the shared customer list so a saved draft is visible before the next click. */
function CustomerDraftProbe({ customerNumber }: { customerNumber: string }) {
  const customers = useCustomers();
  const saved = customers.data?.some((customer) => customer.customerNumber === customerNumber);
  return <output data-testid="draft-probe">{saved ? "saved" : "pending"}</output>;
}

/** Test probe: exposes the list size and one record's name so an edit can be checked for duplicates. */
function CustomerRecordProbe({ id }: { id: string }) {
  const customers = useCustomers();
  const list = customers.data ?? [];
  const record = list.find((customer) => customer.id === id);
  return (
    <output
      data-testid="customer-record-probe"
      data-count={list.length}
      data-first-name={record?.firstName ?? ""}
      data-last-name={record?.lastName ?? ""}
    />
  );
}

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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Types into a searchable combobox and clicks the exact option. */
async function pickFilteredOption(user: ReturnType<typeof userEvent.setup>, combo: HTMLElement, filter: string, name: string | RegExp) {
  await user.click(combo);
  if ((combo as HTMLInputElement).value) await user.clear(combo);
  await user.type(combo, filter);
  await user.click(await screen.findByRole("option", { name }));
}

/**
 * Residential address completion, province-first: the province enables and
 * scopes the city list, the city enables the barangay list, and the ZIP is
 * derived and locked. Street stays editable text.
 */
async function fillResidentialAddress(
  user: ReturnType<typeof userEvent.setup>,
  card: HTMLElement,
  province: string,
  city: string,
  barangay: string,
) {
  const cityCombo = () => within(card).getByRole("combobox", { name: /city/i });
  const provinceCombo = () => within(card).getByRole("combobox", { name: /^province/i });
  await pickFilteredOption(user, provinceCombo(), province, new RegExp(`^${escapeRegExp(province)}$`, "i"));
  await waitFor(() => expect((provinceCombo() as HTMLInputElement).value).toBe(province));
  await waitFor(() => expect(cityCombo()).toBeEnabled());
  await pickFilteredOption(user, cityCombo(), city, new RegExp(`^${escapeRegExp(city)}$`, "i"));
  await waitFor(() => expect((cityCombo() as HTMLInputElement).value).toBe(city));
  await pickFilteredOption(user, within(card).getByRole("combobox", { name: /^barangay/i }), barangay, new RegExp(`^${escapeRegExp(barangay)}$`, "i"));
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
    expect(screen.queryAllByText(/Super Admin written approval/)).toHaveLength(0);
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
    // Province also exists in the office address block, so scope it to the Address card.
    const addressCard = screen.getByRole("heading", { name: "Address" }).closest(".customer-application__block") as HTMLElement;
    await user.type(screen.getByLabelText(/first name/i), "Maria");
    await user.type(screen.getByLabelText(/last name/i), "Reyes");
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: "1990-05-01" } });
    await user.click(within(screen.getByRole("radiogroup", { name: "Gender" })).getByRole("radio", { name: "Male" }));
    await user.click(within(screen.getByRole("radiogroup", { name: "Civil status" })).getByRole("radio", { name: "Single" }));
    await user.type(screen.getByLabelText(/mobile number/i), "171110009");
    await fillResidentialAddress(user, addressCard, "Cebu", "Lapu-Lapu City", "Pajo");
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
    const spotCash = within(schemes).getByRole("radio", { name: /spot cash/i });
    expect(within(spotCash).getByText(/₱312,000\.00 total/)).toBeInTheDocument();
    expect(within(spotCash).getByText(/pay in 7 days/i)).toBeInTheDocument();
    expect(spotCash).toHaveAccessibleName("Spot Cash₱312,000.00 totalPay in 7 days");
    // Detail and term lines no longer render on the cards.
    expect(within(spotCash).queryByText(/reservation fee/i)).toBeNull();
    await user.click(spotCash);
    // No Move approval block for Spot Cash.
    expect(within(wizardMain()).queryByText("Needs Super Admin written approval for each deal.")).toBeNull();
    expect(within(wizardMain()).queryByText("Card ID mapping pending owner decision.")).toBeNull();
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
    const installment = within(schemes).getByRole("radio", { name: /4-month installment/i });
    expect(within(installment).getByText(/₱390,000\.00 total/)).toBeInTheDocument();
    expect(within(installment).getByText(/4 monthly payments/i)).toBeInTheDocument();
    expect(installment).toHaveAccessibleName("4-Month Installment₱390,000.00 total4 monthly payments");
    // Detail and term lines no longer render on the cards.
    expect(within(installment).queryByText(/reservation fee/i)).toBeNull();
    await user.click(installment);
    // No Move approval block for installments.
    expect(within(wizardMain()).queryByText("Needs Super Admin written approval for each deal.")).toBeNull();
    expect(within(wizardMain()).queryByText("Card ID mapping pending owner decision.")).toBeNull();
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

  it("clears the conflict notice for Gold under Move A with no approval note", async () => {
    const user = userEvent.setup();
    await startApplication(user, /gold vip/i);
    const schemes = screen.getByRole("radiogroup", { name: "Payment scheme" });
    const moveA = within(schemes).getByRole("radio", { name: /move a/i });
    expect(within(moveA).getByText(/₱312,000\.00 total/)).toBeInTheDocument();
    expect(within(moveA).getByText(/4 monthly payments/i)).toBeInTheDocument();
    expect(moveA).toHaveAccessibleName("Move A₱312,000.00 total4 monthly payments");
    // Cards carry no detail lines or approval copy; no notice appears once selected.
    expect(within(moveA).queryByText(/reservation fee/i)).toBeNull();
    expect(within(moveA).queryByText(/needs super admin/i)).toBeNull();
    expect(within(wizardMain()).queryByText("Needs Super Admin written approval for each deal.")).toBeNull();
    await user.click(moveA);
    expect(within(wizardMain()).queryByText("Needs Super Admin written approval for each deal.")).toBeNull();
    expect(within(wizardMain()).queryByText("Card ID mapping pending owner decision.")).toBeNull();
    expect(within(wizardMain()).queryByText(/Price under review/)).toBeNull();
  });

  it("keeps the exact installment price for Bronze with no conflict notice", async () => {
    const user = userEvent.setup();
    await startApplication(user, /bronze vip/i);
    expect(within(wizardMain()).queryByText(/Price under review/)).toBeNull();
    const schemes = screen.getByRole("radiogroup", { name: "Payment scheme" });
    const installment = within(schemes).getByRole("radio", { name: /4-month installment/i });
    expect(within(installment).getByText(/₱72,000\.00 total/)).toBeInTheDocument();
    expect(within(installment).getByText(/4 monthly payments/i)).toBeInTheDocument();
    expect(installment).toHaveAccessibleName("4-Month Installment₱72,000.00 total4 monthly payments");
    // Detail and term lines no longer render on the cards.
    expect(within(installment).queryByText(/reservation fee/i)).toBeNull();
    await user.click(installment);
    // No Move approval block for installments.
    expect(within(wizardMain()).queryByText("Needs Super Admin written approval for each deal.")).toBeNull();
    expect(within(wizardMain()).queryByText("Card ID mapping pending owner decision.")).toBeNull();
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
    const spotCash = within(schemes).getByRole("radio", { name: /spot cash/i });
    expect(within(spotCash).getByText(/₱192,000\.00 total/)).toBeInTheDocument();
    expect(within(spotCash).getByText(/pay in 7 days/i)).toBeInTheDocument();
    expect(spotCash).toHaveAccessibleName("Spot Cash₱192,000.00 totalPay in 7 days");
    // Detail and term lines no longer render on the cards.
    expect(within(spotCash).queryByText(/reservation fee/i)).toBeNull();
    await user.click(spotCash);
    // No Move approval block for Spot Cash.
    expect(within(wizardMain()).queryByText("Needs Super Admin written approval for each deal.")).toBeNull();
    expect(within(wizardMain()).queryByText("Card ID mapping pending owner decision.")).toBeNull();
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

  it("shows Move B with a 12-month pill and no approval notice once selected", async () => {
    const user = userEvent.setup();
    await startApplication(user, /gold vip/i);
    const schemes = screen.getByRole("radiogroup", { name: "Payment scheme" });
    const moveB = within(schemes).getByRole("radio", { name: /move b/i });
    expect(within(moveB).getByText(/₱390,000\.00 total/)).toBeInTheDocument();
    expect(within(moveB).getByText(/12 monthly payments/i)).toBeInTheDocument();
    expect(moveB).toHaveAccessibleName("Move B₱390,000.00 total12 monthly payments");
    // Cards carry no detail lines or approval copy; no notice appears once selected.
    expect(within(moveB).queryByText(/reservation fee/i)).toBeNull();
    expect(within(moveB).queryByText(/needs super admin/i)).toBeNull();
    expect(within(wizardMain()).queryByText("Needs Super Admin written approval for each deal.")).toBeNull();
    await user.click(moveB);
    expect(within(wizardMain()).queryByText("Needs Super Admin written approval for each deal.")).toBeNull();
    expect(within(wizardMain()).queryByText("Card ID mapping pending owner decision.")).toBeNull();
    expect(within(wizardMain()).queryByText(/Price under review/)).toBeNull();
  });

  it("titles the plan step Payment plan and Contract terms with chooser guidance", async () => {
    const user = userEvent.setup();
    await startApplication(user, /silver vip/i);
    const main = wizardMain();
    expect(within(main).getByRole("heading", { name: "Payment plan" })).toBeInTheDocument();
    expect(within(main).getByText("Choose how the customer pays.")).toBeInTheDocument();
    expect(within(main).getByRole("heading", { name: "Contract terms" })).toBeInTheDocument();
    expect(within(main).getByText("Select contract type.")).toBeInTheDocument();
  });

  it("keeps the Standard and Non-Standard classification cards selectable", async () => {
    const user = userEvent.setup();
    await startApplication(user, /gold vip/i);
    const schemes = screen.getByRole("radiogroup", { name: "Payment scheme" });
    await user.click(within(schemes).getByRole("radio", { name: /spot cash/i }));
    const classification = screen.getByRole("radiogroup", { name: "Contract classification" });
    const standard = within(classification).getByRole("radio", { name: "Standard (S)" });
    const nonStandard = within(classification).getByRole("radio", { name: "Non-Standard (N)" });
    await user.click(nonStandard);
    await user.click(standard);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByRole("heading", { name: "Personal details" })).toBeInTheDocument();
  });

  it("shows the chosen scheme in the plan summary once a scheme is picked", async () => {
    const user = userEvent.setup();
    await startApplication(user, /gold vip/i);
    const aside = screen.getByRole("complementary", { name: "Selected VIP card" });
    expect(within(aside).queryByText("Spot Cash")).toBeNull();
    const schemes = screen.getByRole("radiogroup", { name: "Payment scheme" });
    await user.click(within(schemes).getByRole("radio", { name: /spot cash/i }));
    // The aside renders one scheme row under a "Payment scheme" caption.
    expect(within(aside).getByText("Payment scheme")).toBeInTheDocument();
    expect(within(aside).getByText("Spot Cash")).toBeInTheDocument();
  });
});

describe("customer application new fields and secondary holder", () => {
  function wizardMain() {
    const element = document.querySelector(".customer-application__main");
    if (!(element instanceof HTMLElement)) throw new Error("Wizard main column not found.");
    return element;
  }

  async function startApplication(user: ReturnType<typeof userEvent.setup>, card: RegExp) {
    const view = show("dev-sm-a", <CustomerFormPage />);
    await user.click(await screen.findByRole("radio", { name: card }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("radiogroup", { name: "Payment scheme" });
    return view;
  }

  async function choosePlanAndContinue(user: ReturnType<typeof userEvent.setup>) {
    const schemes = screen.getByRole("radiogroup", { name: "Payment scheme" });
    const target = within(schemes).getAllByRole("radio").find((item) => item.getAttribute("aria-disabled") !== "true" && !item.hasAttribute("data-disabled"))!;
    await user.click(target);
    await user.click(screen.getByRole("radio", { name: /standard \(s\)/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
  }

  async function reachCustomerStep(user: ReturnType<typeof userEvent.setup>, card: RegExp) {
    const view = await startApplication(user, card);
    await choosePlanAndContinue(user);
    await screen.findByRole("heading", { name: "Personal details" });
    return view;
  }

  function stubImagePreviews() {
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", Object.assign(class extends URL {}, {
      createObjectURL: (file: File) => `blob:${file.name}`,
      revokeObjectURL,
    }));
    return revokeObjectURL;
  }

  function selectIdImage(name: string, secondary = false, type = "image/png") {
    const label = secondary ? "Select secondary holder Government ID image file" : "Select Government ID image file";
    fireEvent.change(screen.getByLabelText(label), { target: { files: [new File(["fixture"], name, { type })] } });
  }

  it("keeps ID previews independent across steps and clears them on removal, toggle-off, and exit", async () => {
    const revoke = stubImagePreviews();
    const user = userEvent.setup();
    await reachCustomerStep(user, /gold vip/i);
    await user.click(secondaryToggle()!);
    selectIdImage("primary.png");
    selectIdImage("secondary.png", true);
    selectIdImage("invalid.pdf", false, "application/pdf");
    expect(screen.getByRole("alert")).toHaveTextContent(/jpeg, png, or webp/i);
    expect(screen.getByRole("img", { name: "Government ID image preview" })).toHaveAttribute("src", "blob:primary.png");
    expect(screen.getByRole("img", { name: "Secondary holder Government ID image preview" })).toHaveAttribute("src", "blob:secondary.png");
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText("primary.png")).toBeVisible();
    expect(screen.getByText("secondary.png")).toBeVisible();
    expect(sessionStorage.getItem("afhomes.customer-wizard.v1")).toBeNull();
    selectIdImage("replacement.webp", false, "image/webp");
    expect(revoke).toHaveBeenCalledWith("blob:primary.png");
    expect(screen.getByRole("img", { name: "Government ID image preview" })).toHaveAttribute("src", "blob:replacement.webp");
    await user.click(screen.getByRole("button", { name: "Remove Government ID image" }));
    expect(revoke).toHaveBeenCalledWith("blob:replacement.webp");
    await user.click(secondaryToggle()!);
    expect(revoke).toHaveBeenCalledWith("blob:secondary.png");
    await user.click(secondaryToggle()!);
    expect(screen.queryByText("secondary.png")).toBeNull();
    selectIdImage("exit.png");
    cleanup();
    expect(revoke).toHaveBeenCalledWith("blob:exit.png");
    show("dev-sm-a", <CustomerFormPage />);
    expect(await screen.findByRole("heading", { name: "Choose a VIP card" })).toBeVisible();
    expect(screen.queryByText("exit.png")).toBeNull();
  });

  it("clears the temporary ID preview after saving a draft", async () => {
    const revoke = stubImagePreviews();
    const createDraft = vi.spyOn(MockCustomerRepository.prototype, "createDraft");
    const user = userEvent.setup();
    await reachCustomerStep(user, /silver vip/i);
    await user.type(screen.getByLabelText(/^first name/i), "Maria");
    selectIdImage("draft-id.png");
    await user.click(screen.getByRole("button", { name: /save as draft/i }));
    expect(await screen.findByText("Draft saved.")).toBeVisible();
    expect(screen.queryByText("draft-id.png")).toBeNull();
    expect(revoke).toHaveBeenCalledWith("blob:draft-id.png");
    expect(createDraft.mock.calls[0]?.[0]).toMatchObject({ firstName: "Maria", mobileNumber: null });
    expect(JSON.stringify(createDraft.mock.calls)).not.toMatch(/draft-id\.png|blob:/);
  });

  it("discards the ID preview before the browser can cache the departing page", async () => {
    const revoke = stubImagePreviews();
    const user = userEvent.setup();
    await reachCustomerStep(user, /silver vip/i);
    selectIdImage("cached-page.png");
    fireEvent(window, new Event("pagehide"));
    expect(revoke).toHaveBeenCalledWith("blob:cached-page.png");
    expect(screen.queryByText("cached-page.png")).toBeNull();
  });

  async function fillValidPrimary(user: ReturnType<typeof userEvent.setup>) {
    // Required-field captions carry an aria-hidden asterisk, so match loosely.
    // Province also exists in the office address block, so scope it to the Address card.
    const addressCard = screen.getByRole("heading", { name: "Address" }).closest(".customer-application__block") as HTMLElement;
    await user.type(screen.getByLabelText(/first name/i), "Maria");
    await user.type(screen.getByLabelText(/last name/i), "Reyes");
    fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: "1990-05-01" } });
    await user.click(within(screen.getByRole("radiogroup", { name: "Gender" })).getByRole("radio", { name: "Male" }));
    await user.click(within(screen.getByRole("radiogroup", { name: "Civil status" })).getByRole("radio", { name: "Single" }));
    await user.type(screen.getByLabelText(/mobile number/i), "171110009");
    await fillResidentialAddress(user, addressCard, "Cebu", "Lapu-Lapu City", "Pajo");
  }

  async function attachProofAndReachReview(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByText("Sales attribution");
    await user.click(screen.getByRole("checkbox", { name: /processing of personal data/i }));
    await user.click(screen.getByRole("checkbox", { name: /specimen signatures/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("heading", { name: "Application form" });
    const proof = screen.getByLabelText(/proof of payment/i) as HTMLInputElement;
    fireEvent.change(proof, { target: { files: [new File(["proof"], "receipt.png", { type: "image/png" })] } });
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("heading", { name: "Review the application" });
  }

  async function acceptAndSubmit(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("checkbox", { name: /customer reviewed and accepted/i }));
    await user.click(screen.getByRole("button", { name: /submit application/i }));
  }

  function secondaryToggle() {
    return screen.queryByRole("switch", { name: /secondary card holder/i });
  }

  it.each([/silver vip/i, /bronze vip/i])("hides the secondary toggle for %s", async (card) => {
    const user = userEvent.setup();
    await reachCustomerStep(user, card);
    expect(secondaryToggle()).toBeNull();
    expect(within(wizardMain()).queryByText("Add a secondary card holder")).toBeNull();
  });

  it("shows the secondary toggle for Gold but no mirror until it is on", async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /gold vip/i);
    expect(await screen.findByRole("switch", { name: /secondary card holder/i })).toBeInTheDocument();
    expect(screen.getByText("Add a secondary card holder")).toBeInTheDocument();
    expect(screen.queryByLabelText("First name (Secondary holder)")).toBeNull();
  });

  it("reveals the full secondary mirror when the toggle is on", async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /gold vip/i);
    await user.click(await screen.findByRole("switch", { name: /secondary card holder/i }));
    expect(await screen.findByLabelText("First name (Secondary holder)")).toBeInTheDocument();
    for (const name of [
      "Last name (Secondary holder)",
      "Citizenship (Secondary holder)",
      "Date of birth (Secondary holder)",
      "Mobile number (Secondary holder)",
      "Email (Secondary holder)",
      "Landline (Secondary holder)",
      "TIN number (Secondary holder)",
      "Occupation/Business Name (Secondary holder)",
      "Type of Business/Industry (Secondary holder)",
      "Employed Position (Secondary holder)",
    ]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
    for (const heading of [
      "Personal details (Secondary holder)",
      "Contact (Secondary holder)",
      "Address (Secondary holder)",
      "Government ID (Secondary holder)",
      "Employment (Secondary holder)",
    ]) {
      expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(screen.getByRole("radiogroup", { name: "Gender (Secondary holder)" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Civil status (Secondary holder)" })).toBeInTheDocument();
  });

  it("renders the new primary fields with exact labels", async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /silver vip/i);
    expect(screen.getByRole("heading", { name: "Employment" })).toBeInTheDocument();
    expect(screen.getByLabelText("Citizenship")).toBeInTheDocument();
    expect(screen.getByLabelText("TIN number")).toBeInTheDocument();
    expect(screen.getByLabelText("Landline")).toBeInTheDocument();
    expect(screen.getByLabelText("Occupation/Business Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Type of Business/Industry")).toBeInTheDocument();
    expect(screen.getByLabelText("Employed Position")).toBeInTheDocument();
    expect(document.getElementById("afhomes-office-street") as HTMLInputElement).toHaveAccessibleName("No./Street/Subdivision");
    expect(document.getElementById("afhomes-office-municipality") as HTMLInputElement).toHaveAccessibleName("Municipality");
    expect(document.getElementById("afhomes-office-province") as HTMLInputElement).toHaveAccessibleName("Province");
    expect(document.getElementById("afhomes-office-zip") as HTMLInputElement).toHaveAccessibleName("ZIP Code");
  });

  it("shows Age as a disabled derived field next to Date of birth", async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /silver vip/i);
    const personalCard = screen.getByRole("heading", { name: "Personal details" }).closest(".customer-application__block") as HTMLElement;
    const dob = within(personalCard).getByLabelText(/date of birth/i) as HTMLInputElement;
    const age = within(personalCard).getByLabelText("Age") as HTMLInputElement;
    expect(age).toBeDisabled();
    expect(age).toHaveAccessibleDescription("Derived from date of birth.");
    expect(age.value).toBe("");
    fireEvent.change(dob, { target: { value: "1990-05-01" } });
    await waitFor(() => expect(age.value).toBe(String(computeAge("1990-05-01", manilaToday()))));
    fireEvent.change(dob, { target: { value: "" } });
    await waitFor(() => expect(age.value).toBe(""));
  });

  it("derives the secondary holder Age the same way", async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /gold vip/i);
    await user.click(await screen.findByRole("switch", { name: /secondary card holder/i }));
    const secHeading = await screen.findByRole("heading", { name: "Personal details (Secondary holder)" });
    const secCard = secHeading.closest(".customer-application__block") as HTMLElement;
    const secDob = within(secCard).getByLabelText(/date of birth/i) as HTMLInputElement;
    const secAge = within(secCard).getByLabelText("Age") as HTMLInputElement;
    expect(secAge).toBeDisabled();
    expect(secAge).toHaveAccessibleDescription("Derived from date of birth.");
    expect(secAge.value).toBe("");
    fireEvent.change(secDob, { target: { value: "2000-01-01" } });
    await waitFor(() => expect(secAge.value).toBe(String(computeAge("2000-01-01", manilaToday()))));
    const secLandline = screen.getByLabelText("Landline (Secondary holder)") as HTMLInputElement;
    expect(secLandline.parentElement?.querySelector('[aria-hidden="true"]')).toBeNull();
    fireEvent.change(secDob, { target: { value: "" } });
    await waitFor(() => expect(secAge.value).toBe(""));
  });

  it("shows no Step N of 6 counter anywhere; the mobile caption is the step name with a progressbar", async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /silver vip/i);
    const bar = await screen.findByRole("progressbar", { name: "Application progress" });
    expect(bar).toHaveAttribute("aria-valuemin", "1");
    expect(bar).toHaveAttribute("aria-valuemax", "6");
    expect(bar).toHaveAttribute("aria-valuenow", "3");
    const caption = bar.parentElement as HTMLElement;
    expect(within(caption).getByText("Customer")).toBeInTheDocument();
    expect(within(caption).queryByText(/step \d+ of \d+/i)).toBeNull();
    const actions = document.querySelector(".customer-application__actions") as HTMLElement;
    expect(actions).toBeInTheDocument();
    expect(within(actions).queryByText(/step \d+ of \d+/i)).toBeNull();
    expect(screen.queryByText(/step \d+ of \d+/i)).toBeNull();
    // Still true on the next step.
    await fillValidPrimary(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByText("Sales attribution");
    expect(screen.queryByText(/step \d+ of \d+/i)).toBeNull();
    const nextBar = await screen.findByRole("progressbar", { name: "Application progress" });
    expect(within(nextBar.parentElement as HTMLElement).getByText("Sales and consent")).toBeInTheDocument();
  });

  it("gates the city list until a province is chosen and scopes it to that province", async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /silver vip/i);
    const addressCard = screen.getByRole("heading", { name: "Address" }).closest(".customer-application__block") as HTMLElement;
    const provinceCombo = () => within(addressCard).getByRole("combobox", { name: /^province/i }) as HTMLInputElement;
    const cityCombo = () => within(addressCard).getByRole("combobox", { name: /city/i }) as HTMLInputElement;
    expect(provinceCombo().value).toBe("");
    // The city combo waits for the province that supplies its options.
    expect(cityCombo()).toBeDisabled();
    expect(cityCombo()).toHaveAttribute("placeholder", "Select a province first");
    await pickFilteredOption(user, provinceCombo(), "Cebu", /^cebu$/i);
    await waitFor(() => expect(provinceCombo().value).toBe("Cebu"));
    expect(cityCombo()).toBeEnabled();
    await user.click(cityCombo());
    // The list is scoped to Cebu: Lapu-Lapu City is present, Quezon City is not.
    expect(await screen.findByRole("option", { name: "Lapu-Lapu City" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Quezon City" })).toBeNull();
  });

  it("gates barangay on a chosen city and scopes its options to that city", async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /silver vip/i);
    const addressCard = screen.getByRole("heading", { name: "Address" }).closest(".customer-application__block") as HTMLElement;
    const provinceCombo = () => within(addressCard).getByRole("combobox", { name: /^province/i }) as HTMLInputElement;
    const cityCombo = () => within(addressCard).getByRole("combobox", { name: /city/i }) as HTMLInputElement;
    const barangayCombo = () => within(addressCard).getByRole("combobox", { name: /^barangay/i }) as HTMLInputElement;
    await pickFilteredOption(user, provinceCombo(), "Cebu", /^cebu$/i);
    await waitFor(() => expect(cityCombo()).toBeEnabled());
    // Barangay needs a city before it offers anything.
    expect(barangayCombo()).toBeDisabled();
    expect(barangayCombo()).toHaveAttribute("placeholder", "Select a city first");
    await pickFilteredOption(user, cityCombo(), "Lapu-Lapu City", /^lapu-lapu city$/i);
    await waitFor(() => expect(barangayCombo()).toBeEnabled());
    // The unscoped list holds Lapu-Lapu's barangays only; Laguna's Alipit is
    // never offered here.
    await user.click(barangayCombo());
    expect(await screen.findByRole("option", { name: "Pajo" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /^alipit$/i })).toBeNull();
    await user.click(screen.getByRole("option", { name: "Pajo" }));
    await waitFor(() => expect(barangayCombo().value).toBe("Pajo"));
  });

  it("locks the principal ZIP for a city, including multi-ZIP cities", async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /silver vip/i);
    const addressCard = screen.getByRole("heading", { name: "Address" }).closest(".customer-application__block") as HTMLElement;
    const provinceCombo = () => within(addressCard).getByRole("combobox", { name: /^province/i }) as HTMLInputElement;
    const cityCombo = () => within(addressCard).getByRole("combobox", { name: /city/i }) as HTMLInputElement;
    const zip = () => within(addressCard).getByRole("textbox", { name: /zip code/i }) as HTMLInputElement;
    // Street stays editable text ahead of the province-first selects and carries
    // the subdivision inline, never as a separate field.
    const street = within(addressCard).getByRole("textbox", { name: "No./Street/Subdivision" });
    expect(street).toBeInTheDocument();
    expect(within(addressCard).getByRole("textbox", { name: /subdivision/i })).toBe(street);

    await pickFilteredOption(user, provinceCombo(), "Cebu", /^cebu$/i);
    await pickFilteredOption(user, cityCombo(), "Lapu-Lapu City", /^lapu-lapu city$/i);
    // The mapped city auto-fills its single ZIP (never a guessed value) and locks it.
    await waitFor(() => expect(zip().value).toBe("6015"));
    expect(zip()).toBeDisabled();
    expect(within(addressCard).getByText("Principal ZIP for the selected city.")).toBeInTheDocument();

    // A multi-ZIP NCR city resolves its municipality's principal ZIP and
    // stays locked; the field never accepts a user-typed value. Changing
    // provinces resets the city first (component rule), so Metro Manila is
    // picked before choosing from its now-scoped city list.
    await pickFilteredOption(user, provinceCombo(), "Metro Manila", /^metro manila$/i);
    await waitFor(() => expect(cityCombo().value).toBe(""));
    await pickFilteredOption(user, cityCombo(), "Quezon City", /^quezon city$/i);
    await waitFor(() => expect(cityCombo().value).toBe("Quezon City"));
    await waitFor(() => expect(zip().value).toBe("1100"));
    expect(zip()).toBeDisabled();
    // The field stays derived and locked; the hint states the source.
    expect(within(addressCard).getByText("Principal ZIP for the selected city.")).toBeInTheDocument();
    fireEvent.change(zip(), { target: { value: "1101" } });
    expect(zip().value).toBe("1100");
  });

  it("resets dependent address children and ZIP when the province changes", async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /silver vip/i);
    const addressCard = screen.getByRole("heading", { name: "Address" }).closest(".customer-application__block") as HTMLElement;
    const provinceCombo = () => within(addressCard).getByRole("combobox", { name: /^province/i }) as HTMLInputElement;
    const cityCombo = () => within(addressCard).getByRole("combobox", { name: /city/i }) as HTMLInputElement;
    const barangayCombo = () => within(addressCard).getByRole("combobox", { name: /^barangay/i }) as HTMLInputElement;
    const zip = () => within(addressCard).getByRole("textbox", { name: /zip code/i }) as HTMLInputElement;
    await fillResidentialAddress(user, addressCard, "Cebu", "Lapu-Lapu City", "Pajo");
    await waitFor(() => expect(zip().value).toBe("6015"));

    // Switching province resets the dependent children and ZIP.
    await pickFilteredOption(user, provinceCombo(), "Metro Manila", /^metro manila$/i);
    await waitFor(() => expect(provinceCombo().value).toBe("Metro Manila"));
    await waitFor(() => expect(cityCombo().value).toBe(""));
    await waitFor(() => expect(barangayCombo().value).toBe(""));
    await waitFor(() => expect(zip().value).toBe(""));
    expect(zip()).toBeDisabled();
    // The newly set province gates and scopes the city list again.
    expect(cityCombo()).toBeEnabled();
    expect(barangayCombo()).toBeDisabled();
    await user.click(cityCombo());
    expect(await screen.findByRole("option", { name: "Quezon City" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /^lapu-lapu city$/i })).toBeNull();
  });

  it("derives the landline prefix per selected city and keeps digits user-entered", async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /silver vip/i);
    const landline = screen.getByLabelText("Landline") as HTMLInputElement;
    const adornment = () => landline.parentElement?.querySelector('[aria-hidden="true"]');
    expect(adornment()).toBeNull();
    const addressCard = screen.getByRole("heading", { name: "Address" }).closest(".customer-application__block") as HTMLElement;
    await fillResidentialAddress(user, addressCard, "Cebu", "Lapu-Lapu City", "Pajo");
    // Lapu-Lapu City maps to area code 032 in the curated dataset.
    await waitFor(() => expect(adornment()?.textContent).toBe("(032)"));
    await user.type(landline, "8123456");
    expect(landline.value).toBe("8123456");
    expect(landline.value).not.toContain("+63");
  });

  it("falls back to the province area code for a city without a curated override", async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /silver vip/i);
    const landline = screen.getByLabelText("Landline") as HTMLInputElement;
    const adornment = () => landline.parentElement?.querySelector('[aria-hidden="true"]');
    const addressCard = screen.getByRole("heading", { name: "Address" }).closest(".customer-application__block") as HTMLElement;
    const provinceCombo = () => within(addressCard).getByRole("combobox", { name: /^province/i }) as HTMLInputElement;
    const cityCombo = () => within(addressCard).getByRole("combobox", { name: /city/i }) as HTMLInputElement;
    // Santa Cruz (Laguna) has no city overlay, so the province code 049 applies.
    await pickFilteredOption(user, provinceCombo(), "Laguna", /^laguna$/i);
    await pickFilteredOption(user, cityCombo(), "Santa Cruz", /^santa cruz$/i);
    await waitFor(() => expect((provinceCombo() as HTMLInputElement).value).toBe("Laguna"));
    await waitFor(() => expect((cityCombo() as HTMLInputElement).value).toBe("Santa Cruz"));
    await waitFor(() => expect(adornment()?.textContent).toBe("(049)"));
  });

  it("completes the office address province-first with the same ZIP rule", async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /silver vip/i);
    const employmentCard = screen.getByRole("heading", { name: "Employment" }).closest(".customer-application__block") as HTMLElement;
    const officeProvince = () => within(employmentCard).getByRole("combobox", { name: "Province" }) as HTMLInputElement;
    const officeMunicipality = () => within(employmentCard).getByRole("combobox", { name: "Municipality" }) as HTMLInputElement;
    const officeZip = () => within(employmentCard).getByLabelText("ZIP Code") as HTMLInputElement;
    expect(officeProvince().value).toBe("");
    // The municipality waits for the province that supplies its options.
    expect(officeMunicipality()).toBeDisabled();
    expect(officeMunicipality()).toHaveAttribute("placeholder", "Select a province first");
    await pickFilteredOption(user, officeProvince(), "Cebu", /^cebu$/i);
    await waitFor(() => expect(officeMunicipality()).toBeEnabled());
    // Mapped municipality: the single ZIP locks with a hint.
    await pickFilteredOption(user, officeMunicipality(), "Mandaue City", /^mandaue city$/i);
    await waitFor(() => expect(officeZip().value).toBe("6014"));
    expect(officeZip()).toBeDisabled();
    expect(within(employmentCard).getByText("Principal ZIP for the selected municipality.")).toBeInTheDocument();
    // A multi-ZIP municipality resolves its principal ZIP and stays locked.
    // Changing provinces resets the municipality first (component rule), so
    // Metro Manila is picked before choosing from its now-scoped list.
    await pickFilteredOption(user, officeProvince(), "Metro Manila", /^metro manila$/i);
    await waitFor(() => expect(officeMunicipality().value).toBe(""));
    await pickFilteredOption(user, officeMunicipality(), "Quezon City", /^quezon city$/i);
    await waitFor(() => expect(officeMunicipality().value).toBe("Quezon City"));
    await waitFor(() => expect(officeZip().value).toBe("1100"));
    expect(officeZip()).toBeDisabled();
    // The field stays derived and locked; the hint states the source.
    expect(within(employmentCard).getByText("Principal ZIP for the selected municipality.")).toBeInTheDocument();
    fireEvent.change(officeZip(), { target: { value: "ab1100" } });
    expect(officeZip().value).toBe("1100");
    // The street line stays editable text and the subdivision is typed inline in it.
    const officeStreet = within(employmentCard).getByLabelText("No./Street/Subdivision") as HTMLInputElement;
    await user.type(officeStreet, "123 Mabini St, acacia subdivision");
    expect(officeStreet.value).toBe("123 Mabini St, Acacia Subdivision");
    expect(within(employmentCard).getByRole("textbox", { name: /subdivision/i })).toBe(officeStreet);
  });

  it("formats the TIN when filled and keeps the landline digits", async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /silver vip/i);
    await user.type(screen.getByLabelText("TIN number"), "123456789");
    expect((screen.getByLabelText("TIN number") as HTMLInputElement).value).toBe("123-456-789");
    await user.type(screen.getByLabelText("Landline"), "028123456");
    expect((screen.getByLabelText("Landline") as HTMLInputElement).value).toBe("028123456");
  });

  it("requires the secondary holder's first and last name once the profile is started", async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /gold vip/i);
    await fillValidPrimary(user);
    await user.click(screen.getByRole("switch", { name: /secondary card holder/i }));
    await user.type(await screen.findByLabelText("First name (Secondary holder)"), "Ana");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByText("Enter the supplementary holder's first and last name.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Personal details" })).toBeInTheDocument();
  });

  it("blocks submit-path progress when landline and TIN are invalid", async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /silver vip/i);
    await fillValidPrimary(user);
    await user.type(screen.getByLabelText("Landline"), "123");
    await user.type(screen.getByLabelText("TIN number"), "12345");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    // Continue now returns to the step that owns the first failing field and
    // highlights it, instead of silently stalling on a later step.
    expect(await screen.findByText("Landline must be 7 digits for this area code.")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Personal details" })).toBeInTheDocument();
    expect(screen.queryByText("Sales attribution")).toBeNull();
  });

  it("returns from Reservation to the owning step with the specific Customer ID message", { timeout: 30_000 }, async () => {
    const user = userEvent.setup();
    const manualId = `${currentManilaYear()}-0042`;
    show(
      "dev-sm-a",
      <>
        <CustomerDraftProbe customerNumber={manualId} />
        <CustomerFormPage />
      </>,
    );

    await user.click(await screen.findByRole("radio", { name: /silver vip/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("radiogroup", { name: "Payment scheme" });
    await choosePlanAndContinue(user);
    await screen.findByRole("heading", { name: "Personal details" });
    await fillValidPrimary(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByText("Sales attribution");

    // The manual ID is unique until the draft is saved from the Reservation step.
    await user.click(screen.getByRole("radio", { name: "Manual" }));
    await user.type(screen.getByLabelText("Customer ID"), manualId);
    await user.click(screen.getByRole("checkbox", { name: /processing of personal data/i }));
    await user.click(screen.getByRole("checkbox", { name: /specimen signatures/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("heading", { name: "Application form" });

    await user.click(screen.getByRole("button", { name: /save as draft/i }));
    await screen.findByText("Draft saved.");
    await waitFor(() => expect(screen.getByTestId("draft-probe")).toHaveTextContent("saved"));

    // Continue on Reservation now blocks on a field that step does not render.
    await user.click(screen.getByRole("button", { name: /continue/i }));

    // The toast names the field, not just the generic "complete the fields" copy.
    const notifications = await screen.findByLabelText(/notifications/i);
    expect(within(notifications).getByText("This Customer ID is already in use.")).toBeInTheDocument();
    expect(within(notifications).queryByText("Complete the highlighted fields to continue.")).toBeNull();

    // The wizard returns to the Sales and consent step that owns the field and
    // highlights it there.
    expect(await screen.findByText("Sales attribution")).toBeInTheDocument();
    expect(screen.getAllByText("This Customer ID is already in use.").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Review the application" })).toBeNull();
  });

  // Full submit path with combobox address picks; needs headroom over the 15s project default under load.
  it("treats toggle-off as no secondary profile on submit", { timeout: 30_000 }, async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /gold vip/i);
    await user.click(screen.getByRole("switch", { name: /secondary card holder/i }));
    await user.type(await screen.findByLabelText("First name (Secondary holder)"), "Ana");
    await user.type(screen.getByLabelText("Last name (Secondary holder)"), "Santos");
    await user.click(screen.getByRole("switch", { name: /secondary card holder/i }));
    expect(secondaryToggle()).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByLabelText("First name (Secondary holder)")).toBeNull();
    await fillValidPrimary(user);
    await attachProofAndReachReview(user);
    await acceptAndSubmit(user);
    expect(await screen.findByText(/waiting for Finance verification|submitted|drafted/i)).toBeInTheDocument();
    expect(screen.queryByText("Enter the supplementary holder's first and last name.")).toBeNull();
  });

  it("clears the secondary profile on plan change", async () => {
    const revoke = stubImagePreviews();
    const user = userEvent.setup();
    await reachCustomerStep(user, /gold vip/i);
    await user.click(screen.getByRole("switch", { name: /secondary card holder/i }));
    await user.type(await screen.findByLabelText("First name (Secondary holder)"), "Ana");
    selectIdImage("gold-only.png", true);
    const progress = screen.getByRole("list", { name: "Progress" });
    await user.click(within(progress).getByText(/vip card/i));
    await user.click(await screen.findByRole("radio", { name: /silver vip/i }));
    expect(revoke).toHaveBeenCalledWith("blob:gold-only.png");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await choosePlanAndContinue(user);
    await screen.findByRole("heading", { name: "Personal details" });
    expect(secondaryToggle()).toBeNull();
    const progressAgain = screen.getByRole("list", { name: "Progress" });
    await user.click(within(progressAgain).getByText(/vip card/i));
    await user.click(await screen.findByRole("radio", { name: /gold vip/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await choosePlanAndContinue(user);
    await screen.findByRole("heading", { name: "Personal details" });
    const toggle = secondaryToggle();
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle!);
    expect((await screen.findByLabelText("First name (Secondary holder)") as HTMLInputElement).value).toBe("");
  });

  // Full submit path with combobox address picks; needs headroom over the 15s project default under load.
  it("submits Gold with a full secondary profile", { timeout: 30_000 }, async () => {
    const revoke = stubImagePreviews();
    const submit = vi.spyOn(MockCustomerRepository.prototype, "submit");
    const user = userEvent.setup();
    await reachCustomerStep(user, /gold vip/i);
    await fillValidPrimary(user);
    await user.click(screen.getByRole("switch", { name: /secondary card holder/i }));
    await user.type(await screen.findByLabelText("First name (Secondary holder)"), "Ana");
    await user.type(screen.getByLabelText("Last name (Secondary holder)"), "Santos");
    await user.type(screen.getByLabelText("Citizenship (Secondary holder)"), "Filipino");
    await user.type(screen.getByLabelText("Mobile number (Secondary holder)"), "171110002");
    await user.type(screen.getByLabelText("Landline (Secondary holder)"), "028123456");
    await user.type(screen.getByLabelText("TIN number (Secondary holder)"), "123456789");
    selectIdImage("submitted-id.png");
    await attachProofAndReachReview(user);
    expect(screen.queryByText("Fix these before continuing")).toBeNull();
    const holderRow = screen.getByText("Supplementary holder", { selector: "dt" });
    expect(holderRow.parentElement).toHaveTextContent("Ana Santos");
    await acceptAndSubmit(user);
    expect(await screen.findByText(/waiting for Finance verification|submitted|drafted/i)).toBeInTheDocument();
    expect(revoke).toHaveBeenCalledWith("blob:submitted-id.png");
    expect(submit.mock.calls[0]?.[1]).toMatchObject({
      mobileNumber: "09171110009",
      supplementaryHolder: { mobileNumber: "09171110002" },
    });
    expect(JSON.stringify(submit.mock.calls)).not.toMatch(/submitted-id\.png|blob:/);
  });

  // Full submit path with combobox address picks; needs headroom over the 15s project default under load.
  it("keeps Review and names the missing acceptance when Submit runs without the acceptance box", { timeout: 30_000 }, async () => {
    const user = userEvent.setup();
    await reachCustomerStep(user, /gold vip/i);
    await fillValidPrimary(user);
    await attachProofAndReachReview(user);
    // Submit from Review with the acceptance box left unchecked.
    expect(screen.getByRole("checkbox", { name: /customer reviewed and accepted/i })).not.toBeChecked();
    await user.click(screen.getByRole("button", { name: /submit application/i }));

    // The acceptance checkbox lives on Review, so Submit stays there and names the
    // missing confirmation instead of navigating to a step without that control.
    expect(await screen.findByRole("heading", { name: "Review the application" })).toBeInTheDocument();
    const notifications = await screen.findByLabelText(/notifications/i);
    expect(within(notifications).getByText("Confirm that the customer accepted the payment schedule.")).toBeInTheDocument();
  });
  describe("new customer submission feedback", () => {
    type Outcome = Awaited<ReturnType<typeof registration.registerCustomer>>;
    const customerId = "cust-new";
    const contractId = "ctr-new";
    const storageKey = "afhomes.customer-wizard.v1";

    async function submit(outcome: Outcome) {
      vi.spyOn(registration, "registerCustomer").mockResolvedValue(outcome);
      const user = userEvent.setup();
      const view = await reachCustomerStep(user, /silver vip/i);
      await fillValidPrimary(user);
      await attachProofAndReachReview(user);
      expect(screen.queryByRole("alertdialog")).toBeNull();
      await acceptAndSubmit(user);
      return view;
    }

    it("shows SweetAlert2 success, resets the wizard, and automatically returns to Customers", { timeout: 30_000 }, async () => {
      await submit({ status: "reservation-submitted", customerId, contractId });
      const alert = await screen.findByRole("dialog", { name: "Application submitted" });
      expect(alert).toBe(Swal.getPopup());
      expect(within(alert).getByText(/awaiting Finance verification/i)).toBeVisible();
      expect(sessionStorage.getItem(storageKey)).toBeNull();
      expect(Swal.getTimerLeft()).toBeGreaterThan(0);
      expect(navigation.replace).not.toHaveBeenCalled();
      expect(navigation.push).not.toHaveBeenCalled();
      await waitFor(() => expect(navigation.replace.mock.calls).toEqual([["/admin/customers"]]), { timeout: 4_500 });
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "Application submitted" })).toBeNull());
      expect(screen.getByRole("radio", { name: /silver vip/i })).toHaveAttribute("aria-checked", "false");
    });

    it.each([
      { status: "customer-submitted", customerId },
      { status: "contract-prepared", customerId, contractId },
    ] satisfies Outcome[])("lets users return early after $status and cancels the timer", { timeout: 30_000 }, async (outcome) => {
      await submit(outcome);
      const alert = await screen.findByRole("dialog", { name: "Application submitted" });
      expect(Swal.getTimerLeft()).toBeGreaterThan(0);
      fireEvent.click(within(alert).getByRole("button", { name: "Go to Customers" }));
      await waitFor(() => expect(navigation.replace.mock.calls).toEqual([["/admin/customers"]]));
      expect(Swal.isTimerRunning()).toBeFalsy();
    });

    it("cancels the pending redirect when the wizard unmounts", { timeout: 30_000 }, async () => {
      const view = await submit({ status: "customer-submitted", customerId });
      await screen.findByRole("dialog", { name: "Application submitted" });
      view.unmount();
      await waitFor(() => expect(Swal.getPopup()).toBeNull());
      expect(Swal.isTimerRunning()).toBeFalsy();
      expect(navigation.replace).not.toHaveBeenCalled();
    });

    it.each([
      { status: "draft-kept", customerId, errors: {} },
      { status: "contract-failed", customerId, error: new Error("Could not prepare the contract.") },
      { status: "reservation-failed", customerId, contractId, error: new Error("Could not submit the reservation.") },
    ] satisfies Outcome[])("keeps the recovery route for $status", { timeout: 30_000 }, async (outcome) => {
      await submit(outcome);
      await waitFor(() => {
        if (outcome.status === "draft-kept") {
          expect(navigation.replace.mock.calls).toEqual([[`/admin/customers/${customerId}/edit`]]);
        } else {
          expect(navigation.push.mock.calls).toEqual([[`/admin/customers/${customerId}`]]);
        }
      });
      expect(Swal.getPopup()).toBeNull();
    });
  });

  it("blocks saving a saved draft with a pending OST and allows clearing the selection", { timeout: 30_000 }, async () => {
    const user = userEvent.setup();
    const accreditationList = MockAccreditationRepository.prototype.list;
    vi.spyOn(MockAccreditationRepository.prototype, "list").mockImplementation(async function (this: MockAccreditationRepository, options) {
      return (await accreditationList.call(this, options)).map((record) =>
        record.memberId === "mem-ost-a1" ? { ...record, adminStatus: "pending" } : record,
      );
    });
    const customerList = MockCustomerRepository.prototype.list;
    vi.spyOn(MockCustomerRepository.prototype, "list").mockImplementation(async function (this: MockCustomerRepository, options) {
      return (await customerList.call(this, options)).map((record) =>
        record.id === "cust-a2" ? { ...record, recommenderMemberId: "mem-ost-a1" } : record,
      );
    });
    const update = vi.spyOn(MockCustomerRepository.prototype, "updateDraft");
    show("dev-sm-a", <CustomerFormPage customerId="cust-a2" />);
    await user.click(await screen.findByRole("radio", { name: /silver vip/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await choosePlanAndContinue(user);
    await fillValidPrimary(user);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    const recommender = await screen.findByRole("combobox", { name: "OST (Recommender)" });
    await waitFor(() => expect(recommender).toHaveAccessibleDescription(/pending accreditation/i));
    await user.click(screen.getByRole("button", { name: "Save as draft" }));
    expect(update).not.toHaveBeenCalled();
    await user.click(recommender);
    expect(screen.queryByRole("option", { name: /Ana Mendoza|Paolo Ramos/ })).toBeNull();
    await user.click(screen.getByRole("option", { name: "No recommender" }));
    await user.click(screen.getByRole("button", { name: "Save as draft" }));
    expect(await screen.findByText("Draft saved.")).toBeVisible();
    expect(update.mock.calls[0]?.[1].recommenderMemberId).toBeNull();
  });
});

describe("new customer unsaved changes", () => {
  it("validates the names on a partially entered secondary profile when submitting a saved draft", () => {
    const draft = { ...toDraft(), vipPlan: "G1", secEnabled: true, secEmail: "holder@example.test" };
    const input = toInput(draft);
    expect(input.supplementaryHolder).toMatchObject({ email: "holder@example.test" });
    expect(validateCustomerForSubmit(input, [], undefined, true).supplementaryHolder).toMatch(/first and last name/i);
    expect(toInput({ ...draft, secEmail: "" }).supplementaryHolder).toBeNull();
  });

  it("starts fresh after a refresh and removes the old autosaved input", async () => {
    const user = userEvent.setup();
    const before = show("dev-sm-a", <CustomerFormPage />);
    await user.click(await screen.findByRole("radio", { name: /silver vip/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(await screen.findByRole("heading", { name: "Payment plan" })).toBeInTheDocument();
    expect(await screen.findByRole("complementary", { name: "Selected VIP card" })).toHaveTextContent("Silver VIP (S1)");

    before.unmount();
    sessionStorage.setItem("afhomes.customer-wizard.v1", JSON.stringify({ step: 1, draft: { vipPlan: "S1" } }));
    show("dev-sm-a", <CustomerFormPage />);

    expect(await screen.findByRole("heading", { name: "Choose a VIP card" })).toBeInTheDocument();
    expect(await screen.findByRole("radio", { name: /silver vip/i })).toHaveAttribute("aria-checked", "false");
    expect(sessionStorage.getItem("afhomes.customer-wizard.v1")).toBeNull();
  });

  it("lets the user stay or discard an unsaved application before leaving", async () => {
    const user = userEvent.setup();
    show("dev-super-admin", <CustomerFormPage />);
    const silver = await screen.findByRole("radio", { name: /silver vip/i });
    await user.click(silver);
    const breadcrumb = within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByRole("link", { name: "Customers" });
    await user.click(breadcrumb);
    const prompt = await screen.findByRole("alertdialog", { name: "Leave this application?" });
    await user.click(within(prompt).getByRole("button", { name: "Stay" }));
    expect(silver).toHaveAttribute("aria-checked", "true");
    expect(navigation.push).not.toHaveBeenCalled();
    await user.click(breadcrumb);
    await user.click(within(await screen.findByRole("alertdialog", { name: "Leave this application?" })).getByRole("button", { name: "Discard all Changes" }));
    expect(navigation.push.mock.calls).toEqual([["/admin/customers"]]);
    expect(silver).toHaveAttribute("aria-checked", "false");
  });

  it("saves an unnamed draft on Cancel and reopens it separately from a blank New Customer form", async () => {
    const user = userEvent.setup();
    const view = show("dev-super-admin", <CustomerFormPage />);
    await user.click(await screen.findByRole("radio", { name: /silver vip/i }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    const prompt = await screen.findByRole("alertdialog", { name: "Leave this application?" });
    await user.click(within(prompt).getByRole("button", { name: "Save Draft" }));
    await waitFor(() => expect(navigation.back).toHaveBeenCalledTimes(1));

    view.rerender(<Wrapper identityId="dev-super-admin"><CustomersPage /></Wrapper>);
    const draftLink = await screen.findByRole("link", { name: "Untitled draft" });
    expect(draftLink.closest("tr")).toHaveTextContent("Draft");
    const customerId = draftLink.getAttribute("href")!.split("/").at(-1);
    view.rerender(<Wrapper identityId="dev-super-admin"><CustomerFormPage customerId={customerId} /></Wrapper>);
    expect(await screen.findByRole("radio", { name: /silver vip/i })).toHaveAttribute("aria-checked", "true");

    view.rerender(<Wrapper identityId="dev-super-admin"><CustomerFormPage /></Wrapper>);
    expect(await screen.findByRole("radio", { name: /silver vip/i })).toHaveAttribute("aria-checked", "false");
  });

  it("stays on New Customer when saving before exit fails", async () => {
    vi.spyOn(MockCustomerRepository.prototype, "createDraft").mockRejectedValue(new Error("Draft save failed."));
    const user = userEvent.setup();
    show("dev-super-admin", <CustomerFormPage />);
    const silver = await screen.findByRole("radio", { name: /silver vip/i });
    await user.click(silver);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Save Draft" }));
    expect(await screen.findByText("Draft save failed.")).toBeVisible();
    expect(silver).toHaveAttribute("aria-checked", "true");
    expect(navigation.back).not.toHaveBeenCalled();
  });

  it.each(["desktop", "mobile"])("guards same-tab links from the %s navigation", async (mode) => {
    const user = userEvent.setup();
    show("dev-super-admin", <>
      {mode === "desktop" ? <AdminSidebar collapsed={false} /> : <AdminMobileNav />}
      <CustomerFormPage />
    </>);
    await user.click(await screen.findByRole("radio", { name: /silver vip/i }));
    if (mode === "mobile") await user.click(screen.getByRole("button", { name: "Open navigation" }));
    const nav = screen.getByRole("navigation", { name: "Administration" });
    await user.click(within(nav).getByRole("link", { name: "Dashboard" }));
    const prompt = await screen.findByRole("alertdialog", { name: "Leave this application?" });
    expect(navigation.push).not.toHaveBeenCalled();
    await user.click(within(prompt).getByRole("button", { name: "Discard all Changes" }));
    expect(navigation.push.mock.calls).toEqual([["/admin"]]);
  });

  it("warns on hard unload only when there are unsaved changes", async () => {
    const user = userEvent.setup();
    show("dev-super-admin", <CustomerFormPage />);
    const silver = await screen.findByRole("radio", { name: /silver vip/i });
    const clean = new Event("beforeunload", { cancelable: true });
    fireEvent(window, clean);
    expect(clean.defaultPrevented).toBe(false);
    await user.click(silver);
    const dirty = new Event("beforeunload", { cancelable: true });
    fireEvent(window, dirty);
    expect(dirty.defaultPrevented).toBe(true);
  });
});

describe("customer application realtime field validation", () => {
  /**
   * Renders the real form sections with a local draft, so blur/live validation
   * behaves exactly as in the wizard while staying fast to exercise.
   */
  function ValidationHarness({
    errors = {},
    secondary = false,
  }: {
    errors?: Record<string, string | undefined>;
    secondary?: boolean;
  }) {
    const [draft, setDraft] = useState(() => toDraft());
    const set: SetDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
    if (secondary) return <SecondaryHolderSection draft={draft} set={set} errors={errors} />;
    return (
      <>
        <IdentitySection draft={draft} set={set} errors={errors} />
        <ContactSection draft={draft} set={set} errors={errors} />
        <GovernmentIdSection draft={draft} set={set} errors={errors} />
      </>
    );
  }

  /**
   * Renders the address and contact sections over one shared draft so a city
   * change can retarget the landline area-code rule without the full wizard.
   */
  function AddressContactHarness() {
    const [draft, setDraft] = useState(() => toDraft());
    const set: SetDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
    return (
      <>
        <AddressSection draft={draft} set={set} errors={{}} />
        <ContactSection draft={draft} set={set} errors={{}} newApplication />
      </>
    );
  }

  it("shows each format error on blur and clears it as soon as the value is valid", async () => {
    const user = userEvent.setup();
    render(<ValidationHarness />);

    // Mobile: invalid on blur, cleared live once 11 digits start with 09.
    const mobile = screen.getByLabelText(/^mobile number/i) as HTMLInputElement;
    await user.type(mobile, "0917");
    expect(screen.queryByText("Mobile number required.")).toBeNull();
    fireEvent.blur(mobile);
    expect(await screen.findByText("Mobile number required.")).toBeInTheDocument();
    await user.type(mobile, "1110009");
    expect(screen.queryByText("Mobile number required.")).toBeNull();

    // Landline: optional, and with no address area code the domestic 7–10 digit rule applies.
    const landline = screen.getByLabelText("Landline") as HTMLInputElement;
    await user.type(landline, "123");
    fireEvent.blur(landline);
    expect(await screen.findByText("Landline must be 7 to 10 digits.")).toBeInTheDocument();
    await user.type(landline, "4567");
    expect(screen.queryByText("Landline must be 7 to 10 digits.")).toBeNull();

    // TIN: 9 or 12 digits.
    const tin = screen.getByLabelText("TIN number") as HTMLInputElement;
    await user.type(tin, "12345");
    fireEvent.blur(tin);
    expect(await screen.findByText("TIN must be 9 or 12 digits.")).toBeInTheDocument();
    await user.type(tin, "6789");
    expect(screen.queryByText("TIN must be 9 or 12 digits.")).toBeNull();

    // Email: syntax check only when the field is filled.
    const email = screen.getByLabelText("Email") as HTMLInputElement;
    await user.type(email, "not-an-email");
    fireEvent.blur(email);
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    await user.clear(email);
    await user.type(email, "maria@example.com");
    expect(screen.queryByText("Enter a valid email address.")).toBeNull();

    // Citizenship: maxLength blocks typing past 80, so set the over-length
    // value programmatically to exercise the length rule itself.
    const citizenship = screen.getByLabelText("Citizenship") as HTMLInputElement;
    fireEvent.change(citizenship, { target: { value: "A".repeat(81) } });
    fireEvent.blur(citizenship);
    expect(await screen.findByText("Citizenship must be 80 characters or less.")).toBeInTheDocument();
    fireEvent.change(citizenship, { target: { value: "Filipino" } });
    expect(screen.queryByText("Citizenship must be 80 characters or less.")).toBeNull();
  });

  it("accepts a full 12-digit TIN in the primary and secondary holder fields", async () => {
    const user = userEvent.setup();
    const primary = render(<ValidationHarness />);
    const tin = screen.getByLabelText("TIN number") as HTMLInputElement;
    // Regression guard: the old 14-character cap truncated the branch code.
    expect(tin).toHaveAttribute("maxlength", "15");
    await user.type(tin, "091235467860");
    expect(tin.value).toBe("091-235-467-860");
    expect(tin.value).toHaveLength(15);
    fireEvent.blur(tin);
    expect(screen.queryByText("TIN must be 9 or 12 digits.")).toBeNull();
    primary.unmount();

    render(<ValidationHarness secondary />);
    const secondaryTin = screen.getByLabelText("TIN number (Secondary holder)") as HTMLInputElement;
    expect(secondaryTin).toHaveAttribute("maxlength", "15");
    await user.type(secondaryTin, "091235467860");
    expect(secondaryTin.value).toBe("091-235-467-860");
    expect(secondaryTin.value).toHaveLength(15);
    fireEvent.blur(secondaryTin);
    expect(screen.queryByText("TIN must be 9 or 12 digits.")).toBeNull();
  });

  it("switches the landline digit rule when the address area code changes", async () => {
    const user = userEvent.setup();
    render(<AddressContactHarness />);
    const addressCard = screen.getByRole("heading", { name: "Address" }).closest(".customer-application__block") as HTMLElement;
    const landline = screen.getByLabelText("Landline") as HTMLInputElement;
    const adornment = () => landline.parentElement?.querySelector('[aria-hidden="true"]');

    // Metro Manila (02) wants 8 local digits.
    await fillResidentialAddress(user, addressCard, "Metro Manila", "Quezon City", "Bagong Pag-asa");
    await waitFor(() => expect(adornment()?.textContent).toBe("(02)"));
    await user.type(landline, "81234567");
    fireEvent.blur(landline);
    expect(screen.queryByText("Landline must be 8 digits for Metro Manila (02).")).toBeNull();

    // Changing the area code preserves the entered number for correction.
    await fillResidentialAddress(user, addressCard, "Cebu", "Cebu City", "Capitol Site (Pob.)");
    await waitFor(() => expect(adornment()?.textContent).toBe("(032)"));
    expect(landline).toHaveValue("81234567");
    expect(screen.getByText("Landline must be 7 digits for this area code.")).toBeVisible();
    await user.type(landline, "9");
    expect(landline).toHaveValue("81234567");
    await user.keyboard("{Backspace}");
    expect(landline).toHaveValue("8123456");
    expect(screen.queryByText("Landline must be 7 digits for this area code.")).toBeNull();
  });

  it("shows no error when a valid value loses focus", async () => {
    const user = userEvent.setup();
    render(<ValidationHarness />);
    const email = screen.getByLabelText("Email") as HTMLInputElement;
    await user.type(email, "maria@example.com");
    fireEvent.blur(email);
    const mobile = screen.getByLabelText(/^mobile number/i) as HTMLInputElement;
    await user.type(mobile, "09171110009");
    fireEvent.blur(mobile);
    const landline = screen.getByLabelText("Landline") as HTMLInputElement;
    await user.type(landline, "0281234567");
    fireEvent.blur(landline);
    const tin = screen.getByLabelText("TIN number") as HTMLInputElement;
    await user.type(tin, "123456789");
    fireEvent.blur(tin);
    const citizenship = screen.getByLabelText("Citizenship") as HTMLInputElement;
    await user.type(citizenship, "Filipino");
    fireEvent.blur(citizenship);
    expect(screen.queryByText("Enter a valid email address.")).toBeNull();
    expect(screen.queryByText("Mobile number required.")).toBeNull();
    expect(screen.queryByText("Landline must be 7 to 10 digits.")).toBeNull();
    expect(screen.queryByText("TIN must be 9 or 12 digits.")).toBeNull();
    expect(screen.queryByText("Citizenship must be 80 characters or less.")).toBeNull();
  });

  it("applies the same realtime rules to the secondary holder mirror", async () => {
    const user = userEvent.setup();
    render(<ValidationHarness secondary />);

    const mobile = screen.getByLabelText("Mobile number (Secondary holder)") as HTMLInputElement;
    await user.type(mobile, "0917");
    fireEvent.blur(mobile);
    expect(await screen.findByText("Mobile number required.")).toBeInTheDocument();
    await user.type(mobile, "1110009");
    expect(screen.queryByText("Mobile number required.")).toBeNull();

    const landline = screen.getByLabelText("Landline (Secondary holder)") as HTMLInputElement;
    await user.type(landline, "123");
    fireEvent.blur(landline);
    expect(await screen.findByText("Landline must be 7 to 10 digits.")).toBeInTheDocument();
    await user.type(landline, "4567");
    expect(screen.queryByText("Landline must be 7 to 10 digits.")).toBeNull();

    const tin = screen.getByLabelText("TIN number (Secondary holder)") as HTMLInputElement;
    await user.type(tin, "12345");
    fireEvent.blur(tin);
    expect(await screen.findByText("TIN must be 9 or 12 digits.")).toBeInTheDocument();
    await user.type(tin, "6789");
    expect(screen.queryByText("TIN must be 9 or 12 digits.")).toBeNull();

    const email = screen.getByLabelText("Email (Secondary holder)") as HTMLInputElement;
    await user.type(email, "not-an-email");
    fireEvent.blur(email);
    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    await user.clear(email);
    await user.type(email, "ana@example.com");
    expect(screen.queryByText("Enter a valid email address.")).toBeNull();

    const citizenship = screen.getByLabelText("Citizenship (Secondary holder)") as HTMLInputElement;
    fireEvent.change(citizenship, { target: { value: "A".repeat(81) } });
    fireEvent.blur(citizenship);
    expect(await screen.findByText("Citizenship must be 80 characters or less.")).toBeInTheDocument();
    fireEvent.change(citizenship, { target: { value: "Filipino" } });
    expect(screen.queryByText("Citizenship must be 80 characters or less.")).toBeNull();

    // Re-blurring the corrected values stays quiet, exactly like the primary form.
    fireEvent.blur(mobile);
    fireEvent.blur(landline);
    fireEvent.blur(tin);
    fireEvent.blur(email);
    fireEvent.blur(citizenship);
    expect(screen.queryByText("Mobile number required.")).toBeNull();
    expect(screen.queryByText("Landline must be 7 to 10 digits.")).toBeNull();
    expect(screen.queryByText("TIN must be 9 or 12 digits.")).toBeNull();
    expect(screen.queryByText("Enter a valid email address.")).toBeNull();
    expect(screen.queryByText("Citizenship must be 80 characters or less.")).toBeNull();
  });

  it("keeps submit errors ahead of local blur errors", async () => {
    const user = userEvent.setup();
    render(
      <ValidationHarness
        errors={{
          mobileNumber: "Mobile number is already registered.",
          landline: "Landline was rejected by the server.",
          tinNumber: "TIN was rejected by the server.",
          citizenship: "Citizenship was rejected by the server.",
          email: "Email was rejected by the server.",
        }}
      />,
    );

    const mobile = screen.getByLabelText(/^mobile number/i) as HTMLInputElement;
    await user.type(mobile, "0917");
    fireEvent.blur(mobile);
    expect(screen.getByText("Mobile number is already registered.")).toBeInTheDocument();
    expect(screen.queryByText("Mobile number required.")).toBeNull();

    const landline = screen.getByLabelText("Landline") as HTMLInputElement;
    await user.type(landline, "123");
    fireEvent.blur(landline);
    expect(screen.getByText("Landline was rejected by the server.")).toBeInTheDocument();
    expect(screen.queryByText("Landline must be 7 to 10 digits.")).toBeNull();

    const tin = screen.getByLabelText("TIN number") as HTMLInputElement;
    await user.type(tin, "12345");
    fireEvent.blur(tin);
    expect(screen.getByText("TIN was rejected by the server.")).toBeInTheDocument();
    expect(screen.queryByText("TIN must be 9 or 12 digits.")).toBeNull();

    const email = screen.getByLabelText("Email") as HTMLInputElement;
    await user.type(email, "not-an-email");
    fireEvent.blur(email);
    expect(screen.getByText("Email was rejected by the server.")).toBeInTheDocument();
    expect(screen.queryByText("Enter a valid email address.")).toBeNull();

    const citizenship = screen.getByLabelText("Citizenship") as HTMLInputElement;
    fireEvent.change(citizenship, { target: { value: "A".repeat(81) } });
    fireEvent.blur(citizenship);
    expect(screen.getByText("Citizenship was rejected by the server.")).toBeInTheDocument();
    expect(screen.queryByText("Citizenship must be 80 characters or less.")).toBeNull();
  });

  it("keeps the secondary submit error ahead of local secondary blur errors", async () => {
    const user = userEvent.setup();
    render(<ValidationHarness secondary errors={{ supplementaryHolder: "The supplementary holder's birth date must be in the past." }} />);

    const firstName = screen.getByLabelText("First name (Secondary holder)") as HTMLInputElement;
    // maxLength blocks typing past 80, so set the over-length value directly,
    // then blur: the local name error is derived but the submit error wins.
    fireEvent.change(firstName, { target: { value: "A".repeat(81) } });
    fireEvent.blur(firstName);
    expect(screen.getByText("The supplementary holder's birth date must be in the past.")).toBeInTheDocument();
    expect(screen.queryByText("First name must be 80 characters or fewer.")).toBeNull();

    // A local format error on another secondary field still appears beside it.
    const mobile = screen.getByLabelText("Mobile number (Secondary holder)") as HTMLInputElement;
    await user.type(mobile, "0917");
    fireEvent.blur(mobile);
    expect(screen.getByText("Mobile number required.")).toBeInTheDocument();
  });
});

describe("secondary holder submit payload", () => {
  it("sends no supplementary holder when the toggle is off, even with stale names", () => {
    const draft = { ...toDraft(), secEnabled: false, secFirstName: "Ana", secLastName: "Santos" };
    expect(toInput(draft).supplementaryHolder).toBeNull();
  });

  it("keeps the full secondary profile when the toggle is on with names", () => {
    const draft = { ...toDraft(), vipPlan: "G1", secEnabled: true, secFirstName: "Ana", secLastName: "Santos" };
    const holder = toInput(draft).supplementaryHolder;
    expect(holder?.firstName).toBe("Ana");
    expect(holder?.lastName).toBe("Santos");
  });

  it("reports the secondary name rule exactly as Review renders it", () => {
    const started = { ...toDraft(), vipPlan: "G1", secEnabled: true, secFirstName: "Ana", secLastName: "" };
    const errors = validateCustomerForSubmit(toInput(started), [], undefined, true);
    expect(errors.supplementaryHolder).toBe("Enter the supplementary holder's first and last name.");
  });

  it("reports the exact landline and TIN messages rendered at Review", () => {
    const errors = validateCustomerForSubmit(
      { displayName: "Maria Reyes", firstName: "Maria", lastName: "Reyes", landline: "123", tinNumber: "12345" },
      [],
      undefined,
      false,
    );
    expect(errors.landline).toBe("Landline must be 7 to 10 digits.");
    expect(errors.tinNumber).toBe("TIN must be 9 or 12 digits.");
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
    expect(within(tiles).getByText("Snapshot")).toBeInTheDocument();
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

describe("customer edit reuses the application wizard", () => {
  it("renders the wizard for an existing draft instead of the old single-page form", async () => {
    show("dev-sm-a", <CustomerFormPage customerId="cust-a2" />);
    expect(await screen.findByRole("heading", { name: "Choose a VIP card" })).toBeInTheDocument();
    expect(await screen.findByRole("radiogroup", { name: "VIP card" })).toBeInTheDocument();
    // The old single-page CustomerForm opened with this SectionBlock heading.
    expect(screen.queryByRole("heading", { name: "VIP card and payment plan" })).toBeNull();
  });

  it("pre-fills the saved VIP card on edit", async () => {
    show("dev-admin", <CustomerFormPage customerId="cust-a1" />);
    const silver = await screen.findByRole("radio", { name: /silver vip/i });
    expect(silver).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /bronze vip/i })).toHaveAttribute("aria-checked", "false");
  });

  it("updates the existing draft on save instead of creating a duplicate", { timeout: 30_000 }, async () => {
    const user = userEvent.setup();
    show(
      "dev-sm-a",
      <>
        <CustomerRecordProbe id="cust-a2" />
        <CustomerFormPage customerId="cust-a2" />
      </>,
    );
    await screen.findByRole("heading", { name: "Choose a VIP card" });
    const probe = () => screen.getByTestId("customer-record-probe");
    await waitFor(() => expect(probe().getAttribute("data-count")).not.toBe("0"));
    const initialCount = probe().getAttribute("data-count");
    expect(initialCount).not.toBeNull();
    expect(probe()).toHaveAttribute("data-first-name", "");

    await user.click(await screen.findByRole("radio", { name: /silver vip/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    const schemes = await screen.findByRole("radiogroup", { name: "Payment scheme" });
    await user.click(
      within(schemes).getAllByRole("radio").find((item) => item.getAttribute("aria-disabled") !== "true" && !item.hasAttribute("data-disabled"))!,
    );
    await user.click(screen.getByRole("radio", { name: /standard \(s\)/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("heading", { name: "Personal details" });

    await user.type(screen.getByLabelText(/first name/i), "Maria");
    await user.type(screen.getByLabelText(/last name/i), "Santos");
    await user.click(screen.getByRole("button", { name: /save as draft/i }));

    expect(await screen.findByText("Draft saved.")).toBeInTheDocument();
    // The same seed draft is updated: the list size stays the same and cust-a2 carries the new name.
    await waitFor(() => expect(probe()).toHaveAttribute("data-first-name", "Maria"));
    expect(probe()).toHaveAttribute("data-last-name", "Santos");
    expect(probe()).toHaveAttribute("data-count", initialCount ?? "");
  });

  it("uses the audited correction path for a submitted customer", { timeout: 30_000 }, async () => {
    const user = userEvent.setup();
    show("dev-admin", <CustomerFormPage customerId="cust-a1" />);
    expect(await screen.findByRole("radio", { name: /silver vip/i })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("radiogroup", { name: "Payment scheme" });
    // A submitted customer is never saved as a draft.
    expect(screen.queryByRole("button", { name: /save as draft/i })).toBeNull();

    for (let step = 0; step < 4; step += 1) {
      await user.click(screen.getByRole("button", { name: /continue/i }));
    }
    expect(await screen.findByRole("heading", { name: "Review the application" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save correction" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit application/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /save as draft/i })).toBeNull();
  });
});
