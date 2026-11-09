import { describe, expect, it, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { DepartmentsPage } from "./pages/departments-page";

// M1-B: Departments on shadcn/ui + Base UI + TanStack Table. Behavior under
// test is unchanged from the Ant Design version: only the DOM contract moved
// (Base UI dialogs and menus, Sonner toasts instead of SweetAlert2 modals).

function TestWrapper({ identityId = "dev-admin" }: { identityId?: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <AppToaster />
          <DepartmentsPage />
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

const rowFor = (name: string) => screen.getByText(name).closest("tr")!;
const rowKeys = () => [...document.querySelectorAll("tbody tr[data-row-key]")].map((row) => row.getAttribute("data-row-key"));

async function clickRowAction(user: User, row: HTMLElement, action: "View" | "Edit" | "Delete") {
  await user.click(within(row).getByRole("button", { name: /actions for/i }));
  await user.click(await screen.findByRole("menuitem", { name: action }));
}

async function confirmInAlertDialog(user: User, name: string | RegExp) {
  const dialog = await screen.findByRole("alertdialog");
  await user.click(within(dialog).getByRole("button", { name }));
}

async function openCreate(user: User) {
  await user.click(screen.getByRole("button", { name: "Create department" }));
  return screen.findByPlaceholderText("Name");
}

async function create(user: User, name: string) {
  const nameInput = await openCreate(user);
  fireEvent.change(nameInput, { target: { value: name } });
  await user.click(screen.getByRole("button", { name: /^create$/i }));
}

describe("departments page", () => {
  it("renders seeded departments with role and staff counts", async () => {
    render(<TestWrapper />);
    expect(await screen.findByText("Human Resources")).toBeInTheDocument();
    expect(screen.getByText("Finance")).toBeInTheDocument();
    const hr = within(rowFor("Human Resources")).getAllByRole("cell");
    expect(hr.map((cell) => cell.textContent)).toEqual(expect.arrayContaining(["Human Resources", "Active"]));
    expect(screen.getByRole("columnheader", { name: "Department Name" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Departments" })).toBeInTheDocument();
  });

  it("restricts access without the departments module", async () => {
    render(<TestWrapper identityId="dev-finance" />);
    expect(await screen.findByText("Access restricted")).toBeInTheDocument();
    expect(screen.queryByText("Create department")).not.toBeInTheDocument();
  });

  it("lets HR manage departments", async () => {
    render(<TestWrapper identityId="dev-hr" />);
    expect(await screen.findByText("Human Resources")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create department" })).toBeInTheDocument();
  });

  it("creates a department and reports it with a toast", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await create(user, "Engineering");
    expect(await screen.findByText("Department created successfully.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Engineering")).toBeInTheDocument());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("requires a department name and shows the error inline, linked to the field", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const input = await openCreate(user);
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    const message = await screen.findByText("Department name is required.");
    expect(message).toHaveAttribute("role", "alert");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input.getAttribute("aria-describedby")).toBe(message.id);
    expect(screen.getByRole("dialog", { name: "Create department" })).toBeInTheDocument();
  });

  it("rejects duplicate department names and keeps the dialog open", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await create(user, "Finance");
    expect(await screen.findByText("Department already exists.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Create department" })).toBeInTheDocument();
  });

  it("edits a department after a save confirmation", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Human Resources");
    await clickRowAction(user, rowFor("Human Resources"), "Edit");
    const nameInput = await screen.findByDisplayValue("Human Resources");
    fireEvent.change(nameInput, { target: { value: "People Operations" } });
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    const confirm = await screen.findByRole("alertdialog", { name: "Save changes to People Operations?" });
    await user.click(within(confirm).getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Department updated successfully.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("People Operations")).toBeInTheDocument());
  });

  it("does not save when the save confirmation is cancelled", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Human Resources");
    await clickRowAction(user, rowFor("Human Resources"), "Edit");
    fireEvent.change(await screen.findByDisplayValue("Human Resources"), { target: { value: "Cancelled Rename" } });
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await confirmInAlertDialog(user, "Cancel");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByText("Human Resources")).toBeInTheDocument();
    expect(screen.queryByText("Cancelled Rename")).toBeNull();
  });

  it("cancels department edit without changes", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Human Resources");
    await clickRowAction(user, rowFor("Human Resources"), "Edit");
    fireEvent.change(await screen.findByDisplayValue("Human Resources"), { target: { value: "Should Not Save" } });
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByText("Should Not Save")).not.toBeInTheDocument());
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows department details with counts when a row is opened, and closes on Escape", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Human Resources");
    await user.click(rowFor("Human Resources"));
    const dialog = await screen.findByRole("dialog", { name: "Department details" });
    expect(within(dialog).getByText("Roles")).toBeInTheDocument();
    expect(within(dialog).getByText("Staff")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("opens details from the name button without a row-click conflict", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Human Resources");
    await user.click(within(rowFor("Human Resources")).getByRole("button", { name: "Human Resources" }));
    expect(await screen.findByRole("dialog", { name: "Department details" })).toBeInTheDocument();
  });

  it("blocks deleting a department with roles or staff and reports why", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Human Resources");
    await clickRowAction(user, rowFor("Human Resources"), "Delete");
    await confirmInAlertDialog(user, "Delete");
    expect(await screen.findByText("Delete failed.")).toBeInTheDocument();
    expect(await screen.findByText("Department has assigned roles and cannot be deleted.")).toBeInTheDocument();
    expect(screen.getByText("Human Resources")).toBeInTheDocument();
  });

  it("asks for confirmation before deleting and can be cancelled", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Human Resources");
    await clickRowAction(user, rowFor("Human Resources"), "Delete");
    const dialog = await screen.findByRole("alertdialog", { name: "Delete Human Resources?" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByText("Human Resources")).toBeInTheDocument();
  });

  it("deletes an empty department after confirm", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await create(user, "Temporary");
    await waitFor(() => expect(screen.getByText("Temporary")).toBeInTheDocument());
    await clickRowAction(user, rowFor("Temporary"), "Delete");
    await confirmInAlertDialog(user, "Delete");
    expect(await screen.findByText("Temporary deleted successfully.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("cell", { name: "Temporary" })).not.toBeInTheDocument());
  });

  it("filters departments by status", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await create(user, "Dormant");
    await waitFor(() => expect(screen.getByText("Dormant")).toBeInTheDocument());
    await clickRowAction(user, rowFor("Dormant"), "Edit");
    await user.click(await screen.findByRole("combobox", { name: "Department status" }));
    await user.click(await screen.findByRole("option", { name: "Deactivated" }));
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    const confirm = await screen.findByRole("alertdialog");
    await user.click(within(confirm).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());

    await user.click(screen.getByRole("combobox", { name: "Department status filter" }));
    await user.click(await screen.findByRole("option", { name: "Deactivated" }));
    await waitFor(() => expect(screen.queryByText("Human Resources")).toBeNull());
    expect(screen.getByText("Dormant")).toBeInTheDocument();
  });

  it("searches departments and shows an empty state", async () => {
    render(<TestWrapper />);
    const search = await screen.findByPlaceholderText("Search departments");
    fireEvent.change(search, { target: { value: "Human" } });
    await waitFor(() => expect(screen.queryByText("Finance")).not.toBeInTheDocument());
    expect(screen.getByText("Human Resources")).toBeInTheDocument();
    fireEvent.change(search, { target: { value: "zzzz-nothing" } });
    expect(await screen.findByText("No departments found.")).toBeInTheDocument();
  });

  it("sorts departments A-Z and Z-A", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Human Resources");
    const sortButton = screen.getByRole("button", { name: /sort/i });
    expect(sortButton).toHaveTextContent("Sort A-Z");
    const ascending = rowKeys();
    await user.click(sortButton);
    await waitFor(() => expect(screen.getByRole("button", { name: /sort/i })).toHaveTextContent("Sort Z-A"));
    expect(rowKeys()).toEqual([...ascending].reverse());
  });

  it("paginates a long directory", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Human Resources");
    const names = ["Alpha", "Bravo", "Charlie", "Delta", "Echo", "Foxtrot", "Golf", "Hotel", "India", "Juliet", "Kilo", "Lima"];
    for (const name of names) {
      await create(user, name);
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    }
    expect(rowKeys()).toHaveLength(10);
    expect(screen.getByText(/Page 1 of 2/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByText(/Page 2 of 2/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  }, 60_000);

  // S3-B.1 C: only Super Admin may change the protected department's status.
  it("locks the protected department status for non-super-admins but keeps metadata editable", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Human Resources");
    await clickRowAction(user, rowFor("Admin"), "Edit");
    expect(await screen.findByText("Only a Super Administrator can change this department's status.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Department status" })).toBeDisabled();
    expect(screen.getByPlaceholderText("Name")).not.toBeDisabled();
  });

  it("offers the protected department status to super admins", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-super-admin" />);
    await screen.findByText("Human Resources");
    await clickRowAction(user, rowFor("Admin"), "Edit");
    await screen.findByDisplayValue("Admin");
    expect(screen.getByRole("combobox", { name: "Department status" })).not.toBeDisabled();
    expect(screen.queryByText("Only a Super Administrator can change this department's status.")).toBeNull();
  });
});
