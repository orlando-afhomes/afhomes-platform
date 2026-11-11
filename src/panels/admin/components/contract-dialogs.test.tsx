import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ContractView } from "@/data/contracts/contract-repository";
import { useCustomers } from "@/data/queries";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider, useMockStore } from "@/shared/providers/mock-store-provider";
import { ContractReviewDetailPage } from "../pages/contract-review-detail-page";
import { RaDialog } from "./contract-dialogs";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin",
}));

afterEach(cleanup);

function Wrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId="dev-admin">{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

function contractWith(id: string, raNumber: string | null) {
  return { id, raNumber } as unknown as ContractView;
}

/** Test fixture: sets the customer's Customer ID and clears a membership Card ID so the RA action is available. */
function StoreSetup({ customerId, customerNumber, contractId }: { customerId: string; customerNumber: string; contractId: string }) {
  const store = useMockStore();
  const customer = store.customers.find((item) => item.id === customerId);
  if (customer) customer.customerNumber = customerNumber;
  const membership = store.memberships.find((item) => item.contractId === contractId);
  if (membership) membership.cardId = null;
  return null;
}

/** Waits for the customers query the page uses to resolve, so the RA suggestion is deterministic. */
function CustomersReady() {
  const customers = useCustomers();
  return customers.data ? <span data-testid="customers-ready" /> : null;
}

describe("RaDialog", () => {
  it("prefills a blank RA number from the customer's Customer ID", () => {
    render(
      <Wrapper>
        <RaDialog contract={contractWith("ctr-1", null)} suggestedRa="2026-0042" onClose={() => {}} />
      </Wrapper>,
    );

    const input = screen.getByRole("textbox", { name: /RA number/ });
    expect(input).toHaveValue("2026-0042");
    expect(input).toHaveAccessibleDescription("Matches the customer's Customer ID sequence.");
  });

  it("never overwrites an RA number already recorded on the contract", () => {
    render(
      <Wrapper>
        <RaDialog contract={contractWith("ctr-2", "2026-0001")} suggestedRa="2026-0042" onClose={() => {}} />
      </Wrapper>,
    );

    const input = screen.getByRole("textbox", { name: /RA number/ });
    expect(input).toHaveValue("2026-0001");
    expect(input).toHaveAccessibleDescription("For example 2027-0001. The official numbering format is pending an owner decision.");
  });

  it("stays empty when neither the contract nor the customer has a number", () => {
    render(
      <Wrapper>
        <RaDialog contract={contractWith("ctr-1", null)} suggestedRa={null} onClose={() => {}} />
      </Wrapper>,
    );

    expect(screen.getByRole("textbox", { name: /RA number/ })).toHaveValue("");
  });

  it("prefills the page dialog from the linked customer's Customer ID", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <StoreSetup customerId="cust-a1" customerNumber="2026-0042" contractId="ctr-1" />
        <CustomersReady />
        <ContractReviewDetailPage contractId="ctr-1" />
      </Wrapper>,
    );

    await screen.findByTestId("customers-ready");
    await user.click(await screen.findByRole("button", { name: "Record RA number" }));

    expect(await screen.findByRole("textbox", { name: /RA number/ })).toHaveValue("2026-0042");
  });

  it("keeps an existing contract RA even when the customer has a Customer ID", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <StoreSetup customerId="cust-b1" customerNumber="2026-0042" contractId="ctr-2" />
        <CustomersReady />
        <ContractReviewDetailPage contractId="ctr-2" />
      </Wrapper>,
    );

    await screen.findByTestId("customers-ready");
    await user.click(await screen.findByRole("button", { name: "Record RA number" }));

    expect(await screen.findByRole("textbox", { name: /RA number/ })).toHaveValue("2026-0001");
  });
});
