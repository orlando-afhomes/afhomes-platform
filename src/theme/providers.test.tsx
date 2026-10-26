import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AntdThemeProvider } from "./providers";
import { AntdSmoke } from "./antd-smoke";

describe("AntdThemeProvider", () => {
  it("renders an antd component inside the theme boundary", () => {
    render(
      <AntdThemeProvider>
        <AntdSmoke />
      </AntdThemeProvider>,
    );
    const button = screen.getByRole("button", { name: "AFhomes theme smoke" });
    expect(button.className).toContain("ant-btn");
    expect(button.className).toContain("ant-btn-primary");
  });

  // jsdom does not process .module.css (vitest css disabled), so scoping is
  // proven by the production build output, not here. This only checks shape.
  it("wraps content in the scoped module container", () => {
    const { container } = render(
      <AntdThemeProvider>
        <AntdSmoke />
      </AntdThemeProvider>,
    );
    expect(container.firstElementChild?.tagName).toBe("DIV");
    expect(container.firstElementChild?.querySelector("button")).not.toBeNull();
  });
});
