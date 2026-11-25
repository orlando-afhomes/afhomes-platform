// @vitest-environment jsdom
// api mode: the gate reads the modules and operations the server session enforces.
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";

vi.stubEnv("NEXT_PUBLIC_DATA_MODE", "api");
const { useAccessSnapshot } = await import("./access-snapshot");

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function View() {
  const snapshot = useAccessSnapshot();
  return <p>{`${snapshot.modules.has("customers")}:${snapshot.operations.has("customers.import")}:${snapshot.genealogyIds.size}`}</p>;
}

it("reads modules and operations from the server session in api mode", async () => {
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify({ modules: ["customers", "reports"], operations: ["customers.import", "finance.reports.view"] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId="dev-admin">
          <View />
        </DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>,
  );
  expect(await screen.findByText("true:true:0")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith("/api/v1/session", expect.objectContaining({ cache: "no-store" }));
});
