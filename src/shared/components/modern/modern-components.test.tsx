import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { Toaster } from "@/shared/ui/sonner";
import { Breadcrumbs } from "./breadcrumbs";
import { DataTable, type ColumnDef } from "./data-table";
import { PageHeader } from "./page-header";
import { RowActionsMenu } from "./row-actions-menu";
import { StatusBadge } from "./status-badge";

afterEach(() => {
  cleanup();
  toast.dismiss();
});

const REASON = "Deletion is unavailable until the policy is approved.";
type User = ReturnType<typeof userEvent.setup>;

async function openByKeyboard(user: User) {
  await user.tab();
  expect(screen.getByRole("button", { name: "Actions for Row One" })).toHaveFocus();
  await user.keyboard("{Enter}");
  await screen.findByRole("menu");
}

describe("modern RowActionsMenu", () => {
  it("opens by keyboard, lists items, and keeps an unavailable Delete focusable with a visible reason", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<RowActionsMenu itemName="Row One" onEdit={onEdit} deleteDisabledReason={REASON} />);
    await openByKeyboard(user);
    const item = screen.getByRole("menuitem", { name: "Delete (unavailable)" });
    expect(item).not.toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("note")).toHaveTextContent(REASON);
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    item.focus();
    expect(item).toHaveFocus();
  });

  it("explains an unavailable Delete in a notice, runs nothing, and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<RowActionsMenu itemName="Row One" onEdit={onEdit} deleteDisabledReason={REASON} />);
    await openByKeyboard(user);
    await user.click(screen.getByRole("menuitem", { name: "Delete (unavailable)" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Deletion unavailable" });
    expect(dialog).toHaveTextContent(REASON);
    expect(dialog.contains(document.activeElement)).toBe(true);
    await user.click(within(dialog).getByRole("button", { name: "OK" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(screen.getByRole("button", { name: "Actions for Row One" })).toHaveFocus());
    expect(onEdit).not.toHaveBeenCalled();
  });

  it("asks for confirmation, runs the delete once, and reports success with a toast", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <>
        <Toaster />
        <RowActionsMenu itemName="Row One" onDelete={onDelete} />
      </>,
    );
    await openByKeyboard(user);
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete Row One?" });
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Row One deleted successfully.")).toBeInTheDocument();
    expect(onDelete).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  });

  it("does not delete when cancelled and reports a failed delete with its reason", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn().mockRejectedValue(new Error("Blocked by policy."));
    render(
      <>
        <Toaster />
        <RowActionsMenu itemName="Row One" onDelete={onDelete} />
      </>,
    );
    await openByKeyboard(user);
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Actions for Row One" }));
    await user.click(await screen.findByRole("menuitem", { name: "Delete" }));
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    expect(await screen.findByText("Delete failed.")).toBeInTheDocument();
    expect(await screen.findByText("Blocked by policy.")).toBeInTheDocument();
    expect(onDelete).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole("button", { name: "Actions for Row One" })).toHaveFocus());
  });

  it("renders nothing when no action is allowed and gives the trigger a 44px mobile target", () => {
    const { container, rerender } = render(<RowActionsMenu itemName="Row One" />);
    expect(container.textContent).toBe("");
    rerender(<RowActionsMenu itemName="Row One" onEdit={() => {}} />);
    expect(screen.getByRole("button", { name: "Actions for Row One" }).className).toContain("tw:size-11");
  });
});

type Row = { id: string; name: string };
const columns: ColumnDef<Row, unknown>[] = [
  { id: "name", header: "Name", cell: ({ row }) => row.original.name },
  { id: "action", header: "Action", cell: ({ row }) => <button type="button">Act {row.original.id}</button> },
];
const rows = (count: number): Row[] => Array.from({ length: count }, (_, index) => ({ id: `r${index + 1}`, name: `Name ${index + 1}` }));

describe("DataTable", () => {
  it("renders rows with data-row-key, headers, and an accessible name", () => {
    render(<DataTable data={rows(3)} columns={columns} getRowId={(row) => row.id} emptyText="Nothing here." caption="People" />);
    expect(screen.getByRole("table", { name: "People" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect([...document.querySelectorAll("tbody tr")].map((row) => row.getAttribute("data-row-key"))).toEqual(["r1", "r2", "r3"]);
  });

  it("shows the empty text and loading skeletons without data rows", () => {
    const { rerender } = render(<DataTable data={[]} columns={columns} getRowId={(row) => row.id} emptyText="Nothing here." />);
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
    rerender(<DataTable data={[]} columns={columns} getRowId={(row) => row.id} emptyText="Nothing here." loading />);
    expect(screen.queryByText("Nothing here.")).toBeNull();
    expect(document.querySelectorAll("tbody tr")).toHaveLength(4);
  });

  it("paginates and keeps the controls in range", async () => {
    const user = userEvent.setup();
    const data = rows(25);
    render(<DataTable data={data} columns={columns} getRowId={(row) => row.id} emptyText="-" pageSize={10} />);
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /previous/i })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: /next/i }));
    await user.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
    expect(document.querySelectorAll("tbody tr")).toHaveLength(5);
    expect(screen.getByRole("button", { name: /next/i })).toBeDisabled();
  });

  it("applies column meta classes to the header and every cell of that column", () => {
    const metaColumns: ColumnDef<Row, unknown>[] = [
      { id: "name", header: "Name", cell: ({ row }) => row.original.name },
      { id: "extra", header: "Extra", meta: { className: "tw:hidden" }, cell: () => "x" },
    ];
    render(<DataTable data={rows(2)} columns={metaColumns} getRowId={(row) => row.id} emptyText="-" />);
    expect(screen.getByRole("columnheader", { name: "Extra", hidden: true }).className).toContain("tw:hidden");
    for (const cell of screen.getAllByRole("cell", { name: "x", hidden: true })) expect(cell.className).toContain("tw:hidden");
    expect(screen.getByRole("columnheader", { name: "Name" }).className).not.toContain("tw:hidden");
  });

  it("opens a row on click but ignores clicks from controls inside the row", async () => {
    const user = userEvent.setup();
    const onRowOpen = vi.fn();
    render(<DataTable data={rows(2)} columns={columns} getRowId={(row) => row.id} emptyText="-" onRowOpen={onRowOpen} />);
    await user.click(screen.getByRole("button", { name: "Act r1" }));
    expect(onRowOpen).not.toHaveBeenCalled();
    await user.click(screen.getByText("Name 2"));
    expect(onRowOpen).toHaveBeenCalledWith({ id: "r2", name: "Name 2" });
  });
});

describe("StatusBadge, PageHeader, and Breadcrumbs", () => {
  it("labels statuses in text, not by color alone", () => {
    render(
      <>
        <StatusBadge status="active" />
        <StatusBadge status="deactivated" />
        <StatusBadge status="pending" />
      </>,
    );
    for (const label of ["Active", "Deactivated", "Pending"]) expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("renders a single level-one heading with optional description and actions", () => {
    render(<PageHeader title="Departments" description="Manage departments." actions={<button type="button">Create</button>} />);
    expect(screen.getByRole("heading", { level: 1, name: "Departments" })).toBeInTheDocument();
    expect(screen.getByText("Manage departments.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("marks only the last breadcrumb as the current page and links the rest", () => {
    render(<Breadcrumbs items={[{ label: "Dashboard", href: "/admin" }, { label: "Organization" }, { label: "Departments" }]} />);
    const nav = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(nav).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/admin");
    expect(within(nav).getByText("Departments")).toHaveAttribute("aria-current", "page");
    expect(within(nav).queryByRole("link", { name: "Organization" })).toBeNull();
  });
});
