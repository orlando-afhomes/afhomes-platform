import { afterEach, describe, expect, it } from "vitest";
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Swal from "sweetalert2";
import type { LinkedAccountSummary } from "@/modules/accounts/types";
import type { StaffMember } from "@/modules/organization/types";
import { ApiWrapper, json, stubApi } from "@/test/api-harness";
import { useUpdateStaff } from "@/data/queries";
import { render } from "@testing-library/react";
import { MyAccountPage } from "./my-account-page";

afterEach(() => {
  Swal.close();
  cleanup();
});

const staff: StaffMember = {
  id: "staff-1",
  displayName: "Orlando Dela Cruz",
  position: "Super Administrator",
  departmentId: "dept-1",
  departmentRoleId: "role-1",
  status: "active",
  email: "orlandodelacruz@afhomes.com.ph",
  createdAt: "2026-01-01",
  avatarUrl: null,
  accountId: "acct-1",
};

const linkedAccount: LinkedAccountSummary = {
  id: "acct-1",
  email: staff.email,
  status: "active",
  isProtected: true,
  allowedStatuses: [],
};

function renderPage() {
  const fetchMock = stubApi("dev-super-admin", (url, init) => {
    if (url.pathname === "/api/v1/staff/self") return json({ profile: { staff, linkedAccount } });
    if (url.pathname === "/api/v1/departments") {
      return json({ items: [{ id: "dept-1", name: "Smart System Department", code: "SSD", description: "", headStaffId: null, status: "active" }] });
    }
    if (url.pathname === "/api/v1/roles/options") {
      return json({ items: [{ id: "role-1", name: "Super Admin", departmentId: "dept-1", moduleIds: ["dashboard"], status: "active", createdAt: "2026-01-01", isProtected: true, manageable: true, assignable: true }] });
    }
    if (url.pathname === `/api/v1/staff/${staff.id}` && init?.method === "POST") {
      return json({ staff: { ...staff, firstName: "Orly", displayName: "Orly Dela Cruz" } });
    }
    return undefined;
  });
  render(<ApiWrapper><MyAccountPage /></ApiWrapper>);
  return fetchMock;
}

function UpdateHarness() {
  const update = useUpdateStaff();
  return (
    <button type="button" onClick={() => void update.mutateAsync({ id: staff.id, displayName: "Orly Dela Cruz", firstName: "Orly" })}>
      Do update
    </button>
  );
}

describe("My Account profile", () => {
  it("shows split name fields and disables Save until changed", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(/First Name/i);
    const firstName = document.getElementById("account-first-name") as HTMLInputElement;
    expect(document.getElementById("account-last-name")).toHaveValue("Dela Cruz");
    await waitFor(() => expect(firstName).not.toBeDisabled());

    const save = screen.getByRole("button", { name: "Save Changes" });
    expect(save).toBeDisabled();

    await user.clear(firstName);
    await user.type(firstName, "Orly");
    expect(save).toBeEnabled();

    await user.clear(firstName);
    await user.type(firstName, "Orlando");
    expect(save).toBeDisabled();
  });

  it("sends no id in the staff update body", async () => {
    const user = userEvent.setup();
    const fetchMock = stubApi("dev-super-admin", (url, init) => {
      if (url.pathname === `/api/v1/staff/${staff.id}` && init?.method === "POST") return json({ staff });
      return undefined;
    });
    render(<ApiWrapper><UpdateHarness /></ApiWrapper>);
    await user.click(await screen.findByRole("button", { name: "Do update" }));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([input, init]) => String(input).includes(`/api/v1/staff/${staff.id}`) && init?.method === "POST");
      expect(call).toBeTruthy();
      const body = JSON.parse(String(call![1]?.body));
      expect(body).not.toHaveProperty("id");
      expect(body).toMatchObject({ displayName: "Orly Dela Cruz", firstName: "Orly" });
    });
  });

  it("uploads a selected photo before saving and never sends a data URL in the staff body", async () => {
    const user = userEvent.setup();
    const uploads: FormData[] = [];
    let savedBody: Record<string, unknown> | undefined;
    const avatarUrl = "/api/v1/staff/staff-1/avatar/file-1";
    const fetchMock = stubApi("dev-super-admin", (url, init) => {
      if (url.pathname === "/api/v1/staff/self") return json({ profile: { staff, linkedAccount } });
      if (url.pathname === "/api/v1/departments") return json({ items: [] });
      if (url.pathname === "/api/v1/roles/options") return json({ items: [] });
      if (url.pathname === `/api/v1/staff/${staff.id}/avatar` && init?.method === "POST") {
        uploads.push(init.body as FormData);
        return json({ avatarUrl });
      }
      if (url.pathname === `/api/v1/staff/${staff.id}` && init?.method === "POST") {
        savedBody = JSON.parse(String(init.body)) as Record<string, unknown>;
        return json({ staff: { ...staff, avatarUrl } });
      }
      return undefined;
    });
    render(<ApiWrapper><MyAccountPage /></ApiWrapper>);
    await screen.findByText(/First Name/i);
    await waitFor(() => expect(document.querySelector('input[type="file"]')).toBeTruthy());
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, new File(["avatar"], "avatar.png", { type: "image/png" }));

    const save = screen.getByRole("button", { name: "Save Changes" });
    await waitFor(() => expect(save).toBeEnabled());
    await user.click(save);
    const alert = await screen.findByRole("alertdialog", { name: "Save Changes to Your Account?" });
    await user.click(within(alert).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(savedBody).toBeTruthy());
    expect(uploads).toHaveLength(1);
    expect(uploads[0].get("file")).toBeTruthy();
    expect(savedBody?.avatarUrl).toBe(avatarUrl);
    expect(JSON.stringify(savedBody)).not.toContain("data:");
    expect(fetchMock).toHaveBeenCalled();
  });

  it("shows a pending spinner on the confirmation Save while the request waits", async () => {
    const user = userEvent.setup();
    let resolvePost: ((response: Response) => void) | undefined;
    const waiting = new Promise<Response>((resolve) => { resolvePost = resolve; });
    const fetchMock = stubApi("dev-super-admin", (url, init) => {
      if (url.pathname === "/api/v1/staff/self") return json({ profile: { staff, linkedAccount } });
      if (url.pathname === "/api/v1/departments") return json({ items: [] });
      if (url.pathname === "/api/v1/roles/options") return json({ items: [] });
      if (url.pathname === `/api/v1/staff/${staff.id}` && init?.method === "POST") return waiting;
      return undefined;
    });
    render(<ApiWrapper><MyAccountPage /></ApiWrapper>);
    await screen.findByText(/First Name/i);
    const firstName = document.getElementById("account-first-name") as HTMLInputElement;
    await waitFor(() => expect(firstName).not.toBeDisabled());
    await user.clear(firstName);
    await user.type(firstName, "Orly");
    const save = screen.getByRole("button", { name: "Save Changes" });
    expect(save).toBeEnabled();
    await user.click(save);

    const alert = await screen.findByRole("alertdialog", { name: "Save Changes to Your Account?" });
    await user.click(within(alert).getByRole("button", { name: "Save" }));
    const confirm = await within(alert).findByRole("button", { name: /Save/, hidden: true });
    await waitFor(() => expect(confirm).toHaveAttribute("aria-busy", "true"));
    expect(confirm.querySelector('[data-slot="spinner"]')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalled();

    resolvePost?.(json({ staff: { ...staff, firstName: "Orly" } }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });
});
