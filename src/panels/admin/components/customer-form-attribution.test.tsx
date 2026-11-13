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

/** The searchable seller comboboxes in DOM order: closing seller (office only) then referrer. */
function sellerCombos() {
  return screen.getAllByRole("combobox") as HTMLInputElement[];
}

function Harness({
  initial,
  errors = {},
  members: roster = members,
  existing: onFile = existing,
  pendingOstIds = seedPendingIds,
  office = true,
}: {
  initial?: Partial<CustomerDraft>;
  errors?: CustomerErrors;
  members?: readonly OrgMember[];
  existing?: readonly Customer[];
  pendingOstIds?: ReadonlySet<string> | null;
  office?: boolean;
}) {
  const [draft, setDraft] = useState<CustomerDraft>(() => ({ ...toDraft(), ...initial }));
  const set: SetDraft = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  return <AttributionSection draft={draft} set={set} errors={errors} members={roster} existing={onFile} pendingOstIds={pendingOstIds} office={office} />;
}

/** Looked up by name each time: an open popup hides the other combobox from the accessibility tree. */
async function pickSeller(user: ReturnType<typeof userEvent.setup>, field: "Closing seller" | "Referrer / VIP Recommender", filter: string, name: RegExp) {
  const input = screen.getByRole("combobox", { name: field });
  await user.click(input);
  await user.type(input, filter);
  await user.click(await screen.findByRole("option", { name }));
}

describe("sales attribution section", () => {
  it.each([0, 1])("offers the active sellers without pending accreditation in picker %i", async (index) => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(sellerCombos()[index]);
    for (const name of [/Ana Mendoza/, /Mark Villanueva/, /Paolo Ramos/]) {
      expect(screen.getByRole("option", { name })).toBeVisible();
    }
  });

  it.each([0, 1])("excludes pending sellers from picker %i", async (index) => {
    const user = userEvent.setup();
    const accreditations = store.accreditations.map((record) =>
      record.memberId === "mem-ost-a1" ? { ...record, adminStatus: "pending" as const } : record,
    );
    render(<Harness pendingOstIds={pendingAttributionMemberIds(accreditations)} />);
    await user.click(sellerCombos()[index]);
    expect(screen.queryByRole("option", { name: /Ana Mendoza/ })).toBeNull();
    expect(screen.getByRole("option", { name: /Mark Villanueva/ })).toBeVisible();
  });

  it("offers an IST who is not pending as a closing seller", async () => {
    const user = userEvent.setup();
    const accreditations = store.accreditations.map((record) => (record.memberId === "mem-ssm-a" ? { ...record, adminStatus: "active" as const } : record));
    render(<Harness pendingOstIds={pendingAttributionMemberIds(accreditations)} />);
    await user.click(sellerCombos()[0]);
    expect(screen.getByRole("option", { name: /Maria Santos/ })).toBeVisible();
  });

  it("shows a restored pending referrer as invalid and allows clearing it", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ referrerMemberId: "mem-ost-a1", recommenderMemberId: "mem-ost-a1" }} pendingOstIds={new Set(["mem-ost-a1"])} />);
    expect(sellerCombos()[1]).toHaveAccessibleDescription(/pending accreditation/i);
    await user.click(sellerCombos()[1]);
    await user.click(screen.getByRole("option", { name: "No referrer" }));
    expect(sellerCombos()[1]).not.toHaveAttribute("aria-invalid", "true");
  });

  it("disables both pickers when accreditation cannot be checked and lets users clear saved selections", async () => {
    const user = userEvent.setup();
    render(<Harness pendingOstIds={null} initial={{ referrerMemberId: "mem-ost-a1", ownerMemberId: "mem-ost-a2" }} />);
    expect(sellerCombos()[0]).toBeDisabled();
    expect(sellerCombos()[1]).toBeDisabled();
    expect(sellerCombos()[1]).toHaveAccessibleDescription(/could not be checked/i);
    await user.click(screen.getByRole("button", { name: "Clear seller selections" }));
    expect(sellerCombos()[1]).not.toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByRole("button", { name: "Clear seller selections" })).toBeNull();
  });

  it("labels the pair Closing seller and Referrer / VIP Recommender", () => {
    render(<Harness />);
    expect(screen.getByRole("combobox", { name: "Closing seller" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Referrer / VIP Recommender" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: /OST \(/ })).toBeNull();
  });

  it("keeps the closing seller and the referrer separate and derives the upline from the closing seller", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await pickSeller(user, "Closing seller", "Ana", /Ana Mendoza/);
    expect(sellerCombos()[0]).toHaveValue("Ana Mendoza · AAO26100004 (OST)");
    expect(sellerCombos()[1]).toHaveValue("");
    expect(screen.getByLabelText("SM")).toHaveValue("Jose Reyes Jr. · AAI26100003");
    expect(screen.getByLabelText("SSM")).toHaveValue("Maria Santos · AAI26100002");
    expect(screen.getByLabelText("SVD")).toHaveValue("Ramon Del Rosario · AAI26100001");

    // A referrer from another team is allowed and does not change the closing seller.
    await pickSeller(user, "Referrer / VIP Recommender", "Paolo", /Paolo Ramos/);
    expect(sellerCombos()[1]).toHaveValue("Paolo Ramos · AAO26100007 (OST)");
    expect(sellerCombos()[0]).toHaveValue("Ana Mendoza · AAO26100004 (OST)");
    expect(screen.queryByLabelText("Dated referral reference")).toBeNull();
  });

  it("shows an em dash for SM and SSM when the closing OST reports straight to the SVD", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await pickSeller(user, "Closing seller", "Mark", /Mark Villanueva/);
    expect(screen.getByLabelText("SM")).toHaveValue("—");
    expect(screen.getByLabelText("SSM")).toHaveValue("—");
    expect(screen.getByLabelText("SVD")).toHaveValue("Ramon Del Rosario · AAI26100001");
  });

  it("asks the office for a dated referral reference when the closing seller is also the referrer", async () => {
    const user = userEvent.setup();
    render(<Harness initial={{ ownerMemberId: "mem-ost-a1" }} />);
    expect(screen.queryByLabelText("Dated referral reference")).toBeNull();
    await pickSeller(user, "Referrer / VIP Recommender", "Ana", /Ana Mendoza/);
    await user.type(screen.getByLabelText("Dated referral reference"), "FB lead 2026-10-30");
    expect(screen.getByLabelText("Dated referral reference")).toHaveValue("FB lead 2026-10-30");
  });

  it("shows a seller only their own read-only closing seller and no referral reference field", () => {
    render(<Harness office={false} initial={{ ownerMemberId: "mem-ost-a1", referrerMemberId: "mem-ost-a1", recommenderMemberId: "mem-ost-a1" }} />);
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    expect(screen.getByLabelText("Closing seller")).toBeDisabled();
    expect(screen.queryByLabelText("Dated referral reference")).toBeNull();
  });

  it("sends the chosen closing seller and keeps the referrer fields in step", () => {
    const input = toInput({ ...toDraft(), ownerMemberId: "mem-ost-a1", referrerMemberId: "mem-ost-a2", recommenderMemberId: "mem-ost-a2", referralReference: " ref " });
    expect(input).toMatchObject({ ownerMemberId: "mem-ost-a1", referrerMemberId: "mem-ost-a2", recommenderMemberId: "mem-ost-a2", referralReference: "ref" });
    expect(toInput(toDraft()).ownerMemberId).toBeUndefined();
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
