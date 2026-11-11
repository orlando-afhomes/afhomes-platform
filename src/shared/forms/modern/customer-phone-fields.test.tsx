import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { PhilippineLandlineField, PhilippineMobileField } from "./masked-fields";

afterEach(cleanup);

function Mobile() {
  const [value, setValue] = useState("");
  return (
    <>
      <PhilippineMobileField label="Mobile number" value={value} onChange={setValue} fixedPrefix />
      <output data-testid="mobile-value">{value}</output>
    </>
  );
}

describe("new customer phone controls", () => {
  it("keeps 09 visible while storing only actual input in the draft", async () => {
    const user = userEvent.setup();
    render(<Mobile />);
    const input = screen.getByRole("textbox", { name: "Mobile number" });
    expect(screen.getByText("09")).toBeVisible();
    expect(input).toHaveValue("");
    expect(screen.getByTestId("mobile-value")).toBeEmptyDOMElement();
    await user.type(input, "1712345678");
    expect(input).toHaveValue("171234567");
    expect(screen.getByTestId("mobile-value")).toHaveTextContent(/^09171234567$/);
    await user.clear(input);
    expect(screen.getByText("09")).toBeVisible();
    expect(screen.getByTestId("mobile-value")).toBeEmptyDOMElement();
  });

  it("handles complete formatted mobile paste and autofill", async () => {
    const user = userEvent.setup();
    render(<Mobile />);
    const input = screen.getByRole("textbox", { name: "Mobile number" });
    await user.click(input);
    await user.paste("+63 917 123 4567");
    expect(input).toHaveValue("171234567");
    fireEvent.change(input, { target: { value: "0999-123-4567" } });
    expect(input).toHaveValue("991234567");
    expect(screen.getByTestId("mobile-value")).toHaveTextContent(/^09991234567$/);
  });

  it.each([
    ["02", "8-123-4567", "81234567"],
    ["032", "812-3456", "8123456"],
    [undefined, "02 8123 4567", "0281234567"],
  ])("accepts only the local digit limit for area code %s", async (areaCode, formatted, digits) => {
    function Landline() {
      const [value, setValue] = useState("");
      return <PhilippineLandlineField label="Landline" value={value} onChange={setValue} areaCode={areaCode} localDigitsOnly />;
    }

    const user = userEvent.setup();
    render(<Landline />);
    const input = screen.getByRole("textbox", { name: "Landline" });
    expect(screen.queryByText(/\+63/)).toBeNull();
    if (areaCode) expect(screen.getByText(`(${areaCode})`)).toBeVisible();
    await user.click(input);
    await user.paste(formatted);
    await user.type(input, "9");
    expect(input).toHaveValue(digits);
    await user.keyboard("{Control>}a{/Control}");
    await user.paste(`${formatted}9`);
    expect(input).toHaveValue(digits);
  });

  it("rejects an overlong replacement paste after the area code lowers the limit", async () => {
    function Landline() {
      const [value, setValue] = useState("0281234567");
      return <PhilippineLandlineField label="Landline" value={value} onChange={setValue} areaCode="032" localDigitsOnly />;
    }

    const user = userEvent.setup();
    render(<Landline />);
    const input = screen.getByRole("textbox", { name: "Landline" });
    await user.click(input);
    await user.keyboard("{Control>}a{/Control}");
    await user.paste("8123-4567");
    expect(input).toHaveValue("0281234567");
    expect(input).toHaveAccessibleDescription("Landline must be 7 digits for this area code.");
  });
});
