import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { Breadcrumbs } from "./breadcrumbs";

afterEach(() => cleanup());

describe("breadcrumbs", () => {
  it("links parents and marks current page", () => {
    render(
      <Breadcrumbs
        items={[{ label: "Dashboard", href: "/admin" }, { label: "Organization" }]}
      />,
    );
    expect(screen.getByRole("link", { name: "Dashboard" }).getAttribute("href")).toBe("/admin");
    expect(screen.getByText("Organization").getAttribute("aria-current")).toBe("page");
  });

  it("renders a single current page without links", () => {
    render(<Breadcrumbs items={[{ label: "Dashboard" }]} />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Dashboard")).toBeDefined();
  });
});
