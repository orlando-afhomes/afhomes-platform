import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import type { ProductCreateInput } from "@/data/contracts/product-repository";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { createMockRepositories } from "@/data/mock/repositories";
import { MockCustomerRepository } from "@/data/mock/customer-repository";
import { createMockStore, type MockStore } from "@/data/mock/seed";
import { pesos } from "@/shared/lib/money";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { CustomerDetailPage } from "./pages/customer-detail-page";
import { CustomerFormPage } from "./pages/customer-form-page";
import CustomersRoute from "@/app/admin/customers/page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

const pdf = vi.hoisted(() => ({ create: vi.fn(), download: vi.fn() }));
vi.mock("@/panels/admin/documents/report-pdf-output", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/panels/admin/documents/report-pdf-output")>()),
  createReportPdf: pdf.create,
  downloadReportPdf: pdf.download,
}));

function Wrapper({ identityId, store, children }: { identityId: string; store?: MockStore; children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider store={store}>
        <DevIdentityProvider initialIdentityId={identityId}>
          <AppToaster />
          {children}
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

function show(identityId: string, page: ReactElement, store?: MockStore) {
  return render(<Wrapper identityId={identityId} store={store}>{page}</Wrapper>);
}

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", { value: vi.fn(() => "blob:report-preview"), configurable: true });
  Object.defineProperty(URL, "revokeObjectURL", { value: vi.fn(), configurable: true });
  pdf.create.mockResolvedValue(new Blob(["pdf"], { type: "application/pdf" }));
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
  Swal.close();
  toast.dismiss();
  vi.restoreAllMocks();
});

/** The customers list pages its rows; narrow it to one name the way a user would. */
async function searchCustomers(name: string) {
  fireEvent.change(await screen.findByRole("searchbox", { name: "Search customers" }), { target: { value: name } });
}

// cust-a3 is submitted and its closing seller (SM) differs from the referrer (OST), so it can be approved as seeded.
const SUBMITTED = "cust-a3";

const DRAFT_PRODUCT: ProductCreateInput = {
  code: "B3", name: "Bronze Plus VIP", tierLevelId: "tier-level-bronze", priceCentavos: pesos(90000), validityYears: 7, earningCycles: 5,
  vipDiscountPercent: 10, lifetimePoints: 50000, pointsPerCycle: 10000, weekdayPointsPerCycle: 7000, weekendPointsPerCycle: 3000,
  minSpendPerCycleCentavos: pesos(1000), supplementaryHolders: 0, benefitsSummary: "Priority reservations and a welcome gift.",
};

async function seedDraftProduct(store: MockStore) {
  await createMockRepositories(store, () => getDevIdentity("dev-admin")).products.create(DRAFT_PRODUCT, "Draft for management review");
}

describe("Customers area", () => {
  it("opens Customers from an old import tab link and keeps export available", async () => {
    window.history.replaceState(null, "", "/admin/customers?tab=import");
    show("dev-admin", <CustomersRoute />);
    expect(await screen.findByRole("tab", { name: "Customers" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("tab", { name: "Import" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Download Template" })).toBeNull();
    expect(screen.getByRole("tab", { name: "Export" })).toBeInTheDocument();
  });
  it("shows the filtered export preview on the Export tab", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/admin/customers?tab=export");
    show("dev-admin", <CustomersRoute />);

    const preview = await screen.findByRole("table", { name: "Customers to Export" });
    expect(await within(preview).findByText("Noel Pascual")).toBeInTheDocument();
    expect(screen.queryByText(/matching customer/)).toBeNull();
    expect(screen.getByRole("button", { name: "Export" })).toBeEnabled();
    await user.type(screen.getByRole("searchbox", { name: "Search customers by name" }), "Noel");
    expect(within(preview).queryByText("Gina Soriano")).toBeNull();
    expect(within(preview).getByText("Noel Pascual")).toBeInTheDocument();
  });

  it("downloads the filtered customers as a PDF with the five preview columns", async () => {
    const user = userEvent.setup();
    const store = createMockStore();
    window.history.replaceState(null, "", "/admin/customers?tab=export");
    show("dev-admin", <CustomersRoute />, store);

    const preview = await screen.findByRole("table", { name: "Customers to Export" });
    await within(preview).findByText("Noel Pascual");
    await user.type(screen.getByRole("searchbox", { name: "Search customers by name" }), "Noel");
    await user.click(screen.getByRole("combobox", { name: "Format" }));
    await user.click(await screen.findByRole("option", { name: "PDF (.pdf)" }));
    await user.click(screen.getByRole("button", { name: "Export" }));

    await waitFor(() => expect(pdf.create).toHaveBeenCalledTimes(1));
    const data = pdf.create.mock.calls[0][0];
    expect(data.columns).toEqual(["Customer", "VIP Plan", "Status", "Seller", "Submitted"]);
    expect(data.rows.length).toBeGreaterThan(0);
    expect(data.rows.every((row: string[]) => row[0].includes("Noel"))).toBe(true);
    expect(pdf.download).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/^customers-\d{4}-\d{2}-\d{2}\.pdf$/));
    expect(store.auditEvents.at(-1)).toMatchObject({ action: "CUSTOMERS_EXPORTED", entityType: "customer-export", entityId: "pdf", newValue: expect.stringMatching(/^rows:\d+$/) });
  });

  it("lists customers with plain names and no View full details item", async () => {
    show("dev-admin", <CustomersRoute />);
    await searchCustomers("Noel Pascual");
    expect(await screen.findByText("Noel Pascual")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Noel Pascual/ })).toBeNull();
    expect(screen.getByRole("row", { name: "Open Noel Pascual" })).toBeInTheDocument();
    expect(screen.queryByText("View full details")).toBeNull();
  });

  it("falls back to Customers for a seller with an import bookmark", async () => {
    window.history.replaceState(null, "", "/admin/customers?tab=import-export");
    show("dev-ost-a1", <CustomersRoute />);
    expect(await screen.findByRole("table", { name: "Customers" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Import and Export" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Download Template" })).toBeNull();
  });
});

describe("customer registration review pages (doc 04 sections 5 and 10)", () => {
  it("offers Approve, Send back and Reject to the Administrator only", async () => {
    show("dev-admin", <CustomerDetailPage customerId={SUBMITTED} />);
    expect(await screen.findByRole("button", { name: /^approve$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send back/i })).toBeInTheDocument();
    // Two buttons show; Reject sits in the More actions menu.
    await userEvent.setup().click(screen.getByRole("button", { name: "More actions" }));
    expect(await screen.findByRole("menuitem", { name: /^reject$/i })).toBeInTheDocument();
    cleanup();

    show("dev-clerk", <CustomerDetailPage customerId={SUBMITTED} />);
    expect(await screen.findByRole("link", { name: /correct data/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^approve$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /send back/i })).toBeNull();
  });

  it("opens the matching tab from each Linked Records row", async () => {
    const user = userEvent.setup();
    show("dev-admin", <CustomerDetailPage customerId={SUBMITTED} />);
    expect(await screen.findByRole("button", { name: "Open Contract" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open Contract" }));
    expect(screen.getByRole("tab", { name: "Contract" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: "Overview" }));
    await user.click(screen.getByRole("button", { name: "Open Sale" }));
    expect(screen.getByRole("tab", { name: "Sales" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("tab", { name: "Overview" }));
    await user.click(screen.getByRole("button", { name: "Open VIP Membership" }));
    expect(screen.getByRole("tab", { name: "Membership" })).toHaveAttribute("aria-selected", "true");
  });

  it("shows each action once in the header, with no duplicate row menu", async () => {
    show("dev-admin", <CustomerDetailPage customerId={SUBMITTED} />);
    await screen.findByRole("button", { name: /^approve$/i });
    expect(screen.queryByRole("button", { name: /^actions for/i })).toBeNull();
    await userEvent.setup().click(screen.getByRole("button", { name: "More actions" }));
    expect(await screen.findAllByRole("menuitem", { name: /^reject$/i })).toHaveLength(1);
    expect(screen.getAllByRole("menuitem", { name: /^new vip purchase$/i })).toHaveLength(1);
  });

  it("keeps Discard draft as a red header button for a draft", async () => {
    const user = userEvent.setup();
    show("dev-clerk", <CustomerDetailPage customerId="cust-a2" />);
    await user.click(await screen.findByRole("button", { name: /discard draft/i }));
    expect(await screen.findByRole("alertdialog", { name: /discard the draft for/i })).toBeInTheDocument();
  });

  it("requires a reason to send back, then shows the sent back status", async () => {
    const user = userEvent.setup();
    show("dev-admin", <CustomerDetailPage customerId={SUBMITTED} />);
    await user.click(await screen.findByRole("button", { name: /send back/i }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Send Back" }).className).toContain("warning");
    await user.click(within(dialog).getByRole("button", { name: "Send Back" }));
    expect(await within(dialog).findByText("Reason is required.")).toBeInTheDocument();
    await user.type(within(dialog).getByRole("textbox"), "Missing ID photo");
    await user.click(within(dialog).getByRole("button", { name: "Send Back" }));
    expect(await screen.findByText("Sent back to the Clerk.")).toBeVisible();
    expect(await screen.findByText("Missing ID photo")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: /^approve$/i })).toBeNull());
  });

  it("approves after a confirmation without activating a membership", async () => {
    const user = userEvent.setup();
    show("dev-admin", <CustomerDetailPage customerId={SUBMITTED} />);
    await user.click(await screen.findByRole("button", { name: /^approve$/i }));
    const confirm = await screen.findByRole("alertdialog", { name: /approve this registration/i });
    expect(within(confirm).getByRole("button", { name: "Approve" }).className).toContain("success");
    await user.click(within(confirm).getByRole("button", { name: "Approve" }));
    expect(await screen.findByText("Registration approved.")).toBeVisible();
    expect(await screen.findByText("Approved")).toBeInTheDocument();
    expect(screen.queryByText("Active Member")).toBeNull();
  });

  it("tells the Clerk why a registration was sent back and lets them fix it", async () => {
    show("dev-clerk", <CustomerDetailPage customerId="cust-a7" />);
    expect(await screen.findByText("Residential address is missing.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /fix and resubmit/i })).toBeInTheDocument();
  });

  it("shows the seller their rejected record with the reason and no edit action", async () => {
    show("dev-ost-a2", <CustomerDetailPage customerId="cust-a8" />);
    expect(await screen.findByText("Duplicate of an existing customer record.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /edit draft|correct data|fix and resubmit/i })).toBeNull();
  });

  it("lists the review statuses and filters by them", async () => {
    const user = userEvent.setup();
    show("dev-admin", <CustomersRoute />);
    await screen.findByRole("table", { name: "Customers" });
    for (const [status, name] of [["Approved", "Noel Pascual"], ["Sent back", "Gina Soriano"], ["Rejected", "Victor Alcantara"]]) {
      await user.click(screen.getByRole("combobox", { name: "Customer status filter" }));
      await user.click(await screen.findByRole("option", { name: status }));
      await searchCustomers(name);
      expect(await screen.findByRole("row", { name: `Open ${name}` })).toBeInTheDocument();
    }
    // The Rejected filter leaves out an approved customer.
    await searchCustomers("Noel Pascual");
    expect(await screen.findByText("No customers match the current search or filter.")).toBeInTheDocument();
  });

  it("lets a seller start a draft but ends their wizard at Sales and consent with a draft-only action", async () => {
    const user = userEvent.setup();
    show("dev-ost-a1", <CustomerFormPage />);
    await user.click(await screen.findByRole("radio", { name: /silver vip/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    const progress = await screen.findByRole("list", { name: "Progress" });
    expect(within(progress).getByText(/sales and consent/i)).toBeInTheDocument();
    expect(within(progress).queryByText(/^review$/i)).toBeNull();
    expect(within(progress).queryByText(/reservation/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /submit application/i })).toBeNull();
  });

  it("keeps a draft product out of the VIP card choice", async () => {
    const store = createMockStore();
    await seedDraftProduct(store);
    show("dev-ost-a1", <CustomerFormPage />, store);
    expect(await screen.findByRole("radio", { name: /silver vip/i })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /bronze plus vip/i })).toBeNull();
  });

  it("blocks Continue when a resumed draft holds a card that was retired", async () => {
    const store = createMockStore();
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    const draft = await admin.customers.createDraft({ displayName: "Resume Buyer", vipPlan: "B1" });
    await admin.products.update("B1", { status: "retired" }, "Stop offering Bronze");
    show("dev-admin", <CustomerFormPage customerId={draft.id} />, store);
    expect(await screen.findByText("This card is no longer available. Choose another card.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled();
    expect(screen.queryByRole("radio", { checked: true })).toBeNull();
  });
});

describe("customer error states (Batch 2)", () => {
  it("shows a load error with a retry instead of Not Found on the detail page", async () => {
    const user = userEvent.setup();
    vi.spyOn(MockCustomerRepository.prototype, "list").mockRejectedValueOnce(new Error("Customer list failed."));
    show("dev-admin", <CustomerDetailPage customerId={SUBMITTED} />);
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/Customer list failed\./)).toBeInTheDocument();
    expect(screen.queryByText("Customer Not Found")).toBeNull();
    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("button", { name: /^approve$/i })).toBeInTheDocument();
  });

  it("shows a load error with a retry instead of Not Found on the edit page", async () => {
    const user = userEvent.setup();
    vi.spyOn(MockCustomerRepository.prototype, "list").mockRejectedValueOnce(new Error("Customer list failed."));
    show("dev-admin", <CustomerFormPage customerId={SUBMITTED} />);
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/Customer list failed\./)).toBeInTheDocument();
    expect(screen.queryByText("Customer Not Found")).toBeNull();
    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.queryByText("Customer Not Found")).toBeNull();
  });

  it("shows a load error with a retry instead of an empty table on the customers list", async () => {
    const user = userEvent.setup();
    vi.spyOn(MockCustomerRepository.prototype, "list").mockRejectedValueOnce(new Error("Customer list failed."));
    show("dev-admin", <CustomersRoute />);
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/Customer list failed\./)).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Customers" })).toBeNull();
    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    await searchCustomers("Noel Pascual");
    expect(await screen.findByText("Noel Pascual")).toBeInTheDocument();
  });

  it("distinguishes an empty directory from a search with no matches", async () => {
    const user = userEvent.setup();
    const empty = createMockStore();
    empty.customers = [];
    show("dev-admin", <CustomersRoute />, empty);
    expect(await screen.findByText("No customers yet.")).toBeInTheDocument();
    cleanup();

    show("dev-admin", <CustomersRoute />);
    await screen.findByRole("table", { name: "Customers" });
    await user.type(screen.getByRole("searchbox", { name: "Search customers" }), "zzzz-no-such-customer");
    expect(await screen.findByText("No customers match the current search or filter.")).toBeInTheDocument();
  });
});
