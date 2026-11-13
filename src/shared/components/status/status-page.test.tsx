import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { StatusButton, StatusLink, StatusPage, type StatusVariant } from "./status-page";

afterEach(() => cleanup());

describe("StatusPage", () => {
  it.each<[StatusVariant, string]>([
    ["400", "This link does not work"],
    ["401", "Please sign in"],
    ["403", "Access restricted"],
    ["404", "Page not found"],
    ["500", "Something went wrong"],
    ["notice", "Notice"],
  ])("%s shows its heading", (variant, heading) => {
    render(<StatusPage variant={variant} />);
    expect(screen.getByRole("heading", { level: 1, name: heading })).toBeDefined();
  });

  it("lets callers override copy and add actions", () => {
    const retry = vi.fn();
    render(
      <StatusPage variant="500" description="Custom text">
        <StatusButton primary onClick={retry}>
          Try again
        </StatusButton>
        <StatusLink href="/">Home</StatusLink>
      </StatusPage>,
    );
    expect(screen.getByText("Custom text")).toBeDefined();
    expect(screen.getByRole("alert")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("link", { name: "Home" }).getAttribute("href")).toBe("/");
  });

  it("embedded renders a section instead of a main landmark", () => {
    const { container } = render(<StatusPage variant="403" embedded />);
    expect(container.querySelector("main")).toBeNull();
    expect(container.querySelector("section")).not.toBeNull();
  });
});
