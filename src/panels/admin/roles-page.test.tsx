import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { MockDepartmentRoleRepository } from "@/data/mock/role-repository";
import { OrganizationAreaPage } from "./pages/organization-area-page";

// U1-A: Roles & Permissions on shadcn/ui + Base UI + TanStack Table. Behavior
// under test is unchanged; only the DOM contract moved (Base UI dialogs, menus
// and selects, Sonner toasts instead of SweetAlert2 modals).

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

beforeEach(() => window.history.replaceState(null, "", "/admin?tab=roles"));

function TestWrapper({ identityId = "dev-admin", client }: { identityId?: string; client?: QueryClient }) {
  const [queryClient] = useState(() => client ?? new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <AppToaster />
          <OrganizationAreaPage />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

// Sonner keeps toasts in a module-level store, so clear them between tests.
afterEach(() => {
  cleanup();
  toast.dismiss();
  window.history.replaceState(null, "", "/");
  vi.restoreAllMocks();
});

type User = ReturnType<typeof userEvent.setup>;

const rowFor = (name: string) => screen.getAllByText(name)[0].closest("tr")!;

async function clickRowAction(user: User, row: HTMLElement, action: "Edit" | "Delete") {
  await user.click(within(row).getByRole("button", { name: /actions for/i }));
  await user.click(await screen.findByRole("menuitem", { name: action }));
}

async function confirmInAlertDialog(user: User, name: string | RegExp) {
  const dialog = await screen.findByRole("alertdialog");
  await user.click(within(dialog).getByRole("button", { name }));
}

async function openCreate(user: User) {
  await user.click(await screen.findByRole("button", { name: "Create role" }));
  return screen.findByPlaceholderText("HR Staff");
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
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
  });

  it("requires roles module access", async () => {
    render(<TestWrapper identityId="dev-hr" />);
    // HR keeps Staff and Departments but has no Roles tab and no Create role button.
    expect(await screen.findByRole("button", { name: "Add staff" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Roles" })).toBeNull();
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
    expect(screen.getByPlaceholderText("HR Staff")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByPlaceholderText("HR Staff")).toHaveAccessibleDescription("Role name is required.");
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

  it("lists every module by group and locks the ones the creator does not hold", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await openCreate(user);
    expect(screen.getByRole("checkbox", { name: "Departments" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Sales Network Members" })).toBeEnabled();
    expect(screen.getByRole("checkbox", { name: "Audit Logs" })).toBeEnabled();
    // The Administrator does not hold Finance, so it shows but stays locked.
    expect(screen.getByRole("checkbox", { name: /^Finance/ })).toHaveAttribute("aria-disabled", "true");
  });

  it("selects a whole group with its All checkbox", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await openCreate(user);
    await user.click(screen.getByRole("checkbox", { name: "Select all Organization" }));
    expect(screen.getByRole("checkbox", { name: "Departments" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Staff & Access" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Customers" })).not.toBeChecked();
  });

  it("edits a role after confirming the save", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Operations Staff", {}, { timeout: 5000 });
    await clickRowAction(user, rowFor("Operations Staff"), "Edit");
    const nameInput = await screen.findByDisplayValue("Operations Staff");
    fireEvent.change(nameInput, { target: { value: "Operations Staff Updated" } });
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    expect(await screen.findByText("Save Changes to Operations Staff Updated?")).toBeInTheDocument();
    await confirmInAlertDialog(user, "Save");
    expect(await screen.findByText("Role updated successfully.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Operations Staff Updated")).toBeInTheDocument());
  });

  it("keeps the edit dialog open when the save confirmation is cancelled", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Operations Staff", {}, { timeout: 5000 });
    await clickRowAction(user, rowFor("Operations Staff"), "Edit");
    await screen.findByDisplayValue("Operations Staff");
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await confirmInAlertDialog(user, "Cancel");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByDisplayValue("Operations Staff")).toBeInTheDocument();
    expect(screen.queryByText("Role updated successfully.")).not.toBeInTheDocument();
  });

  it("shows role details with module list when a row is opened", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    await user.click(rowFor("HR Staff"));
    const dialog = await screen.findByRole("dialog", { name: "Role Details" });
    expect(within(dialog).getByText("Departments")).toBeInTheDocument();
    expect(within(dialog).getByText(/Assigned Staff \(/)).toBeInTheDocument();
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

  it("shows a load error with retry instead of an empty table when the roles query fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(MockDepartmentRoleRepository.prototype, "list").mockRejectedValueOnce(new Error("Roles failed."));
    render(<TestWrapper client={new QueryClient({ defaultOptions: { queries: { retry: false } } })} />);
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/Roles failed\./)).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Roles" })).toBeNull();
    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("HR Staff", {}, { timeout: 5000 })).toBeInTheDocument();
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
