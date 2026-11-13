import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NotificationsContext, type NotificationsValue } from "@/shared/providers/notifications-provider";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import type { AuditEventView } from "@/modules/audit/types";
import { NotificationsMenu } from "./notifications-menu";

afterEach(() => cleanup());

function makeEvent(overrides: Partial<AuditEventView> = {}): AuditEventView {
  return {
    id: "evt-1",
    timestamp: new Date(Date.now() - 5 * 60_000).toISOString(),
    actorId: "staff-clerk",
    actorRoles: ["clerk"],
    module: "customers",
    action: "CUSTOMER_SUBMITTED",
    entityType: "customer",
    entityId: "cust-1",
    entityLabel: "Juan Dela Cruz",
    actorName: "Clerk Dev",
    outcome: "success",
    displayReference: null,
    previousValue: null,
    newValue: null,
    reason: null,
    reasonRecorded: false,
    relatedRecordIds: [],
    ...overrides,
  };
}

function renderMenu(value: Partial<NotificationsValue>) {
  const full: NotificationsValue = {
    unreadTotal: 0,
    unreadByNavKey: {},
    events: [],
    denied: false,
    markAllSeen: () => {},
    ...value,
  };
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId="dev-admin">
          <NotificationsContext.Provider value={full}>
            <NotificationsMenu />
          </NotificationsContext.Provider>
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>,
  );
}

async function openMenu() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Notifications/ }));
  return user;
}

describe("notifications menu", () => {
  it("renders the unread count badge and names the count on the trigger", () => {
    renderMenu({ unreadTotal: 3, events: [makeEvent()] });
    expect(screen.getByRole("button", { name: "Notifications, 3 unread" })).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("caps the badge display at 99+ while the label keeps the true count", () => {
    renderMenu({ unreadTotal: 150 });
    expect(screen.getByRole("button", { name: "Notifications, 150 unread" })).toBeInTheDocument();
    expect(screen.getByText("99+")).toBeInTheDocument();
  });

  it("shows no badge and a none-unread label when everything is seen", () => {
    renderMenu({ unreadTotal: 0, events: [makeEvent()] });
    expect(screen.getByRole("button", { name: "Notifications, none unread" })).toBeInTheDocument();
  });

  it("shows the empty state when there are no events", async () => {
    renderMenu({ unreadTotal: 0, events: [] });
    await openMenu();
    expect(await screen.findByText("No new notifications.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark all as read" })).toBeNull();
  });

  it("shows the administrators-only empty state when denied", async () => {
    renderMenu({ denied: true, unreadTotal: 0, events: [] });
    await openMenu();
    expect(await screen.findByText("Notifications are available to administrators.")).toBeInTheDocument();
  });

  it("calls markAllSeen from the footer button", async () => {
    const markAllSeen = vi.fn();
    renderMenu({ unreadTotal: 2, events: [makeEvent()], markAllSeen });
    const user = await openMenu();
    await user.click(await screen.findByRole("button", { name: "Mark all as read" }));
    expect(markAllSeen).toHaveBeenCalledTimes(1);
  });

  it("renders row content and links each row to its module page", async () => {
    renderMenu({ unreadTotal: 1, events: [makeEvent()] });
    await openMenu();
    const row = await screen.findByRole("menuitem", { name: /Clerk Dev/ });
    expect(row).toHaveTextContent("Clerk Dev");
    // humanize() keeps all-caps action words as written by design.
    expect(row).toHaveTextContent("CUSTOMER SUBMITTED");
    expect(row).toHaveTextContent("Juan Dela Cruz");
    expect(row).toHaveTextContent("Customers");
    expect(row).toHaveTextContent("5 min ago");
    expect(row).toHaveAttribute("href", "/admin/customers");
  });

  it("marks creation events as unread without showing raw timestamps", async () => {
    renderMenu({ unreadTotal: 1, events: [makeEvent()] });
    await openMenu();
    const row = await screen.findByRole("menuitem", { name: /Clerk Dev/ });
    expect(row).toHaveTextContent("Unread:");
    expect(row.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });
});
