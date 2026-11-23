import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { issueHolderCode } from "@/data/mock/member-qr-repository";
import { createMockStore } from "@/data/mock/seed";
import { manilaToday } from "@/shared/lib/dates";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { CustomerLookupPage } from "./pages/customer-lookup-panel";

const camera = vi.hoisted(() => ({ decode: vi.fn() }));
vi.mock("@zxing/browser", () => ({
  BrowserQRCodeReader: class { decodeFromConstraints = camera.decode; },
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("lets GSD verify by name and opens both points actions from the customer's QR", async () => {
  const store = createMockStore();
  const holder = issueHolderCode(store, "memb-1", "primary")!;
  const controls = { stop: vi.fn() };
  camera.decode.mockImplementation(async (_constraints, _video, callback) => {
    callback({ getText: () => holder.code }, undefined, controls);
    return controls;
  });
  vi.stubGlobal("navigator", Object.create(window.navigator, { mediaDevices: { value: { getUserMedia: vi.fn() } } }));
  const user = userEvent.setup();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}>
    <MockStoreProvider store={store}>
      <DevIdentityProvider initialIdentityId="dev-gsd"><CustomerLookupPage /></DevIdentityProvider>
    </MockStoreProvider>
  </QueryClientProvider>);

  await user.type(await screen.findByRole("searchbox", { name: "Find customer" }), holder.holderName);
  await user.click(await screen.findByRole("button", { name: new RegExp(holder.vipNumber) }));
  expect(screen.getByText("Active membership")).toBeVisible();
  expect(screen.queryByRole("button", { name: "Earn Points" })).toBeNull();

  await user.click(screen.getByRole("button", { name: "Scan QR" }));
  await user.click(await screen.findByRole("button", { name: "Earn Points" }));
  const purchase = await screen.findByRole("dialog", { name: "Earn Points" });
  expect(within(purchase).getByLabelText(/Purchase Date/)).toHaveValue(manilaToday());
  expect(within(purchase).getByRole("textbox", { name: /Total Bill Amount/ })).toBeVisible();
  expect(within(purchase).getByRole("textbox", { name: /Amount Not Eligible for Points/ })).toBeVisible();
  expect(within(purchase).getByRole("textbox", { name: /Service Used/ })).toBeVisible();
  expect(within(purchase).getByRole("textbox", { name: /Receipt Number/ })).toBeDisabled();
  expect(within(purchase).getByRole("button", { name: "Submit for Review" })).toBeVisible();
  await user.keyboard("{Escape}");

  await user.click(screen.getByRole("button", { name: "Redeem Points" }));
  expect(screen.queryByRole("button", { name: "Use Points for a Reward" })).toBeNull();
  await user.click(screen.getByRole("checkbox", { name: /checked the cardholder/ }));
  await user.click(screen.getByRole("button", { name: "Use Points for a Reward" }));
  expect(await screen.findByRole("combobox", { name: /Offer/ })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Use Points for an Overnight Stay" }));
  expect(await screen.findByRole("table", { name: "Redemption Bookings" })).toBeVisible();
});
