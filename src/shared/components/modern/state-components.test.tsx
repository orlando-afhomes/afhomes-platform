import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "./empty-state";
import { ErrorState } from "./error-state";
import { QueryState } from "./query-state";

afterEach(cleanup);

describe("EmptyState", () => {
  it("renders the icon, title, text and action", () => {
    render(
      <EmptyState
        icon={<svg data-testid="empty-icon" />}
        title="No customers yet"
        text="Customers appear here after the first application."
        action={<button type="button">Add customer</button>}
      />,
    );

    expect(screen.getByTestId("empty-icon")).toBeInTheDocument();
    expect(screen.getByText("No customers yet")).toBeInTheDocument();
    expect(screen.getByText("Customers appear here after the first application.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add customer" })).toBeInTheDocument();
  });

  it("omits the optional icon, text and action", () => {
    render(<EmptyState title="Nothing to show" />);

    expect(screen.getByText("Nothing to show")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("ErrorState", () => {
  it("announces the default message with role=alert and no retry without a handler", () => {
    render(<ErrorState />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(alert).toHaveTextContent("We could not load this right now.");
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("renders a custom message and calls onRetry from the retry button", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState title="Could not load orders" text="The server did not answer." retryLabel="Reload" onRetry={onRetry} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Could not load orders");
    expect(alert).toHaveTextContent("The server did not answer.");

    await user.click(screen.getByRole("button", { name: "Reload" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe("QueryState", () => {
  it("announces loading once, stays busy, and shows the default table skeleton", () => {
    render(
      <QueryState isLoading error={null}>
        <p>Loaded</p>
      </QueryState>,
    );

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(status).toHaveTextContent("Loading…");
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByText("Loaded")).toBeNull();
  });

  it("shows the chosen skeleton while loading", () => {
    render(
      <QueryState isLoading error={null} skeleton={<div data-testid="custom-skeleton" />}>
        <p>Loaded</p>
      </QueryState>,
    );

    expect(screen.getByTestId("custom-skeleton")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows ErrorState for a failed query and forwards the retry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <QueryState isLoading={false} error={new Error("Network unavailable")} onRetry={onRetry}>
        <p>Loaded</p>
      </QueryState>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Something went wrong");
    expect(alert).toHaveTextContent("Network unavailable");

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Loaded")).toBeNull();
  });

  it("falls back to the default error text for a non-Error failure", () => {
    render(
      <QueryState isLoading={false} error="boom">
        <p>Loaded</p>
      </QueryState>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("We could not load this right now.");
  });

  it("renders only the children on success", () => {
    const { container } = render(
      <QueryState isLoading={false} error={null}>
        <p>Loaded</p>
      </QueryState>,
    );

    expect(container).toHaveTextContent("Loaded");
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
