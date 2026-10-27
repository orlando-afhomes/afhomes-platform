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

  // jsdom does not apply regular CSS, so class presence (not styling) is
  // checked here; visual scoping is proven by the production build output.
  it("wraps content in the named smoke container", () => {
    const { container } = render(
      <AntdThemeProvider>
        <AntdSmoke />
      </AntdThemeProvider>,
    );
    expect(container.firstElementChild?.tagName).toBe("DIV");
    const box = container.querySelector(".antd-smoke-box");
    expect(box?.textContent).toContain("AFhomes theme smoke");
    expect(box?.querySelector("button")).not.toBeNull();
  });
});
