import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

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

  it("does not render unavailable module links", () => {
    const html = renderNav("dev-super-admin");
    expect(html).not.toContain("Customers");
    expect(html).not.toContain("Audit Logs");
  });

  it("hides the Accounts entry from the sidebar for authorized identities", () => {
    const html = renderNav("dev-admin");
    expect(html).not.toContain("Accounts");
  });

  it("marks the active route selected", () => {
    const identity = getDevIdentity("dev-admin");
    const items = getRoleAwareAdminNavigation(identity);
    const html = renderToStaticMarkup(
      createElement(TestWrapper, { items }),
    );
    expect(html).toContain("ant-menu-item-selected");
  });
});
