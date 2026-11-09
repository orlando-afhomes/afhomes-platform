import { describe, expect, it, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { RolesPage } from "./pages/roles-page";

// U1-A: Roles & Permissions on shadcn/ui + Base UI + TanStack Table. Behavior
// under test is unchanged; only the DOM contract moved (Base UI dialogs, menus
// and selects, Sonner toasts instead of SweetAlert2 modals).

function TestWrapper({ identityId = "dev-admin" }: { identityId?: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <RolesPage />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

// Sonner keeps toasts in a module-level store, so clear them between tests.
afterEach(() => {
  cleanup();
  toast.dismiss();
});

type User = ReturnType<typeof userEvent.setup>;

const rowFor = (name: string) => screen.getAllByText(name)[0].closest("tr")!;

async function clickRowAction(user: User, row: HTMLElement, action: "View" | "Edit" | "Delete") {
  await user.click(within(row).getByRole("button", { name: /actions for/i }));
  await user.click(await screen.findByRole("menuitem", { name: action }));
}

async function confirmInAlertDialog(user: User, name: string | RegExp) {
  const dialog = await screen.findByRole("alertdialog");
  await user.click(within(dialog).getByRole("button", { name }));
}

async function openCreate(user: User) {
  await user.click(screen.getByRole("button", { name: "Create role" }));
  return screen.findByPlaceholderText("e.g. HR Staff");
}

async function pickDepartment(user: User, label: string) {
  await user.click(screen.getByRole("combobox", { name: "Role department" }));
  await user.click(await screen.findByRole("option", { name: label }));
}

async function createRole(user: User, name: string) {
  const nameInput = await openCreate(user);
  fireEvent.change(nameInput, { target: { value: name } });
  await pickDepartment(user, "Human Resources");
  await user.click(screen.getByRole("checkbox", { name: "Departments" }));
  await user.click(screen.getByRole("button", { name: /^create$/i }));
}

describe("roles page", () => {
  it("lists seeded department roles with departments and modules", async () => {
    render(<TestWrapper />);
    expect(await screen.findByText("HR Staff", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText("Finance Staff")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Roles" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Role Name" })).toBeInTheDocument();
  });

  it("requires roles module access", async () => {
    render(<TestWrapper identityId="dev-hr" />);
    expect(await screen.findByText("Access restricted")).toBeInTheDocument();
    expect(screen.getByText("This account does not have access to Roles & Permissions.")).toBeInTheDocument();
    expect(screen.queryByText("Create role")).not.toBeInTheDocument();
  });

  it("denies access for finance identities", async () => {
    render(<TestWrapper identityId="dev-finance" />);
    expect(await screen.findByText("Access restricted")).toBeInTheDocument();
  });

  it("creates a role with delegable modules and reports it with a toast", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await createRole(user, "HR Viewer");
    expect(await screen.findByText("Role created successfully.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("HR Viewer")).toBeInTheDocument());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows inline errors for a missing name, department, and modules", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await openCreate(user);
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    expect(await screen.findByText("Role name is required.")).toBeInTheDocument();
    expect(screen.getByText("Department is required.")).toBeInTheDocument();
    expect(screen.getByText("Select at least one authorized module.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. HR Staff")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByPlaceholderText("e.g. HR Staff")).toHaveAccessibleDescription("Role name is required.");
    // The dialog stays open until the form is valid.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("clears a field error once the field is corrected", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const nameInput = await openCreate(user);
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    expect(await screen.findByText("Select at least one authorized module.")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: "Departments" }));
    expect(screen.queryByText("Select at least one authorized module.")).not.toBeInTheDocument();
    fireEvent.change(nameInput, { target: { value: "Valid Name" } });
    expect(screen.queryByText("Role name is required.")).not.toBeInTheDocument();
  });

  it("rejects duplicate role names within a department", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await createRole(user, "HR Staff");
    expect(await screen.findByText("Create failed.")).toBeInTheDocument();
    expect(await screen.findByText(/already exists/)).toBeInTheDocument();
    // The form stays open so the user can correct it.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("only offers delegable implemented modules", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await openCreate(user);
    expect(screen.getByRole("checkbox", { name: "Departments" })).toBeInTheDocument();
    // S3-01: Accounts management is Admin/Super Admin only and not delegable.
    expect(screen.queryByRole("checkbox", { name: "Accounts" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Finance" })).not.toBeInTheDocument();
  });

  it("edits a role after confirming the save", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Finance Staff", {}, { timeout: 5000 });
    await clickRowAction(user, rowFor("Finance Staff"), "Edit");
    const nameInput = await screen.findByDisplayValue("Finance Staff");
    fireEvent.change(nameInput, { target: { value: "Finance Staff Updated" } });
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText("Save changes to Finance Staff Updated?")).toBeInTheDocument();
    await confirmInAlertDialog(user, "Save");
    expect(await screen.findByText("Role updated successfully.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Finance Staff Updated")).toBeInTheDocument());
  });

  it("keeps the edit dialog open when the save confirmation is cancelled", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Finance Staff", {}, { timeout: 5000 });
    await clickRowAction(user, rowFor("Finance Staff"), "Edit");
    await screen.findByDisplayValue("Finance Staff");
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await confirmInAlertDialog(user, "Cancel");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByDisplayValue("Finance Staff")).toBeInTheDocument();
    expect(screen.queryByText("Role updated successfully.")).not.toBeInTheDocument();
  });

  it("shows role details with module list when a row is opened", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    await user.click(rowFor("HR Staff"));
    const dialog = await screen.findByRole("dialog", { name: "Role details" });
    expect(within(dialog).getByText("Departments")).toBeInTheDocument();
    expect(within(dialog).getByText(/Assigned staff \(/)).toBeInTheDocument();
  });

  it("blocks deleting an assigned role", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    await clickRowAction(user, rowFor("HR Staff"), "Delete");
    await confirmInAlertDialog(user, "Delete");
    expect(await screen.findByText(/Role is assigned to \d+ staff member\(s\) and cannot be deleted\./)).toBeInTheDocument();
    expect(screen.getAllByText("HR Staff").length).toBeGreaterThan(0);
  });

  it("deletes an unassigned role after confirm", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    // "AAA" prefix keeps the new row on page 1 (pageSize 10).
    await createRole(user, "AAA Temporary Role");
    await waitFor(() => expect(screen.getByText("AAA Temporary Role")).toBeInTheDocument());
    await clickRowAction(user, rowFor("AAA Temporary Role"), "Delete");
    await confirmInAlertDialog(user, "Delete");
    await waitFor(() => expect(screen.queryByText("AAA Temporary Role")).not.toBeInTheDocument());
  });

  it("shows no actions for protected or out-of-scope roles", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    // The protected Super Admin role sorts onto page 2, so search for it.
    fireEvent.change(await screen.findByPlaceholderText("Search roles"), { target: { value: "Super Admin" } });
    const badge = await screen.findByText("Protected");
    expect(within(badge.closest("tr")!).queryByRole("button", { name: /actions for/i })).toBeNull();
  });

  it("filters roles by department", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    await user.click(screen.getByRole("combobox", { name: "Role department filter" }));
    await user.click(await screen.findByRole("option", { name: "Finance" }));
    await waitFor(() => expect(screen.queryByText("HR Staff")).not.toBeInTheDocument());
    expect(screen.getByText("Finance Staff")).toBeInTheDocument();
  });

  it("filters roles by status", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    await user.click(screen.getByRole("combobox", { name: "Role status filter" }));
    await user.click(await screen.findByRole("option", { name: "Deactivated" }));
    await waitFor(() => expect(screen.queryByText("HR Staff")).not.toBeInTheDocument());
  });

  it("searches roles", async () => {
    render(<TestWrapper />);
    const search = await screen.findByPlaceholderText("Search roles");
    fireEvent.change(search, { target: { value: "Finance" } });
    await waitFor(() => expect(screen.queryByText("HR Staff")).not.toBeInTheDocument());
    expect(screen.getByText("Finance Staff")).toBeInTheDocument();
  });

  it("sorts roles by name in both directions", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    const firstRowName = () => document.querySelector("tbody tr[data-row-key]")!.textContent;
    const ascending = firstRowName();
    await user.click(screen.getByRole("button", { name: "Sort A-Z" }));
    expect(screen.getByRole("button", { name: "Sort Z-A" })).toBeInTheDocument();
    expect(firstRowName()).not.toBe(ascending);
  });
});
