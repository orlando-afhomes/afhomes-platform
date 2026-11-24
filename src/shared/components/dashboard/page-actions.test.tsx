import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PageActions } from "./page-actions";

afterEach(cleanup);

it("names each header button with its own text for a hover or long press, and keeps an existing title", () => {
  render(
    <PageActions>
      <button type="button">Approve</button>
      <a href="/x" title="Custom">Correct Data</a>
    </PageActions>,
  );
  expect(screen.getByRole("button", { name: "Approve" })).toHaveAttribute("title", "Approve");
  expect(screen.getByRole("link", { name: "Correct Data" })).toHaveAttribute("title", "Custom");
});

it("also names a button that appears after the first render", async () => {
  const { rerender } = render(<PageActions><span /></PageActions>);
  rerender(<PageActions><button type="button">Record Sale</button></PageActions>);
  expect(await screen.findByRole("button", { name: "Record Sale" })).toHaveAttribute("title", "Record Sale");
});

it("shows two buttons and moves the rest, red ones last, into a More actions menu that still clicks them", async () => {
  const user = userEvent.setup();
  let rejected = 0;
  render(
    <PageActions>
      <button type="button">Approve</button>
      <button type="button">Send Back</button>
      <button type="button" className="destructive" onClick={() => { rejected += 1; }}>Reject</button>
      <button type="button">Print</button>
    </PageActions>,
  );
  expect(screen.getByRole("button", { name: "Approve" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Send Back" })).toBeVisible();
  expect(screen.queryByRole("button", { name: "Reject" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "More actions" }));
  const items = await screen.findAllByRole("menuitem");
  expect(items.map((item) => item.textContent)).toEqual(["Print", "Reject"]);
  await user.click(items[1]);
  expect(rejected).toBe(1);
});

it("shows no menu when there are two buttons or fewer", () => {
  render(<PageActions><button type="button">Save</button><button type="button">Cancel</button></PageActions>);
  expect(screen.queryByRole("button", { name: "More actions" })).toBeNull();
});
