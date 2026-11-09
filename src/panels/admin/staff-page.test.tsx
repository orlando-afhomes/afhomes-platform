import { describe, expect, it, afterEach, beforeAll } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { StaffPage } from "./pages/staff-page";

// StaffPage lazy-loads its dialogs (next/dynamic). Under a loaded full run the cold
// transform of that heavy module can outlast findBy's 1s default, so load it once
// up front; tests then resolve it from the module cache.
beforeAll(async () => {
  await import("./pages/staff-dialogs");
}, 60_000);

function TestWrapper({ identityId = "dev-admin" }: { identityId?: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
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

async function confirmInAlertDialog(user: ReturnType<typeof userEvent.setup>, name: string | RegExp) {
  const dialog = await screen.findByRole("alertdialog");
  await user.click(within(dialog).getByRole("button", { name }));
}

const closeDialog = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(within(screen.getByRole("dialog", { name })).getAllByRole("button", { name: "Close" }).at(-1)!);
  await waitFor(() => expect(screen.queryByRole("dialog", { name })).toBeNull());
};

async function clickRowAction(user: ReturnType<typeof userEvent.setup>, row: HTMLElement, action: "View" | "Edit" | "Delete") {
  await user.click(within(row).getByRole("button", { name: /actions for/i }));
  await user.click(await screen.findByRole("menuitem", { name: action }));
}


/** The profile dialog's Account Access section. */
const accessSection = () => within(screen.getByRole("dialog", { name: "Employee profile" })).getByRole("region", { name: "Account Access" });

async function openAdd(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Add staff" }));
  return screen.findByPlaceholderText("First Name");
}

const FIELD_COMBOBOX: Record<string, string> = {
  "Select gender": "Gender",
  "Select civil status": "Civil Status",
  "Select ID type": "Government ID",
  "Select department": "Department",
};

async function pickSharedSelect(user: ReturnType<typeof userEvent.setup>, placeholder: string, optionLabel: string) {
  // Scope to the open dialog: the staff table behind it renders the same names as plain text.
  const dialog = screen.getByRole("dialog");
  await user.click(within(dialog).getByRole("combobox", { name: FIELD_COMBOBOX[placeholder] }));
  await pickOption(user, optionLabel);
}

const TEST_PASSWORD = "password1234";

async function fillProfileFields(user: ReturnType<typeof userEvent.setup>) {
  fireEvent.change(screen.getByPlaceholderText("Mobile Number"), { target: { value: "09171234567" } });
  fireEvent.change(screen.getByLabelText(/Street Address/), { target: { value: "123 Maharlika Street" } });
  fireEvent.change(screen.getByLabelText(/Province/), { target: { value: "Metro Manila" } });
  fireEvent.change(screen.getByLabelText(/^City/), { target: { value: "Makati City" } });
  fireEvent.change(screen.getByLabelText(/Barangay/), { target: { value: "San Antonio" } });
  fireEvent.change(screen.getByLabelText(/ZIP Code/), { target: { value: "1203" } });
  fireEvent.change(screen.getByPlaceholderText("Telephone"), { target: { value: "028123456" } });
  fireEvent.change(screen.getByPlaceholderText("Facebook"), { target: { value: "johndoe" } });
  fireEvent.change(screen.getByLabelText(/^TIN/), { target: { value: "123456789" } });
  await pickSharedSelect(user, "Select gender", "Male");
  await pickSharedSelect(user, "Select civil status", "Single");
  await pickSharedSelect(user, "Select ID type", "Passport");
  fireEvent.change(screen.getByLabelText(/ID Number/), { target: { value: "P1234567" } });
}

async function fillNewStaffForm(user: ReturnType<typeof userEvent.setup>, overrides: { firstName?: string; lastName?: string; email?: string } = {}) {
  const firstNameInput = await openAdd(user);
  fireEvent.change(firstNameInput, { target: { value: overrides.firstName ?? "New" } });
  fireEvent.change(screen.getByPlaceholderText("Last Name"), { target: { value: overrides.lastName ?? "Hire" } });
  await user.click(screen.getByRole("checkbox", { name: "No middle-name" }));
  await fillProfileFields(user);
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: overrides.email ?? "newhire@afhomes.local" } });
  await pickSharedSelect(user, "Select department", "Human Resources");
  await user.click(screen.getByRole("combobox", { name: "Role" }));
  await pickOption(user, "HR Staff");
  fireEvent.change(screen.getByPlaceholderText("Temporary Password"), { target: { value: TEST_PASSWORD } });
  fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: TEST_PASSWORD } });
}

async function pickOption(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(await screen.findByRole("option", { name: label }));
}

describe("staff page", () => {
  it("lists seeded staff with departments and roles", async () => {
    render(<TestWrapper />);
    expect(await screen.findByText("HR Specialist", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText("Finance Analyst")).toBeInTheDocument();
  });

  it("gives each assigned role its own badge color", async () => {
    render(<TestWrapper />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    const badges = Array.from(document.querySelectorAll("tbody [data-slot='badge'][style*='background']")) as HTMLElement[];
    const byRole = new Map<string, Set<string>>();
    for (const badge of badges) {
      const name = badge.textContent ?? "";
      const colors = byRole.get(name) ?? new Set<string>();
      colors.add(badge.style.backgroundColor);
      byRole.set(name, colors);
    }
    // One consistent color per role...
    for (const colors of byRole.values()) {
      expect(colors.size).toBe(1);
    }
    // ...and a distinct color for each different role.
    const representative = [...byRole.values()].map((colors) => [...colors][0]);
    expect(byRole.size).toBeGreaterThan(1);
    expect(new Set(representative).size).toBe(representative.length);
  });

  it("requires staff module access", async () => {
    render(<TestWrapper identityId="dev-finance" />);
    expect(await screen.findByText("Access restricted")).toBeInTheDocument();
    expect(screen.queryByText("Add staff")).not.toBeInTheDocument();
  });

  it("adds staff with cascading department role", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    await fillNewStaffForm(user);
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(screen.getByText("New Hire")).toBeInTheDocument());
    expect(await screen.findByText("Staff added successfully.")).toBeInTheDocument();
  });

  it("requires a department role before saving", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    const firstNameInput = await openAdd(user);
    fireEvent.change(firstNameInput, { target: { value: "Roleless" } });
    fireEvent.change(screen.getByPlaceholderText("Last Name"), { target: { value: "User" } });
    await user.click(screen.getByRole("checkbox", { name: "No middle-name" }));
    await fillProfileFields(user);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "roleless@afhomes.local" } });
    await pickSharedSelect(user, "Select department", "Human Resources");
    fireEvent.change(screen.getByPlaceholderText("Temporary Password"), { target: { value: TEST_PASSWORD } });
    fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: TEST_PASSWORD } });
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    expect(await screen.findByText("Department role is required.")).toBeInTheDocument();
  });

  it("clears an incompatible role when the department changes", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    const firstNameInput = await openAdd(user);
    fireEvent.change(firstNameInput, { target: { value: "Mover" } });
    fireEvent.change(screen.getByPlaceholderText("Last Name"), { target: { value: "User" } });
    await user.click(screen.getByRole("checkbox", { name: "No middle-name" }));
    await fillProfileFields(user);
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "mover@afhomes.local" } });
    await pickSharedSelect(user, "Select department", "Human Resources");
    await user.click(screen.getByRole("combobox", { name: "Role" }));
    await pickOption(user, "HR Staff");
    // Switch departments: the HR role must not carry over.
    await user.click(within(screen.getByRole("dialog")).getByRole("combobox", { name: "Department" }));
    await pickOption(user, "Finance");
    fireEvent.change(screen.getByPlaceholderText("Temporary Password"), { target: { value: TEST_PASSWORD } });
    fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: TEST_PASSWORD } });
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    expect(await screen.findByText("Department role is required.")).toBeInTheDocument();
  });

  it("edits a staff member", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    const row = screen.getByText("HR Specialist").closest("tr")!;
    await clickRowAction(user, row, "Edit");
    const firstNameInput = await screen.findByDisplayValue("HR");
    fireEvent.change(firstNameInput, { target: { value: "HR Updated" } });
    await fillProfileFields(user);
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await confirmInAlertDialog(user, "Save");
    expect(await screen.findByText("Staff updated successfully.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("HR Updated Staff")).toBeInTheDocument());
  });

  it("shows staff profile without temporary password", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    const row = screen.getByText("HR Specialist").closest("tr")!;
    await user.click(row);
    const dialog = await screen.findByRole("dialog", { name: "Employee profile" });
    expect(within(dialog).getAllByText("Human Resources").length).toBeGreaterThan(0);
    expect(within(dialog).queryByPlaceholderText("Temporary Password")).not.toBeInTheDocument();
  });

  it("keeps Delete disabled with a visible reason and leaves the staff row in place", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    await fillNewStaffForm(user, { firstName: "Temp", lastName: "Staff", email: "tempstaff@afhomes.local" });
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(screen.getByText("Temp Staff")).toBeInTheDocument());
    const row = screen.getByText("Temp Staff").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: /actions for/i }));
    expect(await screen.findByRole("menuitem", { name: "Delete (unavailable)" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("Staff deletion is unavailable");
    await user.keyboard("{Escape}");
    expect(screen.getByText("Temp Staff")).toBeInTheDocument();
  });

  it("filters staff by department", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    await user.click(screen.getByRole("combobox", { name: "Staff department filter" }));
    await pickOption(user, "Finance");
    await waitFor(() => expect(screen.queryByText("HR Specialist")).not.toBeInTheDocument());
    expect(screen.getByText("Finance Analyst")).toBeInTheDocument();
  });

  it("searches staff", async () => {
    render(<TestWrapper />);
    const search = await screen.findByPlaceholderText("Search staff and accounts");
    fireEvent.change(search, { target: { value: "Finance" } });
    await waitFor(() => expect(screen.queryByText("HR Specialist")).not.toBeInTheDocument());
    expect(screen.getByText("Finance Analyst")).toBeInTheDocument();
  });
});

describe("staff page S3-B permissions", () => {
  const row = (staffId: string) => document.querySelector(`tr[data-row-key="${staffId}"]`) as HTMLElement;

  async function openProfile(user: ReturnType<typeof userEvent.setup>, staffId: string) {
    await user.click(within(row(staffId)).getAllByRole("button")[0]);
    await screen.findByRole("dialog", { name: "Employee profile" });
  }

  it("shows HR the assigned role names without Roles management", async () => {
    render(<TestWrapper identityId="dev-hr" />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    await waitFor(() => expect(within(row("staff-3")).getByText("Operations Staff", { selector: "[data-slot='badge']" })).toBeInTheDocument());
    expect(screen.queryByText("Unassigned")).toBeNull();
  });

  it("offers HR only department roles it may assign", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-hr" />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    await openAdd(user);
    await pickSharedSelect(user, "Select department", "Admin");
    expect(await screen.findByText("No roles you can assign in this department.")).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog")).getByRole("combobox", { name: "Department" }));
    await pickOption(user, "Human Resources");
    await user.click(screen.getByRole("combobox", { name: "Role" }));
    expect(await screen.findByRole("option", { name: "HR Staff" })).toBeInTheDocument();
  });

  it("lets HR add staff with a Pending account", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-hr" />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    await fillNewStaffForm(user);
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(screen.getByText("New Hire")).toBeInTheDocument());
    const newRow = screen.getByText("New Hire").closest("tr") as HTMLElement;
    await user.click(within(newRow).getAllByRole("button")[0]);
    await screen.findByRole("dialog", { name: "Employee profile" });
    await waitFor(() => expect(within(accessSection()).getByText("newhire@afhomes.local")).toBeInTheDocument());
    expect(within(accessSection()).getByText("Pending")).toBeInTheDocument();
  });

  it("locks HR's own department and role and hides self-deletion", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-hr" />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    await waitFor(() => expect(within(row("staff-1")).getByText("HR Staff", { selector: "[data-slot='badge']" })).toBeInTheDocument());
    await user.click(within(row("staff-1")).getByRole("button", { name: /actions for/i }));
    expect(await screen.findByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    // Delete stays visible but unavailable for the actor's own record.
    expect(screen.getByRole("menuitem", { name: "Delete (unavailable)" })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(await screen.findByText("You cannot change your own department or role.")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Role" })).toBeDisabled();
  });

  it("lets HR suspend an eligible linked account, but not its own or the protected one", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-hr" />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    await openProfile(user, "staff-admin");
    await user.click(await screen.findByRole("button", { name: "Suspend account" }));
    await confirmInAlertDialog(user, "Suspend account");
    expect(await screen.findByText("Account status updated.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: "Suspend account" })).toBeNull());
    expect(screen.getByRole("button", { name: "Deactivate account" })).toBeInTheDocument();
    expect(within(accessSection()).getByText("Suspended")).toBeInTheDocument();
    await closeDialog(user, "Employee profile");
    await openProfile(user, "staff-1");
    await waitFor(() => expect(accessSection().querySelector("dl")).not.toBeNull());
    expect(screen.queryByRole("button", { name: "Suspend account" })).toBeNull();
    await closeDialog(user, "Employee profile");
    await openProfile(user, "staff-super");
    expect(await screen.findByText("Protected Super Administrator account. Only a Super Administrator can change its status.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Suspend account" })).toBeNull();
  });

  // S3-B.1 15: the form must not offer name/email edits the repository rejects.
  it("locks protected-record name and email while keeping other profile fields editable", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    await clickRowAction(user, row("staff-super"), "Edit");
    expect(await screen.findByText("Only a Super Administrator can change this record's name or email.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("First Name")).toBeDisabled();
    expect(screen.getByPlaceholderText("Last Name")).toBeDisabled();
    expect(screen.getByPlaceholderText("Email")).toBeDisabled();
    // Non-authority profile fields remain editable.
    expect(screen.getByPlaceholderText("Telephone")).not.toBeDisabled();
  });
});

describe("add staff system access", () => {
  it("offers Admin only in-scope system roles and creates the Pending account with the chosen role", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    await fillNewStaffForm(user);
    expect(await screen.findByText("System Access")).toBeInTheDocument();
    await screen.findByRole("checkbox", { name: "Human Resources" });
    for (const name of ["Super Admin", "Administrator", "Finance"]) {
      expect(screen.queryByRole("checkbox", { name })).toBeNull();
    }
    await user.click(screen.getByRole("checkbox", { name: "Human Resources" }));
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(screen.getByText("New Hire")).toBeInTheDocument());
    const newRow = screen.getByText("New Hire").closest("tr") as HTMLElement;
    expect(within(newRow).getByText("Human Resources", { selector: "[data-slot='badge']" })).toBeInTheDocument();
    expect(within(newRow).getByText("Pending")).toBeInTheDocument();
  });

  it("offers Super Admin the Finance and Administrator roles", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-super-admin" />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    await openAdd(user);
    expect(await screen.findByRole("checkbox", { name: "Finance" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Administrator" })).toBeInTheDocument();
  });

  it("does not show system access to HR", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-hr" />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    await openAdd(user);
    expect(await screen.findByText("Account Credentials")).toBeInTheDocument();
    expect(screen.queryByText("System Access")).toBeNull();
  });
});
