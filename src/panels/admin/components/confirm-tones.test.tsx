import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { usePayments } from "@/data/business-queries";
import { PeriodClosePanel } from "../pages/period-close-page";
import { usePaymentActions } from "./payment-actions";

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

function OpenPayment() {
  const payments = usePayments();
  const { rowActions, dialogs } = usePaymentActions();
  const open = (payments.data ?? []).find((payment) => payment.status === "submitted" && !payment.approvalBlocked && !payment.referenceConflict);
  return <>{open ? rowActions(open) : null}{dialogs}</>;
}

afterEach(() => {
  Swal.close();
  cleanup();
});

describe("Confirmation pop-up colors", () => {
  it("shows the Close month confirmation with a red button", async () => {
    const user = userEvent.setup();
    render(<Wrapper><PeriodClosePanel /></Wrapper>);
    await user.click(await screen.findByRole("button", { name: "Close Month" }));
    const alert = await screen.findByRole("alertdialog", { name: "Close This Month?" });
    expect(within(alert).getByRole("button", { name: "Close Month" }).className).toContain("destructive");
  });

  it("colors the payment pop-ups by purpose: Reject red, Return amber", async () => {
    const user = userEvent.setup();
    render(<Wrapper><OpenPayment /></Wrapper>);
    for (const [item, name, tone] of [["Reject", "Reject", "destructive"], ["Return for Correction", "Return", "warning"]] as const) {
      await user.click(await screen.findByRole("button", { name: /actions/i }));
      await user.click(await screen.findByRole("menuitem", { name: item }));
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByRole("button", { name }).className).toContain(tone);
      await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    }
  });
});
