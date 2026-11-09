import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { ACCOUNTS_COMPAT_TARGET, AccountsCompatibilityPage } from "./pages/accounts-compat-page";

const replace = vi.fn();
const push = vi.fn();

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace, push }),
}));

function TestWrapper({ identityId }: { identityId: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <AccountsCompatibilityPage />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>

  );
}

afterEach(() => {
  cleanup();
  replace.mockClear();
  push.mockClear();
});

describe("/admin/accounts compatibility route", () => {
  it("targets the Account-only view of Staff & Access, using the real chip identifier", () => {
    expect(ACCOUNTS_COMPAT_TARGET).toBe("/admin/organization/staff?view=account");
  });

  for (const identityId of ["dev-admin", "dev-super-admin"]) {
    it(`forwards ${identityId} with replace (no extra history entry)`, async () => {
      render(<TestWrapper identityId={identityId} />);
      await waitFor(() => expect(replace).toHaveBeenCalledWith(ACCOUNTS_COMPAT_TARGET));
      expect(replace).toHaveBeenCalledTimes(1);
      expect(push).not.toHaveBeenCalled();
      expect(screen.queryByRole("table")).toBeNull();
    });
  }

  for (const identityId of ["dev-hr", "dev-finance", "dev-ost-a1"]) {
    it(`shows a restriction and does not forward ${identityId}`, async () => {
      render(<TestWrapper identityId={identityId} />);
      expect(await screen.findByText("Access restricted")).toBeInTheDocument();
      expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Accounts and Permissions");
      expect(replace).not.toHaveBeenCalled();
      expect(screen.queryByRole("table")).toBeNull();
    });
  }
});
