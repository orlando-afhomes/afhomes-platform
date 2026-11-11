import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { CollectionsReportPage } from "./pages/collections-report-page";
import { CommissionReportPage } from "./pages/commission-report-page";
import { CustomerGrowthReportPage } from "./pages/customer-growth-report-page";
import { MembershipReportPage } from "./pages/membership-report-page";
import { SalesPerformanceReportPage } from "./pages/sales-performance-report-page";
import { StayPointsReportPage } from "./pages/stay-points-report-page";

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

function show(identityId: string, page: ReactElement) {
  return render(<Wrapper identityId={identityId}>{page}</Wrapper>);
}

const TILES = {
  sales: "Period sales",
  growth: "New customers",
  collections: "Verified collections",
  commissions: "Approved",
  membership: "Activated",
  points: "Points earned",
};

describe("report pages", () => {
  const cases: [string, ReactElement, keyof typeof TILES][] = [
    ["sales", <SalesPerformanceReportPage key="s" />, "sales"],
    ["growth", <CustomerGrowthReportPage key="g" />, "growth"],
    ["collections", <CollectionsReportPage key="c" />, "collections"],
    ["commissions", <CommissionReportPage key="m" />, "commissions"],
    ["membership", <MembershipReportPage key="b" />, "membership"],
    ["points", <StayPointsReportPage key="p" />, "points"],
  ];
  it.each(cases)("%s report shows only its own tiles", async (_name, page, own) => {
    show("dev-finance", page);
    expect(await screen.findByText(TILES[own])).toBeInTheDocument();
    expect(screen.getByText(/\(Asia\/Manila\)/)).toBeInTheDocument();
    for (const [key, label] of Object.entries(TILES)) {
      if (key !== own) expect(screen.queryByText(label)).toBeNull();
    }
  });

  it("denies the collections report without finance.reports.view", async () => {
    show("dev-ost-a1", <CollectionsReportPage />);
    expect(await screen.findByText(/Access restricted/)).toBeInTheDocument();
    expect(screen.queryByText(TILES.collections)).toBeNull();
  });
});
