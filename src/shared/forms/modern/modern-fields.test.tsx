import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MoneyField, PointsField, PasswordField, PhilippineMobileField, SelectField, SuffixField, TextField, TinField } from ".";

afterEach(cleanup);

function MaskHarness({ kind }: { kind: "phone" | "tin" }) {
  const [value, setValue] = useState(kind === "phone" ? "0917-123-4567" : "123-456-789");
  return kind === "phone" ? (
    <PhilippineMobileField id="field" label="Phone" value={value} onChange={setValue} />
  ) : (
    <TinField id="field" label="TIN" value={value} onChange={setValue} />
  );
}

/** Mimics a browser edit: the value changes and the caret sits right after the typed text. */
function insertInMiddle(input: HTMLInputElement, at: number, text: string) {
  const next = input.value.slice(0, at) + text + input.value.slice(at);
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  fireEvent.focus(input);
  setValue.call(input, next);
  input.setSelectionRange(at + text.length, at + text.length);
  fireEvent(input, new Event("input", { bubbles: true }));
}

describe("modern masked fields", () => {
  it("keeps the caret after a digit inserted in the middle of a phone number", async () => {
    render(<MaskHarness kind="phone" />);
    const input = screen.getByLabelText("Phone") as HTMLInputElement;
    insertInMiddle(input, 2, "9");
    await waitFor(() => expect(input.value).toBe("0991-712-3456"));
    await waitFor(() => expect(input.selectionStart).toBe(3));
  });

  it("keeps the caret after a digit inserted in the middle of a TIN", async () => {
    render(<MaskHarness kind="tin" />);
    const input = screen.getByLabelText("TIN") as HTMLInputElement;
    insertInMiddle(input, 5, "0");
    await waitFor(() => expect(input.value).toBe("123-405-678-9"));
    await waitFor(() => expect(input.selectionStart).toBe(6));
  });
});

describe("modern text, password and select fields", () => {
  it("links the inline error to the input", () => {
    render(<TextField id="n" label="Name" required value="" onChange={() => {}} error="Name is required." />);
    const input = screen.getByLabelText(/Name/);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Name is required.");
    expect(screen.getByRole("alert")).toHaveTextContent("Name is required.");
  });

  it("toggles password visibility with an accessible button", async () => {
    const user = userEvent.setup();
    render(<PasswordField id="p" label="Password" value="secret" onChange={() => {}} />);
    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
  });

  it("selects an option and reports its value", async () => {
    const user = userEvent.setup();
    let picked = "";
    render(<SelectField id="g" label="Gender" value={undefined} options={[{ value: "Male", label: "Male" }]} onChange={(value) => (picked = value)} placeholder="Select gender" />);
    await user.click(screen.getByRole("combobox", { name: "Gender" }));
    await user.click(await screen.findByRole("option", { name: "Male" }));
    expect(picked).toBe("Male");
  });

  it("clears an optional suffix through the No suffix item", async () => {
    const user = userEvent.setup();
    const picked: string[] = [];
    render(<SuffixField value="Jr." onChange={(value) => picked.push(value)} />);
    await user.click(screen.getByRole("combobox", { name: "Suffix" }));
    await user.click(await screen.findByRole("option", { name: "No suffix" }));
    expect(picked).toEqual([""]);
  });
});

describe("SelectField showSearch", () => {
  it("filters options by typing and selects one", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SelectField
        label="Recommender"
        showSearch
        value={undefined}
        options={[{ value: "a", label: "Ana Mendoza" }, { value: "b", label: "Mark Villanueva" }]}
        onChange={onChange}
      />,
    );
    await user.type(screen.getByRole("combobox", { name: /recommender/i }), "mark");
    expect(screen.queryByRole("option", { name: "Ana Mendoza" })).toBeNull();
    await user.click(await screen.findByRole("option", { name: "Mark Villanueva" }));
    expect(onChange).toHaveBeenCalledWith("b");
  });
});

function AmountHarness({ points = false }: { points?: boolean }) {
  const [value, setValue] = useState("");
  const Field = points ? PointsField : MoneyField;
  return <Field id="amount" label="Amount" value={value} onChange={setValue} />;
}

describe("grouped number fields", () => {
  it("shows commas while typing a peso amount and keeps the decimals", async () => {
    render(<AmountHarness />);
    const input = screen.getByLabelText("Amount") as HTMLInputElement;
    await userEvent.type(input, "1000000.5");
    expect(input.value).toBe("1,000,000.5");
    await userEvent.clear(input);
    await userEvent.type(input, "abc12.345");
    expect(input.value).toBe("12.34");
  });

  it("keeps the caret in place when editing in the middle of a grouped number", () => {
    render(<AmountHarness points />);
    const input = screen.getByLabelText("Amount") as HTMLInputElement;
    input.focus(); // a real edit happens in the focused input; the caret is only restored there
    insertInMiddle(input, 0, "25000");
    expect(input.value).toBe("25,000");
    insertInMiddle(input, 3, "9"); // "25," + "9" + "000" -> 259,000 with the caret after the 9
    expect(input.value).toBe("259,000");
    expect(input.selectionStart).toBe(3); // right after the typed 9, before the comma
  });
});
