import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

describe("department transfer count verification", () => {
  function departmentCount(name: string) {
    const row = Array.from(document.querySelectorAll(".ant-table-tbody tr")).find((r) => r.textContent?.includes(name));
    const cells = row?.querySelectorAll("td");
    return cells?.[1]?.textContent?.trim() ?? "";
  }

  it("updates both department counts after transfer", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await screen.findByText("Finance", {}, { timeout: 5000 });

    const initialFinance = departmentCount("Finance");
    const initialHr = departmentCount("Human Resources");

    // switch to staff tab
    await user.click(screen.getByRole("tab", { name: "Staff" }));
    await screen.findByText("Finance Staff", {}, { timeout: 5000 });

    // edit first staff (Finance Staff)
    const editBtns = await screen.findAllByRole("button", { name: "Edit" });
    fireEvent.click(editBtns[0]);
    await user.click(screen.getByRole("combobox", { name: "Staff department" }));
    await user.click(await screen.findByRole("option", { name: "Human Resources" }));
    const nameInput = await screen.findByDisplayValue("Finance Staff");
    fireEvent.change(nameInput, { target: { value: "Finance Staff" } });
    fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
    await waitFor(() => expect(screen.getAllByText("Finance Staff").length).toBeGreaterThan(0));

    // switch back to departments tab
    await user.click(screen.getByRole("tab", { name: "Departments" }));
    await screen.findByText("Finance", {}, { timeout: 5000 });

    const newFinance = departmentCount("Finance");
    const newHr = departmentCount("Human Resources");

    expect(Number(newFinance)).toBe(Number(initialFinance) - 1);
    expect(Number(newHr)).toBe(Number(initialHr) + 1);
  });
});
