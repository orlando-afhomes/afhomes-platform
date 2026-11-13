import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { ListsPage } from "./pages/lists-page";

function TestWrapper({ identityId = "dev-admin" }: { identityId?: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <AppToaster />
          <ListsPage />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  toast.dismiss();
});

type User = ReturnType<typeof userEvent.setup>;
const rowFor = (name: string) => screen.getByText(name).closest("tr")!;

async function openRowAction(user: User, row: HTMLElement, action: string) {
  await user.click(within(row).getByRole("button", { name: /actions for/i }));
  await user.click(await screen.findByRole("menuitem", { name: new RegExp(action) }));
}

describe("lists page", () => {
  it("shows the seeded program categories with corrected labels and filters by search", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    expect(await screen.findByText("VIP Privilege Card Holder")).toBeInTheDocument();
    expect(screen.queryByText(/Previllage/)).toBeNull();
    await user.type(screen.getByRole("searchbox", { name: /search program categories/i }), "non-vip");
    expect(screen.queryByText("VIP Privilege Card Holder")).toBeNull();
    expect(screen.getByText("Non-VIP Client")).toBeInTheDocument();
  });

  it("adds a bank, then deletes it because no record uses it", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Non-VIP Client");
    await user.click(screen.getByRole("tab", { name: /Banks/ }));
    await user.click(screen.getByRole("button", { name: /add bank/i }));
    fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: "Test Savings Bank" } });
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    const table = await screen.findByRole("table", { name: "Banks" });
    await within(table).findByText("Test Savings Bank");

    await openRowAction(user, within(table).getByText("Test Savings Bank").closest("tr")!, "Delete");
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(within(table).queryByText("Test Savings Bank")).toBeNull());
  });

  it("blocks Delete with the reason for a used outlet", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Non-VIP Client");
    await user.click(screen.getByRole("tab", { name: /Outlets/ }));
    const row = await waitFor(() => rowFor("AFhomes Smart Wellness Hotel"));
    await user.click(within(row).getByRole("button", { name: /actions for/i }));
    expect(await screen.findByText(/Delete unavailable: Existing records use this entry/)).toBeInTheDocument();
    expect(screen.getByText("Teppanyaki Restaurant")).toBeInTheDocument();
  });

  it("is not available to a role without the lists operation", async () => {
    render(<TestWrapper identityId="dev-finance" />);
    expect(await screen.findByText(/does not have access to Lists/)).toBeInTheDocument();
  });
});
