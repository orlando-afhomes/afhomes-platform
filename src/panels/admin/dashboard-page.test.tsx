import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { useContractAction, usePaymentAction } from "@/data/business-queries";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { AdminDashboardPage } from "./pages/admin-dashboard-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin",
}));

function Wrapper({ identityId, children }: { identityId: string; children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

function show(identityId: string, extra?: ReactNode) {
  return render(
    <Wrapper identityId={identityId}>
      <AdminDashboardPage />
      {extra}
    </Wrapper>,
  );
}

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
    show("dev-super-admin");

    await waitFor(async () => expect(await kpi("Confirmed sales value")).toBe("₱312,000.00"));
    expect(await kpi("Customers")).toBe("9");
    expect(await kpi("Sales network members")).toBe("7");
    expect(await kpi("Contracts requiring review")).toBe("2");

    // Confirmed sales value is a period KPI: compared with Sep 14 - Oct 12, which had no confirmed sales.
    const salesCard = (await screen.findByText("Confirmed sales value", { selector: "dt" })).closest("dl") as HTMLElement;
    expect(within(salesCard).getByText("New")).toBeInTheDocument();
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
        "Sales ₱312,000.00; Collections ₱129,500.00 from Oct 13, 2026 to Nov 10, 2026 (Asia/Manila).",
      ),
    );
    expect(within(chart).getByRole("radio", { name: "Sales" })).toHaveAttribute("aria-checked", "true");
    expect(within(chart).getByRole("radio", { name: "Collections" })).toHaveAttribute("aria-checked", "false");

    const distribution = screen.getByRole("region", { name: "Contracts by VIP Product" });
    expect(distribution).toHaveAccessibleDescription("Distribution of visible contracts, cancelled excluded (current).");
    expect(
      await within(distribution).findByRole("img", {
        name: "Contracts by VIP Product: 4 contracts. VIP Gold: 1 contract, 25%. VIP Silver: 1 contract, 25%. VIP Bronze: 2 contracts, 50%.",
      }),
    ).toBeInTheDocument();
    // Each tier is drawn in its own metal color.
    const strokes = [...distribution.querySelectorAll("circle[pathLength]")].map((circle) => circle.getAttribute("stroke"));
    expect(strokes).toEqual(["var(--color-tier-gold)", "var(--color-tier-silver)", "var(--color-tier-bronze)"]);
    expect(await within(distribution).findByText("50%")).toBeInTheDocument();
    expect(within(distribution).getAllByText("25%")).toHaveLength(2);

    expect(await screen.findByRole("link", { name: "Contract Review: 2 pending" })).toHaveAttribute("href", "/admin/sales/contract-review");
    expect(await screen.findByRole("link", { name: "Payment Verification: 1 pending" })).toHaveAttribute("href", "/admin/finance");
    expect(screen.getByRole("link", { name: "Membership Activation: 1 pending" })).toHaveAttribute("href", "/admin/membership/activation");
    expect(screen.queryByText(/Account Approvals/)).toBeNull();
    expect(await screen.findByText("Payment submitted")).toBeInTheDocument();
    expect(screen.getByText("Contract submitted")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View All" })).toHaveAttribute("href", "/admin/audit-logs");
  });

  it("keeps collections away from the Administrator", async () => {
    show("dev-admin");

    await waitFor(async () => expect(await kpi("Confirmed sales value")).toBe("₱312,000.00"));
    const chart = screen.getByRole("region", { name: "Sales Performance" });
    await waitFor(() => expect(chart.querySelector("figcaption")?.textContent).toContain("Sales ₱312,000.00 from"));
    expect(within(chart).queryByRole("radiogroup")).toBeNull();
    expect(chart.textContent).not.toContain("Collections");
    expect(screen.queryByRole("link", { name: /Payment Verification/ })).toBeNull();
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
    show("dev-admin", <ReturnContract />);

    expect(await screen.findByRole("link", { name: "Contract Review: 2 pending" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Return contract" }));
    expect(await screen.findByRole("link", { name: "Contract Review: 1 pending" })).toBeInTheDocument();
    await waitFor(async () => expect(await kpi("Contracts requiring review")).toBe("1"));
  });
});

describe("Finance dashboard with loaded records", () => {
  it("shows collections, receivables, commissions and the gated Finance queues", async () => {
    show("dev-finance");

    await waitFor(async () => expect(await kpi("Verified collections")).toBe("₱129,500.00"));
    expect(await kpi("Pending payment verifications")).toBe("1");
    expect(await kpi("Outstanding receivables")).toBe("₱172,500.00");
    expect(await kpi("Approved unpaid commissions")).toBe("₱3,600.00");
    expect(screen.getByText(/₱57,500.00 overdue/)).toBeInTheDocument();

    const collectionsCard = screen.getByText("Verified collections", { selector: "dt" }).closest("dl") as HTMLElement;
    // ₱129,500 verified this period against ₱10,000 verified between Sep 14 and Oct 12, 2026.
    expect(within(collectionsCard).getByText("+1,195%")).toBeInTheDocument();
    expect(within(collectionsCard).getByText("Up +1,195% compared with Sep 14, 2026 to Oct 12, 2026")).toBeInTheDocument();
    for (const label of ["Pending payment verifications", "Outstanding receivables", "Approved unpaid commissions"]) {
      const card = screen.getByText(label, { selector: "dt" }).closest("dl") as HTMLElement;
      expect(card.textContent).not.toMatch(/%|previous period/);
    }

    const chart = screen.getByRole("region", { name: "Collections Performance" });
    await waitFor(() =>
      expect(chart.querySelector("figcaption")?.textContent).toContain("Verified ₱129,500.00; Reversals & refunds ₱0.00; Net ₱129,500.00"),
    );
    expect(within(chart).getAllByRole("radio").map((radio) => radio.textContent)).toEqual(["Verified", "Reversals & refunds", "Net"]);

    const receivables = screen.getByRole("region", { name: "Receivables Overview" });
    expect(within(receivables).getByText("Settled")).toBeInTheDocument();
    expect(within(receivables).getByText("Overdue")).toBeInTheDocument();

    for (const [name, href] of [
      ["Payment Verification: 1 pending", "/admin/finance"],
      ["Commission Assignment: 2 pending", "/admin/commissions/assignment"],
      ["Commission Payouts: 1 pending", "/admin/commissions/payouts"],
      ["Cancellation Requests: 1 pending", "/admin/finance/cancellations"],
      ["Financial Holds: 1 pending", "/admin/finance/holds"],
      ["Membership Activation: 1 pending", "/admin/membership/activation"],
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
    show("dev-finance", <VerifyPayment />);

    expect(await screen.findByRole("link", { name: "Payment Verification: 1 pending" })).toBeInTheDocument();
    await waitFor(async () => expect(await kpi("Verified collections")).toBe("₱129,500.00"));
    fireEvent.click(screen.getByRole("button", { name: "Verify payment" }));

    expect(await screen.findByRole("link", { name: "Payment Verification: 0 pending" })).toBeInTheDocument();
    await waitFor(async () => expect(await kpi("Verified collections")).not.toBe("₱129,500.00"));
    expect(await kpi("Pending payment verifications")).toBe("0");
  });
});

describe("Sales dashboard with loaded records", () => {
  it("gives an SVD own and team figures with the direct downline", async () => {
    show("dev-svd-a");

    await waitFor(async () => expect(await kpi("Team confirmed sales value")).toBe("₱240,000.00"));
    expect(await kpi("My confirmed sales value")).toBe("₱0.00");
    expect(await kpi("Confirmed sales")).toBe("1");
    expect(await kpi("Pending sales")).toBe("2");
    expect(screen.getByText(/3 recorded in total/)).toBeInTheDocument();
    // Period KPIs compare with Sep 14 - Oct 12 (no confirmed team sales then); Pending is a snapshot.
    const teamCard = screen.getByText("Team confirmed sales value", { selector: "dt" }).closest("dl") as HTMLElement;
    expect(within(teamCard).getByText("New")).toBeInTheDocument();
    const pendingCard = screen.getByText("Pending sales", { selector: "dt" }).closest("dl") as HTMLElement;
    expect(within(pendingCard).getByText("Current")).toBeInTheDocument();
    expect(pendingCard.textContent).not.toMatch(/%|previous period/);
    const chart = screen.getByRole("region", { name: "Sales Performance" });
    expect(within(chart).getAllByRole("radio").map((radio) => radio.textContent)).toEqual(["My sales", "Team sales"]);

    const overview = screen.getByRole("region", { name: "Team overview" });
    expect(await within(overview).findByText("Maria Santos")).toBeInTheDocument();
    expect(within(overview).getByText("₱240,000.00")).toBeInTheDocument();
    expect(within(overview).getByRole("link", { name: /Members/ })).toHaveAttribute("href", "/admin/sales-network/members");
    expect(within(overview).getByRole("link", { name: /Genealogy/ })).toHaveAttribute("href", "/admin/sales-network/genealogy");
  });

  it("limits an OST to their own sales without team figures or downline", async () => {
    show("dev-ost-a1");

    await waitFor(async () => expect(await kpi("My confirmed sales value")).toBe("₱240,000.00"));
    expect(await kpi("My customers")).toBe("3");
    expect(await kpi("Pending sales")).toBe("0");
    expect(screen.queryByText("Team confirmed sales value")).toBeNull();
    expect(screen.queryByText("Team sales")).toBeNull();
    expect(screen.queryByRole("region", { name: "Team overview" })).toBeNull();
    const overview = screen.getByRole("region", { name: "Account overview" });
    expect(within(overview).queryByText(/Direct downline/)).toBeNull();
    expect(screen.queryByRole("region", { name: "Needs your attention" })).toBeNull();
  });

  it("treats the SM/OST multi-role identity as a Sales Manager", async () => {
    show("dev-multi-role");

    await waitFor(async () => expect(await kpi("Team confirmed sales value")).toBe("₱240,000.00"));
    expect(await screen.findByRole("link", { name: "My customer drafts: 1 pending" })).toHaveAttribute("href", "/admin/customers");
    // Sellers no longer prepare contracts (doc 04 section 5), so there is no returned-contracts shortcut.
    expect(screen.queryByRole("link", { name: /My returned contracts/ })).toBeNull();
    expect(screen.queryByText("Contracts requiring review")).toBeNull();
  });
});
