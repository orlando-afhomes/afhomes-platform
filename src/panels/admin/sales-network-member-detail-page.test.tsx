import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { SalesNetworkMemberDetailPage } from "./pages/sales-network-member-detail-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin/sales-network/members/AAI26100003",
  useParams: () => ({ id: "AAI26100003" }),
}));

function Wrapper({ identityId, children }: { identityId: string; children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
});

describe("sales network member detail page", () => {
  it("shows the member summary and overview for a Super Administrator", async () => {
    render(
      <Wrapper identityId="dev-super-admin">
        <SalesNetworkMemberDetailPage />
      </Wrapper>,
    );
    const summary = await screen.findByRole("region", { name: "Member summary for Jose Reyes Jr." }, { timeout: 5000 });
    expect(within(summary).getByRole("heading", { name: "Jose Reyes Jr." })).toBeInTheDocument();
    expect(within(summary).getByText("AAI26100003")).toBeInTheDocument();
    expect((await within(summary).findAllByText("Pending", undefined, { timeout: 5000 })).length).toBeGreaterThan(0);
    const overview = screen.getByRole("tabpanel", { name: "Overview" });
    expect(within(overview).getByRole("heading", { name: "Accreditation" })).toBeInTheDocument();
  });

  it("switches to the grouped Profile tab", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper identityId="dev-super-admin">
        <SalesNetworkMemberDetailPage />
      </Wrapper>,
    );
    await screen.findByRole("region", { name: "Member summary for Jose Reyes Jr." }, { timeout: 5000 });
    await user.click(screen.getByRole("tab", { name: /Profile/ }));
    const profile = await screen.findByRole("tabpanel", { name: "Profile" });
    expect(within(profile).getByText("Personal")).toBeInTheDocument();
    expect(within(profile).getByText("Government ID Number")).toBeInTheDocument();
    expect(within(profile).getByText(/567A$/)).toBeInTheDocument();
    expect(within(profile).getByText("Passport")).toBeInTheDocument();
  });

  it("lists the direct downline on the Downline tab", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper identityId="dev-super-admin">
        <SalesNetworkMemberDetailPage />
      </Wrapper>,
    );
    await screen.findByRole("region", { name: "Member summary for Jose Reyes Jr." }, { timeout: 5000 });
    await user.click(screen.getByRole("tab", { name: /Downline/ }));
    const downline = await screen.findByRole("tabpanel", { name: /Downline/ });
    await waitFor(() => expect(within(downline).getAllByText("Ana Mendoza").length).toBeGreaterThan(0), { timeout: 5000 });
  });
});
