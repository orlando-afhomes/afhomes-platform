import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Customer } from "@/modules/customers/types";
import type { OrgMember } from "@/modules/organization/types";
import { currentManilaYear } from "@/modules/customers/customer-number";
import { createMockStore } from "@/data/mock/seed";
import { pendingAttributionMemberIds } from "@/modules/customers/attribution";
import { AttributionSection, toDraft, toInput, type CustomerDraft, type CustomerErrors, type SetDraft } from "./customer-form-sections";

const store = createMockStore();
const members = store.members;
const existing = store.customers;
const seedPendingIds = pendingAttributionMemberIds(store.accreditations);

afterEach(cleanup);

/** The two searchable OST comboboxes, in DOM order: recommender then referrer. */
function ostCombos() {
  return screen.getAllByRole("combobox") as HTMLInputElement[];
}

function Harness({
  initial,
  errors = {},
  members: roster = members,
  existing: onFile = existing,
  pendingOstIds = seedPendingIds,
}: {
  initial?: Partial<CustomerDraft>;
  errors?: CustomerErrors;
  members?: readonly OrgMember[];
  existing?: readonly Customer[];
  pendingOstIds?: ReadonlySet<string> | null;
}) {
  const [draft, setDraft] = useState<CustomerDraft>(() => ({ ...toDraft(), ...initial }));
  const set: SetDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  return <AttributionSection draft={draft} set={set} errors={errors} members={roster} existing={onFile} pendingOstIds={pendingOstIds} />;
}

async function pickOst(user: ReturnType<typeof userEvent.setup>, index: number, filter: string, name: RegExp) {
  await user.click(ostCombos()[index]);
  await user.type(ostCombos()[index], filter);
  await user.click(await screen.findByRole("option", { name }));
}

describe("sales attribution section", () => {
  it.each([0, 1])("offers all three seeded OSTs in default picker %i", async (index) => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(ostCombos()[index]);
    for (const name of [/Ana Mendoza/, /Mark Villanueva/, /Paolo Ramos/]) {
      expect(screen.getByRole("option", { name })).toBeVisible();
    }
  });

  it.each([0, 1])("excludes pending OSTs from picker %i", async (index) => {
    const user = userEvent.setup();
    const accreditations = store.accreditations.map((record) =>
      record.memberId === "mem-ost-a1" ? { ...record, adminStatus: "pending" as const } : record,
    );
    const teamAlab = members.filter((member) => member.branchId === "branch-a");
    render(<Harness members={teamAlab} pendingOstIds={pendingAttributionMemberIds(accreditations)} />);
    await user.click(ostCombos()[index]);
    expect(screen.queryByRole("option", { name: /Ana Mendoza/ })).toBeNull();
    expect(screen.getByRole("option", { name: /Mark Villanueva/ })).toBeVisible();
    expect(screen.queryByRole("option", { name: /Paolo Ramos/ })).toBeNull();
  });

  it("shows a restored pending selection as invalid and allows clearing it", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ recommenderMemberId: "mem-ost-a1" }} pendingOstIds={new Set(["mem-ost-a1"])} />);
    expect(ostCombos()[0]).toHaveAccessibleDescription(/pending accreditation/i);
    await user.click(ostCombos()[0]);
    await user.click(screen.getByRole("option", { name: "No recommender" }));
    expect(ostCombos()[0]).not.toHaveAttribute("aria-invalid", "true");
  });

  it("disables both pickers when accreditation cannot be checked and lets users clear saved selections", async () => {
    const user = userEvent.setup();
    render(<Harness pendingOstIds={null} initial={{ referrerMemberId: "mem-ost-a1" }} />);
    expect(ostCombos()[0]).toBeDisabled();
    expect(ostCombos()[1]).toBeDisabled();
    expect(ostCombos()[1]).toHaveAccessibleDescription(/could not be checked/i);
    await user.click(screen.getByRole("button", { name: "Clear OST selections" }));
    expect(ostCombos()[1]).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("button", { name: "Clear OST selections" })).toBeNull();
  });

  it("labels the pair as OST (Recommender) and OST (Referrer) and drops the old labels and derived hint", () => {
    render(<Harness />);

    expect(screen.getByRole("combobox", { name: "OST (Recommender)" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "OST (Referrer)" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /VIP recommender/i })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /^Recommender/i })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /^Referrer/i })).toBeNull();
    expect(screen.queryByText(/VIP recommender/i)).toBeNull();
    expect(screen.queryByText(/SM, SSM, and SVD are derived/i)).toBeNull();
  });

  it("defaults the referrer from the recommender and derives the seed SM, SSM, and SVD", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByText(/owning seller/i)).toBeNull();
    expect(screen.queryByRole("combobox", { name: /owning seller/i })).toBeNull();

    await pickOst(user, 0, "Ana", /Ana Mendoza/);

    expect(ostCombos()[1]).toHaveValue("Ana Mendoza · AAO26100004");
    expect(screen.getByLabelText("SM")).toHaveValue("Jose Reyes Jr. · AAI26100003");
    expect(screen.getByLabelText("SSM")).toHaveValue("Maria Santos · AAI26100002");
    expect(screen.getByLabelText("SVD")).toHaveValue("Ramon Del Rosario · AAI26100001");
  });

  it("shows an em dash for SM and SSM when the OST reports straight to the SVD", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await pickOst(user, 0, "Mark", /Mark Villanueva/);

    expect(ostCombos()[1]).toHaveValue("Mark Villanueva · AAO26100005");
    expect(screen.getByLabelText("SM")).toHaveValue("—");
    expect(screen.getByLabelText("SSM")).toHaveValue("—");
    expect(screen.getByLabelText("SVD")).toHaveValue("Ramon Del Rosario · AAI26100001");
  });

  it("limits the referrer list to the recommender's team", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await pickOst(user, 0, "Ana", /Ana Mendoza/);
    expect(ostCombos()[1]).toHaveValue("Ana Mendoza · AAO26100004");

    // Cleared text leaves the team filter in place: only Team Alab is offered.
    const referrer = ostCombos()[1];
    await user.clear(referrer);
    await user.click(referrer);

    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "No referrer",
      "Ana Mendoza · AAO26100004",
      "Mark Villanueva · AAO26100005",
    ]);
    expect(screen.queryByRole("option", { name: /Paolo Ramos/ })).toBeNull();

    // A same-team pick is kept.
    await user.click(screen.getByRole("option", { name: /Mark Villanueva/ }));
    expect(ostCombos()[1]).toHaveValue("Mark Villanueva · AAO26100005");
    expect(ostCombos()[0]).toHaveValue("Ana Mendoza · AAO26100004");
  });

  it("swaps the recommender to the referrer's team when a cross-team referrer is picked", async () => {
    const user = userEvent.setup();
    // A scoped roster can leave a team's SVD root unloaded, so the recommender's
    // team cannot be resolved and the Referrer list falls back to the full OST
    // roster. Picking another team's OST then repairs the pair.
    const partialRoster = members.filter((member) => member.id !== "mem-svd-a");
    render(<Harness members={partialRoster} />);

    await pickOst(user, 0, "Ana", /Ana Mendoza/);
    expect(ostCombos()[1]).toHaveValue("Ana Mendoza · AAO26100004");

    await user.clear(ostCombos()[1]);
    await user.type(ostCombos()[1], "Paolo");
    await user.click(await screen.findByRole("option", { name: /Paolo Ramos/ }));

    expect(ostCombos()[1]).toHaveValue("Paolo Ramos · AAO26100007");
    expect(ostCombos()[0]).toHaveValue("Paolo Ramos · AAO26100007");
    expect(screen.getByLabelText("SVD")).toHaveValue("Liza Aquino · AAI26100006");
  });

  it("previews the next automatic Customer ID without assigning it", () => {
    const year = currentManilaYear();
    render(<Harness existing={[]} />);

    const input = screen.getByLabelText("Customer ID") as HTMLInputElement;
    expect(screen.getByRole("radio", { name: "Automatic" })).toBeChecked();
    expect(input).toBeDisabled();
    expect(input.value).toBe(`${year}-0001`);
    expect(input).toHaveAccessibleDescription("Assigned when the application is submitted.");
  });

  it("previews after the highest sequence already issued for the year", () => {
    const year = currentManilaYear();
    const onFile: Customer[] = [
      ...existing,
      {
        id: "cust-preview",
        displayName: "Preview Customer",
        branchId: "branch-a",
        ownerMemberId: null,
        status: "submitted",
        customerNumber: `${year}-0007`,
      },
    ];
    render(<Harness existing={onFile} />);

    expect(screen.getByLabelText("Customer ID")).toHaveValue(`${year}-0008`);
  });

  it("switches to an editable manual Customer ID with the required format hint", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("radio", { name: "Manual" }));

    const input = screen.getByLabelText("Customer ID") as HTMLInputElement;
    expect(input).toBeEnabled();
    expect(input).toHaveAccessibleDescription("Format YYYY-NNNN, for example 2026-0001.");
    await user.type(input, "2026-0001abc-");
    expect(input.value).toBe("2026-0001-");
  });

  it("renders the manual format and duplicate messages verbatim", () => {
    const { rerender } = render(
      <Harness
        initial={{ customerIdMode: "manual", customerNumber: "2026-1" }}
        errors={{ customerNumber: "Customer ID must use the format YYYY-NNNN, for example 2026-0001." }}
      />,
    );
    expect(screen.getByText("Customer ID must use the format YYYY-NNNN, for example 2026-0001.")).toBeInTheDocument();

    rerender(
      <Harness
        initial={{ customerIdMode: "manual", customerNumber: "2026-0001" }}
        errors={{ customerNumber: "This Customer ID is already in use." }}
      />,
    );
    expect(screen.getByText("This Customer ID is already in use.")).toBeInTheDocument();
  });

  it("sends no Customer ID to Submit in automatic mode and preserves a manual one", () => {
    expect(toInput({ ...toDraft(), customerIdMode: "auto", customerNumber: "2026-0009" }).customerNumber).toBeNull();
    expect(toInput({ ...toDraft(), customerIdMode: "manual", customerNumber: " 2026-0009 " }).customerNumber).toBe("2026-0009");
  });
});
