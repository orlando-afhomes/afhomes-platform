import { describe, expect, it, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { MyAccountPage } from "./pages/my-account-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin/account",
}));

function TestWrapper({ identityId = "dev-admin" }: { identityId?: string }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>
          <AppToaster />
          <MyAccountPage />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(() => {
  cleanup();
  toast.dismiss();
});

async function confirmSave(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole("alertdialog");
  await user.click(within(dialog).getByRole("button", { name: "Save" }));
}

describe("my account page", () => {
  it("shows profile fields for a linked admin identity", async () => {
    render(<TestWrapper />);
    expect(await screen.findByDisplayValue("Admin User", {}, { timeout: 5000 })).toBeDefined();
    expect(screen.getByPlaceholderText("New Password")).toBeDefined();
  });

  // S3-04/S3-B: department and role are read-only on My Account, including for admins.
  it("shows admins their department and role read-only, with no self-assignment controls", async () => {
    render(<TestWrapper />);
    await screen.findByDisplayValue("Admin User", {}, { timeout: 5000 });
    expect(screen.queryByRole("combobox", { name: "My account department" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "My account role" })).toBeNull();
    expect(screen.queryByText("Account Roles")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    await waitFor(() => expect(screen.getByText("HR Staff", { selector: "dd" })).toBeInTheDocument());
    expect(screen.getByText("Your department, role, and account status are managed by an authorized administrator.")).toBeInTheDocument();
  });

  it("saves only profile fields and keeps the linked account in step", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-hr" />);
    const emailInput = await screen.findByDisplayValue("hrstaff@afhomes.local", {}, { timeout: 5000 });
    fireEvent.change(emailInput, { target: { value: "hr.updated@afhomes.local" } });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await confirmSave(user);
    expect(await screen.findByText("Account updated successfully.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("hr.updated@afhomes.local", { selector: "dd" })).toBeInTheDocument());
  });

  it("saves profile changes after confirmation and reports a toast", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const nameInput = await screen.findByDisplayValue("Admin User", {}, { timeout: 5000 });
    fireEvent.change(nameInput, { target: { value: "Admin User Updated" } });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await confirmSave(user);
    expect(await screen.findByText("Account updated successfully.")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Admin User Updated")).toBeInTheDocument();
  });

  it("rejects mismatched passwords before saving", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    await screen.findByDisplayValue("Admin User", {}, { timeout: 5000 });
    fireEvent.change(screen.getByPlaceholderText("New Password"), { target: { value: "password1234" } });
    fireEvent.change(screen.getByPlaceholderText("Confirm Password"), { target: { value: "different1234" } });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Confirm Password")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("requires a name and a long enough new password", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const nameInput = await screen.findByDisplayValue("Admin User", {}, { timeout: 5000 });
    fireEvent.change(nameInput, { target: { value: "" } });
    fireEvent.change(screen.getByPlaceholderText("New Password"), { target: { value: "short" } });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Full name is required.")).toBeInTheDocument();
    expect(screen.getByText(/New password must be at least 12 characters\./)).toBeInTheDocument();
  });

  it("shows and hides the password text", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const input = await screen.findByPlaceholderText("New Password");
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show new password" }));
    expect(input).toHaveAttribute("type", "text");
  });

  it("rejects non-image and oversized profile pictures", async () => {
    render(<TestWrapper />);
    await screen.findByDisplayValue("Admin User", {}, { timeout: 5000 });
    const file = screen.getByLabelText("Profile picture file");
    fireEvent.change(file, { target: { files: [new File(["x"], "a.txt", { type: "text/plain" })] } });
    expect(await screen.findByText("Unsupported image format.")).toBeInTheDocument();
    const big = new File(["x"], "big.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: 3 * 1024 * 1024 });
    fireEvent.change(file, { target: { files: [big] } });
    expect(await screen.findByText("Image must be 2MB or smaller.")).toBeInTheDocument();
  });

  it("shows read-only employment info without admin controls for HR", async () => {
    render(<TestWrapper identityId="dev-hr" />);
    expect(await screen.findByDisplayValue("HR Staff", {}, { timeout: 5000 })).toBeDefined();
    expect(screen.queryByRole("combobox", { name: "My account department" })).toBeNull();
    expect(screen.queryByText("Account Roles")).toBeNull();
    await waitFor(() => expect(screen.getAllByText("Human Resources").length).toBeGreaterThan(0));
  });

  it("shows an empty state when no staff or account is linked", async () => {
    render(<TestWrapper identityId="dev-finance" />);
    expect(await screen.findByText("No linked staff or account record found for this identity.")).toBeDefined();
  });

  it("restricts inactive identities", async () => {
    render(<TestWrapper identityId="dev-inactive" />);
    expect(await screen.findByText("Access restricted")).toBeInTheDocument();
  });

  it("shows the read-only referral code card for a sales member identity", async () => {
    render(<TestWrapper identityId="dev-svd-a" />);
    expect(await screen.findByText("My referral code", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("hides the referral code card for an identity without a member record", async () => {
    render(<TestWrapper identityId="dev-super-admin" />);
    await screen.findByText("Profile information", {}, { timeout: 5000 });
    expect(screen.queryByText("My referral code")).toBeNull();
  });
});
