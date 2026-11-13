import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { ContractReviewDetailPage } from "../pages/contract-review-detail-page";

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
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

describe("signed Reservation Agreement", () => {
  it("opens an issuance dialog without a field for a manually assigned number", async () => {
    const user = userEvent.setup();
    render(<Wrapper><ContractReviewDetailPage contractId="ctr-4" /></Wrapper>);
    await user.click(await screen.findByRole("button", { name: "Record signed agreement" }));
    expect(await screen.findByRole("heading", { name: "Record signed Reservation Agreement" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Record and issue number" }));
    expect(await screen.findByText(/record the approved DSC rate/i)).toBeInTheDocument();
  });
});
