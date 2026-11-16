import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { CommissionsAreaPage } from "./commissions-area-page";

const navigation = vi.hoisted(() => ({ search: "" }));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/admin/commissions",
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

function Wrapper({ children, identityId }: { children: React.ReactNode; identityId: string }) {
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
  navigation.search = "";
  window.history.replaceState(null, "", "/");
});

function show(page: ReactElement, tab: string, identityId = "dev-admin") {
  navigation.search = `tab=${tab}`;
  return render(<Wrapper identityId={identityId}>{page}</Wrapper>);
}

describe("Commissions tables and details", () => {
  it("opens a row into a sectioned drawer with colored actions and no 'View full details'", async () => {
    const user = userEvent.setup();
    show(<CommissionsAreaPage />, "commissions");
    await screen.findByRole("table", { name: "Commissions" });
    const rows = await screen.findAllByRole("row", { name: /^Open commission for / });
    await user.click(rows.find((row) => within(row).queryByText("Approved")) as HTMLElement);
    const drawer = await screen.findByRole("dialog");
    expect(within(drawer).getByRole("region", { name: "Commission" })).toBeInTheDocument();
    expect(within(drawer).getByRole("region", { name: "Payout" })).toBeInTheDocument();
    expect(within(drawer).getByRole("button", { name: "Adjust" }).className).toContain("tw:text-warning");
    expect(within(drawer).getByRole("button", { name: "Cancel commission" }).className).toContain("tw:bg-destructive");
    await user.keyboard("{Escape}");
    expect(screen.queryByText("View full details")).toBeNull();
  });
});

describe("Set rate", () => {
  it("fills the approved VIP rate from the seller's position after the Admin confirms the terms", async () => {
    const user = userEvent.setup();
    show(<CommissionsAreaPage />, "rates");
    await user.click(await screen.findByRole("button", { name: "Set VIP standard" }));
    const setup = within(await screen.findByRole("dialog", { name: "Set approved VIP standard" }));
    await user.click(setup.getByRole("combobox", { name: /^Seller position/ }));
    await user.click(await screen.findByRole("option", { name: "OST" }));
    await user.type(setup.getByLabelText(/^Approved standard/), "0");
    await user.type(setup.getByLabelText(/^Approval reference/), "Demo approval 01");
    await user.click(setup.getByRole("button", { name: "Save standard" }));
    expect(await screen.findByText("Demo approval 01")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Set rate" }));
    const form = within(await screen.findByRole("dialog", { name: "Set approved commission rate" }));
    await user.click(form.getByRole("combobox", { name: "Customer" }));
    await user.click(await screen.findByRole("option", { name: "Customer A One" }));
    expect(form.getByRole("combobox", { name: /^Seller/ })).toHaveValue("Ana Mendoza");
    expect(form.getByText(/Demo approval 01/)).toBeInTheDocument();
    expect(form.queryByLabelText("Approved rate (%)")).not.toBeInTheDocument();
    await user.type(form.getByLabelText(/^Seller's service terms reference/), "Demo seller terms 01");
    await user.click(form.getByRole("button", { name: "Save rate" }));
    expect(await form.findByRole("alert")).toHaveTextContent(/confirm/);
    await user.click(form.getByRole("checkbox", { name: /I confirm/ }));
    await user.click(form.getByRole("button", { name: "Save rate" }));
    const rate = await screen.findByRole("row", { name: "Open rate for Ana Mendoza" });
    expect(within(rate).getByText("0%")).toBeInTheDocument();
  });

  it("fills the closing seller from a customer and the referrer from the sale", async () => {
    const user = userEvent.setup();
    show(<CommissionsAreaPage />, "rates");
    const setRate = await screen.findByRole("button", { name: "Set rate" });
    await user.click(setRate);
    const form = within(await screen.findByRole("dialog", { name: "Set approved commission rate" }));
    await user.click(form.getByRole("combobox", { name: "Customer" }));
    await user.click(await screen.findByRole("option", { name: "Customer A One" }));
    expect(form.getByRole("combobox", { name: /^Seller/ })).toHaveValue("Ana Mendoza");
    expect(form.getByRole("combobox", { name: /^Product/ })).toHaveValue("VIP");

    await user.click(form.getByRole("combobox", { name: /^Commission type/ }));
    await user.click(await screen.findByRole("option", { name: "Referrer" }));
    expect(form.getByRole("combobox", { name: /^Seller/ })).toHaveValue("Paolo Ramos");
  });

  it("opens the rates dialog from an authorized sale link and removes the context on close", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/admin/commissions?tab=rates&sale=sale-1&role=DRI");
    show(<CommissionsAreaPage />, "rates&sale=sale-1&role=DRI");
    const form = within(await screen.findByRole("dialog", { name: "Set approved commission rate" }));
    expect(form.getByRole("combobox", { name: "Customer" })).toHaveValue("Customer A One");
    expect(form.getByRole("combobox", { name: /^Seller/ })).toHaveValue("Paolo Ramos");
    await user.click(form.getByRole("button", { name: "Cancel" }));
    expect(window.location.search).toBe("?tab=rates");
    expect(screen.queryByRole("dialog", { name: "Set approved commission rate" })).toBeNull();
  });
});

describe("Allowance review form", () => {
  it("shows the three steps, reveals fields only when needed, and validates the month", async () => {
    const user = userEvent.setup();
    show(<CommissionsAreaPage />, "allowances");
    expect(await screen.findByRole("region", { name: "Step 1: Month and leader" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Step 3: Company spreadsheet figures (optional)" })).toBeInTheDocument();
    expect(screen.getByText("Type the amounts from the company Excel file so the system can compare them.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Month/)).toHaveAttribute("type", "month");

    expect(screen.queryByLabelText("Explanation of any difference")).toBeNull();
    expect(screen.queryByLabelText(/Reason for withholding/)).toBeNull();
    fireEvent.change(screen.getByLabelText("Performance bonus"), { target: { value: "10" } });
    expect(await screen.findByLabelText("Explanation of any difference")).toBeInTheDocument();
    await user.click(screen.getByRole("switch", { name: "Withhold basic allowance this month" }));
    expect(await screen.findByLabelText(/Reason for withholding/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Calculate allowances" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Choose the month.");
    expect(screen.getByRole("button", { name: "Calculate allowances" }).className).toContain("tw:text-info");
  });
});
