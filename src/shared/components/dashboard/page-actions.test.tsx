import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
