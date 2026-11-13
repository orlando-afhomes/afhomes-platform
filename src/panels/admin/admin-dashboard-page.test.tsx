import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { AdminDashboardPage } from "./pages/admin-dashboard-page";

function TestWrapper({ identityId }: { identityId: string }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <AdminDashboardPage />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

function renderPage(identityId: string) {
  return renderToStaticMarkup(createElement(TestWrapper, { identityId }));
}

function expectAll(html: string, texts: string[]) {
  for (const text of texts) expect(html).toContain(text);
}

function expectNone(html: string, texts: string[]) {
  for (const text of texts) expect(html).not.toContain(text);
}

describe("dashboard page role gating (initial render)", () => {
  it.each([
    ["dev-super-admin", "Welcome back, Super Admin"],
    ["dev-admin", "Welcome back, Administrator"],
    ["dev-hr", "Welcome back, Human Resources"],
    ["dev-finance", "Finance overview"],
    ["dev-svd-a", "Welcome back, Sales Vice Director"],
    ["dev-ssm-a", "Welcome back, Senior Sales Manager"],
    ["dev-sm-a", "Welcome back, Sales Manager"],
    ["dev-ost-a1", "Welcome back, OST"],
    ["dev-multi-role", "Welcome back, Sales Manager"],
  ])("%s sees its dashboard heading", (identityId, heading) => {
    expect(renderPage(identityId)).toContain(heading);
  });

  it("shows the restricted state for an inactive account", () => {
    const html = renderPage("dev-inactive");
    expect(html).toContain("Access restricted");
    expectNone(html, ["Welcome back", "Dashboard date range", "My confirmed sales value"]);
  });

  it("renders the full Admin dashboard for the Super Administrator", () => {
    const html = renderPage("dev-super-admin");
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
    expectNone(html, ["Account Approvals", "Finance overview", "Team overview"]);
  });

  it("keeps Finance reporting off the Administrator dashboard", () => {
    const html = renderPage("dev-admin");
    expectAll(html, ["Contracts requiring review", "Contract Review", "Sales Performance"]);
    expectNone(html, ["verified collections", "Payment Verification"]);
  });

  it("gives Finance its own dashboard without customer, network, or contract-review widgets", () => {
    const html = renderPage("dev-finance");
    expectAll(html, [
      "Pending payment verifications",
      "Verified collections",
      "Outstanding receivables",
      "Approved unpaid commissions",
      "Collections Performance",
      "Receivables Overview",
      "Pending Approvals",
      "Payment Verification",
      "Commission Assignment",
      "Commission Payouts",
      "Cancellation Requests",
      "Financial Holds",
      "Membership Activation",
      "Dashboard date range",
    ]);
    expectNone(html, ["Sales network members", "Contracts by VIP Product", "Contract Review", "Team overview"]);
  });

  it("gives sales managers team figures and the team overview", () => {
    for (const identityId of ["dev-svd-a", "dev-ssm-a", "dev-sm-a"]) {
      const html = renderPage(identityId);
      expectAll(html, [
        "My confirmed sales value",
        "Team confirmed sales value",
        "Confirmed sales",
        "Pending sales",
        "Sales Performance",
        "Sales by VIP Product",
        "Recent Activities",
        "Team overview",
        "My customer drafts",
      ]);
      // Sellers no longer prepare contracts (doc 04 section 5), so no returned-contracts shortcut.
      expectNone(html, ["My returned contracts", "Contracts requiring review", "Outstanding receivables", "Approved unpaid commissions"]);
    }
  });

  it("gives an OST only individual figures", () => {
    const html = renderPage("dev-ost-a1");
    expectAll(html, ["My confirmed sales value", "My customers", "Pending sales", "Account overview", "My customer drafts"]);
    expectNone(html, ["Team confirmed sales value", "Team overview", "My returned contracts", "Outstanding receivables"]);
  });

  it("shows an honest empty dashboard for HR", () => {
    const html = renderPage("dev-hr");
    expect(html).toContain("No dashboard metrics");
    expectNone(html, ["Customers", "Pending Approvals", "Recent Activities", "Dashboard date range"]);
  });
});
