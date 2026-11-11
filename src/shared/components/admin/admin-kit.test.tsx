import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
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
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId="dev-super-admin">{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

function render(node: ReactNode) {
  return renderToStaticMarkup(createElement(Wrapper, null, node));
}

describe("admin kit", () => {
  it("renders the page shell with dashboard-scale title and breadcrumbs", () => {
    const html = render(<AdminPage anyOf={["customers"]} title="Customers" crumbs={[{ label: "Sales" }]}><p>Body</p></AdminPage>);
    expect(html).toContain("Customers");
    expect(html).toContain("Dashboard");
    expect(html).toContain("Body");
  });

  it("restricts modules the identity lacks", () => {
    const html = render(<AdminPage anyOf={["nonexistent-module" as never]} title="Hidden" crumbs={[]}><p>Body</p></AdminPage>);
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
