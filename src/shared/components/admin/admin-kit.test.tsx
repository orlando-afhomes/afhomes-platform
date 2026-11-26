import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render as renderDom, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { SessionIdentityProvider } from "@/shared/providers/session-identity-provider";
import { stubApi } from "@/test/api-harness";
import { AdminPage } from "./admin-page";
import { AdminStatCard, AdminStatGrid, fitValueSize } from "./admin-stat";
import { Clock } from "lucide-react";
import { AdminTabs } from "./admin-tabs";
import { StatusPill, StatusPillForStatus } from "./status-pill";
import { StepBlock, InfoSplitCard, InfoMiniCard } from "./admin-blocks";
import { Layers } from "lucide-react";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/admin",
}));

function Wrapper({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <SessionIdentityProvider>{children}</SessionIdentityProvider>
    </QueryClientProvider>
  );
}

function render(node: ReactNode) {
  return renderToStaticMarkup(createElement(Wrapper, null, node));
}

beforeEach(() => stubApi("dev-super-admin"));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// AdminPage shows "Checking access…" until the access snapshot resolves, so it needs a client render that waits.
async function renderReady(node: ReactNode) {
  const { container } = renderDom(createElement(Wrapper, null, node));
  await waitFor(() => expect(screen.queryByText("Checking access…")).toBeNull());
  return container.innerHTML;
}

describe("admin kit", () => {
  it("renders the page shell with dashboard-scale title and breadcrumbs", async () => {
    const html = await renderReady(<AdminPage anyOf={["customers"]} title="Customers" crumbs={[{ label: "Sales" }]}><p>Body</p></AdminPage>);
    expect(html).toContain("Customers");
    expect(html).toContain("Dashboard");
    expect(html).toContain("Body");
  });

  it("restricts modules the identity lacks", async () => {
    const html = await renderReady(<AdminPage anyOf={["nonexistent-module" as never]} title="Hidden" crumbs={[]}><p>Body</p></AdminPage>);
    expect(html).toContain("Access restricted");
    expect(html).not.toContain(">Body<");
  });

  it("maps record statuses to icon pills with legacy tones", () => {
    expect(render(<StatusPillForStatus status="submitted" />)).toContain("Submitted");
    expect(render(<StatusPillForStatus status="finalized" />)).toContain("Finalized");
    expect(render(<StatusPillForStatus status="draft" />)).toContain("Draft");
    expect(render(<StatusPillForStatus status="cancelled" />)).toContain("Cancelled");
    const html = render(<StatusPillForStatus status="submitted" />);
    expect(html).toContain("<svg");
    expect(render(<StatusPillForStatus status="mystery" />)).toContain("Mystery");
  });

  it("renders compact stat cards without the dashboard pill row", () => {
    const html = render(
      <AdminStatGrid columns={3}>
        <AdminStatCard label="Awaiting verification" value={7} icon={Clock} tone="warning" description="Queue depth" />
      </AdminStatGrid>,
    );
    expect(html).toContain("Awaiting verification");
    expect(html).toContain("Queue depth");
    expect(html).not.toContain("Current");
    expect(html).not.toContain("vs. previous period");
    expect(html).toContain("M0 100");
  });

  it("shrinks a long stat value to fit and never below the floor", () => {
    expect(fitValueSize(200, 100)).toBe(30);
    expect(fitValueSize(100, 200)).toBe(14.7);
    expect(fitValueSize(10, 1000)).toBe(12);
    expect(fitValueSize(0, 100)).toBe(30);
    const html = render(<AdminStatCard label="Net collections" value="₱123,456,789,012.00" icon={Clock} />);
    expect(html).toContain("data-fit-value");
    expect(html).toContain("₱123,456,789,012.00");
  });

  it("renders StatusPill with explicit tone and label", () => {
    const html = render(<StatusPill tone="success">Linked</StatusPill>);
    expect(html).toContain("Linked");
  });

  it("renders tabs with roving tabindex and counts", () => {
    const html = render(<AdminTabs items={[{ value: "a", label: "Alpha" }, { value: "b", label: "Beta", count: 3 }]} value="a" onChange={() => {}} label="Views" />);
    expect(html).toContain('role="tablist"');
    expect(html).toContain("Alpha");
    expect(html).toContain("3");
  });

  it("renders numbered step blocks and info split cards", () => {
    const html = render(
      <>
        <StepBlock step={1} title="Get the template" description="Helper copy" actions={<button type="button">XLSX</button>} connector />
        <InfoSplitCard icon={Layers} title="How it works" aside={<InfoMiniCard icon={Layers} title="Formats" lines={["XLSX, CSV"]} />}>
          Body copy
        </InfoSplitCard>
      </>,
    );
    expect(html).toContain("Get the template");
    expect(html).toContain("How it works");
    expect(html).toContain("Formats");
  });
});
