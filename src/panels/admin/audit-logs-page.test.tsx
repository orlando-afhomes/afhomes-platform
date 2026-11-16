import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { AuditLogsPage } from "./pages/audit-logs-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/audit-logs",
  useSearchParams: () => new URLSearchParams(),
}));

function Wrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId="dev-admin">{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(cleanup);

describe("audit logs page", () => {
  it("shows five columns, one value each, and no row menu", async () => {
    render(<Wrapper><AuditLogsPage /></Wrapper>);
    const table = await screen.findByRole("table", { name: "Audit Events" });
    const headers = within(table).getAllByRole("columnheader").map((cell) => cell.textContent);
    expect(headers).toEqual(["When", "Action", "Record Type", "Record", "Actor"]);
    expect(screen.queryByRole("button", { name: /^Actions for/ })).toBeNull();
  });

  it("opens every value of an event from the row, with plain-English action text", async () => {
    render(<Wrapper><AuditLogsPage /></Wrapper>);
    const table = await screen.findByRole("table", { name: "Audit Events" });
    const row = within(table).getAllByRole("row")[1];
    expect(within(row).queryByText(/[A-Z]+_[A-Z]+/)).toBeNull();
    fireEvent.click(row);
    const sheet = await screen.findByRole("dialog");
    const labels = Array.from(sheet.querySelectorAll("dt")).map((term) => term.textContent);
    expect(labels).toEqual(expect.arrayContaining(["When", "Action", "Module", "Record Type", "Record", "Details", "Actor", "Actor roles", "Previous value", "New value", "Reason"]));
  });

  it("filters by an actor picked from a searchable list that includes System", async () => {
    const user = userEvent.setup();
    render(<Wrapper><AuditLogsPage /></Wrapper>);
    const box = await screen.findByRole("combobox", { name: "Actor filter" });
    await user.click(box);
    expect(await screen.findByRole("option", { name: "System" })).toBeInTheDocument();
    await user.clear(box);
    await user.type(box, "Sys");
    await user.click(await screen.findByRole("option", { name: "System" }));
    const table = await screen.findByRole("table", { name: "Audit Events" });
    const rows = within(table).getAllByRole("row").slice(1);
    for (const row of rows) {
      if (row.textContent?.includes("No audit events match")) continue;
      expect(within(row).getAllByRole("cell").at(-1)).toHaveTextContent("System");
    }
  });
});
