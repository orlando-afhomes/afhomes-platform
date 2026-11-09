import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider, useMockStore } from "@/shared/providers/mock-store-provider";
import type { MockStore } from "@/data/mock/seed";
import { AccreditedSellerDialog } from "./pages/sales-network-accredited-seller-dialog";

/** Seeded accreditations are pending; approve them so sponsors are eligible. */
function approveAll(store: MockStore) {
  for (const record of store.accreditations) record.adminStatus = "active";
}

function ApprovedSeed({ children }: { children: ReactNode }) {
  approveAll(useMockStore());
  return <>{children}</>;
}

function TestWrapper({ identityId = "dev-super-admin" }: { identityId?: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <ApprovedSeed>
            <AccreditedSellerDialog mode="OST" open onClose={() => undefined} />
          </ApprovedSeed>
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

beforeAll(() => {
  URL.createObjectURL = () => "blob:test-photo";
  URL.revokeObjectURL = () => undefined;
});

afterEach(() => {
  cleanup();
  toast.dismiss();
});

function field(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`#${id} not found`);
  return element;
}

async function fillPersonalStep(user: ReturnType<typeof userEvent.setup>, dialog: HTMLElement) {
  const file = new File(["x"], "photo.png", { type: "image/png" });
  fireEvent.change(dialog.querySelector('input[type="file"]') as HTMLElement, { target: { files: [file] } });
  fireEvent.change(field("first-name"), { target: { value: "Sponsor" } });
  await user.click(within(dialog).getByRole("checkbox", { name: /no middle/i }));
  fireEvent.change(field("last-name"), { target: { value: "Tester" } });
  fireEvent.change(field("mobile"), { target: { value: "09171234567" } });
  fireEvent.change(field("dob"), { target: { value: "1990-01-15" } });
  fireEvent.change(field("seller-email"), { target: { value: "sponsor.tester@afhomes.local" } });
  fireEvent.change(field("temp-password"), { target: { value: "password1234" } });
  fireEvent.change(field("confirm-password"), { target: { value: "password1234" } });
}

async function fillAddressStep() {
  fireEvent.change(await screen.findByLabelText(/Street Address/), { target: { value: "123 Maharlika Street" } });
  fireEvent.change(screen.getByLabelText(/Province/), { target: { value: "Metro Manila" } });
  fireEvent.change(screen.getByLabelText(/^City/), { target: { value: "Makati City" } });
  fireEvent.change(screen.getByLabelText(/Barangay/), { target: { value: "San Antonio" } });
  fireEvent.change(screen.getByLabelText(/ZIP Code/), { target: { value: "1203" } });
}

describe("accredited seller wizard", () => {
  it("blocks Next with inline errors until the personal step is complete", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const dialog = await screen.findByRole("dialog", { name: "Add OST" });
    await user.click(within(dialog).getByRole("button", { name: /next/i }));
    expect(await within(dialog).findByText("Profile photo is required.")).toBeInTheDocument();
    expect(within(dialog).getByText("First name is required.")).toBeInTheDocument();
    expect(within(dialog).getByRole("listitem", { current: "step" })).toHaveTextContent("Personal");
  });

  it("selects a sponsor on the assignment step without throwing", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const dialog = await screen.findByRole("dialog", { name: "Add OST" });

    await fillPersonalStep(user, dialog);
    await user.click(within(dialog).getByRole("button", { name: /next/i }));

    await fillAddressStep();
    await user.click(within(dialog).getByRole("button", { name: /next/i }));

    // Assignment step: choose a sponsor. Previously threw ReferenceError: teamDisplayName is not defined.
    const sponsor = await within(dialog).findByRole("combobox", { name: "Sponsor" });
    await user.click(sponsor);
    const option = await screen.findAllByRole("option");
    expect(option.length).toBeGreaterThan(0);
    await user.click(option[0]);

    // The sponsor list is searchable, so the chosen option shows as the input value.
    await waitFor(() => expect((within(dialog).getByRole("combobox", { name: "Sponsor" }) as HTMLInputElement).value).toMatch(/\((SVD|SSM|SM)\)/));
    expect(screen.queryByText(/Sponsor is required/i)).toBeNull();
  });

  it("restricts completion to a Super Administrator", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    const dialog = await screen.findByRole("dialog", { name: "Add OST" });
    expect(within(dialog).getByText("Super Administrator completion required")).toBeInTheDocument();
  });
});
