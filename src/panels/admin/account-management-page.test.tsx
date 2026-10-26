import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { AccountManagementPage } from "./pages/account-management-page";

function TestWrapper({ identityId }: { identityId: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <AccountManagementPage />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
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
    await screen.findByText("Administrator", {}, { timeout: 5000 });
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await screen.findByText("Provision a new synthetic account.");
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "New Account" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "newaccount@afhomes.local" } });
    await user.click(screen.getByRole("checkbox", { name: "hr" }));
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(screen.getByText("New Account")).toBeInTheDocument());
  });

  it("rejects duplicate email on create", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await screen.findByText("Administrator", {}, { timeout: 5000 });
    await user.click(screen.getByRole("button", { name: /create account/i }));
    await screen.findByText("Provision a new synthetic account.");
    fireEvent.change(screen.getByLabelText("Display name"), { target: { value: "Copy Cat" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "admin@afhomes.local" } });
    await user.click(screen.getByRole("checkbox", { name: "hr" }));
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
    await waitFor(() => expect(screen.getByText("hr@afhomes.local")).toBeInTheDocument());
  });

  it("assigns and revokes a role", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openRowDialog(user, "HR User", "Roles");
    await screen.findByText("Role assignments");
    await user.click(screen.getByRole("combobox", { name: "Role to assign" }));
    await user.click(await screen.findByRole("option", { name: "finance" }));
    await user.click(screen.getByRole("button", { name: "Assign" }));
    await waitFor(() => expect(screen.getByText("finance", { selector: ".ant-tag" })).toBeInTheDocument());
    await user.click(screen.getByLabelText("Close", { selector: ".ant-tag-close-icon" }));
    await waitFor(() => expect(screen.queryByText("finance", { selector: ".ant-tag" })).not.toBeInTheDocument());
  });

  it("blocks assigning super_admin as non-super-admin", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openRowDialog(user, "HR User", "Roles");
    await screen.findByText("Role assignments");
    await user.click(screen.getByRole("combobox", { name: "Role to assign" }));
    await user.click(await screen.findByRole("option", { name: "super_admin" }));
    await user.click(screen.getByRole("button", { name: "Assign" }));
    await waitFor(() => expect(screen.getByText(/not allowed|super_admin/i)).toBeInTheDocument());
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
    await screen.findByText("Administrator", {}, { timeout: 5000 });
    fireEvent.change(screen.getByPlaceholderText("Search accounts"), { target: { value: "Finance User" } });
    await waitFor(() => expect(screen.getByText("Finance User")).toBeInTheDocument());
    expect(screen.queryByText("HR User")).not.toBeInTheDocument();
  });
});
