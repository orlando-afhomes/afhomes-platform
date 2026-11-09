import { ACCOUNT_DELETE_DISABLED } from "@/modules/accounts/types";
import { STAFF_DELETE_DISABLED } from "@/modules/organization/types";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { StaffPage } from "./pages/staff-page";

// Unified Staff & Access directory: account administration merged from the
// former Accounts and Permissions page (chips, inline activation, system
// roles and status from employee rows, account-only rows).

function TestWrapper({ identityId = "dev-admin" }: { identityId?: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <AppToaster />
          <StaffPage />
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

const row = (key: string) => document.querySelector(`tr[data-row-key="${key}"]`) as HTMLElement | null;
const dialog = (name: string) => screen.getByRole("dialog", { name });
const closeDialog = async (user: User, name: string) => {
  await user.click(within(dialog(name)).getAllByRole("button", { name: "Close" }).at(-1)!);
  await waitFor(() => expect(screen.queryByRole("dialog", { name })).toBeNull());
};

async function ready(identityId?: string) {
  render(<TestWrapper identityId={identityId} />);
  await screen.findByText("HR Specialist", {}, { timeout: 5000 });
  // Account-only rows appear once account policies load.
  if (identityId !== "dev-hr") await waitFor(() => expect(row("acct-pending")).not.toBeNull());
}

async function confirmInAlertDialog(user: User, name: string | RegExp) {
  const alert = await screen.findByRole("alertdialog");
  await user.click(within(alert).getByRole("button", { name }));
}

async function openMenu(user: User, key: string) {
  await user.click(within(row(key)!).getByRole("button", { name: /actions for/i }));
}

async function rowAction(user: User, key: string, action: string) {
  await openMenu(user, key);
  await user.click(await screen.findByRole("menuitem", { name: action }));
}

describe("staff & access directory", () => {
  it("shows HR employees only, without account chips, columns, or creation", async () => {
    await ready("dev-hr");
    expect(screen.queryByRole("group", { name: "Directory view" })).toBeNull();
    expect(screen.queryByRole("button", { name: /create account/i })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "System Roles" })).toBeNull();
    expect(screen.queryByRole("columnheader", { name: "Type" })).toBeNull();
    expect(row("acct-pending")).toBeNull();
    // HR still sees each linked account's status (account plus employment badge).
    await waitFor(() => expect(within(row("staff-1")!).getAllByText("Active")).toHaveLength(2));
    expect(within(row("staff-2")!).getByText("No account")).toBeInTheDocument();
  });

  it("gives HR suspend and deactivate shortcuts but no system-role actions", async () => {
    const user = userEvent.setup();
    await ready("dev-hr");
    await waitFor(() => expect(within(row("staff-admin")!).getAllByText("Active")).toHaveLength(2));
    await openMenu(user, "staff-admin");
    expect(await screen.findByRole("menuitem", { name: "Suspend account" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Deactivate account" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "System roles" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Change status" })).toBeNull();
  });

  it("shows Admin the four chips with the pending count and a single Add staff entry point", async () => {
    await ready();
    const chips = screen.getByRole("group", { name: "Directory view" });
    for (const name of ["All", "Employees", "Account only", "Pending Approvals (1)"]) {
      expect(within(chips).getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.getByRole("button", { name: "Add staff" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create account/i })).toBeNull();
  });

  it("keeps every row action in the three-dots menu with no inline buttons", async () => {
    await ready();
    const buttonNames = (key: string) =>
      within(row(key)!).getAllByRole("button").map((button) => button.getAttribute("aria-label") ?? button.textContent);
    // Only the name link and the menu trigger; Activate and Delete live in the menu.
    expect(buttonNames("staff-1")).toEqual(["HR Staff", "Actions for HR Staff"]);
    expect(buttonNames("acct-pending")).toEqual(["Pending User", "Actions for Pending User"]);
  });

  it("lists linked accounts once, on the employee row, and unlinked accounts as account-only rows", async () => {
    const user = userEvent.setup();
    await ready();
    expect(row("acct-hr")).toBeNull();
    expect(row("acct-admin")).toBeNull();
    expect(row("acct-super-admin")).toBeNull();
    expect(within(row("staff-1")!).getByText("Human Resources", { selector: "[data-slot='badge']" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Account only" }));
    await waitFor(() => expect(row("staff-1")).toBeNull());
    expect(row("acct-pending")).not.toBeNull();
    expect(row("acct-finance")).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "Employees" }));
    await waitFor(() => expect(row("acct-pending")).toBeNull());
    expect(row("staff-1")).not.toBeNull();
  });

  it("activates a pending account inline and clears the pending view", async () => {
    const user = userEvent.setup();
    await ready();
    await user.click(screen.getByRole("button", { name: "Pending Approvals (1)" }));
    await waitFor(() => expect(row("staff-1")).toBeNull());
    await rowAction(user, "acct-pending", "Activate");
    await confirmInAlertDialog(user, "Activate");
    expect(await screen.findByText("Account activated.")).toBeInTheDocument();
    await waitFor(() => expect(row("acct-pending")).toBeNull());
    expect(screen.getByText("No pending accounts.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pending Approvals (0)" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "All" }));
    await waitFor(() => expect(within(row("acct-pending")!).getByText("Active")).toBeInTheDocument());
  });

  it("assigns and revokes a system role from an employee row", async () => {
    const user = userEvent.setup();
    await ready();
    await rowAction(user, "staff-1", "System roles");
    await screen.findByRole("dialog", { name: "Role assignments" });
    await user.click(screen.getByRole("combobox", { name: "Role to assign" }));
    // S3-02: Admin may assign only roles within its own module scope.
    expect(await screen.findByRole("option", { name: "Sales Vice Director" })).toBeInTheDocument();
    for (const name of ["Finance", "Administrator", "Super Admin"]) {
      expect(screen.queryByRole("option", { name })).toBeNull();
    }
    await user.click(screen.getByRole("option", { name: "Sales Vice Director" }));
    await user.click(screen.getByRole("button", { name: "Assign" }));
    await waitFor(() => expect(within(dialog("Role assignments")).getByRole("button", { name: "Revoke Sales Vice Director" })).toBeInTheDocument());
    await closeDialog(user, "Role assignments");
    await waitFor(() => expect(within(row("staff-1")!).getByText("Sales Vice Director")).toBeInTheDocument());
    await rowAction(user, "staff-1", "System roles");
    await user.click(await within(dialog("Role assignments")).findByRole("button", { name: "Revoke Sales Vice Director" }));
    await waitFor(() => expect(within(dialog("Role assignments")).queryByRole("button", { name: "Revoke Sales Vice Director" })).toBeNull());
    await closeDialog(user, "Role assignments");
    await waitFor(() => expect(within(row("staff-1")!).queryByText("Sales Vice Director")).toBeNull());
  });

  it("offers Super Admin the Finance and Administrator system roles", async () => {
    const user = userEvent.setup();
    await ready("dev-super-admin");
    await rowAction(user, "staff-1", "System roles");
    await screen.findByRole("dialog", { name: "Role assignments" });
    await user.click(screen.getByRole("combobox", { name: "Role to assign" }));
    expect(await screen.findByRole("option", { name: "Finance" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Administrator" })).toBeInTheDocument();
  });

  it("suspends and then reactivates an employee's account from the row", async () => {
    const user = userEvent.setup();
    await ready();
    await rowAction(user, "staff-1", "Change status");
    await screen.findByRole("dialog", { name: "Account status" });
    await user.click(screen.getByRole("combobox", { name: "Account status" }));
    expect(await screen.findByRole("option", { name: "Deactivated" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Pending" })).toBeNull();
    expect(screen.queryByRole("option", { name: "Active" })).toBeNull();
    await user.click(screen.getByRole("option", { name: "Suspended" }));
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(within(row("staff-1")!).getByText("Suspended")).toBeInTheDocument());
    // Reactivation, previously only on the Accounts page.
    await rowAction(user, "staff-1", "Change status");
    await screen.findByRole("dialog", { name: "Account status" });
    await user.click(screen.getByRole("combobox", { name: "Account status" }));
    await user.click(await screen.findByRole("option", { name: "Active" }));
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(within(row("staff-1")!).queryByText("Suspended")).toBeNull());
  });

  it("hides system-role and status actions on protected and own accounts", async () => {
    const user = userEvent.setup();
    await ready();
    expect(within(row("staff-super")!).getByText("Protected")).toBeInTheDocument();
    expect(within(row("staff-admin")!).getByText("(You)")).toBeInTheDocument();
    for (const key of ["staff-super", "staff-admin"]) {
      await openMenu(user, key);
      expect(await screen.findAllByRole("menuitem", { name: "Edit" })).not.toHaveLength(0);
      expect(screen.queryByRole("menuitem", { name: "System roles" })).toBeNull();
      expect(screen.queryByRole("menuitem", { name: "Change status" })).toBeNull();
      await user.keyboard("{Escape}");
    }
  });

  it("opens account actions from the employee profile for Admin", async () => {
    const user = userEvent.setup();
    await ready();
    await user.click(within(row("staff-1")!).getAllByRole("button")[0]);
    await screen.findByRole("dialog", { name: "Employee profile" });
    expect(screen.queryByRole("button", { name: "Suspend account" })).toBeNull();
    await user.click(await screen.findByRole("button", { name: "System roles" }));
    expect(await screen.findByRole("dialog", { name: "Role assignments" })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Employee profile" })).toBeNull());
  });

  async function expectDisabledDelete(user: User, key: string, reason: string) {
    await openMenu(user, key);
    // Focusable (not aria-disabled, so keyboard users reach it) and announced as unavailable.
    const item = await screen.findByRole("menuitem", { name: "Delete (unavailable)" });
    expect(item).not.toHaveAttribute("aria-disabled", "true");
    // The reason is visible text in the menu, not a hover-only tooltip or title attribute.
    // Read from this menu only: earlier dropdowns can linger in the DOM while they animate out.
    const menu = item.closest("[role='menu']") as HTMLElement;
    const note = within(menu).getByRole("note");
    expect(note).toHaveTextContent(reason);
    // Visible once the open animation finishes (opacity starts at 0).
    await waitFor(() => expect(note).toBeVisible());
    expect(item.querySelector("[title]")).toBeNull();
    await user.keyboard("{Escape}");
  }

  it("always shows Delete disabled with the visible R8 reason for staff and account rows", async () => {
    const user = userEvent.setup();
    await ready();
    for (const key of ["staff-admin", "staff-super", "staff-1"]) await expectDisabledDelete(user, key, STAFF_DELETE_DISABLED);
    for (const key of ["acct-finance", "acct-pending"]) await expectDisabledDelete(user, key, ACCOUNT_DELETE_DISABLED);
    expect(row("acct-pending")).not.toBeNull();
    expect(row("staff-1")).not.toBeNull();
  });

  it("views and edits an account-only row", async () => {
    const user = userEvent.setup();
    await ready();
    await user.click(row("acct-pending")!);
    await screen.findByRole("dialog", { name: "Account details" });
    await closeDialog(user, "Account details");
    await rowAction(user, "acct-pending", "Edit");
    const nameInput = await screen.findByDisplayValue("Pending User");
    expect(nameInput).not.toBeDisabled();
    fireEvent.change(nameInput, { target: { value: "Pending User Updated" } });
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(screen.getByText("Pending User Updated")).toBeInTheDocument());
  });

  it("searches across employees and account-only rows", async () => {
    await ready();
    fireEvent.change(screen.getByPlaceholderText("Search staff and accounts"), { target: { value: "finance" } });
    await waitFor(() => expect(row("staff-1")).toBeNull());
    expect(row("staff-2")).not.toBeNull();
    expect(row("acct-finance")).not.toBeNull();
  });
});
