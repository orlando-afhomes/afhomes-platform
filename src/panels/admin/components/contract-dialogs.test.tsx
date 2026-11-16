import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { SalesContractDetailPage } from "../pages/sales-contract-detail-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin",
}));

afterEach(cleanup);

function Wrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId="dev-admin">{children}</DevIdentityProvider>
        <AppToaster />
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

describe("Approve deal", () => {
  it("confirms the signed agreement without a field for a manually assigned number, and stops on a missing rate", async () => {
    const user = userEvent.setup();
    render(<Wrapper><SalesContractDetailPage contractId="ctr-4" /></Wrapper>);
    await user.click(await screen.findByRole("button", { name: "Approve deal" }));
    const confirm = await screen.findByRole("alertdialog", { name: "Approve this deal?" });
    expect(within(confirm).getByText(/signed Reservation Agreement is on file/)).toBeInTheDocument();
    expect(within(confirm).queryByRole("textbox")).toBeNull();
    await user.click(within(confirm).getByRole("button", { name: "Approve deal" }));
    expect(await screen.findByText(/record the approved DSC rate/i)).toBeInTheDocument();
  });
});
