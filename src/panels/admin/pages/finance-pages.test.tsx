import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { FinanceCancellationsPage } from "./finance-cancellations-page";
import { FinanceCollectionsPage } from "./finance-collections-page";
import { FinanceHoldsPage } from "./finance-holds-page";
import { FinancePage } from "./finance-page";
import { FinancePaymentsPage } from "./finance-payments-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/finance",
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId="dev-finance">{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(cleanup);

const SECTION_HEADINGS = ["Verification queue", "Collections monitor", "All payments", "Financial holds", "Cancellation requests"];

const pages: [string, ReactElement, string][] = [
  ["Payment Verification", <FinancePage key="a" />, "Verification queue"],
  ["Collections", <FinanceCollectionsPage key="b" />, "Collections monitor"],
  ["Payment History", <FinancePaymentsPage key="c" />, "All payments"],
  ["Financial Holds", <FinanceHoldsPage key="d" />, "Financial holds"],
  ["Cancellation Requests", <FinanceCancellationsPage key="e" />, "Cancellation requests"],
];

describe("Finance pages are separate processes", () => {
  it.each(pages)("%s shows only its own section", async (title, page, own) => {
    render(<Wrapper>{page}</Wrapper>);
    expect(await screen.findByRole("heading", { name: title, level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: own })).toBeInTheDocument();
    for (const heading of SECTION_HEADINGS) {
      if (heading !== own) expect(screen.queryByRole("heading", { name: heading })).toBeNull();
    }
    expect(screen.queryByRole("tablist")).toBeNull();
  });
});
