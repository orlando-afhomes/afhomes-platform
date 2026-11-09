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

/** Gives one active SM (the parent level an OST registers under) a referral code and approves all accreditations. */
function seedSponsor(store: MockStore) {
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

describe("OST registration preview", () => {
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

  it("walks a verified sponsor through the applicant and review steps without submitting", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    fireEvent.change(screen.getByLabelText(/Referral code/), { target: { value: SPONSOR_CODE } });
    await user.click(screen.getByRole("button", { name: "Verify referral code" }));
    const summary = await screen.findByRole("status");
    expect(within(summary).getByText("Verified eligible sponsor")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm sponsor" }));

    // Applicant step validates required names and email format.
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    expect(await screen.findByText(/First name and last name are required/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: "Ana" } });
    fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: "Cruz" } });
    fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: "not-an-email" } });
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Enter a valid email address or leave it blank.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Email address/), { target: { value: "ana@example.com" } });
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await user.click(await screen.findByRole("button", { name: "Review" }));
    expect(await screen.findByText("Ana Cruz")).toBeInTheDocument();
    expect(screen.getByText(/Application submission is not yet enabled/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Return to start" }));
    await waitFor(() => expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent("Referral"));
  });
});
