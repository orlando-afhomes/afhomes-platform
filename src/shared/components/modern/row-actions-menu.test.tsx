import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Swal from "sweetalert2";
import { Check, Circle, Download, RotateCcw, X } from "lucide-react";
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
          { key: "w", label: "Send back", tone: "warning", icon: RotateCcw, onClick: () => {} },
          { key: "s", label: "Approve", tone: "success", icon: Check, onClick: () => {} },
          { key: "i", label: "Export", tone: "info", icon: Download, onClick: () => {} },
          { key: "d", label: "Reject", danger: true, icon: X, onClick: () => {} },
          { key: "p", label: "Plain", icon: Circle, onClick: () => {} },
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
  const open = async (user: ReturnType<typeof userEvent.setup>, name: string) => user.click(screen.getByRole("button", { name: `Actions for ${name}` }));

  it("keeps even a lone Edit inside the menu, with an icon", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<RowActionsMenu itemName="Row A" onEdit={onEdit} />);
    expect(screen.queryByRole("button", { name: "Edit Row A" })).toBeNull();
    await open(user, "Row A");
    const item = await screen.findByRole("menuitem", { name: "Edit" });
    expect(item.querySelector("svg")).not.toBeNull();
    await user.click(item);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("keeps one extra item inside the menu and gives it its own icon", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<RowActionsMenu itemName="Row B" extraItems={[{ key: "a", label: "Approve", tone: "success", icon: Check, onClick }]} />);
    expect(screen.queryByRole("button", { name: "Approve Row B" })).toBeNull();
    await open(user, "Row B");
    const item = await screen.findByRole("menuitem", { name: "Approve" });
    expect(item.querySelector("svg")).not.toBeNull();
    await user.click(item);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders a distinct icon for every item in one menu", async () => {
    const user = userEvent.setup();
    render(<RowActionsMenu itemName="Row E" extraItems={[
      { key: "fix", label: "Request Fix", icon: RotateCcw, onClick: () => {} },
      { key: "reject", label: "Reject", icon: X, onClick: () => {} },
    ]} />);
    await open(user, "Row E");
    const fix = await screen.findByRole("menuitem", { name: "Request Fix" });
    const reject = screen.getByRole("menuitem", { name: "Reject" });
    expect(fix.querySelector("svg")).not.toBeNull();
    expect(reject.querySelector("svg")).not.toBeNull();
    expect(fix.querySelector("svg")?.outerHTML).not.toBe(reject.querySelector("svg")?.outerHTML);
  });

  it("opens the delete confirmation from a lone Delete item", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(<RowActionsMenu itemName="Row C" onDelete={onDelete} />);
    await open(user, "Row C");
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    const alert = await screen.findByRole("alertdialog", { name: "Delete Row C?" });
    await user.click(within(alert).getByRole("button", { name: "Delete" }));
    await vi.waitFor(() => expect(onDelete).toHaveBeenCalledTimes(1));
  });

  it("explains a lone unavailable Delete in a notice", async () => {
    const user = userEvent.setup();
    render(<RowActionsMenu itemName="Row D" deleteDisabledReason="Linked to a sale." />);
    await open(user, "Row D");
    await user.click(await screen.findByRole("menuitem", { name: /Delete/ }));
    const alert = await screen.findByRole("alertdialog", { name: "Deletion unavailable" });
    expect(within(alert).getByText("Linked to a sale.")).toBeTruthy();
  });
});
