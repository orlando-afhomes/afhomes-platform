import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { IgpRegister } from "@/data/contracts/igp-repository";
import type { JadAccreditation } from "@/modules/igp/types";
import { DevIdentityProvider } from "@/shared/providers/dev-identity-provider";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { IgpSaleDialog } from "./igp-dialogs";

afterEach(cleanup);

const accreditation = (memberId: string): JadAccreditation => ({
  memberId,
  number: `JAI-${memberId}`,
  approvedDate: "2026-01-01",
  validUntil: "2027-01-01",
  replaces: null,
});

const REGISTER: IgpRegister = {
  sales: [],
  buyers: [],
  sellers: [
    { value: "mem-a1", label: "Ana Mendoza", designation: "OST", branchId: "branch-a" },
    { value: "mem-a2", label: "Mark Villanueva", designation: "OST", branchId: "branch-a" },
    { value: "mem-b1", label: "Paolo Ramos", designation: "OST", branchId: "branch-b" },
  ],
  accreditations: [accreditation("mem-a1"), accreditation("mem-a2"), accreditation("mem-b1")],
  thresholdBp: 500,
};

function show() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper() {
    const [client] = useState(() => queryClient);
    return (
      <QueryClientProvider client={client}>
        <MockStoreProvider>
          <DevIdentityProvider initialIdentityId="dev-admin">
            <IgpSaleDialog register={REGISTER} mode="record" onClose={() => {}} />
          </DevIdentityProvider>
        </MockStoreProvider>
      </QueryClientProvider>
    );
  }
  return render(<Wrapper />);
}

async function pickSeller(user: ReturnType<typeof userEvent.setup>, field: string, filter: string, name: RegExp) {
  const combo = screen.getByRole("combobox", { name: field });
  await user.click(combo);
  await user.type(combo, filter);
  await user.click(await screen.findByRole("option", { name }));
}

describe("IGP seller team rule", () => {
  it("offers only the closing seller's teammates as referrer", async () => {
    const user = userEvent.setup();
    show();
    await pickSeller(user, "Closing seller", "Ana", /Ana Mendoza/);
    await user.click(screen.getByRole("combobox", { name: "Referrer" }));
    expect(screen.queryByRole("option", { name: /Paolo Ramos/ })).toBeNull();
    expect(screen.getByRole("option", { name: /Mark Villanueva/ })).toBeVisible();
  });

  it("offers only the referrer's teammates as closing seller", async () => {
    const user = userEvent.setup();
    show();
    await pickSeller(user, "Referrer", "Paolo", /Paolo Ramos/);
    await user.click(screen.getByRole("combobox", { name: "Closing seller" }));
    expect(screen.queryByRole("option", { name: /Ana Mendoza/ })).toBeNull();
    expect(screen.getByRole("option", { name: /Paolo Ramos/ })).toBeVisible();
  });
});
