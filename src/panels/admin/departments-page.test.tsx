import Swal from "sweetalert2";
import { describe, expect, it, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { DepartmentsPage } from "./pages/departments-page";

function TestWrapper({ identityId = "dev-admin" }: { identityId?: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <ConfigProvider theme={{ token: { motion: false } }}>
      <QueryClientProvider client={queryClient}>
        <MockStoreProvider>
          <DevIdentityProvider initialIdentityId={identityId}>
            <DepartmentsPage />
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
  await user.click(screen.getByRole("button", { name: "Create department" }));
  return screen.findByPlaceholderText("Name");
}

describe("departments page", () => {
  it("renders seeded departments with role and staff counts", async () => {
    render(<TestWrapper />);
    expect(await screen.findByText("Human Resources")).toBeInTheDocument();
    expect(screen.getByText("Finance")).toBeInTheDocument();
  });

  it("restricts access without the departments module", async () => {
    render(<TestWrapper identityId="dev-finance" />);
    expect(await screen.findByText("Access restricted")).toBeInTheDocument();
    expect(screen.queryByText("Create department")).not.toBeInTheDocument();
  });

  it("hides roles management from identities without the roles grant", async () => {
    render(<TestWrapper identityId="dev-hr" />);
    expect(await screen.findByText("Human Resources")).toBeInTheDocument();
  });

  it("creates a department", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const nameInput = await openCreate(user);
    fireEvent.change(nameInput, { target: { value: "Engineering" } });
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(screen.getByText("Engineering")).toBeInTheDocument());
    await clickSwalConfirm(user);
  });

  it("requires a department name", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await openCreate(user);
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    expect(await screen.findByText("Department name is required.")).toBeInTheDocument();
  });

  it("rejects duplicate department names", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const nameInput = await openCreate(user);
    fireEvent.change(nameInput, { target: { value: "Finance" } });
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    expect(await screen.findByText("Department already exists.")).toBeInTheDocument();
    await clickSwalConfirm(user);
  });

  it("edits a department", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Human Resources");
    const row = screen.getByText("Human Resources").closest("tr")!;
    await clickRowAction(user, row, "Edit");
    const nameInput = await screen.findByDisplayValue("Human Resources");
    fireEvent.change(nameInput, { target: { value: "People Operations" } });
    await user.click(screen.getByRole("button", { name: /^save$/i }));
    await clickSwalConfirm(user);
    await waitFor(() => expect(screen.getByText("People Operations")).toBeInTheDocument());
    await clickSwalConfirm(user);
  });

  it("cancels department edit without changes", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Human Resources");
    const row = screen.getByText("Human Resources").closest("tr")!;
    await clickRowAction(user, row, "Edit");
    const nameInput = await screen.findByDisplayValue("Human Resources");
    fireEvent.change(nameInput, { target: { value: "Should Not Save" } });
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByText("Should Not Save")).not.toBeInTheDocument());
  });

  it("shows department details with counts", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Human Resources");
    const row = screen.getByText("Human Resources").closest("tr")!;
    await clickRowAction(user, row, "View");
    expect(await screen.findByText("Department details")).toBeInTheDocument();
  });

  it("blocks deleting a department with roles or staff", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Human Resources");
    const row = screen.getByText("Human Resources").closest("tr")!;
    await clickRowAction(user, row, "Delete");
    await clickSwalConfirm(user);
    expect(await screen.findByText("Department has assigned roles and cannot be deleted.", {}, { timeout: 3000 })).toBeInTheDocument();
    await clickSwalConfirm(user);
    expect(screen.getByText("Human Resources")).toBeInTheDocument();
  });

  it("deletes an empty department after confirm", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const nameInput = await openCreate(user);
    fireEvent.change(nameInput, { target: { value: "Temporary" } });
    await user.click(screen.getByRole("button", { name: /^create$/i }));
    await waitFor(() => expect(screen.getByText("Temporary")).toBeInTheDocument());
    await clickSwalConfirm(user);
    const row = screen.getByText("Temporary").closest("tr")!;
    await clickRowAction(user, row, "Delete");
    await clickSwalConfirm(user);
    await waitFor(() => expect(screen.queryByText("Temporary")).not.toBeInTheDocument());
    await clickSwalConfirm(user);
  });

  it("filters departments by status", async () => {
    render(<TestWrapper />);
    await screen.findByText("Human Resources");
    expect(screen.getAllByText("Human Resources").length).toBeGreaterThan(0);
  });

  it("searches departments", async () => {
    render(<TestWrapper />);
    const search = await screen.findByPlaceholderText("Search departments");
    fireEvent.change(search, { target: { value: "Human" } });
    await waitFor(() => expect(screen.queryByText("Finance")).not.toBeInTheDocument());
    expect(screen.getByText("Human Resources")).toBeInTheDocument();
  });

  it("sorts departments A-Z and Z-A", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByText("Human Resources");
    const sortButton = screen.getByRole("button", { name: /sort/i });
    expect(sortButton).toHaveTextContent("Sort A-Z");
    await user.click(sortButton);
    await waitFor(() => expect(screen.getByRole("button", { name: /sort/i })).toHaveTextContent("Sort Z-A"));
  });
});
