import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StaffLoginPage } from "@/panels/public/pages/staff-login-page";
import { SalesLoginPage } from "@/panels/public/pages/sales-login-page";
import { SessionIdentityProvider } from "@/shared/providers/session-identity-provider";
import { json, sessionBody } from "@/test/api-harness";
const replace = vi.fn();
let search = "";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams(search),
}));

function renderPage(ui: React.ReactElement, signedIn = false) {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/session")) return signedIn ? json(sessionBody("dev-admin")) : new Response(null, { status: 401 });
    return json({ items: [] });
  }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SessionIdentityProvider>{ui}</SessionIdentityProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  replace.mockClear();
  search = "";
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("Staff login page", () => {
  it("switches the portal with the Admin and Staff toggle", async () => {
    const user = userEvent.setup();
    renderPage(<StaffLoginPage />);
    const adminRadio = screen.getByRole("radio", { name: "Admin" });
    const staffRadio = screen.getByRole("radio", { name: "Staff" });
    expect(adminRadio).toBeChecked();
    await user.click(staffRadio);
    expect(staffRadio).toBeChecked();
    expect(adminRadio).not.toBeChecked();
  });

  it("validates empty and malformed fields before calling the server", async () => {
    const user = userEvent.setup();
    renderPage(<StaffLoginPage />);
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    expect(screen.getByText("Enter your email.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  });

  it("returns to the requested admin page after sign-in and ignores unsafe targets", async () => {
    search = "next=%2Fadmin%2Fcustomers";
    renderPage(<StaffLoginPage />, true);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/customers"));
    replace.mockClear();
    search = "next=https%3A%2F%2Fevil.com";
    renderPage(<StaffLoginPage />, true);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin"));
  });

  it("shows the recovery notice and returns to sign in", async () => {
    const user = userEvent.setup();
    renderPage(<StaffLoginPage />);
    await user.click(screen.getByRole("button", { name: "Forgot Password?" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("Enter your email.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Registered email"), "eduardo.ocampo@afhomes.com.ph");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText(/Contact your Administrator to reset your password/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
  });
});

describe("Sales login page", () => {
  it("has no portal toggle and links to Outsourced Seller registration and the website", () => {
    renderPage(<SalesLoginPage />);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register as Outsourced Seller (OST)" })).toHaveAttribute("href", "/register/ost");
    expect(screen.getByRole("link", { name: "Back to Website" })).toHaveAttribute("href", "/");
  });
});
