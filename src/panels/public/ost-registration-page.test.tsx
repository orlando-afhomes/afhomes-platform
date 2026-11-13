import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { MockStoreProvider, useMockStore } from "@/shared/providers/mock-store-provider";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import type { MockStore } from "@/data/mock/seed";
import { OstRegistrationPage } from "./pages/ost-registration-page";

const SPONSOR_CODE = "TEST-REF-001";
let currentStore: MockStore;

/** Gives one active SM (the parent level an OST registers under) a referral code and approves all accreditations. */
function seedSponsor(store: MockStore) {
  currentStore = store;
  const sponsor = store.members.find((member) => member.designation === "SM" && member.status === "active");
  if (sponsor) sponsor.referralCode = SPONSOR_CODE;
  // Sponsor eligibility also checks the upline, so approve every record with a far expiry.
  for (const record of store.accreditations) {
    record.adminStatus = "active";
    record.expiryDate = "2099-12-31";
  }
}

function SeededSponsor({ children }: { children: ReactNode }) {
  seedSponsor(useMockStore());
  return <>{children}</>;
}

function Wrapper() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider>
          <SeededSponsor>
            <OstRegistrationPage />
          </SeededSponsor>
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(cleanup);

type User = ReturnType<typeof userEvent.setup>;

async function verifyAndConfirm(user: User) {
  fireEvent.change(screen.getByLabelText(/Referral code/), { target: { value: SPONSOR_CODE } });
  await user.click(screen.getByRole("button", { name: "Verify referral code" }));
  const summary = await screen.findByRole("status");
  expect(within(summary).getByText("Verified eligible sponsor")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Confirm sponsor" }));
}

function field(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`#${id} not found`);
  return element;
}

async function fillApplicant(user: User) {
  fireEvent.change(field("applicant-first-name"), { target: { value: "Ana" } });
  await user.click(screen.getByRole("checkbox", { name: /no middle/i }));
  fireEvent.change(field("applicant-last-name"), { target: { value: "Cruz" } });
  fireEvent.change(field("applicant-mobile"), { target: { value: "09175550123" } });
  fireEvent.change(field("applicant-birth-date"), { target: { value: "1990-01-15" } });
  fireEvent.change(field("applicant-email"), { target: { value: "ana.cruz@example.com" } });
}

async function pickAddressOption(user: User, label: string, filter: string, option: RegExp) {
  const combo = screen.getByRole("combobox", { name: label }) as HTMLInputElement;
  await user.click(combo);
  if (combo.value) await user.clear(combo);
  await user.type(combo, filter);
  await user.click(await screen.findByRole("option", { name: option }));
}

describe("OST registration", () => {
  it("starts on the referral step and asks for a code", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Referral");
    await user.click(screen.getByRole("button", { name: "Verify referral code" }));
    expect(await screen.findByText("Enter a referral code.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Referral code/)).toHaveAttribute("aria-invalid", "true");
  });

  it("shows a generic message for an unknown referral code", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    fireEvent.change(screen.getByLabelText(/Referral code/), { target: { value: "NOPE" } });
    await user.click(screen.getByRole("button", { name: "Verify referral code" }));
    expect(await screen.findByText("Referral code is invalid or currently unavailable.")).toBeInTheDocument();
  });

  it("blocks each step until its fields are valid and shows no developer or preview text", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await verifyAndConfirm(user);
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    expect(await screen.findByText("First name is required.")).toBeInTheDocument();
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Applicant");
    fireEvent.change(field("applicant-email"), { target: { value: "not-an-email" } });
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Email must be valid.")).toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(/prototype|preview|not yet enabled/i);
  });

  it("submits the application and shows a neutral confirmation with a reference code", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    await verifyAndConfirm(user);
    await fillApplicant(user);
    await user.click(await screen.findByRole("button", { name: "Continue" }));

    fireEvent.change(await screen.findByRole("textbox", { name: "No./Street/Subdivision" }), { target: { value: "123 Maharlika Street" } });
    await pickAddressOption(user, "Province", "Metro Manila", /^metro manila$/i);
    await waitFor(() => expect(screen.getByRole("combobox", { name: "City/Municipality" })).toBeEnabled());
    await pickAddressOption(user, "City/Municipality", "Makati", /^makati city$/i);
    await pickAddressOption(user, "Barangay", "San Antonio", /^san antonio$/i);
    await user.click(screen.getByRole("button", { name: "Review" }));

    expect(await screen.findByText("Ana Cruz")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Submit application" }));

    expect(await screen.findByText("Application received")).toBeInTheDocument();
    expect(screen.getByText(/office will review your application and contact you/i)).toBeInTheDocument();
    const reference = currentStore.registrationApplications[0].reference;
    expect(screen.getByText(reference)).toBeInTheDocument();
    expect(currentStore.registrationApplications).toHaveLength(1);
    expect(currentStore.registrationApplications[0]).toMatchObject({ status: "submitted", memberId: null, accountId: null });
    // Neutral: nothing internal is shown to the applicant.
    expect(document.body.textContent ?? "").not.toMatch(/reg-1|mem-sm-a|AAO/);
  }, 30000);
});
