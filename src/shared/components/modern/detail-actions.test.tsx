import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Check, Download, FileText, Printer, X } from "lucide-react";
import { DetailActions } from "./detail-actions";

afterEach(cleanup);

it("keeps the next step visible and runs a destructive action from the menu", async () => {
  const cancel = vi.fn();
  render(<DetailActions actions={[
    { key: "approve", label: "Approve Sale", next: true, icon: Check },
    { key: "cancel", label: "Cancel Sale", variant: "destructive", icon: X, onClick: cancel },
  ]} />);
  const primary = screen.getByRole("button", { name: "Approve Sale" });
  expect(primary).toBeVisible();
  expect(primary.querySelector("svg")).not.toBeNull();
  expect(screen.queryByText("Cancel Sale")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "More actions" }));
  const item = await screen.findByRole("menuitem", { name: "Cancel Sale" });
  expect(item.querySelector("svg")).not.toBeNull();
  await userEvent.click(item);
  expect(cancel).toHaveBeenCalledOnce();
});

it("keeps a purpose color when a desktop action is shown in the overflow menu", async () => {
  render(<DetailActions actions={[
    { key: "print", label: "Print", next: true, variant: "info", icon: Printer },
    { key: "download", label: "Download", variant: "cyan", icon: Download },
    { key: "record", label: "Record Receipt", icon: FileText },
  ]} />);
  await userEvent.click(screen.getByRole("button", { name: "More actions" }));
  const download = await screen.findByRole("menuitem", { name: "Download" });
  const record = screen.getByRole("menuitem", { name: "Record Receipt" });
  expect(download).toHaveClass("tw:text-(--color-cyan)");
  expect(record).toHaveClass("tw:text-primary");
  expect(download.querySelector("svg")?.outerHTML).not.toBe(record.querySelector("svg")?.outerHTML);
});
