import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MOCK_CUSTOMER_PASSWORD } from "@/data/mock/customer-portal-repository";
import { createMockStore } from "@/data/mock/seed";
import { formatDate } from "@/shared/lib/format-date";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { CustomerPortalProvider } from "@/shared/providers/customer-portal-provider";
import { CustomerPortalPage } from "./pages/customer-portal-page";

afterEach(cleanup);

// The seed is dated relative to today: read cust-b1's name, card and dates from the store.
const seed = createMockStore();
const customerB1 = seed.customers.find((item) => item.id === "cust-b1")!;
const membershipB1 = seed.memberships.find((item) => item.customerId === "cust-b1" && item.cardId)!;

function renderSignedOut() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MockStoreProvider store={createMockStore()}>
        <CustomerPortalProvider>
          <CustomerPortalPage />
        </CustomerPortalProvider>
      </MockStoreProvider>
    </QueryClientProvider>,
  );
}

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
  const addressBefore = structuredClone(store.customers.find((item) => item.id === "cust-b1")?.address);
  expect(addressBefore?.street).toBeTruthy();
  expect(await screen.findByRole("heading", { name: customerB1.displayName })).toBeInTheDocument();
  expect(await screen.findByText(new RegExp(membershipB1.cardId!))).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /Promo Points/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Stay Points/ })).toBeInTheDocument();
  expect(screen.getByText(/Benefit use is on hold/)).toBeInTheDocument();
  await user.click(within(await screen.findByRole("navigation", { name: "Portal sections" })).getByRole("button", { name: "Profile" }));
  await user.click(await screen.findByRole("button", { name: /Edit Contact/ }));
  const mobile = screen.getByRole("textbox", { name: "Mobile number" });
  await user.clear(mobile);
  await user.type(mobile, "09170000000");
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText("09170000000")).toBeInTheDocument();
  expect(store.customers.find((item) => item.id === "cust-b1")?.mobileNumber).toBe("09170000000");
  expect(store.customers.find((item) => item.id === "cust-b1")?.address).toEqual(addressBefore);
});

it("moves between the four app screens with the bottom tab bar", async () => {
  const user = userEvent.setup();
  renderPortal();
  const nav = await screen.findByRole("navigation", { name: "Portal sections" });
  expect(within(nav).getAllByRole("button").map((tab) => tab.textContent)).toEqual(["Home", "QR", "Activity", "Profile"]);
  expect(within(nav).getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await user.click(within(nav).getByRole("button", { name: "QR" }));
  expect(await screen.findByRole("heading", { name: "Your membership QR" })).toBeInTheDocument();
  expect(within(nav).getByRole("button", { name: "QR" })).toHaveAttribute("aria-current", "page");
  expect(screen.queryByRole("button", { name: /Promo Points/ })).toBeNull();
  await user.click(within(nav).getByRole("button", { name: "Activity" }));
  expect(await screen.findByRole("heading", { name: "Activity" })).toBeInTheDocument();
  await user.click(within(nav).getByRole("button", { name: "Profile" }));
  expect(await screen.findByRole("heading", { name: "Contact" })).toBeInTheDocument();
  const membership = screen.getByRole("region", { name: "Membership" });
  const rowOf = (label: string) => within(membership).getByText(label).closest("div")!;
  expect(rowOf("Activated")).toHaveTextContent(formatDate(membershipB1.activationDate));
  expect(rowOf("Valid until")).toHaveTextContent(formatDate(membershipB1.validityEndDate));
  // Activated sits directly above Valid until.
  expect(rowOf("Activated").nextElementSibling).toBe(rowOf("Valid until"));
});

it("opens a wallet breakdown when a Home tile is tapped", async () => {
  const user = userEvent.setup();
  renderPortal();
  await user.click(await screen.findByRole("button", { name: /Stay Points/ }));
  const dialog = await screen.findByRole("dialog", { name: "Stay Points" });
  expect(within(dialog).getByText("Weekday")).toBeInTheDocument();
  expect(within(dialog).getByText("Redeemed")).toBeInTheDocument();
});

it("lets the customer upload and remove a profile picture, and rejects a non-image", async () => {
  const user = userEvent.setup({ applyAccept: false });
  const { store } = renderPortal();
  await user.click(within(await screen.findByRole("navigation", { name: "Portal sections" })).getByRole("button", { name: "Profile" }));
  const input = await screen.findByLabelText("Profile picture file");
  await user.upload(input, new File(["x"], "notes.txt", { type: "text/plain" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Unsupported image format.");
  await user.upload(input, new File(["pixels"], "me.png", { type: "image/png" }));
  // The picture shows in the header and on the Profile screen.
  expect(await screen.findAllByRole("img", { name: `Profile picture of ${customerB1.displayName}` }, { timeout: 3000 })).toHaveLength(2);
  expect(store.customers.find((item) => item.id === "cust-b1")?.profilePhoto?.fileName).toBe("me.png");
  await user.click(screen.getByRole("button", { name: "Remove photo" }));
  await waitFor(() => expect(screen.queryByRole("img", { name: /Profile picture of/ })).toBeNull());
  expect(store.customers.find((item) => item.id === "cust-b1")?.profilePhoto).toBeNull();
});

it("shows a production-style customer login with no sample or prototype notes", () => {
  renderSignedOut();
  expect(screen.getByRole("heading", { name: "Customer Login" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Forgot Password?" })).toHaveAttribute("href", "/contact");
  expect(screen.queryByText(/sample|prototype|synthetic|demo/i)).toBeNull();
});

it("rejects a wrong password and signs in with the right one", async () => {
  const user = userEvent.setup();
  renderSignedOut();
  await user.type(screen.getByLabelText("Email"), customerB1.email!);
  await user.type(screen.getByLabelText("Password"), "wrong-password");
  await user.click(screen.getByRole("button", { name: "Sign In" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Incorrect email or password.");
  await user.clear(screen.getByLabelText("Password"));
  await user.type(screen.getByLabelText("Password"), MOCK_CUSTOMER_PASSWORD);
  await user.click(screen.getByRole("button", { name: "Sign In" }));
  expect(await screen.findByRole("heading", { name: customerB1.displayName })).toBeInTheDocument();
});
