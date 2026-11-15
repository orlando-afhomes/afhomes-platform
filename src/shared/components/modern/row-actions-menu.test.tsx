import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Swal from "sweetalert2";
import { RowActionsMenu } from "./row-actions-menu";

afterEach(() => {
  Swal.close();
  cleanup();
});

describe("RowActionsMenu item tones", () => {
  it("colors extra items by tone and keeps the danger boolean working", async () => {
    const user = userEvent.setup();
    render(
      <RowActionsMenu
        itemName="Row One"
        extraItems={[
          { key: "w", label: "Send back", tone: "warning", onClick: () => {} },
          { key: "s", label: "Approve", tone: "success", onClick: () => {} },
          { key: "i", label: "Export", tone: "info", onClick: () => {} },
          { key: "d", label: "Reject", danger: true, onClick: () => {} },
          { key: "p", label: "Plain", onClick: () => {} },
        ]}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Actions for Row One" }));
    await screen.findByRole("menu");
    expect(screen.queryByRole("menuitem", { name: "View full details" })).toBeNull();
    expect(screen.getByRole("menuitem", { name: "Send back" }).className).toContain("tw:text-warning");
    expect(screen.getByRole("menuitem", { name: "Approve" }).className).toContain("tw:text-success");
    expect(screen.getByRole("menuitem", { name: "Export" }).className).toContain("tw:text-info");
    expect(screen.getByRole("menuitem", { name: "Reject" })).toHaveAttribute("data-variant", "destructive");
    expect(screen.getByRole("menuitem", { name: "Plain" })).toHaveAttribute("data-variant", "default");
  });
});

describe("RowActionsMenu with nothing to offer", () => {
  it("renders no '...' button when there are no items", () => {
    render(<RowActionsMenu itemName="Row Two" />);
    expect(screen.queryByRole("button", { name: "Actions for Row Two" })).toBeNull();
  });
});

describe("RowActionsMenu delete confirmation", () => {
  it("shows the Delete button in red", async () => {
    const user = userEvent.setup();
    render(<RowActionsMenu itemName="Row Three" onDelete={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Actions for Row Three" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    const alert = await screen.findByRole("alertdialog", { name: "Delete Row Three?" });
    expect(within(alert).getByRole("button", { name: "Delete" }).className).toContain("destructive");
  });
});
