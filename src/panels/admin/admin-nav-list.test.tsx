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

describe("admin nav groups", () => {
  it("opens the current group and lets users switch to another group", async () => {
    const user = userEvent.setup();
    const items = getRoleAwareAdminNavigation(getDevIdentity("dev-super-admin"));
    const { rerender } = render(<TestWrapper items={items} pathname="/admin/finance/collections" />);
    expect(screen.getByRole("button", { name: "Finance" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Payments" })).toHaveAttribute("href", "/admin/finance");
    expect(screen.getByRole("link", { name: "Payments" })).toHaveAttribute("aria-current", "page");
    const memberServices = screen.getByRole("button", { name: "Member Services" });
    expect(memberServices).toHaveAttribute("aria-expanded", "false");
    await user.click(memberServices);
    expect(memberServices).toHaveAttribute("aria-expanded", "true");
    expect(memberServices).toHaveClass("tw:aria-expanded:bg-white/10");
    expect(screen.getByRole("link", { name: "Stay Points" })).toHaveAttribute("href", "/admin/stay-points");
    expect(screen.getByRole("button", { name: "Finance" })).toHaveAttribute("aria-expanded", "false");
    rerender(<TestWrapper items={items} pathname="/admin/stay-points" />);
    expect(memberServices).toHaveAttribute("aria-expanded", "true");
    expect(memberServices).toHaveClass("tw:aria-expanded:bg-transparent");
    expect(screen.getByRole("link", { name: "Stay Points" })).toHaveAttribute("aria-current", "page");
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

  it("renders the Organization area for roles holding any of its tabs", () => {
    expect(renderNav("dev-admin", "/admin/organization")).toContain("Organization");
    expect(renderNav("dev-hr", "/admin/organization")).toContain("Organization");
  });

  it("renders dashboard once for a multi-role identity", () => {
    const html = renderNav("dev-multi-role");
    expect(html.match(/Dashboard/g)?.length).toBe(1);
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

  it("renders areas only when one of their tabs is allowed", () => {
    const finance = renderNav("dev-finance");
    expect(finance).toContain("Payments");
    expect(finance).toContain("Commissions");
    expect(finance).not.toContain("Settings");
    const ost = renderNav("dev-ost-a1");
    // Payment Plan Guide moved to Sales, so a seller holds no Settings tab.
    expect(ost).not.toContain("Settings");
    expect(renderNav("dev-admin")).toContain("Settings");
    expect(ost).not.toContain("Payments");
    expect(ost).not.toContain("Redemption");
  });

  it("shows Organization instead of a separate Accounts entry", () => {
    for (const identityId of ["dev-admin", "dev-super-admin", "dev-hr"]) {
      const html = renderNav(identityId, "/admin/organization/staff");
      expect(html).not.toContain("Accounts and Permissions");
      expect(html).toContain("Organization");
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
