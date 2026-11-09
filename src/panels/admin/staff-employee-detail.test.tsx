import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { AUDIT_ACTIONS } from "@/modules/audit/types";
import { OWN_ACCOUNT_RESTRICTION, PROTECTED_ACCOUNT_RESTRICTION } from "@/data/mock/account-repository";
import type { MockStore } from "@/data/mock/seed";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider, useMockStore } from "@/shared/providers/mock-store-provider";
import { StaffPage } from "./pages/staff-page";

// OC2: consolidated employee detail (Profile, Employment, Account Access).

// Test-only handle on the mock store the page runs against (for audit assertions).
const probe: { store: MockStore | null } = { store: null };
const getStore = () => probe.store as MockStore;

function StoreProbe() {
  const current = useMockStore();
  useEffect(() => {
    probe.store = current;
  }, [current]);
  return null;
}

function TestWrapper({ identityId }: { identityId: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <StoreProbe />
        <DevIdentityProvider initialIdentityId={identityId}>
          <StaffPage />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>

  );
}

// The page lazy-loads its dialogs; load them once so a loaded full run cannot outlast findBy.
beforeAll(async () => {
  await import("./pages/staff-dialogs");
}, 60_000);

afterEach(() => {
  cleanup();
  toast.dismiss();
});

type User = ReturnType<typeof userEvent.setup>;

const row = (key: string) => document.querySelector(`tr[data-row-key="${key}"]`) as HTMLElement | null;
const SECTION_NAMES = { profile: "Profile", employment: "Employment", access: "Account Access" } as const;
const section = (name: "profile" | "employment" | "access") =>
  within(screen.getByRole("dialog", { name: "Employee profile" })).getByRole("region", { name: SECTION_NAMES[name] });

async function ready(identityId: string) {
  render(<TestWrapper identityId={identityId} />);
  await screen.findByText("HR Specialist", {}, { timeout: 5000 });
  if (identityId !== "dev-hr") await waitFor(() => expect(row("acct-pending")).not.toBeNull());
  else await waitFor(() => expect(within(row("staff-admin")!).getAllByText("Active")).toHaveLength(2));
}

async function openProfile(user: User, key: string) {
  await user.click(within(row(key)!).getAllByRole("button")[0]);
  await screen.findByRole("dialog", { name: "Employee profile" });
}

async function confirmInAlertDialog(user: User, name: string | RegExp) {
  const alert = await screen.findByRole("alertdialog");
  await user.click(within(alert).getByRole("button", { name }));
}

describe("employee detail sections", () => {
  it("shows Super Admin Profile, Employment, and Account Access with roles and effective module access", async () => {
    const user = userEvent.setup();
    await ready("dev-super-admin");
    await openProfile(user, "staff-admin");
    for (const name of ["Profile", "Employment", "Account Access"]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }
    expect(within(section("profile")).getByText("admin@afhomes.local")).toBeInTheDocument();
    const employment = section("employment");
    const valueOf = (term: string) => within(employment).getByText(term).nextElementSibling?.textContent;
    expect(valueOf("Department")).toBe("Human Resources");
    expect(valueOf("Position")).toBe("HR Staff");
    expect(valueOf("Role")).toBe("HR Staff");
    // Employment status is display-only until its lifecycle is approved.
    expect(within(employment).getByText("Read-only")).toBeInTheDocument();
    expect(within(employment).queryByRole("combobox")).toBeNull();
    const access = section("access");
    expect(within(access).getByText("admin@afhomes.local")).toBeInTheDocument();
    expect(within(access).getByText("Administrator")).toBeInTheDocument();
    const effective = within(access).getByText("Effective module access").nextElementSibling as HTMLElement;
    expect(effective.textContent).toContain("Accounts and Permissions");
    expect(effective.textContent).toContain("Roles");
    expect(within(access).getByRole("button", { name: "System roles" })).toBeInTheDocument();
    expect(within(access).getByRole("button", { name: "Change status" })).toBeInTheDocument();
  });

  it("shows an empty Account Access state for an employee without a linked account", async () => {
    const user = userEvent.setup();
    await ready("dev-super-admin");
    await openProfile(user, "staff-2");
    const access = section("access");
    expect(within(access).getByText("No linked account")).toBeInTheDocument();
    expect(within(access).queryByRole("button")).toBeNull();
    expect(within(access).queryByText("Effective module access")).toBeNull();
  });

  it("limits Admin on protected and own accounts and offers no authority beyond the account policy", async () => {
    const user = userEvent.setup();
    await ready("dev-admin");
    await openProfile(user, "staff-super");
    let access = section("access");
    expect(within(access).getByText(PROTECTED_ACCOUNT_RESTRICTION)).toBeInTheDocument();
    expect(within(access).queryByRole("button", { name: "System roles" })).toBeNull();
    expect(within(access).queryByRole("button", { name: "Change status" })).toBeNull();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Employee profile" })).toBeNull());
    await openProfile(user, "staff-admin");
    access = section("access");
    expect(within(access).getByText(OWN_ACCOUNT_RESTRICTION)).toBeInTheDocument();
    expect(within(access).queryByRole("button", { name: "System roles" })).toBeNull();
    expect(within(access).queryByRole("button", { name: "Change status" })).toBeNull();
    // The Employment section explains why the actor's own assignment is locked.
    expect(within(section("employment")).getByText("You cannot change your own department or role.")).toBeInTheDocument();
  });

  it("gives HR account status and suspend/deactivate only: no roles, no effective access, no account editor", async () => {
    const user = userEvent.setup();
    await ready("dev-hr");
    await openProfile(user, "staff-admin");
    const access = section("access");
    expect(within(access).getByText("admin@afhomes.local")).toBeInTheDocument();
    expect(within(access).getByText("Account status")).toBeInTheDocument();
    expect(within(access).queryByText("System roles")).toBeNull();
    expect(within(access).queryByText("Effective module access")).toBeNull();
    expect(within(access).getByRole("button", { name: "Suspend account" })).toBeInTheDocument();
    expect(within(access).getByRole("button", { name: "Deactivate account" })).toBeInTheDocument();
    expect(within(access).queryByRole("button", { name: "System roles" })).toBeNull();
    expect(within(access).queryByRole("button", { name: "Change status" })).toBeNull();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Employee profile" })).toBeNull());
    await openProfile(user, "staff-super");
    expect(within(section("access")).getByText(/Protected Super Administrator account/)).toBeInTheDocument();
    expect(within(section("access")).queryByRole("button", { name: "Suspend account" })).toBeNull();
  });
});

describe("employee detail audit integrity", () => {
  it("writes no audit event when profiles are only viewed", async () => {
    const user = userEvent.setup();
    await ready("dev-super-admin");
    const before = getStore().auditEvents.length;
    await openProfile(user, "staff-1");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Employee profile" })).toBeNull());
    await openProfile(user, "staff-admin");
    expect(getStore().auditEvents).toHaveLength(before);
  });

  it("changes status from the profile through one repository operation and one audit event", async () => {
    const user = userEvent.setup();
    await ready("dev-super-admin");
    const before = getStore().auditEvents.length;
    await openProfile(user, "staff-1");
    await user.click(within(section("access")).getByRole("button", { name: "Change status" }));
    await screen.findByRole("dialog", { name: "Account status" });
    await user.click(screen.getByRole("combobox", { name: "Account status" }));
    await user.click(await screen.findByRole("option", { name: "Suspended" }));
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(getStore().accounts.find((item) => item.id === "acct-hr")?.status).toBe("suspended"));
    const events = getStore().auditEvents.slice(before);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ action: AUDIT_ACTIONS.ACCOUNT_STATUS_CHANGED, entityId: "acct-hr", previousValue: "active", newValue: "suspended", actorId: "dev-super-admin", outcome: "success" });
    // A suspended account confers no module access, however its roles read.
    await openProfile(user, "staff-1");
    const access = section("access");
    await waitFor(() => expect(within(access).getByText("Suspended")).toBeInTheDocument());
    expect(within(access).getByText("None until the account is active")).toBeInTheDocument();
  });

  it("suspends from the HR shortcut with one event, and records nothing for a protected account", async () => {
    const user = userEvent.setup();
    await ready("dev-hr");
    const before = getStore().auditEvents.length;
    await openProfile(user, "staff-admin");
    await user.click(within(section("access")).getByRole("button", { name: "Suspend account" }));
    await confirmInAlertDialog(user, "Suspend account");
    await waitFor(() => expect(getStore().accounts.find((item) => item.id === "acct-admin")?.status).toBe("suspended"));
    const events = getStore().auditEvents.slice(before);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ action: AUDIT_ACTIONS.ACCOUNT_STATUS_CHANGED, entityId: "acct-admin", actorId: "dev-hr", previousValue: "active", newValue: "suspended", outcome: "success" });
    expect(getStore().accounts.find((item) => item.id === "acct-super-admin")?.status).toBe("active");
  });
});
