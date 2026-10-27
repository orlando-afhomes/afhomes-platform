import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { AccountManagementPage } from "./pages/account-management-page";

function TestWrapper({ identityId }: { identityId: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ConfigProvider theme={{ token: { motion: false } }}>
      <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <AccountManagementPage />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
    </ConfigProvider>
  );
}

afterEach(() => cleanup());

async function openRowDialog(user: ReturnType<typeof userEvent.setup>, name: string, action: string) {
  await screen.findByText(name, {}, { timeout: 5000 });
  const row = screen.getByText(name).closest("tr")!;
  await user.click(within(row).getByRole("button", { name: action }));
}

describe("account management page", () => {
  it("creates an account", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await screen.findByText("admin@afhomes.local", {}, { timeout: 5000 });
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await screen.findByText("Provision a new synthetic account.");
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "New Account" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "newaccount@afhomes.local" } });
    await user.click(screen.getByRole("checkbox", { name: "Human Resources" }));
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(screen.getByText("New Account")).toBeInTheDocument());
  });

  it("rejects duplicate email on create", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await screen.findByText("admin@afhomes.local", {}, { timeout: 5000 });
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await screen.findByText("Provision a new synthetic account.");
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Copy Cat" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@afhomes.local" } });
    await user.click(screen.getByRole("checkbox", { name: "Human Resources" }));
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(screen.getByText(/already exists|duplicate/i)).toBeInTheDocument());
  });

  it("edits an account and cancels without changes", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openRowDialog(user, "HR User", "Edit");
    const nameInput = await screen.findByDisplayValue("HR User");
    fireEvent.change(nameInput, { target: { value: "HR User Updated" } });
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(screen.getByText("HR User Updated")).toBeInTheDocument());
  });

  it("shows account details", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openRowDialog(user, "HR User", "View");
    await waitFor(() => expect(screen.getAllByText("hr@afhomes.local").length).toBe(2));
  });

  it("assigns and revokes a role", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    // Role dialog shows the record snapshot; reopen to verify mutations.
    const openRoles = async () => {
      const r = screen.getByText("HR User").closest("tr")!;
      await user.click(within(r).getByRole("button", { name: "Roles" }));
      await screen.findByText("Role assignments");
    };
    const hrRow = () => screen.getByText("HR User").closest("tr") as HTMLElement;
    // Footer "Close" and modal X share the same onCancel; X has a stable selector.
    const closeDialog = () => fireEvent.click(document.querySelector(".ant-modal .ant-modal-close")!);
    await screen.findByText("HR User", {}, { timeout: 5000 });
    await openRoles();
    await user.click(screen.getByRole("combobox", { name: "Role to assign" }));
    await user.click(await screen.findByRole("option", { name: "Finance" }));
    await user.click(screen.getByRole("button", { name: "Assign" }));
    closeDialog();
    await waitFor(() => expect(within(hrRow()).getByText("Finance")).toBeInTheDocument());
    await openRoles();
    const dialog = () => document.querySelector(".ant-modal") as HTMLElement;
    const financeTag = () => within(dialog()).getByText("Finance", { selector: ".ant-tag" });
    await waitFor(() => expect(financeTag()).toBeInTheDocument());
    await user.click(within(financeTag()).getByLabelText("Close"));
    closeDialog();
    await waitFor(() => expect(within(hrRow()).queryByText("Finance")).not.toBeInTheDocument());
  });

  it("blocks assigning super_admin as non-super-admin", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openRowDialog(user, "HR User", "Roles");
    await screen.findByText("Role assignments");
    await user.click(screen.getByRole("combobox", { name: "Role to assign" }));
    await user.click(await screen.findByRole("option", { name: "Super Admin" }));
    await user.click(screen.getByRole("button", { name: "Assign" }));
    await waitFor(() => expect(screen.getByText("Cannot assign protected Super Administrator role.")).toBeInTheDocument());
  });

  it("updates account status", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openRowDialog(user, "Pending User", "Status");
    await screen.findByText("Account status");
    await user.click(screen.getByRole("combobox", { name: "Account status" }));
    await user.click(await screen.findByRole("option", { name: "Active" }));
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(screen.queryByText("Account status")).not.toBeInTheDocument());
  });

  it("restricts access for unauthorized identity", async () => {
    render(<TestWrapper identityId="dev-hr" />);
    await waitFor(() => expect(screen.getByText("Access restricted")).toBeInTheDocument());
  });

  it("filters accounts by search", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    await screen.findByText("admin@afhomes.local", {}, { timeout: 5000 });
    fireEvent.change(screen.getByPlaceholderText("Search accounts"), { target: { value: "Finance User" } });
    await waitFor(() => expect(screen.getByText("Finance User")).toBeInTheDocument());
    expect(screen.queryByText("HR User")).not.toBeInTheDocument();
  });
});
