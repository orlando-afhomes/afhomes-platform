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

// Each page has one section, named by its table caption or (holds, cancellations) its heading.
const SECTIONS = ["Verification queue", "Collections", "All payments", "Financial holds", "Cancellation requests"];

const pages: [string, ReactElement, string, "table" | "heading"][] = [
  ["Payment Verification", <FinancePage key="a" />, "Verification queue", "table"],
  ["Collections", <FinanceCollectionsPage key="b" />, "Collections", "table"],
  ["Payment History", <FinancePaymentsPage key="c" />, "All payments", "table"],
  ["Financial Holds", <FinanceHoldsPage key="d" />, "Financial holds", "heading"],
  ["Cancellation Requests", <FinanceCancellationsPage key="e" />, "Cancellation requests", "heading"],
];

describe("Finance pages are separate processes", () => {
  it.each(pages)("%s shows only its own section", async (title, page, own, role) => {
    render(<Wrapper>{page}</Wrapper>);
    expect(await screen.findByRole("heading", { name: title, level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole(role, { name: own })).toBeInTheDocument();
    for (const section of SECTIONS) {
      if (section !== own) {
        expect(screen.queryByRole("heading", { name: section })).toBeNull();
        expect(screen.queryByRole("table", { name: section })).toBeNull();
      }
    }
    expect(screen.queryByRole("tablist")).toBeNull();
  });
});
