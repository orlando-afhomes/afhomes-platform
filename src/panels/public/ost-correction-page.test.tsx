import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { MockStoreProvider, useMockStore } from "@/shared/providers/mock-store-provider";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import type { MockStore } from "@/data/mock/seed";
import type { RegistrationApplication } from "@/modules/accreditation/types";
import { OstCorrectionPage } from "./pages/ost-correction-page";

const TOKEN = "a".repeat(32);
const FIXTURE_ID = "reg-correction-test";
let currentStore: MockStore;

function captureStore(store: MockStore) {
  currentStore = store;
}
let routeToken = TOKEN;

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useParams: () => ({ token: routeToken }),
}));

function returnedApplication(): RegistrationApplication {
  const applicant = {
    firstName: "Ana",
    middleName: "",
    noMiddleName: true,
    lastName: "Cruz",
    suffix: "",
    mobileNumber: "09175550000",
    email: "ana.cruz@example.com",
    dateOfBirth: "1990-01-15",
    street: "1 Main Street",
    province: "Metro Manila",
    city: "Makati City",
    barangay: "San Antonio",
    postalCode: "1203",
  };
  const at = "2026-11-10T01:00:00.000Z";
  return {
    id: FIXTURE_ID,
    reference: "OSTA-11111111",
    classification: "OST",
    memberId: null,
    accountId: null,
    sponsorMemberId: "mem-sm-a",
    sponsorLabel: "Jose Reyes Jr. (SM)",
    status: "needs_info",
    createdAt: at,
    updatedAt: at,
    submittedAt: at,
    decidedAt: null,
    reviewerId: "dev-admin",
    history: [],
    applicant,
    version: 1,
    versions: [{ version: 1, submittedAt: at, applicant, returnReason: "Birth date is wrong." }],
    completion: null,
    correctionToken: TOKEN,
    decisionReason: "Birth date is wrong.",
  };
}

function Seeded({ children }: { children: ReactNode }) {
  const store = useMockStore();
  captureStore(store);
  // The seed has its own applications; add this returned one once, under its own id and token.
  if (!store.registrationApplications.some((item) => item.id === FIXTURE_ID)) store.registrationApplications.push(returnedApplication());
  return <>{children}</>;
}

const fixtureOf = (store: MockStore) => store.registrationApplications.find((item) => item.id === FIXTURE_ID)!;

function Wrapper() {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider>
          <Seeded>
            <OstCorrectionPage />
          </Seeded>
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  routeToken = TOKEN;
});

describe("OST correction link", () => {
  it("shows what the office asked for and sends the corrected application as a new version", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    expect(await screen.findByText("Birth date is wrong.")).toBeInTheDocument();
    fireEvent.change(document.getElementById("applicant-birth-date") as HTMLElement, { target: { value: "1991-01-15" } });
    await user.click(screen.getByRole("button", { name: "Resend application" }));
    expect(await screen.findByText("Corrected Application Received")).toBeInTheDocument();
    expect(screen.getAllByText("OSTA-11111111").length).toBeGreaterThan(0);
    const stored = fixtureOf(currentStore);
    expect(stored).toMatchObject({ status: "submitted", version: 2, correctionToken: null });
    expect(stored.applicant.dateOfBirth).toBe("1991-01-15");
  });

  it("shows a neutral message for a link that is not valid", async () => {
    routeToken = "b".repeat(32);
    render(<Wrapper />);
    expect(await screen.findByText("Link not valid")).toBeInTheDocument();
    expect(screen.getByText(/This link is not valid any more/)).toBeInTheDocument();
    expect(screen.queryByText("Birth date is wrong.")).not.toBeInTheDocument();
  });

  it("shows a resend error state when the application can no longer be corrected", async () => {
    const user = userEvent.setup();
    render(<Wrapper />);
    expect(await screen.findByText("Birth date is wrong.")).toBeInTheDocument();
    // The office approved or withdrew the application between opening the link and resending.
    fixtureOf(currentStore).status = "submitted";
    await user.click(screen.getByRole("button", { name: "Resend application" }));
    expect(await screen.findByText("Could not resend")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/could not accept this application online/i);
  });
});
