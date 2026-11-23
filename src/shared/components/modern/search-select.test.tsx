import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BedDouble } from "lucide-react";
import { afterEach, expect, it } from "vitest";
import { SearchSelect } from "./search-select";

afterEach(cleanup);

it("shows an optional icon chip and second line on option rows, and plain rows stay plain", async () => {
  const user = userEvent.setup();
  render(<SearchSelect aria-label="Venue" value={null} onChange={() => undefined} items={[
    { value: "hotel", label: "Smart Wellness Hotel", icon: BedDouble, description: "Accommodation" },
    { value: "plain", label: "Plain Option" },
  ]} />);
  await user.click(screen.getByRole("combobox", { name: "Venue" }));
  const rich = await screen.findByRole("option", { name: /Smart Wellness Hotel/ });
  expect(rich).toHaveTextContent("Accommodation");
  expect(rich.querySelector("svg")).not.toBeNull();
  const plain = screen.getByRole("option", { name: "Plain Option" });
  expect(plain.querySelector("svg")).toBeNull();
});
