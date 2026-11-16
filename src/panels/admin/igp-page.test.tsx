import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { createMockRepositories } from "@/data/mock/repositories";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider, useMockStore } from "@/shared/providers/mock-store-provider";
import { SalesAreaPage } from "./pages/sales-area-page";
import { VipProductsAreaPage } from "./pages/vip-products-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

/** Records one accredited IGP sale with its reservation receipt before the page loads. */
const storeRef: { current: ReturnType<typeof useMockStore> | null } = { current: null };

function SeededIgp({ children }: { children: ReactNode }) {
  const store = useMockStore();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    storeRef.current = store;
    const admin = createMockRepositories(store, () => getDevIdentity("dev-admin"));
    store.commissionRateSettings.push({ memberId: "mem-ost-a1", product: "IGP", role: "DSC", rateBp: 500, standardRateBp: null });
    void (async () => {
      await admin.igp.act({ type: "accredit", memberId: "mem-ost-a1", number: "JAI23010001", approvedDate: "2023-01-01" });
      await admin.igp.act({
        type: "record",
        input: {
          customerId: "cust-a6", projectId: "igp-prj-1", unitId: "igp-unit-1",
          priceCentavos: 180_000_000, scheme: "T", termMonths: 12, clauses: "S", date: "2025-01-10",
          sellerMemberId: "mem-ost-a1", referrerMemberId: null, entry: "reservation",
          payment: { paidDate: "2025-01-10", method: "Cash", amountCentavos: 18_000_000, referenceNo: "IGP-0101" },
        },
      });
      setReady(true);
    })();
  }, [store]);
  return ready ? children : null;
}

function show(identityId = "dev-admin", page: ReactNode = <SalesAreaPage />) {
  function Wrapper() {
    const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
    return (
      <QueryClientProvider client={queryClient}>
        <MockStoreProvider>
          <DevIdentityProvider initialIdentityId={identityId}>
            <SeededIgp>{page}</SeededIgp>
          </DevIdentityProvider>
        </MockStoreProvider>
      </QueryClientProvider>
    );
  }
  return render(<Wrapper />);
}

describe("Sales area", () => {
  it("offers an Administrator all sales tabs and opens contract actions from the URL", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/admin/sales?tab=contracts");
    show("dev-admin", <SalesAreaPage />);
    const tabs = await screen.findByRole("tablist", { name: "Sales" });
    expect(within(tabs).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Sales", "Contracts", "IGP", "Scheme guide"]);
    expect(within(tabs).getByRole("tab", { name: "Contracts" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("link", { name: "New contract" })).toHaveAttribute("href", "/admin/customers?tab=customers");
    const table = await screen.findByRole("table", { name: "Contracts" });
    // The row opens the contract: names are plain text and the row menu has no "View full details".
    expect(within(table).queryByRole("link")).toBeNull();
    await user.click(within(table).getAllByRole("button", { name: /^Actions for/ })[0]);
    expect(screen.queryByRole("menuitem", { name: "View full details" })).toBeNull();
  });

  it("lets sellers open Contracts with their existing access", async () => {
    window.history.replaceState(null, "", "/admin/sales?tab=contracts");
    show("dev-ost-a1", <SalesAreaPage />);
    const tabs = await screen.findByRole("tablist", { name: "Sales" });
    expect(within(tabs).queryByRole("tab", { name: "Contract review" })).toBeNull();
    expect(within(tabs).getByRole("tab", { name: "Contracts" })).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("link", { name: "New contract" })).toBeNull();
  });

  it("opens IGP for Finance even when the URL points at a restricted tab", async () => {
    window.history.replaceState(null, "", "/admin/sales?tab=contracts");
    show("dev-finance", <SalesAreaPage />);
    expect(await screen.findByRole("table", { name: "IGP Sales" })).toBeInTheDocument();
    expect(within(screen.getByRole("tablist", { name: "Sales" })).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["IGP"]);
    expect(screen.queryByRole("button", { name: "Record sale" })).toBeNull();
  });
});

describe("IGP Sales page", () => {
  it("shows the register in 5 columns and opens the sale with its actions in a details panel", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/admin/sales?tab=igp");
    show();
    const table = await screen.findByRole("table", { name: "IGP Sales" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent?.trim()).filter((text) => text && text !== "Actions");
    expect(headers).toEqual(["Series Number", "Buyer", "Project", "Contract price", "Status"]);
    expect(screen.getByRole("button", { name: "JA&D history" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sale counting rule" })).toBeInTheDocument();
    expect(within(table).queryByRole("button", { name: /^Actions for/ })).toBeNull();
    await user.click(within(table).getAllByRole("row", { name: /^Open IGP sale/ })[0]);
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("Approved collections")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "IGP-0101" })).toBeInTheDocument();
    expect(within(sheet).getByRole("heading", { name: "JA&D accreditation history" })).toBeInTheDocument();
    // Receipt status is a plain word, never a raw code such as "under_review".
    expect(within(sheet).queryByText(/_/)).toBeNull();
    expect(within(sheet).getByRole("button", { name: "Approve sale" })).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Cancel sale" })).toBeInTheDocument();
  });
});

describe("IGP sale form and JA&D entry", () => {
  it("picks the project, then the unit, and fills in the property owner", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/admin/sales?tab=igp");
    show();
    await user.click(await screen.findByRole("button", { name: "Record sale" }));
    const dialog = await screen.findByRole("dialog");
    const unit = within(dialog).getByRole("combobox", { name: /Unit or lot/ });
    expect(unit).toBeDisabled();
    expect(within(dialog).getByRole("textbox", { name: "Property owner" })).toBeDisabled();
    const project = within(dialog).getByRole("combobox", { name: /Project/ });
    await user.click(project);
    await user.click(await screen.findByRole("option", { name: "Sample Gardens" }));
    expect(unit).toBeEnabled();
    await user.click(unit);
    await user.click(await screen.findByRole("option", { name: "Lot 9" }));
    expect(within(dialog).getByRole("textbox", { name: "Property owner" })).toHaveValue("Sample Land Holdings");
  });

  it("builds the JA&D number from the type, the approval date and the typed digits", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/admin/sales?tab=igp");
    show();
    await user.click(await screen.findByRole("button", { name: "Record JA&D accreditation" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("combobox", { name: /Seller/ }));
    await user.click(await screen.findByRole("option", { name: "Paolo Ramos" }));
    // Paolo Ramos is an OST seller, so the type starts as JAO.
    expect(within(dialog).getByRole("combobox", { name: /Accreditation type/ })).toHaveValue("OST accreditation (JAO)");
    const digits = within(dialog).getByRole("textbox", { name: /Last 4 digits/ });
    await user.type(digits, "12ab345");
    expect(digits).toHaveValue("1234");
    expect(within(dialog).getByText(/^Number: JAO\d{4}1234$/)).toBeInTheDocument();
  });
});

describe("IGP Projects tab (Settings)", () => {
  it("lists the projects, opens one with its units and adds a project from the heading button", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/admin/vip-products?tab=igp-projects");
    show("dev-admin", <VipProductsAreaPage />);
    const table = await screen.findByRole("table", { name: "Projects" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent?.trim()).filter(Boolean);
    expect(headers).toEqual(["Project", "Location", "Units", "Status"]);
    expect(within(table).queryByRole("link")).toBeNull();
    await user.click(within(table).getByRole("row", { name: "Open project Sample Heights" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("Unit 12A")).toBeInTheDocument();
    expect(within(sheet).getAllByText("Sample Property Owner", { selector: "span" })).toHaveLength(2);
    for (const name of ["Add unit", "Edit project", "Deactivate project"]) expect(within(sheet).getByRole("button", { name })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Add project" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByRole("textbox", { name: /Project name/ }), "sample gardens");
    await user.click(within(dialog).getByRole("button", { name: "Add project" }));
    expect(await within(dialog).findByText("A project with this name already exists.")).toBeInTheDocument();
    await user.clear(within(dialog).getByRole("textbox", { name: /Project name/ }));
    await user.type(within(dialog).getByRole("textbox", { name: /Project name/ }), "Sample Bay");
    await user.click(within(dialog).getByRole("button", { name: "Add project" }));
    expect(await screen.findByRole("row", { name: "Open project Sample Bay" })).toBeInTheDocument();
  });

  it("keeps an inactive unit visible, labelled, when a sale that holds it is reissued", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/admin/sales?tab=igp");
    show();
    const table = await screen.findByRole("table", { name: "IGP Sales" });
    const admin = createMockRepositories(storeRef.current!, () => getDevIdentity("dev-admin"));
    await admin.igpCatalog.updateUnit("igp-unit-1", { status: "inactive" });
    await user.click(within(table).getAllByRole("row", { name: /^Open IGP sale/ })[0]);
    await user.click(await within(await screen.findByRole("dialog")).findByRole("button", { name: "Reissue number" }));
    const dialogs = await screen.findAllByRole("dialog");
    const form = dialogs[dialogs.length - 1];
    expect(within(form).getByRole("combobox", { name: /Unit or lot/ })).toHaveValue("Unit 12A (inactive)");
  });
});
