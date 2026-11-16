import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Swal from "sweetalert2";
import { RowActionsMenu, toneButtonVariant } from "./row-actions-menu";

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
    render(<RowActionsMenu itemName="Row Three" onDelete={() => {}} onEdit={() => {}} />);
    await user.click(screen.getByRole("button", { name: "Actions for Row Three" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    const alert = await screen.findByRole("alertdialog", { name: "Delete Row Three?" });
    expect(within(alert).getByRole("button", { name: "Delete" }).className).toContain("destructive");
  });
});

describe("RowActionsMenu with a single action", () => {
  it("shows Edit alone as a direct button", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<RowActionsMenu itemName="Row A" onEdit={onEdit} />);
    expect(screen.queryByRole("button", { name: "Actions for Row A" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Edit Row A" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("shows one extra item as a button colored by its tone", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<RowActionsMenu itemName="Row B" extraItems={[{ key: "a", label: "Approve", tone: "success", onClick }]} />);
    const button = screen.getByRole("button", { name: "Approve Row B" });
    expect(button.className).toContain("success");
    await user.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(toneButtonVariant(undefined)).toBe("outline");
    expect(toneButtonVariant("danger")).toBe("destructive");
  });

  it("opens the delete confirmation from a lone Delete button", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<RowActionsMenu itemName="Row C" onDelete={onDelete} />);
    await user.click(screen.getByRole("button", { name: "Delete Row C" }));
    const alert = await screen.findByRole("alertdialog", { name: "Delete Row C?" });
    await user.click(within(alert).getByRole("button", { name: "Delete" }));
    await vi.waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  it("explains a lone unavailable Delete in a notice", async () => {
    const user = userEvent.setup();
    render(<RowActionsMenu itemName="Row D" deleteDisabledReason="Linked to a sale." />);
    await user.click(screen.getByRole("button", { name: "Delete Row D" }));
    const alert = await screen.findByRole("alertdialog", { name: "Deletion unavailable" });
    expect(within(alert).getByText("Linked to a sale.")).toBeTruthy();
  });

  it("keeps the menu for two or more actions", () => {
    render(<RowActionsMenu itemName="Row E" onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByRole("button", { name: "Actions for Row E" })).toBeTruthy();
  });
});
