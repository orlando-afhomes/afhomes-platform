import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Swal from "sweetalert2";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppAlert } from "./app-alert";

afterEach(() => {
  Swal.close();
});

describe("AppAlert", () => {
  it("shows a named alert dialog with confirm, deny and cancel, and never closes itself on confirm", async () => {
    const onConfirm = vi.fn();
    const onDeny = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AppAlert open title="Leave this application?" description="Save it first." confirmText="Save Draft" denyText="Discard" cancelText="Stay" onConfirm={onConfirm} onDeny={onDeny} onClose={onClose} />);
    const alert = await screen.findByRole("alertdialog", { name: "Leave this application?" });
    await user.click(within(alert).getByRole("button", { name: "Save Draft" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    expect(screen.getByRole("alertdialog")).toBeVisible();
    // jsdom has no layout, so SweetAlert2 treats its buttons as hidden after the first press; query them anyway.
    await user.click(within(alert).getByRole("button", { name: "Discard", hidden: true }));
    await waitFor(() => expect(onDeny).toHaveBeenCalledTimes(1));
    await user.click(within(alert).getByRole("button", { name: "Stay", hidden: true }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it("closes when the caller sets open to false and ignores Escape while pending", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<AppAlert open pending title="Delete?" description="Gone for good." danger onConfirm={() => undefined} onClose={onClose} cancelText="Cancel" />);
    await screen.findByRole("alertdialog", { name: "Delete?" });
    await user.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    rerender(<AppAlert open={false} title="Delete?" description="Gone for good." onConfirm={() => undefined} onClose={onClose} cancelText="Cancel" />);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(onClose).not.toHaveBeenCalled();
  });
});
