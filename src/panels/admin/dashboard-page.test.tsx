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
    expect(await kpi("Customers")).toBe("5");
    expect(await kpi("Sales network members")).toBe("7");
    expect(await kpi("Contracts requiring review")).toBe("2");

    const chart = screen.getByRole("region", { name: "Sales performance" });
    await within(chart).findByText("View chart data");
    expect(chart.querySelector("figcaption")?.textContent).toContain(
      "Confirmed sales value ₱312,000.00; Verified collections ₱129,500.00 from Oct 13, 2026 to Nov 10, 2026 (Asia/Manila).",
    );

    const distribution = screen.getByRole("region", { name: "Contracts by VIP product" });
    expect(await within(distribution).findByText("50%")).toBeInTheDocument();
    expect(within(distribution).getAllByText("25%")).toHaveLength(2);

    expect(await screen.findByRole("link", { name: "Contract Review: 2 pending" })).toHaveAttribute("href", "/admin/sales/contract-review");
    expect(screen.getByRole("link", { name: "Membership Activation: 1 pending" })).toHaveAttribute("href", "/admin/membership/activation");
    expect(screen.queryByRole("link", { name: /Payment Verification/ })).toBeNull();
    expect(screen.queryByText(/Account Approvals/)).toBeNull();
    expect((await screen.findAllByText("Customer submitted")).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/admin/audit-logs");
  });

  it("keeps collections away from the Administrator", async () => {
    show("dev-admin");

    await waitFor(async () => expect(await kpi("Confirmed sales value")).toBe("₱312,000.00"));
    const chart = screen.getByRole("region", { name: "Sales performance" });
    await within(chart).findByText("View chart data");
    expect(within(chart).queryByText("Verified collections")).toBeNull();
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
    expect(await kpi("Approved unpaid commissions")).toBe("₱0.00");
    expect(screen.getByText(/₱57,500.00 overdue/)).toBeInTheDocument();

    const chart = screen.getByRole("region", { name: "Collections performance" });
    await within(chart).findByText("View chart data");
    expect(chart.querySelector("figcaption")?.textContent).toContain(
      "Verified collections ₱129,500.00; Reversals and refunds ₱0.00; Net collections ₱129,500.00",
    );

    const receivables = screen.getByRole("region", { name: "Receivables overview" });
    expect(within(receivables).getByText("Settled")).toBeInTheDocument();
    expect(within(receivables).getByText("Overdue")).toBeInTheDocument();

    for (const [name, href] of [
      ["Payment Verification: 1 pending", "/admin/finance"],
      ["Commission Assignment: 2 pending", "/admin/commissions/assignment"],
      ["Commission Payouts: 0 pending", "/admin/commissions/payouts"],
      ["Cancellation Requests: 0 pending", "/admin/finance/cancellations"],
      ["Financial Holds: 0 pending", "/admin/finance/holds"],
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

    const overview = screen.getByRole("region", { name: "Team overview" });
    expect(await within(overview).findByText("Maria Santos")).toBeInTheDocument();
    expect(within(overview).getByText("₱240,000.00")).toBeInTheDocument();
    expect(within(overview).getByRole("link", { name: /Members/ })).toHaveAttribute("href", "/admin/sales-network/members");
    expect(within(overview).getByRole("link", { name: /Genealogy/ })).toHaveAttribute("href", "/admin/sales-network/genealogy");
  });

  it("limits an OST to their own sales without team figures or downline", async () => {
    show("dev-ost-a1");

    await waitFor(async () => expect(await kpi("My confirmed sales value")).toBe("₱240,000.00"));
    expect(await kpi("My customers")).toBe("1");
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
    expect(screen.getByRole("link", { name: "My returned contracts: 0 pending" })).toHaveAttribute("href", "/admin/sales/contracts");
    expect(screen.queryByText("Contracts requiring review")).toBeNull();
  });
});
