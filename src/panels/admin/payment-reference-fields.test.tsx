import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { CustomerFormPage } from "./pages/customer-form-page";
import { PaymentSubmitDialog } from "./components/payment-actions";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin",
}));

function Wrapper({ identityId, children }: { identityId: string; children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <AppToaster />
          {children}
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

function show(identityId: string, page: ReactElement) {
  return render(<Wrapper identityId={identityId}>{page}</Wrapper>);
}

afterEach(() => {
  cleanup();
  toast.dismiss();
});

const EWALLET_HINT = "12-16 letters or digits, uppercase; no spaces or symbols.";
const BANK_HINT = "6-20 letters or digits, uppercase; no spaces or symbols.";
const CHEQUE_HINT = "Letters, digits, spaces, and , . / - only.";
const EWALLET_ERROR = "E-wallet references must be 12 to 16 letters or digits, uppercase, with no spaces or symbols.";
const BANK_ERROR = "Bank references must be 6 to 20 letters or digits, uppercase, with no spaces or symbols.";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Types into a searchable combobox and clicks the exact option. */
async function pickFilteredOption(user: ReturnType<typeof userEvent.setup>, combo: HTMLElement, filter: string, name: string | RegExp) {
  await user.click(combo);
  if ((combo as HTMLInputElement).value) await user.clear(combo);
  await user.type(combo, filter);
  await user.click(await screen.findByRole("option", { name }));
}

/** Residential address completion, province-first, matching the wizard's combobox contract. */
async function fillResidentialAddress(user: ReturnType<typeof userEvent.setup>, card: HTMLElement, province: string, city: string, barangay: string) {
  const cityCombo = () => within(card).getByRole("combobox", { name: /city/i });
  const provinceCombo = () => within(card).getByRole("combobox", { name: /^province/i });
  await pickFilteredOption(user, provinceCombo(), province, new RegExp(`^${escapeRegExp(province)}$`, "i"));
  await waitFor(() => expect((provinceCombo() as HTMLInputElement).value).toBe(province));
  await waitFor(() => expect(cityCombo()).toBeEnabled());
  await pickFilteredOption(user, cityCombo(), city, new RegExp(`^${escapeRegExp(city)}$`, "i"));
  await waitFor(() => expect((cityCombo() as HTMLInputElement).value).toBe(city));
  await pickFilteredOption(user, within(card).getByRole("combobox", { name: /^barangay/i }), barangay, new RegExp(`^${escapeRegExp(barangay)}$`, "i"));
}

/** Walks the wizard with valid data up to the Reservation step (Application form). */
async function reachReservationStep(user: ReturnType<typeof userEvent.setup>) {
  show("dev-sm-a", <CustomerFormPage />);
  await user.click(await screen.findByRole("radio", { name: /silver vip/i }));
  await user.click(screen.getByRole("button", { name: /continue/i }));
  const schemes = await screen.findByRole("radiogroup", { name: "Payment scheme" });
  const scheme = within(schemes).getAllByRole("radio").find((item) => item.getAttribute("aria-disabled") !== "true" && !item.hasAttribute("data-disabled"))!;
  await user.click(scheme);
  await user.click(screen.getByRole("radio", { name: /standard \(s\)/i }));
  await user.click(screen.getByRole("button", { name: /continue/i }));

  const addressCard = (await screen.findByRole("heading", { name: "Address" })).closest(".customer-application__block") as HTMLElement;
  await user.type(screen.getByLabelText(/first name/i), "Maria");
  await user.type(screen.getByLabelText(/last name/i), "Reyes");
  fireEvent.change(screen.getByLabelText(/date of birth/i), { target: { value: "1990-05-01" } });
  await user.click(within(screen.getByRole("radiogroup", { name: "Gender" })).getByRole("radio", { name: "Male" }));
  await user.click(within(screen.getByRole("radiogroup", { name: "Civil status" })).getByRole("radio", { name: "Single" }));
  await user.type(screen.getByLabelText(/mobile number/i), "09171110009");
  await fillResidentialAddress(user, addressCard, "Cebu", "Lapu-Lapu City", "Pajo");
  await user.click(screen.getByRole("button", { name: /continue/i }));

  await screen.findByText("Sales attribution");
  await user.click(screen.getByRole("checkbox", { name: /processing of personal data/i }));
  await user.click(screen.getByRole("checkbox", { name: /specimen signatures/i }));
  await user.click(screen.getByRole("button", { name: /continue/i }));
  await screen.findByRole("heading", { name: "Application form" });
}

function referenceInput() {
  return screen.getByLabelText(/receipt or reference number/i) as HTMLInputElement;
}

describe("customer application wizard reservation reference field", () => {
  it("uppercases and filters a GCash reference, shows the e-wallet hint, and validates on blur", async () => {
    const user = userEvent.setup();
    await reachReservationStep(user);
    await user.click(screen.getByRole("radio", { name: "GCash" }));

    const input = referenceInput();
    expect(input).toHaveAttribute("maxlength", "16");
    expect(screen.getByText(EWALLET_HINT)).toBeInTheDocument();

    await user.type(input, "abc-12 3!");
    // Lowercase is raised and the hyphen, space, and bang are dropped.
    expect(input.value).toBe("ABC123");
    // Nothing is flagged before the field is left.
    expect(screen.queryByText(EWALLET_ERROR)).toBeNull();

    fireEvent.blur(input);
    expect(await screen.findByText(EWALLET_ERROR)).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    // The error replaces the hint while it is shown.
    expect(screen.queryByText(EWALLET_HINT)).toBeNull();

    await user.clear(input);
    await user.type(input, "abc123456789");
    expect(input.value).toBe("ABC123456789");
    fireEvent.blur(input);
    expect(screen.queryByText(EWALLET_ERROR)).toBeNull();
    expect(screen.getByText(EWALLET_HINT)).toBeInTheDocument();
  });

  it("keeps cheque separators and shows the cheque hint", async () => {
    const user = userEvent.setup();
    await reachReservationStep(user);
    await user.click(screen.getByRole("radio", { name: "Cheque" }));

    const input = referenceInput();
    expect(input).toHaveAttribute("maxlength", "30");
    expect(screen.getByText(CHEQUE_HINT)).toBeInTheDocument();

    // A pasted cheque reference arrives in one event, so its printed spaces survive.
    await user.click(input);
    await user.paste("chq 001/a-2");
    expect(input.value).toBe("CHQ 001/A-2");

    // Live typing keeps the printed slashes and hyphens too.
    await user.clear(input);
    await user.type(input, "chq-001/a-2");
    expect(input.value).toBe("CHQ-001/A-2");
    fireEvent.blur(input);
    expect(screen.queryByText(/Cheque references must be/)).toBeNull();
  });

  // Full submit path with combobox address picks; needs headroom over the 15s project default under load.
  it("blocks application submission with an invalid GCash reference and surfaces the message on the Reservation step", { timeout: 30_000 }, async () => {
    const user = userEvent.setup();
    await reachReservationStep(user);
    await user.click(screen.getByRole("radio", { name: "GCash" }));

    const input = referenceInput();
    await user.type(input, "ABC");
    expect(screen.queryByText(EWALLET_ERROR)).toBeNull();
    fireEvent.blur(input);
    expect(await screen.findByText(EWALLET_ERROR)).toBeInTheDocument();

    const proof = screen.getByLabelText(/proof of payment/i) as HTMLInputElement;
    fireEvent.change(proof, { target: { files: [new File(["proof"], "receipt.png", { type: "image/png" })] } });
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await screen.findByRole("heading", { name: "Review the application" });

    await user.click(screen.getByRole("checkbox", { name: /customer reviewed and accepted/i }));
    await user.click(screen.getByRole("button", { name: /submit application/i }));

    // Blocked: still on Review, and nothing was submitted to Finance.
    expect(screen.getByRole("heading", { name: "Review the application" })).toBeInTheDocument();
    expect(screen.queryByText(/waiting for Finance verification/i)).toBeNull();
    expect(screen.queryByText(/application submitted/i)).toBeNull();

    // The Review step renders no reference error, so the field message is
    // observed on the Reservation step that the Review section edits.
    await user.click(screen.getByRole("button", { name: "Edit Reservation and acceptance" }));
    const again = referenceInput();
    expect(again.value).toBe("ABC");
    expect(await screen.findByText(EWALLET_ERROR)).toBeInTheDocument();
    expect(again).toHaveAttribute("aria-invalid", "true");
  });
});

describe("finance payment dialog reference field", () => {
  it("uppercases and filters the reference and validates by the selected method", async () => {
    const user = userEvent.setup();
    show("dev-finance", <PaymentSubmitDialog contractId="ctr-1" open onClose={() => {}} />);

    const input = referenceInput();
    expect(input).toHaveAttribute("maxlength", "20");
    expect(screen.getByText(BANK_HINT)).toBeInTheDocument();

    await user.type(input, "abc-12");
    expect(input.value).toBe("ABC12");
    fireEvent.blur(input);
    expect(await screen.findByText(BANK_ERROR)).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Method" }));
    await user.click(await screen.findByRole("option", { name: "GCash" }));
    expect(input).toHaveAttribute("maxlength", "16");
    // The bank value is shorter than the e-wallet minimum, so clearing it lets the hint return.
    await user.clear(input);
    expect(screen.getByText(EWALLET_HINT)).toBeInTheDocument();

    await user.type(input, "abc-12 3!");
    expect(input.value).toBe("ABC123");
    fireEvent.blur(input);
    expect(await screen.findByText(EWALLET_ERROR)).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "gcash12345678");
    expect(input.value).toBe("GCASH12345678");
    fireEvent.blur(input);
    expect(screen.queryByText(EWALLET_ERROR)).toBeNull();
  });
});
