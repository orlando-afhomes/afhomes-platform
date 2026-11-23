import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecordDetailsSheet } from "./record-details-sheet";

afterEach(cleanup);

function renderSheet(props: Partial<React.ComponentProps<typeof RecordDetailsSheet>> = {}) {
  return render(
    <RecordDetailsSheet
      open
      onClose={() => {}}
      title="Commission details"
      subtitle="Maria Santos"
      badge={<span>Approved</span>}
      sections={[
        {
          title: "Amounts",
          rows: [
            { label: "Gross", value: "₱1,000.00" },
            { label: "Reference", value: "" },
            { label: "Missing", value: null },
            { label: "Notes", value: "Long note", wide: true },
          ],
        },
      ]}
      history={[{ key: "h1", when: "Nov 1", text: "Submitted" }]}
      footer={<button type="button">Approve</button>}
      {...props}
    />,
  );
}

describe("RecordDetailsSheet", () => {
  it("shows the title, subtitle, badge, icon, sections, history and footer", () => {
    renderSheet({ icon: <svg data-testid="sheet-icon" /> });
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Commission details")).toBeTruthy();
    expect(within(dialog).getByText("Maria Santos")).toBeTruthy();
    expect(within(dialog).getByText("Approved")).toBeTruthy();
    expect(within(dialog).getByTestId("sheet-icon")).toBeTruthy();
    expect(within(dialog).getByRole("region", { name: "Amounts" })).toBeTruthy();
    expect(within(dialog).getByText("₱1,000.00")).toBeTruthy();
    expect(within(dialog).getByRole("region", { name: "History" })).toBeTruthy();
    expect(within(dialog).getByText("Submitted")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Approve" })).toBeTruthy();
  });

  it("shows an em dash for empty, null and missing values", () => {
    renderSheet();
    const dash = screen.getAllByText("—");
    expect(dash).toHaveLength(2);
    expect(screen.getByText("Reference").nextElementSibling?.textContent).toBe("—");
  });

  it("lets a wide row span both columns", () => {
    renderSheet();
    expect(screen.getByText("Notes").parentElement?.className).toContain("col-span-2");
    expect(screen.getByText("Gross").parentElement?.className).not.toContain("col-span-2");
  });

  it("gives each section an icon chip, defaulted from the title or set explicitly", () => {
    renderSheet({
      sections: [
        { title: "Amounts", rows: [{ label: "Gross", value: "1" }] },
        { title: "Custom", icon: <svg data-testid="own-icon" />, tone: "danger", rows: [{ label: "A", value: "b" }] },
      ],
    });
    const amounts = screen.getByRole("region", { name: "Amounts" });
    expect(amounts.querySelector("svg")).toBeTruthy();
    expect(amounts.querySelector("span[aria-hidden]")?.className).toContain("bg-success/10");
    const custom = screen.getByRole("region", { name: "Custom" });
    expect(within(custom).getByTestId("own-icon")).toBeTruthy();
    expect(custom.querySelector("span[aria-hidden]")?.className).toContain("bg-destructive/10");
  });

  it("omits the footer and history when not given", () => {
    renderSheet({ footer: undefined, history: undefined });
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.queryByRole("region", { name: "History" })).toBeNull();
  });

  it("calls onClose from the close button and Escape", async () => {
    const onClose = vi.fn();
    renderSheet({ onClose });
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
