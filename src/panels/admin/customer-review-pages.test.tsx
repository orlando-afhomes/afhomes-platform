import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { CustomerDetailPage } from "./pages/customer-detail-page";
import { CustomerFormPage } from "./pages/customer-form-page";
import { CustomersPage } from "./pages/customers-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin",
}));

function Wrapper({ identityId, children }: { identityId: string; children: React.ReactNode }) {
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

function show(identityId: string, page: ReactElement) {
  return render(<Wrapper identityId={identityId}>{page}</Wrapper>);
}

afterEach(() => {
  cleanup();
  Swal.close();
  toast.dismiss();
  vi.restoreAllMocks();
});

// cust-a3 is submitted and its closing seller (SM) differs from the referrer (OST), so it can be approved as seeded.
const SUBMITTED = "cust-a3";

describe("customer registration review pages (doc 04 sections 5 and 10)", () => {
  it("offers Approve, Send back and Reject to the Administrator only", async () => {
    show("dev-admin", <CustomerDetailPage customerId={SUBMITTED} />);
    expect(await screen.findByRole("button", { name: /^approve$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send back/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^reject$/i })).toBeInTheDocument();
    cleanup();

    show("dev-clerk", <CustomerDetailPage customerId={SUBMITTED} />);
    expect(await screen.findByRole("link", { name: /correct data/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^approve$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /send back/i })).toBeNull();
  });

  it("requires a reason to send back, then shows the sent back status", async () => {
    const user = userEvent.setup();
    show("dev-admin", <CustomerDetailPage customerId={SUBMITTED} />);
    await user.click(await screen.findByRole("button", { name: /send back/i }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Send back" }));
    expect(await within(dialog).findByText("Reason is required.")).toBeInTheDocument();
    await user.type(within(dialog).getByRole("textbox"), "Missing ID photo");
    await user.click(within(dialog).getByRole("button", { name: "Send back" }));
    expect(await screen.findByText("Sent back to the Clerk.")).toBeVisible();
    expect(await screen.findByText("Missing ID photo")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("button", { name: /^approve$/i })).toBeNull());
  });

  it("approves after a confirmation without activating a membership", async () => {
    const user = userEvent.setup();
    show("dev-admin", <CustomerDetailPage customerId={SUBMITTED} />);
    await user.click(await screen.findByRole("button", { name: /^approve$/i }));
    const confirm = await screen.findByRole("alertdialog", { name: /approve this registration/i });
    await user.click(within(confirm).getByRole("button", { name: "Approve" }));
    expect(await screen.findByText("Registration approved.")).toBeVisible();
    expect(await screen.findByText("Approved")).toBeInTheDocument();
    expect(screen.queryByText("Active Member")).toBeNull();
  });

  it("tells the Clerk why a registration was sent back and lets them fix it", async () => {
    show("dev-clerk", <CustomerDetailPage customerId="cust-a7" />);
    expect(await screen.findByText("Residential address is missing.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /fix and resubmit/i })).toBeInTheDocument();
  });

  it("shows the seller their rejected record with the reason and no edit action", async () => {
    show("dev-ost-a2", <CustomerDetailPage customerId="cust-a8" />);
    expect(await screen.findByText("Duplicate of an existing customer record.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /edit draft|correct data|fix and resubmit/i })).toBeNull();
  });

  it("lists the review statuses and filters by them", async () => {
    show("dev-admin", <CustomersPage />);
    expect(await screen.findByText("Noel Pascual")).toBeInTheDocument();
    expect(screen.getByText("Gina Soriano")).toBeInTheDocument();
    expect(screen.getByText("Victor Alcantara")).toBeInTheDocument();
  });

  it("lets a seller start a draft but ends their wizard at Sales and consent with a draft-only action", async () => {
    const user = userEvent.setup();
    show("dev-ost-a1", <CustomerFormPage />);
    await user.click(await screen.findByRole("radio", { name: /silver vip/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));
    const progress = await screen.findByRole("list", { name: "Progress" });
    expect(within(progress).getByText(/sales and consent/i)).toBeInTheDocument();
    expect(within(progress).queryByText(/^review$/i)).toBeNull();
    expect(within(progress).queryByText(/reservation/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /submit application/i })).toBeNull();
  });
});
