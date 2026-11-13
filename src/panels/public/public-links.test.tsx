import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { render, screen } from "@testing-library/react";
import { PublicHeader } from "./components/public-header";
import { PublicHomePage } from "./pages/public-home-page";

describe("public sign-in and verification links", () => {
  it("shows Sales sign-in and Verify accreditation in the header and on the home page", () => {
    render(
      <>
        <PublicHeader />
        <PublicHomePage />
      </>,
    );
    for (const [name, href] of [["Sales sign-in", "/login/sales"], ["Verify accreditation", "/verify"]]) {
      const links = screen.getAllByRole("link", { name });
      expect(links).toHaveLength(2);
      for (const link of links) expect(link).toHaveAttribute("href", href);
    }
  });

  it("points only at routes that exist under src/app", () => {
    render(<PublicHeader />);
    for (const link of screen.getAllByRole("link")) {
      const href = link.getAttribute("href")!;
      const folder = href.slice(1);
      expect(existsSync(join(process.cwd(), "src/app", folder, "page.tsx")), href).toBe(true);
    }
  });
});
