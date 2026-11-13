import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AdminNavList } from "./components/admin-nav-list";
import { getDevIdentity } from "@/data/mock/dev-identities";
import { getRoleAwareAdminNavigation } from "@/panels/admin/navigation";

const queryClient = new QueryClient();

function TestWrapper({ items, pathname }: { items: ReturnType<typeof getRoleAwareAdminNavigation>; pathname?: string }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminNavList items={items} pathname={pathname ?? "/admin"} />
    </QueryClientProvider>
  );
}

function renderNav(identityId: string, pathname = "/admin") {
  const identity = getDevIdentity(identityId);
  const items = getRoleAwareAdminNavigation(identity);
  return renderToStaticMarkup(createElement(TestWrapper, { items, pathname }));
}

describe("admin nav accordion", () => {
  it("keeps one group open at a time and closes the open group when clicked again", async () => {
    const user = userEvent.setup();
    const items = getRoleAwareAdminNavigation(getDevIdentity("dev-super-admin"));
    render(<TestWrapper items={items} pathname="/admin" />);
    const sales = screen.getByRole("button", { name: "Sales" });
    const finance = screen.getByRole("button", { name: "Finance" });
    await user.click(sales);
    expect(sales).toHaveAttribute("aria-expanded", "true");
    await user.click(finance);
    expect(sales).toHaveAttribute("aria-expanded", "false");
    expect(finance).toHaveAttribute("aria-expanded", "true");
    await user.click(finance);
    expect(finance).toHaveAttribute("aria-expanded", "false");
  });
});

describe("admin nav list rendering", () => {
  it("renders dashboard for an active HR identity", () => {
    const html = renderNav("dev-hr");
    expect(html).toContain("Dashboard");
    expect(html).not.toContain("Finance");
  });

  it("renders dashboard for an active finance identity", () => {
    const html = renderNav("dev-finance");
    expect(html).toContain("Dashboard");
    expect(html).not.toContain("Organization");
  });

  it("renders no business links for an inactive identity", () => {
    const html = renderNav("dev-inactive");
    expect(html).not.toContain("Dashboard");
  });

  it("renders organization children for roles with child grants", () => {
    const html = renderNav("dev-admin", "/admin/organization/departments");
    expect(html).toContain("Departments");
    expect(html).toContain("Roles");
    expect(html).toContain("Staff");
  });

  it("renders dashboard once for a multi-role identity", () => {
    const html = renderNav("dev-multi-role");
    expect(html.match(/Dashboard/g)?.length).toBe(1);
  });

  it("hides the roles child link when the identity lacks the roles grant", () => {
    const html = renderNav("dev-hr", "/admin/organization/departments");
    expect(html).toContain("Departments");
    expect(html).toContain("Staff");
    expect(html).not.toContain("Roles");
  });

  it("renders business links only for roles granted them", () => {
    const admin = renderNav("dev-super-admin");
    expect(admin).toContain("Customers");
    expect(admin).toContain("Audit Logs");
    const ost = renderNav("dev-ost-a1");
    expect(ost).toContain("Customers");
    expect(ost).not.toContain("Audit Logs");
    expect(ost).not.toContain("Payments");
    expect(renderNav("dev-hr")).not.toContain("Customers");
  });

  it("renders process pages under their department parent, gated by operation", () => {
    const superAdmin = renderNav("dev-super-admin");
    for (const label of ["Contract Review", "Commission Payouts", "Activation Queue", "Collections Report", "Product Catalog", "Tier Codes"]) {
      expect(superAdmin).toContain(label);
    }
    expect(superAdmin).not.toContain("Customer Import");
    const admin = renderNav("dev-admin");
    expect(admin).not.toContain("Customer Import");
    expect(admin).toContain("Commission Payouts");
    expect(admin).not.toContain("Collections Report");
    const finance = renderNav("dev-finance");
    expect(finance).toContain("Payment Verification");
    expect(finance).toContain("Commission Payouts");
    expect(finance).not.toContain("Contract Review");
    expect(finance).not.toContain("VIP Products");
    const ost = renderNav("dev-ost-a1");
    expect(ost).toContain("Scheme Guide");
    for (const label of ["Contract Review", "Commission Payouts", "Activation Queue", "Payment Verification"]) {
      expect(ost).not.toContain(label);
    }
  });

  it("shows Staff instead of a separate Accounts entry", () => {
    for (const identityId of ["dev-admin", "dev-super-admin", "dev-hr"]) {
      const html = renderNav(identityId, "/admin/organization/staff");
      expect(html).not.toContain("Accounts and Permissions");
      expect(html).toContain("Staff");
    }
  });

  it("marks only the active route as the current page", () => {
    const identity = getDevIdentity("dev-admin");
    const items = getRoleAwareAdminNavigation(identity);
    const html = renderToStaticMarkup(
      createElement(TestWrapper, { items }),
    );
    expect(html.match(/aria-current="page"/g)?.length).toBe(1);
    expect(html).toContain('aria-current="page"');
  });
});
