import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { PromoPointsReportPage } from "./pages/promo-points-report-page";
import { StayPointsAreaPage } from "./pages/stay-points-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/stay-points",
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

function Wrapper({ identityId, children }: { identityId: string; children: ReactElement }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <AppToaster />
          {children}
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

const show = (identityId: string, page: ReactElement) => render(<Wrapper identityId={identityId}>{page}</Wrapper>);

function showStayPoints(identityId: string, tab: "promos" | "promo-points" | "welcome-gift") {
  window.history.replaceState(null, "", `/admin/stay-points?tab=${tab}`);
  return show(identityId, <StayPointsAreaPage />);
}

afterEach(() => {
  cleanup();
  toast.dismiss();
  window.history.replaceState(null, "", "/");
});

describe("promos page", () => {
  it("lists the sample promo and filters by status and search", async () => {
    const user = userEvent.setup();
    showStayPoints("dev-admin", "promos");
    expect(await screen.findByText(/Teppanyaki Dining Points/)).toBeInTheDocument();
    // Sample notices are removed from the UI (owner ruling 2026-11-15).
    expect(screen.queryByText("Sample")).toBeNull();
    await user.type(screen.getByRole("searchbox", { name: /search promos/i }), "nothing-like-this");
    expect(await screen.findByText("No promos found.")).toBeInTheDocument();
  });

  it("adds a promo from the dialog and shows it as a draft", async () => {
    const user = userEvent.setup();
    showStayPoints("dev-admin", "promos");
    await screen.findByText(/Teppanyaki Dining Points/);
    await user.click(screen.getByRole("button", { name: /add promo/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/^Promo name/), { target: { value: "Spa Weekend Points" } });
    fireEvent.change(within(dialog).getByLabelText(/^Start date/), { target: { value: "2026-12-01" } });
    fireEvent.change(within(dialog).getByLabelText(/^End date/), { target: { value: "2026-12-31" } });
    fireEvent.change(within(dialog).getByLabelText(/^Pesos spent per point/), { target: { value: "50" } });
    await user.click(within(dialog).getAllByRole("checkbox", { name: "Resort Spa" })[0]);
    await user.click(within(dialog).getAllByRole("checkbox", { name: "Resort Spa" })[1]);
    await user.click(within(dialog).getByRole("button", { name: /^add promo$/i }));
    const table = await screen.findByRole("table", { name: "Promos" });
    const row = (await within(table).findByText("Spa Weekend Points")).closest("tr")!;
    expect(within(row).getByText("Draft")).toBeInTheDocument();
  });

  it("lets the Clerk view details and hides management actions", async () => {
    showStayPoints("dev-clerk", "promos");
    expect(await screen.findByText(/Teppanyaki Dining Points/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add promo/i })).toBeNull();
    // The row opens the details; there is no row menu without a management action.
    expect(screen.queryByRole("button", { name: /actions for/i })).toBeNull();
    fireEvent.click(screen.getByText(/Teppanyaki Dining Points/).closest("tr")!);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});

describe("promo points page", () => {
  it("offers Record points use to the Clerk and shows the empty ledger", async () => {
    const user = userEvent.setup();
    showStayPoints("dev-clerk", "promo-points");
    expect(await screen.findByText("No Promo Points entries yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /record points use/i }));
    expect(await screen.findByRole("dialog", { name: /record points use/i })).toBeInTheDocument();
  });

  it("hides Record points use from Finance", async () => {
    showStayPoints("dev-finance", "promo-points");
    expect(await screen.findByText("No Promo Points entries yet.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: /record points use/i })).toBeNull());
  });

  it("does not show Stay Points tabs to HR", async () => {
    showStayPoints("dev-hr", "welcome-gift");
    expect(await screen.findByText(/does not have access to Stay Points/)).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).toBeNull();
  });
});

describe("promo points report", () => {
  it("shows the tiles and one Export menu with Excel, CSV and Print", async () => {
    show("dev-finance", <PromoPointsReportPage />);
    expect((await screen.findAllByText("Points earned")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /Export/ }));
    expect((await screen.findAllByRole("menuitem")).map((item) => item.textContent?.trim())).toEqual(["Excel", "CSV", "Print"]);
  });
});
