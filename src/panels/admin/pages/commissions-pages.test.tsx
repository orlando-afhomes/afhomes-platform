import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider, useMockStore } from "@/shared/providers/mock-store-provider";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { buildPayoutList, releaseSaleCommissions } from "@/data/mock/commission-effects";
import { getDevIdentity } from "@/data/mock/dev-identities";
import type { MockStore } from "@/data/mock/seed";
import { CommissionsAreaPage } from "./commissions-area-page";

const navigation = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/commissions",
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

function Wrapper({ children, identityId }: { children: React.ReactNode; identityId: string }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  navigation.search = "";
  window.history.replaceState(null, "", "/");
});

function show(page: ReactElement, tab: string, identityId = "dev-admin") {
  navigation.search = `tab=${tab}`;
  return render(<Wrapper identityId={identityId}>{page}</Wrapper>);
}

describe("Commissions tables and details", () => {
  it("opens a row into a sectioned drawer with colored actions and no 'View full details'", async () => {
    const user = userEvent.setup();
    show(<CommissionsAreaPage />, "commissions");
    await screen.findByRole("table", { name: "Commissions" });
    const rows = await screen.findAllByRole("row", { name: /^Open commission for / });
    await user.click(rows.find((row) => within(row).queryByText("Approved")) as HTMLElement);
    const drawer = await screen.findByRole("dialog");
    expect(within(drawer).getByRole("region", { name: "Commission" })).toBeInTheDocument();
    expect(within(drawer).getByRole("region", { name: "Payout" })).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Adjust" }).className).toContain("tw:text-warning");
    expect(within(drawer).getByRole("button", { name: "Cancel Commission" }).className).toContain("tw:bg-destructive");
    await user.keyboard("{Escape}");
    expect(screen.queryByText("View full details")).toBeNull();
  });
});

describe("Month-end payout bar", () => {
  let store: MockStore | undefined;
  /** Releases two September commissions and closes September, as month close would. */
  function ClosedSeptember() {
    const current = useMockStore();
    useState(() => {
      store = current;
      releaseSaleCommissions(current, getDevIdentity("dev-finance"), {
        saleId: "sale-2", contractId: "ctr-2", product: "VIP", valueCentavos: 1_000_000, stage1Date: "2026-09-25", fullPaymentDate: null,
        rates: [{ memberId: "mem-ost-a1", role: "DSC", rateBp: 500 }, { memberId: "mem-svd-b", role: "DRI", rateBp: 100 }],
      });
      current.closedMonths.push({ month: "2026-09", closedAt: "2026-10-01", closedBy: "dev-admin", recognizedSalesCentavos: 0, grossCollectionsCentavos: 0,
        adjustedCollectionsCentavos: 0, releasedCommissionCentavos: 60_000, paidCommissionCentavos: 0, calculationPolicy: "approved-receipt-date-v1",
        allowanceReviewCentavos: null, allowanceReviewCount: 0 });
      buildPayoutList(current, "2026-09", "system");
    });
    return null;
  }

  it("approves the list, records every ready payout with one form, then confirms them all", async () => {
    const user = userEvent.setup();
    show(<><ClosedSeptember /><CommissionsAreaPage /><AppToaster /></>, "commissions");
    const bar = await screen.findByRole("region", { name: "Month-end payout" });
    expect(await within(bar).findByText(/List for September 2026: 2 commissions/)).toBeInTheDocument();
    await user.click(within(bar).getByRole("button", { name: "Approve List" }));
    await user.click(within(await screen.findByRole("alertdialog", { name: "Approve Payout List?" })).getByRole("button", { name: "Approve List" }));

    const recordAll = await screen.findByRole("button", { name: /^Record Payout for All Ready \(\d+\)$/ });
    const count = Number(/\((\d+)\)/.exec(recordAll.textContent ?? "")![1]);
    expect(count).toBeGreaterThanOrEqual(2);
    await user.click(recordAll);
    const form = within(await screen.findByRole("dialog", { name: `Record Payout for ${count} commissions` }));
    expect(form.getByText(/To leave a commission out/)).toBeInTheDocument();
    await user.type(form.getByLabelText(/^Payment reference/), "BATCH-SEP");
    await user.type(form.getByLabelText(/^Payment method/), "Bank Transfer");
    await user.upload(form.getByLabelText(/^Payment proof/), new File(["proof"], "batch.pdf", { type: "application/pdf" }));
    // jsdom keeps a required file input invalid after upload, so submit the form directly.
    fireEvent.submit(form.getByRole("button", { name: "Record Payout" }).closest("form")!);
    expect(await screen.findByText(`${count} recorded`)).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: `Confirm All Paid Out (${count})` }));
    await user.click(within(await screen.findByRole("alertdialog", { name: "Confirm All Paid Out?" })).getByRole("button", { name: "Confirm All" }));
    expect(await screen.findByText(`${count} confirmed. They are now Paid.`)).toBeInTheDocument();
    expect(store!.commissions.filter((item) => item.payout?.reference === "BATCH-SEP").map(({ status }) => status)).toEqual(Array(count).fill("paid"));
    expect(screen.queryByRole("region", { name: "Month-end payout" })).toBeNull();
  });

  it("adds Ready to pay and Waiting for confirmation to the status filter for payout staff only", async () => {
    const user = userEvent.setup();
    const admin = show(<CommissionsAreaPage />, "commissions");
    await user.click(await screen.findByRole("combobox", { name: "Status filter" }));
    expect(await screen.findByRole("option", { name: "Ready to pay" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Waiting for confirmation" })).toBeInTheDocument();
    admin.unmount();
    show(<CommissionsAreaPage />, "commissions", "dev-ost-b1");
    await user.click(await screen.findByRole("combobox", { name: "Status filter" }));
    await screen.findAllByRole("option");
    expect(screen.queryByRole("option", { name: "Ready to pay" })).toBeNull();
  });
});

describe("Set Rate", () => {
  it("saves a manually approved rate when the optional reason is blank", async () => {
    const user = userEvent.setup();
    show(<CommissionsAreaPage />, "rates&sale=sale-1");
    const form = within(await screen.findByRole("dialog", { name: "Set Approved Commission Rate" }));
    expect(form.getByLabelText(/^Reason/)).toHaveValue("");
    await user.type(form.getByLabelText("Approved rate (%)"), "15");
    await user.type(form.getByLabelText("Standard rate (%)"), "0");
    await user.click(form.getByRole("button", { name: "Save Rate" }));
    const rate = await screen.findByRole("row", { name: "Open rate for Ana Mendoza" });
    expect(within(rate).getByText("15%")).toBeInTheDocument();
  });

  it("fills the approved VIP rate from the seller's position after the Admin confirms the terms", async () => {
    const user = userEvent.setup();
    show(<CommissionsAreaPage />, "rates");
    await user.click(await screen.findByRole("button", { name: "Set VIP Standard" }));
    const setup = within(await screen.findByRole("dialog", { name: "Set Approved VIP Standard" }));
    await user.click(setup.getByRole("combobox", { name: /^Seller position/ }));
    await user.click(await screen.findByRole("option", { name: "Outsourced Seller (OST)" }));
    await user.type(setup.getByLabelText(/^Approved standard/), "0");
    await user.type(setup.getByLabelText(/^Approval reference/), "Demo approval 01");
    await user.click(setup.getByRole("button", { name: "Save Standard" }));
    expect(await screen.findByText("Demo approval 01")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Set Rate" }));
    const form = within(await screen.findByRole("dialog", { name: "Set Approved Commission Rate" }));
    await user.click(form.getByRole("combobox", { name: "Customer" }));
    await user.click(await screen.findByRole("option", { name: "Customer A One" }));
    expect(form.getByRole("combobox", { name: /^Seller/ })).toHaveValue("Ana Mendoza");
    expect(form.getByText(/Demo approval 01/)).toBeInTheDocument();
    expect(form.queryByLabelText("Approved rate (%)")).not.toBeInTheDocument();
    await user.type(form.getByLabelText(/^Seller's service terms reference/), "Demo seller terms 01");
    await user.click(form.getByRole("button", { name: "Save Rate" }));
    expect(await form.findByRole("alert")).toHaveTextContent(/confirm/);
    await user.click(form.getByRole("checkbox", { name: /I confirm/ }));
    await user.click(form.getByRole("button", { name: "Save Rate" }));
    const rate = await screen.findByRole("row", { name: "Open rate for Ana Mendoza" });
    expect(within(rate).getByText("0%")).toBeInTheDocument();
  });

  it("fills the closing seller from a customer and the referrer from the sale", async () => {
    const user = userEvent.setup();
    show(<CommissionsAreaPage />, "rates");
    const setRate = await screen.findByRole("button", { name: "Set Rate" });
    await user.click(setRate);
    const form = within(await screen.findByRole("dialog", { name: "Set Approved Commission Rate" }));
    await user.click(form.getByRole("combobox", { name: "Customer" }));
    await user.click(await screen.findByRole("option", { name: "Customer A One" }));
    expect(form.getByRole("combobox", { name: /^Seller/ })).toHaveValue("Ana Mendoza");
    expect(form.getByRole("combobox", { name: /^Product/ })).toHaveValue("VIP");

    await user.click(form.getByRole("combobox", { name: /^Commission type/ }));
    await user.click(await screen.findByRole("option", { name: "Referrer" }));
    expect(form.getByRole("combobox", { name: /^Seller/ })).toHaveValue("Paolo Ramos");
  });

  it("opens the rates dialog from an authorized sale link and removes the context on close", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/admin/commissions?tab=rates&sale=sale-1&role=DRI");
    show(<CommissionsAreaPage />, "rates&sale=sale-1&role=DRI");
    const form = within(await screen.findByRole("dialog", { name: "Set Approved Commission Rate" }));
    await waitFor(() => expect(form.getByRole("combobox", { name: "Customer" })).toHaveValue("Customer A One"));
    await waitFor(() => expect(form.getByRole("combobox", { name: /^Seller/ })).toHaveValue("Paolo Ramos"));
    await user.click(form.getByRole("button", { name: "Cancel" }));
    expect(window.location.search).toBe("?tab=rates");
    expect(screen.queryByRole("dialog", { name: "Set Approved Commission Rate" })).toBeNull();
  });
});

describe("Allowance review form", () => {
  it("shows the three steps, reveals fields only when needed, and validates the month", async () => {
    const user = userEvent.setup();
    show(<CommissionsAreaPage />, "allowances");
    expect(await screen.findByRole("region", { name: "Step 1: Month and Leader" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Step 3: Company Spreadsheet Figures (Optional)" })).toBeInTheDocument();
    expect(screen.getByText("Type the amounts from the company Excel file so the system can compare them.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Month/)).toHaveAttribute("type", "month");

    expect(screen.queryByLabelText("Explanation of any difference")).toBeNull();
    expect(screen.queryByLabelText(/Reason for withholding/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Performance bonus"), { target: { value: "10" } });
    expect(await screen.findByLabelText("Explanation of any difference")).toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Withhold basic allowance this month" }));
    expect(await screen.findByLabelText(/Reason for withholding/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Calculate Allowances" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose the month.");
    expect(screen.getByRole("button", { name: "Calculate Allowances" }).className).toContain("tw:text-info");
  });
});
