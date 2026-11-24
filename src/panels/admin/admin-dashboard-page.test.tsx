import { createElement } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it } from "vitest";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { AdminDashboardPage } from "./pages/admin-dashboard-page";

function TestWrapper({ identityId, client }: { identityId: string; client: QueryClient }) {
  return (
    <QueryClientProvider client={client}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <AdminDashboardPage />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(cleanup);

// Widgets read their grants from the async access snapshot, so wait until it and the widget queries have settled.
async function renderPage(identityId: string) {
  const client = new QueryClient();
  const { container } = render(createElement(TestWrapper, { identityId, client }));
  await waitFor(() => {
    const access = client.getQueryCache().find({ queryKey: ["access-snapshot"], exact: false });
    if (access) expect(access.state.status).toBe("success");
    expect(client.isFetching()).toBe(0);
  });
  return container.innerHTML;
}

function expectAll(html: string, texts: string[]) {
  for (const text of texts) expect(html).toContain(text);
}

function expectNone(html: string, texts: string[]) {
  for (const text of texts) expect(html).not.toContain(text);
}

describe("dashboard page role gating (initial render)", () => {
  it.each([
    ["dev-super-admin", "Welcome Back, Super Admin"],
    ["dev-admin", "Welcome Back, Administrator"],
    ["dev-hr", "People Overview"],
    ["dev-gsd", "Counter Workspace"],
    ["dev-finance", "Finance Overview"],
    ["dev-svd-a", "Welcome Back, Sales Vice Director"],
    ["dev-ssm-a", "Welcome Back, Senior Sales Manager"],
    ["dev-sm-a", "Welcome Back, Sales Manager"],
    ["dev-ost-a1", "Welcome Back, OST"],
    ["dev-multi-role", "Welcome Back, Sales Manager"],
  ])("%s sees its dashboard heading", async (identityId, heading) => {
    expect(await renderPage(identityId)).toContain(heading);
  });

  it("shows the restricted state for an inactive account", async () => {
    const html = await renderPage("dev-inactive");
    expect(html).toContain("Access Restricted");
    expectNone(html, ["Welcome Back", "Dashboard date range", "My confirmed sales value"]);
  });

  it("renders the full Admin dashboard for the Super Administrator", async () => {
    const html = await renderPage("dev-super-admin");
    expectAll(html, [
      "Customers",
      "Sales network members",
      "Contracts requiring review",
      "Confirmed sales value",
      "Sales Performance",
      "Confirmed sales value or verified collections over time",
      "Contracts by VIP Product",
      "Recent Activities",
      "Pending Approvals",
      "Contract Review",
      "Payment Verification",
      "Membership Activation",
      "Dashboard date range",
    ]);
    expectNone(html, ["Account Approvals", "Finance Overview", "Team Overview"]);
  });

  it("keeps Finance reporting off the Administrator dashboard but shows the receipts queue", async () => {
    const html = await renderPage("dev-admin");
    expectAll(html, ["Contracts requiring review", "Contract Review", "Sales Performance", "Payment Verification"]);
    expectNone(html, ["verified collections"]);
  });

  it("gives Finance its own dashboard without customer, network, or contract-review widgets", async () => {
    const html = await renderPage("dev-finance");
    expectAll(html, [
      "Pending payment verifications",
      "Verified collections",
      "Outstanding receivables",
      "Approved unpaid commissions",
      "Collections Performance",
      "Receivables Overview",
      "Pending Approvals",
      "Payment Verification",
      "Commission Payouts",
      "Cancellation Requests",
      "Payment Holds",
      "Membership Activation",
      "Dashboard date range",
    ]);
    expectNone(html, ["Sales network members", "Contracts by VIP Product", "Contract Review", "Team Overview"]);
  });

  it("gives sales managers team figures and the team overview", async () => {
    for (const identityId of ["dev-svd-a", "dev-ssm-a", "dev-sm-a"]) {
      const html = await renderPage(identityId);
      expectAll(html, [
        "My confirmed sales value",
        "Team confirmed sales value",
        "Confirmed sales",
        "Pending sales",
        "Sales Performance",
        "Sales by VIP Product",
        "Recent Activities",
        "Team Overview",
        "My customer drafts",
      ]);
      // Sellers no longer prepare contracts (doc 04 section 5), so no returned-contracts shortcut.
      expectNone(html, ["My returned contracts", "Contracts requiring review", "Outstanding receivables", "Approved unpaid commissions"]);
    }
  });

  it("gives an OST only individual figures", async () => {
    const html = await renderPage("dev-ost-a1");
    expectAll(html, ["My confirmed sales value", "My customers", "Pending sales", "Account Overview", "My customer drafts"]);
    expectNone(html, ["Team confirmed sales value", "Team Overview", "My returned contracts", "Outstanding receivables"]);
  });

  it("gives HR head counts only", async () => {
    const html = await renderPage("dev-hr");
    expectAll(html, ["Active departments", "Active staff members"]);
    expectNone(html, ["No Dashboard Metrics", "Customers", "Pending Approvals", "Recent Activities", "Dashboard date range"]);
  });

  it("gives the GSD Counter shortcuts without record lists", async () => {
    const html = await renderPage("dev-gsd");
    expectAll(html, ["Scan Member QR", "Customer Search", "Stay Points"]);
    expectNone(html, ["No Dashboard Metrics", "Pending Approvals", "Recent Activities", "Dashboard date range"]);
  });
});
