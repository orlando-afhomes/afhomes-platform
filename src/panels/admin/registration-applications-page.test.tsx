import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider, useMockStore } from "@/shared/providers/mock-store-provider";
import type { MockStore } from "@/data/mock/seed";
import type { RegistrationApplication } from "@/modules/accreditation/types";
import { RegistrationApplicationsPage } from "./pages/registration-applications-page";

let currentStore: MockStore;

function captureStore(store: MockStore) {
  currentStore = store;
}

function application(overrides: Partial<RegistrationApplication> & { id: string; reference: string; firstName: string }): RegistrationApplication {
  const { id, reference, firstName, ...rest } = overrides;
  const applicant = {
    firstName,
    middleName: "",
    noMiddleName: true,
    lastName: "Tester",
    suffix: "",
    mobileNumber: "09175550000",
    email: `${firstName.toLowerCase()}@example.com`,
    dateOfBirth: "1990-01-15",
    street: "1 Main Street",
    province: "Metro Manila",
    city: "Makati City",
    barangay: "San Antonio",
    postalCode: "1203",
  };
  return {
    id,
    reference,
    classification: "OST",
    memberId: null,
    accountId: null,
    sponsorMemberId: "mem-sm-a",
    sponsorLabel: "Jose Reyes Jr. (SM)",
    status: "submitted",
    createdAt: "2026-11-10T01:00:00.000Z",
    updatedAt: "2026-11-10T01:00:00.000Z",
    submittedAt: "2026-11-10T01:00:00.000Z",
    decidedAt: null,
    reviewerId: null,
    history: [{ operation: "submitted", previousStatus: null, newStatus: "submitted", actorId: "applicant", changedAt: "2026-11-10T01:00:00.000Z", note: null }],
    applicant,
    version: 1,
    versions: [{ version: 1, submittedAt: "2026-11-10T01:00:00.000Z", applicant, returnReason: null }],
    completion: null,
    correctionToken: null,
    decisionReason: null,
    ...rest,
  };
}

function Seeded({ prepare, children }: { prepare?: (store: MockStore) => void; children: ReactNode }) {
  const store = useMockStore();
  captureStore(store);
  if (store.registrationApplications.length === 0) {
    store.registrationApplications.push(
      application({ id: "reg-1", reference: "OSTA-11111111", firstName: "Ana" }),
      application({ id: "reg-2", reference: "OSTA-22222222", firstName: "Ben", status: "approved" }),
    );
    prepare?.(store);
  }
  return <>{children}</>;
}

function Wrapper({ identityId, prepare, children }: { identityId: string; prepare?: (store: MockStore) => void; children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <Seeded prepare={prepare}>{children}</Seeded>
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  toast.dismiss();
});

const rows = () => [...document.querySelectorAll("tbody tr[data-row-key]")] as HTMLElement[];

async function openActions(user: ReturnType<typeof userEvent.setup>, reference: string) {
  await waitFor(() => expect(rows().length).toBeGreaterThan(0), { timeout: 5000 });
  const row = rows().find((item) => item.textContent?.includes(reference));
  if (!row) throw new Error(`Row ${reference} not found`);
  await user.click(within(row).getByRole("button", { name: /actions for/i }));
}

describe("OST applications queue", () => {
  it("lists applications for an Administrator and filters by status and search", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper identityId="dev-admin">
        <RegistrationApplicationsPage />
      </Wrapper>,
    );
    await waitFor(() => expect(rows()).toHaveLength(2), { timeout: 5000 });
    await user.click(screen.getByRole("combobox", { name: "Status filter" }));
    await user.click(await screen.findByRole("option", { name: "Approved" }));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]).toHaveTextContent("OSTA-22222222");
    await user.click(screen.getByRole("combobox", { name: "Status filter" }));
    await user.click(await screen.findByRole("option", { name: "All statuses" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search applications" }), { target: { value: "ana@" } });
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]).toHaveTextContent("OSTA-11111111");
  });

  it("denies the queue to roles outside the office", async () => {
    for (const identityId of ["dev-finance", "dev-ost-a1"]) {
      render(
        <Wrapper identityId={identityId}>
          <RegistrationApplicationsPage />
        </Wrapper>,
      );
      expect(await screen.findByText(/does not have access to OST Applications/i)).toBeInTheDocument();
      expect(rows()).toHaveLength(0);
      cleanup();
    }
  });

  it("offers the decision actions only on applications still waiting for the office", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper identityId="dev-admin">
        <RegistrationApplicationsPage />
      </Wrapper>,
    );
    await openActions(user, "OSTA-11111111");
    expect(await screen.findByRole("menuitem", { name: "Check and complete" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Return for correction" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Reject" })).toBeInTheDocument();
    // Approve waits for the check.
    expect(screen.queryByRole("menuitem", { name: "Approve" })).not.toBeInTheDocument();
  });

  it("requires a reason to reject, then closes the application with an audit event", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper identityId="dev-admin">
        <RegistrationApplicationsPage />
      </Wrapper>,
    );
    await openActions(user, "OSTA-11111111");
    await user.click(await screen.findByRole("menuitem", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog", { name: "Reject this application?" });
    await user.click(within(dialog).getByRole("button", { name: "Reject application" }));
    expect(await within(dialog).findByText("Reason for rejecting is required.")).toBeInTheDocument();
    expect(currentStore.registrationApplications[0].status).toBe("submitted");
    fireEvent.change(within(dialog).getByRole("textbox", { name: /Reason for rejecting/ }), { target: { value: "Not eligible." } });
    await user.click(within(dialog).getByRole("button", { name: "Reject application" }));
    await waitFor(() => expect(currentStore.registrationApplications[0].status).toBe("rejected"));
    expect(currentStore.auditEvents.at(-1)).toMatchObject({ action: "REGISTRATION_REJECTED", entityType: "registration" });
  });

  it("returns an application for correction and shows the private link to copy", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper identityId="dev-super-admin">
        <RegistrationApplicationsPage />
      </Wrapper>,
    );
    await openActions(user, "OSTA-11111111");
    await user.click(await screen.findByRole("menuitem", { name: "Return for correction" }));
    const dialog = await screen.findByRole("dialog", { name: "Return for correction" });
    fireEvent.change(within(dialog).getByRole("textbox", { name: /What the applicant should fix/ }), { target: { value: "Birth date is wrong." } });
    await user.click(within(dialog).getByRole("button", { name: "Return application" }));
    await waitFor(() => expect(currentStore.registrationApplications[0].status).toBe("needs_info"));
    const token = currentStore.registrationApplications[0].correctionToken;
    expect(token).toMatch(/^[0-9a-f]{32}$/);

    const row = (await waitFor(() => rows().find((item) => item.textContent?.includes("OSTA-11111111")) as HTMLElement));
    await user.click(row);
    expect(await screen.findByText(`/register/ost/correct/${token}`)).toBeInTheDocument();
    expect(screen.getByText(/Email and text delivery is not available yet/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy correction link" })).toBeInTheDocument();
  });

  it("approves a checked application into an OST seller record with an AA number", async () => {
    const user = userEvent.setup();
    const prepare = (store: MockStore) => {
      for (const record of store.accreditations) {
        record.adminStatus = "active";
        record.expiryDate = "2099-12-31";
      }
      Object.assign(store.registrationApplications[0], {
        status: "pending_review",
        completion: { gender: "Female", civilStatus: "Single", governmentIdType: "Passport", governmentIdNumber: "P1234567A", cardApplicationDate: "2026-11-01", programCategory: "non_vip_client", vipCardLevel: "B1", profilePhotoName: "ana.jpg" },
      });
    };
    render(
      <Wrapper identityId="dev-admin" prepare={prepare}>
        <RegistrationApplicationsPage />
      </Wrapper>,
    );
    await waitFor(() => expect(rows()).toHaveLength(2), { timeout: 5000 });
    const members = currentStore.members.length;
    await openActions(user, "OSTA-11111111");
    await user.click(await screen.findByRole("menuitem", { name: "Approve" }));
    const dialog = await screen.findByRole("dialog", { name: "Approve this application?" });
    await user.click(within(dialog).getByRole("button", { name: "Approve and issue AA number" }));
    await waitFor(() => expect(currentStore.registrationApplications[0].status).toBe("approved"), { timeout: 5000 });
    expect(currentStore.members).toHaveLength(members + 1);
    expect(currentStore.members.at(-1)).toMatchObject({ designation: "OST", parentId: "mem-sm-a" });
    expect(currentStore.members.at(-1)?.aaNumber).toMatch(/^AAO/);
    expect(currentStore.auditEvents.at(-1)?.action).toBe("REGISTRATION_APPROVED");
  });
});
