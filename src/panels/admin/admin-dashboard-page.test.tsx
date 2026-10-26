import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { AdminDashboardPage } from "./pages/admin-dashboard-page";

const queryClient = new QueryClient();

function TestWrapper({ identityId }: { identityId: string }) {
  return (
    <QueryClientProvider client={queryClient}>
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

describe("admin dashboard page", () => {
  it("shows super administrator title", () => {
    expect(renderPage("dev-super-admin")).toContain("Super Administrator");
  });

  it("shows administrator title", () => {
    expect(renderPage("dev-admin")).toContain("Administrator");
  });

  it("shows human resources title", () => {
    expect(renderPage("dev-hr")).toContain("Human Resources");
  });

  it("shows finance title", () => {
    expect(renderPage("dev-finance")).toContain("Finance");
  });

  it("shows SVD title", () => {
    expect(renderPage("dev-svd-a")).toContain("Senior Vice Director");
  });

  it("shows SSM title", () => {
    expect(renderPage("dev-ssm-a")).toContain("Senior Sales Manager");
  });

  it("shows SM title", () => {
    expect(renderPage("dev-sm-a")).toContain("Sales Manager");
  });

  it("shows IST title", () => {
    expect(renderPage("dev-ist-a")).toContain("Internal Sales");
  });

  it("shows OST title", () => {
    expect(renderPage("dev-ost-a1")).toContain("Outside Sales");
  });

  it("renders sales network panel loading state for SVD", () => {
    const html = renderPage("dev-svd-a");
    expect(html).toContain("Senior Vice Director");
    expect(html).toContain("animate-pulse");
  });

  it("renders sales network panel loading state for OST", () => {
    const html = renderPage("dev-ost-a1");
    expect(html).toContain("Outside Sales");
    expect(html).toContain("animate-pulse");
  });

  it("shows restricted state for inactive account", () => {
    const html = renderPage("dev-inactive");
    expect(html).toContain("Access restricted");
    expect(html).not.toContain("Super Administrator");
  });
});
