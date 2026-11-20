import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MockStoreProvider } from "@/shared/providers/mock-store-provider";
import { IdentitySection, toDraft, toInput, type CustomerDraft, type CustomerErrors, type SetDraft } from "./customer-form-sections";

afterEach(cleanup);

function Harness() {
  const [draft, setDraft] = useState<CustomerDraft>(() => toDraft());
  const errors: CustomerErrors = {};
  const set: SetDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  return (
    <>
      <IdentitySection draft={draft} set={set} errors={errors} />
      <output data-testid="payload">{JSON.stringify(toInput(draft))}</output>
    </>
  );
}

function show() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MockStoreProvider>
        <Harness />
      </MockStoreProvider>
    </QueryClientProvider>,
  );
}

async function pick(user: ReturnType<typeof userEvent.setup>, field: string, filter: string, option: RegExp) {
  const combo = screen.getByRole("combobox", { name: field });
  await user.click(combo);
  await user.type(combo, filter);
  await user.click(await screen.findByRole("option", { name: option }));
}

describe("identity section reference fields", () => {
  it("stores the optional prefix and one citizenship code with its nationality label", async () => {
    const user = userEvent.setup();
    show();
    await pick(user, "Prefix", "Dr", /^Dr\.$/);
    await pick(user, "Citizenship", "Filip", /Filipino \(Philippines\)/);

    const payload = JSON.parse(screen.getByTestId("payload").textContent ?? "{}");
    expect(payload.prefix).toBe("Dr.");
    expect(payload.citizenshipCodes).toEqual(["PH"]);
    expect(payload.citizenship).toBe("Filipino");
  });

  it("records dual citizenship as two codes and a joined label", async () => {
    const user = userEvent.setup();
    show();
    await pick(user, "Citizenship", "Filip", /Filipino \(Philippines\)/);
    await user.click(screen.getByRole("checkbox", { name: "Dual or multiple citizenship" }));
    await pick(user, "Add another citizenship", "Ameri", /American \(United States\)/);

    const payload = JSON.parse(screen.getByTestId("payload").textContent ?? "{}");
    expect(payload.citizenshipCodes).toEqual(["PH", "US"]);
    expect(payload.citizenship).toBe("Filipino; American");
  });
});
