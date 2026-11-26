import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState, type ReactNode } from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionIdentityProvider } from "@/shared/providers/session-identity-provider";
import { stubApi } from "@/test/api-harness";
import { NotificationsContext } from "@/shared/providers/notifications-provider";
import { TabBar } from "@/shared/components/modern/tab-bar";
import { useTabParam } from "@/shared/components/modern/use-tab-param";
import { AreaPage } from "./area-page";

let search = "";
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/admin/finance",
  useSearchParams: () => new URLSearchParams(search),
}));

beforeEach(() => stubApi("dev-super-admin"));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  search = "";
  window.history.replaceState(null, "", "/");
});

function Wrapper({ children }: { children: ReactNode; identityId?: string }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <SessionIdentityProvider>{children}</SessionIdentityProvider>
    </QueryClientProvider>
  );
}

function Probe({ allowed }: { allowed: string[] }) {
  const [active, select] = useTabParam(allowed);
  return (
    <>
      <output>{active ?? "none"}</output>
      {allowed.map((value) => (
        <button key={value} type="button" onClick={() => select(value)}>
          {value}
        </button>
      ))}
    </>
  );
}

describe("useTabParam", () => {
  it("reads the URL tab and writes the selection back with replaceState", async () => {
    const user = userEvent.setup();
    search = "tab=b&contract=c1";
    window.history.replaceState(null, "", "/admin/finance?tab=b&contract=c1");
    const length = window.history.length;
    render(<Probe allowed={["a", "b", "c"]} />);
    expect(screen.getByRole("status")).toHaveTextContent("b");
    await user.click(screen.getByRole("button", { name: "c" }));
    expect(screen.getByRole("status")).toHaveTextContent("c");
    expect(window.location.search).toBe("?tab=c&contract=c1");
    expect(window.history.length).toBe(length);
  });

  it("falls back to the first allowed tab when the URL tab is missing, unknown or not allowed", () => {
    render(<Probe allowed={["a", "b"]} />);
    expect(screen.getByRole("status")).toHaveTextContent("a");
    cleanup();
    search = "tab=secret";
    render(<Probe allowed={["a", "b"]} />);
    expect(screen.getByRole("status")).toHaveTextContent("a");
    cleanup();
    render(<Probe allowed={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("none");
  });

  it("follows the URL when it changes while mounted", () => {
    search = "tab=a";
    const { rerender } = render(<Probe allowed={["a", "b"]} />);
    search = "tab=b";
    rerender(<Probe allowed={["a", "b"]} />);
    expect(screen.getByRole("status")).toHaveTextContent("b");
  });

  it("canonicalizes a forbidden ?tab= to the fallback without adding history", () => {
    search = "tab=secret";
    window.history.replaceState(null, "", "/admin/finance?tab=secret&contract=c1");
    const length = window.history.length;
    render(<Probe allowed={["a", "b"]} />);
    expect(screen.getByRole("status")).toHaveTextContent("a");
    expect(window.location.search).toBe("?tab=a&contract=c1");
    expect(window.history.length).toBe(length);
  });

  it("leaves an allowed ?tab= untouched", () => {
    search = "tab=b";
    window.history.replaceState(null, "", "/admin/finance?tab=b&contract=c1");
    render(<Probe allowed={["a", "b"]} />);
    expect(screen.getByRole("status")).toHaveTextContent("b");
    expect(window.location.search).toBe("?tab=b&contract=c1");
  });

  it("does not touch the URL when no tab is allowed", () => {
    search = "tab=secret";
    window.history.replaceState(null, "", "/admin/finance?tab=secret");
    render(<Probe allowed={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("none");
    expect(window.location.search).toBe("?tab=secret");
  });

  it("drops the Staff view param when changing tabs and keeps other params", async () => {
    const user = userEvent.setup();
    search = "tab=a&view=account&contract=c1";
    window.history.replaceState(null, "", "/admin/organization?tab=a&view=account&contract=c1");
    render(<Probe allowed={["a", "b"]} />);
    await user.click(screen.getByRole("button", { name: "b" }));
    expect(screen.getByRole("status")).toHaveTextContent("b");
    expect(window.location.search).toBe("?tab=b&contract=c1");
  });

  it("keeps the Staff view param when the selected tab does not change", async () => {
    const user = userEvent.setup();
    search = "tab=a&view=account";
    window.history.replaceState(null, "", "/admin/organization?tab=a&view=account");
    render(<Probe allowed={["a", "b"]} />);
    await user.click(screen.getByRole("button", { name: "a" }));
    expect(window.location.search).toBe("?tab=a&view=account");
  });
});

// AreaPage shows "Checking access…" until the access snapshot resolves.
const waitForAccess = () => waitFor(() => expect(screen.queryByText("Checking access…")).toBeNull());

describe("AreaPage", () => {
  const tabs = [
    { value: "one", label: "One", allowed: true, render: () => <p>Panel one</p> },
    { value: "two", label: "Two", allowed: false, render: () => <p>Panel two</p> },
    { value: "three", label: "Three", allowed: true, count: 4, render: () => <p>Panel three</p> },
  ];

  it("shows unread activity for permitted views and lets mobile users select one", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <NotificationsContext.Provider value={{ unreadTotal: 9, unreadByNavKey: {}, unreadByTab: { two: 7, three: 2 }, events: [], denied: false, markAllSeen: () => {} }}>
          <AreaPage anyOf={["reports"]} title="Finance" tabs={tabs} />
        </NotificationsContext.Provider>
      </Wrapper>,
    );
    await waitForAccess();
    expect(screen.getByRole("tab", { name: /^Three/ })).toHaveAccessibleDescription("2 unread notifications");
    const mobileSelect = screen.getByRole("combobox", { name: "Finance views" });
    expect(mobileSelect).toHaveAccessibleDescription("2 unread notifications");
    await user.click(mobileSelect);
    expect(screen.queryByRole("option", { name: "Two" })).toBeNull();
    const option = await screen.findByRole("option", { name: /^Three/ });
    expect(option).toHaveAccessibleDescription("2 unread notifications");
    await user.click(option);
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel three");
  });

  it("shows only allowed tabs and links the active panel to its tab", async () => {
    const user = userEvent.setup();
    render(
      <Wrapper>
        <AreaPage anyOf={["reports"]} title="Finance" tabs={tabs} actions={(tab) => <button type="button">Action {tab}</button>} />
      </Wrapper>,
    );
    await waitForAccess();
    expect(screen.getByRole("heading", { level: 1, name: "Finance" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["One", "Three4"]);
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("Panel one");
    expect(panel).toHaveAttribute("aria-labelledby", screen.getByRole("tab", { name: "One" }).id);
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-controls", panel.id);
    expect(screen.getByRole("button", { name: "Action one" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /Three/ }));
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel three");
    expect(screen.queryByText("Panel two")).toBeNull();
  });

  it("places the actions in the page header beside the title, above the tab bar", async () => {
    render(
      <Wrapper>
        <AreaPage anyOf={["reports"]} title="Finance" tabs={tabs} actions={<button type="button">Add receipt</button>} />
      </Wrapper>,
    );
    await waitForAccess();
    const header = screen.getByRole("heading", { level: 1, name: "Finance" }).parentElement?.parentElement as HTMLElement;
    expect(within(header).getByRole("button", { name: "Add receipt" })).toBeInTheDocument();
    expect(within(header).queryByRole("tablist")).toBeNull();
    expect(header).toHaveClass("tw:justify-between", "tw:flex-wrap");
  });

  it("never opens a tab that is not allowed from the URL", async () => {
    search = "tab=two";
    render(
      <Wrapper>
        <AreaPage anyOf={["reports"]} title="Finance" tabs={tabs} />
      </Wrapper>,
    );
    await waitForAccess();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel one");
    expect(window.location.search).toBe("?tab=one");
  });

  it("renders no panel and hides the tab when allowed is false", async () => {
    render(
      <Wrapper>
        <AreaPage anyOf={["reports"]} title="Finance" tabs={[tabs[0], tabs[1]]} />
      </Wrapper>,
    );
    await waitForAccess();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["One"]);
    expect(screen.queryByRole("tab", { name: "Two" })).toBeNull();
    expect(screen.queryByText("Panel two")).toBeNull();
  });

  it("keeps the tab bar and breadcrumb with one allowed tab when several tabs are declared", async () => {
    render(
      <Wrapper>
        <AreaPage anyOf={["reports"]} title="Finance" tabs={[tabs[0], tabs[1]]} />
      </Wrapper>,
    );
    await waitForAccess();
    const bar = screen.getByRole("tablist", { name: "Finance" });
    expect(within(bar).getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["One"]);
    expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel one");
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("One");
  });

  it("renders a single declared tab without a tab bar", async () => {
    render(
      <Wrapper>
        <AreaPage anyOf={["reports"]} title="Finance" tabs={[tabs[0]]} />
      </Wrapper>,
    );
    await waitForAccess();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.getByText("Panel one")).toBeInTheDocument();
  });

  it("shows the no-access view when no tab is allowed", async () => {
    render(
      <Wrapper>
        <AreaPage anyOf={["reports"]} title="Finance" tabs={[tabs[1]]} />
      </Wrapper>,
    );
    await waitForAccess();
    expect(screen.getByText(/does not have access to Finance/)).toBeInTheDocument();
    expect(screen.queryByText("Panel two")).toBeNull();
  });
});

describe("TabBar keyboard", () => {
  it("moves and selects with arrows, Home and End, using a roving tabindex", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState("a");
      return (
        <TabBar
          label="Views"
          idPrefix="views"
          value={value}
          onChange={setValue}
          tabs={[
            { value: "a", label: "A" },
            { value: "b", label: "B" },
            { value: "c", label: "C" },
          ]}
        />
      );
    }
    render(<Harness />);
    const [a, b, c] = screen.getAllByRole("tab");
    expect(a).toHaveAttribute("tabindex", "0");
    expect(b).toHaveAttribute("tabindex", "-1");
    expect(a).toHaveAttribute("id", "views-tab-a");
    expect(a).toHaveAttribute("aria-controls", "views-panel-a");
    a.focus();
    await user.keyboard("{ArrowRight}");
    expect(b).toHaveFocus();
    expect(b).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{End}");
    expect(c).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(a).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(c).toHaveFocus();
    await user.keyboard("{Home}");
    expect(a).toHaveAttribute("aria-selected", "true");
  });
});
