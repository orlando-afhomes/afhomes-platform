import { describe, expect, it, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { AppToaster } from "@/shared/components/modern/app-toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { MockStaffRepository } from "@/data/mock/staff-repository";
import { createMockStore } from "@/data/mock/seed";
import { MyAccountPage } from "./pages/my-account-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/admin/account",
}));

// Seeded profile values, read from the same seed the provider builds.
const seed = createMockStore();
const adminStaff = seed.staff.find((item) => item.id === "staff-admin")!;
const hrStaff = seed.staff.find((item) => item.id === "staff-1")!;
const ADMIN_NAME = adminStaff.displayName;
const ADMIN_ROLE = seed.roles.find((item) => item.id === adminStaff.departmentRoleId)!.name;

function TestWrapper({ identityId = "dev-admin", client }: { identityId?: string; client?: QueryClient }) {
  const [queryClient] = useState(() => client ?? new QueryClient());
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
  vi.restoreAllMocks();
});

async function confirmSave(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole("alertdialog");
  await user.click(within(dialog).getByRole("button", { name: "Save" }));
}

describe("my account page", () => {
  it("shows profile fields for a linked admin identity", async () => {
    render(<TestWrapper />);
    expect(await screen.findByDisplayValue(ADMIN_NAME, {}, { timeout: 5000 })).toBeDefined();
    // No password field: nothing is saved here, so the page says who resets passwords.
    expect(screen.queryByPlaceholderText("New Password")).toBeNull();
    expect(screen.getByText("To change your password, ask an Administrator to reset it for you.")).toBeInTheDocument();
  });

  // S3-04/S3-B: department and role are read-only on My Account, including for admins.
  it("shows admins their department and role read-only, with no self-assignment controls", async () => {
    render(<TestWrapper />);
    await screen.findByDisplayValue(ADMIN_NAME, {}, { timeout: 5000 });
    expect(screen.queryByRole("combobox", { name: "My account department" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "My account role" })).toBeNull();
    expect(screen.queryByText("Account Roles")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
    await waitFor(() => expect(screen.getByText(ADMIN_ROLE, { selector: "dd" })).toBeInTheDocument());
    expect(screen.getByText("Your department, role, and account status are managed by an authorized administrator.")).toBeInTheDocument();
  });

  it("saves only profile fields and keeps the linked account in step", async () => {
    const user = userEvent.setup();
    render(<TestWrapper identityId="dev-hr" />);
    const emailInput = await screen.findByDisplayValue(hrStaff.email, {}, { timeout: 5000 });
    fireEvent.change(emailInput, { target: { value: "hr.updated@afhomes.local" } });
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    await confirmSave(user);
    expect(await screen.findByText("Account updated successfully.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("hr.updated@afhomes.local", { selector: "dd" })).toBeInTheDocument());
  });

  it("saves profile changes after confirmation and reports a toast", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const nameInput = await screen.findByDisplayValue(ADMIN_NAME, {}, { timeout: 5000 });
    fireEvent.change(nameInput, { target: { value: `${ADMIN_NAME} Updated` } });
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    await confirmSave(user);
    expect(await screen.findByText("Account updated successfully.")).toBeInTheDocument();
    expect(screen.getByDisplayValue(`${ADMIN_NAME} Updated`)).toBeInTheDocument();
  });

  it("requires a name before saving", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);
    const nameInput = await screen.findByDisplayValue(ADMIN_NAME, {}, { timeout: 5000 });
    fireEvent.change(nameInput, { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("Full name is required.")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("rejects non-image and oversized profile pictures", async () => {
    render(<TestWrapper />);
    await screen.findByDisplayValue(ADMIN_NAME, {}, { timeout: 5000 });
    const file = await screen.findByLabelText("Profile picture file");
    fireEvent.change(file, { target: { files: [new File(["x"], "a.txt", { type: "text/plain" })] } });
    expect(await screen.findByText("Unsupported image format.")).toBeInTheDocument();
    const big = new File(["x"], "big.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: 3 * 1024 * 1024 });
    fireEvent.change(file, { target: { files: [big] } });
    expect(await screen.findByText("Image must be 2MB or smaller.")).toBeInTheDocument();
  });

  it("shows read-only employment info without admin controls for HR", async () => {
    render(<TestWrapper identityId="dev-hr" />);
    expect(await screen.findByDisplayValue(hrStaff.displayName, {}, { timeout: 5000 })).toBeDefined();
    expect(screen.queryByRole("combobox", { name: "My account department" })).toBeNull();
    expect(screen.queryByText("Account Roles")).toBeNull();
    await waitFor(() => expect(screen.getAllByText("Human Resources").length).toBeGreaterThan(0));
  });

  it("shows an empty state when no staff or account is linked", async () => {
    render(<TestWrapper identityId="dev-finance" />);
    expect(await screen.findByText("No linked staff or account record found for this identity.")).toBeDefined();
  });

  it("surfaces the profile load error with a retry instead of the missing-record message", async () => {
    const user = userEvent.setup();
    vi.spyOn(MockStaffRepository.prototype, "getSelf").mockRejectedValueOnce(new Error("Profile failed."));
    render(<TestWrapper client={new QueryClient({ defaultOptions: { queries: { retry: false } } })} />);
    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(/Profile failed\./)).toBeInTheDocument();
    expect(screen.queryByText("No linked staff or account record found for this identity.")).toBeNull();
    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByDisplayValue(ADMIN_NAME, {}, { timeout: 5000 })).toBeDefined();
  });

  it("restricts inactive identities", async () => {
    render(<TestWrapper identityId="dev-inactive" />);
    expect(await screen.findByText("Access Restricted")).toBeInTheDocument();
  });

  it("shows the read-only referral code card for a sales member identity", async () => {
    render(<TestWrapper identityId="dev-svd-a" />);
    expect(await screen.findByText("My Referral Code", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("hides the referral code card for an identity without a member record", async () => {
    render(<TestWrapper identityId="dev-super-admin" />);
    await screen.findByText("Profile Information", {}, { timeout: 5000 });
    expect(screen.queryByText("My Referral Code")).toBeNull();
  });
});
