import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMockStore } from "@/data/mock/seed";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { CustomerPortalProvider } from "@/shared/providers/customer-portal-provider";
import { CustomerPortalPage } from "./pages/customer-portal-page";

afterEach(cleanup);

function renderPortal() {
  const store = createMockStore();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MockStoreProvider store={store}>
        <CustomerPortalProvider initialCustomerId="cust-b1">
          <CustomerPortalPage />
        </CustomerPortalProvider>
      </MockStoreProvider>
    </QueryClientProvider>,
  );
  return { store };
}

it("shows the signed-in customer's membership, separate wallets and contact-only edit", async () => {
  const user = userEvent.setup();
  const { store } = renderPortal();
  expect(await screen.findByRole("heading", { name: "Customer B One" })).toBeInTheDocument();
  expect(await screen.findByText("26110200001B1T04S")).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: "Promo Points" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Stay Points" })).toBeInTheDocument();
  expect(screen.getByText(/Financial hold/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /Edit Contact/ }));
  const mobile = screen.getByRole("textbox", { name: "Mobile number" });
  await user.clear(mobile);
  await user.type(mobile, "09170000000");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText("09170000000")).toBeInTheDocument();
  expect(store.customers.find((item) => item.id === "cust-b1")?.mobileNumber).toBe("09170000000");
  expect(store.customers.find((item) => item.id === "cust-b1")?.address).toEqual({ street: "5 Orchid Lane", province: "Batangas", city: "Batangas City", barangay: "Cuta", postalCode: "4200" });
});
