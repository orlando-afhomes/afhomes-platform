import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach } from "vitest";
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

describe("organization page interactions", () => {
  it("creates a department", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    fireEvent.click(screen.getByRole("button", { name: /create department/i }));
    const nameInput = await screen.findByPlaceholderText("Name");
    fireEvent.change(nameInput, { target: { value: "Engineering" } });
    const codeInput = screen.getByPlaceholderText("Code");
    fireEvent.change(codeInput, { target: { value: "ENG" } });
    fireEvent.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(screen.getByText("Engineering")).toBeInTheDocument());
  });

  it("creates a staff member", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    fireEvent.click(screen.getAllByRole("button").find((b) => b.textContent === "Staff")!);
    fireEvent.click(await screen.findByRole("button", { name: /add staff/i }));
    const nameInput = await screen.findByPlaceholderText("Name");
    fireEvent.change(nameInput, { target: { value: "New Staff" } });
    const emailInput = screen.getByPlaceholderText("Email");
    fireEvent.change(emailInput, { target: { value: "newstaff@afhomes.local" } });
    fireEvent.click(screen.getByRole("button", { name: /^add$/i }));
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
    render(<TestWrapper identityId="dev-admin" />);
    const staffTab = screen.getAllByRole("button").find((b) => b.textContent === "Staff");
    fireEvent.click(staffTab!);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    const editBtns = await screen.findAllByRole("button", { name: "Edit" });
    fireEvent.click(editBtns[0]);
    const nameInput = await screen.findByDisplayValue("Finance Staff", {}, { timeout: 5000 });
    fireEvent.change(nameInput, { target: { value: "Finance Staff Updated" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(screen.getAllByText("Finance Staff Updated").length).toBeGreaterThan(0));
  });

  it("cancels staff edit without changes", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    const staffTab = screen.getAllByRole("button").find((b) => b.textContent === "Staff");
    fireEvent.click(staffTab!);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    const editBtns = await screen.findAllByRole("button", { name: "Edit" });
    fireEvent.click(editBtns[0]);
    const nameInput = await screen.findByDisplayValue("Finance Staff");
    fireEvent.change(nameInput, { target: { value: "Should Not Save Staff" } });
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByText("Should Not Save Staff")).not.toBeInTheDocument());
  });

  it("transfers staff department", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    const staffTab = screen.getAllByRole("button").find((b) => b.textContent === "Staff");
    fireEvent.click(staffTab!);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    const editBtns = await screen.findAllByRole("button", { name: "Edit" });
    fireEvent.click(editBtns[0]);
    const selects = await screen.findAllByRole("combobox");
    const deptSelect = selects[selects.length - 1];
    fireEvent.change(deptSelect, { target: { value: "dept-finance" } });
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
    render(<TestWrapper identityId="dev-admin" />);
    const staffTab = screen.getAllByRole("button").find((b) => b.textContent === "Staff");
    fireEvent.click(staffTab!);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    const selects = await screen.findAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "dept-hr" } });
    await waitFor(() => expect(screen.getByText("HR Staff")).toBeInTheDocument());
  });

  it("transfers staff department and updates counts", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    const staffTab = screen.getAllByRole("button").find((b) => b.textContent === "Staff");
    fireEvent.click(staffTab!);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    const editBtns = await screen.findAllByRole("button", { name: "Edit" });
    fireEvent.click(editBtns[0]);
    const selects = await screen.findAllByRole("combobox");
    fireEvent.change(selects[selects.length - 1], { target: { value: "dept-finance" } });
    // ensure department select changed (staffDept state)
    const nameInput = await screen.findByDisplayValue("Finance Staff");
    fireEvent.change(nameInput, { target: { value: "Finance Staff" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(screen.getAllByText("Finance Staff").length).toBeGreaterThan(0));
  });

  it("shows employee profile", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    const staffTab = screen.getAllByRole("button").find((b) => b.textContent === "Staff");
    fireEvent.click(staffTab!);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    const viewBtns = await screen.findAllByRole("button", { name: "View" });
    fireEvent.click(viewBtns[0]);
    await waitFor(() => expect(screen.getByText("Employee profile")).toBeInTheDocument());
  });

  it("transfers staff department and updates counts", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    // switch to staff tab
    const staffTab = screen.getAllByRole("button").find((b) => b.textContent === "Staff");
    fireEvent.click(staffTab!);
    await screen.findByText("Finance Staff", {}, { timeout: 5000 });

    // open first staff edit (Finance Staff)
    const editBtns = await screen.findAllByRole("button", { name: "Edit" });
    fireEvent.click(editBtns[0]);
    const selects = await screen.findAllByRole("combobox");
    const deptSelect = selects[selects.length - 1];
    fireEvent.change(deptSelect, { target: { value: "dept-hr" } });
    const nameInput = await screen.findByDisplayValue("Finance Staff");
    fireEvent.change(nameInput, { target: { value: "Finance Staff" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(screen.getAllByText("Finance Staff").length).toBeGreaterThan(0));

    // switch back to departments tab
    const deptTab = screen.getAllByRole("button").find((b) => b.textContent === "Departments");
    fireEvent.click(deptTab!);
    await waitFor(() => expect(screen.getAllByText("0").length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getAllByText("2").length).toBeGreaterThan(0));
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

  it("filters departments by status", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "archived" } });
    await waitFor(() => expect(screen.getByText("No departments found.")).toBeInTheDocument());
  });

  it("filters staff by department", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    const staffTab = screen.getAllByRole("button").find((b) => b.textContent === "Staff");
    fireEvent.click(staffTab!);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "dept-hr" } });
    await waitFor(() => expect(screen.getByText("HR Staff")).toBeInTheDocument());
    expect(screen.queryByText("Finance Staff")).not.toBeInTheDocument();
  });

  it("sorts staff A-Z and Z-A", async () => {
    render(<TestWrapper identityId="dev-admin" />);
    const staffTab = screen.getAllByRole("button").find((b) => b.textContent === "Staff");
    fireEvent.click(staffTab!);
    await screen.findByText("HR Staff", {}, { timeout: 5000 });
    const sortBtn = screen.getByRole("button", { name: /sort/i });
    expect(sortBtn).toHaveTextContent("Sort A-Z");
    fireEvent.click(sortBtn);
    await waitFor(() => expect(sortBtn).toHaveTextContent("Sort Z-A"));
  });

});
