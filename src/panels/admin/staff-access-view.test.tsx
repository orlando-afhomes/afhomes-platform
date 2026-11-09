import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { StaffPage } from "./pages/staff-page";

// The ?view= parameter selects the directory view (used by /admin/accounts).

let view: string | null = null;

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useSearchParams: () => new URLSearchParams(view ? { view } : {}),
}));

function TestWrapper({ identityId }: { identityId: string }) {
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
  view = null;
  window.history.replaceState(null, "", "/");
});

const row = (key: string) => document.querySelector(`tr[data-row-key="${key}"]`);
const chip = (name: RegExp | string) => screen.getByRole("button", { name });

describe("Staff & Access directory view from the URL", () => {
  it("opens the Account-only view for Admin when view=account", async () => {
    view = "account";
    render(<TestWrapper identityId="dev-admin" />);
    await waitFor(() => expect(row("acct-pending")).not.toBeNull(), { timeout: 5000 });
    expect(chip("Account only")).toHaveAttribute("aria-pressed", "true");
    expect(row("staff-1")).toBeNull();
    expect(row("acct-finance")).not.toBeNull();
  });

  it("opens Pending for view=pending and falls back to All for unknown values", async () => {
    view = "pending";
    const { unmount } = render(<TestWrapper identityId="dev-super-admin" />);
    await waitFor(() => expect(row("acct-pending")).not.toBeNull(), { timeout: 5000 });
    expect(chip(/^Pending Approvals \(\d+\)$/)).toHaveAttribute("aria-pressed", "true");
    expect(row("acct-finance")).toBeNull();
    unmount();
    view = "bogus";
    render(<TestWrapper identityId="dev-super-admin" />);
    await waitFor(() => expect(row("acct-pending")).not.toBeNull(), { timeout: 5000 });
    expect(chip("All")).toHaveAttribute("aria-pressed", "true");
  });

  it("shows HR employees only, with no chips or account rows, even when view=account", async () => {
    view = "account";
    render(<TestWrapper identityId="dev-hr" />);
    await screen.findByText("HR Specialist", {}, { timeout: 5000 });
    expect(screen.queryByRole("button", { name: "Account only" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Directory view" })).toBeNull();
    expect(row("staff-1")).not.toBeNull();
    expect(row("acct-pending")).toBeNull();
    expect(row("acct-finance")).toBeNull();
  });

  it("follows the URL when it changes while the page stays mounted", async () => {
    const { rerender } = render(<TestWrapper identityId="dev-admin" />);
    await waitFor(() => expect(row("acct-pending")).not.toBeNull(), { timeout: 5000 });
    expect(chip("All")).toHaveAttribute("aria-pressed", "true");
    view = "account";
    rerender(<TestWrapper identityId="dev-admin" />);
    await waitFor(() => expect(chip("Account only")).toHaveAttribute("aria-pressed", "true"));
    expect(row("staff-1")).toBeNull();
    view = null;
    rerender(<TestWrapper identityId="dev-admin" />);
    await waitFor(() => expect(chip("All")).toHaveAttribute("aria-pressed", "true"));
  });

  it("keeps the URL in step with the chosen view without adding history entries", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-admin" />);
    await waitFor(() => expect(row("acct-pending")).not.toBeNull(), { timeout: 5000 });
    const entries = window.history.length;
    await user.click(chip("Account only"));
    expect(window.location.search).toBe("?view=account");
    await user.click(chip("All"));
    expect(window.location.search).toBe("");
    expect(window.history.length).toBe(entries);
  });
});
