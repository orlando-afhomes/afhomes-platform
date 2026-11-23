import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { MockAccreditationRepository } from "@/data/mock/accreditation-repository";
import { MockMemberRepository } from "@/data/mock/member-repository";
import { createMockStore } from "@/data/mock/seed";
import { SalesNetworkMemberDetailPage } from "./pages/sales-network-member-detail-page";

// AA numbers are dated relative to today: the route uses Jose Reyes Jr.'s number from the seed.
const route = vi.hoisted(() => ({ aaNumber: "" }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => `/admin/sales-network/members/${route.aaNumber}`,
  useParams: () => ({ id: route.aaNumber }),
}));

const seedMember = createMockStore().members.find((member) => member.id === "mem-sm-a")!;
route.aaNumber = seedMember.aaNumber!;

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
    expect(within(summary).getByText(route.aaNumber)).toBeInTheDocument();
    // The seeded IST accreditation is approved.
    expect((await within(summary).findAllByText("Active", undefined, { timeout: 5000 })).length).toBeGreaterThan(0);
    const overview = screen.getByRole("tabpanel", { name: "Overview" });
    expect(within(overview).getByRole("heading", { name: "Accreditation" })).toBeInTheDocument();
  });

  it("shows the member actions once, as header buttons, with no row menu", async () => {
    render(
      <Wrapper identityId="dev-super-admin">
        <SalesNetworkMemberDetailPage />
      </Wrapper>,
    );
    await screen.findByRole("region", { name: "Member summary for Jose Reyes Jr." }, { timeout: 5000 });
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deactivate" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Actions for/ })).toBeNull();
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
    const idNumber = seedMember.sellerProfile!.governmentIdNumber!;
    expect(within(profile).getByText(new RegExp(`${idNumber.slice(-4)}$`))).toBeInTheDocument();
    expect(within(profile).getByText(seedMember.sellerProfile!.governmentIdType!)).toBeInTheDocument();
  });

  it("lists the direct team on the Team Below tab", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper identityId="dev-super-admin">
        <SalesNetworkMemberDetailPage />
      </Wrapper>,
    );
    await screen.findByRole("region", { name: "Member summary for Jose Reyes Jr." }, { timeout: 5000 });
    await user.click(screen.getByRole("tab", { name: /Team Below/ }));
    const downline = await screen.findByRole("tabpanel", { name: /Team Below/ });
    await waitFor(() => expect(within(downline).getAllByText("Ana Mendoza").length).toBeGreaterThan(0), { timeout: 5000 });
  });

  it("shows a member load error with a retry instead of Member not found", async () => {
    const user = userEvent.setup();
    vi.spyOn(MockMemberRepository.prototype, "getByAaNumber").mockRejectedValueOnce(new Error("Member lookup failed."));
    render(
      <Wrapper identityId="dev-super-admin">
        <SalesNetworkMemberDetailPage />
      </Wrapper>,
    );
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/Member lookup failed\./)).toBeInTheDocument();
    expect(screen.queryByText("Member not found or restricted.")).toBeNull();
    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("region", { name: "Member summary for Jose Reyes Jr." }, { timeout: 5000 })).toBeInTheDocument();
  });

  it("shows an accreditation load error with a retry instead of incomplete badges", async () => {
    const user = userEvent.setup();
    vi.spyOn(MockAccreditationRepository.prototype, "listByMember").mockRejectedValueOnce(new Error("Accreditation records failed."));
    render(
      <Wrapper identityId="dev-super-admin">
        <SalesNetworkMemberDetailPage />
      </Wrapper>,
    );
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText("Accreditation data could not be loaded")).toBeInTheDocument();
    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("region", { name: "Member summary for Jose Reyes Jr." }, { timeout: 5000 })).toBeInTheDocument();
  });
});
