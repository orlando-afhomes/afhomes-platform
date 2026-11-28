import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { useFormDirty } from "./use-form-dirty";

afterEach(cleanup);

function Harness() {
  const [value, setValue] = useState("A");
  const { dirty, reset } = useFormDirty({ value });
  return (
    <>
      <input aria-label="value" value={value} onChange={(event) => setValue(event.target.value)} />
      <output>{dirty ? "dirty" : "clean"}</output>
      <button type="button" onClick={reset}>Reset</button>
    </>
  );
}

describe("useFormDirty", () => {
  it("starts clean, turns dirty on change, and clears on revert or reset", async () => {
    render(<Harness />);
    expect(screen.getByText("clean")).toBeTruthy();

    const input = screen.getByLabelText("value");
    await userEvent.clear(input);
    await userEvent.type(input, "B");
    expect(screen.getByText("dirty")).toBeTruthy();

    await userEvent.clear(input);
    await userEvent.type(input, "A");
    expect(screen.getByText("clean")).toBeTruthy();

    await userEvent.type(input, "C");
    expect(screen.getByText("dirty")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("clean")).toBeTruthy();
  });
});
