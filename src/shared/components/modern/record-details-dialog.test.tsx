import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Building2 } from "lucide-react";
import { RecordDetailsDialog } from "./record-details-dialog";

afterEach(cleanup);

function renderDialog(props: Partial<React.ComponentProps<typeof RecordDetailsDialog>> = {}) {
  return render(
    <RecordDetailsDialog
      open
      onClose={() => {}}
      title="Smart System Department"
      subtitle="Department Details · SSD"
      icon={<Building2 />}
      badge={<span>Active</span>}
      notice={<p>Restricted.</p>}
      sections={[
        {
          title: "Overview",
          rows: [
            { label: "Code", value: "SSD" },
            { label: "Missing", value: null },
          ],
        },
      ]}
      footer={<button type="button">Done</button>}
      {...props}
    />,
  );
}

describe("RecordDetailsDialog", () => {
  it("renders the hero, notice, section and footer", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Smart System Department" })).toBeTruthy();
    expect(within(dialog).getByText("Department Details · SSD")).toBeTruthy();
    expect(within(dialog).getByText("Active")).toBeTruthy();
    expect(within(dialog).getByText("Restricted.")).toBeTruthy();
    expect(within(dialog).getByRole("region", { name: "Overview" })).toBeTruthy();
    expect(within(dialog).getByText("SSD")).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: "Done" })).toBeTruthy();
  });

  it("shows an em dash for a missing value", () => {
    renderDialog();
    expect(screen.getByText("Missing").nextElementSibling?.textContent).toBe("—");
  });

  it("renders custom section content", () => {
    renderDialog({ sections: [{ title: "Modules", content: <p>All modules</p> }] });
    expect(screen.getByRole("region", { name: "Modules" })).toHaveTextContent("All modules");
  });

  it("closes from the close button and Escape", async () => {
    const onClose = vi.fn();
    renderDialog({ onClose });
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalled();
  });
});
