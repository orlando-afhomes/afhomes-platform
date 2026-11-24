import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider, useMockStore } from "@/shared/providers/mock-store-provider";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { buildPayoutList, releaseSaleCommissions } from "@/data/mock/commission-effects";
import { MockCommissionRepository } from "@/data/mock/commission-repository";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { createMockStore, type MockStore } from "@/data/mock/seed";
import { COMMISSION_ROLE_LABELS, type CommissionPayoutList } from "@/modules/commissions/types";
import { CommissionsAreaPage } from "./commissions-area-page";

const navigation = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/commissions",
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

function Wrapper({ children, identityId, store }: { children: React.ReactNode; identityId: string; store?: MockStore }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider store={store}>
        <DevIdentityProvider initialIdentityId={identityId}>{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  navigation.search = "";
  window.history.replaceState(null, "", "/");
});

// Names and months come from the seed, which is dated relative to today.
const seed = createMockStore();
const CUSTOMER_A1 = seed.customers.find((item) => item.id === "cust-a1")!.displayName;
const LATEST_CLOSED = seed.closedMonths.map(({ month }) => month).sort().at(-1)!;
/** The first open month after the seed's closed months: it has business data and no saved allowance reviews. */
const OPEN_MONTH = (() => {
  const [year, month] = LATEST_CLOSED.split("-").map(Number);
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
})();

/** Waits until the seller's VIP closing-seller rate row shows the rate (the directory lists every seller, so search first). */
async function expectClosingSellerRate(name: string, rate: string) {
  fireEvent.change(await screen.findByRole("searchbox", { name: "Search sellers" }), { target: { value: name } });
  await waitFor(() => {
    const row = screen.getAllByRole("row", { name: `Open rate for ${name}` })
      .find((item) => within(item).queryByText(COMMISSION_ROLE_LABELS.DSC) && within(item).queryByText("VIP"));
    expect(row).toBeDefined();
    expect(within(row!).getByText(rate)).toBeInTheDocument();
  });
}

function show(page: ReactElement, tab: string, identityId = "dev-admin", store?: MockStore) {
  navigation.search = `tab=${tab}`;
  return render(<Wrapper identityId={identityId} store={store}>{page}</Wrapper>);
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
    await user.click(within(drawer).getByRole("button", { name: "More actions" }));
    expect(await screen.findByRole("menuitem", { name: "Adjust" })).toBeInTheDocument();
    expect(await screen.findByRole("menuitem", { name: "Cancel Commission" })).toHaveAttribute("data-variant", "destructive");
    await user.keyboard("{Escape}");
    expect(screen.queryByText("View full details")).toBeNull();
  });
});

describe("Month-end payout bar", () => {
  let store: MockStore | undefined;
  let list: CommissionPayoutList | null = null;
  let monthName = "";
  /**
   * Releases two commissions in the first open month after the seed's closed months and closes
   * that month, as month close would (the seed's dates are relative to today).
   */
  function ClosedMonth() {
    const current = useMockStore();
    useState(() => {
      store = current;
      const latest = current.closedMonths.map(({ month }) => month).sort().at(-1)!;
      const [year, month] = latest.split("-").map(Number);
      const target = new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 7);
      const closedAt = new Date(Date.UTC(year, month + 1, 1)).toISOString().slice(0, 10);
      monthName = new Date(Date.UTC(year, month, 1)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
      releaseSaleCommissions(current, getDevIdentity("dev-finance"), {
        saleId: "sale-2", contractId: "ctr-2", product: "VIP", valueCentavos: 1_000_000, stage1Date: `${target}-25`, fullPaymentDate: null,
        rates: [{ memberId: "mem-ost-a1", role: "DSC", rateBp: 500 }, { memberId: "mem-svd-b", role: "DRI", rateBp: 100 }],
      });
      current.closedMonths.push({ month: target, closedAt, closedBy: "dev-admin", recognizedSalesCentavos: 0, grossCollectionsCentavos: 0,
        adjustedCollectionsCentavos: 0, releasedCommissionCentavos: 60_000, paidCommissionCentavos: 0, calculationPolicy: "approved-receipt-date-v1",
        allowanceReviewCentavos: null, allowanceReviewCount: 0 });
      list = buildPayoutList(current, target, "system");
    });
    return null;
  }

  it("approves the list, records every ready payout with one form, then confirms them all", async () => {
    const user = userEvent.setup();
    show(<><ClosedMonth /><CommissionsAreaPage /><AppToaster /></>, "commissions");
    const bar = await screen.findByRole("region", { name: "Month-end payout" });
    // The list holds the two new releases plus any the seed released in that month.
    const fresh = store!.commissions.filter((item) => item.saleId === "sale-2" && item.releaseDate?.endsWith("-25") && item.status === "released");
    expect(fresh).toHaveLength(2);
    expect(list!.entries.map(({ commissionId }) => commissionId)).toEqual(expect.arrayContaining(fresh.map(({ id }) => id)));
    expect(await within(bar).findByText(new RegExp(`List for ${monthName}: ${list!.entries.length} commissions`))).toBeInTheDocument();
    await user.click(within(bar).getByRole("button", { name: "Approve List" }));
    await user.click(within(await screen.findByRole("alertdialog", { name: "Approve Payout List?" })).getByRole("button", { name: "Approve List" }));

    // The seed also holds payouts recorded earlier and still waiting for confirmation.
    const awaiting = store!.commissions.filter((item) => item.status === "approved" && item.payout && !item.payout.confirmedAt).length;
    const recordAll = await screen.findByRole("button", { name: /^Record Payouts \(\d+\)$/ });
    const count = Number(/\((\d+)\)/.exec(recordAll.textContent ?? "")![1]);
    expect(count).toBeGreaterThanOrEqual(2);
    await user.click(recordAll);
    const form = within(await screen.findByRole("dialog", { name: `Record Payout for ${count} commissions` }));
    expect(form.getByText(/To leave a commission out/)).toBeInTheDocument();
    await user.type(form.getByLabelText(/^Payment reference/), "BATCH-SEP");
    await user.click(form.getByLabelText(/^Payment method/));
    await user.click(await screen.findByRole("option", { name: "Bank Transfer" }));
    await user.upload(form.getByLabelText(/^Payment proof/), new File(["proof"], "batch.pdf", { type: "application/pdf" }));
    // jsdom keeps a required file input invalid after upload, so submit the form directly.
    fireEvent.submit(form.getByRole("button", { name: "Record Payout" }).closest("form")!);
    expect(await screen.findByText(`${count} recorded`)).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: `Confirm Payouts (${count + awaiting})` }));
    await user.click(within(await screen.findByRole("alertdialog", { name: "Confirm Payouts?" })).getByRole("button", { name: "Confirm All" }));
    expect(await screen.findByText(`${count + awaiting} confirmed. They are now Paid.`)).toBeInTheDocument();
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
    // The seed already approved a rate for Ana Mendoza, so the form opens with it; wait for it before replacing it.
    const seeded = createMockStore().commissionRateSettings.find((item) => item.memberId === "mem-ost-a1" && item.product === "VIP" && item.role === "DSC")!;
    await waitFor(() => expect(form.getByLabelText("Approved rate (%)")).toHaveValue(String(seeded.rateBp / 100)));
    fireEvent.change(form.getByLabelText("Approved rate (%)"), { target: { value: "15" } });
    fireEvent.change(form.getByLabelText("Standard rate (%)"), { target: { value: "0" } });
    await user.click(form.getByRole("button", { name: "Save Rate" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Set Approved Commission Rate" })).toBeNull());
    await expectClosingSellerRate("Ana Mendoza", "15%");
  });

  it("fills the approved VIP rate from the seller's position after the Admin confirms the terms", async () => {
    const user = userEvent.setup();
    const store = createMockStore();
    // The seed approves rates for every active seller; this flow starts from a seller with no VIP rate yet.
    store.commissionRateSettings = store.commissionRateSettings.filter((item) => !(item.memberId === "mem-ost-a1" && item.product === "VIP"));
    show(<CommissionsAreaPage />, "rates", "dev-admin", store);
    await user.click(await screen.findByRole("button", { name: "Set Standard" }));
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
    await user.click(await screen.findByRole("option", { name: CUSTOMER_A1 }));
    expect(form.getByRole("combobox", { name: /^Seller/ })).toHaveValue("Ana Mendoza");
    expect(form.getByText(/Demo approval 01/)).toBeInTheDocument();
    expect(form.queryByLabelText("Approved rate (%)")).not.toBeInTheDocument();
    await user.type(form.getByLabelText(/^Seller's service terms reference/), "Demo seller terms 01");
    await user.click(form.getByRole("button", { name: "Save Rate" }));
    expect(await form.findByRole("alert")).toHaveTextContent(/confirm/);
    await user.click(form.getByRole("checkbox", { name: /I confirm/ }));
    await user.click(form.getByRole("button", { name: "Save Rate" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Set Approved Commission Rate" })).toBeNull());
    await expectClosingSellerRate("Ana Mendoza", "0%");
  });

  it("fills the closing seller from a customer and the referrer from the sale", async () => {
    const user = userEvent.setup();
    show(<CommissionsAreaPage />, "rates");
    const setRate = await screen.findByRole("button", { name: "Set Rate" });
    await user.click(setRate);
    const form = within(await screen.findByRole("dialog", { name: "Set Approved Commission Rate" }));
    await user.click(form.getByRole("combobox", { name: "Customer" }));
    await user.click(await screen.findByRole("option", { name: CUSTOMER_A1 }));
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
    await waitFor(() => expect(form.getByRole("combobox", { name: "Customer" })).toHaveValue(CUSTOMER_A1));
    await waitFor(() => expect(form.getByRole("combobox", { name: /^Seller/ })).toHaveValue("Paolo Ramos"));
    await user.click(form.getByRole("button", { name: "Cancel" }));
    expect(window.location.search).toBe("?tab=rates");
    expect(screen.queryByRole("dialog", { name: "Set Approved Commission Rate" })).toBeNull();
  });
});

describe("Allowance review form", () => {
  async function selectLeader(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole("combobox", { name: "Internal Seller (IST) leader" }));
    await user.click((await screen.findAllByRole("option"))[0]);
  }

  it("prefills a draft after selecting the month and leader and previews only after confirmation", async () => {
    const user = userEvent.setup();
    show(<CommissionsAreaPage />, "allowances");
    fireEvent.change(await screen.findByLabelText(/^Month/), { target: { value: OPEN_MONTH } });
    await selectLeader(user);

    const days = await screen.findAllByLabelText("Eligible days");
    expect(days[0]).not.toHaveValue("");
    expect(days[1]).toHaveValue("");
    expect(screen.queryByText(/Company Spreadsheet Figures/)).toBeNull();
    expect(screen.queryByRole("region", { name: "Calculated allowances" })).toBeNull();

    const confirm = screen.getByRole("switch", { name: "The figures for both periods are correct" });
    await user.click(confirm);
    expect(screen.getByRole("region", { name: "Calculated allowances" })).toBeInTheDocument();
    fireEvent.change(screen.getAllByLabelText("Collections")[0], { target: { value: "100" } });
    expect(confirm).not.toBeChecked();
    expect(screen.queryByRole("region", { name: "Calculated allowances" })).toBeNull();
  });

  it("saves only on request and sends no workbook figures", async () => {
    const user = userEvent.setup();
    const save = vi.spyOn(MockCommissionRepository.prototype, "saveAllowanceReview").mockImplementationOnce(() => new Promise(() => {}));
    show(<CommissionsAreaPage />, "allowances");
    const month = await screen.findByLabelText(/^Month/);
    await selectLeader(user);
    fireEvent.change(month, { target: { value: OPEN_MONTH } });
    await user.click(await screen.findByRole("switch", { name: "The figures for both periods are correct" }));
    expect(save).not.toHaveBeenCalled();
    const button = screen.getByRole("button", { name: "Save Review" });
    await user.dblClick(button);
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][0].workbook).toBeNull();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("reopens saved figures first and leaves the closed-month lock in effect", async () => {
    const user = userEvent.setup();
    const prior = seed.allowanceReviews.find((review) => review.month === LATEST_CLOSED)!;
    expect(prior).toBeDefined();
    const assembly = vi.spyOn(MockCommissionRepository.prototype, "assembleAllowanceInputs");
    show(<CommissionsAreaPage />, "allowances");
    fireEvent.change(await screen.findByLabelText(/^Month/), { target: { value: prior.month } });
    await user.click(await screen.findByRole("combobox", { name: "Internal Seller (IST) leader" }));
    // The option starts with the leader's AA number, which is what a search by number matches.
    await user.type(screen.getByRole("combobox", { name: "Internal Seller (IST) leader" }), seed.members.find((member) => member.id === prior.memberId)!.aaNumber!);
    await user.click(await screen.findByRole("option", { name: new RegExp(`${prior.memberName} · ${prior.position}$`) }));
    expect((await screen.findAllByLabelText("Eligible days"))[0]).toHaveValue(String(prior.qualifying.days));
    expect(assembly).not.toHaveBeenCalled();
    await user.click(screen.getByRole("switch", { name: "The figures for both periods are correct" }));
    await user.click(screen.getByRole("button", { name: "Save Review" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("This month is closed");
  });

  it("retries a failed load and clears the draft when the selection changes", async () => {
    const user = userEvent.setup();
    vi.spyOn(MockCommissionRepository.prototype, "assembleAllowanceInputs").mockRejectedValueOnce(new Error("Could not load figures."));
    show(<CommissionsAreaPage />, "allowances");
    const month = await screen.findByLabelText(/^Month/);
    fireEvent.change(month, { target: { value: OPEN_MONTH } });
    await selectLeader(user);
    await user.click(await screen.findByRole("button", { name: "Try again" }));
    await user.click(await screen.findByRole("switch", { name: "The figures for both periods are correct" }));
    expect(screen.getByRole("region", { name: "Calculated allowances" })).toBeInTheDocument();
    fireEvent.change(month, { target: { value: "" } });
    expect(screen.queryByLabelText("Eligible days")).toBeNull();
    expect(screen.queryByRole("region", { name: "Calculated allowances" })).toBeNull();
  });

  it("keeps another month's delayed figures out of the current draft", async () => {
    const user = userEvent.setup();
    const lateMonth = "2098-02";
    const original = MockCommissionRepository.prototype.assembleAllowanceInputs;
    const load = vi.spyOn(MockCommissionRepository.prototype, "assembleAllowanceInputs")
      .mockImplementation(function (this: MockCommissionRepository, period, options) {
        return period === lateMonth ? new Promise(() => {}) : original.call(this, period, options);
      });
    show(<CommissionsAreaPage />, "allowances");
    const month = await screen.findByLabelText(/^Month/);
    await selectLeader(user);
    fireEvent.change(month, { target: { value: lateMonth } });
    await waitFor(() => expect(load.mock.calls[0]?.[0]).toBe(lateMonth));
    expect(screen.queryByLabelText("Eligible days")).toBeNull();
    fireEvent.change(month, { target: { value: OPEN_MONTH } });
    expect((await screen.findAllByLabelText("Eligible days"))[0]).not.toHaveValue("");
    expect(load.mock.calls.some(([period]) => period === OPEN_MONTH)).toBe(true);
  });
});
