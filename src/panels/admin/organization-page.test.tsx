import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { OrganizationPage } from "./pages/organization-page";

function TestWrapper({ identityId }: { identityId: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <OrganizationPage />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(() => cleanup());

async function selectOption(user: ReturnType<typeof userEvent.setup>, comboboxName: string | RegExp, optionName: string | RegExp) {
  await user.click(screen.getByRole("combobox", { name: comboboxName }));
  await user.click(await screen.findByRole("option", { name: optionName }));
}

async function openStaffTab(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("tab", { name: "Staff" }));
  await screen.findByText("HR Staff", {}, { timeout: 5000 });
}

describe("organization page interactions", () => {
  it("creates a department", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    fireEvent.click(screen.getByRole("button", { name: /create department/i }));
    const nameInput = await screen.findByPlaceholderText("Name");
    fireEvent.change(nameInput, { target: { value: "Engineering" } });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(screen.getByText("Engineering")).toBeInTheDocument());
  });

  it("creates a staff member", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openStaffTab(user);
    await user.click(screen.getByRole("button", { name: /add staff/i }));
    const nameInput = await screen.findByPlaceholderText("Full Name");
    fireEvent.change(nameInput, { target: { value: "New Staff" } });
    fireEvent.change(screen.getByPlaceholderText("Email"), { target: { value: "newstaff@afhomes.local" } });
    await selectOption(user, "Staff department", "Human Resources");
    await selectOption(user, "Staff role", "hr");
    fireEvent.change(screen.getByPlaceholderText("Temporary Password"), { target: { value: "password123" } });
    await user.click(screen.getByRole("button", { name: /^add$/i }));
    await waitFor(() => expect(screen.getByText("New Staff")).toBeInTheDocument());
  });

  it("searches departments", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    const search = (await screen.findAllByPlaceholderText("Search"))[0];
    fireEvent.change(search, { target: { value: "Human" } });
    await waitFor(() => expect(screen.getAllByText("Human Resources").length).toBeGreaterThan(0));
  });

  it("shows restricted for unauthorized identity", async () => {
    render(<TestWrapper identityId="dev-finance" />);
    await waitFor(() => expect(screen.getByText("Access restricted")).toBeInTheDocument());
  });

  it("edits a department", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    const editBtns = await screen.findAllByRole("button", { name: "Edit" });
    fireEvent.click(editBtns[0]);
    const nameInput = await screen.findByPlaceholderText("Name");
    fireEvent.change(nameInput, { target: { value: "HR Updated" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(screen.getAllByText("HR Updated").length).toBeGreaterThan(0));
  });

  it("cancels department edit without changes", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    const editBtns = await screen.findAllByRole("button", { name: "Edit" });
    fireEvent.click(editBtns[0]);
    const nameInput = (await screen.findAllByPlaceholderText("Name"))[0];
    fireEvent.change(nameInput, { target: { value: "Should Not Save" } });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByText("Should Not Save")).not.toBeInTheDocument());
  });

  it("filters departments by status", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    await screen.findByText("Human Resources");
    expect(screen.getAllByText("Human Resources").length).toBeGreaterThan(0);
  });

  it("edits a staff member", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openStaffTab(user);
    const editBtns = await screen.findAllByRole("button", { name: "Edit" });
    fireEvent.click(editBtns[0]);
    const nameInput = await screen.findByDisplayValue("Finance Staff", {}, { timeout: 5000 });
    fireEvent.change(nameInput, { target: { value: "Finance Staff Updated" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(screen.getAllByText("Finance Staff Updated").length).toBeGreaterThan(0));
  });

  it("cancels staff edit without changes", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openStaffTab(user);
    const editBtns = await screen.findAllByRole("button", { name: "Edit" });
    fireEvent.click(editBtns[0]);
    const nameInput = await screen.findByDisplayValue("Finance Staff");
    fireEvent.change(nameInput, { target: { value: "Should Not Save Staff" } });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByText("Should Not Save Staff")).not.toBeInTheDocument());
  });

  it("transfers staff department", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openStaffTab(user);
    const editBtns = await screen.findAllByRole("button", { name: "Edit" });
    fireEvent.click(editBtns[0]);
    await selectOption(user, "Staff department", "Finance");
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(screen.getAllByText("Finance").length).toBeGreaterThan(0));
  });

  it("sorts departments", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    const sortBtn = screen.getByRole("button", { name: /sort/i });
    fireEvent.click(sortBtn);
    await waitFor(() => expect(screen.getByText("Operations")).toBeInTheDocument());
  });

  it("filters staff by department", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openStaffTab(user);
    await selectOption(user, "Staff department filter", "Human Resources");
    await waitFor(() => expect(screen.getByText("HR Staff")).toBeInTheDocument());
  });

  it("transfers staff department and updates counts", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openStaffTab(user);
    const editBtns = await screen.findAllByRole("button", { name: "Edit" });
    fireEvent.click(editBtns[0]);
    await selectOption(user, "Staff department", "Finance");
    const nameInput = await screen.findByDisplayValue("Finance Staff");
    fireEvent.change(nameInput, { target: { value: "Finance Staff" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(screen.getAllByText("Finance Staff").length).toBeGreaterThan(0));
  });

  it("shows employee profile", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openStaffTab(user);
    const viewBtns = await screen.findAllByRole("button", { name: "View" });
    fireEvent.click(viewBtns[0]);
    await waitFor(() => expect(screen.getByText("Employee profile")).toBeInTheDocument());
  });

  it("sorts departments A-Z and Z-A", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    const sortBtn = screen.getByRole("button", { name: /sort/i });
    expect(sortBtn).toHaveTextContent("Sort A-Z");
    fireEvent.click(sortBtn);
    await waitFor(() => expect(sortBtn).toHaveTextContent("Sort Z-A"));
    fireEvent.click(sortBtn);
    await waitFor(() => expect(sortBtn).toHaveTextContent("Sort A-Z"));
  });

  it("shows empty state when status filter matches nothing", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await screen.findByText("Human Resources");
    await selectOption(user, "Department status filter", "Deactivated");
    await waitFor(() => expect(screen.getByText("No departments found.")).toBeInTheDocument());
  });

  it("filters staff by department", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openStaffTab(user);
    await selectOption(user, "Staff department filter", "Human Resources");
    await waitFor(() => expect(screen.getByText("HR Staff")).toBeInTheDocument());
    expect(screen.queryByText("Finance Staff")).not.toBeInTheDocument();
  });

  it("sorts staff A-Z and Z-A", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openStaffTab(user);
    const sortBtn = screen.getByRole("button", { name: /sort/i });
    expect(sortBtn).toHaveTextContent("Sort A-Z");
    fireEvent.click(sortBtn);
    await waitFor(() => expect(sortBtn).toHaveTextContent("Sort Z-A"));
  });

  it("blocks deleting a department with employees", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await screen.findByText("Human Resources");
    const row = screen.getByText("Human Resources").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Delete" }));
    const popover = await screen.findByText("Delete Human Resources?");
    const pop = popover.closest(".ant-popover")!;
    await user.click(within(pop as HTMLElement).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.getByText("Department has assigned employees and cannot be deleted.")).toBeInTheDocument());
    expect(screen.getByText("Human Resources")).toBeInTheDocument();
  });

  it("deletes an unreferenced department after confirm", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    fireEvent.click(screen.getByRole("button", { name: /create department/i }));
    fireEvent.change(await screen.findByPlaceholderText("Name"), { target: { value: "Temp Dept" } });
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(screen.getByText("Temp Dept")).toBeInTheDocument());
    const row = screen.getByText("Temp Dept").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Delete" }));
    await screen.findByText("Delete Temp Dept?");
    const pop = screen.getByText("Delete Temp Dept?").closest(".ant-popover")!;
    await user.click(within(pop as HTMLElement).getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(screen.queryByText("Temp Dept")).not.toBeInTheDocument());
  });

  it("rejects an invalid avatar file", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openStaffTab(user);
    await user.click(screen.getByRole("button", { name: /add staff/i }));
    await screen.findByPlaceholderText("Full Name");
    const fileInput = document.querySelector('.ant-modal input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File(["x"], "doc.txt", { type: "text/plain" })] } });
    await waitFor(() => expect(screen.getByText("Unsupported image format.")).toBeInTheDocument());
  });

  it("cancels staff delete without changes", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await openStaffTab(user);
    const row = screen.getByText("HR Staff").closest("tr")!;
    await user.click(within(row).getByRole("button", { name: "Delete" }));
    await screen.findByText("Delete HR Staff?");
    const pop = screen.getByText("Delete HR Staff?").closest(".ant-popover")!;
    await user.click(within(pop as HTMLElement).getByRole("button", { name: /cancel/i }));
    await waitFor(() => expect(screen.getByText("HR Staff")).toBeInTheDocument());
  });
});
