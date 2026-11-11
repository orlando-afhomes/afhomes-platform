import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarDays, Wallet } from "lucide-react";
import { PaymentOptionGrid, type PaymentOption } from "./payment-option-card";

const options: ReadonlyArray<PaymentOption<string>> = [
  { value: "spot-cash", label: "Spot Cash", sub: "Total ₱54,000", pill: "One-time payment", pillIcon: <CalendarDays aria-hidden="true" />, icon: <Wallet aria-hidden="true" /> },
  { value: "installment", label: "Installment", sub: "Total ₱72,000", pill: "12 monthly payments", icon: <Wallet aria-hidden="true" /> },
  { value: "deferred", label: "Deferred", sub: null, pill: null, disabled: true },
];

function Controlled({
  initial,
  columns,
  describedBy,
  invalid,
  onChange,
}: {
  initial?: string;
  columns?: "two" | "three";
  describedBy?: string;
  invalid?: boolean;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState<string | undefined>(initial);
  return (
    <>
      {describedBy ? <p id="payment-hint">Choose a payment option.</p> : null}
      <PaymentOptionGrid
        label="Payment options"
        value={value}
        onChange={(next) => {
          setValue(next);
          onChange?.(next);
        }}
        options={options}
        columns={columns}
        describedBy={describedBy}
        invalid={invalid}
      />
    </>
  );
}

afterEach(cleanup);

describe("PaymentOptionGrid", () => {
  it("renders every option with its label, sub total, and schedule pill", () => {
    render(<Controlled />);
    expect(screen.getByText("Spot Cash")).toBeInTheDocument();
    expect(screen.getByText("Total ₱54,000")).toBeInTheDocument();
    expect(screen.getByText("One-time payment")).toBeInTheDocument();
    expect(screen.getByText("Installment")).toBeInTheDocument();
    expect(screen.getByText("Total ₱72,000")).toBeInTheDocument();
    expect(screen.getByText("12 monthly payments")).toBeInTheDocument();
    expect(screen.getByText("Deferred")).toBeInTheDocument();
  });

  it("calls onChange with the clicked option value", () => {
    const onChange = vi.fn();
    render(<Controlled onChange={onChange} />);
    fireEvent.click(screen.getByRole("radio", { name: /installment/i }));
    expect(onChange).toHaveBeenCalledWith("installment");
  });

  it("moves selection with arrow keys", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled initial="spot-cash" onChange={onChange} />);
    const first = screen.getByRole("radio", { name: /spot cash/i });
    first.focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenCalledWith("installment");
    expect(screen.getByRole("radio", { name: /installment/i })).toHaveAttribute("aria-checked", "true");
  });

  it("does not select a disabled option", () => {
    const onChange = vi.fn();
    render(<Controlled initial="spot-cash" onChange={onChange} />);
    const disabled = screen.getByRole("radio", { name: /deferred/i });
    expect(disabled).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(disabled);
    expect(onChange).not.toHaveBeenCalled();
    expect(disabled).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("radio", { name: /spot cash/i })).toHaveAttribute("aria-checked", "true");
  });

  it("exposes the checked state on the selected card", () => {
    render(<Controlled initial="installment" />);
    expect(screen.getByRole("radio", { name: /installment/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /spot cash/i })).toHaveAttribute("aria-checked", "false");
  });

  it("wires invalid and describedby onto the group", () => {
    render(<Controlled describedBy="payment-hint" invalid />);
    const group = screen.getByRole("radiogroup", { name: "Payment options" });
    expect(group).toHaveAttribute("aria-describedby", "payment-hint");
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Choose a payment option.")).toBeInTheDocument();
  });

  it("center-aligns the header row and pins pills for equal-height rhythm", () => {
    const { container } = render(<Controlled />);
    const grid = container.querySelector(".payment-option-grid");
    expect(grid?.className).toContain("tw:items-stretch");
    const card = screen.getByRole("radio", { name: /spot cash/i });
    expect(card.className).toContain("tw:h-full");
    const row = container.querySelector(".payment-option__row");
    expect(row?.className).toContain("tw:items-center");
    expect(row?.className).not.toContain("tw:items-start");
    expect(container.querySelector(".payment-option__texts")?.className).toContain("tw:justify-center");
    expect(container.querySelector(".payment-option__pill")?.className).toContain("tw:mt-auto");
  });
});
