import { act, cleanup, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, it } from "vitest";
import { Toaster } from "./sonner";

afterEach(() => {
  toast.dismiss();
  cleanup();
});

describe("Toaster", () => {
  it.each([
    ["success", "Saved."],
    ["error", "Could not save."],
    ["warning", "Check the amount."],
    ["info", "Heads up."],
  ] as const)("shows a %s notice with its own icon and a close button", async (type, message) => {
    render(<Toaster />);
    act(() => { toast[type](message); });
    const item = (await screen.findByText(message)).closest("[data-sonner-toast]") as HTMLElement;
    expect(item).toHaveAttribute("data-type", type);
    expect(item.querySelector("[data-icon] svg")).not.toBeNull();
    expect(item.querySelector("[data-close-button]")).not.toBeNull();
  });
});
