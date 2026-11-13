import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const SECTIONS = ["Verification queue", "Collections", "All payments", "Financial Holds", "Cancellation Requests"];

const pages: [string, ReactElement, string, "table" | "link"][] = [
  ["Payment Verification", <FinancePage key="a" />, "Verification queue", "table"],
  ["Collections", <FinanceCollectionsPage key="b" />, "Collections", "table"],
  ["Payment History", <FinancePaymentsPage key="c" />, "All payments", "table"],
  ["Financial Holds", <FinanceHoldsPage key="d" />, "Open contract", "link"],
  ["Cancellation Requests", <FinanceCancellationsPage key="e" />, "Open request", "link"],
];

describe("Finance list filters", () => {
  it.each([
    [<FinanceHoldsPage key="h" />, "Search financial holds", "Open contract", "No holds match the filters."],
    [<FinanceCancellationsPage key="c" />, "Search cancellation requests", "Open request", "No requests match the filters."],
  ] as [ReactElement, string, string, string][])("search narrows %#", async (page, searchLabel, link, none) => {
    render(<Wrapper>{page}</Wrapper>);
    expect(await screen.findByRole("link", { name: link })).toBeInTheDocument();
    await userEvent.type(screen.getByRole("searchbox", { name: searchLabel }), "zzz-no-such-record");
    expect(await screen.findByText(none)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: link })).toBeNull();
  });
});

describe("Finance pages are separate processes", () => {
  it.each(pages)("%s shows only its own section", async (title, page, own, role) => {
    render(<Wrapper>{page}</Wrapper>);
    expect(await screen.findByRole("heading", { name: title, level: 1 })).toBeInTheDocument();
    expect(await screen.findByRole(role, { name: own })).toBeInTheDocument();
    for (const section of SECTIONS) {
      if (section !== own && section !== title) {
        expect(screen.queryByRole("heading", { name: section })).toBeNull();
        expect(screen.queryByRole("table", { name: section })).toBeNull();
      }
    }
    if (title === "Payment Verification") {
      // Its only tabs filter its own receipt queue; no other Finance process is a tab.
      const tablist = screen.getByRole("tablist", { name: "Receipt queues" });
      expect(within(tablist).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["Verification", "Exceptions"]);
    } else {
      expect(screen.queryByRole("tablist")).toBeNull();
    }
  });
});
