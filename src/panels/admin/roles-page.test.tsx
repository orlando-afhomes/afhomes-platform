import Swal from "sweetalert2";
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { RolesPage } from "./pages/roles-page";

function TestWrapper({ identityId = "dev-admin" }: { identityId?: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ConfigProvider theme={{ token: { motion: false } }}>
      <QueryClientProvider client={queryClient}>
        <MockStoreProvider>
          <DevIdentityProvider initialIdentityId={identityId}>
            <RolesPage />
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


async function openCreate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Create role" }));
  return screen.findByPlaceholderText("e.g. HR Staff");
}

// antd renders dropdown items without role="option" in jsdom (only a
// virtualized hidden listbox carries roles, with a partial window), so click
// the visible item by its title attribute instead.
async function pickOption(user: ReturnType<typeof userEvent.setup>, label: string) {
  const item = await screen.findByTitle(label);
  await user.click(item);
}

describe("roles page", () => {
  it("lists seeded department roles with departments and modules", async () => {
    render(<TestWrapper />);
    expect(await screen.findByText("HR Staff", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText("Finance Staff")).toBeInTheDocument();
  });

  it("requires roles module access", async () => {
    render(<TestWrapper identityId="dev-hr" />);
    expect(await screen.findByText("Access restricted")).toBeInTheDocument();
    expect(screen.queryByText("Create role")).not.toBeInTheDocument();
  });

  it("denies access for finance identities", async () => {
    render(<TestWrapper identityId="dev-finance" />);
    expect(await screen.findByText("Access restricted")).toBeInTheDocument();
  });

  it("creates a role with delegable modules", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const nameInput = await openCreate(user);
    fireEvent.change(nameInput, { target: { value: "HR Viewer" } });
    await user.click(screen.getByRole("combobox", { name: "Role department" }));
    await pickOption(user, "Human Resources");
    await user.click(screen.getByRole("checkbox", { name: "Departments" }));
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(screen.getByText("HR Viewer")).toBeInTheDocument());
    await clickSwalConfirm(user);
  });

  it("requires a role name, department, and modules", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await openCreate(user);
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    expect(await screen.findByText("Role name is required.")).toBeInTheDocument();
  });

  it("rejects duplicate role names within a department", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const nameInput = await openCreate(user);
    fireEvent.change(nameInput, { target: { value: "HR Staff" } });
    await user.click(screen.getByRole("combobox", { name: "Role department" }));
    await pickOption(user, "Human Resources");
    await user.click(screen.getByRole("checkbox", { name: "Departments" }));
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    expect(await screen.findByText(/already exists/)).toBeInTheDocument();
    await clickSwalConfirm(user);
  });

  it("only offers delegable implemented modules", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await openCreate(user);
    const checkboxes = screen.getAllByRole("checkbox").map((box) => box.getAttribute("value"));
    expect(checkboxes).toContain("departments");
    expect(checkboxes).toContain("accounts");
    expect(checkboxes).not.toContain("finance");
  });

  it("edits a role", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Finance Staff", {}, { timeout: 5000 });
    const row = screen.getByText("Finance Staff").closest("tr")!;
    await clickRowAction(user, row, "Edit");
    const nameInput = await screen.findByDisplayValue("Finance Staff");
    fireEvent.change(nameInput, { target: { value: "Finance Staff Updated" } });
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await clickSwalConfirm(user);
    await waitFor(() => expect(screen.getByText("Finance Staff Updated")).toBeInTheDocument());
    await clickSwalConfirm(user);
  });

  it("shows role details with module list", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    const row = screen.getAllByText("HR Staff")[0].closest("tr")!;
    await clickRowAction(user, row, "View");
    expect(await screen.findByText("Role details")).toBeInTheDocument();
    const dialog = document.querySelector(".ant-modal") as HTMLElement;
    expect(within(dialog).getByText("Departments")).toBeInTheDocument();
  });

  it("blocks deleting an assigned role", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    const row = screen.getAllByText("HR Staff")[0].closest("tr")!;
    await clickRowAction(user, row, "Delete");
    await clickSwalConfirm(user);
    expect(await screen.findByText(/Role is assigned to \d+ staff member\(s\) and cannot be deleted\./)).toBeInTheDocument();
    await clickSwalConfirm(user);
    expect(screen.getAllByText("HR Staff").length).toBeGreaterThan(0);
  });

  it("deletes an unassigned role after confirm", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    // "AAA" prefix keeps the new row on page 1 (pageSize 10, 11 seeded
    // roles); "Temporary Role" would sort last onto page 2 and be invisible.
    const nameInput = await openCreate(user);
    fireEvent.change(nameInput, { target: { value: "AAA Temporary Role" } });
    await user.click(screen.getByRole("combobox", { name: "Role department" }));
    await pickOption(user, "Human Resources");
    await user.click(screen.getByRole("checkbox", { name: "Departments" }));
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(screen.getByText("AAA Temporary Role")).toBeInTheDocument());
    await clickSwalConfirm(user);
    const row = screen.getByText("AAA Temporary Role").closest("tr")!;
    await clickRowAction(user, row, "Delete");
    await clickSwalConfirm(user);
    await waitFor(() => expect(screen.queryByText("AAA Temporary Role")).not.toBeInTheDocument());
    await clickSwalConfirm(user);
  });

  it("filters roles by department", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    await user.click(screen.getByRole("combobox", { name: "Role department filter" }));
    await pickOption(user, "Finance");
    await waitFor(() => expect(screen.queryByText("HR Staff")).not.toBeInTheDocument());
    expect(screen.getByText("Finance Staff")).toBeInTheDocument();
  });

  it("searches roles", async () => {
    render(<TestWrapper />);
    const search = await screen.findByPlaceholderText("Search roles");
    fireEvent.change(search, { target: { value: "Finance" } });
    await waitFor(() => expect(screen.queryByText("HR Staff")).not.toBeInTheDocument());
    expect(screen.getByText("Finance Staff")).toBeInTheDocument();
  });
});
