import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MOCK_ACCOUNTS } from "@/data/mock/mock-credentials";
import { StaffLoginPage } from "@/panels/public/pages/staff-login-page";
import { SalesLoginPage } from "@/panels/public/pages/sales-login-page";

const replace = vi.fn();
const signIn = vi.fn();
let status: "loading" | "signed-in" | "signed-out" = "signed-out";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }) }));
vi.mock("@/shared/providers/dev-identity-provider", () => ({
  useDevIdentity: () => ({ status, signIn }),
}));

const admin = MOCK_ACCOUNTS.find((account) => account.portal === "admin")!;
const staff = MOCK_ACCOUNTS.find((account) => account.portal === "staff")!;
const PASSWORD = admin.password;

function renderWithQuery(ui: React.ReactElement) {
  return render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  status = "signed-out";
  replace.mockClear();
  signIn.mockClear();
});
afterEach(cleanup);

describe("Staff login page", () => {
  it("switches the portal with the Admin and Staff toggle", async () => {
    const user = userEvent.setup();
    renderWithQuery(<StaffLoginPage />);
    const group = screen.getByRole("radiogroup", { name: "Sign in as" });
    expect(group).toBeInTheDocument();
    const adminRadio = screen.getByRole("radio", { name: "Admin" });
    const staffRadio = screen.getByRole("radio", { name: "Staff" });
    expect(adminRadio).toBeChecked();
    await user.click(staffRadio);
    expect(staffRadio).toBeChecked();
    expect(adminRadio).not.toBeChecked();
  });

  it("validates empty and malformed fields", async () => {
    const user = userEvent.setup();
    renderWithQuery(<StaffLoginPage />);
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    expect(screen.getByText("Enter your email.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("signs in and redirects on valid credentials", async () => {
    const user = userEvent.setup();
    renderWithQuery(<StaffLoginPage />);
    await user.type(screen.getByLabelText("Email"), admin.email);
    await user.type(screen.getByLabelText("Password"), PASSWORD);
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith(admin.identityId));
    expect(replace).toHaveBeenCalledWith("/admin");
  });

  it("shows an error for wrong credentials and for the wrong portal", async () => {
    const user = userEvent.setup();
    renderWithQuery(<StaffLoginPage />);
    await user.type(screen.getByLabelText("Email"), admin.email);
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    expect(await screen.findByText("Incorrect email or password.")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Password"));
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), staff.email);
    await user.type(screen.getByLabelText("Password"), PASSWORD);
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    expect(await screen.findByText(/signs in through Staff/)).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("resets the busy form when the preserved page is shown after sign-out", async () => {
    const user = userEvent.setup();
    const client = new QueryClient();
    // A fresh element per render: React skips re-rendering an identical element passed to rerender.
    const tree = () => (
      <QueryClientProvider client={client}>
        <StaffLoginPage />
      </QueryClientProvider>
    );
    const { rerender } = render(tree());
    await user.type(screen.getByLabelText("Email"), admin.email);
    await user.type(screen.getByLabelText("Password"), PASSWORD);
    await user.click(screen.getByRole("button", { name: "Sign In" }));
    await waitFor(() => expect(signIn).toHaveBeenCalledWith(admin.identityId));
    expect(screen.getByLabelText("Password")).toHaveValue("");

    status = "signed-in";
    rerender(tree());
    status = "signed-out";
    rerender(tree());

    const submit = screen.getByRole("button", { name: "Sign In" });
    expect(submit).toBeEnabled();
    expect(submit).toHaveAttribute("aria-busy", "false");
    expect(screen.getByLabelText("Email")).toHaveValue("");
  });

  it("redirects an existing session to the admin panel", () => {
    status = "signed-in";
    renderWithQuery(<StaffLoginPage />);
    expect(replace).toHaveBeenCalledWith("/admin");
  });

  it("shows the recovery notice and returns to sign in", async () => {
    const user = userEvent.setup();
    renderWithQuery(<StaffLoginPage />);
    await user.click(screen.getByRole("button", { name: "Forgot password?" }));
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(screen.getByText("Enter your email.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Registered email"), admin.email);
    await user.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(screen.getByText("Email recovery not available yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to sign in" }));
    expect(screen.getByRole("heading", { name: "Login" })).toBeInTheDocument();
  });
});

describe("Sales login page", () => {
  it("has no portal toggle and links to OST registration and the website", () => {
    renderWithQuery(<SalesLoginPage />);
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Register as OST" })).toHaveAttribute("href", "/register/ost");
    expect(screen.getByRole("link", { name: "Back to website" })).toHaveAttribute("href", "/");
  });
});
