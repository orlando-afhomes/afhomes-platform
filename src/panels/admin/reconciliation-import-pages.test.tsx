import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { HistoryImportPage } from "./pages/history-import-page";
import { ReconciliationPage } from "./pages/reconciliation-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin",
}));

function Wrapper({ identityId, children }: { identityId: string; children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(cleanup);
const show = (identityId: string, page: ReactElement) => render(<Wrapper identityId={identityId}>{page}</Wrapper>);

describe("reconciliation and historical import pages", () => {
  it("shows Finance the measures to reconcile", async () => {
    show("dev-finance", <ReconciliationPage />);
    expect(await screen.findByText("Verified receipts (net)")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Record workbook total" }).length).toBeGreaterThan(0);
  });

  it("restricts reconciliation and the import for sellers", async () => {
    show("dev-svd-a", <ReconciliationPage />);
    expect(await screen.findByText("Access restricted")).toBeInTheDocument();
    cleanup();
    show("dev-finance", <HistoryImportPage />);
    expect(await screen.findByText("Access restricted")).toBeInTheDocument();
  });

  it("tells the Administrator what the import does not do", async () => {
    show("dev-admin", <HistoryImportPage />);
    expect(await screen.findByText(/does not issue VIP Numbers/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /CSV template/ })).toBeInTheDocument();
  });
});
