import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactElement } from "react";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { ExperiencesPanel } from "./experiences-page";

function Wrapper({ children, identityId }: { children: React.ReactNode; identityId: string }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <DevIdentityProvider initialIdentityId={identityId}>{children}</DevIdentityProvider>
      </MockStoreProvider>
    </QueryClientProvider>
  );
}

afterEach(cleanup);

// The Settings area page owns the New experience button and passes `creating` down; this stands in for it.
function Panel() {
  const [creating, setCreating] = useState(false);
  return <>
    <button type="button" onClick={() => setCreating(true)}>New experience</button>
    <ExperiencesPanel creating={creating} onCloseCreate={() => setCreating(false)} />
  </>;
}
const show = (identityId = "dev-admin") => render(<Panel /> as ReactElement, { wrapper: ({ children }) => <Wrapper identityId={identityId}>{children}</Wrapper> });

describe("Experiences content page", () => {
  it("lists the three original destinations", async () => {
    show();
    const table = await screen.findByRole("table", { name: "Public Experiences" });
    for (const title of ["Hotspring & Ecofarm Resort", "Smart Wellness Hotel", "ALM Japanese Restaurant"]) {
      expect(within(table).getByRole("row", { name: `Open ${title}` })).toBeInTheDocument();
    }
  });

  it("keeps the designed overview and highlights read-only for the original destinations", async () => {
    show();
    const row = await screen.findByRole("row", { name: "Open Hotspring & Ecofarm Resort" });
    fireEvent.click(within(row).getByRole("button", { name: "Actions for Hotspring & Ecofarm Resort" }));
    fireEvent.click(await screen.findByText("Edit"));

    const dialog = await screen.findByRole("dialog", { name: "Edit Hotspring & Ecofarm Resort" });
    expect(within(dialog).getByText(/keeps its overview and highlights/i)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/^Overview/)).toBeNull();
    expect(within(dialog).queryByRole("button", { name: /Add highlight/ })).toBeNull();
  });

  it("adds an experience and shows it as published", async () => {
    show();
    fireEvent.click(await screen.findByRole("button", { name: /New experience/ }));
    const dialog = await screen.findByRole("dialog", { name: "New Experience" });
    fireEvent.change(within(dialog).getByLabelText(/^Title/), { target: { value: "Night Market" } });
    fireEvent.change(within(dialog).getByLabelText(/Page address/), { target: { value: "night-market" } });
    fireEvent.change(within(dialog).getByLabelText(/Category/), { target: { value: "Community" } });
    fireEvent.change(within(dialog).getByLabelText(/Status label/), { target: { value: "Opening soon" } });
    fireEvent.change(within(dialog).getByLabelText(/Image path/), { target: { value: "/images/site/resort/amenities-w-park1.webp" } });
    fireEvent.change(within(dialog).getByLabelText(/Image description/), { target: { value: "The resort park at dusk" } });
    fireEvent.change(within(dialog).getByLabelText(/Card summary/), { target: { value: "An evening market of local food and crafts." } });
    fireEvent.change(within(dialog).getByLabelText(/Overview/), { target: { value: "A weekly evening market on the resort grounds." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Create Experience" }));

    expect(await screen.findByRole("row", { name: "Open Night Market" })).toBeInTheDocument();
    expect(screen.getAllByText("Published").length).toBeGreaterThan(0);
  });

});
