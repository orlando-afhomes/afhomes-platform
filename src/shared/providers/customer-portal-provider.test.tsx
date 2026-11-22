import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMockStore } from "@/data/mock/seed";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { CustomerPortalProvider, useCustomerPortal } from "./customer-portal-provider";

afterEach(cleanup);

const SAMPLE_CUSTOMER_EMAIL = "customer.b1@afhomes.local";

function SessionActions() {
  const { signIn, signOut } = useCustomerPortal();
  return (
    <>
      <button type="button" onClick={() => signIn(SAMPLE_CUSTOMER_EMAIL)}>Sign in</button>
      <button type="button" onClick={signOut}>Sign out</button>
    </>
  );
}

function renderWithClient(client: QueryClient, initialCustomerId?: string) {
  render(
    <QueryClientProvider client={client}>
      <MockStoreProvider store={createMockStore()}>
        <CustomerPortalProvider initialCustomerId={initialCustomerId}>
          <SessionActions />
        </CustomerPortalProvider>
      </MockStoreProvider>
    </QueryClientProvider>,
  );
}

describe("customer portal session cache", () => {
  it("removes every customer-portal query when signing out", async () => {
    const user = userEvent.setup();
    const client = new QueryClient();
    const key = ["customer-portal", "cust-b1", "overview"] as const;
    client.setQueryData(key, { secret: "b1" });
    renderWithClient(client, "cust-b1");

    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(client.getQueryData(key)).toBeUndefined();
  });

  it("drops the previous customer's cache when another signs in", async () => {
    const user = userEvent.setup();
    const client = new QueryClient();
    const previous = ["customer-portal", "cust-a1", "overview"] as const;
    client.setQueryData(previous, { secret: "a1" });
    renderWithClient(client);

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(client.getQueryData(previous)).toBeUndefined();
  });
});
