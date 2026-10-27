import Swal from "sweetalert2";
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { StaffPage } from "./pages/staff-page";

function TestWrapper({ identityId = "dev-admin" }: { identityId?: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ConfigProvider theme={{ token: { motion: false } }}>
      <QueryClientProvider client={queryClient}>
        <MockStoreProvider>
          <DevIdentityProvider initialIdentityId={identityId}>
            <StaffPage />
          </DevIdentityProvider>
        </MockStoreProvider>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

afterEach(() => {
  cleanup();
  Swal.close();
});

async function clickSwalConfirm(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(document.querySelector(".swal2-confirm")).not.toBeNull());
  await user.click(document.querySelector(".swal2-confirm") as HTMLElement);
}

async function clickRowAction(user: ReturnType<typeof userEvent.setup>, row: HTMLElement, action: "View" | "Edit" | "Delete") {
  await user.click(within(row).getByRole("button", { name: /actions for/i }));
  await user.click(await screen.findByRole("menuitem", { name: action }));
}


async function openAdd(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Add staff" }));
  return screen.findByPlaceholderText("Full Name");
}

// antd renders dropdown items without role="option" in jsdom (only a
// virtualized hidden listbox carries roles, with a partial window), so click
// the visible item by its title attribute instead.
async function pickOption(user: ReturnType<typeof userEvent.setup>, label: string) {
  const item = await screen.findByTitle(label);
  await user.click(item);
}

async function fillNewStaffForm(user: ReturnType<typeof userEvent.setup>, overrides: { name?: string; email?: string } = {}) {
  const nameInput = await openAdd(user);
  fireEvent.change(nameInput, { target: { value: overrides.name ?? "New Hire" } });
  fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: overrides.email ?? "newhire@afhomes.local" } });
  await user.click(screen.getByRole("combobox", { name: "Staff department" }));
  await pickOption(user, "Human Resources");
  await user.click(screen.getByRole("combobox", { name: "Staff role" }));
  await pickOption(user, "HR Staff");
  fireEvent.change(screen.getByPlaceholderText("Temporary Password"), { target: { value: "password123" } });
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
    const badges = Array.from(document.querySelectorAll(".staff-table__role-badge")) as HTMLElement[];
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
    await clickSwalConfirm(user);
  });

  it("requires a department role before saving", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    const nameInput = await openAdd(user);
    fireEvent.change(nameInput, { target: { value: "Roleless" } });
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "roleless@afhomes.local" } });
    await user.click(screen.getByRole("combobox", { name: "Staff department" }));
    await pickOption(user, "Human Resources");
    fireEvent.change(screen.getByPlaceholderText("Temporary Password"), { target: { value: "password123" } });
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    expect(await screen.findByText("Department role is required.")).toBeInTheDocument();
  });

  it("clears an incompatible role when the department changes", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    const nameInput = await openAdd(user);
    fireEvent.change(nameInput, { target: { value: "Mover" } });
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "mover@afhomes.local" } });
    await user.click(screen.getByRole("combobox", { name: "Staff department" }));
    await pickOption(user, "Human Resources");
    await user.click(screen.getByRole("combobox", { name: "Staff role" }));
    await pickOption(user, "HR Staff");
    // Switch departments: the HR role must not carry over.
    await user.click(screen.getByRole("combobox", { name: "Staff department" }));
    await pickOption(user, "Finance");
    fireEvent.change(screen.getByPlaceholderText("Temporary Password"), { target: { value: "password123" } });
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    expect(await screen.findByText("Department role is required.")).toBeInTheDocument();
  });

  it("edits a staff member", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    const row = screen.getByText("HR Specialist").closest("tr")!;
    await clickRowAction(user, row, "Edit");
    const nameInput = await screen.findByDisplayValue("HR Staff");
    fireEvent.change(nameInput, { target: { value: "HR Staff Updated" } });
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await clickSwalConfirm(user);
    await waitFor(() => expect(screen.getByText("HR Staff Updated")).toBeInTheDocument());
    await clickSwalConfirm(user);
  });

  it("shows staff profile without temporary password", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    const row = screen.getByText("HR Specialist").closest("tr")!;
    await clickRowAction(user, row, "View");
    expect(await screen.findByText("Employee profile")).toBeInTheDocument();
    const dialog = document.querySelector(".ant-modal") as HTMLElement;
    expect(within(dialog).getByText("Human Resources")).toBeInTheDocument();
    expect(within(dialog).queryByPlaceholderText("Temporary Password")).not.toBeInTheDocument();
  });

  it("deletes staff after confirm", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    await fillNewStaffForm(user, { name: "Temp Staff", email: "tempstaff@afhomes.local" });
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(screen.getByText("Temp Staff")).toBeInTheDocument());
    await clickSwalConfirm(user);
    const row = screen.getByText("Temp Staff").closest("tr")!;
    await clickRowAction(user, row, "Delete");
    await clickSwalConfirm(user);
    await waitFor(() => expect(screen.queryByText("Temp Staff")).not.toBeInTheDocument());
    await clickSwalConfirm(user);
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
    const search = await screen.findByPlaceholderText("Search staff");
    fireEvent.change(search, { target: { value: "Finance" } });
    await waitFor(() => expect(screen.queryByText("HR Specialist")).not.toBeInTheDocument());
    expect(screen.getByText("Finance Analyst")).toBeInTheDocument();
  });
});
