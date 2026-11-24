import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Button } from "./button";
import { iconForLabel } from "./button-icons";

afterEach(cleanup);

describe("button icons", () => {
  it("matches common labels to an icon", () => {
    for (const label of ["Cancel", "Close", "Save Changes", "Back", "Continue", "Submit Application", "Delete", "Approve", "Download QR", "Print QR", "Search", "Try again", "Sign In", "Collapse all", "Verify", "Reject", "Request Fix", "Refund", "Manage Card", "Card Picked Up", "Payback Received", "Not Collected", "Enter Receipt", "Correct Sale", "Show QR", "Open Contract", "Remove Date", "Resolve Hold", "Record Payout"]) {
      expect(iconForLabel(label), label).toBeDefined();
    }
    expect(iconForLabel("")).toBeUndefined();
  });

  it("gives an unknown action label a neutral icon instead of nothing", () => {
    expect(iconForLabel("Frobnicate the record")).toBeDefined();
  });

  it("adds an icon to a plain-text button but not to one that brings its own", () => {
    render(<><Button>Cancel</Button><Button><svg data-testid="own" aria-hidden="true" />Cancel too</Button></>);
    expect(screen.getByRole("button", { name: "Cancel" }).querySelectorAll("svg")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Cancel too" }).querySelectorAll("svg")).toHaveLength(1);
  });
});
