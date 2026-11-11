import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Switch } from "./switch";

afterEach(cleanup);

function ToggleHarness({ initial = false, disabled = false }: { initial?: boolean; disabled?: boolean }) {
  const [checked, setChecked] = useState(initial);
  return (
    <Switch
      checked={checked}
      onCheckedChange={setChecked}
      disabled={disabled}
      aria-label="Email notifications"
    />
  );
}

describe("Switch", () => {
  it("renders unchecked with its accessible name", () => {
    render(<Switch checked={false} onCheckedChange={() => {}} aria-label="Email notifications" />);
    expect(
      screen.getByRole("switch", { name: "Email notifications" })
    ).toHaveAttribute("aria-checked", "false");
  });

  it("renders checked when checked is true", () => {
    render(<Switch checked onCheckedChange={() => {}} aria-label="Email notifications" />);
    expect(
      screen.getByRole("switch", { name: "Email notifications" })
    ).toHaveAttribute("aria-checked", "true");
  });

  it("toggles on click", async () => {
    const user = userEvent.setup();
    render(<ToggleHarness />);
    const toggle = screen.getByRole("switch", { name: "Email notifications" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("does not toggle when disabled", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Switch checked={false} onCheckedChange={onCheckedChange} disabled aria-label="Email notifications" />
    );
    const toggle = screen.getByRole("switch", { name: "Email notifications" });
    await user.click(toggle);
    expect(onCheckedChange).not.toHaveBeenCalled();
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });
});
