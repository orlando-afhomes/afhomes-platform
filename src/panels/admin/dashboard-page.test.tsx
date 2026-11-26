import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useContractAction, usePaymentAction } from "@/data/business-queries";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { createMockRepositories } from "@/data/mock/repositories";
import { createMockStore, type MockStore } from "@/data/mock/seed";
import { collectionStateFor, paymentCountedDate } from "@/modules/finance/rules";
import { igpSalesReportRows } from "@/modules/igp/rules";
import { compareKpi, formatChange } from "@/modules/reports/kpi-comparison";
import { formatShare } from "@/shared/components/dashboard/dashboard-chart-model";
import { manilaDateOf } from "@/shared/lib/dates";
import { formatPeso } from "@/shared/lib/money";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { AdminDashboardPage } from "./pages/admin-dashboard-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin",
}));

function Wrapper({ identityId, store, children }: { identityId: string; store: MockStore; children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider store={store}>
        <DevIdentityProvider initialIdentityId={identityId}>{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

function show(identityId: string, extra?: ReactNode) {
  const store = createMockStore();
  render(
    <Wrapper identityId={identityId} store={store}>
      <AdminDashboardPage />
      {extra}
    </Wrapper>,
  );
  return store;
}

// "Past 28 Days" at the fixed date below, and the preceding period of equal length.
const PERIOD = { from: "2026-10-13", to: "2026-11-10" };
const PREVIOUS = { from: "2026-09-14", to: "2026-10-12" };

type Adjusted = { adjustments: readonly { date: string; amountCentavos: number }[] };
const confirmedIn = (sales: readonly Adjusted[], range: { from: string; to: string }) =>
  sales.flatMap((sale) => sale.adjustments).filter((item) => item.date >= range.from && item.date <= range.to).reduce((sum, item) => sum + item.amountCentavos, 0);
/** The KPI badge expected for a period comparison (doc 11 section 32). */
function trendBadge(current: number, previous: number) {
  const result = compareKpi(current, previous);
  return result.kind === "new" ? "New" : result.kind === "change" ? formatChange(result.percentTenths) : null;
}

/**
 * The records each identity may read, loaded through the same repositories the
 * page uses, so every expected figure below comes from the scoped seed records
 * (the seed is built relative to the fixed date).
 */
async function scopedRecords(store: MockStore, identityId: string) {
  const repositories = createMockRepositories(store, () => getDevIdentity(identityId)!);
  const [customers, members, contracts, sales, payments, memberships, igp, commissions] = await Promise.all([
    repositories.customers.list().catch(() => []), repositories.members.list().catch(() => []), repositories.contracts.list().catch(() => []),
    repositories.sales.list().catch(() => []), repositories.payments.list().catch(() => []), repositories.memberships.list().catch(() => []),
    repositories.igp.list().then((register) => register.sales).catch(() => []), repositories.commissions.list().catch(() => []),
  ]);
  return { customers, members, contracts, sales, payments, memberships, igpRows: igpSalesReportRows(igp), commissions };
}

type Scoped = Awaited<ReturnType<typeof scopedRecords>>;
const collectedIn = (payments: Scoped["payments"], range: { from: string; to: string }) =>
  payments.filter((payment) => {
    const counted = paymentCountedDate(payment);
    const date = counted ? manilaDateOf(counted) : null;
    return date !== null && date >= range.from && date <= range.to;
  }).reduce((sum, payment) => sum + payment.amountCentavos, 0);
const awaitingReview = (contracts: readonly { status: string }[]) => contracts.filter((item) => item.status === "submitted" || item.status === "under_review").length;
const awaitingVerification = (payments: readonly { status: string }[]) => payments.filter((item) => item.status === "submitted" || item.status === "under_review").length;

/** The KPI value next to a label (the first `dd` of that card). */
async function kpi(label: string) {
  const term = await screen.findByText(label, { selector: "dt" });
  return term.nextElementSibling?.textContent ?? "";
}

beforeEach(() => {
  // Fixed Asia/Manila business date (2026-11-10, noon) so "Past 28 Days" is stable.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-10T04:00:00Z"));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Admin dashboard with loaded records", () => {
  it("derives every Super Admin figure from the scoped records", async () => {
    const store = show("dev-super-admin");
    const scoped = await scopedRecords(store, "dev-super-admin");
    const reporting = [...scoped.sales, ...scoped.igpRows];
    const confirmed = confirmedIn(reporting, PERIOD);
    const collected = collectedIn(scoped.payments, PERIOD);
    const reviews = awaitingReview(scoped.contracts);
    expect(confirmed).toBeGreaterThan(0);

    await waitFor(async () => expect(await kpi("Confirmed sales value")).toBe(formatPeso(confirmed)));
    expect(await kpi("Customers")).toBe(scoped.customers.length.toLocaleString());
    expect(await kpi("Sales network members")).toBe(scoped.members.length.toLocaleString());
    expect(await kpi("Contracts requiring review")).toBe(String(reviews));

    // Confirmed sales value is a period KPI, compared with Sep 14 - Oct 12.
    const salesCard = (await screen.findByText("Confirmed sales value", { selector: "dt" })).closest("dl") as HTMLElement;
    expect(within(salesCard).getByText(trendBadge(confirmed, confirmedIn(reporting, PREVIOUS))!)).toBeInTheDocument();
    expect(within(salesCard).getByText(/compared with Sep 14, 2026 to Oct 12, 2026/)).toBeInTheDocument();
    // Snapshot KPIs never show a percentage.
    for (const label of ["Customers", "Sales network members", "Contracts requiring review"]) {
      const card = screen.getByText(label, { selector: "dt" }).closest("dl") as HTMLElement;
      expect(within(card).getByText("Current")).toBeInTheDocument();
      expect(card.textContent).not.toMatch(/%|previous period/);
    }

    const chart = screen.getByRole("region", { name: "Sales Performance" });
    await waitFor(() =>
      expect(chart.querySelector("figcaption")?.textContent).toContain(
        `Sales ${formatPeso(confirmed)}; Collections ${formatPeso(collected)} from Oct 13, 2026 to Nov 10, 2026 (Asia/Manila).`,
      ),
    );
    expect(within(chart).getByRole("radio", { name: "Sales" })).toHaveAttribute("aria-checked", "true");
    expect(within(chart).getByRole("radio", { name: "Collections" })).toHaveAttribute("aria-checked", "false");

    const distribution = screen.getByRole("region", { name: "Contracts by VIP Product" });
    expect(distribution).toHaveAccessibleDescription("");
    // Cancelled contracts are excluded from the mix.
    const counted = scoped.contracts.filter((item) => item.status !== "cancelled");
    const tiers = (["G1", "S1", "B1"] as const).map((code) => counted.filter((item) => item.productCode === code).length);
    const [gold, silver, bronze] = tiers;
    const noun = (count: number) => (count === 1 ? "contract" : "contracts");
    expect(gold + silver + bronze).toBe(counted.length);
    expect(
      await within(distribution).findByRole("img", {
        name: `Contracts by VIP Product: ${counted.length} contracts. VIP Gold: ${gold} ${noun(gold)}, ${formatShare(gold, counted.length)}. VIP Silver: ${silver} ${noun(silver)}, ${formatShare(silver, counted.length)}. VIP Bronze: ${bronze} ${noun(bronze)}, ${formatShare(bronze, counted.length)}.`,
      }),
    ).toBeInTheDocument();
    // Each tier is drawn in its own metal color.
    const strokes = [...distribution.querySelectorAll("circle[pathLength]")].map((circle) => circle.getAttribute("stroke"));
    expect(strokes).toEqual(["var(--color-tier-gold)", "var(--color-tier-silver)", "var(--color-tier-bronze)"]);
    for (const count of tiers) expect(within(distribution).getAllByText(formatShare(count, counted.length)).length).toBeGreaterThan(0);

    expect(await screen.findByRole("link", { name: `Contract Review: ${reviews} pending` })).toHaveAttribute("href", "/admin/sales?tab=contracts&status=needs-review");
    expect(await screen.findByRole("link", { name: `Payment Verification: ${awaitingVerification(scoped.payments)} pending` })).toHaveAttribute("href", "/admin/finance?tab=verification");
    const activations = scoped.memberships.filter((item) => item.status === "pending").length;
    expect(screen.getByRole("link", { name: `Membership Activation: ${activations} pending` })).toHaveAttribute("href", "/admin/membership?tab=activation");
    expect(screen.queryByText(/Account Approvals/)).toBeNull();
    // The three newest events of the visible records, with readable labels (the seed's newest are Finance verifications).
    expect((await screen.findAllByText("Payment verified")).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "View All" })).toHaveAttribute("href", "/admin/audit-logs");
  });

  it("shows collections to the Administrator with the receipts queue (owner decision 2026-11-26)", async () => {
    const store = show("dev-admin");
    const scoped = await scopedRecords(store, "dev-admin");
    const confirmed = confirmedIn([...scoped.sales, ...scoped.igpRows], PERIOD);

    await waitFor(async () => expect(await kpi("Confirmed sales value")).toBe(formatPeso(confirmed)));
    const chart = screen.getByRole("region", { name: "Sales Performance" });
    // With finance.reports.view the chart gains the Collections series and its toggle.
    await waitFor(() => expect(chart.textContent).toContain("Collections"));
    expect(within(chart).getByRole("radiogroup")).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /^Payment Verification/ })).toHaveAttribute("href", "/admin/finance?tab=verification");
  });

  it("refreshes the review queue after a contract transition", async () => {
    function ReturnContract() {
      const action = useContractAction();
      return (
        <button type="button" onClick={() => action.mutate({ id: "ctr-4", action: "return", reason: "Missing signature page." })}>
          Return contract
        </button>
      );
    }
    const store = show("dev-admin", <ReturnContract />);
    const reviews = awaitingReview((await scopedRecords(store, "dev-admin")).contracts);
    expect(store.contracts.find((item) => item.id === "ctr-4")?.status).toBe("under_review");

    expect(await screen.findByRole("link", { name: `Contract Review: ${reviews} pending` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Return contract" }));
    expect(await screen.findByRole("link", { name: `Contract Review: ${reviews - 1} pending` })).toBeInTheDocument();
    await waitFor(async () => expect(await kpi("Contracts requiring review")).toBe(String(reviews - 1)));
  });
});

describe("Clerk dashboard", () => {
  it("shows a to-do list that links to the pages where the work is done", async () => {
    show("dev-clerk");

    expect(await screen.findByRole("heading", { name: "My To-Do List" })).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /^Returned receipts to correct: \d+ pending$/ })).toHaveAttribute("href", "/admin/sales?tab=contracts");
    expect(screen.getByRole("link", { name: /^Contracts to finish or fix: \d+ pending$/ })).toHaveAttribute("href", "/admin/sales?tab=contracts");
    expect(screen.getByRole("link", { name: /^Customers to finish or fix: \d+ pending$/ })).toHaveAttribute("href", "/admin/customers");
    expect(screen.queryByText("No Dashboard Metrics")).toBeNull();
  });
});

describe("Finance dashboard with loaded records", () => {
  it("shows collections, receivables, commissions and the gated Finance queues", async () => {
    const store = show("dev-finance");
    const scoped = await scopedRecords(store, "dev-finance");
    const collected = collectedIn(scoped.payments, PERIOD);
    const previous = collectedIn(scoped.payments, PREVIOUS);
    // Receivables of finalized contracts (doc 07 sections 3 and 13).
    const states = scoped.contracts.filter((item) => item.status === "finalized")
      .map((contract) => collectionStateFor(contract, scoped.payments.filter((payment) => payment.contractId === contract.id), PERIOD.to));
    const outstanding = states.reduce((sum, item) => sum + item.balance, 0);
    const overdue = states.reduce((sum, item) => sum + item.overdue, 0);
    const approved = scoped.commissions.filter((item) => item.status === "approved");
    // Approved is not Paid (doc 08 section 12): ready to pay, or payout recorded but not confirmed.
    const payoutQueue = approved.filter((item) => (!item.payout && item.payoutReleaseDate !== null && PERIOD.to >= item.payoutReleaseDate) || (item.payout !== null && !item.payout.confirmedAt)).length;
    expect(collected).toBeGreaterThan(0);
    expect(previous).toBeGreaterThan(0);
    expect(overdue).toBeGreaterThan(0);

    await waitFor(async () => expect(await kpi("Verified collections")).toBe(formatPeso(collected)));
    expect(await kpi("Pending payment verifications")).toBe(String(awaitingVerification(scoped.payments)));
    expect(await kpi("Outstanding receivables")).toBe(formatPeso(outstanding));
    expect(await kpi("Approved unpaid commissions")).toBe(formatPeso(approved.reduce((sum, item) => sum + item.amountCentavos, 0)));
    expect(screen.getByText(`${formatPeso(overdue)} overdue`)).toBeInTheDocument();

    const collectionsCard = screen.getByText("Verified collections", { selector: "dt" }).closest("dl") as HTMLElement;
    // Verified this period against the amount verified between Sep 14 and Oct 12, 2026.
    const change = trendBadge(collected, previous)!;
    // The spoken label names the direction once: "Up +12.5%" for a rise, "Down 33.4%" for a fall (never "Down +33.4%").
    const spoken = collected > previous ? `Up ${change}` : `Down ${change.replace(/^-/, "")}`;
    expect(within(collectionsCard).getByText(change)).toBeInTheDocument();
    expect(within(collectionsCard).getByText(`${spoken} compared with Sep 14, 2026 to Oct 12, 2026`)).toBeInTheDocument();
    for (const label of ["Pending payment verifications", "Outstanding receivables", "Approved unpaid commissions"]) {
      const card = screen.getByText(label, { selector: "dt" }).closest("dl") as HTMLElement;
      expect(card.textContent).not.toMatch(/%|previous period/);
    }

    const chart = screen.getByRole("region", { name: "Collections Performance" });
    await waitFor(() =>
      expect(chart.querySelector("figcaption")?.textContent).toContain(`Verified ${formatPeso(collected)}; Undone payments & refunds ₱0.00; Net ${formatPeso(collected)}`),
    );
    expect(within(chart).getAllByRole("radio").map((radio) => radio.textContent)).toEqual(["Verified", "Undone payments & refunds", "Net"]);

    const receivables = screen.getByRole("region", { name: "Receivables Overview" });
    expect(within(receivables).getByText("Settled")).toBeInTheDocument();
    expect(within(receivables).getByText("Overdue")).toBeInTheDocument();

    for (const [name, href] of [
      [`Payment Verification: ${awaitingVerification(scoped.payments)} pending`, "/admin/finance?tab=verification"],
      [`Commission Payouts: ${payoutQueue} pending`, "/admin/commissions?tab=commissions"],
      [`Cancellation Requests: ${scoped.contracts.filter((item) => item.cancellation?.status === "requested").length} pending`, "/admin/finance?tab=cancellations"],
      [`Payment Holds: ${scoped.memberships.filter((item) => item.financialHold).length} pending`, "/admin/finance?tab=collections"],
      [`Membership Activation: ${scoped.memberships.filter((item) => item.status === "pending").length} pending`, "/admin/membership?tab=activation"],
    ]) {
      expect(await screen.findByRole("link", { name })).toHaveAttribute("href", href);
    }
    expect(screen.queryByText("Customers", { selector: "dt" })).toBeNull();
    expect(screen.queryByText("Sales network members")).toBeNull();
    expect(screen.queryByRole("link", { name: /Contract Review/ })).toBeNull();
  });

  it("refreshes the queue and collections after a Finance verification", async () => {
    function VerifyPayment() {
      const action = usePaymentAction();
      return (
        <button type="button" onClick={() => action.mutate({ id: "pay-4", action: "verify" })}>
          Verify payment
        </button>
      );
    }
    const store = show("dev-finance", <VerifyPayment />);
    const scoped = await scopedRecords(store, "dev-finance");
    const pending = awaitingVerification(scoped.payments);
    const collected = formatPeso(collectedIn(scoped.payments, PERIOD));
    expect(store.payments.find((item) => item.id === "pay-4")?.status).toBe("submitted");

    expect(await screen.findByRole("link", { name: `Payment Verification: ${pending} pending` })).toBeInTheDocument();
    await waitFor(async () => expect(await kpi("Verified collections")).toBe(collected));
    fireEvent.click(screen.getByRole("button", { name: "Verify payment" }));

    expect(await screen.findByRole("link", { name: `Payment Verification: ${pending - 1} pending` })).toBeInTheDocument();
    await waitFor(async () => expect(await kpi("Verified collections")).not.toBe(collected));
    expect(await kpi("Pending payment verifications")).toBe(String(pending - 1));
  });
});

describe("Sales dashboard with loaded records", () => {
  it("gives an SVD own and team figures with the direct downline", async () => {
    const store = show("dev-svd-a");
    const scoped = await scopedRecords(store, "dev-svd-a");
    const memberId = "mem-svd-a";
    // VIP and IGP sales, each once: own as closing seller, team by the genealogy recorded on the sale (doc 13).
    const reporting = [...scoped.sales, ...scoped.igpRows];
    const mine = reporting.filter((sale) => sale.sellerMemberId === memberId);
    const team = reporting.filter((sale) => sale.team.some((entry) => entry.memberId === memberId));
    const teamIds = (status: string) => new Set(team.filter((sale) => sale.status === status).map((sale) => sale.id)).size;
    const confirmedCount = new Set(team.filter((sale) => sale.status === "confirmed" && sale.confirmedDate && sale.confirmedDate >= PERIOD.from && sale.confirmedDate <= PERIOD.to).map((sale) => sale.id)).size;
    const teamValue = confirmedIn(team, PERIOD);
    expect(teamValue).toBeGreaterThan(0);

    await waitFor(async () => expect(await kpi("Team confirmed sales value")).toBe(formatPeso(teamValue)));
    expect(await kpi("My confirmed sales value")).toBe(formatPeso(confirmedIn(mine, PERIOD)));
    expect(await kpi("Confirmed sales")).toBe(String(confirmedCount));
    expect(await kpi("Pending sales")).toBe(String(teamIds("pending")));
    expect(screen.getByText(new RegExp(`${teamIds("pending") + teamIds("confirmed")} recorded in total`))).toBeInTheDocument();
    // Period KPIs compare with Sep 14 - Oct 12; Pending is a snapshot.
    const teamCard = screen.getByText("Team confirmed sales value", { selector: "dt" }).closest("dl") as HTMLElement;
    expect(within(teamCard).getByText(trendBadge(teamValue, confirmedIn(team, PREVIOUS))!)).toBeInTheDocument();
    const pendingCard = screen.getByText("Pending sales", { selector: "dt" }).closest("dl") as HTMLElement;
    expect(within(pendingCard).getByText("Current")).toBeInTheDocument();
    expect(pendingCard.textContent).not.toMatch(/%|previous period/);
    const chart = screen.getByRole("region", { name: "Sales Performance" });
    expect(within(chart).getAllByRole("radio").map((radio) => radio.textContent)).toEqual(["My sales", "Team sales"]);

    // Each direct downline member with their own plus downline confirmed VIP sales in the period.
    const overview = screen.getByRole("region", { name: "Team Overview" });
    const direct = scoped.members.filter((member) => member.parentId === memberId);
    expect(direct.length).toBeGreaterThan(0);
    for (const member of direct) {
      const value = confirmedIn(scoped.sales.filter((sale) => sale.team.some((entry) => entry.memberId === member.id)), PERIOD);
      const name = await within(overview).findByText(member.displayName);
      expect(name.closest("li") ?? name.parentElement!).toHaveTextContent(formatPeso(value));
    }
    expect(within(overview).getByRole("link", { name: /Members/ })).toHaveAttribute("href", "/admin/sales-network/members");
    expect(within(overview).getByRole("link", { name: /Genealogy/ })).toHaveAttribute("href", "/admin/sales-network/genealogy");
  });

  it("limits an OST to their own sales without team figures or downline", async () => {
    const store = show("dev-ost-a1");
    const scoped = await scopedRecords(store, "dev-ost-a1");
    const mine = [...scoped.sales, ...scoped.igpRows].filter((sale) => sale.sellerMemberId === "mem-ost-a1");
    expect(confirmedIn(mine, PERIOD)).toBeGreaterThan(0);

    await waitFor(async () => expect(await kpi("My confirmed sales value")).toBe(formatPeso(confirmedIn(mine, PERIOD))));
    expect(await kpi("My customers")).toBe(String(scoped.customers.length));
    expect(await kpi("Pending sales")).toBe(String(new Set(mine.filter((sale) => sale.status === "pending").map((sale) => sale.id)).size));
    expect(screen.queryByText("Team confirmed sales value")).toBeNull();
    expect(screen.queryByText("Team sales")).toBeNull();
    expect(screen.queryByRole("region", { name: "Team Overview" })).toBeNull();
    const overview = screen.getByRole("region", { name: "Account Overview" });
    expect(within(overview).queryByText(/Direct downline/)).toBeNull();
    expect(screen.queryByRole("region", { name: "Needs your attention" })).toBeNull();
  });

  it("treats the SM/OST multi-role identity as a Sales Manager", async () => {
    const store = show("dev-multi-role");
    const scoped = await scopedRecords(store, "dev-multi-role");
    const team = [...scoped.sales, ...scoped.igpRows].filter((sale) => sale.team.some((entry) => entry.memberId === "mem-sm-a"));
    const drafts = scoped.customers.filter((customer) => customer.status === "draft" && customer.ownerMemberId === "mem-sm-a").length;
    expect(drafts).toBeGreaterThan(0);

    await waitFor(async () => expect(await kpi("Team confirmed sales value")).toBe(formatPeso(confirmedIn(team, PERIOD))));
    expect(await screen.findByRole("link", { name: `My customer drafts: ${drafts} pending` })).toHaveAttribute("href", "/admin/customers");
    // Sellers no longer prepare contracts (doc 04 section 5), so there is no returned-contracts shortcut.
    expect(screen.queryByRole("link", { name: /My returned contracts/ })).toBeNull();
    expect(screen.queryByText("Contracts requiring review")).toBeNull();
  });
});
